import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { CentreFormation } from '../types';

interface ModalConfirmationSuppressionProps {
  ouvert: boolean;
  centre: CentreFormation | null;
  enCours: boolean;
  surConfirmer: () => void;
  surAnnuler: () => void;
}

export const ModalConfirmationSuppression: React.FC<ModalConfirmationSuppressionProps> = ({
  ouvert,
  centre,
  enCours,
  surConfirmer,
  surAnnuler,
}) => {
  if (!ouvert || !centre) return null;

  return (
    <div
      id="modal-confirmation-suppression-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      onClick={surAnnuler}
    >
      <div
        id="modal-confirmation-suppression-contenu"
        className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Voulez-vous vraiment supprimer cet établissement ?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cette action est irréversible. L'établissement suivant sera définitivement retiré de la base Firestore :
              </p>
              <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="block font-bold text-slate-800 text-xs truncate">
                  {centre.nom}
                </span>
                {centre.commune && (
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    Commune : {centre.commune}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              id="bouton-annuler-suppression-modal"
              type="button"
              onClick={surAnnuler}
              disabled={enCours}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              id="bouton-confirmer-suppression-modal"
              type="button"
              onClick={surConfirmer}
              disabled={enCours}
              className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {enCours ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Suppression...</span>
                </>
              ) : (
                <span>Supprimer</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
