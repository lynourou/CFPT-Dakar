import React, { useState, useMemo } from 'react';
import {
  Eye,
  Edit,
  Move,
  Trash2,
  Phone,
  MapPin,
  Plus,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Building2,
  GraduationCap,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns,
  Layers,
  Download,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { CentreFormation } from '../types';

type ChampTri = 'nom' | 'commune' | 'type' | 'statut' | 'filiere' | 'source' | 'updatedAt';
type SensTri = 'asc' | 'desc';

interface TableauCentresProps {
  centres: CentreFormation[];
  centreSelectionne: CentreFormation | null;
  surSelectionner: (centre: CentreFormation) => void;
  surVoir: (centre: CentreFormation) => void;
  surModifier: (centre: CentreFormation) => void;
  surDeplacer: (centre: CentreFormation) => void;
  surDemanderSuppression: (centre: CentreFormation) => void;
  surAjouter?: () => void;
  surImporter?: () => void;
  surModifierEnMasse?: (centres: CentreFormation[]) => void;
  surExporterSelection?: (centres: CentreFormation[], format: 'geojson' | 'csv') => void;
}

export const TableauCentres: React.FC<TableauCentresProps> = ({
  centres,
  centreSelectionne,
  surSelectionner,
  surVoir,
  surModifier,
  surDeplacer,
  surDemanderSuppression,
  surAjouter,
  surImporter,
  surModifierEnMasse,
  surExporterSelection,
}) => {
  const [pageCourante, setPageCourante] = useState<number>(1);
  const [lignesParPage, setLignesParPage] = useState<number>(15);

  // Sélection multiple
  const [idsSelectionnes, setIdsSelectionnes] = useState<Set<string | number>>(new Set());

  // Tri
  const [champTri, setChampTri] = useState<ChampTri>('nom');
  const [sensTri, setSensTri] = useState<SensTri>('asc');

  // Visibilité des colonnes
  const [menuColonnesOuvert, setMenuColonnesOuvert] = useState<boolean>(false);
  const [colonnes, setColonnes] = useState({
    nomOfficiel: true,
    type: true,
    statut: true,
    commune: true,
    telephone: true,
    formation: true,
    filiere: true,
    source: false,
    dateMAJ: false,
  });

  const basculerColonne = (cle: keyof typeof colonnes) => {
    setColonnes((prev) => ({ ...prev, [cle]: !prev[cle] }));
  };

  const gererClicTri = (champ: ChampTri) => {
    if (champTri === champ) {
      setSensTri((s) => (s === 'asc' ? 'desc' : 'asc'));
    } else {
      setChampTri(champ);
      setSensTri('asc');
    }
  };

  // Tri des centres
  const centresTries = useMemo(() => {
    return [...centres].sort((a, b) => {
      let valA: any = a[champTri] ?? '';
      let valB: any = b[champTri] ?? '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sensTri === 'asc' ? -1 : 1;
      if (valA > valB) return sensTri === 'asc' ? 1 : -1;
      return 0;
    });
  }, [centres, champTri, sensTri]);

  const totalPages = Math.max(1, Math.ceil(centresTries.length / lignesParPage));
  const pageAjustee = Math.min(pageCourante, totalPages);

  const centresAffiches = useMemo(() => {
    const debut = (pageAjustee - 1) * lignesParPage;
    return centresTries.slice(debut, debut + lignesParPage);
  }, [centresTries, pageAjustee, lignesParPage]);

  // Gestion de la sélection multiple
  const tousPageSelectionnes = useMemo(() => {
    if (centresAffiches.length === 0) return false;
    return centresAffiches.every((c) => idsSelectionnes.has(c.id));
  }, [centresAffiches, idsSelectionnes]);

  const basculerSelectionPage = () => {
    const nouveauxIds = new Set(idsSelectionnes);
    if (tousPageSelectionnes) {
      centresAffiches.forEach((c) => nouveauxIds.delete(c.id));
    } else {
      centresAffiches.forEach((c) => nouveauxIds.add(c.id));
    }
    setIdsSelectionnes(nouveauxIds);
  };

  const basculerSelectionLigne = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    const nouveauxIds = new Set(idsSelectionnes);
    if (nouveauxIds.has(id)) {
      nouveauxIds.delete(id);
    } else {
      nouveauxIds.add(id);
    }
    setIdsSelectionnes(nouveauxIds);
  };

  const selectionnerToutLeFiltre = () => {
    setIdsSelectionnes(new Set(centres.map((c) => c.id)));
  };

  const deselectionnerTout = () => {
    setIdsSelectionnes(new Set());
  };

  const centresSelectionnesObjets = useMemo(() => {
    return centres.filter((c) => idsSelectionnes.has(c.id));
  }, [centres, idsSelectionnes]);

  // Rendu de l'icône de tri
  const renderIconeTri = (champ: ChampTri) => {
    if (champTri !== champ) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 ml-1 inline-block" />;
    }
    return sensTri === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-blue-900 ml-1 inline-block" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-900 ml-1 inline-block" />
    );
  };

  // État vide
  if (centres.length === 0) {
    return (
      <div
        id="tableau-etat-vide"
        className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center shadow-2xs space-y-4"
      >
        <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
          <Building2 className="w-7 h-7 text-blue-900" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Aucun établissement disponible
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Ajoutez un établissement ou importez vos données pour commencer.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {surAjouter && (
            <button
              id="bouton-ajouter-centre-vide"
              type="button"
              onClick={surAjouter}
              className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>+ Ajouter un centre</span>
            </button>
          )}
          {surImporter && (
            <button
              id="bouton-importer-centre-vide"
              type="button"
              onClick={surImporter}
              className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <Upload className="w-4 h-4 mr-1.5 text-blue-900" />
              <span>Importer le GeoJSON officiel</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" id="tableau-gestion-centres-conteneur">
      {/* Barre d'actions en masse (apparaît dès qu'au moins 1 centre est coché) */}
      {idsSelectionnes.size > 0 && (
        <div
          id="barre-actions-groupes"
          className="bg-blue-950 text-white rounded-xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 shadow-md animate-fadeIn"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-bold text-white">
              {idsSelectionnes.size} établissement{idsSelectionnes.size > 1 ? 's' : ''} sélectionné
              {idsSelectionnes.size > 1 ? 's' : ''}
            </span>
            {idsSelectionnes.size < centres.length && (
              <button
                type="button"
                onClick={selectionnerToutLeFiltre}
                className="text-[11px] text-blue-300 hover:text-white underline cursor-pointer ml-1"
              >
                (Sélectionner les {centres.length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {surModifierEnMasse && (
              <button
                type="button"
                onClick={() => surModifierEnMasse(centresSelectionnesObjets)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer shadow-2xs"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Modifier en masse</span>
              </button>
            )}

            {surExporterSelection && (
              <>
                <button
                  type="button"
                  onClick={() => surExporterSelection(centresSelectionnesObjets, 'geojson')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                  title="Exporter la sélection en GeoJSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>GeoJSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => surExporterSelection(centresSelectionnesObjets, 'csv')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                  title="Exporter la sélection en CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={deselectionnerTout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Désélectionner tout"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Barre de configuration d'affichage (Colonnes, info tri) */}
      <div className="flex items-center justify-between gap-3 text-xs text-slate-500 px-1">
        <div className="flex items-center gap-2">
          <span>
            Affichage de <strong>{centresAffiches.length}</strong> sur{' '}
            <strong>{centres.length}</strong> établissements
          </span>
          <span className="text-slate-300">|</span>
          <span className="hidden sm:inline">
            Trié par <strong className="text-slate-700">{champTri}</strong> (
            {sensTri === 'asc' ? 'croissant' : 'décroissant'})
          </span>
        </div>

        {/* Bouton pour afficher/masquer les colonnes */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuColonnesOuvert(!menuColonnesOuvert)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors cursor-pointer"
          >
            <Columns className="w-3.5 h-3.5 text-blue-900" />
            <span>Colonnes</span>
          </button>

          {menuColonnesOuvert && (
            <div
              className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 z-30 space-y-1.5 text-xs animate-fadeIn"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 mb-1">
                Colonnes visibles
              </div>
              {[
                { cle: 'nomOfficiel', label: 'Nom officiel' },
                { cle: 'type', label: 'Type' },
                { cle: 'statut', label: 'Statut' },
                { cle: 'commune', label: 'Commune' },
                { cle: 'telephone', label: 'Téléphone' },
                { cle: 'formation', label: 'Formation' },
                { cle: 'filiere', label: 'Filière' },
                { cle: 'source', label: 'Source' },
                { cle: 'dateMAJ', label: 'Dernière MAJ' },
              ].map((col) => (
                <label
                  key={col.cle}
                  className="flex items-center gap-2 cursor-pointer select-none text-slate-700 hover:text-slate-900 py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={colonnes[col.cle as keyof typeof colonnes]}
                    onChange={() => basculerColonne(col.cle as keyof typeof colonnes)}
                    className="rounded text-blue-900 focus:ring-blue-900 w-3.5 h-3.5"
                  />
                  <span>{col.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 1. Tableau version Desktop / Tablette */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[11px]">
                {/* Case à cocher "Tout sélectionner" */}
                <th className="py-3 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={tousPageSelectionnes}
                    onChange={basculerSelectionPage}
                    className="rounded text-blue-900 focus:ring-blue-900 w-3.5 h-3.5 cursor-pointer"
                    title="Sélectionner la page"
                  />
                </th>

                {/* Nom avec Tri */}
                <th
                  className="py-3 px-3.5 cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
                  onClick={() => gererClicTri('nom')}
                >
                  <div className="flex items-center">
                    <span>Nom</span>
                    {renderIconeTri('nom')}
                  </div>
                </th>

                {colonnes.nomOfficiel && <th className="py-3 px-3">Nom officiel</th>}

                {colonnes.type && (
                  <th
                    className="py-3 px-2.5 cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
                    onClick={() => gererClicTri('type')}
                  >
                    <div className="flex items-center">
                      <span>Type</span>
                      {renderIconeTri('type')}
                    </div>
                  </th>
                )}

                {colonnes.statut && (
                  <th
                    className="py-3 px-2.5 cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
                    onClick={() => gererClicTri('statut')}
                  >
                    <div className="flex items-center">
                      <span>Statut</span>
                      {renderIconeTri('statut')}
                    </div>
                  </th>
                )}

                {colonnes.commune && (
                  <th
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
                    onClick={() => gererClicTri('commune')}
                  >
                    <div className="flex items-center">
                      <span>Commune</span>
                      {renderIconeTri('commune')}
                    </div>
                  </th>
                )}

                {colonnes.telephone && <th className="py-3 px-3">Téléphone</th>}
                {colonnes.formation && <th className="py-3 px-3">Formation</th>}

                {colonnes.filiere && (
                  <th
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
                    onClick={() => gererClicTri('filiere')}
                  >
                    <div className="flex items-center">
                      <span>Filière</span>
                      {renderIconeTri('filiere')}
                    </div>
                  </th>
                )}

                {colonnes.source && (
                  <th
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
                    onClick={() => gererClicTri('source')}
                  >
                    <div className="flex items-center">
                      <span>Source</span>
                      {renderIconeTri('source')}
                    </div>
                  </th>
                )}

                {colonnes.dateMAJ && (
                  <th
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
                    onClick={() => gererClicTri('updatedAt')}
                  >
                    <div className="flex items-center">
                      <span>Mise à jour</span>
                      {renderIconeTri('updatedAt')}
                    </div>
                  </th>
                )}

                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {centresAffiches.map((centre) => {
                const estSelectionneLigne = centreSelectionne?.id === centre.id;
                const estCoche = idsSelectionnes.has(centre.id);

                return (
                  <tr
                    key={centre.id}
                    id={`ligne-centre-${centre.id}`}
                    onClick={() => surSelectionner(centre)}
                    className={`transition-colors cursor-pointer group ${
                      estSelectionneLigne
                        ? 'bg-blue-50/80 hover:bg-blue-50 text-blue-950 font-medium'
                        : estCoche
                        ? 'bg-blue-50/40 hover:bg-blue-50/60'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Case à cocher par ligne */}
                    <td
                      className="py-2.5 px-3 text-center"
                      onClick={(e) => basculerSelectionLigne(centre.id, e)}
                    >
                      <input
                        type="checkbox"
                        checked={estCoche}
                        onChange={() => {}}
                        className="rounded text-blue-900 focus:ring-blue-900 w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>

                    {/* Nom */}
                    <td className="py-2.5 px-3.5 max-w-[200px]">
                      <div className="font-semibold text-slate-900 truncate" title={centre.nom}>
                        {centre.nom || <span className="text-slate-400 italic">Non renseigné</span>}
                      </div>
                    </td>

                    {/* Nom officiel */}
                    {colonnes.nomOfficiel && (
                      <td className="py-2.5 px-3 max-w-[180px]">
                        <div className="truncate text-slate-600" title={centre.nom_officiel || ''}>
                          {centre.nom_officiel || (
                            <span className="text-slate-400 italic">Non renseigné</span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Type */}
                    {colonnes.type && (
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        {centre.type ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              centre.type.toLowerCase().includes('public')
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {centre.type}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Non renseigné</span>
                        )}
                      </td>
                    )}

                    {/* Statut */}
                    {colonnes.statut && (
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        {centre.statut ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                            {centre.statut}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Non renseigné</span>
                        )}
                      </td>
                    )}

                    {/* Commune */}
                    {colonnes.commune && (
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-700">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[120px]">
                            {centre.commune || (
                              <span className="text-slate-400 italic">Non renseigné</span>
                            )}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Téléphone */}
                    {colonnes.telephone && (
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                        {centre.telephone ? (
                          <span className="text-slate-700">{centre.telephone}</span>
                        ) : (
                          <span className="text-slate-400 italic">Non renseigné</span>
                        )}
                      </td>
                    )}

                    {/* Formation */}
                    {colonnes.formation && (
                      <td className="py-2.5 px-3 max-w-[150px]">
                        <div className="truncate text-slate-600" title={centre.formation || ''}>
                          {centre.formation || (
                            <span className="text-slate-400 italic">Non renseigné</span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Filière */}
                    {colonnes.filiere && (
                      <td className="py-2.5 px-3 max-w-[160px]">
                        <div className="truncate text-slate-600" title={centre.filiere || ''}>
                          {centre.filiere || (
                            <span className="text-slate-400 italic">Non renseigné</span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Source */}
                    {colonnes.source && (
                      <td className="py-2.5 px-3 max-w-[120px]">
                        <div className="truncate text-slate-500 text-[11px]" title={centre.source || ''}>
                          {centre.source || <span className="text-slate-400 italic">—</span>}
                        </div>
                      </td>
                    )}

                    {/* Date MAJ */}
                    {colonnes.dateMAJ && (
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[10px]">
                        {centre.updatedAt
                          ? new Date(centre.updatedAt).toLocaleDateString('fr-FR')
                          : '—'}
                      </td>
                    )}

                    {/* Actions */}
                    <td
                      className="py-2.5 px-3 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          id={`action-voir-${centre.id}`}
                          type="button"
                          onClick={() => surVoir(centre)}
                          title="Voir la fiche détaillée"
                          className="p-1.5 rounded-md text-slate-500 hover:text-blue-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`action-modifier-${centre.id}`}
                          type="button"
                          onClick={() => surModifier(centre)}
                          title="Modifier les informations"
                          className="p-1.5 rounded-md text-slate-500 hover:text-blue-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`action-deplacer-${centre.id}`}
                          type="button"
                          onClick={() => surDeplacer(centre)}
                          title="Déplacer sur la carte"
                          className="p-1.5 rounded-md text-slate-500 hover:text-amber-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Move className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`action-supprimer-${centre.id}`}
                          type="button"
                          onClick={() => surDemanderSuppression(centre)}
                          title="Supprimer l'établissement"
                          className="p-1.5 rounded-md text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Version Mobile : Cartes compactes avec toutes les actions */}
      <div className="md:hidden space-y-2.5">
        {centresAffiches.map((centre) => {
          const estSelectionne = centreSelectionne?.id === centre.id;
          const estCoche = idsSelectionnes.has(centre.id);

          return (
            <div
              key={centre.id}
              id={`carte-mobile-centre-${centre.id}`}
              onClick={() => surSelectionner(centre)}
              className={`bg-white rounded-xl border p-3.5 space-y-2.5 transition-all shadow-2xs cursor-pointer ${
                estSelectionne
                  ? 'border-blue-500 ring-1 ring-blue-400 bg-blue-50/40'
                  : estCoche
                  ? 'border-blue-300 bg-blue-50/30'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={estCoche}
                    onChange={(e) => basculerSelectionLigne(centre.id, e as any)}
                    className="mt-1 rounded text-blue-900 focus:ring-blue-900 w-3.5 h-3.5"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 leading-tight truncate">
                      {centre.nom}
                    </h4>
                    {centre.nom_officiel && centre.nom_officiel !== centre.nom && (
                      <p className="text-xs text-slate-500 italic truncate mt-0.5">
                        {centre.nom_officiel}
                      </p>
                    )}
                  </div>
                </div>

                {centre.type && (
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      centre.type.toLowerCase().includes('public')
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {centre.type}
                  </span>
                )}
              </div>

              {/* Détails compacts */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-0.5 border-t border-slate-100">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{centre.commune || 'Commune non renseignée'}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{centre.telephone || 'Non renseigné'}</span>
                </div>
                {centre.formation && (
                  <div className="col-span-2 flex items-center gap-1.5 truncate text-[11px] text-slate-500">
                    <GraduationCap className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{centre.formation}</span>
                  </div>
                )}
                {centre.filiere && (
                  <div className="col-span-2 truncate text-[11px] text-blue-900 font-medium">
                    Filière : {centre.filiere}
                  </div>
                )}
              </div>

              {/* Boutons d'actions mobile */}
              <div
                className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => surVoir(centre)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3 h-3 text-slate-600" />
                  <span>Voir</span>
                </button>
                <button
                  type="button"
                  onClick={() => surModifier(centre)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <Edit className="w-3 h-3 text-blue-700" />
                  <span>Modifier</span>
                </button>
                <button
                  type="button"
                  onClick={() => surDeplacer(centre)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <Move className="w-3 h-3 text-amber-700" />
                  <span>Déplacer</span>
                </button>
                <button
                  type="button"
                  onClick={() => surDemanderSuppression(centre)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3 text-red-600" />
                  <span>Supprimer</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Contrôles de pagination */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shadow-2xs">
        <div className="flex items-center gap-2">
          <span>Afficher</span>
          <select
            id="select-lignes-par-page"
            value={lignesParPage}
            onChange={(e) => {
              setLignesParPage(Number(e.target.value));
              setPageCourante(1);
            }}
            aria-label="Nombre d'établissements par page"
            className="border border-slate-300 rounded-md px-2 py-1 text-xs font-semibold text-slate-700 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-900 cursor-pointer"
          >
            <option value={10}>10 par page</option>
            <option value={15}>15 par page</option>
            <option value={25}>25 par page</option>
            <option value={50}>50 par page</option>
          </select>
          <span className="text-slate-400">|</span>
          <span>
            Total : <strong className="text-slate-900">{centres.length}</strong> établissement
            {centres.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <span className="mr-2 text-slate-500">
            Page <strong>{pageAjustee}</strong> sur <strong>{totalPages}</strong>
          </span>

          <button
            type="button"
            onClick={() => setPageCourante(1)}
            disabled={pageAjustee <= 1}
            aria-label="Première page"
            title="Première page"
            className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setPageCourante((p) => Math.max(1, p - 1))}
            disabled={pageAjustee <= 1}
            aria-label="Page précédente"
            title="Page précédente"
            className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setPageCourante((p) => Math.min(totalPages, p + 1))}
            disabled={pageAjustee >= totalPages}
            aria-label="Page suivante"
            title="Page suivante"
            className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setPageCourante(totalPages)}
            disabled={pageAjustee >= totalPages}
            aria-label="Dernière page"
            title="Dernière page"
            className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
