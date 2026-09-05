import React from 'react';
import { CentreFormation } from '../types';

interface FenetreCentreProps {
  centre: CentreFormation;
  surOuvrirFiche: (centre: CentreFormation) => void;
}

export const FenetreCentre: React.FC<FenetreCentreProps> = ({ centre, surOuvrirFiche }) => {
  const estPublic = centre.type === 'Public';

  return (
    <div className="p-3 text-slate-800 text-xs">
      <div className="border-b border-slate-100 pb-2 mb-2">
        <span
          className={`inline-block px-1.5 py-0.5 mb-1 text-[10px] font-bold rounded uppercase tracking-wider ${
            estPublic ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {centre.type || 'FPT'}
        </span>
        <h4 className="font-bold text-sm text-blue-900 leading-snug">{centre.nom}</h4>
        {centre.commune && (
          <p className="text-slate-500 text-[11px] font-medium mt-0.5">{centre.commune}</p>
        )}
      </div>

      <div className="space-y-1 text-slate-600 mb-3">
        {centre.formation && (
          <p>
            <strong className="text-slate-700">Formation :</strong> {centre.formation}
          </p>
        )}
        {centre.filiere && (
          <p>
            <strong className="text-slate-700">Filière :</strong> {centre.filiere}
          </p>
        )}
        {centre.diplomes && (
          <p>
            <strong className="text-slate-700">Diplômes :</strong> {centre.diplomes}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => surOuvrirFiche(centre)}
        className="w-full py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-xs text-center transition-colors shadow-2xs cursor-pointer"
      >
        Voir la fiche
      </button>
    </div>
  );
};

/**
 * Génère le balisage HTML propre pour les infobulles / popups Leaflet
 */
export function genererHtmlPopupLeaflet(centre: CentreFormation): string {
  const echapper = (str?: string) => {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const estPublic = centre.type === 'Public';
  const badgeClass = estPublic
    ? 'bg-blue-100 text-blue-700'
    : 'bg-green-100 text-green-700';

  return `
    <div class="p-3 font-sans text-xs text-slate-800">
      <div class="border-b border-slate-100 pb-2 mb-2">
        <span class="inline-block px-1.5 py-0.5 mb-1 text-[10px] font-bold rounded uppercase tracking-wider ${badgeClass}">
          ${echapper(centre.type || 'FPT')}
        </span>
        <h4 class="font-bold text-sm text-blue-900 leading-snug">${echapper(centre.nom)}</h4>
        ${
          centre.commune
            ? `<p class="text-slate-500 font-medium text-[11px] mt-0.5">${echapper(centre.commune)}</p>`
            : ''
        }
      </div>

      <div class="space-y-1 text-slate-600 mb-3 leading-relaxed">
        ${
          centre.formation
            ? `<div><strong class="text-slate-700">Formation :</strong> ${echapper(centre.formation)}</div>`
            : ''
        }
        ${
          centre.filiere
            ? `<div><strong class="text-slate-700">Filière :</strong> ${echapper(centre.filiere)}</div>`
            : ''
        }
        ${
          centre.diplomes
            ? `<div><strong class="text-slate-700">Diplômes :</strong> ${echapper(centre.diplomes)}</div>`
            : ''
        }
      </div>

      <button
        id="btn-popup-fiche-${centre.id}"
        data-centre-id="${centre.id}"
        class="btn-action-voir-fiche w-full py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-xs text-center transition-colors cursor-pointer shadow-2xs"
      >
        Voir la fiche
      </button>
    </div>
  `;
}
