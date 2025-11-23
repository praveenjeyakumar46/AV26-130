import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBalanceScale, faRobot, faGavel, faBookOpen, faShield } from '@fortawesome/free-solid-svg-icons';
import heroImage from '@/assets/legal-hero.jpg';
import { useTranslation } from 'react-i18next';

interface HeroProps {
  onNavigate: (section: string) => void;
}

const Hero = ({ onNavigate }: HeroProps) => {
  const { t } = useTranslation('common');
  const features = [
    {
      icon: faRobot,
      title: t('hero.features.chatbotTitle', { defaultValue: 'Legal Chatbot' }),
      description: t('hero.features.chatbotDesc', { defaultValue: 'Get instant answers to your legal questions with our AI-powered assistant' }),
      action: 'chatbot',
    },
    {
      icon: faGavel,
      title: t('hero.features.judgementsTitle', { defaultValue: 'Case Judgements' }),
      description: t('hero.features.judgementsDesc', { defaultValue: 'Access thousands of court judgements and legal precedents' }),
      action: 'judgements',
    },
    {
      icon: faBookOpen,
      title: t('hero.features.lawTitle', { defaultValue: 'Law Database' }),
      description: t('hero.features.lawDesc', { defaultValue: 'Comprehensive database of Indian laws and legal provisions' }),
      action: 'laws',
    },
    {
      icon: faShield,
      title: t('hero.features.protectionTitle', { defaultValue: 'Legal Protection' }),
      description: t('hero.features.protectionDesc', { defaultValue: 'Understand your rights and legal protections under Indian law' }),
      action: 'profile',
    },
  ];

  return (
    <div className="min-h-screen pt-16">
      {/* Hero Section */}
      <div
        className="relative overflow-hidden gradient-hero py-24 px-4"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(20, 184, 166, 0.95) 0%, rgba(16, 185, 129, 0.95) 100%), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating Circles */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full animate-blob" />
          <div className="absolute top-40 right-20 w-40 h-40 bg-white/5 rounded-full animate-blob" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-32 left-1/4 w-24 h-24 bg-white/10 rounded-full animate-blob" style={{ animationDelay: '4s' }} />
          
          {/* Geometric Shapes */}
          <div className="absolute top-1/4 right-1/3 w-16 h-16 border-2 border-white/20 rotate-45 animate-spin-slow" />
          <div className="absolute bottom-1/3 left-1/4 w-20 h-20 border-2 border-white/15 animate-float-slow" />
          
          {/* Particles */}
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/30 rounded-full animate-float"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="mb-8 relative">
            <div className="inline-block animate-float">
              <FontAwesomeIcon icon={faBalanceScale} className="text-white text-8xl drop-shadow-2xl" />
            </div>
            {/* Glow effect behind icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-white/20 rounded-full blur-3xl animate-pulse-glow" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 animate-fade-in drop-shadow-lg">
            {t('hero.title')}
          </h1>
          
          <p className="text-xl md:text-2xl text-white/95 mb-10 max-w-3xl mx-auto animate-fade-in leading-relaxed drop-shadow">
            {t('hero.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up">
            <button
              onClick={() => onNavigate('chatbot')}
              className="bg-white text-primary px-10 py-4 rounded-xl font-bold text-lg shadow-2xl hover:shadow-glow hover:scale-110 active:scale-95 transition-all duration-300 group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center">
                {t('hero.getStarted')}
                <span className="ml-2 inline-block group-hover:translate-x-2 transition-transform duration-300">→</span>
              </span>
              <div className="absolute inset-0 gradient-primary opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
            </button>
            <button
              onClick={() => onNavigate('judgements')}
              className="border-2 border-white text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-white hover:text-primary hover:scale-110 active:scale-95 transition-all duration-300 backdrop-blur-sm group relative overflow-hidden"
            >
              <span className="relative z-10">{t('hero.exploreCases')}</span>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 flex flex-wrap justify-center gap-8 text-white/90 animate-fade-in">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse-glow" />
              <span className="text-sm md:text-base font-medium">{t('hero.indicators.ai')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse-glow" style={{ animationDelay: '0.5s' }} />
              <span className="text-sm md:text-base font-medium">{t('hero.indicators.cases')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse-glow" style={{ animationDelay: '1s' }} />
              <span className="text-sm md:text-base font-medium">{t('hero.indicators.db')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            {t('hero.servicesTitle')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('hero.servicesSubtitle')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-card rounded-xl p-6 border border-border hover:border-primary/30 shadow-sm hover:shadow-xl hover-lift transition-all duration-300 cursor-pointer group animate-slide-up relative overflow-hidden"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => onNavigate(feature.action)}
            >
              {/* Hover gradient effect */}
              <div className="absolute inset-0 gradient-primary opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
              
              <div className="relative z-10">
                <div className="w-14 h-14 gradient-primary rounded-lg flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-glow">
                  <FontAwesomeIcon icon={feature.icon} className="text-white text-xl" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors duration-300">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{feature.description}</p>
                <div className="flex items-center text-primary font-medium text-sm group-hover:translate-x-2 transition-all duration-300">
                  <span>{t('hero.learnMore')}</span>
                  <span className="ml-2 group-hover:scale-125 transition-transform duration-300">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Hero;
