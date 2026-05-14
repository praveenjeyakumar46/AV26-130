import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch, faLandmark, faBookOpen, faRobot, faSpinner,
  faExclamationCircle, faLanguage, faChevronLeft,
  faFilter, faTimes, faArrowRight, faScroll,
  faDownload, faEye, faFilePdf, faExternalLinkAlt,
} from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { API_BASE } from '@/config/api';
import { parseConstitutionCsv } from '@/lib/parseConstitutionCsv';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Article {
  article_id:   string;
  article_desc: string;
  art_no?:      string;
  name?:        string;
  art_desc?:    string;
  status?:      string;
  sub_heading?: string;
  part_no?:     string;
  part_name?:   string;
  language?:    'en' | 'ta';
  source?:      string;
  pdfPage?:     number;
  clauses?: Array<{
    ClauseNo:    string;
    ClauseDesc:  string;
    SubClauses?: Array<{ SubClauseNo: string; SubClauseDesc: string }>;
  }>;
  explanations?: Array<{ ExplanationNo: string; Explanation: string }>;
}

interface LegalDoc {
  id:         string;
  title:      string;
  full_title: string;
  category:   string;
  content:    string;
  source:     string;
  language:   string;
  file_name:  string;
}

interface PaginationInfo {
  page:        number;
  limit:       number;
  total:       number;
  total_pages: number;
}

type TabType = 'constitution' | 'acts';

// ── URLs ──────────────────────────────────────────────────────────────────────
// Article content: always from the bundled CSV (never changes).
const CONSTITUTION_CSV_URL = `${import.meta.env.BASE_URL}data/${encodeURIComponent('Constitution Of India.csv')}`;

// Constitution PDFs: served via backend API so the actual files in
// backend/database/data/ are used — avoids copying large PDFs into public/.
const CONSTITUTION_PDF_EN_API   = `${API_BASE}/api/constitution/pdf?lang=en`;
const CONSTITUTION_PDF_EN_DL    = `${API_BASE}/api/constitution/pdf?lang=en&download=1`;
const CONSTITUTION_PDF_TA_API   = `${API_BASE}/api/constitution/pdf?lang=ta`;
const CONSTITUTION_PDF_TA_DL    = `${API_BASE}/api/constitution/pdf?lang=ta&download=1`;

// ── Chatbot redirect helper ────────────────────────────────────────────────────
const redirectToChatbot = (topic: string) => {
  sessionStorage.setItem('chatbot_prefill', `Explain ${topic} in simple terms`);
  const chatLink = document.querySelector<HTMLAnchorElement>('a[href*="chat"], a[href="/"], nav a');
  if (chatLink) {
    chatLink.click();
  } else {
    window.dispatchEvent(new CustomEvent('navigate-to-chatbot', { detail: { topic } }));
  }
};

// ── PDF Preview Modal ─────────────────────────────────────────────────────────
const PdfModal = ({
  pdfUrl,
  downloadUrl,
  title,
  fileName,
  page,
  onClose,
}: {
  pdfUrl:      string;
  downloadUrl: string;
  title:       string;
  fileName:    string;
  page:        number;
  onClose:     () => void;
}) => {
  const [blobUrl,   setBlobUrl]   = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [fetching,  setFetching]  = useState(true);
  const blobObjectUrlRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;

    const revokeBlob = () => {
      if (blobObjectUrlRef.current) {
        URL.revokeObjectURL(blobObjectUrlRef.current);
        blobObjectUrlRef.current = '';
      }
    };

    setFetching(true);
    setLoadError(false);
    setBlobUrl(null);
    revokeBlob();

    const tryFetch = async (url: string): Promise<ArrayBuffer> => {
      // Use 'include' so auth cookies reach the backend API
      const r = await fetch(url.split('#')[0], { credentials: 'include' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = await r.arrayBuffer();
      const u8  = new Uint8Array(buf);
      // Validate PDF magic bytes: %PDF
      const isPdf =
        u8.length >= 4 &&
        u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46;
      if (!isPdf) throw new Error('Response is not a valid PDF');
      return buf;
    };

    const run = async () => {
      try {
        const buf = await tryFetch(pdfUrl);
        if (cancelled) return;
        const blob = new Blob([buf], { type: 'application/pdf' });
        revokeBlob();
        const ou = URL.createObjectURL(blob);
        blobObjectUrlRef.current = ou;
        setBlobUrl(page > 1 ? `${ou}#page=${page}` : ou);
        setLoadError(false);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    };

    run().finally(() => { if (!cancelled) setFetching(false); });

    return () => {
      cancelled = true;
      revokeBlob();
    };
  }, [pdfUrl, page]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-secondary/10 to-secondary/5 flex-shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <FontAwesomeIcon icon={faFilePdf} className="text-red-500 text-xl flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-foreground text-sm line-clamp-1">{title}</h3>
              <p className="text-xs text-muted-foreground truncate">
                {fileName}{page > 1 ? ` • Page ${page}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3 py-2 bg-muted text-foreground rounded-lg text-sm font-semibold hover:shadow-md transition-all"
              title="Open in new tab"
            >
              <FontAwesomeIcon icon={faExternalLinkAlt} className="text-xs" />
              <span className="hidden sm:inline">Open Tab</span>
            </a>
            <a
              href={downloadUrl}
              download={fileName}
              className="flex items-center space-x-1.5 px-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:shadow-md transition-all"
            >
              <FontAwesomeIcon icon={faDownload} />
              <span className="hidden sm:inline">Download</span>
            </a>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900 relative">

          {fetching && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-gray-100 dark:bg-gray-900">
              <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-primary" />
              <p className="text-sm text-muted-foreground">Loading PDF…</p>
            </div>
          )}

          {!fetching && loadError && (
            <div className="flex flex-col items-center justify-center h-full space-y-4 p-8 text-center">
              <FontAwesomeIcon icon={faFilePdf} className="text-red-400 text-6xl" />
              <div>
                <h4 className="font-bold text-foreground mb-2">Could not load PDF preview</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Make sure the backend server is running, then use the buttons below.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-5 py-2.5 bg-secondary text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                  <FontAwesomeIcon icon={faExternalLinkAlt} /><span>Open in New Tab</span>
                </a>
                <a href={downloadUrl} download={fileName}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                  <FontAwesomeIcon icon={faDownload} /><span>Download PDF</span>
                </a>
              </div>
            </div>
          )}

          {!fetching && !loadError && blobUrl && (
            <iframe
              key={blobUrl}
              src={blobUrl}
              title={title}
              className="w-full h-full border-0"
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ── Article Detail View ───────────────────────────────────────────────────────
const ArticleDetail = ({
  article,
  isTamil,
  onBack,
}: {
  article: Article;
  isTamil: boolean;
  onBack: () => void;
}) => {
  const artNo     = article.art_no || article.article_id.match(/\d+[A-Z]?/i)?.[0] || '';
  const title     = article.name || (isTamil ? `பிரிவு ${artNo}` : `Article ${artNo}`);
  const body      = article.article_desc || article.art_desc || '';
  const chatTopic = isTamil
    ? `பிரிவு ${artNo} - ${title}`
    : `Article ${artNo} - ${title} of the Constitution of India`;

  // ── PDF page lookup ────────────────────────────────────────────────────────
  const EN_PDF_PAGE: Record<string, number> = {
    '0': 27,
    '1': 28, '2': 28, '3': 28, '4': 29,
    '5': 29, '6': 30, '7': 30, '8': 30, '9': 30, '10': 30, '11': 31,
    '12': 31, '13': 31, '14': 32, '15': 32, '16': 32, '17': 32, '18': 33,
    '19': 33, '20': 34, '21': 34, '22': 35, '23': 36, '24': 36,
    '25': 36, '26': 37, '27': 37, '28': 37,
    '29': 38, '30': 38, '31': 38,
    '32': 39, '33': 40, '34': 40, '35': 40,
    '36': 41, '37': 41, '38': 41, '39': 42, '40': 43, '41': 43,
    '42': 43, '43': 43, '44': 44, '45': 44, '46': 44, '47': 44,
    '48': 44, '49': 45, '50': 45, '51': 45,
    '51A': 45,
    '52': 46, '53': 46, '54': 46, '55': 47, '56': 47, '57': 47,
    '58': 47, '59': 47, '60': 48, '61': 48, '62': 48, '63': 49,
    '64': 49, '65': 49, '66': 49, '67': 50, '68': 50, '69': 50,
    '70': 50, '71': 50, '72': 51, '73': 51,
    '74': 52, '75': 52, '76': 53, '77': 53, '78': 53,
    '79': 54, '80': 54, '81': 55, '82': 56, '83': 56, '84': 56,
    '85': 57, '86': 57, '87': 57, '88': 58, '89': 58, '90': 58,
    '91': 58, '92': 59, '93': 59, '94': 59, '95': 59, '96': 59,
    '97': 60, '98': 60, '99': 60, '100': 60,
    '101': 61, '102': 61, '103': 62, '104': 62, '105': 62, '106': 63,
    '107': 63, '108': 64, '109': 64, '110': 65, '111': 65,
    '112': 66, '113': 66, '114': 67, '115': 67, '116': 67, '117': 68,
    '118': 68, '119': 68, '120': 68, '121': 69, '122': 69,
    '123': 69,
    '124': 70, '125': 72, '126': 72, '127': 72, '128': 72, '129': 73,
    '130': 73, '131': 73, '132': 73, '133': 74, '134': 74, '135': 74,
    '136': 75, '137': 75, '138': 75, '139': 75, '140': 76, '141': 76,
    '142': 76, '143': 76, '144': 77, '145': 77, '146': 77, '147': 78,
    '148': 78, '149': 78, '150': 79, '151': 79,
    '152': 79,
    '153': 80, '154': 80, '155': 80, '156': 80, '157': 80, '158': 81,
    '159': 81, '160': 81, '161': 81, '162': 81,
    '163': 82, '164': 82, '165': 83, '166': 83, '167': 83,
    '168': 83, '169': 84, '170': 84, '171': 84, '172': 85, '173': 85,
    '174': 85, '175': 85, '176': 86, '177': 86, '178': 86, '179': 86,
    '180': 86, '181': 87, '182': 87, '183': 87, '184': 87, '185': 87,
    '186': 87, '187': 88, '188': 88, '189': 88, '190': 88, '191': 89,
    '192': 89, '193': 89, '194': 89, '195': 90, '196': 90, '197': 90,
    '198': 91, '199': 91, '200': 91, '201': 92, '202': 92, '203': 92,
    '204': 93, '205': 93, '206': 93, '207': 93, '208': 94, '209': 94,
    '210': 94, '211': 94, '212': 94,
    '213': 95,
    '214': 95, '215': 95, '216': 96, '217': 96, '218': 96, '219': 96,
    '220': 96, '221': 97, '222': 97, '223': 97, '224': 97, '225': 97,
    '226': 98, '227': 98, '228': 99, '229': 99, '230': 99, '231': 99,
    '232': 100,
    '233': 100, '234': 100, '235': 100, '236': 100, '237': 101,
    '239': 101, '240': 101, '241': 102, '242': 102,
    '243': 102, '244': 103,
    '245': 115, '246': 115, '247': 116, '248': 116, '249': 116,
    '250': 117, '251': 117, '252': 117, '253': 117, '254': 118, '255': 118,
    '264': 122, '265': 122, '266': 122, '267': 123,
    '268': 123, '269': 123, '270': 124, '271': 124, '272': 124, '273': 124,
    '274': 124, '275': 125, '276': 125, '277': 125, '278': 125, '279': 126,
    '280': 126, '281': 126, '282': 126, '283': 127, '284': 127, '285': 127,
    '286': 127, '287': 128, '288': 128, '289': 128, '290': 128, '291': 129,
    '292': 129, '293': 129,
    '301': 131, '302': 131, '303': 131, '304': 132, '305': 132, '306': 132, '307': 132,
    '308': 132, '309': 133, '310': 133, '311': 133, '312': 134, '313': 134, '314': 134,
    '324': 137, '325': 137, '326': 138, '327': 138, '328': 138, '329': 138,
    '330': 139, '331': 139, '332': 139, '333': 140, '334': 140, '335': 140,
    '336': 140, '337': 141, '338': 141, '339': 141, '340': 142, '341': 142, '342': 142,
    '343': 142, '344': 143, '345': 143, '346': 143, '347': 143,
    '348': 143, '349': 144, '350': 144, '351': 144,
    '352': 145, '353': 145, '354': 146, '355': 146, '356': 146, '357': 147,
    '358': 147, '359': 147, '360': 148,
    '361': 148, '362': 148, '363': 149, '364': 149, '365': 149, '366': 149, '367': 150,
    '368': 151,
    '369': 152, '370': 152, '371': 152, '372': 153, '373': 153, '374': 153,
    '375': 153, '376': 154, '377': 154, '378': 154, '379': 154, '380': 155,
    '381': 155, '382': 155, '383': 155, '384': 155, '385': 156, '386': 156,
    '387': 156, '388': 156, '389': 156, '390': 157, '391': 157, '392': 157,
    '393': 157, '394': 157, '395': 157,
  };

  const getPdfPage = (): number => {
    const key = (article.art_no || '').toString().toUpperCase();
    if (EN_PDF_PAGE[key])            return EN_PDF_PAGE[key];
    if (EN_PDF_PAGE[key.toLowerCase()]) return EN_PDF_PAGE[key.toLowerCase()];
    const n = parseInt(key) || 1;
    return Math.max(27, Math.round(n * 0.38) + 27);
  };

  // ── PDF URLs — always through the backend API ──────────────────────────────
  // Article wording comes from the CSV; the PDF is only for reference/download.
  const pdfPage       = isTamil ? 1 : getPdfPage();
  const pdfPreviewUrl = isTamil ? CONSTITUTION_PDF_TA_API : `${CONSTITUTION_PDF_EN_API}&page=${pdfPage}`;
  const pdfDownloadUrl = isTamil ? CONSTITUTION_PDF_TA_DL : CONSTITUTION_PDF_EN_DL;
  const pdfFileName   = isTamil ? 'constitution_tamil.pdf' : 'constitution_english.pdf';

  const [showPdf, setShowPdf] = useState(false);

  return (
    <div className="animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-primary hover:text-primary/80 mb-6 transition-colors"
      >
        <FontAwesomeIcon icon={faChevronLeft} />
        <span>{isTamil ? 'பட்டியலுக்கு திரும்பு' : 'Back to list'}</span>
      </button>

      <div className="bg-card rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-8 border-b border-border">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center">
                <FontAwesomeIcon icon={faLandmark} className="text-primary text-2xl" />
              </div>
              <div>
                <div className="text-sm text-primary font-semibold mb-1">
                  {isTamil ? 'இந்திய அரசியலமைப்பு' : 'Constitution of India'}
                  {article.part_name && ` • Part ${article.part_no}: ${article.part_name}`}
                </div>
                <h2 className="text-2xl font-bold text-foreground">{title}</h2>
                {article.sub_heading && (
                  <p className="text-muted-foreground mt-1">{article.sub_heading}</p>
                )}
              </div>
            </div>
            {article.status === 'Omitted' && (
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-sm font-semibold">
                Omitted
              </span>
            )}
          </div>
        </div>

        <div className="p-8">
          {/* Article body — always from CSV */}
          <div className="prose prose-sm max-w-none text-foreground leading-relaxed whitespace-pre-wrap mb-8">
            {body || (isTamil ? 'உள்ளடக்கம் கிடைக்கவில்லை' : 'Content not available')}
          </div>

          {/* Clauses */}
          {article.clauses && article.clauses.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">
                {isTamil ? 'உட்பிரிவுகள்' : 'Clauses'}
              </h3>
              <div className="space-y-4">
                {article.clauses.map((clause, i) => (
                  <div key={i} className="ml-2 border-l-4 border-primary/30 pl-4">
                    <p className="font-semibold text-foreground">
                      ({clause.ClauseNo}) {clause.ClauseDesc}
                    </p>
                    {clause.SubClauses && clause.SubClauses.length > 0 && (
                      <div className="mt-2 space-y-1 ml-4">
                        {clause.SubClauses.map((sc, si) => (
                          <p key={si} className="text-sm text-muted-foreground">
                            ({sc.SubClauseNo}) {sc.SubClauseDesc}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explanations */}
          {article.explanations && article.explanations.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">
                {isTamil ? 'விளக்கங்கள்' : 'Explanations'}
              </h3>
              <div className="space-y-3">
                {article.explanations.map((exp, i) => (
                  <div key={i} className="ml-2 border-l-4 border-secondary/30 pl-4">
                    <p className="text-foreground">
                      <span className="font-semibold">Explanation {exp.ExplanationNo}:</span>{' '}
                      {exp.Explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Constitution PDF card */}
          <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
                <FontAwesomeIcon icon={faFilePdf} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-sm">
                  {isTamil ? 'முழு அரசியலமைப்பு PDF' : 'Full Constitution PDF'}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {isTamil ? 'தமிழ் • அரசியலமைப்பு' : 'English • Official Document'}
                  {!isTamil && pdfPage > 1 && ` • Opens at page ${pdfPage}`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowPdf(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg text-sm font-semibold hover:shadow-md hover:scale-105 transition-all"
              >
                <FontAwesomeIcon icon={faEye} />
                <span>{isTamil ? 'PDF பார்க்க' : 'Preview PDF'}</span>
              </button>
              <a
                href={pdfDownloadUrl}
                download={pdfFileName}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:shadow-md hover:scale-105 transition-all"
              >
                <FontAwesomeIcon icon={faDownload} />
                <span>{isTamil ? 'பதிவிறக்கம்' : 'Download PDF'}</span>
              </a>
            </div>
          </div>

          {/* Ask Chatbot */}
          <div className="p-6 bg-primary/5 rounded-xl border border-primary/20">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h4 className="font-bold text-foreground mb-1">
                  {isTamil ? 'விளக்கம் வேண்டுமா?' : 'Need an explanation?'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {isTamil
                    ? 'AI சட்ட உதவியாளர் இந்த பிரிவை எளிமையாக விளக்குவார்'
                    : 'Let our AI legal assistant explain this article in simple terms'}
                </p>
              </div>
              <button
                onClick={() => redirectToChatbot(chatTopic)}
                className="flex items-center space-x-2 px-6 py-3 bg-primary text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300"
              >
                <FontAwesomeIcon icon={faRobot} />
                <span>{isTamil ? 'விளக்கம் கேளுங்கள்' : 'Ask AI to Explain'}</span>
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Modal */}
      {showPdf && (
        <PdfModal
          pdfUrl={pdfPreviewUrl}
          downloadUrl={pdfDownloadUrl}
          title={isTamil ? 'இந்திய அரசியலமைப்பு (தமிழ்)' : 'Constitution of India (English)'}
          fileName={pdfFileName}
          page={pdfPage}
          onClose={() => setShowPdf(false)}
        />
      )}
    </div>
  );
};

// ── Act Detail View ────────────────────────────────────────────────────────────
const ActDetail = ({
  act,
  onBack,
}: {
  act: LegalDoc;
  onBack: () => void;
}) => {
  const chatTopic  = `${act.title} - ${act.category}`;
  const isScanned  = !act.content || act.content.startsWith('[Scanned PDF');
  const hasPdf     = Boolean(act.file_name);

  const pdfPreviewUrl  = hasPdf
    ? `${API_BASE}/api/constitution/acts/pdf?file=${encodeURIComponent(act.file_name)}`
    : null;
  const pdfDownloadUrl = hasPdf
    ? `${API_BASE}/api/constitution/acts/pdf?file=${encodeURIComponent(act.file_name)}&download=1`
    : null;

  const [showPdf, setShowPdf] = useState(false);

  return (
    <div className="animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-primary hover:text-primary/80 mb-6 transition-colors"
      >
        <FontAwesomeIcon icon={faChevronLeft} />
        <span>Back to acts</span>
      </button>

      <div className="bg-card rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-secondary/10 to-secondary/5 p-8 border-b border-border">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-secondary/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <FontAwesomeIcon icon={faScroll} className="text-secondary text-2xl" />
            </div>
            <div>
              <div className="text-sm text-secondary font-semibold mb-1">{act.category}</div>
              <h2 className="text-2xl font-bold text-foreground">{act.title}</h2>
              <p className="text-muted-foreground text-sm mt-1">{act.full_title}</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {hasPdf && (
            <div className="mb-6 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center">
                  <FontAwesomeIcon icon={faFilePdf} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">Original PDF Document</h4>
                  <p className="text-xs text-muted-foreground truncate max-w-xs">{act.file_name}</p>
                </div>
              </div>

              {isScanned && (
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-700">
                  📄 Scanned image PDF — text extraction unavailable. Use the options below to view or download the original file.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowPdf(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg text-sm font-semibold hover:shadow-md hover:scale-105 transition-all"
                >
                  <FontAwesomeIcon icon={faEye} />
                  <span>Preview PDF</span>
                </button>
                <a
                  href={pdfDownloadUrl!}
                  download={act.file_name}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:shadow-md hover:scale-105 transition-all"
                >
                  <FontAwesomeIcon icon={faDownload} />
                  <span>Download PDF</span>
                </a>
              </div>
            </div>
          )}

          {!hasPdf && isScanned && (
            <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl p-6 text-center">
              <span className="text-4xl mb-3 block">📄</span>
              <h3 className="font-bold text-amber-800 dark:text-amber-200 mb-1">Scanned PDF</h3>
              <p className="text-amber-700 dark:text-amber-300 text-sm">
                This document is a scanned image PDF — text extraction is not available.
              </p>
            </div>
          )}

          {!isScanned && act.content && (
            <div className="prose prose-sm max-w-none text-foreground leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto pr-2 mb-6">
              {act.content}
            </div>
          )}

          <div className="mt-4 p-6 bg-secondary/5 rounded-xl border border-secondary/20">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h4 className="font-bold text-foreground mb-1">Need an explanation?</h4>
                <p className="text-sm text-muted-foreground">
                  Let our AI legal assistant explain this Act in simple terms
                </p>
              </div>
              <button
                onClick={() => redirectToChatbot(chatTopic)}
                className="flex items-center space-x-2 px-6 py-3 bg-primary text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300"
              >
                <FontAwesomeIcon icon={faRobot} />
                <span>Ask AI to Explain</span>
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPdf && hasPdf && (
        <PdfModal
          pdfUrl={pdfPreviewUrl!}
          downloadUrl={pdfDownloadUrl!}
          title={act.title}
          fileName={act.file_name}
          page={1}
          onClose={() => setShowPdf(false)}
        />
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const ConstitutionReference = () => {
  const { t } = useTranslation('common');
  const [currentLang, setCurrentLang] = useState<string>(i18n.language || 'en');
  const [activeTab, setActiveTab]     = useState<TabType>('constitution');

  const [allConstitutionArticles, setAllConstitutionArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [searchQuery, setSearchQuery]         = useState('');
  const [constitutionPage, setConstitutionPage] = useState(1);

  const [acts, setActs]                 = useState<LegalDoc[]>([]);
  const [selectedAct, setSelectedAct]   = useState<LegalDoc | null>(null);
  const [actsLoading, setActsLoading]   = useState(false);
  const [actsError, setActsError]       = useState<string | null>(null);
  const [actsSearch, setActsSearch]     = useState('');
  const [actsCategory, setActsCategory] = useState('');
  const [categories, setCategories]     = useState<string[]>([]);
  const [actsPagination, setActsPagination] = useState<PaginationInfo>({
    page: 1, limit: 20, total: 0, total_pages: 0,
  });

  const isTamil = currentLang.startsWith('ta');

  const filteredConstitutionArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!allConstitutionArticles.length) return [];
    if (!q) return allConstitutionArticles;
    return allConstitutionArticles.filter((a) => {
      const blob = `${a.art_no || ''} ${a.name || ''} ${a.article_desc || ''} ${a.art_desc || ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [allConstitutionArticles, searchQuery]);

  const constitutionPaging = useMemo(() => {
    const limit = 20;
    const total = filteredConstitutionArticles.length;
    const total_pages = Math.max(1, Math.ceil(total / limit) || 1);
    const page = Math.min(Math.max(1, constitutionPage), total_pages);
    const slice = filteredConstitutionArticles.slice((page - 1) * limit, page * limit);
    return { page, limit, total, total_pages, slice };
  }, [filteredConstitutionArticles, constitutionPage]);

  const articles = constitutionPaging.slice;

  useEffect(() => {
    const tp = constitutionPaging.total_pages;
    if (constitutionPage > tp) setConstitutionPage(tp);
  }, [constitutionPaging.total_pages, constitutionPage]);

  // Load article content from CSV (unchanged — CSV is the single source of truth)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(CONSTITUTION_CSV_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load constitution data (HTTP ${res.status})`);
        return res.text();
      })
      .then((text) => {
        const rows = parseConstitutionCsv(text);
        const mapped: Article[] = rows.map((r) => ({
          ...r,
          language: 'en' as const,
        }));
        if (!cancelled) {
          setAllConstitutionArticles(mapped);
          setConstitutionPage(1);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error loading constitution CSV');
          setAllConstitutionArticles([]);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = (lng: string) => {
      setCurrentLang(lng);
      setSelectedArticle(null);
      setSearchQuery('');
      setConstitutionPage(1);
    };
    i18n.on('languageChanged', handler);
    return () => { i18n.off('languageChanged', handler); };
  }, []);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      console.log('Navigate to chatbot with topic:', e.detail.topic);
    };
    window.addEventListener('navigate-to-chatbot', handler as EventListener);
    return () => window.removeEventListener('navigate-to-chatbot', handler as EventListener);
  }, []);

  const fetchActs = useCallback(async (page = 1, search = '', category = '') => {
    setActsLoading(true);
    setActsError(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search.trim())   params.append('search', search.trim());
      if (category.trim()) params.append('category', category.trim());
      const res  = await fetch(`${API_BASE}/api/constitution/acts?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error('Failed to fetch acts');
      setActs(data.data);
      setActsPagination(data.pagination);
      if (data.categories) setCategories(data.categories);
    } catch (err) {
      setActsError(err instanceof Error ? err.message : 'Error loading acts');
    } finally {
      setActsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'acts' && acts.length === 0) fetchActs(1, '', '');
  }, [activeTab]);

  const getArticleNumber = (article: Article): string => {
    if (article.art_no) return article.art_no;
    const m = article.article_id.match(/(?:Article|பிரிவு|சட்டப்பிரிவு)\s+(\d+[A-Z]?)/i);
    return m ? m[1] : '';
  };

  return (
    <div className="min-h-screen pt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">

        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {t('constitution.title', { defaultValue: 'Law Reference' })}
          </h1>
          <p className="text-muted-foreground">
            {isTamil ? (
              <>
                கட்டுரை உள்ளடக்கம்{' '}
                <span className="font-medium text-foreground">Constitution Of India.csv</span>
                {' '}இல் இருந்து. PDF கோப்புகள் backend API வழியாக பரிமாறப்படுகின்றன.
              </>
            ) : (
              <>
                Article content from{' '}
                <span className="font-medium text-foreground">Constitution Of India.csv</span>.
                {' '}PDF files served via backend API.
              </>
            )}
          </p>
        </div>

        <div className="flex space-x-1 bg-muted rounded-xl p-1 mb-8 w-fit">
          {([
            { key: 'constitution', icon: faLandmark, label: isTamil ? 'அரசியலமைப்பு' : 'Constitution' },
            { key: 'acts',         icon: faScroll,   label: 'Central Acts' },
          ] as { key: TabType; icon: any; label: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSelectedArticle(null); setSelectedAct(null); }}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
                activeTab === tab.key
                  ? 'bg-card text-primary shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FontAwesomeIcon icon={tab.icon} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── CONSTITUTION TAB ── */}
        {activeTab === 'constitution' && (
          selectedArticle ? (
            <ArticleDetail
              article={selectedArticle}
              isTamil={isTamil}
              onBack={() => setSelectedArticle(null)}
            />
          ) : (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  isTamil
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                }`}>
                  <FontAwesomeIcon icon={faLanguage} />
                  <span>Constitution Of India.csv</span>
                  <span className="text-muted-foreground">(English articles)</span>
                  {constitutionPaging.total > 0 && <span>• {constitutionPaging.total} articles</span>}
                </div>
              </div>

              <div className="bg-card rounded-xl shadow-lg p-4 mb-6">
                <div className="flex items-center space-x-2">
                  <FontAwesomeIcon icon={faSearch} className="text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={isTamil ? 'பிரிவுகளை தேடுங்கள்...' : 'Search articles (e.g. Article 21, right to life)...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setConstitutionPage(1)}
                    className="flex-1 px-4 py-2 bg-muted border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={() => setConstitutionPage(1)}
                    disabled={loading}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:shadow-glow transition-all disabled:opacity-50"
                  >
                    {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : (isTamil ? 'தேடு' : 'Search')}
                  </button>
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(''); setConstitutionPage(1); }}
                      className="p-2 text-muted-foreground hover:text-foreground"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive rounded-xl p-4 mb-6 flex items-center space-x-3">
                  <FontAwesomeIcon icon={faExclamationCircle} className="text-destructive text-xl" />
                  <p className="text-destructive">{error}</p>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center py-16">
                  <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-primary" />
                  <span className="ml-4 text-lg text-muted-foreground">
                    {isTamil ? 'ஏற்றப்படுகிறது...' : 'Loading articles...'}
                  </span>
                </div>
              )}

              {!loading && !error && articles.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {articles
                  .filter((article) => {
                    if (article.status === 'Omitted') {
                      const hasRealDesc     = (article.art_desc || '').trim().length > 10;
                      const hasClauses      = Array.isArray(article.clauses) && article.clauses.length > 0;
                      const hasExplanations = Array.isArray(article.explanations) && article.explanations.length > 0;
                      return hasRealDesc || hasClauses || hasExplanations;
                    }
                    return true;
                  })
                  .map((article) => {
                    const artNo   = getArticleNumber(article);
                    const title   = article.name || (isTamil ? `பிரிவு ${artNo}` : `Article ${artNo}`);
                    const preview = (article.article_desc || article.art_desc || '').substring(0, 120);
                    return (
                      <button
                        key={article.art_no || article.article_id}
                        onClick={() => setSelectedArticle(article)}
                        className="text-left bg-card border border-border rounded-xl p-5 hover:border-primary hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group"
                      >
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                            <FontAwesomeIcon icon={faLandmark} className="text-primary" />
                          </div>
                          <div>
                            <div className="text-xs text-primary font-semibold">
                              {isTamil ? `பிரிவு ${artNo}` : `Article ${artNo}`}
                              {article.status === 'Omitted' && (
                                <span className="ml-2 text-amber-500">(Omitted)</span>
                              )}
                            </div>
                            <h3 className="font-bold text-foreground text-sm line-clamp-1">{title}</h3>
                          </div>
                        </div>
                        {preview && (
                          <p className="text-xs text-muted-foreground line-clamp-3">{preview}...</p>
                        )}
                        <div className="flex items-center text-primary text-xs font-semibold mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>{isTamil ? 'முழுமையாக படிக்கவும்' : 'Read full article'}</span>
                          <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {!loading && !error && articles.length === 0 && (
                <div className="bg-card rounded-xl p-16 text-center">
                  <FontAwesomeIcon icon={faSearch} className="text-6xl text-muted-foreground mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {isTamil ? 'பிரிவுகள் எதுவும் கிடைக்கவில்லை' : 'No articles found'}
                  </h3>
                </div>
              )}

              {!loading && articles.length > 0 && constitutionPaging.total_pages > 1 && (
                <div className="flex items-center justify-between bg-card rounded-xl shadow p-4 flex-wrap gap-3">
                  <span className="text-sm text-muted-foreground">
                    {(constitutionPaging.page - 1) * constitutionPaging.limit + 1}–{Math.min(constitutionPaging.page * constitutionPaging.limit, constitutionPaging.total)} of {constitutionPaging.total}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setConstitutionPage(constitutionPaging.page - 1)}
                      disabled={constitutionPaging.page === 1}
                      className="px-4 py-2 bg-muted rounded-lg disabled:opacity-50 hover:bg-muted/80 transition-colors"
                    >
                      {isTamil ? 'முந்தைய' : 'Previous'}
                    </button>
                    <span className="text-sm font-semibold text-foreground">
                      {constitutionPaging.page} / {constitutionPaging.total_pages}
                    </span>
                    <button
                      onClick={() => setConstitutionPage(constitutionPaging.page + 1)}
                      disabled={constitutionPaging.page === constitutionPaging.total_pages}
                      className="px-4 py-2 bg-muted rounded-lg disabled:opacity-50 hover:bg-muted/80 transition-colors"
                    >
                      {isTamil ? 'அடுத்து' : 'Next'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* ── ACTS TAB ── */}
        {activeTab === 'acts' && (
          selectedAct ? (
            <ActDetail act={selectedAct} onBack={() => setSelectedAct(null)} />
          ) : (
            <div className="animate-fade-in">
              <div className="bg-card rounded-xl shadow-lg p-4 mb-6">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
                    <FontAwesomeIcon icon={faSearch} className="text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search Central Acts..."
                      value={actsSearch}
                      onChange={(e) => setActsSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchActs(1, actsSearch, actsCategory)}
                      className="flex-1 px-4 py-2 bg-muted border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  {categories.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <FontAwesomeIcon icon={faFilter} className="text-muted-foreground" />
                      <select
                        value={actsCategory}
                        onChange={(e) => { setActsCategory(e.target.value); fetchActs(1, actsSearch, e.target.value); }}
                        className="px-3 py-2 bg-muted border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      >
                        <option value="">All Categories</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button
                    onClick={() => fetchActs(1, actsSearch, actsCategory)}
                    disabled={actsLoading}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:shadow-glow transition-all disabled:opacity-50"
                  >
                    {actsLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Search'}
                  </button>
                  {(actsSearch || actsCategory) && (
                    <button
                      onClick={() => { setActsSearch(''); setActsCategory(''); fetchActs(1, '', ''); }}
                      className="p-2 text-muted-foreground hover:text-foreground"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  )}
                </div>
              </div>

              {actsError && (
                <div className="bg-destructive/10 border border-destructive rounded-xl p-4 mb-6 flex items-center space-x-3">
                  <FontAwesomeIcon icon={faExclamationCircle} className="text-destructive" />
                  <p className="text-destructive">{actsError}</p>
                </div>
              )}

              {actsLoading && (
                <div className="flex items-center justify-center py-16">
                  <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-primary" />
                  <span className="ml-4 text-lg text-muted-foreground">Loading acts...</span>
                </div>
              )}

              {!actsLoading && !actsError && acts.length > 0 && (
                <>
                  <div className="text-sm text-muted-foreground mb-4">
                    Showing {acts.length} of {actsPagination.total} acts
                    {actsCategory && ` in "${actsCategory}"`}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {acts.map((act) => (
                      <button
                        key={act.id}
                        onClick={() => setSelectedAct(act)}
                        className="text-left bg-card border border-border rounded-xl p-5 hover:border-secondary hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group"
                      >
                        <div className="flex items-start space-x-3 mb-3">
                          <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-secondary/20 transition-colors">
                            <FontAwesomeIcon icon={faScroll} className="text-secondary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-secondary font-semibold mb-1 truncate">{act.category}</div>
                            <h3 className="font-bold text-foreground text-sm line-clamp-2">{act.title}</h3>
                          </div>
                        </div>
                        {act.content && !act.content.startsWith('[Scanned') && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {act.content.substring(0, 100)}...
                          </p>
                        )}
                        {(!act.content || act.content.startsWith('[Scanned')) && (
                          <div className="flex items-center space-x-1.5">
                            <FontAwesomeIcon icon={faFilePdf} className="text-red-400 text-xs" />
                            <span className="text-xs text-amber-500">Scanned PDF</span>
                          </div>
                        )}
                        <div className="flex items-center text-secondary text-xs font-semibold mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>View document</span>
                          <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
                        </div>
                      </button>
                    ))}
                  </div>

                  {actsPagination.total_pages > 1 && (
                    <div className="flex items-center justify-between bg-card rounded-xl shadow p-4 flex-wrap gap-3">
                      <span className="text-sm text-muted-foreground">
                        {(actsPagination.page - 1) * actsPagination.limit + 1}–{Math.min(actsPagination.page * actsPagination.limit, actsPagination.total)} of {actsPagination.total}
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => fetchActs(actsPagination.page - 1, actsSearch, actsCategory)}
                          disabled={actsPagination.page === 1}
                          className="px-4 py-2 bg-muted rounded-lg disabled:opacity-50 hover:bg-muted/80"
                        >
                          Previous
                        </button>
                        <span className="text-sm font-semibold">
                          {actsPagination.page} / {actsPagination.total_pages}
                        </span>
                        <button
                          onClick={() => fetchActs(actsPagination.page + 1, actsSearch, actsCategory)}
                          disabled={actsPagination.page === actsPagination.total_pages}
                          className="px-4 py-2 bg-muted rounded-lg disabled:opacity-50 hover:bg-muted/80"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!actsLoading && !actsError && acts.length === 0 && (
                <div className="bg-card rounded-xl p-16 text-center">
                  <FontAwesomeIcon icon={faBookOpen} className="text-6xl text-muted-foreground mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-2">No acts found</h3>
                  <p className="text-muted-foreground">Run <code>npm run db:load-acts</code> to load Central Acts data</p>
                </div>
              )}
            </div>
          )
        )}

      </div>
    </div>
  );
};

export default ConstitutionReference;
