import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Téléverse une photo d'établissement dans Firebase Storage
 * et retourne l'URL publique de téléchargement.
 */
export async function televerserPhotoCentre(
  centreId: number | string,
  fichier: File
): Promise<string> {
  try {
    const extension = fichier.name.split('.').pop() || 'jpg';
    const nomFichier = `centres/${String(centreId)}_${Date.now()}.${extension}`;
    const referenceStockage = ref(storage, nomFichier);

    const snapshot = await uploadBytes(referenceStockage, fichier, {
      contentType: fichier.type,
    });

    const urlTelechargement = await getDownloadURL(snapshot.ref);
    return urlTelechargement;
  } catch (erreur) {
    console.error('Erreur lors du téléversement de la photo :', erreur);
    throw new Error('Impossible de téléverser la photo sur Firebase Storage.');
  }
}
