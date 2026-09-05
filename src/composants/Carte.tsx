import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Locate, Maximize2, Compass, MapPin, Check, X, Move, Target } from 'lucide-react';
import { CentreFormation } from '../types';
import { genererHtmlPopupLeaflet } from './FenetreCentre';

interface CarteProps {
  centres: CentreFormation[];
  centreSelectionne: CentreFormation | null;
  surSelectionnerCentre: (centre: CentreFormation) => void;
  surOuvrirFiche: (centre: CentreFormation) => void;

  // Mode "Placer sur la carte" (ajout)
  modePlacementActif?: boolean;
  surPositionPlacee?: (position: { latitude: number; longitude: number }) => void;
  surAnnulerPlacement?: () => void;

  // Mode "Déplacer sur la carte" (édition)
  centreEnDeplacement?: CentreFormation | null;
  surValiderDeplacement?: (centre: CentreFormation, nouvelleLat: number, nouvelleLng: number) => void;
  surAnnulerDeplacement?: () => void;
}

// Coordonnées par défaut du Grand Dakar
const COORDONNEES_DAKAR: [number, number] = [14.72, -17.38];
const ZOOM_DEFAUT = 11.5;

export const Carte: React.FC<CarteProps> = ({
  centres,
  centreSelectionne,
  surSelectionnerCentre,
  surOuvrirFiche,
  modePlacementActif = false,
  surPositionPlacee,
  surAnnulerPlacement,
  centreEnDeplacement = null,
  surValiderDeplacement,
  surAnnulerDeplacement,
}) => {
  const conteneurCarteRef = useRef<HTMLDivElement>(null);
  const carteRef = useRef<L.Map | null>(null);
  const groupeMarqueursRef = useRef<L.FeatureGroup | null>(null);
  const marqueurProvisoireRef = useRef<L.Marker | null>(null);
  const mapMarqueursParId = useRef<Map<string, L.Marker>>(new Map());

  const [geolocalisationActive, setGeolocalisationActive] = useState(false);
  const [messageErreurGeo, setMessageErreurGeo] = useState<string | null>(null);

  // Position temporaire sélectionnée lors du placement ou déplacement
  const [positionSelectionnee, setPositionSelectionnee] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Initialisation de la carte Leaflet
  useEffect(() => {
    if (!conteneurCarteRef.current || carteRef.current) return;

    const carte = L.map(conteneurCarteRef.current, {
      center: COORDONNEES_DAKAR,
      zoom: ZOOM_DEFAUT,
      zoomControl: false,
    });

    // Fond de plan cartographique OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributeurs | CEDT Le G15',
      maxZoom: 19,
      minZoom: 9,
    }).addTo(carte);

    // Contrôles de zoom
    L.control
      .zoom({
        position: 'bottomright',
        zoomInTitle: 'Agrandir la carte',
        zoomOutTitle: 'Réduire la carte',
      })
      .addTo(carte);

    // Groupe pour les marqueurs des centres
    const groupeMarqueurs = L.featureGroup().addTo(carte);
    groupeMarqueursRef.current = groupeMarqueurs;
    carteRef.current = carte;

    // Redimensionnement automatique
    const resizeObserver = new ResizeObserver(() => {
      carte.invalidateSize();
    });
    resizeObserver.observe(conteneurCarteRef.current);

    // Délégation d'événement pour les boutons de popup "Voir la fiche"
    const conteneurEl = conteneurCarteRef.current;
    const gererClicPopup = (e: MouseEvent) => {
      const cible = (e.target as HTMLElement).closest('.btn-action-voir-fiche');
      if (cible) {
        const centreId = cible.getAttribute('data-centre-id');
        if (centreId) {
          const centreTrouve = centres.find((c) => String(c.id) === String(centreId));
          if (centreTrouve) {
            surOuvrirFiche(centreTrouve);
          }
        }
      }
    };
    conteneurEl.addEventListener('click', gererClicPopup);

    return () => {
      conteneurEl.removeEventListener('click', gererClicPopup);
      resizeObserver.disconnect();
      carte.remove();
      carteRef.current = null;
    };
  }, []);

  // Gestion des clics sur la carte en mode placement ou déplacement
  useEffect(() => {
    const carte = carteRef.current;
    if (!carte) return;

    const gererClicCarte = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      if (modePlacementActif || centreEnDeplacement) {
        setPositionSelectionnee({ latitude: lat, longitude: lng });

        // Marqueur temporaire visuel
        if (marqueurProvisoireRef.current) {
          marqueurProvisoireRef.current.setLatLng([lat, lng]);
        } else {
          const iconeProvisoire = L.divIcon({
            className: 'marqueur-temporaire',
            html: `
              <div style="
                width: 38px;
                height: 38px;
                border-radius: 50% 50% 50% 0;
                background: #ea580c;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 14px rgba(234, 88, 12, 0.45);
                border: 3px solid white;
                animation: bounce 0.6s ease infinite alternate;
              ">
                <div style="width: 10px; height: 10px; border-radius: 50%; background: white;"></div>
              </div>
            `,
            iconSize: [38, 38],
            iconAnchor: [19, 38],
          });

          const marqueur = L.marker([lat, lng], {
            icon: iconeProvisoire,
            draggable: true,
          }).addTo(carte);

          marqueur.on('dragend', (evt) => {
            const pos = evt.target.getLatLng();
            setPositionSelectionnee({ latitude: pos.lat, longitude: pos.lng });
          });

          marqueurProvisoireRef.current = marqueur;
        }
      }
    };

    carte.on('click', gererClicCarte);

    return () => {
      carte.off('click', gererClicCarte);
    };
  }, [modePlacementActif, centreEnDeplacement]);

  // Nettoyage du marqueur provisoire quand on quitte les modes placement/déplacement
  useEffect(() => {
    if (!modePlacementActif && !centreEnDeplacement) {
      if (marqueurProvisoireRef.current && carteRef.current) {
        carteRef.current.removeLayer(marqueurProvisoireRef.current);
        marqueurProvisoireRef.current = null;
      }
      setPositionSelectionnee(null);
    } else if (centreEnDeplacement && carteRef.current) {
      // Centrer sur le centre à déplacer
      carteRef.current.flyTo([centreEnDeplacement.latitude, centreEnDeplacement.longitude], 16);
      setPositionSelectionnee({
        latitude: centreEnDeplacement.latitude,
        longitude: centreEnDeplacement.longitude,
      });

      // Créer le marqueur provisoire déplaçable à la position actuelle
      if (marqueurProvisoireRef.current) {
        carteRef.current.removeLayer(marqueurProvisoireRef.current);
      }
      const iconeDeplacement = L.divIcon({
        className: 'marqueur-deplacement',
        html: `
          <div style="
            width: 40px;
            height: 40px;
            border-radius: 50% 50% 50% 0;
            background: #d97706;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(217, 119, 6, 0.45);
            border: 3px solid white;
          ">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: white;"></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      const marqueur = L.marker([centreEnDeplacement.latitude, centreEnDeplacement.longitude], {
        icon: iconeDeplacement,
        draggable: true,
      }).addTo(carteRef.current);

      marqueur.on('dragend', (evt) => {
        const pos = evt.target.getLatLng();
        setPositionSelectionnee({ latitude: pos.lat, longitude: pos.lng });
      });

      marqueurProvisoireRef.current = marqueur;
    }
  }, [modePlacementActif, centreEnDeplacement]);

  // Générateur d'icône Leaflet
  const creerIconeMarqueur = (centre: CentreFormation, estActif: boolean) => {
    const estPublic = centre.type === 'Public';
    const couleurFond = estActif ? '#1e3a8a' : estPublic ? '#1d4ed8' : '#16a34a';
    const taille = estActif ? 36 : 28;

    const html = `
      <div style="
        width: ${taille}px;
        height: ${taille}px;
        border-radius: 50% 50% 50% 0;
        background: ${couleurFond};
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(15,23,42,0.25);
        border: 2px solid white;
        transition: all 0.2s ease;
      ">
        <div style="
          width: ${estActif ? '10px' : '7px'};
          height: ${estActif ? '10px' : '7px'};
          border-radius: 50%;
          background: white;
          transform: rotate(45deg);
        "></div>
      </div>
    `;

    return L.divIcon({
      className: 'marqueur-etablissement-custom',
      html: html,
      iconSize: [taille, taille],
      iconAnchor: [taille / 2, taille],
      popupAnchor: [0, -taille],
    });
  };

  // Mise à jour des marqueurs quand la liste change
  useEffect(() => {
    const carte = carteRef.current;
    const groupeMarqueurs = groupeMarqueursRef.current;
    if (!carte || !groupeMarqueurs) return;

    groupeMarqueurs.clearLayers();
    mapMarqueursParId.current.clear();

    centres.forEach((centre) => {
      // Si ce centre est en cours de déplacement, on ne trace pas son ancien marqueur
      if (centreEnDeplacement && String(centre.id) === String(centreEnDeplacement.id)) {
        return;
      }

      const estActif = centreSelectionne && String(centreSelectionne.id) === String(centre.id);
      const icone = creerIconeMarqueur(centre, Boolean(estActif));

      const marqueur = L.marker([centre.latitude, centre.longitude], {
        icon: icone,
        title: centre.nom,
      });

      const popupContenu = genererHtmlPopupLeaflet(centre);
      marqueur.bindPopup(popupContenu, {
        className: 'custom-popup',
        maxWidth: 300,
        autoPanPadding: [30, 30],
      });

      marqueur.on('click', () => {
        surSelectionnerCentre(centre);
      });

      marqueur.addTo(groupeMarqueurs);
      mapMarqueursParId.current.set(String(centre.id), marqueur);
    });
  }, [centres, centreEnDeplacement, centreSelectionne]);

  // Réaction au centre sélectionné
  useEffect(() => {
    const carte = carteRef.current;
    if (!carte || !centreSelectionne || centreEnDeplacement || modePlacementActif) return;

    carte.flyTo([centreSelectionne.latitude, centreSelectionne.longitude], 15, {
      duration: 1.2,
      easeLinearity: 0.25,
    });

    const marqueur = mapMarqueursParId.current.get(String(centreSelectionne.id));
    if (marqueur) {
      setTimeout(() => {
        marqueur.openPopup();
      }, 350);
    }
  }, [centreSelectionne]);

  // Recentrage
  const recentrerSurDakar = () => {
    const carte = carteRef.current;
    if (!carte) return;
    carte.flyTo(COORDONNEES_DAKAR, ZOOM_DEFAUT, { duration: 1 });
  };

  // Ajuster l'emprise sur l'ensemble des centres affichés
  const ajusterEmpriseCentres = () => {
    const carte = carteRef.current;
    const groupe = groupeMarqueursRef.current;
    if (!carte || !groupe || centres.length === 0) {
      recentrerSurDakar();
      return;
    }
    const bounds = groupe.getBounds();
    if (bounds.isValid()) {
      carte.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else {
      recentrerSurDakar();
    }
  };

  // Géolocalisation
  const geolocaliserUtilisateur = () => {
    const carte = carteRef.current;
    if (!carte || !navigator.geolocation) {
      setMessageErreurGeo("La géolocalisation n'est pas disponible sur votre navigateur.");
      return;
    }

    setGeolocalisationActive(true);
    setMessageErreurGeo(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeolocalisationActive(false);
        const { latitude, longitude } = position.coords;
        carte.flyTo([latitude, longitude], 14, { duration: 1.2 });

        const iconePosition = L.divIcon({
          className: 'marqueur-utilisateur',
          html: `
            <div style="
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #2563eb;
              border: 3px solid white;
              box-shadow: 0 0 0 6px rgba(37,99,235,0.3);
            "></div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const marqueurUtilisateur = L.marker([latitude, longitude], { icon: iconePosition })
          .addTo(carte)
          .bindPopup('<div class="p-2 text-xs font-semibold">📍 Vous êtes ici</div>')
          .openPopup();

        setTimeout(() => {
          marqueurUtilisateur.closePopup();
        }, 3000);
      },
      () => {
        setGeolocalisationActive(false);
        setMessageErreurGeo("Impossible d'obtenir votre position géographique.");
        setTimeout(() => setMessageErreurGeo(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div
      id="carte-fpt-dakar-wrapper"
      className="relative w-full h-full min-h-[360px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-2xs"
    >
      {/* BANNIÈRE DE MODE INTERACTIF (PLACEMENT OU DÉPLACEMENT DE MARQUEUR) */}
      {modePlacementActif && (
        <div className="absolute top-4 left-4 right-16 z-30 bg-blue-900 text-white p-3 rounded-xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-blue-700 animate-fadeIn">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-400 shrink-0 animate-bounce" />
            <div>
              <p className="text-xs font-bold">Mode placement actif</p>
              <p className="text-[11px] text-blue-200">
                {positionSelectionnee
                  ? `Position : ${positionSelectionnee.latitude.toFixed(5)}° N, ${positionSelectionnee.longitude.toFixed(5)}° O (Glissez ou cliquez)`
                  : 'Cliquez n’importe où sur la carte pour positionner le centre'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {surAnnulerPlacement && (
              <button
                type="button"
                onClick={surAnnulerPlacement}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                Annuler
              </button>
            )}

            {positionSelectionnee && surPositionPlacee && (
              <button
                type="button"
                onClick={() => surPositionPlacee(positionSelectionnee)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Valider la position</span>
              </button>
            )}
          </div>
        </div>
      )}

      {centreEnDeplacement && (
        <div className="absolute top-4 left-4 right-16 z-30 bg-slate-900 text-white p-3 rounded-xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-amber-600 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Move className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold">
                Déplacement de : {centreEnDeplacement.nom}
              </p>
              <p className="text-[11px] text-slate-300">
                {positionSelectionnee
                  ? `Nouvelle position : ${positionSelectionnee.latitude.toFixed(5)}° N, ${positionSelectionnee.longitude.toFixed(5)}° O`
                  : 'Cliquez ou déplacez le marqueur pour définir la nouvelle position'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {surAnnulerDeplacement && (
              <button
                type="button"
                onClick={surAnnulerDeplacement}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                Annuler
              </button>
            )}

            {positionSelectionnee && surValiderDeplacement && (
              <button
                type="button"
                onClick={() =>
                  surValiderDeplacement(
                    centreEnDeplacement,
                    positionSelectionnee.latitude,
                    positionSelectionnee.longitude
                  )
                }
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Enregistrer la position</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Conteneur DOM Leaflet */}
      <div
        id="conteneur-carte-leaflet"
        ref={conteneurCarteRef}
        className="w-full h-full"
        style={{ minHeight: '100%' }}
      />

      {/* Barre d'outils cartographiques flottante en haut à droite */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => carteRef.current?.zoomIn()}
          title="Agrandir la carte"
          className="w-9 h-9 bg-white rounded-lg shadow-md border border-slate-200 flex items-center justify-center font-bold text-base text-slate-700 hover:bg-slate-50 hover:text-blue-900 transition-colors cursor-pointer"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => carteRef.current?.zoomOut()}
          title="Réduire la carte"
          className="w-9 h-9 bg-white rounded-lg shadow-md border border-slate-200 flex items-center justify-center font-bold text-base text-slate-700 hover:bg-slate-50 hover:text-blue-900 transition-colors cursor-pointer"
        >
          -
        </button>

        <button
          id="bouton-ajuster-emprise"
          type="button"
          onClick={ajusterEmpriseCentres}
          title="Ajuster l'emprise aux établissements filtrés"
          className="w-9 h-9 bg-white rounded-lg shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-blue-900 transition-colors cursor-pointer"
        >
          <Target className="w-4 h-4" />
        </button>

        <button
          id="bouton-recentrer-dakar"
          type="button"
          onClick={recentrerSurDakar}
          title="Recentrer sur la région de Dakar"
          className="w-9 h-9 bg-white rounded-lg shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-blue-900 transition-colors cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          id="bouton-ma-position"
          type="button"
          onClick={geolocaliserUtilisateur}
          disabled={geolocalisationActive}
          title="Trouver ma position à Dakar"
          className={`w-9 h-9 bg-white rounded-lg shadow-md border border-slate-200 flex items-center justify-center transition-colors cursor-pointer ${
            geolocalisationActive ? 'text-blue-600 animate-spin' : 'text-slate-700 hover:bg-slate-50 hover:text-blue-900'
          }`}
        >
          <Locate className="w-4 h-4" />
        </button>
      </div>

      {/* Pilule de statistiques flottante centrale */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-full shadow-lg border border-slate-200/90 hidden sm:flex items-center gap-5 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-blue-900">{centres.length}</span>
          <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider leading-none">
            Centres<br />Visibles
          </span>
        </div>
        <div className="h-6 w-[1px] bg-slate-200" />
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-blue-900">
            {new Set(centres.map((c) => c.commune).filter(Boolean)).size}
          </span>
          <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider leading-none">
            Communes<br />Couvertes
          </span>
        </div>
        <div className="h-6 w-[1px] bg-slate-200" />
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-blue-900">
            {new Set(centres.map((c) => c.filiere).filter(Boolean)).size}
          </span>
          <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider leading-none">
            Filières<br />FPT
          </span>
        </div>
      </div>

      {/* Légende cartographique flottante */}
      <div className="absolute bottom-6 left-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-md border border-slate-200 text-[11px] text-slate-700 space-y-1.5 hidden md:block">
        <div className="font-bold text-blue-900 flex items-center gap-1.5 border-b border-slate-100 pb-1">
          <Compass className="w-3.5 h-3.5 text-blue-900" />
          Légende FPT
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-700 inline-block"></span>
          <span>Établissement Public</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block"></span>
          <span>Établissement Privé</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-900 inline-block ring-2 ring-blue-300"></span>
          <span>Établissement Sélectionné</span>
        </div>
      </div>

      {messageErreurGeo && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-slate-900 text-white text-xs px-4 py-2 rounded-xl shadow-lg animate-fadeIn">
          {messageErreurGeo}
        </div>
      )}
    </div>
  );
};
