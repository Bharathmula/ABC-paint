export type AreaClass = 'Local' | 'Transport' | '';
export type AreaEntry = { id:string; code?:string; areaCode:string; companyName:string; classification:AreaClass; custom?:boolean };
export type DeletedArea = { trashId:string; deletedAt:string; entry:AreaEntry };

const AREA_KEY='abc_area_master_v4_empty';
const TRASH_KEY='abc_recycle_bin_v2';
const normalize=(v:string)=>String(v||'').trim();

/** Use only areas supplied on the order or entered in the new Areas master. */
export function resolveAreaCode(companyName:string, providedArea?:string):string {
  const supplied=normalize(providedArea||'');
  if(supplied && !['NOT ASSIGNED','UNASSIGNED','GENERAL AREA','GENERAL'].includes(supplied.toUpperCase())) return supplied;
  const match=loadAreas().find(a=>a.companyName.trim().toUpperCase()===normalize(companyName).toUpperCase());
  return match?.areaCode || '';
}

export function defaultAreas(): AreaEntry[] {
  return [];
}
export function loadAreas():AreaEntry[]{
  try {
    const x=JSON.parse(localStorage.getItem(AREA_KEY)||'[]');
    if(Array.isArray(x)) return x;
  } catch{}
  return [];
}
export function saveAreas(v:AreaEntry[]){ localStorage.setItem(AREA_KEY,JSON.stringify(v)); window.dispatchEvent(new Event('abc-areas-changed')); }
export function loadRecycleBin():DeletedArea[]{ try{const x=JSON.parse(localStorage.getItem(TRASH_KEY)||'[]'); return Array.isArray(x)?x:[];}catch{return [];} }
export function saveRecycleBin(v:DeletedArea[]){ localStorage.setItem(TRASH_KEY,JSON.stringify(v)); window.dispatchEvent(new Event('abc-recycle-changed')); }
export function syncOrderAreas(orders:any[]):AreaEntry[]{
  const areas=loadAreas();
  for(const o of orders){ const code=resolveAreaCode(o.companyName,o.area); if(code) o.area=code; }
  return areas;
}
