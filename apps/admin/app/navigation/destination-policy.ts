import { ADMIN_DESTINATIONS, ADMIN_NAV_GROUPS, type AdminNavGroupId } from "./destinations.generated.js";

export type PermittedAdminDestination={
  surface:string;
  label:string;
  group:AdminNavGroupId;
  permissionAlternatives:readonly (readonly string[])[];
};
export type PermittedAdminGroup={
  id:AdminNavGroupId;
  label:string;
  destinations:readonly PermittedAdminDestination[];
};

export function getPermittedDestinations(permissions:readonly string[]):readonly PermittedAdminDestination[]{
  const granted=new Set(permissions);
  return ADMIN_DESTINATIONS.filter((destination)=>
    destination.permissionAlternatives.some((required)=>
      required.every((permission)=>granted.has(permission))
    )
  );
}

export function getPermittedGroups(permissions:readonly string[]):readonly PermittedAdminGroup[]{
  const destinations=getPermittedDestinations(permissions);
  return ADMIN_NAV_GROUPS
    .map((group)=>({
      id:group.id,
      label:group.label,
      destinations:destinations.filter((destination)=>destination.group===group.id)
    }))
    .filter((group)=>group.destinations.length>0);
}

export function findPermittedDestination(surfaceId:string,permissions:readonly string[]):PermittedAdminDestination|null{
  const normalized=surfaceId.trim().toUpperCase();
  return getPermittedDestinations(permissions).find((destination)=>destination.surface===normalized)??null;
}

export function searchPermittedDestinations(query:string,permissions:readonly string[],limit=12):readonly PermittedAdminDestination[]{
  const needle=normalizeSearch(query);
  if(!needle)return [];
  return getPermittedDestinations(permissions)
    .filter((destination)=>normalizeSearch(`${destination.label} ${destination.surface}`).includes(needle))
    .slice(0,Math.max(1,Math.min(limit,25)));
}

export function getAdminGroupLabel(groupId:string):string|null{
  return ADMIN_NAV_GROUPS.find((group)=>group.id===groupId)?.label??null;
}

function normalizeSearch(value:string):string{
  return value
    .normalize("NFKC")
    .replace(/[يى]/g,"ی")
    .replace(/ك/g,"ک")
    .replace(/[\u064B-\u065F\u0670]/g,"")
    .replace(/\s+/g," ")
    .trim()
    .toLocaleLowerCase("fa-IR");
}
