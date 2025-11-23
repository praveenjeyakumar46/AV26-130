import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faBookOpen,
  faGavel,
  faFileAlt,
  faLandmark,
  faBalanceScale,
  faBriefcase,
  faChevronDown,
  faChevronRight,
  faBookmark,
  faShare,
  faFolder,
  faDownload,
  faStar,
} from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

interface Section {
  number: string;
  heading: string;
  content: string;
  tags?: string[];
  relatedCases?: number;
  popular?: boolean;
}

interface Chapter {
  title: string;
  range: string;
  sections: Section[];
  popular?: boolean;
}

const LawReference = () => {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState('ipc');
  const [expandedChapters, setExpandedChapters] = useState<number[]>([0]);

  const tabs = [
    { id: 'ipc', label: 'Indian Penal Code', icon: faGavel, count: 511 },
    { id: 'crpc', label: 'CrPC', icon: faBalanceScale, count: 484 },
    { id: 'cpc', label: 'CPC', icon: faFileAlt, count: 158 },
    { id: 'constitution', label: 'Constitution', icon: faLandmark, count: 395 },
    { id: 'evidence', label: 'Evidence Act', icon: faBookOpen, count: 167 },
    { id: 'labour', label: 'Labour Laws', icon: faBriefcase, count: 25 },
  ];

  const ipcChapters: Chapter[] = [
    {
      title: 'Introduction',
      range: 'Sections 1-5',
      popular: true,
      sections: [
        {
          number: 'Section 1',
          heading: 'Title and extent of operation of the Code',
          content: 'This Act shall be called the Indian Penal Code, and shall extend to the whole of India except the State of Jammu and Kashmir.',
        },
        {
          number: 'Section 6',
          heading: 'Definitions in the Code to be understood subject to exceptions',
          content: 'Throughout this Code every definition of an offence, every penal provision, and every illustration of every such definition or penal provision, shall be understood subject to the exceptions contained in the Chapter entitled "General Exceptions", though those exceptions are not repeated in such definition, penal provision, or illustration.',
        },
      ],
    },
    {
      title: 'Of Offences Affecting The Human Body',
      range: 'Sections 299-377',
      popular: true,
      sections: [
        {
          number: 'Section 302',
          heading: 'Punishment for murder',
          content: 'Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.',
          tags: ['Non-Bailable', 'Cognizable', 'Death Penalty'],
          relatedCases: 12456,
          popular: true,
        },
        {
          number: 'Section 304',
          heading: 'Punishment for culpable homicide not amounting to murder',
          content: 'Whoever commits culpable homicide not amounting to murder shall be punished with imprisonment for life, or imprisonment of either description for a term which may extend to ten years, and shall also be liable to fine, if the act by which the death is caused is done with the intention of causing death...',
          tags: ['Non-Bailable', 'Cognizable'],
          relatedCases: 8934,
        },
        {
          number: 'Section 376',
          heading: 'Punishment for rape',
          content: 'Whoever, except in the cases provided for in sub-section (2), commits rape, shall be punished with rigorous imprisonment of either description for a term which shall not be less than ten years, but which may extend to imprisonment for life, and shall also be liable to fine.',
          tags: ['Non-Bailable', 'Cognizable', 'Non-Compoundable'],
          relatedCases: 15678,
          popular: true,
        },
      ],
    },
    {
      title: 'Of Offences Against Property',
      range: 'Sections 378-462',
      sections: [
        {
          number: 'Section 378',
          heading: 'Theft',
          content: 'Whoever, intending to take dishonestly any movable property out of the possession of any person without that person\'s consent, moves that property in order to such taking, is said to commit theft.',
          tags: ['Bailable', 'Cognizable'],
          relatedCases: 9234,
        },
      ],
    },
  ];

  const toggleChapter = (index: number) => {
    setExpandedChapters((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="min-h-screen pt-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-foreground animate-fade-in">
            {t('laws.title')}
          </h1>
          <button className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:shadow-glow transition-all duration-300">
            <FontAwesomeIcon icon={faDownload} />
            <span>{t('laws.downloadPdf')}</span>
          </button>
        </div>

        {/* Category Tabs */}
        <div className="mb-8 animate-slide-up">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-4 rounded-xl transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-glow'
                    : 'bg-card hover:bg-muted'
                }`}
              >
                <FontAwesomeIcon icon={tab.icon} className="text-2xl mb-2" />
                <div className="font-bold text-sm mb-1">{tab.label}</div>
                <div className="text-xs opacity-80">{tab.count} {tab.id === 'labour' ? 'Acts' : 'Sections'}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-card rounded-xl shadow-lg p-4 mb-6 animate-fade-in">
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faSearch} className="text-muted-foreground" />
            <input
              type="text"
              placeholder={t('laws.searchPlaceholder')}
              className="flex-1 px-4 py-2 bg-muted border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button className="px-6 py-2 bg-primary text-white rounded-lg hover:shadow-glow transition-all duration-300">
              {t('judgements.search')}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-card rounded-xl shadow-lg animate-slide-up">
          {ipcChapters.map((chapter, chapterIndex) => (
            <div key={chapterIndex} className="border-b border-border last:border-b-0">
              {/* Chapter Header */}
              <button
                onClick={() => toggleChapter(chapterIndex)}
                className="w-full p-6 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <FontAwesomeIcon
                    icon={faFolder}
                    className="text-primary text-xl"
                  />
                  <div className="text-left">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-bold text-foreground">{chapter.title}</h3>
                      {chapter.popular && (
                        <span className="px-2 py-0.5 bg-accent text-white text-xs rounded-full flex items-center space-x-1">
                          <FontAwesomeIcon icon={faStar} className="text-xs" />
                          <span>{t('laws.mostSearched')}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{chapter.range}</p>
                  </div>
                </div>
                <FontAwesomeIcon
                  icon={expandedChapters.includes(chapterIndex) ? faChevronDown : faChevronRight}
                  className="text-muted-foreground"
                />
              </button>

              {/* Sections */}
              {expandedChapters.includes(chapterIndex) && (
                <div className="px-6 pb-6 space-y-4">
                  {chapter.sections.map((section, sectionIndex) => (
                    <div
                      key={sectionIndex}
                      className={`p-4 rounded-lg border-l-4 transition-all duration-300 hover:shadow-md ${
                        section.popular
                          ? 'border-accent bg-accent/5'
                          : 'border-primary bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-mono font-bold text-primary">
                              {section.number}
                            </span>
                            {section.popular && (
                              <span className="px-2 py-0.5 bg-accent text-white text-xs rounded">
                                {t('laws.popular')}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-foreground mb-2">{section.heading}</h4>
                        </div>
                      </div>

                      <p className="text-sm text-foreground leading-relaxed mb-3">
                        {section.content}
                      </p>

                      {section.tags && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {section.tags.map((tag, i) => (
                            <span
                              key={i}
                              className={`px-2 py-1 text-xs rounded ${
                                tag.includes('Non-')
                                  ? 'bg-destructive/10 text-destructive'
                                  : 'bg-success/10 text-success'
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <div className="flex items-center space-x-4">
                          <button className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                            <FontAwesomeIcon icon={faBookmark} />
                            <span>{t('laws.bookmark')}</span>
                          </button>
                          <button className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                            <FontAwesomeIcon icon={faShare} />
                            <span>{t('laws.share')}</span>
                          </button>
                        </div>
                        {section.relatedCases && (
                          <button className="flex items-center space-x-2 text-sm text-primary hover:text-secondary transition-colors font-semibold">
                            <FontAwesomeIcon icon={faGavel} />
                            <span>{section.relatedCases.toLocaleString()} {t('laws.relatedCases')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LawReference;
