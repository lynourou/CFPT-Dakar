// src/services/aiService.ts

import app from './firebase';
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
} from 'firebase/ai';
import type { SuggestionIA } from '../types/ai';

let aiInstance: ReturnType<typeof getAI> | null = null;

const CHAMPS_AUTORISES = [
  'nom_officiel',
  'adresse',
  'commune',
  'telephone',
  'email',
  'site_web',
  'formation',
  'filiere',
  'diplomes',
  'date_creation',
  'description',
  'capacite',
  'statut',
] as const;

function initAI() {
  if (!aiInstance) {
    aiInstance = getAI(app, {
      backend: new GoogleAIBackend(),
    });
  }

  return aiInstance;
}

function getModel(modelId?: string) {
  const ai = initAI();

  const id =
    modelId ||
    (import.meta.env as {
      VITE_FIREBASE_AI_MODEL_ID?: string;
    }).VITE_FIREBASE_AI_MODEL_ID;

  if (!id) {
    throw new Error(
      'VITE_FIREBASE_AI_MODEL_ID n’est pas configuré.'
    );
  }

  return getGenerativeModel(ai, {
    model: id,

    // Recherche Web réelle via Google Search Grounding
    tools: [
      {
        googleSearch: {},
      },
    ],

    systemInstruction: `
Tu es l'assistant IA officiel de la plateforme CFPT Dakar.

Ta mission est de vérifier et enrichir les fiches des établissements
de formation professionnelle et technique au Sénégal.

RÈGLES ABSOLUES :

1. Ne jamais inventer une information.
2. Tu dois utiliser la recherche Web Google pour vérifier les informations.
3. Priorité absolue aux sources fiables :
   - site officiel de l'établissement ;
   - gouvernement du Sénégal ;
   - ministère chargé de la Formation professionnelle ;
   - ANSD ;
   - ONFP ;
   - AMIE-FPT ;
   - autres organismes institutionnels.
4. Une source commerciale, annuaire ou réseau social peut seulement être
   utilisée comme information secondaire et ne doit pas être considérée
   comme une source institutionnelle forte.
5. Si une information n'est pas trouvée de manière suffisamment fiable,
   ne propose aucune modification pour ce champ.
6. Ne jamais remplacer automatiquement une information existante.
7. Une suggestion doit être vérifiable par l'utilisateur.
8. Les URLs doivent correspondre à de véritables pages trouvées pendant
   la recherche.
9. Ne jamais fabriquer une URL.
10. Ne proposer que les champs autorisés.
11. Si plusieurs sources fiables donnent des informations différentes,
    le signaler dans la justification.
12. Répondre uniquement avec le JSON demandé.
`,
  });
}

export async function testConnexionGemini(): Promise<string> {
  const model = getModel();

  try {
    const raw = await model.generateContent(
      'Réponds simplement : connexion réussie'
    );

    return raw.response.text();
  } catch (error) {
    console.error('[AI TEST] Erreur Gemini:', error);
    throw error;
  }
}

export async function genererSuggestionsPourCentre(
  centre: Record<string, any>
): Promise<SuggestionIA[]> {
  const model = getModel();

  const fiche = {
    nom: centre.nom ?? '',
    nom_officiel: centre.nom_officiel ?? '',
    type: centre.type ?? '',
    statut: centre.statut ?? '',
    commune: centre.commune ?? '',
    adresse: centre.adresse ?? '',
    telephone: centre.telephone ?? '',
    email: centre.email ?? '',
    site_web: centre.site_web ?? '',
    formation: centre.formation ?? '',
    filiere: centre.filiere ?? '',
    diplomes: centre.diplomes ?? '',
    date_creation: centre.date_creation ?? '',
    description: centre.description ?? '',
    capacite: centre.capacite ?? '',
    source: centre.source ?? '',
  };

  const prompt = `
Vérifie cette fiche d'établissement au Sénégal.

FICHE ACTUELLE :
${JSON.stringify(fiche, null, 2)}

Effectue une recherche Web réelle.

Pour chaque information pertinente que tu peux vérifier, retourne
une suggestion uniquement lorsqu'une source fiable permet de confirmer
ou corriger l'information.

CHAMPS AUTORISÉS :
${CHAMPS_AUTORISES.join(', ')}

IMPORTANT :

- Ne propose pas de modification sans source.
- Ne propose pas de valeur inventée.
- Ne propose pas de champ qui n'est pas dans la liste.
- Si la valeur actuelle est correcte, tu peux l'indiquer comme vérifiée,
  mais inutile de proposer une modification si aucune modification
  n'est nécessaire.
- Si la valeur actuelle est vide et qu'une source fiable permet de
  la compléter, propose la valeur.
- Si la valeur actuelle est différente d'une information trouvée,
  propose la nouvelle valeur mais indique clairement qu'il s'agit
  d'un remplacement.
- Les champs formation, filiere et diplomes peuvent contenir plusieurs
  éléments : utilise une chaîne lisible en français.
- Pour capacite, utilise uniquement une valeur réellement trouvée.
- Pour date_creation, ne transforme pas une année approximative en
  date exacte.
- Pour les téléphones et emails, conserve uniquement les informations
  trouvées dans des sources crédibles.

NIVEAU DE CONFIANCE :
- high : source officielle ou plusieurs sources fiables concordantes.
- medium : source fiable mais confirmation limitée.
- low : source secondaire ou information incertaine.

RETOURNE UNIQUEMENT UN TABLEAU JSON.

Chaque objet doit avoir exactement cette structure :

{
  "champ": "nom_du_champ",
  "valeurProposee": "nouvelle valeur",
  "valeurActuelle": "valeur actuelle",
  "niveauConfiance": "low|medium|high",
  "source": {
    "nom": "Nom de la source",
    "url": "URL exacte de la page consultée"
  },
  "justification": "Courte explication de la vérification."
}
`;

  try {
    const raw = await model.generateContent(prompt);

    const text = raw.response.text();

    console.log('[AI AGENT] Réponse Gemini :', text);
    console.log(
      '[AI AGENT] Grounding metadata :',
      raw.response.candidates?.[0]?.groundingMetadata
    );

    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) {
      throw new Error('La réponse IA n’est pas un tableau.');
    }

    const cleaned: SuggestionIA[] = parsed
      .filter((item: any) =>
        CHAMPS_AUTORISES.includes(item?.champ)
      )
      .filter(
        (item: any) =>
          item?.valeurProposee !== undefined &&
          item?.valeurProposee !== null &&
          String(item.valeurProposee).trim() !== ''
      )
      .map((item: any) => ({
        champ: String(item.champ),
        valeurProposee: String(item.valeurProposee),
        valeurActuelle:
          item.valeurActuelle === null ||
          item.valeurActuelle === undefined
            ? ''
            : String(item.valeurActuelle),
        niveauConfiance:
          item.niveauConfiance === 'high' ||
          item.niveauConfiance === 'low' ||
          item.niveauConfiance === 'medium'
            ? item.niveauConfiance
            : 'medium',
        source: item.source
          ? {
              nom: String(item.source.nom || 'Source'),
              url: String(item.source.url || ''),
            }
          : undefined,
        justification: String(item.justification || ''),
      }));

    return cleaned;
  } catch (error) {
    console.error(
      '[AI AGENT] Erreur pendant la recherche/analyse :',
      error
    );

    throw new Error(
      'Impossible de récupérer ou interpréter les résultats de recherche.'
    );
  }
}
