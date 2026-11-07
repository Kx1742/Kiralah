/** Shrinks a photo on the phone before upload. A white background keeps QR codes scannable. */
async function compressImage(
  file: File,
  maxSide: number,
  quality: number,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", quality);
}

export const compressQrImage = (file: File) => compressImage(file, 700, 0.85);

/** Long receipts need height to stay readable; a few hundred KB on slow data. */
export const compressReceiptImage = (file: File) =>
  compressImage(file, 2000, 0.8);
