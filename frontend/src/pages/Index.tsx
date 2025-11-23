import { useState } from 'react';
import Navigation from '@/components/Navigation';
import Hero from '@/components/Hero';
import Chatbot from '@/components/Chatbot';
import Judgements from '@/components/Judgements';
import LawReference from '@/components/LawReferenceEnhanced';

const Index = () => {
  const [activeSection, setActiveSection] = useState('home');

  const handleNavigate = (section: string) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'home':
        return <Hero onNavigate={handleNavigate} />;
      case 'chatbot':
        return <Chatbot />;
      case 'judgements':
        return <Judgements />;
      case 'laws':
        return <LawReference />;
      case 'profile':
        return (
          <div className="min-h-screen pt-16 flex items-center justify-center">
            <div className="text-center animate-fade-in">
              <h1 className="text-4xl font-bold mb-4">Profile Coming Soon</h1>
              <p className="text-muted-foreground">
                User profile and authentication features will be available soon.
              </p>
            </div>
          </div>
        );
      default:
        return <Hero onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation activeSection={activeSection} onNavigate={handleNavigate} />
      {renderSection()}
    </div>
  );
};

export default Index;
