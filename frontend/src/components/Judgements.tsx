import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilter, faCalendar, faEye, faQuoteRight, faArrowRight, faList, faTh, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

const Judgements = () => {
  const { t } = useTranslation('common');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filters, setFilters] = useState({
    court: '',
    year: '',
    month: '',
    act: '',
    categories: [] as string[],
  });

  const judgements = [
    {
      court: 'Supreme Court',
      date: '15 Jan 2024',
      title: 'State of Maharashtra v. Rajesh Kumar',
      citation: '2024 (1) SCC 234',
      tags: ['Criminal Law', 'Section 302 IPC', 'Murder'],
      summary: 'In this landmark case, the Supreme Court held that mere suspicion, however strong, cannot take the place of proof beyond reasonable doubt. The prosecution must establish the guilt of the accused beyond reasonable doubt...',
      views: 1245,
      citations: 89,
    },
    {
      court: 'High Court',
      date: '10 Jan 2024',
      title: 'Priya Sharma v. Union of India',
      citation: '2024 Delhi HC 156',
      tags: ['Constitutional Law', 'Article 21', 'Right to Privacy'],
      summary: 'The Delhi High Court in this case examined the scope of right to privacy under Article 21 of the Constitution. The court held that privacy is a fundamental right and any interference must be justified...',
      views: 892,
      citations: 45,
    },
    {
      court: 'District Court',
      date: '08 Jan 2024',
      title: 'Ram Singh v. State Bank of India',
      citation: '2024 (1) Civil Court 78',
      tags: ['Banking Law', 'Consumer Rights', 'Negligence'],
      summary: 'This case dealt with the liability of banks in cases of unauthorized transactions. The court held that banks have a duty of care towards their customers and must implement adequate security measures...',
      views: 456,
      citations: 12,
    },
    {
      court: 'Supreme Court',
      date: '05 Jan 2024',
      title: 'Environmental Protection Society v. State of Gujarat',
      citation: '2024 (1) SCC 189',
      tags: ['Environmental Law', 'Public Interest', 'Pollution Control'],
      summary: 'The Supreme Court reiterated the principle of sustainable development and held that economic progress cannot be at the cost of environmental degradation. The polluter pays principle was emphasized...',
      views: 2103,
      citations: 156,
    },
  ];

  const courtColors: Record<string, string> = {
    'Supreme Court': 'bg-destructive',
    'High Court': 'bg-primary',
    'District Court': 'bg-success',
  };

  return (
    <div className="min-h-screen pt-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-foreground animate-fade-in">
          {t('judgements.title')}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Panel */}
          <div className="lg:col-span-1 bg-card rounded-xl shadow-lg p-6 animate-slide-in-left h-fit">
            <div className="flex items-center space-x-2 mb-6">
              <FontAwesomeIcon icon={faFilter} className="text-primary" />
              <h2 className="text-lg font-bold text-foreground">{t('judgements.advancedFilters')}</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground">{t('judgements.courtType')}</label>
                <select className="w-full px-3 py-2 bg-muted border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>{t('judgements.allCourts')}</option>
                  <option>Supreme Court</option>
                  <option>High Court</option>
                  <option>District Court</option>
                  <option>Tribunal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground">{t('judgements.year')}</label>
                <select className="w-full px-3 py-2 bg-muted border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>{t('judgements.allYears')}</option>
                  <option>2024</option>
                  <option>2023</option>
                  <option>2022</option>
                  <option>2021</option>
                  <option>2020</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground">{t('judgements.month')}</label>
                <select className="w-full px-3 py-2 bg-muted border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>{t('judgements.allMonths')}</option>
                  <option>January</option>
                  <option>February</option>
                  <option>March</option>
                  <option>April</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground">{t('judgements.legalAct')}</label>
                <select className="w-full px-3 py-2 bg-muted border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>{t('judgements.allActs')}</option>
                  <option>IPC</option>
                  <option>CrPC</option>
                  <option>CPC</option>
                  <option>Constitution</option>
                  <option>Evidence Act</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground">{t('judgements.category')}</label>
                <div className="space-y-2">
                  {['Criminal', 'Civil', 'Constitutional', 'Tax', 'Family Law'].map((cat) => (
                    <label key={cat} className="flex items-center space-x-2">
                      <input type="checkbox" className="w-4 h-4 text-primary rounded" />
                      <span className="text-sm text-foreground">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button className="w-full bg-primary text-white py-2 rounded-lg hover:shadow-glow hover:scale-105 active:scale-95 transition-all duration-300">
                {t('judgements.applyFilters')}
              </button>
              <button className="w-full bg-muted text-foreground py-2 rounded-lg hover:bg-muted/80 hover:scale-105 active:scale-95 transition-all duration-300">
                {t('judgements.reset')}
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 animate-slide-in-right">
            {/* Search and View Options */}
            <div className="bg-card rounded-xl shadow-lg p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 flex items-center space-x-2">
                  <FontAwesomeIcon icon={faSearch} className="text-muted-foreground" />
                  <input
                      type="text"
                      placeholder={t('judgements.searchPlaceholder')}
                      className="flex-1 px-4 py-2 bg-muted border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:scale-[1.02] transition-all duration-300"
                    />
                  <button className="px-6 py-2 bg-primary text-white rounded-lg hover:shadow-glow hover:scale-105 active:scale-95 transition-all duration-300">
                    {t('judgements.search')}
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-all duration-300 hover:scale-110 active:scale-95 ${
                      viewMode === 'list' ? 'bg-primary text-white shadow-glow' : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    <FontAwesomeIcon icon={faList} />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-all duration-300 hover:scale-110 active:scale-95 ${
                      viewMode === 'grid' ? 'bg-primary text-white shadow-glow' : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    <FontAwesomeIcon icon={faTh} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 text-sm">
                <div className="text-muted-foreground">
                  {t('judgements.showing')} <span className="font-semibold text-foreground">4</span> {t('judgements.of')} <span className="font-semibold text-foreground">50,000</span> {t('judgements.results')}
                </div>
                <select className="px-3 py-1 bg-muted border border-input rounded text-foreground">
                  <option>{t('judgements.mostRecent')}</option>
                  <option>{t('judgements.mostRelevant')}</option>
                  <option>{t('judgements.mostCited')}</option>
                  <option>{t('judgements.oldestFirst')}</option>
                </select>
              </div>
            </div>

            {/* Judgement Cards */}
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
              {judgements.map((judgement, index) => (
                <div
                  key={index}
                  className="bg-card rounded-xl shadow-lg p-6 hover:shadow-xl hover-lift transition-all duration-300 animate-slide-up cursor-pointer group border border-border hover:border-primary/30"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-3 py-1 ${courtColors[judgement.court]} text-white text-xs font-semibold rounded-full`}>
                      {judgement.court}
                    </span>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <FontAwesomeIcon icon={faCalendar} className="text-xs" />
                      <span>{judgement.date}</span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">{judgement.title}</h3>
                  <div className="text-sm text-muted-foreground mb-3 font-mono">{judgement.citation}</div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {judgement.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-muted text-foreground text-xs rounded hover:bg-primary hover:text-white transition-all duration-300 hover:scale-105">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{judgement.summary}</p>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <FontAwesomeIcon icon={faEye} />
                        <span>{judgement.views}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FontAwesomeIcon icon={faQuoteRight} />
                        <span>{judgement.citations}</span>
                      </div>
                    </div>
                    <button className="flex items-center space-x-2 text-primary hover:text-secondary transition-all duration-300 group-hover:translate-x-2">
                      <span className="font-semibold">{t('judgements.readFull')}</span>
                      <FontAwesomeIcon icon={faArrowRight} className="group-hover:scale-125 transition-transform duration-300" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center space-x-2 mt-8">
              <button className="px-4 py-2 bg-card rounded-lg hover:bg-muted hover:scale-110 active:scale-95 transition-all duration-300">
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              {[1, 2, 3, 4, 5].map((page) => (
                <button
                  key={page}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 ${
                    page === 1 ? 'bg-primary text-white shadow-glow' : 'bg-card hover:bg-muted'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button className="px-4 py-2 bg-card rounded-lg hover:bg-muted hover:scale-110 active:scale-95 transition-all duration-300">
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Judgements;
