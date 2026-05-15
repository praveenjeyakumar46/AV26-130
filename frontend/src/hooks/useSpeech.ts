import { useState, useCallback, useRef } from 'react';

export interface UseSpeechOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface UseSpeechReturn {
  speak: (text: string, options?: UseSpeechOptions) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  speakingId: string | null;
}

export function useSpeech(): UseSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingId(null);
  }, [isSupported]);

  const speak = useCallback(
    (text: string, options: UseSpeechOptions & { id?: string } = {}) => {
      if (!isSupported) return;

      // Toggle off if already speaking the same message
      if (isSpeaking && speakingId === (options as any).id) {
        stop();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang   = options.lang   ?? 'en-US';
      utterance.rate   = options.rate   ?? 1;
      utterance.pitch  = options.pitch  ?? 1;
      utterance.volume = options.volume ?? 1;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setSpeakingId((options as any).id ?? null);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeakingId(null);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setSpeakingId(null);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, isSpeaking, speakingId, stop],
  );

  return { speak, stop, isSpeaking, isSupported, speakingId };
}
