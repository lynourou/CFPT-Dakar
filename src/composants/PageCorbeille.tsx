import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  Building2,
  MapPin,
  Calendar,
  User,
} from 'lucide-react';
import { CentreFormation, UtilisateurConnecte } from '../types';
import {
  obtenirCentresCorbeille,
  restaurerCentre,
  supprimerCentreDefinitif,
} from '../services/centresService';

interface PageCorbeilleProps {
  utilisateur: UtilisateurConnecte;
  surNotification: (message: string, type: 'succes' | 'erreur') => void;
  surCentresModifies: () => void;
}

export const PageCorbeille: React.FC<PageCorbeilleProps> = ({
  utilisateur,
  surNotification,
  surCentresModifies,
}) => {
  const [centresCorbeille, setCentresCorbeille] = useState<CentreFormation[]>([]);
  const [chargement, setChargement] = useState<boolean>(true);
  const [centrePourSuppressionDefinitive, setCentrePourSuppressionDefinitive] =
    useState<CentreFormation | null>(null);
  const [actionEnCours, setActionEnCours] = useState<boolean>(false);

  const chargerCorbeille = useCallback(async () => {
    try {
      setChargement(true);
      const data = await obtenirCentresCorbeille();
      setCentresCorbeille(data);
    } catch (err) {
      console.error('Erreur chargement corbeille:', err);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    chargerCorbeille();
  }, [chargerCorbeille]);

  const gererRestauration = async (centre: CentreFormation) => {
    setActionEnCours(true);
    try {
      await restaurerCentre(centre.id, utilisateur, centre.nom);
      surNotification(`L'établissement "${centre.nom}" a été restauré.`, 'succes');
      surCentresModifies();
      chargerCorbeille();
    } catch (err: any) {
      surNotification(err?.message || 'Erreur lors de la restauration.', 'erreur');
    } finally {
      setActionEnCours(false);
    }
  };

  const gererSuppressionDefinitive = async () => {
    if (!centrePourSuppressionDefinitive) return;
    setActionEnCours(true);
    try {
      await supprimerCentreDefinitif(
        centrePourSuppressionDefinitive.id,
        centrePourSuppressionDefinitive.nom,
        utilisateur
      );
      surNotification(
        `L'établissement "${centrePourSuppressionDefinitive.nom}" a été supprimé définitivement.`,
        'succes'
      );
      setCentrePourSuppressionDefinitive(null);
      surCentresModifies();
      chargerCorbeille();
    } catch (err: any) {
      surNotification(err?.message || 'Erreur lors de la suppression définitive.', 'erreur');
    } finally {
      setActionEnCours(false);
    }
  };

  return (
    <div id="page-corbeille-root" className="space-y-4 animate-fadeIn">
      {/* En-tête */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Corbeille des Établissements
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
              {centresCorbeille.length} établissement{centresCorbeille.length > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Les établissements supprimés sont archivés ici avant suppression définitive. Vous pouvez
            les restaurer à tout moment.
          </p>
        </div>

        <button
          type="button"
          onClick={chargerCorbeille}
          disabled={chargement}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-900 ${chargement ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Liste */}
      {chargement && centresCorbeille.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          Chargement de la corbeille...
        </div>
      ) : centresCorbeille.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500 space-y-2">
          <Trash2 className="w-9 h-9 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-800 text-sm">La corbeille est vide</h4>
          <p className="max-w-md mx-auto">
            Aucun établissement n'est actuellement supprimé. Lorsque vous supprimez un centre depuis le
            tableau, il apparaîtra ici avec une option de restauration.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
                  <th className="py-3 px-3.5">Établissement</th>
                  <th className="py-3 px-3">Commune</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Date de suppression</th>
                  <th className="py-3 px-3">Supprimé par</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {centresCorbeille.map((centre) => {
                  const dateSuppr = centre.deletedAt
                    ? new Date(centre.deletedAt).toLocaleString('fr-FR')
                    : 'Date inconnue';

                  return (
                    <tr key={centre.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3.5 max-w-xs">
                        <div className="font-bold text-slate-900 truncate">{centre.nom}</div>
                        {centre.nom_officiel && (
                          <div className="text-[11px] text-slate-400 truncate">
                            {centre.nom_officiel}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {centre.commune || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            centre.type === 'Public'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {centre.type || 'Non défini'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {dateSuppr}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {centre.deletedBy || 'admin'}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => gererRestauration(centre)}
                          disabled={actionEnCours}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="Restaurer l'établissement"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restaurer</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCentrePourSuppressionDefinitive(centre)}
                          disabled={actionEnCours}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Supprimer définitivement</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Boîte modale de confirmation définitive */}
      {centrePourSuppressionDefinitive && (
        <div
          id="modal-confirmation-suppression-definitive-overlay"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => !actionEnCours && setCentrePourSuppressionDefinitive(null)}
        >
          <div
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-red-200 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Suppression définitive irréversible</h4>
                <p className="text-xs text-red-700">Cette action ne peut pas être annulée</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Êtes-vous certain de vouloir supprimer définitivement l'établissement{' '}
              <strong className="text-slate-900">
                "{centrePourSuppressionDefinitive.nom}"
              </strong>{' '}
              ? Toutes ses données associées seront effacées de Firestore sans possibilité de
              restauration ultérieure.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCentrePourSuppressionDefinitive(null)}
                disabled={actionEnCours}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={gererSuppressionDefinitive}
                disabled={actionEnCours}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors cursor-pointer"
              >
                {actionEnCours ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
