type GoogleTranslateLang = 'en' | 'ta' | 'kn';

const COOKIE_NAME = 'googtrans';

function setCookie(name: string, value: string, days = 365) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/`;
}

export function setGoogleTranslateLanguage(lang: GoogleTranslateLang) {
  // Google Website Translator reads this cookie.
  // Format: /<source>/<target>
  const value = `/en/${lang}`;

  // Set on current domain.
  setCookie(COOKIE_NAME, value);

  // Some setups also check the ".google.com" cookie; writing it is harmless if ignored.
  document.cookie = `${COOKIE_NAME}=${value};path=/;domain=.google.com`;

  // Update <html lang="..."> for accessibility/SEO hints.
  document.documentElement.setAttribute('lang', lang);
}

export function getGoogleTranslateLanguage(): GoogleTranslateLang {
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));

  if (!match) return 'en';
  const raw = decodeURIComponent(match.split('=')[1] || '');
  const parts = raw.split('/');
  const target = parts[2] as GoogleTranslateLang | undefined;
  if (target === 'ta' || target === 'kn' || target === 'en') return target;
  return 'en';
}
