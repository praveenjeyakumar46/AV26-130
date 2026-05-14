import { useTranslation } from 'react-i18next';

export const useLegalTranslation = () => {
  const { t, i18n } = useTranslation('common');
  
  // Helper for legal section translations
  const translateLegalSection = (section: string) => {
    // Map common legal terms
    const legalTerms: Record<string, { en: string; ta: string }> = {
      'Article': { en: 'Article', ta: 'பிரிவு' },
      'Section': { en: 'Section', ta: 'பகுதி' },
      'IPC': { en: 'IPC', ta: 'இந்திய தண்டனைச் சட்டம்' },
      'CrPC': { en: 'CrPC', ta: 'குற்றவியல் நடைமுறைச் சட்டம்' },
      'CPC': { en: 'CPC', ta: 'சிவில் நடைமுறைச் சட்டம்' },
      'Constitution': { en: 'Constitution', ta: 'அரசியலமைப்பு' },
      'Act': { en: 'Act', ta: 'சட்டம்' },
      'Code': { en: 'Code', ta: 'குறியீடு' },
      'Chapter': { en: 'Chapter', ta: 'அத்தியாயம்' },
    };
    
    const lang = i18n.language as 'en' | 'ta';
    
    // Replace terms
    let translated = section;
    Object.entries(legalTerms).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      translated = translated.replace(regex, value[lang]);
    });
    
    return translated;
  };
  
  return {
    t,
    translateLegalSection,
    currentLanguage: i18n.language,
    isTamil: i18n.language === 'ta',
  };
};
