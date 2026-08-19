import {z} from "zod";

export type RawSearchParams = Record<string, string | string[] | undefined>;
export const PAGE_SIZES = [5, 10, 20] as const;

const scalar = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;
const text = z.string().trim().max(100).catch("");
const page = z.coerce.number().int().min(1).max(10_000).catch(1);
const size = z.coerce.number().int().pipe(z.union([z.literal(5), z.literal(10), z.literal(20)])).catch(10);
const direction = z.enum(["asc", "desc"]).catch("asc");

const serviceSchema = z.object({
  q: text,
  status: z.enum(["all", "draft", "active", "archived"]).catch("all"),
  sort: z.enum(["name", "status", "price", "updated"]).catch("name"),
  dir: direction,
  page,
  size,
});

const memberSchema = z.object({
  q: text,
  role: z.enum(["all", "owner", "staff"]).catch("all"),
  status: z.enum(["all", "active", "inactive"]).catch("all"),
  sort: z.enum(["name", "role", "status", "services"]).catch("name"),
  dir: direction,
  page,
  size,
});

const invitationSchema = z.object({
  q: text,
  status: z.enum(["all", "pending", "accepted", "expired", "revoked"]).catch("all"),
  sort: z.enum(["email", "status", "created", "expires"]).catch("created"),
  dir: z.enum(["asc", "desc"]).catch("desc"),
  page,
  size,
});

const availabilitySchema = z.object({
  q: text,
  sort: z.enum(["name", "role"]).catch("name"),
  dir: direction,
  page,
  size,
});

export type ServiceListQuery = z.infer<typeof serviceSchema>;
export type MemberListQuery = z.infer<typeof memberSchema>;
export type InvitationListQuery = z.infer<typeof invitationSchema>;
export type AvailabilityListQuery = z.infer<typeof availabilitySchema>;

function values(raw: RawSearchParams, prefix = "") {
  return {
    q: scalar(raw[`${prefix}q`]),
    role: scalar(raw[`${prefix}role`]),
    status: scalar(raw[`${prefix}status`]),
    sort: scalar(raw[`${prefix}sort`]),
    dir: scalar(raw[`${prefix}dir`]),
    page: scalar(raw[`${prefix}page`]),
    size: scalar(raw[`${prefix}size`]),
  };
}

export const parseServiceListQuery = (raw: RawSearchParams) => serviceSchema.parse(values(raw));
export const parseMemberListQuery = (raw: RawSearchParams) => memberSchema.parse(values(raw, "member"));
export const parseInvitationListQuery = (raw: RawSearchParams) => invitationSchema.parse(values(raw, "invite"));
export const parseAvailabilityListQuery = (raw: RawSearchParams) => availabilitySchema.parse(values(raw));

export function pageCount(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function boundedPage(requested: number, total: number, pageSize: number) {
  return Math.min(requested, pageCount(total, pageSize));
}

type QueryValue = string | number | undefined;
export function listUrl(path: string, state: Record<string, QueryValue>) {
  const params = new URLSearchParams();
  for (const key of Object.keys(state).sort()) {
    const value = state[key];
    if (value !== undefined && value !== "" && value !== "all" && value !== 1 && value !== 10) {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function serviceState(query: ServiceListQuery, patch: Partial<ServiceListQuery> = {}) {
  const next = {...query, ...patch};
  return {q: next.q, status: next.status, sort: next.sort, dir: next.dir, page: next.page, size: next.size};
}

export function teamState(members: MemberListQuery, invitations: InvitationListQuery) {
  return {
    memberq: members.q, memberrole: members.role, memberstatus: members.status,
    membersort: members.sort, memberdir: members.dir, memberpage: members.page, membersize: members.size,
    inviteq: invitations.q, invitestatus: invitations.status, invitesort: invitations.sort,
    invitedir: invitations.dir, invitepage: invitations.page, invitesize: invitations.size,
  };
}

export function availabilityState(query: AvailabilityListQuery, patch: Partial<AvailabilityListQuery> = {}) {
  const next = {...query, ...patch};
  return {q: next.q, sort: next.sort, dir: next.dir, page: next.page, size: next.size};
}
