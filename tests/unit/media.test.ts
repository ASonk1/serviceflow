import {describe,expect,it} from "vitest";
import {avatarObjectPath,extensionForMime,initials,isValidPublicMediaPath,logoObjectPath,mediaObjectName,PUBLIC_MEDIA_MAX_BYTES,publicMediaUrl,validateMediaFile} from "@/features/media/validation";
const org="10000000-0000-4000-8000-000000000001",staff="13000000-0000-4000-8000-000000000102",version="20000000-0000-4000-8000-000000000001";
describe("public presentation media",()=>{
 it.each([["image/jpeg","jpg"],["image/png","png"],["image/webp","webp"]])("accepts %s and derives %s",(type,extension)=>{expect(validateMediaFile({type,size:32})).toEqual({ok:true,extension});expect(extensionForMime(type)).toBe(extension)});
 it.each(["image/svg+xml","image/gif","text/html","application/pdf"])("rejects %s",type=>expect(validateMediaFile({type,size:32}).ok).toBe(false));
 it("enforces non-empty images up to two megabytes",()=>{expect(validateMediaFile({type:"image/png",size:PUBLIC_MEDIA_MAX_BYTES}).ok).toBe(true);expect(validateMediaFile({type:"image/png",size:0}).ok).toBe(false);expect(validateMediaFile({type:"image/png",size:PUBLIC_MEDIA_MAX_BYTES+1}).ok).toBe(false)});
 it("generates collision-resistant versioned names",()=>{expect(mediaObjectName("image/png",version)).toBe(`${version}.png`);expect(mediaObjectName("image/png")).not.toBe(mediaObjectName("image/png"))});
 it("builds and validates only scoped logo and avatar paths",()=>{const logo=logoObjectPath(org,"image/png",version),avatar=avatarObjectPath(org,staff,"image/webp",version);expect(isValidPublicMediaPath(logo)).toBe(true);expect(isValidPublicMediaPath(avatar)).toBe(true);expect(isValidPublicMediaPath(`organizations/${org}/branding/../../attack.png`)).toBe(false);expect(isValidPublicMediaPath("https://example.invalid/image.png")).toBe(false)});
 it("creates public URLs only for validated references",()=>{const path=logoObjectPath(org,"image/png",version);expect(publicMediaUrl("http://127.0.0.1:54321/",path)).toContain(`/serviceflow-public-media/${path}`);expect(publicMediaUrl("http://127.0.0.1:54321","bad/path.png")).toBeNull();expect(publicMediaUrl("http://127.0.0.1:54321",null)).toBeNull()});
 it("provides polished initials fallbacks",()=>{expect(initials("Fictional Cedar Studio")).toBe("FC");expect(initials("  ")).toBe("SF")});
});
