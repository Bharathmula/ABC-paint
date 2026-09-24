import { Order } from '../types';
import { StockRecord } from '../types';

// Streamlit serves the dashboard inside its own component origin. Always send
// database requests to the one shared Render API so every computer reads and
// writes the same PostgreSQL records.
const API_BASE=(import.meta.env.VITE_API_BASE_URL||'https://abc-paints-dashboard.onrender.com').replace(/\/$/,'');
const api=(path:string)=>`${API_BASE}${path}`;

const HISTORY_KEY='abc_upload_history_v1';
type LocalHistory={id:string;sourceFile:string;mode:string;receivedCount:number;insertedCount:number;updatedCount:number;entityType:string;importedAt:string};
function localHistory():LocalHistory[]{try{const rows=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(rows)?rows:[]}catch{return []}}
function addLocalHistory(sourceFile:string,mode:string,count:number,entityType:string){const rows=localHistory();rows.unshift({id:`local-${Date.now()}-${Math.random().toString(36).slice(2)}`,sourceFile,mode,receivedCount:count,insertedCount:mode==='replace'?count:0,updatedCount:mode==='replace'?0:count,entityType,importedAt:new Date().toISOString()});localStorage.setItem(HISTORY_KEY,JSON.stringify(rows.slice(0,250)))}

export async function dbHealth(){ const r=await fetch(api('/api/health')); return r.json(); }
export async function loadDbOrders():Promise<Order[]>{ const r=await fetch(api('/api/orders')); if(!r.ok) throw new Error('Database not configured'); return r.json(); }
export async function importDbOrders(orders:Order[], sourceFile:string, mode:'merge'|'replace'){
 addLocalHistory(sourceFile,mode,orders.length,'orders');
 const r=await fetch(api('/api/orders/import'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orders,sourceFile,mode})});
 if(!r.ok) throw new Error((await r.json()).error||'Database import failed'); return r.json();
}
export async function clearDbOrders(){ const r=await fetch(api('/api/orders'),{method:'DELETE'}); if(!r.ok) throw new Error('Database clear failed'); }
export async function loadDbStock():Promise<StockRecord[]>{const r=await fetch(api('/api/stock'));if(!r.ok)throw new Error('Database not configured');return r.json();}
export async function saveDbStock(records:StockRecord[]){const r=await fetch(api('/api/stock'),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({records})});if(!r.ok)throw new Error('Stock save failed');return r.json();}
export async function loadDbAreas(){const r=await fetch(api('/api/area-master'));if(!r.ok)throw new Error('Database not configured');return r.json();}
export async function saveDbAreas(areas:any[],sourceFile='Manual area update'){addLocalHistory(sourceFile,'merge',areas.length,'areas');const r=await fetch(api('/api/area-master/import'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({areas,sourceFile})});if(!r.ok)throw new Error('Area save failed');return r.json();}
export async function loadImportHistory(){
 const local=localHistory();
 try{const r=await fetch(api('/api/import-history'));if(!r.ok)throw new Error();const remote=await r.json();return Array.isArray(remote)?[...remote,...local].sort((a,b)=>new Date(b.importedAt).getTime()-new Date(a.importedAt).getTime()).slice(0,250):local}catch{return local}
}
export async function deleteImportHistory(ids:Array<string|number>){
 const keys=ids.map(String);localStorage.setItem(HISTORY_KEY,JSON.stringify(localHistory().filter(r=>!keys.includes(String(r.id)))));
 const remoteIds=keys.filter(id=>/^\d+$/.test(id));if(!remoteIds.length)return {ok:true,deleted:keys.length};
 const r=await fetch(api('/api/import-history'),{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:remoteIds})});if(!r.ok)throw new Error('History delete failed');return r.json();
}
