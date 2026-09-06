// src/services/aiService.ts

import app from './firebase';
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
} from 'firebase/ai';

import type { SuggestionIA } from '../types/ai';

let aiInstance: ReturnType<typeof getAI> | null = null;

/**
 * Initialisation de Firebase AI Logic.
 *
 * On utilise explicitement le backend Google AI afin de pouvoir
 * utiliser le grounding avec Google Search.
 */
function initAI() {
  if (!aiInstance) {
    aiInstance = getAI(app, {
      backend: new GoogleAIBackend(),
    });
  }

  return aiInstance;
}

/**
 * Retourne le modèle Gemini configuré avec Google Search.
 */
function getModel(modelId?: string) {
  const ai = initAI();

  const id =
    modelId ||
    (import.meta.env as any).VITE_FIREBASE_AI_MODEL_ID;

  if (!id) {
    throw new Error(
      'VITE_FIREBASE_AI_MODEL_ID is not set. ' +
        'Provide the exact model identifier configured in Firebase AI Logic.'
    );
  }

  return getGenerativeModel(ai, {
    model: id,
  });
}

/**
 * Extrait proprement le texte de la réponse Gemini.
 */
function extraireTexteReponse(raw: any): string {
  try {
    if (
      raw?.response &&
      typeof raw.response.text === 'function'
    ) {
      return String(raw.response.text() || '');
    }
  } catch (err) {
    console.warn(
      '[AI] Impossible d’extraire response.text():',
      err
    );
  }

  if (
    raw?.output?.[0]?.content?.[0]?.text
  ) {
    return String(
      raw.output[0].content[0].text
    );
  }

  if (
    raw?.candidates?.[0]?.content?.parts
  ) {
    return raw.candidates[0].content.parts
      .filter((part: any) => typeof part?.text === 'string')
      .map((part: any) => part.text)
      .join('\n');
  }

  if (Array.isArray(raw?.candidates)) {
    return raw.candidates
      .map((candidate: any) => {
        if (typeof candidate?.text === 'string') {
          return candidate.text;
        }

        if (candidate?.content?.parts) {
          return candidate.content.parts
            .filter(
              (part: any) =>
                typeof part?.text === 'string'
            )
            .map((part: any) => part.text)
            .join('\n');
        }

        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  return '';
}

/**
 * Nettoie une réponse JSON éventuellement entourée
 * par ```json ... ```.
 */
function nettoyerJSON(texte: string): string {
  let resultat = texte.trim();

  if (resultat.startsWith('```')) {
    resultat = resultat
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  /*
   * Si Gemini ajoute accidentellement du texte avant/après
   * le tableau JSON, on essaie de récupérer uniquement le tableau.
   */
  const debut = resultat.indexOf('[');
  const fin = resultat.lastIndexOf(']');

  if (debut !== -1 && fin !== -1 && fin > debut) {
    resultat = resultat.slice(debut, fin + 1);
  }

  return resultat;
}

/**
 * Récupère les sources retournées par Google Search grounding.
 *
 * Firebase AI Logic expose les sources dans :
 * response.candidates[0].groundingMetadata.groundingChunks
 *
 * Chaque source web contient notamment :
 * - title
 * - uri
 */
function extraireSourcesGrounding(raw: any): Array<{
  nom: string;
  url: string;
}> {
  const groundingMetadata =
    raw?.response?.candidates?.[0]?.groundingMetadata ||
    raw?.candidates?.[0]?.groundingMetadata;

  const chunks =
    groundingMetadata?.groundingChunks;

  if (!Array.isArray(chunks)) {
    return [];
  }

  const sources: Array<{
    nom: string;
    url: string;
  }> = [];

  for (const chunk of chunks) {
    const web = chunk?.web;

    if (!web?.uri) {
      continue;
    }

    const url = String(web.uri).trim();

    if (!url) {
      continue;
    }

    const nom =
      String(web.title || 'Source Google Search').trim();

    const existeDeja = sources.some(
      (source) => source.url === url
    );

    if (!existeDeja) {
      sources.push({
        nom,
        url,
      });
    }
  }

  return sources;
}

/**
 * Nettoie et normalise les suggestions retournées
 * par Gemini.
 */
function normaliserSuggestions(
  resultat: any,
  sourcesGrounding: Array<{
    nom: string;
    url: string;
  }>
): SuggestionIA[] {
  if (!Array.isArray(resultat)) {
    throw new Error(
      'AI response is not an array.'
    );
  }

  return resultat
    .map((item: any): SuggestionIA => {
      const champ = String(
        item?.champ ||
          item?.field ||
          ''
      ).trim();

      const valeurProposee =
        item?.valeurProposee ??
        item?.suggestedValue ??
        item?.value ??
        '';

      const valeurActuelle =
        item?.valeurActuelle ??
        item?.currentValue ??
        null;

      const niveauConfiance =
        item?.niveauConfiance ??
        item?.confidence ??
        'medium';

      let source = item?.source;

      /*
       * Si Gemini n'a pas fourni de source explicite
       * mais que Google Search a retourné des sources,
       * on utilise la première source de grounding.
       */
      if (
        (!source ||
          !source.url) &&
        sourcesGrounding.length > 0
      ) {
        source = {
          nom: sourcesGrounding[0].nom,
          url: sourcesGrounding[0].url,
        };
      }

      if (
        item?.url &&
        (!source || !source.url)
      ) {
        source = {
          nom:
            item?.sourceName ||
            'Source web',
          url: String(item.url),
        };
      }

      return {
        champ,
        valeurProposee:
          typeof valeurProposee === 'string'
            ? valeurProposee.trim()
            : valeurProposee,

        valeurActuelle,

        niveauConfiance,

        source: source
          ? {
              nom: String(
                source.nom ||
                  'Source web'
              ),
              url: source.url
                ? String(source.url)
                : undefined,
            }
          : undefined,

        justification: String(
          item?.justification ||
            item?.reason ||
            ''
        ).trim(),
      };
    })
    .filter(
      (suggestion) =>
        suggestion.champ !== '' &&
        suggestion.valeurProposee !== ''
    );
}

/**
 * Test simple de connexion à Gemini.
 *
 * Cette fonction utilise également Google Search,
 * ce qui permet de vérifier que le modèle et son outil
 * de recherche sont correctement disponibles.
 */
export async function testConnexionGemini(): Promise<string> {
  const model = getModel();

  try {
    const raw =
      await model.generateContent(
        'Réponds simplement en français : connexion réussie.'
      );

    const text =
      extraireTexteReponse(raw);

    console.log(
      '[AI TEST] Réponse Gemini :',
      text
    );

    console.log(
      '[AI TEST] Sources Google Search :',
      extraireSourcesGrounding(raw)
    );

    return text || 'Connexion réussie.';
  } catch (err: any) {
    console.error(
      '[AI TEST] Erreur Gemini via Firebase AI Logic:',
      err
    );

    throw err;
  }
}

/**
 * Recherche et vérification intelligente d'un établissement.
 *
 * IMPORTANT :
 * - aucune modification Firestore ici ;
 * - cette fonction produit uniquement des suggestions ;
 * - l'utilisateur doit ensuite sélectionner et confirmer
 *   les modifications dans AssistantIA.tsx.
 */
export async function genererSuggestionsPourCentre(
  centre: Record<string, any>
): Promise<SuggestionIA[]> {
  const model = getModel();

  const prompt = `
Vous êtes un assistant spécialisé dans la vérification
et l'enrichissement de fiches d'établissements de formation
professionnelle et technique au Sénégal.

Votre tâche est de rechercher sur Internet des informations
fiables concernant l'établissement fourni ci-dessous.

IMPORTANT :
Vous disposez de Google Search.

Vous DEVEZ utiliser Google Search lorsque cela est utile
pour vérifier les informations de l'établissement.

OBJECTIF :
Comparer les informations actuellement présentes dans la fiche
avec les informations trouvées dans des sources web fiables.

==================================================
PRIORITÉ DES SOURCES
==================================================

Utilisez les sources dans cet ordre de priorité :

1. Site officiel de l'établissement.
2. Ministères et organismes officiels du Sénégal.
3. Sources gouvernementales sénégalaises.
4. ANSD.
5. ONFP.
6. AMIE-FPT.
7. Autres organismes institutionnels fiables.
8. Autres sources web uniquement lorsqu'aucune source
   institutionnelle pertinente n'est disponible.

Évitez les blogs, forums, contenus anonymes et agrégateurs
non fiables lorsqu'une source institutionnelle existe.

==================================================
RÈGLES ABSOLUES
==================================================

1. NE JAMAIS INVENTER une information.

2. NE JAMAIS déduire une information sans source.

3. Si une information n'est pas trouvée dans une source
   suffisamment fiable, ne proposez aucune modification
   pour ce champ.

4. Une information trouvée sur une seule source douteuse
   ne doit pas être présentée comme certaine.

5. Vérifiez autant que possible les informations importantes
   avec une source officielle.

6. Si plusieurs sources fiables sont contradictoires,
   signalez-le dans la justification et ne choisissez pas
   arbitrairement une valeur.

7. Le programme ne doit effectuer AUCUNE modification
   automatique de la base de données.

8. Vous devez uniquement produire des suggestions.

9. Chaque suggestion doit indiquer sa source.

10. Une URL de source doit être fournie lorsqu'elle est
    disponible dans les résultats de recherche.

==================================================
CHAMPS À VÉRIFIER
==================================================

Vérifiez uniquement les champs pertinents parmi :

- nom_officiel
- adresse
- commune
- telephone
- email
- site_web
- formation
- filiere
- diplomes
- date_creation
- description
- capacite
- statut

==================================================
FICHE ACTUELLE
==================================================

Voici la fiche actuelle de l'établissement :

${JSON.stringify(centre, null, 2)}

==================================================
FORMAT DE RÉPONSE OBLIGATOIRE
==================================================

Répondez UNIQUEMENT avec un tableau JSON valide.

Format :

[
  {
    "champ": "nom_du_champ",
    "valeurProposee": "nouvelle valeur",
    "valeurActuelle": "valeur actuelle",
    "niveauConfiance": "low|medium|high",
    "source": {
      "nom": "Nom de la source",
      "url": "https://..."
    },
    "justification": "Explication courte indiquant pourquoi cette valeur est fiable."
  }
]

==================================================
RÈGLES POUR LES SUGGESTIONS
==================================================

- Ne retournez une suggestion que si vous avez trouvé
  une information réellement vérifiable.

- Ne retournez PAS :
  "Information non trouvée".

- Ne retournez PAS de suggestion sans source.

- Ne retournez PAS de valeur inventée.

- Si le champ actuel est correct et qu'aucune amélioration
  n'est nécessaire, vous pouvez ne pas retourner de suggestion.

- Si la nouvelle information est plus précise que la valeur
  actuelle, vous pouvez la proposer.

- Si la valeur actuelle est différente d'une source officielle,
  vous pouvez proposer la valeur officielle avec une justification.

- Si un champ est vide et qu'une source fiable permet de le
  compléter, proposez cette information.

- La valeur proposée doit être directement exploitable
  dans la fiche de l'établissement.

- Pour les téléphones, conservez autant que possible le format
  officiel trouvé.

- Pour les emails, utilisez uniquement une adresse réellement
  publiée par une source fiable.

- Pour les sites web, utilisez l'URL officielle lorsqu'elle
  existe.

- Pour les formations, filières et diplômes, ne proposez que
  les formations réellement associées à l'établissement.

- Pour la capacité, ne l'inventez jamais.

- Pour la date de création, ne proposez une année que si une
  source fiable la confirme.

- Pour le statut, utilisez uniquement un statut clairement
  établi par une source fiable.

Répondez uniquement avec le tableau JSON.
`;

  try {
    console.log(
      '[AI] Recherche et vérification du centre :',
      centre?.nom ||
        centre?.nom_officiel ||
        'établissement sans nom'
    );

    const raw =
      await model.generateContent(prompt);

    console.log(
      '[AI] Réponse brute Gemini :',
      raw
    );

    const texte =
      extraireTexteReponse(raw);

    console.log(
      '[AI] Texte Gemini :',
      texte
    );

    if (!texte.trim()) {
      throw new Error(
        'Gemini a retourné une réponse vide.'
      );
    }

    /*
     * Sources réellement retournées par Google Search.
     */
    const sourcesGrounding =
      extraireSourcesGrounding(raw);

    console.log(
      '[AI] Sources Google Search détectées :',
      sourcesGrounding
    );

    const json = nettoyerJSON(texte);

    let parsed: any;

    try {
      parsed = JSON.parse(json);
    } catch (parseError) {
      console.error(
        '[AI] JSON Gemini invalide :',
        json
      );

      throw new Error(
        'La réponse du modèle n’est pas un JSON valide.'
      );
    }

    const suggestions =
      normaliserSuggestions(
        parsed,
        sourcesGrounding
      );

    /*
     * Sécurité finale :
     * une suggestion sans champ ou sans valeur exploitable
     * ne doit jamais être envoyée à l'interface.
     */
    const suggestionsFinales =
      suggestions.filter(
        (suggestion) => {
          if (!suggestion.champ) {
            return false;
          }

          if (
            suggestion.valeurProposee ===
              undefined ||
            suggestion.valeurProposee ===
              null
          ) {
            return false;
          }

          const valeur = String(
            suggestion.valeurProposee
          )
            .trim()
            .toLowerCase();

          if (
            valeur === '' ||
            valeur ===
              'information non trouvée' ||
            valeur ===
              'information non trouvee'
          ) {
            return false;
          }

          return true;
        }
      );

    console.log(
      '[AI] Suggestions finales :',
      suggestionsFinales
    );

    return suggestionsFinales;
  } catch (err: any) {
    console.error(
      '[AI] Erreur pendant la génération des suggestions :',
      err
    );

    throw new Error(
      err?.message ||
        'Impossible de rechercher et vérifier les informations de l’établissement.'
    );
  }
}
