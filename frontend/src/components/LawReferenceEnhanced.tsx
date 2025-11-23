import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faBookOpen,
  faGavel,
  faFileAlt,
  faChevronDown,
  faChevronRight,
  faBookmark,
  faShare,
  faFolder,
  faDownload,
  faStar,
  faSpinner,
  faExclamationCircle,
  faArrowLeft,
} from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import {
  getCategories,
  getCategorySections,
  searchSections,
  getSectionByNumber,
  downloadSectionPDF,
  shareSection,
  type LawCategory,
  type LawSection,
} from '@/lib/lawLibraryApi';

const LawReference = () => {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LawSection[]>([]);
  
  const [categories, setCategories] = useState<LawCategory[]>([]);
  const [currentSections, setCurrentSections] = useState<LawSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSections, setTotalSections] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 50;

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (activeTab) {
      loadCategorySections(activeTab, 1);
    }
  }, [activeTab]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const cats = await getCategories();
      setCategories(cats);
      if (cats.length > 0) {
        setActiveTab(cats[0].id);
      }
      setError(null);
    } catch (err) {
      setError('Failed to load categories. Please ensure the backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategorySections = async (categoryId: string, page: number) => {
    try {
      setLoading(true);
      const offset = (page - 1) * pageSize;
      const result = await getCategorySections(categoryId, pageSize, offset);
      setCurrentSections(result.sections);
      setTotalSections(result.total);
      setHasMore(result.has_more);
      setCurrentPage(page);
      setSearchResults([]);
      setSearchQuery('');
      setError(null);
    } catch (err) {
      setError('Failed to load sections.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    setActiveTab(categoryId);
    setSearchResults([]);
    setSearchQuery('');
    setCurrentPage(1);
    loadCategorySections(categoryId, 1);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      const result = await searchSections(searchQuery, activeTab);
      setSearchResults(result.results);
      setError(null);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchResults([]);
    setSearchQuery('');
    if (activeTab) {
      loadCategorySections(activeTab, 1);
    }
  };

  const handleNextPage = () => {
    if (hasMore && activeTab) {
      loadCategorySections(activeTab, currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1 && activeTab) {
      loadCategorySections(activeTab, currentPage - 1);
    }
  };

  const getIconForCategory = (icon: string) => {
    const iconMap: { [key: string]: any } = {
      'gavel': faGavel,
      'balance-scale': faGavel,
      'file-alt': faFileAlt,
      'book-open': faBookOpen,
    };
    return iconMap[icon] || faBookOpen;
  };

  const sectionsToDisplay = searchResults.length > 0 ? searchResults : currentSections;

  if (loading && categories.length === 0) {
    return (
      <div className="min-h-screen pt-16 bg-background flex items-center justify-center">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} className="text-4xl text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading law library...</p>
        </div>
      </div>
    );
  }

  if (error && categories.length === 0) {
    return (
      <div className="min-h-screen pt-16 bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <FontAwesomeIcon icon={faExclamationCircle} className="text-4xl text-destructive mb-4" />
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={loadCategories}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:shadow-glow"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground animate-fade-in">
              {t('laws.title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive Indian Law Database - {totalSections} sections
            </p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-8 animate-slide-up">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={`p-4 rounded-xl transition-all duration-300 ${
                  activeTab === category.id
                    ? 'bg-primary text-white shadow-glow'
                    : 'bg-card hover:bg-muted'
                }`}
              >
                <FontAwesomeIcon icon={getIconForCategory(category.icon)} className="text-2xl mb-2" />
                <div className="font-bold text-sm mb-1">{category.name}</div>
                <div className="text-xs opacity-80">{category.count} Sections</div>
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
              placeholder="Search by section number, title, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-2 bg-muted border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:shadow-glow transition-all duration-300 disabled:opacity-50 flex items-center space-x-2"
            >
              {isSearching ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <span>Search</span>
              )}
            </button>
            {searchResults.length > 0 && (
              <button
                onClick={handleClearSearch}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-destructive hover:text-white transition-all duration-300"
              >
                Clear
              </button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 text-sm text-muted-foreground">
              Found {searchResults.length} result(s) for "{searchQuery}"
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="bg-card rounded-xl shadow-lg animate-slide-up p-6">
          {loading ? (
            <div className="text-center py-12">
              <FontAwesomeIcon icon={faSpinner} className="text-3xl animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading sections...</p>
            </div>
          ) : sectionsToDisplay.length > 0 ? (
            <>
              <div className="space-y-4">
                {sectionsToDisplay.map((section, idx) => (
                  <SectionCard
                    key={idx}
                    section={section}
                    onDownload={downloadSectionPDF}
                    onShare={shareSection}
                  />
                ))}
              </div>

              {/* Pagination */}
              {searchResults.length === 0 && (
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                    Previous
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} • Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalSections)} of {totalSections}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={!hasMore}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    Next
                    <FontAwesomeIcon icon={faArrowLeft} className="ml-2 rotate-180" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No sections found. Try a different search or select a category.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SectionCard = ({
  section,
  onDownload,
  onShare,
}: {
  section: LawSection;
  onDownload: (section: LawSection) => void;
  onShare: (section: LawSection) => void;
}) => {
  const getBailableColor = (bailable: string) => {
    if (bailable.toLowerCase().includes('no')) return 'bg-destructive/10 text-destructive';
    if (bailable.toLowerCase().includes('yes')) return 'bg-success/10 text-success';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="p-4 rounded-lg border-l-4 border-primary bg-muted/30 transition-all duration-300 hover:shadow-md">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2 flex-wrap">
            <span className="font-mono font-bold text-primary text-lg">
              {section.Section}
            </span>
            {section.category && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">
                {section.category.toUpperCase()}
              </span>
            )}
          </div>
          <h4 className="font-bold text-foreground mb-2 text-lg">{section.Title}</h4>
          {section.Act && (
            <p className="text-sm text-muted-foreground mb-2">
              <span className="font-semibold">Act:</span> {section.Act}
            </p>
          )}
        </div>
      </div>

      <p className="text-sm text-foreground leading-relaxed mb-3 bg-background/50 p-3 rounded">
        {section.Description}
      </p>

      {section.Punishment && (
        <div className="mb-3 bg-amber-50 dark:bg-amber-900/20 p-3 rounded">
          <span className="font-semibold text-amber-700 dark:text-amber-300 text-sm">
            Punishment:
          </span>
          <p className="text-sm text-foreground mt-1">{section.Punishment}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {section.Bailable && (
          <span className={`px-3 py-1 text-xs rounded-full font-semibold ${getBailableColor(section.Bailable)}`}>
            Bailable: {section.Bailable}
          </span>
        )}
        {section.Cognizable && (
          <span className={`px-3 py-1 text-xs rounded-full font-semibold ${
            section.Cognizable.toLowerCase().includes('yes')
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}>
            Cognizable: {section.Cognizable}
          </span>
        )}
      </div>

      <div className="flex items-center space-x-4 pt-3 border-t border-border">
        <button
          onClick={() => onDownload(section)}
          className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <FontAwesomeIcon icon={faDownload} />
          <span>Download</span>
        </button>
        <button
          onClick={() => onShare(section)}
          className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <FontAwesomeIcon icon={faShare} />
          <span>Share</span>
        </button>
        <button className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-primary transition-colors">
          <FontAwesomeIcon icon={faBookmark} />
          <span>Bookmark</span>
        </button>
      </div>
    </div>
  );
};

export default LawReference;
