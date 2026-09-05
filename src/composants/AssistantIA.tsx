import React, { useMemo, useState } from 'react';
import {
  Bot,
  Check,
  ExternalLink,
  Loader2,
  Search,
  Sparkles,
  X,
  AlertCircle,
} from 'lucide-react';
import { genererSuggestionsPourCentre } from '../services/aiService';
import { modifierCentre } from '../services/centresService';
import { auth } from '../services/firebase';
import type { CentreFormation } from '../types';
import type { SuggestionIA } from '../types/ai';

interface AssistantIAProps {
  centre: CentreFormation;
  surFermer: () => void;
}

const champsVerifiables = [
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
];

const nomsChamps: Record<string, string> = {
  nom_officiel: 'Nom officiel',
  adresse: 'Adresse',
  commune: 'Commune',
  telephone: 'Téléphone',
  email: 'Email',
  site_web: 'Site web',
  formation: 'Formation',
  filiere: 'Filière / Spécialité',
  diplomes: 'Diplômes',
  date_creation: 'Date de création',
  description: 'Description',
  capacite: 'Capacité',
  statut: 'Statut',
};

const valeurExiste = (valeur: unknown): boolean => {
  if (valeur === undefined || valeur === null) return false;

  if (typeof valeur === 'string') {
    const v = valeur.trim().toLowerCase();

    if (
      v === '' ||
      v === 'null' ||
      v === 'undefined' ||
      v === 'information non trouvée'
    ) {
      return false;
    }
  }

  if (typeof valeur === 'number' && Number.isNaN(valeur)) {
    return false;
  }

  return true;
};

const formaterConfiance = (
  niveau: SuggestionIA['niveauConfiance'],
): { label: string; classe: string } => {
  if (typeof niveau === 'number') {
    const pourcentage =
      niveau <= 1 ? Math.round(niveau * 100) : Math.round(niveau);

    if (pourcentage >= 80) {
      return {
        label: `Confiance élevée (${pourcentage} %)`,
        classe: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }

    if (pourcentage >= 50) {
      return {
        label: `Confiance moyenne (${pourcentage} %)`,
        classe: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }

    return {
      label: `Confiance faible (${pourcentage} %)`,
      classe: 'bg-red-50 text-red-700 border-red-200',
    };
  }

  switch (niveau) {
    case 'high':
      return {
        label: 'Confiance élevée',
        classe: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };

    case 'low':
      return {
        label: 'Confiance faible',
        classe: 'bg-red-50 text-red-700 border-red-200',
      };

    default:
      return {
        label: 'Confiance moyenne',
        classe: 'bg-amber-50 text-amber-700 border-amber-200',
      };
  }
};

export const AssistantIA: React.FC<AssistantIAProps> = ({
  centre,
  surFermer,
}) => {
  const [suggestions, setSuggestions] = useState<SuggestionIA[]>([]);
  const [selectionnees, setSelectionnees] = useState<Set<number>>(new Set());
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [messageSucces, setMessageSucces] = useState<string | null>(null);
  const [confirmationRemplacement, setConfirmationRemplacement] =
    useState(false);

  const suggestionsValides = useMemo(() => {
    return suggestions.filter((suggestion) => {
      if (!suggestion.champ) return false;

      if (!champsVerifiables.includes(suggestion.champ)) {
        return false;
      }

      if (
        suggestion.valeurProposee === undefined ||
        suggestion.valeurProposee === null ||
        String(suggestion.valeurProposee).trim() === ''
      ) {
        return false;
      }

      const valeurProposee = String(
        suggestion.valeurProposee,
      ).trim().toLowerCase();

      if (
        valeurProposee === 'information non trouvée' ||
        valeurProposee === 'information non trouvee'
      ) {
        return false;
      }

      return true;
    });
  }, [suggestions]);

  const suggestionsAvecChampsExistants = useMemo(() => {
    return suggestionsValides.filter((suggestion) =>
      valeurExiste((centre as any)[suggestion.champ]),
    );
  }, [centre, suggestionsValides]);

  const suggestionsPourChampsVides = useMemo(() => {
    return suggestionsValides.filter(
      (suggestion) => !valeurExiste((centre as any)[suggestion.champ]),
    );
  }, [centre, suggestionsValides]);

  const rechercher = async () => {
    setRechercheEnCours(true);
    setErreur(null);
    setMessageSucces(null);
    setSuggestions([]);
    setSelectionnees(new Set());

    try {
      const resultat = await genererSuggestionsPourCentre({
        nom: centre.nom,
        nom_officiel: centre.nom_officiel,
        adresse: centre.adresse,
        commune: centre.commune,
        telephone: centre.telephone,
        email: centre.email,
        site_web: centre.site_web,
        formation: centre.formation,
        filiere: centre.filiere,
        diplomes: centre.diplomes,
        date_creation: centre.date_creation,
        description: centre.description,
        capacite: centre.capacite,
        statut: centre.statut,
      });

      const propres = resultat.filter((suggestion) => {
        if (!suggestion.champ) return false;

        if (!champsVerifiables.includes(suggestion.champ)) {
          return false;
        }

        const valeur = String(
          suggestion.valeurProposee ?? '',
        ).trim().toLowerCase();

        return (
          valeur !== '' &&
          valeur !== 'information non trouvée' &&
          valeur !== 'information non trouvee'
        );
      });

      setSuggestions( propres );

      /*
       * Les champs actuellement vides peuvent être présélectionnés.
       * Les champs déjà renseignés restent volontairement NON sélectionnés.
       */
      const nouvellesSelections = new Set<number>();

      propres.forEach((suggestion, index) => {
        const valeurActuelle = (centre as any)[suggestion.champ];

        if (!valeurExiste(valeurActuelle)) {
          nouvellesSelections.add(index);
        }
      });

      setSelectionnees(nouvellesSelections);

      if (propres.length === 0) {
        setMessageSucces(
          'Aucune information fiable supplémentaire n’a été trouvée.',
        );
      }
    } catch (err: any) {
      console.error('[Assistant IA] Erreur:', err);

      setErreur(
        err?.message ||
          'Impossible d’effectuer la recherche. Vérifiez la configuration de Firebase AI Logic.',
      );
    } finally {
      setRechercheEnCours(false);
    }
  };

  const basculerSelection = (index: number) => {
    setSelectionnees((ancienne) => {
      const nouvelle = new Set(ancienne);

      if (nouvelle.has(index)) {
        nouvelle.delete(index);
      } else {
        nouvelle.add(index);
      }

      return nouvelle;
    });
  };

  const selectionnerToutesLesValeursFiables = () => {
    const nouvelleSelection = new Set<number>();

    suggestionsValides.forEach((suggestion, index) => {
      const valeurActuelle = (centre as any)[suggestion.champ];

      if (!valeurExiste(valeurActuelle)) {
        nouvelleSelection.add(index);
      }
    });

    setSelectionnees(nouvelleSelection);
  };

  const deselectionnerToutes = () => {
    setSelectionnees(new Set());
  };

  const preparerEnregistrement = () => {
    setErreur(null);
    setMessageSucces(null);

    const selection = suggestionsValides.filter((_, index) =>
      selectionnees.has(index),
    );

    if (selection.length === 0) {
      setErreur('Sélectionnez au moins une suggestion à appliquer.');
      return;
    }

    const contientRemplacement = selection.some((suggestion) =>
      valeurExiste((centre as any)[suggestion.champ]),
    );

    if (contientRemplacement) {
      setConfirmationRemplacement(true);
      return;
    }

    enregistrerSuggestions();
  };

  const enregistrerSuggestions = async () => {
    setConfirmationRemplacement(false);
    setErreur(null);
    setMessageSucces(null);
    setEnregistrementEnCours(true);

    try {
      const utilisateur = auth.currentUser;

      if (!utilisateur) {
        throw new Error(
          'Vous devez être connecté pour modifier les informations de cet établissement.',
        );
      }

      const suggestionsSelectionnees = suggestionsValides.filter((_, index) =>
        selectionnees.has(index),
      );

      if (suggestionsSelectionnees.length === 0) {
        throw new Error(
          'Aucune suggestion sélectionnée.',
        );
      }

      const modifications: Record<string, any> = {};

      suggestionsSelectionnees.forEach((suggestion) => {
        const champ = suggestion.champ;
        const valeurActuelle = (centre as any)[champ];

        /*
         * Sécurité supplémentaire :
         * un champ déjà rempli n'est jamais remplacé sans confirmation.
         */
        if (valeurExiste(valeurActuelle)) {
          // Le remplacement a déjà été confirmé par l'utilisateur.
          modifications[champ] = suggestion.valeurProposee;
          return;
        }

        modifications[champ] = suggestion.valeurProposee;
      });

      if (Object.keys(modifications).length === 0) {
        throw new Error(
          'Aucune modification valide à appliquer.',
        );
      }

      await modifierCentre(centre.id, modifications, {
        uid: utilisateur.uid,
        email: utilisateur.email || '',
        nomAffiche: utilisateur.displayName || utilisateur.email || 'Utilisateur',
      });

      setMessageSucces(
        `${Object.keys(modifications).length} information(s) mise(s) à jour avec succès.`,
      );

      /*
       * Retirer les suggestions appliquées de la liste.
       * La fiche principale sera actualisée par le flux existant de l'application.
       */
      const champsModifies = new Set(Object.keys(modifications));

      setSuggestions((anciennes) =>
        anciennes.filter(
          (suggestion) => !champsModifies.has(suggestion.champ),
        ),
      );

      setSelectionnees(new Set());
    } catch (err: any) {
      console.error(
        '[Assistant IA] Erreur lors de la mise à jour:',
        err,
      );

      setErreur(
        err?.message ||
          'Une erreur est survenue pendant l’enregistrement des modifications.',
      );
    } finally {
      setEnregistrementEnCours(false);
    }
  };

  const fermer = () => {
    if (rechercheEnCours || enregistrementEnCours) return;
    surFermer();
  };

  return (
    <div
      id="assistant-ia-modal-overlay"
      className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={fermer}
    >
      <div
        id="assistant-ia-modal-contenu"
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative max-h-[92vh] flex flex-col my-auto"
        onClick={(event) => event.stopPropagation()}
      >
        {/* En-tête */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 shrink-0">
          <button
            id="bouton-fermer-assistant-ia"
            type="button"
            onClick={fermer}
            disabled={rechercheEnCours || enregistrementEnCours}
            aria-label="Fermer l’assistant IA"
            className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 pr-12">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold">
                Assistant IA
              </h2>

              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Rechercher et vérifier les informations de l’établissement
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-800 border border-slate-700">
            <p className="text-xs text-slate-300">
              <strong className="text-white">{centre.nom}</strong>
              {valeurExiste(centre.commune) && (
                <span> · {centre.commune}</span>
              )}
            </p>

            <p className="text-[11px] text-slate-400 mt-1">
              Les informations proposées doivent être vérifiées par un
              utilisateur avant toute modification.
            </p>
          </div>
        </div>

        {/* Corps */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800">
          {/* Introduction */}
          {suggestions.length === 0 && !rechercheEnCours && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />

                <div>
                  <h3 className="font-bold text-sm text-blue-900">
                    Vérification intelligente
                  </h3>

                  <p className="text-xs sm:text-sm text-blue-800 mt-1 leading-relaxed">
                    L’assistant va rechercher des informations fiables sur
                    Internet et proposer uniquement les données qu’il peut
                    justifier par une source.
                  </p>

                  <ul className="mt-3 space-y-1 text-xs text-blue-800">
                    <li>• Priorité au site officiel de l’établissement.</li>
                    <li>• Vérification auprès des sources institutionnelles.</li>
                    <li>• Aucune donnée inventée.</li>
                    <li>• Aucune modification automatique.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Erreur */}
          {erreur && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />

                <div>
                  <h3 className="text-sm font-bold text-red-900">
                    Une erreur est survenue
                  </h3>

                  <p className="text-xs text-red-700 mt-1 leading-relaxed">
                    {erreur}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Succès */}
          {messageSucces && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />

                <div>
                  <h3 className="text-sm font-bold text-emerald-900">
                    Opération terminée
                  </h3>

                  <p className="text-xs text-emerald-700 mt-1">
                    {messageSucces}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bouton recherche */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Recherche des informations
              </h3>

              <p className="text-xs text-slate-500 mt-0.5">
                L’IA analyse les sources disponibles avant de proposer des
                corrections ou compléments.
              </p>
            </div>

            <button
              id="bouton-rechercher-assistant-ia"
              type="button"
              onClick={rechercher}
              disabled={rechercheEnCours || enregistrementEnCours}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {rechercheEnCours ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Recherche en cours...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Rechercher / Vérifier
                </>
              )}
            </button>
          </div>

          {/* Recherche en cours */}
          {rechercheEnCours && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
              <Loader2 className="w-7 h-7 text-blue-600 animate-spin mx-auto" />

              <p className="text-sm font-semibold text-slate-800 mt-3">
                Analyse des sources...
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Cela peut prendre quelques secondes.
              </p>
            </div>
          )}

          {/* Résultats */}
          {!rechercheEnCours && suggestionsValides.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Suggestions trouvées
                  </h3>

                  <p className="text-xs text-slate-500 mt-0.5">
                    {suggestionsValides.length} suggestion(s) ·{' '}
                    {selectionnees.size} sélectionnée(s)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectionnerToutesLesValeursFiables}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Sélectionner les champs vides
                  </button>

                  <span className="text-slate-300">|</span>

                  <button
                    type="button"
                    onClick={deselectionnerToutes}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Tout désélectionner
                  </button>
                </div>
              </div>

              {/* Avertissement champs existants */}
              {suggestionsAvecChampsExistants.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>Attention :</strong>{' '}
                    {suggestionsAvecChampsExistants.length} suggestion(s)
                    concernent des champs déjà renseignés. Elles ne seront
                    remplacées qu’après votre confirmation explicite.
                  </p>
                </div>
              )}

              {/* Liste */}
              <div className="space-y-3">
                {suggestionsValides.map((suggestion, index) => {
                  const actuelle = (centre as any)[suggestion.champ];
                  const estSelectionnee = selectionnees.has(index);
                  const champDejaRempli = valeurExiste(actuelle);
                  const confiance = formaterConfiance(
                    suggestion.niveauConfiance,
                  );

                  return (
                    <div
                      key={`${suggestion.champ}-${index}`}
                      className={`rounded-xl border transition-colors ${
                        estSelectionnee
                          ? 'border-blue-300 bg-blue-50/40'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={() => basculerSelection(index)}
                            aria-label={
                              estSelectionnee
                                ? 'Désélectionner la suggestion'
                                : 'Sélectionner la suggestion'
                            }
                            className={`w-5 h-5 rounded-md border shrink-0 mt-0.5 flex items-center justify-center transition-colors cursor-pointer ${
                              estSelectionnee
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white border-slate-300 hover:border-blue-400'
                            }`}
                          >
                            {estSelectionnee && (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            {/* Champ */}
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900">
                                {nomsChamps[suggestion.champ] ||
                                  suggestion.champ}
                              </h4>

                              {champDejaRempli ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200">
                                  Remplacement
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-200">
                                  Nouveau
                                </span>
                              )}

                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${confiance.classe}`}
                              >
                                {confiance.label}
                              </span>
                            </div>

                            {/* Valeurs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                                <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                                  Valeur actuelle
                                </span>

                                <p className="text-xs text-slate-700 break-words leading-relaxed">
                                  {valeurExiste(actuelle)
                                    ? String(actuelle)
                                    : 'Non renseignée'}
                                </p>
                              </div>

                              <div className="rounded-lg bg-white border border-blue-200 p-3">
                                <span className="block text-[9px] uppercase tracking-wider font-bold text-blue-500 mb-1">
                                  Valeur proposée
                                </span>

                                <p className="text-xs font-semibold text-blue-900 break-words leading-relaxed">
                                  {String(suggestion.valeurProposee)}
                                </p>
                              </div>
                            </div>

                            {/* Source */}
                            {suggestion.source?.url && (
                              <div className="mt-3">
                                <a
                                  href={suggestion.source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline break-all"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                  {suggestion.source.nom ||
                                    suggestion.source.url}
                                </a>
                              </div>
                            )}

                            {suggestion.source?.nom &&
                              !suggestion.source?.url && (
                                <p className="mt-3 text-[11px] font-semibold text-slate-600">
                                  Source : {suggestion.source.nom}
                                </p>
                              )}

                            {/* Justification */}
                            {suggestion.justification && (
                              <div className="mt-3 pt-3 border-t border-slate-100">
                                <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                                  Justification
                                </span>

                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                  {suggestion.justification}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bouton appliquer */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm pt-3 border-t border-slate-200">
                <button
                  id="bouton-appliquer-suggestions-ia"
                  type="button"
                  onClick={preparerEnregistrement}
                  disabled={
                    selectionnees.size === 0 ||
                    enregistrementEnCours
                  }
                  className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {enregistrementEnCours ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Appliquer les {selectionnees.size} suggestion(s)
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Aucun résultat */}
          {!rechercheEnCours &&
            suggestions.length > 0 &&
            suggestionsValides.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
                <Search className="w-7 h-7 text-slate-400 mx-auto" />

                <p className="text-sm font-semibold text-slate-800 mt-3">
                  Aucune information exploitable trouvée
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  L’assistant n’a pas trouvé de source suffisamment fiable
                  pour proposer une modification.
                </p>
              </div>
            )}

          {/* Information sur les champs vides */}
          {suggestionsPourChampsVides.length > 0 && (
            <div className="text-[11px] text-slate-500">
              Les champs actuellement vides sont présélectionnés. Vérifiez
              toujours la source avant de valider.
            </div>
          )}
        </div>

        {/* Confirmation remplacement */}
        {confirmationRemplacement && (
          <div className="absolute inset-0 z-10 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />

                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Confirmer le remplacement
                  </h3>

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Certaines suggestions sélectionnées remplacent des
                    informations déjà présentes dans la fiche.
                  </p>

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Êtes-vous certain de vouloir appliquer ces modifications ?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setConfirmationRemplacement(false)}
                  disabled={enregistrementEnCours}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={enregistrerSuggestions}
                  disabled={enregistrementEnCours}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 cursor-pointer disabled:opacity-50"
                >
                  {enregistrementEnCours
                    ? 'Enregistrement...'
                    : 'Confirmer et appliquer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pied */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[10px] text-slate-400">
            Les modifications sont enregistrées dans l’historique.
          </p>

          <button
            id="bouton-fermer-assistant-ia-bas"
            type="button"
            onClick={fermer}
            disabled={rechercheEnCours || enregistrementEnCours}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssistantIA;
