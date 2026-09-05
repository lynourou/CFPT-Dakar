import React from 'react';
import { Building2, MapPin, Layers, Landmark, Building } from 'lucide-react';
import { StatistiquesCentres } from '../types';

interface StatistiquesProps {
  statistiques: StatistiquesCentres;
  modeAdmin?: boolean;
}

export const Statistiques: React.FC<StatistiquesProps> = ({ statistiques, modeAdmin = false }) => {
  return (
    <div
      id="section-statistiques"
      className={`grid gap-3 ${
        modeAdmin
          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
          : 'grid-cols-2 sm:grid-cols-4'
      }`}
    >
      {/* 1. Nombre total d'établissements */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-1.5 text-slate-400 mb-1">
          <Building2 className="w-3.5 h-3.5 text-blue-900" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Total établissements
          </span>
        </div>
        <p className="text-xl sm:text-2xl font-bold text-blue-900">
          {statistiques.totalCentres ?? 0}
        </p>
      </div>

      {/* 2. Établissements publics (Dashboard) */}
      {modeAdmin && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-slate-400 mb-1">
            <Landmark className="w-3.5 h-3.5 text-blue-700" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Centres publics
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-blue-800">
            {statistiques.totalPublics ?? 0}
          </p>
        </div>
      )}

      {/* 3. Établissements privés (Dashboard) */}
      {modeAdmin && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-slate-400 mb-1">
            <Building className="w-3.5 h-3.5 text-emerald-700" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Centres privés
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-800">
            {statistiques.totalPrives ?? 0}
          </p>
        </div>
      )}

      {/* 4. Communes couvertes */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-1.5 text-slate-400 mb-1">
          <MapPin className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Communes couvertes
          </span>
        </div>
        <p className="text-xl sm:text-2xl font-bold text-slate-900">
          {statistiques.totalCommunes ?? 0}
        </p>
      </div>

      {/* 5. Filières représentées */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-1.5 text-slate-400 mb-1">
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Filières représentées
          </span>
        </div>
        <p className="text-xl sm:text-2xl font-bold text-slate-900">
          {statistiques.totalFilieres ?? 0}
        </p>
      </div>
    </div>
  );
};
