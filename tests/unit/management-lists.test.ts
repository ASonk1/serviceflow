import {describe,expect,it} from "vitest";
import {availabilityState,boundedPage,listUrl,pageCount,parseAvailabilityListQuery,parseInvitationListQuery,parseMemberListQuery,parseServiceListQuery,serviceState,teamState} from "@/features/lists/query";

describe("Phase 4D management list query state",()=>{
 it("uses stable defaults",()=>{expect(parseServiceListQuery({})).toEqual({q:"",status:"all",sort:"name",dir:"asc",page:1,size:10});expect(parseInvitationListQuery({}).dir).toBe("desc")});
 it("accepts only allowlisted filters and sort fields",()=>{expect(parseServiceListQuery({status:"archived",sort:"price",dir:"desc"})).toMatchObject({status:"archived",sort:"price",dir:"desc"});expect(parseMemberListQuery({memberrole:"owner",memberstatus:"inactive",membersort:"services"})).toMatchObject({role:"owner",status:"inactive",sort:"services"})});
 it("falls back safely for malformed and repeated input",()=>{expect(parseServiceListQuery({status:"DROP TABLE",sort:["name","price"],dir:"sideways",page:"-4",size:"1000"})).toEqual({q:"",status:"all",sort:"name",dir:"asc",page:1,size:10})});
 it("bounds query text, pages, and page sizes",()=>{expect(parseServiceListQuery({q:"x".repeat(101)}).q).toBe("");expect(parseServiceListQuery({page:"4",size:"5"})).toMatchObject({page:4,size:5});expect(parseServiceListQuery({page:"10001"}).page).toBe(1)});
 it("calculates nonempty pagination safely",()=>{expect(pageCount(0,10)).toBe(1);expect(pageCount(11,5)).toBe(3);expect(boundedPage(9,11,5)).toBe(3)});
 it("generates deterministic canonical URLs",()=>{expect(listUrl("/dashboard/services",{sort:"name",q:"mobility",page:2,status:"all",size:10})).toBe("/dashboard/services?page=2&q=mobility&sort=name")});
 it("preserves service state while allowing a page reset",()=>{const query=parseServiceListQuery({q:"core",status:"active",page:"4",size:"5"});expect(serviceState(query,{page:1})).toEqual({...query,page:1})});
 it("keeps independent team list state",()=>{const members=parseMemberListQuery({memberq:"sage",memberpage:"2"}),invites=parseInvitationListQuery({inviteq:"alpha",invitepage:"3"});expect(teamState(members,invites)).toMatchObject({memberq:"sage",memberpage:2,inviteq:"alpha",invitepage:3})});
 it("parses availability state without tenant authority",()=>{const query=parseAvailabilityListQuery({q:"sage",sort:"role",dir:"desc",organizationId:"forged"});expect(query).toEqual({q:"sage",sort:"role",dir:"desc",page:1,size:10});expect(availabilityState(query,{page:2}).page).toBe(2)});
});
