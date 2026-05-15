/**
 * apiService.ts — Backend API + On-Device LLM integration for all Kalam Spark features
 * 
 * Strategy:
 * - Features needing server (crawling, TTS, RAG): call FastAPI backend
 * - Pure LLM features (dream discovery, tasks, quiz, mentor): try backend first, 
 *   fall back to on-device Cactus when offline
 */

import { callLLM, callBackendAPI, ChatMessage } from './llmService';

// ──────────────────────────────────────────────
// Dream Discovery (works offline via Cactus)
// ──────────────────────────────────────────────

export async function discoverDream(
  interests: string[],
  personalityTexts: string[]
): Promise<Array<{ dream: string; subjects: string[] }>> {
  const interestsStr = interests.join(', ');
  const personalityStr = personalityTexts.join(' | ');

  // Try backend first (cloud LLM)
  try {
    const data = await callBackendAPI('/api/discover_dream', {
      interests: interestsStr,
      personality: personalityStr,
      language: 'en',
    });
    if (Array.isArray(data) && data.length > 0) return data;
  } catch (_) {
    console.log('[API] Backend unavailable for dream discovery, using on-device LLM...');
  }

  // Fallback: on-device Cactus
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are an expert career counselor. Return only valid JSON. Use exactly the field names "dream" and "subjects".',
    },
    {
      role: 'user',
      content: `Suggest exactly 12 ideal career paths.\nInterests: ${interestsStr}\nPersonality: ${personalityStr}\n\nReturn ONLY a JSON array of 12 objects. Each object MUST have:\n  "dream": career title (string)\n  "subjects": array of exactly 3 key skills (strings)\n\nNo markdown, no explanation — only the raw JSON array.`,
    },
  ];

  const raw = await callLLM(messages, { maxTokens: 2000, temperature: 0.7, jsonMode: true });
  try {
    const match = raw.match(/\[\s*\{.*\}\s*\]/s);
    const parsed = match ? JSON.parse(match[0]) : JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : Object.values(parsed).find(Array.isArray) || [];
    return (arr as any[])
      .map((c: any) => ({
        dream: (c.dream || c.title || c.name || c.career || '').trim(),
        subjects: (c.subjects || c.skills || c.tags || []).slice(0, 3),
      }))
      .filter((c: any) => c.dream);
  } catch {
    return [
      { dream: 'Software Engineer', subjects: ['Computer Science', 'Logic', 'Math'] },
      { dream: 'Data Scientist', subjects: ['Statistics', 'Programming', 'Analysis'] },
      { dream: 'Product Manager', subjects: ['Leadership', 'Design', 'Business'] },
      { dream: 'UI/UX Designer', subjects: ['Visual Design', 'User Research', 'Prototyping'] },
      { dream: 'AI Engineer', subjects: ['Machine Learning', 'Neural Networks', 'Python'] },
      { dream: 'Cybersecurity Analyst', subjects: ['Network Security', 'Cryptography', 'Risk'] },
    ];
  }
}

// ──────────────────────────────────────────────
// Roadmap Generation (needs server for web crawling)
// ──────────────────────────────────────────────

export async function generateRoadmap(
  dream: string,
  branch: string,
  year: string
): Promise<any> {
  // Roadmap needs web crawling — must use backend
  try {
    return await callBackendAPI('/api/roadmap', { dream, branch, year, language: 'en' });
  } catch (_) {
    // Offline fallback: generate a basic roadmap on-device
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a career roadmap generator. Return only valid JSON.',
      },
      {
        role: 'user',
        content: `Create a 4-stage learning roadmap for becoming a "${dream}". Student is in ${branch}, ${year}.\n\nReturn JSON with: dream, summary, stages (array of 4 objects with: title, duration, concepts array, project object with title/description).`,
      },
    ];
    const raw = await callLLM(messages, { maxTokens: 2000, temperature: 0.5, jsonMode: true });
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : JSON.parse(raw);
  }
}

// ──────────────────────────────────────────────
// Task Generation (works offline via Cactus)
// ──────────────────────────────────────────────

export async function generateTasks(
  dream: string,
  stage: string,
  concepts: string[]
): Promise<Array<{ title: string; description: string; duration: string }>> {
  try {
    const data = await callBackendAPI('/api/tasks', {
      dream,
      stage,
      concepts: concepts.join(','),
      language: 'en',
    });
    if (Array.isArray(data) && data.length > 0) return data;
  } catch (_) {
    console.log('[API] Backend unavailable for tasks, using on-device LLM...');
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: 'You are a learning task generator. Return only valid JSON.' },
    {
      role: 'user',
      content: `Generate 5 daily learning tasks for a student pursuing "${dream}", currently at stage "${stage}" covering concepts: ${concepts.join(', ')}.\n\nReturn a JSON array of 5 objects with: title, description, duration (e.g. "30 min").`,
    },
  ];

  const raw = await callLLM(messages, { maxTokens: 1500, temperature: 0.6, jsonMode: true });
  try {
    const match = raw.match(/\[\s*\{.*\}\s*\]/s);
    return match ? JSON.parse(match[0]) : JSON.parse(raw);
  } catch {
    return [
      { title: 'Read documentation', description: `Study ${concepts[0] || stage} fundamentals`, duration: '30 min' },
      { title: 'Practice exercise', description: `Complete a hands-on exercise on ${concepts[1] || stage}`, duration: '45 min' },
      { title: 'Build mini-project', description: `Apply ${concepts[0] || stage} in a small project`, duration: '60 min' },
    ];
  }
}

// ──────────────────────────────────────────────
// Quiz Generation (works offline via Cactus)
// ──────────────────────────────────────────────

export async function generateQuiz(
  dream: string,
  stage: string,
  concepts: string[]
): Promise<any[]> {
  try {
    const data = await callBackendAPI('/api/quiz', {
      dream,
      stage,
      concepts: concepts.join(','),
      language: 'en',
    });
    if (Array.isArray(data) && data.length > 0) return data;
  } catch (_) {
    console.log('[API] Backend unavailable for quiz, using on-device LLM...');
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: 'You are a quiz generator. Return only valid JSON.' },
    {
      role: 'user',
      content: `Generate 5 multiple-choice quiz questions for a "${dream}" student at "${stage}" stage covering: ${concepts.join(', ')}.\n\nReturn a JSON array of 5 objects with: question, options (array of 4 strings), correctIndex (0-3), explanation.`,
    },
  ];

  const raw = await callLLM(messages, { maxTokens: 2000, temperature: 0.5, jsonMode: true });
  try {
    const match = raw.match(/\[\s*\{.*\}\s*\]/s);
    return match ? JSON.parse(match[0]) : JSON.parse(raw);
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────
// Mentor Chat (works offline via Cactus)
// ──────────────────────────────────────────────

export async function sendMentorMessage(
  chatHistory: ChatMessage[],
  userMessage: string,
  context: { dream: string; stage: string; branch: string }
): Promise<string> {
  const systemPrompt = `You are an expert AI career mentor for a student pursuing "${context.dream}" (${context.branch}). They are at the "${context.stage}" stage. Be encouraging, specific, and practical. Keep responses under 200 words.`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.slice(-10), // Keep last 10 messages for context
    { role: 'user', content: userMessage },
  ];

  return await callLLM(messages, { maxTokens: 500, temperature: 0.7 });
}

// ──────────────────────────────────────────────
// Career Summary (works offline via Cactus)
// ──────────────────────────────────────────────

export async function generateCareerSummary(
  dream: string,
  branch: string,
  year: string
): Promise<string> {
  try {
    const data = await callBackendAPI('/api/career_summary', { dream, branch, year, language: 'en' });
    if (typeof data === 'string' && data.length > 20) return data;
  } catch (_) {}

  const messages: ChatMessage[] = [
    { role: 'system', content: 'You are a concise career summary writer.' },
    {
      role: 'user',
      content: `Write a 3-sentence career summary for a ${year} ${branch} student who wants to become a ${dream}. Be specific and inspiring.`,
    },
  ];

  return await callLLM(messages, { maxTokens: 200, temperature: 0.7 });
}
