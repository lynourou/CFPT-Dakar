// src/composants/AssistantIA.tsx

import { useState } from 'react';
import {
  Bot,
  Check,
  ExternalLink,
  Loader2,
  Search,
  Sparkles,
  X,
} from 'lucide-react';

import type { CentreFormation } from '../types';
import type { SuggestionIA } from '../types/ai';

import { genererSuggestionsPourCentre } from '../services/aiService';
import { modifierCentre } from '../services/centresService';
import { auth } from '../services/firebase';

interface AssistantIAProps {
  centre: CentreFormation;
  surFermer: () => void;
}

const nomsChamps: Record<string, string> = {
  nom_officiel: 'Nom officiel',
  adresse: 'Adresse',
  commune: 'Commune',
  telephone: 'Téléphone',
  email: 'Email',
  site_web: 'Site web',
  formation: 'Formation',
  filiere: 'Filière',
  diplomes: 'Diplômes',
  date_creation: 'Date de création',
  description: 'Description',
  capacite: 'Capacité',
  statut: 'Statut',
};

export default function AssistantIA({
  centre,
  surFermer,
}: AssistantIAProps) {
  const [recherche, setRecherche] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionIA[]>([]);
  const [selection, setSelection] = useState<number[]>([]);
  const [erreur, setErreur] = useState('');
  const [application, setApplication] = useState(false);
  const [termine, setTermine] = useState(false);

  const lancerRecherche = async () => {
    setRecherche(true);
    setErreur('');
    setSuggestions([]);
    setSelection([]);
    setTermine(false);

    try {
      const resultats = await genererSuggestionsPourCentre(
        centre as Record<string, any>
      );

      setSuggestions(resultats);

      // Sélection automatique uniquement des champs vides.
      const champsVides = resultats
        .map((suggestion, index) => {
          const valeurActuelle =
            suggestion.valeurActuelle ??
            (centre as any)[suggestion.champ] ??
            '';

          return String(valeurActuelle).trim() === ''
            ? index
            : null;
        })
        .filter((index): index is number => index !== null);

      setSelection(champsVides);
    } catch (error: any) {
      console.error(error);
      setErreur(
        error?.message ||
          'Une erreur est survenue pendant la recherche.'
      );
    } finally {
      setRecherche(false);
    }
  };

  const basculerSelection = (index: number) => {
    setSelection((ancienne) =>
      ancienne.includes(index)
        ? ancienne.filter((i) => i !== index)
        : [...ancienne, index]
    );
  };

  const appliquerSuggestions = async () => {
    const choisies = suggestions.filter((_, index) =>
      selection.includes(index)
    );

    if (choisies.length === 0) {
      return;
    }

    const remplacements = choisies.filter((suggestion) => {
      const actuelle =
        suggestion.valeurActuelle ??
        (centre as any)[suggestion.champ] ??
        '';

      return String(actuelle).trim() !== '';
    });

    if (remplacements.length > 0) {
      const confirmation = window.confirm(
        `L'IA propose de remplacer ${remplacements.length} information(s) existante(s).\n\n` +
          remplacements
            .map(
              (s) =>
                `• ${nomsChamps[s.champ] || s.champ}\n` +
                `  Actuel : ${s.valeurActuelle}\n` +
                `  Nouveau : ${s.valeurProposee}`
            )
            .join('\n\n') +
          '\n\nVoulez-vous réellement appliquer ces modifications ?'
      );

      if (!confirmation) {
        return;
      }
    }

    setApplication(true);
    setErreur('');

    try {
      const modifications: Record<string, any> = {};

      choisies.forEach((suggestion) => {
        modifications[suggestion.champ] =
          suggestion.valeurProposee;
      });

      const utilisateur = auth.currentUser
        ? {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email,
            nomAffiche:
              auth.currentUser.displayName ||
              auth.currentUser.email ||
              'Utilisateur',
          }
        : undefined;

      await modifierCentre(
        centre.id,
        modifications,
        utilisateur
      );

      setTermine(true);
      setSelection([]);
    } catch (error: any) {
      console.error(error);
      setErreur(
        error?.message ||
          'Impossible d’appliquer les modifications.'
      );
    } finally {
      setApplication(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 p-2">
              <Bot size={25} />
            </div>

            <div>
              <h2 className="text-lg font-bold">
                Assistant IA
              </h2>

              <p className="text-sm text-slate-300">
                Rechercher / Vérifier
              </p>
            </div>
          </div>

          <button
            onClick={surFermer}
            className="rounded-lg p-2 hover:bg-white/10"
            title="Fermer"
          >
            <X size={22} />
          </button>
        </div>

        {/* Centre */}
        <div className="border-b bg-slate-50 px-6 py-4">
          <div className="text-xs font-semibold uppercase text-slate-500">
            Établissement analysé
          </div>

          <div className="mt-1 text-lg font-bold text-slate-900">
            {centre.nom}
          </div>

          {centre.commune && (
            <div className="text-sm text-slate-500">
              {centre.commune}
            </div>
          )}
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-6">
          {!recherche &&
            suggestions.length === 0 &&
            !erreur &&
            !termine && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-5 rounded-2xl bg-indigo-50 p-5 text-indigo-600">
                  <Sparkles size={42} />
                </div>

                <h3 className="text-xl font-bold text-slate-900">
                  Vérifier cette fiche avec l'IA
                </h3>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  L'assistant recherchera des informations sur le
                  Web et proposera uniquement les modifications
                  accompagnées de sources vérifiables.
                </p>

                <button
                  onClick={lancerRecherche}
                  className="mt-6 flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow hover:bg-indigo-700"
                >
                  <Search size={18} />
                  Rechercher et vérifier
                </button>
              </div>
            )}

          {recherche && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2
                size={42}
                className="animate-spin text-indigo-600"
              />

              <h3 className="mt-5 text-lg font-bold text-slate-900">
                Recherche en cours…
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                L'IA consulte les sources disponibles sur le Web.
              </p>
            </div>
          )}

          {erreur && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              <div className="font-bold">
                Erreur
              </div>

              <div className="mt-1">
                {erreur}
              </div>

              <button
                onClick={lancerRecherche}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white"
              >
                Réessayer
              </button>
            </div>
          )}

          {termine && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5">
              <div className="flex items-center gap-3 text-green-700">
                <Check size={24} />
                <div>
                  <div className="font-bold">
                    Modifications enregistrées
                  </div>
                  <div className="text-sm">
                    Les changements ont été enregistrés dans
                    Firestore et dans l'historique.
                  </div>
                </div>
              </div>
            </div>
          )}

          {!recherche && suggestions.length > 0 && (
            <div>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">
                    Suggestions trouvées
                  </h3>

                  <p className="text-sm text-slate-500">
                    Sélectionnez les informations à appliquer.
                  </p>
                </div>

                <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
                  {selection.length} sélectionnée(s)
                </div>
              </div>

              <div className="space-y-4">
                {suggestions.map((suggestion, index) => {
                  const actuelle =
                    suggestion.valeurActuelle ??
                    (centre as any)[suggestion.champ] ??
                    '';

                  const estRemplacement =
                    String(actuelle).trim() !== '';

                  const coche = selection.includes(index);

                  return (
                    <div
                      key={`${suggestion.champ}-${index}`}
                      className={`rounded-xl border p-4 transition ${
                        coche
                          ? 'border-indigo-300 bg-indigo-50/50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex gap-3">
                        <input
                          type="checkbox"
                          checked={coche}
                          onChange={() =>
                            basculerSelection(index)
                          }
                          className="mt-1 h-5 w-5 accent-indigo-600"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {nomsChamps[suggestion.champ] ||
                                suggestion.champ}
                            </span>

                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                suggestion.niveauConfiance ===
                                'high'
                                  ? 'bg-green-100 text-green-700'
                                  : suggestion.niveauConfiance ===
                                    'medium'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              Confiance :{' '}
                              {suggestion.niveauConfiance}
                            </span>

                            {estRemplacement && (
                              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                                Remplacement
                              </span>
                            )}
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="rounded-lg bg-slate-100 p-3">
                              <div className="text-xs font-semibold uppercase text-slate-500">
                                Valeur actuelle
                              </div>

                              <div className="mt-1 break-words text-sm text-slate-800">
                                {String(actuelle).trim() ||
                                  'Vide'}
                              </div>
                            </div>

                            <div className="rounded-lg bg-white p-3 ring-1 ring-indigo-200">
                              <div className="text-xs font-semibold uppercase text-indigo-600">
                                Proposition IA
                              </div>

                              <div className="mt-1 break-words text-sm font-medium text-slate-900">
                                {suggestion.valeurProposee}
                              </div>
                            </div>
                          </div>

                          {suggestion.justification && (
                            <p className="mt-3 text-sm leading-5 text-slate-600">
                              <strong>Justification :</strong>{' '}
                              {suggestion.justification}
                            </p>
                          )}

                          {suggestion.source?.url && (
                            <a
                              href={suggestion.source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline"
                            >
                              <ExternalLink size={14} />
                              {suggestion.source.nom ||
                                'Voir la source'}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap gap-3 border-t pt-5">
                <button
                  onClick={lancerRecherche}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Nouvelle recherche
                </button>

                <button
                  onClick={appliquerSuggestions}
                  disabled={
                    selection.length === 0 || application
                  }
                  className="ml-auto flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {application ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Enregistrement…
                    </>
                  ) : (
                    <>
                      <Check size={17} />
                      Appliquer les sélections
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {!recherche &&
            suggestions.length === 0 &&
            !erreur &&
            termine === false &&
            suggestions.length === 0 && (
              <div />
            )}
        </div>
      </div>
    </div>
  );
}
