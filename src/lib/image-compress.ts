// Reduz a foto no próprio aparelho antes de enviar: lado maior com até
// 1600 px, JPEG ~80%. Uma foto de celular de 3–5 MB vira ~300–500 KB —
// envio rápido no campo e dentro do limite por requisição da hospedagem.
// A orientação EXIF é aplicada (foto "deitada" do iPhone fica em pé).

const MAX_SIDE = 1600;
const QUALITY = 0.8;

export type CompressedImage = { blob: Blob; width: number; height: number };

export async function compressImage(file: File): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a foto neste aparelho.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!blob) throw new Error("Não foi possível processar a foto neste aparelho.");
  return { blob, width, height };
}

/** Envia uma foto já reduzida para a rota indicada. Devolve a mensagem de erro, se houver. */
export async function uploadImage(url: string, image: CompressedImage): Promise<string | null> {
  const form = new FormData();
  form.append("file", image.blob, "foto.jpg");
  form.append("width", String(image.width));
  form.append("height", String(image.height));
  try {
    const res = await fetch(url, { method: "POST", body: form });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return (data as { error?: string }).error ?? "Não foi possível enviar a foto.";
  } catch {
    return "Sem conexão ao enviar a foto.";
  }
}
