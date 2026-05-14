import { useState } from 'react';
import Navigation from '@/components/Navigation';
import Hero from '@/components/Hero';
import Chatbot from '@/components/Chatbot';
import ConstitutionReference from '@/components/ConstitutionReference';
import Profile from '@/components/Profile';
import PageBackground from '@/components/PageBackground';
import FloatingLawMotifs from '@/components/FloatingLawMotifs';

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
      case 'constitution':
        return <ConstitutionReference />;
      case 'profile':
        return <Profile />;
      default:
        return <Hero onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="relative isolate min-h-dvh text-foreground">
      <FloatingLawMotifs />
      <Navigation activeSection={activeSection} onNavigate={handleNavigate} />
      <main className="relative z-10 min-h-dvh flex flex-col">
        <PageBackground>{renderSection()}</PageBackground>
      </main>
    </div>
  );
};

export default Index;
