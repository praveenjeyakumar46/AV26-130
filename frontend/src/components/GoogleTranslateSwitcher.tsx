import { useEffect, useMemo, useState } from "react";
import { getGoogleTranslateLanguage, setGoogleTranslateLanguage } from "@/lib/googleTranslate";
import { cn } from "@/lib/utils";

type Lang = "en" | "kn" | "ta";

const LABELS: Record<Lang, string> = {
  en: "English",
  kn: "ಕನ್ನಡ",
  ta: "தமிழ்",
};

interface GoogleTranslateSwitcherProps {
  className?: string;
  /** Dark LMS top bar — light text on chrome */
  variant?: "default" | "chrome";
}

export default function GoogleTranslateSwitcher({ className, variant = "default" }: GoogleTranslateSwitcherProps) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    setLang(getGoogleTranslateLanguage());
  }, []);

  const items = useMemo(
    () =>
      (Object.keys(LABELS) as Lang[]).map((code) => ({
        code,
        label: LABELS[code],
      })),
    []
  );

  const apply = (next: Lang) => {
    if (next === lang) return;
    setLang(next);
    try {
      setGoogleTranslateLanguage(next);
      localStorage.setItem("lang", next);
    } catch {}

    // Most reliable way to force Google widget to apply to the whole DOM.
    window.location.reload();
  };

  return (
    <div
      className={cn(
        "ml-3 inline-flex items-center rounded-lg border p-1",
        variant === "chrome"
          ? "border-white/20 bg-white/5"
          : "border-input bg-muted/60",
        className
      )}
    >
      {items.map((it) => (
        <button
          key={it.code}
          type="button"
          onClick={() => apply(it.code)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition-all duration-200",
            lang === it.code
              ? "bg-primary text-primary-foreground shadow-sm"
              : variant === "chrome"
                ? "text-white/85 hover:bg-white/10"
                : "text-foreground hover:bg-muted"
          )}
          aria-pressed={lang === it.code}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
