import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Edit,
} from 'lucide-react';
import { CentreFormation, UtilisateurConnecte } from '../types';
import { modifierCentresEnMasse } from '../services/centresService';

interface ModalModificationMasseProps {
  centresSelectionnes: CentreFormation[];
  optionsCommunes: string[];
  optionsTypes: string[];
  optionsStatuts: string[];
  utilisateur: UtilisateurConnecte;
  surFermer: () => void;
  surSucces: (nbModifies: number) => void;
}

export const ModalModificationMasse: React.FC<ModalModificationMasseProps> = ({
  centresSelectionnes,
  optionsCommunes,
  optionsTypes,
  optionsStatuts,
  utilisateur,
  surFermer,
  surSucces,
}) => {
  const [modifierStatut, setModifierStatut] = useState<boolean>(false);
  const [nouveauStatut, setNouveauStatut] = useState<string>('');

  const [modifierType, setModifierType] = useState<boolean>(false);
  const [nouveauType, setNouveauType] = useState<string>('');

  const [modifierCommune, setModifierCommune] = useState<boolean>(false);
  const [nouvelleCommune, setNouvelleCommune] = useState<string>('');

  const [modifierSource, setModifierSource] = useState<boolean>(false);
  const [nouvelleSource, setNouvelleSource] = useState<string>('');

  const [enCours, setEnCours] = useState<boolean>(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const total = centresSelectionnes.length;

  const aAuMoinsUneModification =
    (modifierStatut && nouveauStatut.trim() !== '') ||
    (modifierType && nouveauType.trim() !== '') ||
    (modifierCommune && nouvelleCommune.trim() !== '') ||
    (modifierSource && nouvelleSource.trim() !== '');

  const gererValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aAuMoinsUneModification) {
      setErreur('Veuillez cocher et renseigner au moins un champ à modifier.');
      return;
    }

    setEnCours(true);
    setErreur(null);

    try {
      const modifications: Partial<CentreFormation> = {};
      if (modifierStatut && nouveauStatut) modifications.statut = nouveauStatut;
      if (modifierType && nouveauType) modifications.type = nouveauType;
      if (modifierCommune && nouvelleCommune) modifications.commune = nouvelleCommune;
      if (modifierSource && nouvelleSource) modifications.source = nouvelleSource;

      const ids = centresSelectionnes.map((c) => c.id);
      const nb = await modifierCentresEnMasse(ids, modifications, utilisateur);
      surSucces(nb);
      surFermer();
    } catch (err: any) {
      console.error('Erreur modification en masse:', err);
      setErreur(err?.message || "Impossible d'appliquer la modification en masse.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div
      id="modal-modification-masse-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={surFermer}
    >
      <div
        id="modal-modification-masse-contenu"
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Modification groupée en masse
              </h3>
              <p className="text-xs text-slate-400">
                {total} établissement{total > 1 ? 's' : ''} sélectionné{total > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={surFermer}
            disabled={enCours}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message d'avertissement contextuel */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Attention :</strong> Vous êtes sur le point de mettre à jour simultanément{' '}
            <strong>{total} établissements</strong>. Seuls les champs cochés ci-dessous seront
            modifiés. Cette opération est enregistrée dans l'historique d'audit.
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={gererValidation} className="p-5 space-y-4 text-xs">
          {erreur && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 font-medium">
              {erreur}
            </div>
          )}

          <div className="space-y-3.5">
            {/* 1. Statut */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={modifierStatut}
                  onChange={(e) => setModifierStatut(e.target.checked)}
                  className="rounded text-blue-900 focus:ring-blue-900 w-4 h-4"
                />
                <span className="font-bold text-slate-800">Modifier le Statut d'homologation</span>
              </label>
              {modifierStatut && (
                <div className="pl-6 pt-1">
                  <select
                    value={nouveauStatut}
                    onChange={(e) => setNouveauStatut(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    required={modifierStatut}
                  >
                    <option value="">-- Choisir un statut --</option>
                    <option value="Homologué">Homologué</option>
                    <option value="Reconnu">Reconnu</option>
                    <option value="En cours">En cours</option>
                    <option value="Non homologué">Non homologué</option>
                    {optionsStatuts.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 2. Type */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={modifierType}
                  onChange={(e) => setModifierType(e.target.checked)}
                  className="rounded text-blue-900 focus:ring-blue-900 w-4 h-4"
                />
                <span className="font-bold text-slate-800">Modifier le Type d'établissement</span>
              </label>
              {modifierType && (
                <div className="pl-6 pt-1">
                  <select
                    value={nouveauType}
                    onChange={(e) => setNouveauType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    required={modifierType}
                  >
                    <option value="">-- Choisir un type --</option>
                    <option value="Public">Public</option>
                    <option value="Privé">Privé</option>
                    {optionsTypes.map((tp) => (
                      <option key={tp} value={tp}>
                        {tp}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 3. Commune */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={modifierCommune}
                  onChange={(e) => setModifierCommune(e.target.checked)}
                  className="rounded text-blue-900 focus:ring-blue-900 w-4 h-4"
                />
                <span className="font-bold text-slate-800">Modifier la Commune</span>
              </label>
              {modifierCommune && (
                <div className="pl-6 pt-1">
                  <select
                    value={nouvelleCommune}
                    onChange={(e) => setNouvelleCommune(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    required={modifierCommune}
                  >
                    <option value="">-- Choisir une commune --</option>
                    {optionsCommunes.map((comm) => (
                      <option key={comm} value={comm}>
                        {comm}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 4. Source de la donnée */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={modifierSource}
                  onChange={(e) => setModifierSource(e.target.checked)}
                  className="rounded text-blue-900 focus:ring-blue-900 w-4 h-4"
                />
                <span className="font-bold text-slate-800">Modifier la Source de la donnée</span>
              </label>
              {modifierSource && (
                <div className="pl-6 pt-1">
                  <input
                    type="text"
                    value={nouvelleSource}
                    onChange={(e) => setNouvelleSource(e.target.value)}
                    placeholder="Ex: Enquête de terrain 2026, ONFP, ANSD..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    required={modifierSource}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Pied de dialogue */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={surFermer}
              disabled={enCours}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={enCours || !aAuMoinsUneModification}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-white transition-all shadow-xs cursor-pointer ${
                enCours || !aAuMoinsUneModification
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-blue-900 hover:bg-blue-800'
              }`}
            >
              <Edit className="w-3.5 h-3.5" />
              <span>{enCours ? 'Application...' : `Appliquer à ${total} établissement${total > 1 ? 's' : ''}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
