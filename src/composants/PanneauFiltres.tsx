import React from 'react';
import { Filter, RotateCcw, Building2, GraduationCap, MapPin, Award, CheckCircle2 } from 'lucide-react';
import { FiltresCentres } from '../types';

interface PanneauFiltresProps {
  filtres: FiltresCentres;
  surChangementFiltre: <K extends keyof FiltresCentres>(cle: K, valeur: FiltresCentres[K]) => void;
  surReinitialiser: () => void;
  optionsCommunes: string[];
  optionsTypes: string[];
  optionsFilieres: string[];
  optionsDiplomes: string[];
  optionsStatuts: string[];
  optionsFormations?: string[];
  totalTrouves: number;
  dispositionHorizontale?: boolean;
}

export const PanneauFiltres: React.FC<PanneauFiltresProps> = ({
  filtres,
  surChangementFiltre,
  surReinitialiser,
  optionsCommunes,
  optionsTypes,
  optionsFilieres,
  optionsDiplomes,
  optionsStatuts,
  optionsFormations = [],
  totalTrouves,
  dispositionHorizontale = false,
}) => {
  const filtresActifs =
    Boolean(filtres.recherche) ||
    filtres.commune !== 'Toutes' ||
    filtres.typeFormation !== 'Tous' ||
    filtres.filiere !== 'Toutes' ||
    filtres.diplome !== 'Tous' ||
    filtres.statut !== 'Tous' ||
    (Boolean(filtres.formation) && filtres.formation !== 'Toutes');

  return (
    <div id="panneau-filtres-container" className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
      {/* En-tête des filtres avec compteur dynamique et reset */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <span
          id="compteur-etablissements"
          className="text-xs font-bold text-blue-900"
        >
          {totalTrouves === 0
            ? 'Aucun établissement trouvé'
            : totalTrouves === 1
            ? '1 établissement trouvé'
            : `${totalTrouves} établissements trouvés`}
        </span>

        {filtresActifs && (
          <button
            id="bouton-reinitialiser-filtres"
            type="button"
            onClick={surReinitialiser}
            className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Grille des filtres simultanés */}
      <div
        className={`grid gap-2.5 ${
          dispositionHorizontale
            ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-1'
        }`}
      >
        {/* 1. Commune */}
        <div className="space-y-1">
          <label htmlFor="filtre-commune" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Commune
          </label>
          <select
            id="filtre-commune"
            value={filtres.commune}
            onChange={(e) => surChangementFiltre('commune', e.target.value)}
            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-900 cursor-pointer"
          >
            <option value="Toutes">Toutes les communes</option>
            {optionsCommunes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Type */}
        <div className="space-y-1">
          <label htmlFor="filtre-type" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Type
          </label>
          <select
            id="filtre-type"
            value={filtres.typeFormation}
            onChange={(e) => surChangementFiltre('typeFormation', e.target.value)}
            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-900 cursor-pointer"
          >
            <option value="Tous">Tous les types</option>
            {optionsTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Statut */}
        <div className="space-y-1">
          <label htmlFor="filtre-statut" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Statut
          </label>
          <select
            id="filtre-statut"
            value={filtres.statut}
            onChange={(e) => surChangementFiltre('statut', e.target.value)}
            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-900 cursor-pointer"
          >
            <option value="Tous">Tous les statuts</option>
            {optionsStatuts.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Formation */}
        <div className="space-y-1">
          <label htmlFor="filtre-formation" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Formation
          </label>
          <select
            id="filtre-formation"
            value={filtres.formation || 'Toutes'}
            onChange={(e) => surChangementFiltre('formation', e.target.value)}
            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-900 cursor-pointer"
          >
            <option value="Toutes">Toutes les formations</option>
            {optionsFormations.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Filière */}
        <div className="space-y-1">
          <label htmlFor="filtre-filiere" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Filière
          </label>
          <select
            id="filtre-filiere"
            value={filtres.filiere}
            onChange={(e) => surChangementFiltre('filiere', e.target.value)}
            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-900 cursor-pointer"
          >
            <option value="Toutes">Toutes les filières</option>
            {optionsFilieres.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
