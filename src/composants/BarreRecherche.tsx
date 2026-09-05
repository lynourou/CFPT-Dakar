import React from 'react';
import { Search, X } from 'lucide-react';

interface BarreRechercheProps {
  valeur: string;
  surChangement: (nouvelleValeur: string) => void;
  surReinitialiser?: () => void;
}

export const BarreRecherche: React.FC<BarreRechercheProps> = ({
  valeur,
  surChangement,
  surReinitialiser,
}) => {
  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
        <Search className="h-4 w-4" />
      </div>
      <input
        id="barre-recherche-fpt"
        type="text"
        value={valeur}
        onChange={(e) => surChangement(e.target.value)}
        placeholder="Rechercher un centre, une formation ou une filière..."
        className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
      />
      {valeur && (
        <button
          id="bouton-effacer-recherche"
          type="button"
          onClick={() => {
            surChangement('');
            if (surReinitialiser) surReinitialiser();
          }}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          title="Effacer la recherche"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
