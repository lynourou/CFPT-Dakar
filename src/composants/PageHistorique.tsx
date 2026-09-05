import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  RotateCcw,
  RefreshCw,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { EntreeHistorique, UtilisateurConnecte } from '../types';
import { obtenirHistorique, restaurerVersionHistorique } from '../services/centresService';

interface PageHistoriqueProps {
  utilisateur: UtilisateurConnecte;
  surNotification: (message: string, type: 'succes' | 'erreur') => void;
  surCentresModifies: () => void;
}

export const PageHistorique: React.FC<PageHistoriqueProps> = ({
  utilisateur,
  surNotification,
  surCentresModifies,
}) => {
  const [entrees, setEntrees] = useState<EntreeHistorique[]>([]);
  const [chargement, setChargement] = useState<boolean>(true);
  const [entreeSelectionnee, setEntreeSelectionnee] = useState<string | null>(null);
  const [entreeARestaurer, setEntreeARestaurer] = useState<EntreeHistorique | null>(null);
  const [restaurationEnCours, setRestaurationEnCours] = useState<boolean>(false);

  const chargerHistorique = useCallback(async () => {
    try {
      setChargement(true);
      const data = await obtenirHistorique(60);
      setEntrees(data);
    } catch (err) {
      console.error('Erreur chargement historique:', err);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    chargerHistorique();
  }, [chargerHistorique]);

  const gererRestauration = async () => {
    if (!entreeARestaurer) return;
    setRestaurationEnCours(true);
    try {
      await restaurerVersionHistorique(entreeARestaurer, utilisateur);
      surNotification(
        `L'établissement "${entreeARestaurer.centreNom}" a été restauré avec succès.`,
        'succes'
      );
      setEntreeARestaurer(null);
      surCentresModifies();
      chargerHistorique();
    } catch (err: any) {
      console.error('Erreur restauration:', err);
      surNotification(err?.message || 'Échec de la restauration de la version.', 'erreur');
    } finally {
      setRestaurationEnCours(false);
    }
  };

  const getBadgeAction = (action: EntreeHistorique['action']) => {
    switch (action) {
      case 'AJOUT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'MODIFICATION':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DEPLACEMENT':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'SUPPRESSION':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'IMPORT':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'RESTAURATION':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'MODIFICATION_MASSE':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div id="page-historique-root" className="space-y-4 animate-fadeIn">
      {/* En-tête */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Journal d'Audit & Historique des Modifications
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {entrees.length} entrée{entrees.length > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Traçabilité intégrale de toutes les opérations administratives enregistrées dans Firestore.
          </p>
        </div>

        <button
          type="button"
          onClick={chargerHistorique}
          disabled={chargement}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-900 ${chargement ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Liste des entrées */}
      {chargement && entrees.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          Chargement du journal d'audit...
        </div>
      ) : entrees.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500 space-y-2">
          <History className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-bold text-slate-800 text-sm">Aucune opération enregistrée pour le moment</p>
          <p>Les ajouts, modifications, déplacements et imports apparaîtront ici automatiquement.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden divide-y divide-slate-100 text-xs">
          {entrees.map((item) => {
            const dateObj = new Date(item.date);
            const dateLisible = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : item.date;

            const estOuvert = entreeSelectionnee === item.id;
            const peutRestaurer = Boolean(
              item.anciennesValeurs &&
                item.action !== 'AJOUT' &&
                item.action !== 'RESTAURATION' &&
                item.centreId !== 'multiples' &&
                item.centreId !== 'import_lot'
            );

            return (
              <div key={item.id} className="p-3.5 hover:bg-slate-50/70 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 mt-0.5 ${getBadgeAction(
                        item.action
                      )}`}
                    >
                      {item.action}
                    </span>

                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-slate-900 font-bold text-xs">{item.centreNom}</strong>
                        {item.centreId && item.centreId !== 'multiples' && item.centreId !== 'import_lot' && (
                          <span className="font-mono text-[10px] text-slate-400">
                            (ID: {item.centreId})
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-xs">{item.details || 'Aucun détail'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 text-slate-500 text-[11px]">
                    <div className="text-right">
                      <div className="font-medium text-slate-700">{dateLisible}</div>
                      <div className="text-[10px] text-slate-400">
                        {item.utilisateur?.email || 'Administrateur'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {peutRestaurer && (
                        <button
                          type="button"
                          onClick={() => setEntreeARestaurer(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                          title="Restaurer l'état antérieur de cet établissement"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restaurer</span>
                        </button>
                      )}

                      {(item.anciennesValeurs || item.nouvellesValeurs) && (
                        <button
                          type="button"
                          onClick={() => setEntreeSelectionnee(estOuvert ? null : item.id)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                          title={estOuvert ? 'Masquer les détails' : 'Voir les détails des valeurs'}
                        >
                          {estOuvert ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Différences / Valeurs détaillées */}
                {estOuvert && (
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg text-[11px]">
                    {item.anciennesValeurs && (
                      <div>
                        <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                          Valeurs précédentes
                        </span>
                        <pre className="bg-white p-2 rounded border border-slate-200 overflow-x-auto text-[10px] font-mono text-slate-600 max-h-36">
                          {JSON.stringify(item.anciennesValeurs, null, 2)}
                        </pre>
                      </div>
                    )}
                    {item.nouvellesValeurs && (
                      <div>
                        <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                          Nouvelles valeurs appliquées
                        </span>
                        <pre className="bg-white p-2 rounded border border-slate-200 overflow-x-auto text-[10px] font-mono text-slate-600 max-h-36">
                          {JSON.stringify(item.nouvellesValeurs, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Boîte modale de confirmation de restauration */}
      {entreeARestaurer && (
        <div
          id="modal-confirmation-restauration-overlay"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => !restaurationEnCours && setEntreeARestaurer(null)}
        >
          <div
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Confirmer la restauration</h4>
                <p className="text-xs text-slate-500">Retour vers la version antérieure</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Voulez-vous rétablir les valeurs de l'établissement{' '}
              <strong>"{entreeARestaurer.centreNom}"</strong> telles qu'elles étaient avant la
              modification du {new Date(entreeARestaurer.date).toLocaleString('fr-FR')} ?
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setEntreeARestaurer(null)}
                disabled={restaurationEnCours}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={gererRestauration}
                disabled={restaurationEnCours}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors cursor-pointer"
              >
                {restaurationEnCours ? 'Restauration...' : 'Confirmer la restauration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
