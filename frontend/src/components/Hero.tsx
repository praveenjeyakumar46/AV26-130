import { useMemo } from 'react';
import {
  Bot,
  GraduationCap,
  Landmark,
  Sparkles,
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
    <div>
      <div className="border-b border-border/80 bg-gradient-to-b from-card/90 via-muted/35 to-transparent backdrop-blur-[2px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-5 tracking-tight">
            {t('hero.title')}
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('hero.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center flex-wrap">
            <button
              type="button"
              onClick={() => onNavigate('chatbot')}
              className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold text-base shadow-sm hover:opacity-95 active:opacity-100 transition-opacity"
            >
              <span className="flex items-center justify-center gap-2">
                {t('hero.getStarted')}
                <span aria-hidden>→</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('constitution')}
              className="border border-border bg-background text-foreground px-8 py-3 rounded-lg font-semibold text-base hover:bg-muted transition-colors"
            >
              {t('hero.exploreConstitution', { defaultValue: 'Explore Constitution' })}
            </button>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
            <span>{t('hero.indicators.ai')}</span>
            <span className="hidden sm:inline text-muted-foreground/40" aria-hidden>
              ·
            </span>
            <span>{t('hero.indicators.reference')}</span>
            <span className="hidden sm:inline text-muted-foreground/40" aria-hidden>
              ·
            </span>
            <span>{t('hero.indicators.db')}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground tracking-tight">
            {t('hero.servicesTitle')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('hero.servicesSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <button
                type="button"
                key={feature.action}
                className="w-full sm:w-[min(100%,20rem)] lg:w-80 text-left rounded-lg p-6 border border-border bg-card shadow-sm hover:border-primary/30 hover:shadow-md transition-shadow"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => onNavigate(feature.action)}
              >
                <div>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" strokeWidth={1.75} aria-hidden />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">{feature.description}</p>
                  <div className="flex items-center text-primary font-medium text-sm gap-1">
                    <span>{t('hero.learnMore')}</span>
                    <span aria-hidden>→</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 tracking-tight">
            {t('hero.learningTracksTitle')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            {t('hero.learningTracksSubtitle')}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: Sparkles,
              titleKey: 'hero.track1Title',
              descKey: 'hero.track1Desc',
              action: 'chatbot' as const,
            },
            {
              icon: Landmark,
              titleKey: 'hero.track2Title',
              descKey: 'hero.track2Desc',
              action: 'constitution' as const,
            },
            {
              icon: Landmark,
              titleKey: 'hero.track3Title',
              descKey: 'hero.track3Desc',
              action: 'constitution' as const,
            },
            {
              icon: Bot,
              titleKey: 'hero.track4Title',
              descKey: 'hero.track4Desc',
              action: 'chatbot' as const,
            },
          ].map(({ icon: Icon, titleKey, descKey, action }, index) => (
            <button
              key={titleKey}
              type="button"
              onClick={() => onNavigate(action)}
              className="text-left rounded-lg border border-border bg-card p-5 shadow-sm hover:border-primary/30 hover:shadow-md transition-shadow"
              style={{ animationDelay: `${index * 0.06}s` }}
            >
              <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Icon className="w-5 h-5" strokeWidth={1.75} aria-hidden />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{t(titleKey)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(descKey)}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 relative z-10">
        <div className="rounded-lg border border-border bg-card shadow-sm p-8 md:p-10">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6" strokeWidth={1.75} aria-hidden />
            </div>
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{t('hero.aboutTitle')}</h3>
              <p className="text-muted-foreground mt-2 leading-relaxed">{t('hero.aboutBody')}</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-xl p-4 border border-border/70 bg-muted/40">
              <p className="font-semibold text-foreground mb-1">{t('hero.aboutCard1Title')}</p>
              <p className="text-muted-foreground leading-relaxed">{t('hero.aboutCard1Desc')}</p>
            </div>
            <div className="rounded-xl p-4 border border-border/70 bg-muted/40">
              <p className="font-semibold text-foreground mb-1">{t('hero.aboutCard2Title')}</p>
              <p className="text-muted-foreground leading-relaxed">{t('hero.aboutCard2Desc')}</p>
            </div>
            <div className="rounded-xl p-4 border border-border/70 bg-muted/40">
              <p className="font-semibold text-foreground mb-1">{t('hero.aboutCard3Title')}</p>
              <p className="text-muted-foreground leading-relaxed">{t('hero.aboutCard3Desc')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
