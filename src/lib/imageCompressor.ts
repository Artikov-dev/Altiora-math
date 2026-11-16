/**
 * Client-side image compressor using HTML5 Canvas.
 * Compresses 10MB+ smartphone photos down to ~300-600KB before upload,
 * ensuring lightning-fast uploads even on slow mobile connections.
 */
export async function compressImage(
  file: File,
  maxDimension: number = 1600,
  quality: number = 0.8
): Promise<File> {
  // If file is not an image or is very small (< 400KB), return as is
  if (!file.type.startsWith('image/') || file.size <= 400 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    reader.onerror = (err) => reject(err);

    img.onload = () => {
      let { width, height } = img;

      // Scale down proportionally if larger than maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // Return as a new File object
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = (err) => reject(err);

    reader.readAsDataURL(file);
  });
}
