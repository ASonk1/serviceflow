export const PUBLIC_MEDIA_BUCKET = "serviceflow-public-media";
export const PUBLIC_MEDIA_MAX_BYTES = 2 * 1024 * 1024;
export const PUBLIC_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const extensions: Record<(typeof PUBLIC_MEDIA_TYPES)[number], string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
};
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const pathPattern = new RegExp(`^organizations/${uuid}/(?:branding/${uuid}|staff/${uuid}/${uuid})\\.(?:jpg|png|webp)$`);

export type MediaValidation = { ok: true; extension: string } | { ok: false; message: string };

export function validateMediaFile(file: Pick<File, "size" | "type">): MediaValidation {
  if (!PUBLIC_MEDIA_TYPES.includes(file.type as (typeof PUBLIC_MEDIA_TYPES)[number])) return {ok:false,message:"Choose a JPEG, PNG, or WebP image."};
  if (file.size < 1) return {ok:false,message:"Choose a non-empty image."};
  if (file.size > PUBLIC_MEDIA_MAX_BYTES) return {ok:false,message:"The image must be 2 MB or smaller."};
  return {ok:true,extension:extensions[file.type as keyof typeof extensions]};
}
export function extensionForMime(mime:string){return extensions[mime as keyof typeof extensions]??null}
export function isValidPublicMediaPath(path:string){return pathPattern.test(path)}
export function mediaObjectName(mime:string,randomId=crypto.randomUUID()){const extension=extensionForMime(mime);if(!extension)throw new Error("Unsupported media type");return `${randomId}.${extension}`}
export function logoObjectPath(organizationId:string,mime:string,randomId?:string){return `organizations/${organizationId}/branding/${mediaObjectName(mime,randomId)}`}
export function avatarObjectPath(organizationId:string,staffId:string,mime:string,randomId?:string){return `organizations/${organizationId}/staff/${staffId}/${mediaObjectName(mime,randomId)}`}
export function initials(value:string){const result=value.trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join("");return result||"SF"}
export function publicMediaUrl(supabaseUrl:string,path:string|null){if(!path||!isValidPublicMediaPath(path))return null;return `${supabaseUrl.replace(/\/$/,"")}/storage/v1/object/public/${PUBLIC_MEDIA_BUCKET}/${path}`}
