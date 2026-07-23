import { isSupabaseConfigured, supabaseClient } from "./supabaseClient";

const SPACE_IMAGE_BUCKET = "space-images";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export type SpaceImageUploadResult =
  | { readonly status: "ok"; readonly publicUrl: string }
  | { readonly status: "error"; readonly message: string };

export const uploadSpaceImage = async (file: File): Promise<SpaceImageUploadResult> => {
  if (!isSupabaseConfigured || supabaseClient === undefined) {
    return { status: "error", message: "Supabase 연결이 설정되지 않았습니다." };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return { status: "error", message: "이미지 파일(JPEG, PNG, WEBP, GIF)만 업로드할 수 있습니다." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { status: "error", message: "파일 크기는 5MB를 초과할 수 없습니다." };
  }

  const objectPath = `spaces/${Date.now()}-${sanitizeFileName(file.name)}`;

  const uploadResponse = await supabaseClient.storage.from(SPACE_IMAGE_BUCKET).upload(objectPath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (uploadResponse.error !== null) {
    return { status: "error", message: "사진 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  const publicUrlResponse = supabaseClient.storage.from(SPACE_IMAGE_BUCKET).getPublicUrl(objectPath);

  return { status: "ok", publicUrl: publicUrlResponse.data.publicUrl };
};

const sanitizeFileName = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf(".");
  const hasExtension = lastDotIndex > 0;
  const baseName = hasExtension ? fileName.slice(0, lastDotIndex) : fileName;
  const extension = hasExtension ? fileName.slice(lastDotIndex) : "";

  const sanitizedBase = baseName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const sanitizedExtension = extension.replace(/[^a-zA-Z0-9.]/g, "");

  return `${sanitizedBase.length > 0 ? sanitizedBase : "image"}${sanitizedExtension}`;
};
