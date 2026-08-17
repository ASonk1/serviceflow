"use server";
import {revalidatePath} from "next/cache";
import {z} from "zod";
import {createClient} from "@/lib/supabase/server";
import {avatarObjectPath,logoObjectPath,PUBLIC_MEDIA_BUCKET,validateMediaFile} from "./validation";
import type {MediaActionResult} from "./action-result";
const ids=z.object({organizationId:z.string().uuid(),staffId:z.string().uuid().optional()});
async function client(){const db=await createClient();const {data}=await db.auth.getUser();return data.user?.email_confirmed_at?db:null}
function refresh(){revalidatePath("/onboarding");revalidatePath("/onboarding/preview");revalidatePath("/dashboard");revalidatePath("/book/[slug]","page")}
async function upload(kind:"logo"|"avatar",formData:FormData):Promise<MediaActionResult>{
 const parsed=ids.safeParse(Object.fromEntries(formData.entries()));const file=formData.get("media");if(!parsed.success||!(file instanceof File))return{status:"error",message:"Choose an image and try again."};
 const checked=validateMediaFile(file);if(!checked.ok)return{status:"error",message:checked.message};if(kind==="avatar"&&!parsed.data.staffId)return{status:"error",message:"The staff profile is not available yet."};
 const db=await client();if(!db)return{status:"error",message:"Your verified session has expired. Sign in again."};
 const path=kind==="logo"?logoObjectPath(parsed.data.organizationId,file.type):avatarObjectPath(parsed.data.organizationId,parsed.data.staffId!,file.type);
 const {error:uploadError}=await db.storage.from(PUBLIC_MEDIA_BUCKET).upload(path,file,{contentType:file.type,upsert:false,cacheControl:"3600"});
 if(uploadError)return{status:"error",message:"The image could not be uploaded. Check the file and try again."};
 const result=kind==="logo"?await db.rpc("set_organization_logo",{target_org_id:parsed.data.organizationId,object_path:path}):await db.rpc("set_staff_avatar",{target_org_id:parsed.data.organizationId,target_staff_id:parsed.data.staffId!,object_path:path});
 if(result.error){await db.storage.from(PUBLIC_MEDIA_BUCKET).remove([path]);return{status:"error",message:"The image could not be attached securely. Your previous image is unchanged."};}
 const previous=typeof result.data==="string"?result.data:null;if(previous&&previous!==path)await db.storage.from(PUBLIC_MEDIA_BUCKET).remove([previous]);refresh();return{status:"success",message:`${kind==="logo"?"Logo":"Avatar"} updated.`,path};
}
async function remove(kind:"logo"|"avatar",formData:FormData):Promise<MediaActionResult>{
 const parsed=ids.safeParse(Object.fromEntries(formData.entries()));if(!parsed.success||(kind==="avatar"&&!parsed.data.staffId))return{status:"error",message:"This media request is invalid."};const db=await client();if(!db)return{status:"error",message:"Your verified session has expired. Sign in again."};
 const result=kind==="logo"?await db.rpc("set_organization_logo",{target_org_id:parsed.data.organizationId,object_path:undefined}):await db.rpc("set_staff_avatar",{target_org_id:parsed.data.organizationId,target_staff_id:parsed.data.staffId!,object_path:undefined});
 if(result.error)return{status:"error",message:"The image could not be removed."};if(typeof result.data==="string")await db.storage.from(PUBLIC_MEDIA_BUCKET).remove([result.data]);refresh();return{status:"success",message:`${kind==="logo"?"Logo":"Avatar"} removed.`,path:null};
}
export async function uploadLogo(_:MediaActionResult,data:FormData){return upload("logo",data)}
export async function removeLogo(_:MediaActionResult,data:FormData){return remove("logo",data)}
export async function uploadAvatar(_:MediaActionResult,data:FormData){return upload("avatar",data)}
export async function removeAvatar(_:MediaActionResult,data:FormData){return remove("avatar",data)}
