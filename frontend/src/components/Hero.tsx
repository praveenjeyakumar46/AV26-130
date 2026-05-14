import { useMemo } from 'react';
import {
  Bot,
  GraduationCap,
  Landmark,
  Sparkles,
  Shield,
  BookOpen,
  Users,
  Scale,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HeroProps {
  onNavigate: (section: string) => void;
}

const Hero = ({ onNavigate }: HeroProps) => {
  const { t } = useTranslation('common');

  const features: Array<{
    icon: LucideIcon;
    title: string;
    description: string;
    action: string;
  }> = useMemo(
    () => [
      {
        icon: Bot,
        title: t('hero.features.chatbotTitle', { defaultValue: 'Legal Chatbot' }),
        description: t('hero.features.chatbotDesc', {
          defaultValue: 'Get instant answers to your legal questions with our AI-powered assistant',
        }),
        action: 'chatbot',
      },
      {
        icon: Landmark,
        title: t('hero.features.constitutionTitle', { defaultValue: 'Constitution' }),
        description: t('hero.features.constitutionDesc', {
          defaultValue: 'Browse articles and provisions of the Indian Constitution',
        }),
        action: 'constitution',
      },
    ],
    [t],
  );

  return (
    <div className="relative overflow-x-hidden">
      {/* ── Illustration layer: floating law motifs ── */}
      <div aria-hidden className="pointer-events-none select-none absolute inset-0 overflow-hidden">
        {/* Large ambient orb — top right */}
        <div className="absolute -top-40 -right-40 w-[640px] h-[640px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, hsl(270 32% 27%), transparent 70%)' }} />
        {/* Secondary orb — bottom left */}
        <div className="absolute top-[60%] -left-32 w-[480px] h-[480px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, hsl(349 79% 59%), transparent 70%)' }} />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'linear-gradient(hsl(270 32% 27%) 1px, transparent 1px), linear-gradient(90deg, hsl(270 32% 27%) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        {/* Floating SVG law icons */}
        <svg className="absolute top-24 left-[8%] opacity-[0.08]" style={{ animation: 'law-float-drift 18s ease-in-out infinite' }} width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="hsl(270 32% 27%)" strokeWidth="1.2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <svg className="absolute top-56 right-[12%] opacity-[0.07]" style={{ animation: 'law-float-drift 22s ease-in-out infinite reverse', animationDelay: '-6s' }} width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="hsl(349 79% 59%)" strokeWidth="1.2">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4l2 2"/>
        </svg>
        <svg className="absolute top-[38%] left-[5%] opacity-[0.06]" style={{ animation: 'law-float-drift 26s ease-in-out infinite', animationDelay: '-12s' }} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="hsl(270 32% 27%)" strokeWidth="1.2">
          <rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h8M8 14h4"/>
        </svg>
        <svg className="absolute top-[70%] right-[6%] opacity-[0.06]" style={{ animation: 'law-float-drift 20s ease-in-out infinite reverse', animationDelay: '-4s' }} width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="hsl(349 79% 59%)" strokeWidth="1.2">
          <path d="M3 6l9-4 9 4M3 6v12l9 4 9-4V6M12 2v20"/>
        </svg>
        <svg className="absolute bottom-40 left-[20%] opacity-[0.05]" style={{ animation: 'law-float-drift 30s ease-in-out infinite', animationDelay: '-8s' }} width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="hsl(270 32% 27%)" strokeWidth="1.2">
          <path d="M12 3 L3 8 L3 16 L12 21 L21 16 L21 8 Z"/>
        </svg>
      </div>

      {/* ── HERO BANNER ── */}
      <div className="relative border-b border-border/80 bg-gradient-to-b from-card/90 via-muted/35 to-transparent backdrop-blur-[2px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary tracking-wide uppercase">AI-Powered Legal Platform</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 tracking-tight leading-[1.05]">
            {t('hero.title')}
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
            {t('hero.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center flex-wrap">
            <button
              type="button"
              onClick={() => onNavigate('chatbot')}
              className="gradient-primary text-white px-10 py-4 rounded-xl font-semibold text-base shadow-md hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center gap-2"
            >
              {t('hero.getStarted')}
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('constitution')}
              className="border-2 border-primary/30 bg-background text-primary px-10 py-4 rounded-xl font-semibold text-base hover:bg-primary/5 hover:border-primary/50 transition-all duration-200"
            >
              {t('hero.exploreConstitution', { defaultValue: 'Explore Constitution' })}
            </button>
          </div>

          <div className="mt-14 flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm font-medium text-muted-foreground">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />{t('hero.indicators.ai')}</span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary/60" />{t('hero.indicators.reference')}</span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-secondary/60" />{t('hero.indicators.db')}</span>
          </div>
        </div>
      </div>

      {/* ── SERVICES CARDS ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-5 text-foreground tracking-tight">
            {t('hero.servicesTitle')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('hero.servicesSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <button
                type="button"
                key={feature.action}
                className="w-full sm:w-[min(100%,22rem)] lg:w-96 text-left rounded-2xl p-8 border border-border bg-card shadow-sm hover:border-primary/40 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => onNavigate(feature.action)}
              >
                <div>
                  <div className="w-16 h-16 rounded-2xl gradient-primary text-white flex items-center justify-center mb-6 shadow-md group-hover:shadow-glow transition-shadow duration-300">
                    <Icon className="w-8 h-8" strokeWidth={1.75} aria-hidden />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-base leading-relaxed mb-6">{feature.description}</p>
                  <div className="flex items-center text-primary font-semibold text-sm gap-1.5 group-hover:gap-3 transition-all duration-200">
                    <span>{t('hero.learnMore')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ABOUT SECTION ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 relative z-10">
        <div className="rounded-3xl border border-border bg-card shadow-lg overflow-hidden">
          {/* Header strip */}
          <div className="gradient-primary px-10 py-8 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <GraduationCap className="w-7 h-7 text-white" strokeWidth={1.75} aria-hidden />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-white tracking-tight">{t('hero.aboutTitle')}</h3>
              <p className="text-white/80 mt-1.5 text-base leading-relaxed max-w-2xl">{t('hero.aboutBody')}</p>
            </div>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="p-8 hover:bg-muted/30 transition-colors duration-200 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <Scale className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <p className="font-bold text-foreground text-lg mb-2">{t('hero.aboutCard1Title')}</p>
              <p className="text-muted-foreground leading-relaxed text-base">{t('hero.aboutCard1Desc')}</p>
            </div>
            <div className="p-8 hover:bg-muted/30 transition-colors duration-200 group">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-4 group-hover:bg-secondary/15 transition-colors">
                <BookOpen className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <p className="font-bold text-foreground text-lg mb-2">{t('hero.aboutCard2Title')}</p>
              <p className="text-muted-foreground leading-relaxed text-base">{t('hero.aboutCard2Desc')}</p>
            </div>
            <div className="p-8 hover:bg-muted/30 transition-colors duration-200 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-100/80 transition-colors">
                <Users className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <p className="font-bold text-foreground text-lg mb-2">{t('hero.aboutCard3Title')}</p>
              <p className="text-muted-foreground leading-relaxed text-base">{t('hero.aboutCard3Desc')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
