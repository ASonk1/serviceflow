export type ServiceField="name"|"description"|"durationMinutes"|"bufferMinutes"|"price"|"serviceId"|"staffId";
export type ServiceActionResult={status:"idle"|"error"|"success";message?:string;fields?:Partial<Record<ServiceField,string[]>>};
export const initialServiceResult:ServiceActionResult={status:"idle"};
