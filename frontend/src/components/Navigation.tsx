import { useState } from 'react';
import {
  Bot,
  Landmark,
  Menu,
  User,
  X,
  GraduationCap,
  Scale,
  BookOpen,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NavigationProps {
  activeSection: string;
  onNavigate: (section: string) => void;
}

const Navigation = ({ activeSection, onNavigate }: NavigationProps) => {
  const { t } = useTranslation('common');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home',         label: t('nav.home'),         Icon: GraduationCap },
    { id: 'chatbot',      label: t('nav.assistant'),    Icon: Bot },
    { id: 'lms',          label: 'LexLearn Pro',        Icon: BookOpen },
    { id: 'constitution', label: t('nav.constitution'), Icon: Landmark },
    { id: 'profile',      label: t('nav.profile'),      Icon: User },
  ] as const;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/80 bg-card/90 backdrop-blur-md shadow-sm supports-[backdrop-filter]:bg-card/75">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <button
            type="button"
            className="flex items-center gap-2.5 group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onNavigate('home')}
          >
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm group-hover:shadow-glow transition-shadow duration-300">
              <Scale className="w-5 h-5 text-white" strokeWidth={1.75} />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground group-hover:text-primary transition-colors duration-200">
              Nyria
            </span>
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => {
              const active = activeSection === item.id;
              const Icon = item.Icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <Icon
                    className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-primary' : ''}`}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden text-foreground rounded-lg p-2.5 border border-border bg-background hover:bg-muted transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" strokeWidth={1.75} />
            ) : (
              <Menu className="w-5 h-5" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-3 pt-1 pb-3 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.Icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    activeSection === item.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-muted/70'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" strokeWidth={1.75} aria-hidden />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
