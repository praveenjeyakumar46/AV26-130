const USER_MEMORY_KEY = 'legal_ai_user_memory';

interface UserMemory {
  preferredLanguage: string;
  frequentTopics: string[];
  lastActiveConvId: string | null;
}

export function getUserMemory(): UserMemory {
  try {
    const raw = localStorage.getItem(USER_MEMORY_KEY);
    return raw
      ? JSON.parse(raw)
      : { preferredLanguage: 'en', frequentTopics: [], lastActiveConvId: null };
  } catch {
    return { preferredLanguage: 'en', frequentTopics: [], lastActiveConvId: null };
  }
}

export function saveUserMemory(partial: Partial<UserMemory>) {
  const existing = getUserMemory();
  localStorage.setItem(USER_MEMORY_KEY, JSON.stringify({ ...existing, ...partial }));
}

