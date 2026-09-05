// src/services/aiService.ts
import app from './firebase';
import { getAI, getGenerativeModel } from 'firebase/ai';

/**
 * Minimal AI service to test connectivity to Firebase AI Logic / Gemini.
 * - Uses getAI(), getGenerativeModel() and generateContent()
 * - Reads model id from VITE_FIREBASE_AI_MODEL_ID environment variable
 * - Does NOT contain any secret or key
 */

let aiInstance: ReturnType<typeof getAI> | null = null;

function initAI() {
  if (!aiInstance) {
    aiInstance = getAI(app);
  }
  return aiInstance;
}

function getModel(modelId?: string) {
  const ai = initAI();
  const id = modelId || (import.meta.env as any).VITE_FIREBASE_AI_MODEL_ID;
  if (!id) {
    throw new Error('VITE_FIREBASE_AI_MODEL_ID is not set. Provide the exact model identifier from Firebase Console (AI Logic > Models).');
  }
  return getGenerativeModel(ai!, { model: id });
}

export async function testConnexionGemini(): Promise<string> {
  const model = getModel();
  try {
    const raw = await model.generateContent('Réponds simplement : connexion réussie');

    const text =
      (raw?.response && typeof raw.response.text === 'function'
        ? raw.response.text()
        : undefined) ||
      raw?.output?.[0]?.content?.[0]?.text ||
      (raw?.candidates && raw.candidates.map((c: any) => c.text).join('\n')) ||
      JSON.stringify(raw);

    // Log for developer convenience
    // eslint-disable-next-line no-console
    console.log('[AI TEST] raw response:', raw);
    // eslint-disable-next-line no-console
    console.log('[AI TEST] extracted text:', text);
    return String(text);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[AI TEST] error calling Gemini via Firebase AI Logic:', err);
    throw err;
  }
}
