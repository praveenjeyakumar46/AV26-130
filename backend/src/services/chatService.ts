/**
 * Chat Service
 * Orchestrates legal assistant functionality with LLM, constitution data,
 * and real court judgements (RAG).
 */

import { generateResponse, generateStreamResponse, extractLegalTerms, detectUserIntent } from './ollamaService';
import { searchConstitutionArticles, buildConstitutionContext } from './constitutionService';
import { getDocumentContext } from './documentService';
import { searchJudgementsForRAG } from './judgementService';
import logger from '../config/logger';

// ── Clean answer helper ───────────────────────────────────────────────────────
function cleanAnswer(answer: string): string {
  if (!answer?.trim()) return answer;

  const notePatterns = [
    /\n\n\s*Note:.*$/is, /\n\n\s*NOTE:.*$/is,
    /\n\n\s*Disclaimer:.*$/is, /\n\n\s*DISCLAIMER:.*$/is,
    /\n\n\s*Please note:.*$/is, /\n\n\s*Important:.*$/is,
    /\n\n\s*Warning:.*$/is,
    /\n\n\s*This.*not.*legal advice.*$/is,
    /\n\n\s*This.*not.*constitute.*legal advice.*$/is,
    /\n\n\s*This.*not.*professional legal counsel.*$/is,
    /\n\n\s*This.*not.*professional.*advice.*$/is,
    /\n\n\s*Consult.*lawyer.*$/is,
    /\n\n\s*Seek.*legal.*professional.*$/is,
    /\n\n\s*Please consult.*$/is,
    /\n\n\s*Note that.*$/is, /\n\n\s*Keep in mind.*$/is,
    /\n\n\s*Remember that.*$/is,
    /\n\s*Note:.*$/is, /\n\s*NOTE:.*$/is,
  ];

  let cleaned = answer.trim();
  for (const p of notePatterns) cleaned = cleaned.replace(p, '');

  const endings = [
    'This is not legal advice.',
    'This does not constitute legal advice.',
    'This is not professional legal advice.',
    'Please consult a lawyer.',
    'Consult a legal professional.',
    'Seek professional legal counsel.',
    'Note: This is not legal advice.',
    'Disclaimer: This is not legal advice.',
  ];
  for (const end of endings) {
    if (cleaned.toLowerCase().endsWith(end.toLowerCase()))
      cleaned = cleaned.substring(0, cleaned.length - end.length).trim();
  }

  const sentences = cleaned.split(/[.!?]\s+/);
  if (sentences.length > 1) {
    const last = sentences[sentences.length - 1].toLowerCase();
    if (['note', 'disclaimer', 'consult', 'lawyer', 'legal advice', 'professional'].some(k => last.includes(k))) {
      cleaned = sentences.slice(0, -1).join('. ').trim();
      if (!cleaned.match(/[.!?]$/)) cleaned += '.';
    }
  }
  return cleaned.trim();
}

// ── System prompts ────────────────────────────────────────────────────────────
function getTamilSystemPrompt(intent: 'question' | 'guidance'): string {
  if (intent === 'question') {
    return `நீங்கள் இந்திய சட்டத்தில் நிபுணத்துவம் பெற்ற சட்ட உதவியாளர். IPC, CrPC, மற்றும் இந்திய அரசியலமைப்பு உட்பட துல்லியமான தகவலை வழங்குங்கள்.

வழிகாட்டுதல்கள்:
- எளிமையான தமிழில் பேசவும்
- குறிப்பிட்ட பிரிவுகள் மற்றும் கட்டுரைகளைக் குறிப்பிடவும்
- தொடர்புடைய நீதிமன்ற தீர்ப்புகளை குறிப்பிடவும்
- இறுதியில் குறிப்புகள் அல்லது மறுப்புரைகளை சேர்க்க வேண்டாம்`;
  }
  return `நீங்கள் இந்திய சட்டம் மற்றும் அரசியலமைப்பில் நிபுணத்துவம் பெற்ற சட்ட உதவியாளர்.
- எளிமையான தமிழில் படிப்படியான வழிகாட்டுதல் வழங்கவும்
- பொருத்தமான நீதிமன்ற தீர்ப்புகளை குறிப்பிடவும்
- இறுதியில் குறிப்புகள் அல்லது மறுப்புரைகளை சேர்க்க வேண்டாம்`;
}

function getEnglishSystemPrompt(intent: 'question' | 'guidance'): string {
  if (intent === 'question') {
    return `You are a helpful legal assistant specializing in Indian law (IPC, CrPC, Constitution of India). Provide accurate, clear legal information.

Guidelines:
- Use simple, clear language
- Reference specific sections, articles, and court judgements when relevant
- Be concise and focused
- Do NOT add notes, disclaimers, or legal advice warnings at the end`;
  }
  return `You are a helpful legal assistant specializing in Indian law and Constitution. Provide step-by-step guidance.

Guidelines:
- Use simple, clear language
- Provide actionable guidance and reference relevant court cases
- Be practical and helpful
- Do NOT add notes, disclaimers, or legal advice warnings at the end`;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ChatResponse {
  answer: string;
  legalTerms: string[];
  constitutionContext?: string;
  judgementContext?: string;
  summary?: string;
}

export interface ConversationMessage {
  role: 'user' | 'bot';
  content: string;
}

// ── Main process function ─────────────────────────────────────────────────────
export async function processChatMessage(
  query: string,
  isFirstInput = false,
  conversationHistory?: ConversationMessage[],
  documentId?: string,
  language: 'en' | 'ta' = 'en'
): Promise<ChatResponse> {
  try {
    const intent = await detectUserIntent(query);
    const legalTerms = await extractLegalTerms(query);

    // ── Constitution context ──────────────────────────────────────────────
    let constitutionContext = '';
    if (legalTerms.length > 0) {
      const results = await searchConstitutionArticles(legalTerms.slice(0, 3).join(' '), 5);
      if (results.total > 0) constitutionContext = buildConstitutionContext(results);
    }

    // ── Judgement RAG context ─────────────────────────────────────────────
    let judgementContext = '';
    try {
      judgementContext = await searchJudgementsForRAG(query, 3);
    } catch (e) {
      logger.warn('Judgement RAG lookup failed (table may not exist yet):', e);
    }

    // ── Document context ──────────────────────────────────────────────────
    let documentContext = '';
    if (documentId) {
      const doc = getDocumentContext(documentId);
      if (doc) {
        documentContext = `\n\nUploaded Document (${doc.filename}):\n${doc.content.substring(0, 4000)}${doc.content.length > 4000 ? '…' : ''}\n\nReference this document when answering.`;
      }
    }

    // ── Conversation context ──────────────────────────────────────────────
    let conversationContext = '';
    if (conversationHistory?.length) {
      const recent = conversationHistory.slice(-5);
      conversationContext = '\n\nPrevious Conversation:\n';
      for (const msg of recent)
        conversationContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      conversationContext += '\nCurrent Query: ';
    }

    // ── Build system prompt ───────────────────────────────────────────────
    let systemPrompt = language === 'ta'
      ? getTamilSystemPrompt(intent)
      : getEnglishSystemPrompt(intent);

    if (documentContext) systemPrompt += documentContext;

    if (constitutionContext) {
      systemPrompt += language === 'ta'
        ? `\n\nதொடர்புடைய அரசியலமைப்பு பிரிவுகள்:\n${constitutionContext}\nஇந்த பிரிவுகளின் முழு உள்ளடக்கத்தை மேற்கோள் காட்டவோ வேண்டாம்.`
        : `\n\nRelevant Constitution Articles:\n${constitutionContext}\nDo NOT quote their full content.`;
    }

    if (judgementContext) {
      systemPrompt += language === 'ta'
        ? `\n\nதொடர்புடைய நீதிமன்ற தீர்ப்புகள்:\n${judgementContext}\nபொருத்தமான வழக்குகளை குறிப்பிடவும்.`
        : `\n\nRelevant Court Judgements:\n${judgementContext}\nReference relevant cases when answering.`;
    }

    // ── Build user prompt ─────────────────────────────────────────────────
    const prefix = conversationContext || '';
    const userPrompt = language === 'ta'
      ? `${prefix}${intent === 'question' ? 'கேள்வி' : 'வழிகாட்டுதல் கோரிக்கை'}: ${query}\n\nநேரடியான பதில் வழங்குங்கள். இறுதியில் குறிப்புகள் சேர்க்க வேண்டாம்.`
      : `${prefix}${intent === 'question' ? 'Question' : 'Request for guidance'}: ${query}\n\nProvide a direct answer without any notes or disclaimers at the end.`;

    let answer = await generateResponse(userPrompt, systemPrompt, undefined, intent);
    answer = cleanAnswer(answer);

    let summary: string | undefined;
    if (isFirstInput && answer.length > 200) {
      const s = await generateResponse(
        `Summarize in 2-3 sentences:\n\n${answer}`, undefined, undefined, intent
      );
      summary = cleanAnswer(s);
    }

    return { answer, legalTerms, constitutionContext: constitutionContext || undefined, judgementContext: judgementContext || undefined, summary };
  } catch (err) {
    logger.error('processChatMessage error:', err);
    throw err;
  }
}

// ── Streaming version ─────────────────────────────────────────────────────────
export async function* processChatMessageStream(
  query: string,
  _isFirstInput = false,
  conversationHistory?: ConversationMessage[],
  documentId?: string,
  language: 'en' | 'ta' = 'en'
): AsyncGenerator<{ type: string; content?: any; sections?: any }, void, unknown> {
  try {
    const intent = await detectUserIntent(query);
    const legalTerms = await extractLegalTerms(query);

    let constitutionContext = '';
    let constitutionSections: any[] = [];

    if (legalTerms.length > 0) {
      const results = await searchConstitutionArticles(legalTerms.slice(0, 3).join(' '), 5);
      if (results.total > 0) {
        constitutionContext = buildConstitutionContext(results);
        constitutionSections = [
          ...results.articles.map((a: any) => ({
            section: `Article ${a.article_id}`,
            title: `Article ${a.article_id}`,
            description: a.article_desc,
            act: 'Constitution of India',
          })),
          ...results.structured.map((s: any) => ({
            section: `Article ${s.art_no}`,
            title: s.name,
            description: s.art_desc || '',
            act: 'Constitution of India',
          })),
        ];
      }
    }

    // Judgement context
    let judgementContext = '';
    try {
      judgementContext = await searchJudgementsForRAG(query, 3);
    } catch (e) {
      logger.warn('Judgement RAG stream lookup failed:', e);
    }

    if (constitutionSections.length > 0)
      yield { type: 'legal_sections', sections: constitutionSections };

    let documentContext = '';
    if (documentId) {
      const doc = getDocumentContext(documentId);
      if (doc) documentContext = `\n\nUploaded Document (${doc.filename}):\n${doc.content.substring(0, 4000)}\n\nReference this document when answering.`;
    }

    let conversationContext = '';
    if (conversationHistory?.length) {
      const recent = conversationHistory.slice(-5);
      conversationContext = '\n\nPrevious Conversation:\n';
      for (const msg of recent)
        conversationContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      conversationContext += '\nCurrent Query: ';
    }

    let systemPrompt = language === 'ta'
      ? getTamilSystemPrompt(intent)
      : getEnglishSystemPrompt(intent);

    if (documentContext) systemPrompt += documentContext;
    if (constitutionContext)
      systemPrompt += language === 'ta'
        ? `\n\nதொடர்புடைய அரசியலமைப்பு பிரிவுகள்:\n${constitutionContext}`
        : `\n\nRelevant Constitution Articles:\n${constitutionContext}\nDo NOT quote their full content.`;
    if (judgementContext)
      systemPrompt += language === 'ta'
        ? `\n\nதொடர்புடைய நீதிமன்ற தீர்ப்புகள்:\n${judgementContext}`
        : `\n\nRelevant Court Judgements:\n${judgementContext}\nReference relevant cases when answering.`;

    const prefix = conversationContext || '';
    const userPrompt = language === 'ta'
      ? `${prefix}${intent === 'question' ? 'கேள்வி' : 'வழிகாட்டுதல் கோரிக்கை'}: ${query}\n\nநேரடியான பதில் வழங்குங்கள்.`
      : `${prefix}${intent === 'question' ? 'Question' : 'Request for guidance'}: ${query}\n\nProvide a direct answer without any notes at the end.`;

    yield { type: 'start' };
    for await (const chunk of generateStreamResponse(userPrompt, systemPrompt, undefined, intent))
      yield { type: 'chunk', content: chunk };
    yield { type: 'complete' };

  } catch (err) {
    logger.error('processChatMessageStream error:', err);
    yield { type: 'error', content: err instanceof Error ? err.message : 'An error occurred' };
  }
}
