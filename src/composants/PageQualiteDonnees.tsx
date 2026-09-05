import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Edit,
  ArrowUpDown,
  Filter,
  Download,
  Info,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  GraduationCap,
  Database,
  Search,
} from 'lucide-react';
import { CentreFormation, IndicateurQualite } from '../types';
import { calculerQualiteDonnees, exporterVersCSV, telechargerFichier } from '../services/centresService';

interface PageQualiteDonneesProps {
  centres: CentreFormation[];
  surVoirCentre: (centre: CentreFormation) => void;
  surModifierCentre: (centre: CentreFormation) => void;
}

export const PageQualiteDonnees: React.FC<PageQualiteDonneesProps> = ({
  centres,
  surVoirCentre,
  surModifierCentre,
}) => {
  const [critereSelectionne, setCritereSelectionne] = useState<string | null>(null);
  const [recherche, setRecherche] = useState<string>('');

  const indicateurs = useMemo(() => calculerQualiteDonnees(centres), [centres]);

  const scoreGlobal = useMemo(() => {
    if (indicateurs.length === 0) return 100;
    const totalPourcent = indicateurs.reduce((acc, ind) => acc + ind.pourcentage, 0);
    return Math.round(totalPourcent / indicateurs.length);
  }, [indicateurs]);

  // Centrage sur le critère actif
  const indicateurActif = indicateurs.find((i) => i.cle === critereSelectionne) || null;

  // Centres ciblés par le critère actif
  const centresConcernes = useMemo(() => {
    if (!indicateurActif) return [];
    const idsSet = new Set(indicateurActif.centresManquantsIds.map(String));
    let liste = centres.filter((c) => idsSet.has(String(c.id)));
    if (recherche.trim()) {
      const term = recherche.toLowerCase().trim();
      liste = liste.filter(
        (c) =>
          (c.nom && c.nom.toLowerCase().includes(term)) ||
          (c.commune && c.commune.toLowerCase().includes(term))
      );
    }
    return liste;
  }, [centres, indicateurActif, recherche]);

  const gererExportAnomalies = () => {
    if (!indicateurActif || centresConcernes.length === 0) return;
    const csv = exporterVersCSV(centresConcernes);
    telechargerFichier(
      csv,
      `fpt_anomalies_${indicateurActif.cle}_${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv;charset=utf-8;'
    );
  };

  return (
    <div id="page-qualite-donnees-root" className="space-y-5 animate-fadeIn">
      {/* 1. Carte de synthèse de la qualité */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Contrôle Qualité & Complétude des Données
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                  scoreGlobal >= 80
                    ? 'bg-emerald-100 text-emerald-800'
                    : scoreGlobal >= 50
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                Score Global : {scoreGlobal}%
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Diagnostic calculé automatiquement sur l'intégralité des{' '}
              <strong className="text-slate-700">{centres.length} établissements</strong>{' '}
              actuellement enregistrés. Cliquez sur un indicateur pour isoler immédiatement les fiches
              à compléter.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Fiches analysées
              </span>
              <span className="text-lg font-extrabold text-blue-900">{centres.length}</span>
            </div>
            <div className="h-7 w-px bg-slate-200" />
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Critères vérifiés
              </span>
              <span className="text-lg font-extrabold text-slate-800">{indicateurs.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Grille des 8 indicateurs de qualité */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {indicateurs.map((ind) => {
          const estActif = critereSelectionne === ind.cle;
          const estParfait = ind.totalManquants === 0;

          return (
            <button
              key={ind.cle}
              type="button"
              id={`indicateur-qualite-${ind.cle}`}
              onClick={() => setCritereSelectionne(estActif ? null : ind.cle)}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                estActif
                  ? 'bg-blue-50/70 border-blue-900 shadow-sm ring-1 ring-blue-900'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-slate-800">{ind.label}</span>
                  {estParfait ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.2 rounded ${
                        ind.pourcentage >= 75
                          ? 'bg-emerald-50 text-emerald-700'
                          : ind.pourcentage >= 45
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {ind.pourcentage}%
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-1 mb-2.5">
                  {ind.description}
                </p>
              </div>

              <div className="space-y-1.5">
                {/* Barre de progression */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      ind.pourcentage >= 80
                        ? 'bg-emerald-500'
                        : ind.pourcentage >= 50
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${ind.pourcentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>{ind.totalRenseignes} renseignés</span>
                  <span className={ind.totalManquants > 0 ? 'text-amber-700 font-bold' : ''}>
                    {ind.totalManquants} manquant{ind.totalManquants > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Section détaillée pour le critère sélectionné */}
      {indicateurActif && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* En-tête du tableau de détail */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <h4 className="text-sm font-bold text-slate-900">
                  Établissements avec {indicateurActif.label} manquant ({centresConcernes.length})
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sélectionnez un établissement pour compléter ses informations ou le modifier.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Filtrer ces fiches..."
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-900 w-44 sm:w-56"
                />
              </div>

              <button
                type="button"
                onClick={gererExportAnomalies}
                disabled={centresConcernes.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Exporter cette liste en CSV"
              >
                <Download className="w-3.5 h-3.5 text-blue-900" />
                <span className="hidden sm:inline">Exporter CSV</span>
              </button>
            </div>
          </div>

          {/* Tableau des établissements concernés */}
          {centresConcernes.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-bold text-slate-800 text-sm">Aucune anomalie détectée</p>
              <p>Tous les établissements répertoriés sont conformes pour ce critère.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
                    <th className="py-2.5 px-3.5">ID</th>
                    <th className="py-2.5 px-3">Nom de l'établissement</th>
                    <th className="py-2.5 px-3">Commune</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Statut</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {centresConcernes.map((centre) => (
                    <tr
                      key={centre.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2 px-3.5 font-mono text-slate-400 text-[11px]">
                        {centre.id}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {centre.nom}
                        {centre.nom_officiel && (
                          <span className="block text-[11px] font-normal text-slate-400 truncate max-w-sm">
                            {centre.nom_officiel}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {centre.commune || <span className="text-amber-600 italic">Non renseignée</span>}
                      </td>
                      <td className="py-2 px-3">
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
                      <td className="py-2 px-3 text-slate-500">
                        {centre.statut || <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="py-2 px-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => surVoirCentre(centre)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-blue-900 transition-colors cursor-pointer"
                          title="Consulter la fiche"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => surModifierCentre(centre)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-blue-900 transition-colors cursor-pointer"
                          title="Compléter ou modifier la fiche"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
