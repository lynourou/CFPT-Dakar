// src/services/aiService.ts
import app from './firebase';
import { getAI, getGenerativeModel } from 'firebase/ai';
import type { SuggestionIA } from '../types/ai';

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

/**
 * genererSuggestionsPourCentre : envoi un prompt structuré demandant un JSON d'output
 * Retourne SuggestionIA[] ou lance une erreur
 */
export async function genererSuggestionsPourCentre(centre: Record<string, any>): Promise<SuggestionIA[]> {
  const model = getModel();
  const prompt = `
Vous êtes un assistant d'enrichissement de fiche d'établissement. Analysez la fiche fournie (JSON) et recherchez sur le Web des informations fiables.
Règles impératives :
- NE JAMAIS INVENTER une information. Si aucune source fiable trouvée, renvoyer pour le champ : "Information non trouvée".
- PRIORITÉ DES SOURCES (ordre) : site officiel de l'établissement, sources officielles de l'État du Sénégal, ANSD, ONFP, AMIE-FPT, autres sources institutionnelles fiables.
- NE PROPOSEZ PAS de remplacement automatique ; fournissez uniquement des suggestions.
- RENVOYEZ UN JSON PUR : un tableau d'objets avec les champs suivants :
  { "champ": "...", "valeurProposee": "...", "valeurActuelle": "...", "niveauConfiance": "low|medium|high|number", "source": {"nom":"...","url":"..."}, "justification":"..." }
Champs à vérifier (si pertinents) : nom_officiel, adresse, commune, telephone, email, site_web, formation, filiere, diplomes, date_creation, description, capacite, statut.
Voici la fiche (JSON) :
${JSON.stringify(centre, null, 2)}

Répondez uniquement par le JSON demandé, sans texte additionnel.
`;

  const raw = await model.generateContent(prompt);

  const text =
    (raw?.response && typeof raw.response.text === 'function'
      ? raw.response.text()
      : undefined) ||
    raw?.output?.[0]?.content?.[0]?.text ||
    (raw?.candidates && raw.candidates.map((c: any) => c.text).join('\n')) ||
    '';

  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error('AI response is not an array');
    }
    // Basic validation of parsed items
    const cleaned: SuggestionIA[] = parsed.map((p: any) => ({
      champ: String(p.champ || p.field || ''),
      valeurProposee: p.valeurProposee || p.suggestedValue || p.value || '',
      valeurActuelle: p.valeurActuelle ?? p.currentValue ?? null,
      niveauConfiance: p.niveauConfiance ?? p.confidence ?? 'medium',
      source: p.source ?? (p.url ? { nom: p.sourceName || 'source', url: p.url } : undefined),
      justification: p.justification || p.reason || '',
    }));
    return cleaned;
  } catch (err) {
    // If parsing fails, throw with context
    // eslint-disable-next-line no-console
    console.error('Failed to parse AI JSON response:', err, 'text:', text);
    throw new Error('La réponse du modèle n\'est pas un JSON structuré comme attendu. ' + String(err));
  }
}
