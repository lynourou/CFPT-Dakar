import React from 'react';
import { MapPin, BookOpen, GraduationCap, ChevronRight, Eye, Building2 } from 'lucide-react';
import { CentreFormation } from '../types';

interface CarteCentreProps {
  centre: CentreFormation;
  estSelectionne: boolean;
  surSelectionner: (centre: CentreFormation) => void;
  surOuvrirFiche: (centre: CentreFormation) => void;
}

export const CarteCentre: React.FC<CarteCentreProps> = ({
  centre,
  estSelectionne,
  surSelectionner,
  surOuvrirFiche,
}) => {
  const estPublic = centre.type === 'Public';

  return (
    <div
      id={`carte-centre-${centre.id}`}
      onClick={() => surSelectionner(centre)}
      className={`group relative p-4 rounded-xl border transition-all cursor-pointer text-left ${
        estSelectionne
          ? 'bg-white border-blue-300 ring-2 ring-blue-500/15 shadow-sm'
          : 'bg-white border-slate-200 shadow-2xs hover:border-blue-400'
      }`}
    >
      <div className="flex justify-between items-start mb-1.5">
        <div className="flex items-center gap-1.5">
          {centre.type && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                estPublic ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
              }`}
            >
              {centre.type}
            </span>
          )}
          {centre.statut && (
            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              {centre.statut}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400 font-mono">
            #{String(centre.id).padStart(3, '0')}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              surOuvrirFiche(centre);
            }}
            title="Voir la fiche détaillée"
            className="p-1 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors ml-1"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <h3 className="font-bold text-sm text-slate-900 leading-tight group-hover:text-blue-900 transition-colors line-clamp-1">
        {centre.nom}
      </h3>

      {centre.commune && (
        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate">{centre.commune}</span>
        </p>
      )}

      {/* Grille filière et diplôme / formation */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-slate-50 p-2 rounded">
          <span className="block text-slate-400 text-[9px] uppercase font-bold tracking-wider">
            Filière
          </span>
          <span className="font-medium text-slate-800 line-clamp-1" title={centre.filiere || '-'}>
            {centre.filiere || 'Générale / Polyvalente'}
          </span>
        </div>

        <div className="bg-slate-50 p-2 rounded">
          <span className="block text-slate-400 text-[9px] uppercase font-bold tracking-wider">
            Diplôme
          </span>
          <span className="font-medium text-slate-800 line-clamp-1" title={centre.diplomes || '-'}>
            {centre.diplomes || centre.formation || 'Diplôme FPT'}
          </span>
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <span className="text-slate-400 truncate max-w-[180px]">
          {centre.formation || centre.adresse || 'Dakar, Sénégal'}
        </span>
        <span className="text-blue-600 font-semibold flex items-center shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform">
          Localiser
          <ChevronRight className="w-3 h-3 ml-0.5" />
        </span>
      </div>
    </div>
  );
};
