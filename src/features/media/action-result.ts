export type MediaActionResult={status:"idle"|"error"|"success";message?:string;path?:string|null};
export const initialMediaResult:MediaActionResult={status:"idle"};
