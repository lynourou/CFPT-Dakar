import { CentreFormation, FeatureCollectionCentres, FeatureGeoJSONCentre } from '../types';

/**
 * Convertit un tableau de centres en collection GeoJSON standard (RFC 7946).
 * Compatible avec QGIS, ArcGIS, Mapbox et les outils SIG.
 */
export function convertirEnGeoJSON(centres: CentreFormation[]): FeatureCollectionCentres {
  const features: FeatureGeoJSONCentre[] = centres.map((centre) => {
    const { latitude, longitude, ...proprietes } = centre;
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        // Standard GeoJSON: [longitude, latitude]
        coordinates: [longitude, latitude],
      },
      properties: proprietes,
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Permet de télécharger la sélection de centres sous format GeoJSON pour QGIS
 */
export function telechargerGeoJSON(centres: CentreFormation[], nomFichier: string = 'fpt_dakar_sig.geojson'): void {
  const donneesGeoJSON = convertirEnGeoJSON(centres);
  const contenu = JSON.stringify(donneesGeoJSON, null, 2);
  const blob = new Blob([contenu], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  URL.revokeObjectURL(url);
}
