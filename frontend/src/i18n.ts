import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const savedLang = typeof window !== "undefined" ? localStorage.getItem("lang") : null;
const fallbackLng = "en";

// Minimal inline resources (will be merged with JSON imports if present)
const resources = {
  en: {
    common: {
      nav: {
        home: "Home",
        assistant: "Legal Assistant",
        judgements: "Judgements",
        laws: "Law Reference",
        profile: "Profile",
        language: "Language",
      },
      hero: {
        title: "Your Legal Guidance Platform",
        subtitle: "Navigate the complexities of Indian law with AI-powered assistance, comprehensive case judgements, and complete legal reference",
        getStarted: "Get Started Free",
        exploreCases: "Explore Cases",
        learnMore: "Learn more",
        servicesTitle: "Comprehensive Legal Services",
        servicesSubtitle: "Everything you need for legal research, guidance, and protection in one powerful platform",
        indicators: {
          ai: "AI-Powered Assistance",
          cases: "50,000+ Legal Cases",
          db: "Comprehensive Database",
        },
      },
      chatbot: {
        welcome: "Hello! I'm your Legal Assistant. I can help you with:\n\n• Understanding legal rights and procedures\n• Explaining laws, regulations, and legal acts\n• Providing guidance on legal matters\n• Clarifying legal sections and codes\n• General legal advice for your legal department\n\nHow can I assist you today?",
        placeholder: "Type your legal question...",
        online: "Online",
        offline: "Offline",
        connecting: "Connecting...",
      },
      judgements: {
        title: "Case Judgements Database",
        advancedFilters: "Advanced Filters",
        courtType: "Court Type",
        allCourts: "All Courts",
        year: "Year",
        allYears: "All Years",
        month: "Month",
        allMonths: "All Months",
        legalAct: "Legal Act",
        allActs: "All Acts",
        category: "Category",
        applyFilters: "Apply Filters",
        reset: "Reset",
        searchPlaceholder: "Search judgements, case numbers, or keywords...",
        search: "Search",
        showing: "Showing",
        of: "of",
        results: "results",
        mostRecent: "Most Recent",
        mostRelevant: "Most Relevant",
        mostCited: "Most Cited",
        oldestFirst: "Oldest First",
        readFull: "Read Full Judgement",
      },
      laws: {
        title: "Law Reference Library",
        downloadPdf: "Download PDF",
        searchPlaceholder: "Search sections, keywords, or legal provisions...",
        bookmark: "Bookmark",
        share: "Share",
        mostSearched: "Most Searched",
        popular: "Popular",
        relatedCases: "Related Cases",
      },
    },
  },
  ta: {
    common: {
      nav: {
        home: "முகப்பு",
        assistant: "சட்ட உதவியாளர்",
        judgements: "தீர்ப்புகள்",
        laws: "சட்ட குறிப்புகள்",
        profile: "சுயவிவரம்",
        language: "மொழி",
      },
      hero: {
        title: "உங்கள் சட்ட வழிகாட்டி தளம்",
        subtitle: "இந்தியச் சட்டத்தின் சிக்கல்களை எளிதாக புரிந்து கொள்ள AI உதவி, விரிவான தீர்ப்புகள் மற்றும் முழுமையான சட்ட குறிப்புகள்",
        getStarted: "இலவசமாக தொடங்கவும்",
        exploreCases: "வழக்குகளை பார்க்க",
        learnMore: "மேலும் அறிக",
        servicesTitle: "முழுமையான சட்ட சேவைகள்",
        servicesSubtitle: "சட்ட ஆய்வு, வழிகாட்டல் மற்றும் பாதுகாப்பிற்கு தேவையான அனைத்தும் ஒரே தளத்தில்",
        indicators: {
          ai: "AI இயக்குநர் உதவி",
          cases: "50,000+ சட்ட வழக்குகள்",
          db: "விரிவான தரவுத்தளம்",
        },
      },
      chatbot: {
        welcome: "வணக்கம்! நான் உங்கள் சட்ட உதவி. நான் உங்களுக்கு உதவ முடியும்:\n\n• சட்ட உரிமைகள் மற்றும் செயல்முறைகளை புரிந்துகொள்ளுதல்\n• சட்டங்கள், விதிகள் மற்றும் சட்ட சட்டங்களை விளக்குதல்\n• சட்ட விஷயங்களில் வழிகாட்டல் வழங்குதல்\n• சட்ட பிரிவுகள் மற்றும் குறியீடுகளை தெளிவுபடுத்துதல்\n• உங்கள் சட்ட துறைக்கான பொதுவான சட்ட ஆலோசனை\n\nஇன்று எப்படி உதவ வேண்டும்?",
        placeholder: "உங்கள் சட்ட கேள்வியை தட்டச்சு செய்யுங்கள்...",
        online: "இணைந்துள்ளது",
        offline: "துண்டிக்கப்பட்டது",
        connecting: "இணைப்பில்...",
      },
      judgements: {
        title: "வழக்கு தீர்ப்புகள் தரவுத்தளம்",
        advancedFilters: "மேம்பட்ட வடிகட்டிகள்",
        courtType: "நீதிமன்ற வகை",
        allCourts: "அனைத்து நீதிமன்றங்கள்",
        year: "ஆண்டு",
        allYears: "அனைத்து ஆண்டுகள்",
        month: "மாதம்",
        allMonths: "அனைத்து மாதங்கள்",
        legalAct: "சட்டம்",
        allActs: "அனைத்து சட்டங்கள்",
        category: "வகை",
        applyFilters: "வடிகட்டிகளை பயன்படுத்தவும்",
        reset: "மீட்டமை",
        searchPlaceholder: "தீர்ப்புகள், வழக்கு எண்கள் அல்லது முக்கிய சொற்களை தேடுங்கள்...",
        search: "தேடு",
        showing: "காட்டுகிறது",
        of: "இல்",
        results: "முடிவுகள்",
        mostRecent: "சமீபத்திய",
        mostRelevant: "மிகவும் தொடர்புடைய",
        mostCited: "அதிகமாக மேற்கோள்",
        oldestFirst: "பழையவை முதலில்",
        readFull: "முழு தீர்ப்பை படிக்க",
      },
      laws: {
        title: "சட்ட குறிப்புகள் நூலகம்",
        downloadPdf: "PDF பதிவிறக்கு",
        searchPlaceholder: "பிரிவுகள், முக்கிய சொற்கள் அல்லது சட்ட விதிகளை தேடுங்கள்...",
        bookmark: "புக்மார்க்",
        share: "பகிர்",
        mostSearched: "மிகவும் தேடப்பட்டது",
        popular: "பிரபலமானது",
        relatedCases: "தொடர்புடைய வழக்குகள்",
      },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang || fallbackLng,
    fallbackLng,
    ns: ["common"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
  });

export function setLanguage(lang: string) {
  i18n.changeLanguage(lang);
  try { localStorage.setItem("lang", lang); } catch {}
}

export default i18n;


