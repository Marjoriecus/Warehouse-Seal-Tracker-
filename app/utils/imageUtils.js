/**
 * Compresses an image file using HTML5 Canvas
 * @param {File} file - The original image file
 * @returns {Promise<Blob>} - The compressed image as a Blob
 */
export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          
          // Only scale down if the image is wider than MAX_WIDTH
          let scaleSize = 1;
          if (img.width > MAX_WIDTH) {
            scaleSize = MAX_WIDTH / img.width;
          }
          
          canvas.width = img.width * scaleSize;
          canvas.height = img.height * scaleSize;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas compression failed"));
          }, 'image/jpeg', 0.6); // 0.6 provides a better balance of quality to file size
        } catch (err) {
          reject(new Error("Browser ran out of memory processing image"));
        }
      };

      // CRITICAL FIX: If the image is too heavy and crashes the browser's memory, reject it immediately!
      img.onerror = () => reject(new Error("Failed to load image into memory"));
    };
    
    reader.onerror = (err) => reject(new Error("Failed to read file: " + err.message));
  });
};