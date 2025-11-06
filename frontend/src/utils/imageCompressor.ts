/**
 * Utilitaires pour compresser et redimensionner les images
 */

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compresse et redimensionne une image avec possibilité de crop
 * @param file Le fichier image à compresser
 * @param maxSize Taille maximale en bytes (défaut: 500KB pour base64)
 * @param maxWidth Largeur maximale (défaut: 400px pour avatar)
 * @param maxHeight Hauteur maximale (défaut: 400px pour avatar)
 * @param cropArea Zone à cropper (optionnel)
 * @returns Promise<string> Base64 de l'image compressée
 */
export async function compressImage(
  file: File,
  maxSize: number = 300 * 1024, // 300KB pour base64 (environ 400KB une fois encodé)
  maxWidth: number = 300,
  maxHeight: number = 300,
  cropArea?: CropArea
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Impossible de créer le contexte canvas'));
          return;
        }

        let width = img.width;
        let height = img.height;

        // Appliquer le crop si spécifié
        if (cropArea) {
          width = cropArea.width;
          height = cropArea.height;
        }

        // Redimensionner si nécessaire
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Dessiner l'image (avec crop si nécessaire)
        if (cropArea) {
          ctx.drawImage(
            img,
            cropArea.x, cropArea.y, cropArea.width, cropArea.height,
            0, 0, width, height
          );
        } else {
          ctx.drawImage(img, 0, 0, width, height);
        }

        // Compresser en essayant différentes qualités jusqu'à obtenir la taille souhaitée
        // Pour les avatars, on commence avec une qualité plus basse
        let quality = 0.6;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Si l'image est encore trop grande, réduire la qualité progressivement
        while (dataUrl.length > maxSize && quality > 0.1) {
          quality -= 0.05;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Si toujours trop grande, réduire la taille de manière plus agressive
        if (dataUrl.length > maxSize) {
          let newWidth = width * 0.7;
          let newHeight = height * 0.7;
          
          while (dataUrl.length > maxSize && newWidth > 50 && newHeight > 50) {
            canvas.width = newWidth;
            canvas.height = newHeight;
            ctx = canvas.getContext('2d')!;
            
            // Utiliser une meilleure qualité d'interpolation pour le redimensionnement
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            if (cropArea) {
              ctx.drawImage(
                img,
                cropArea.x, cropArea.y, cropArea.width, cropArea.height,
                0, 0, newWidth, newHeight
              );
            } else {
              ctx.drawImage(img, 0, 0, newWidth, newHeight);
            }
            
            // Essayer une qualité moyenne pour le nouveau redimensionnement
            dataUrl = canvas.toDataURL('image/jpeg', 0.6);
            
            // Si toujours trop grand, réduire encore
            if (dataUrl.length > maxSize) {
              newWidth *= 0.7;
              newHeight *= 0.7;
            } else {
              break;
            }
          }
        }

        resolve(dataUrl);
      };

      img.onerror = () => {
        reject(new Error('Erreur lors du chargement de l\'image'));
      };

      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };

    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Crée un aperçu de l'image pour le crop
 * @param file Le fichier image
 * @returns Promise<string> Base64 de l'image
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Impossible de créer l\'aperçu'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'));
    };
    
    reader.readAsDataURL(file);
  });
}

