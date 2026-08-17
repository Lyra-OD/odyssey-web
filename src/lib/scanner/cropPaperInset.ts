/**
 * Recadrage papier Phase B — inset fixe (pas de détection 4 coins).
 * HEIC : on laisse le fichier tel quel (canvas souvent incapable).
 */
const DEFAULT_INSET = 0.08;

export async function cropPaperInset(
  file: File,
  inset = DEFAULT_INSET,
): Promise<File> {
  const mime = (file.type || "").toLowerCase();
  if (
    !mime.startsWith("image/") ||
    mime.includes("heic") ||
    mime.includes("heif")
  ) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const padX = Math.round(bitmap.width * inset);
    const padY = Math.round(bitmap.height * inset);
    const width = Math.max(1, bitmap.width - 2 * padX);
    const height = Math.max(1, bitmap.height - 2 * padY);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, padX, padY, width, height, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });
    if (!blob) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "scan";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
