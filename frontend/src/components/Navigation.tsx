import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBalanceScale, faRobot, faGavel, faBookOpen, faUser, faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

interface NavigationProps {
  activeSection: string;
  onNavigate: (section: string) => void;
}

const Navigation = ({ activeSection, onNavigate }: NavigationProps) => {
  const { t } = useTranslation('common');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [lang, setLang] = useState<string>(i18n.language || 'en');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'home', label: t('nav.home'), icon: faBalanceScale },
    { id: 'chatbot', label: t('nav.assistant'), icon: faRobot },
    { id: 'judgements', label: t('nav.judgements'), icon: faGavel },
    { id: 'laws', label: t('nav.laws'), icon: faBookOpen },
    { id: 'profile', label: t('nav.profile'), icon: faUser },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'glass-effect shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2 group cursor-pointer" onClick={() => onNavigate('home')}>
            <FontAwesomeIcon icon={faBalanceScale} className="text-primary text-2xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 group ${
                  activeSection === item.id
                    ? 'bg-primary text-white shadow-glow scale-105'
                    : 'text-foreground hover:bg-muted hover:scale-105'
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="group-hover:scale-110 transition-transform duration-300" />
                <span>{item.label}</span>
              </button>
            ))}
          {/* Language Switcher */}
          <select
            value={lang}
            onChange={(e) => {
              const newLang = e.target.value;
              setLang(newLang);
              i18n.changeLanguage(newLang);
              try { localStorage.setItem('lang', newLang); } catch {}
            }}
            className="ml-3 px-3 py-2 bg-muted border border-input rounded-lg text-sm text-foreground hover:bg-muted/80"
          >
            <option value="en">English</option>
            <option value="ta">தமிழ்</option>
          </select>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground hover:bg-muted rounded-lg p-2 hover:scale-110 active:scale-95 transition-all duration-300"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <FontAwesomeIcon icon={isMobileMenuOpen ? faTimes : faBars} className="text-xl" />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden glass-effect border-t border-border animate-slide-down">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-300 animate-scale-in group ${
                  activeSection === item.id
                    ? 'bg-primary text-white scale-105'
                    : 'text-foreground hover:bg-muted hover:scale-105'
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <FontAwesomeIcon icon={item.icon} className="group-hover:scale-110 transition-transform duration-300" />
                <span>{item.label}</span>
              </button>
            ))}
            <div className="pt-2">
              <select
                value={lang}
                onChange={(e) => {
                  const newLang = e.target.value;
                  setLang(newLang);
                  i18n.changeLanguage(newLang);
                  try { localStorage.setItem('lang', newLang); } catch {}
                }}
                className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm text-foreground"
              >
                <option value="en">English</option>
                <option value="ta">தமிழ்</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
