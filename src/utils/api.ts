import { Order } from '../types';
export async function dbHealth(){ const r=await fetch('/api/health'); return r.json(); }
export async function loadDbOrders():Promise<Order[]>{ const r=await fetch('/api/orders'); if(!r.ok) throw new Error('Database not configured'); return r.json(); }
export async function importDbOrders(orders:Order[], sourceFile:string, mode:'merge'|'replace'){
 const r=await fetch('/api/orders/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orders,sourceFile,mode})});
 if(!r.ok) throw new Error((await r.json()).error||'Database import failed'); return r.json();
}
export async function clearDbOrders(){ const r=await fetch('/api/orders',{method:'DELETE'}); if(!r.ok) throw new Error('Database clear failed'); }
export async function loadDbAreas(){const r=await fetch('/api/area-master');if(!r.ok)throw new Error('Database not configured');return r.json();}
export async function saveDbAreas(areas:any[],sourceFile='Manual area update'){const r=await fetch('/api/area-master/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({areas,sourceFile})});if(!r.ok)throw new Error('Area save failed');return r.json();}
export async function loadImportHistory(){const r=await fetch('/api/import-history');if(!r.ok)throw new Error('History unavailable');return r.json();}
