import React,{useEffect,useMemo,useRef,useState} from 'react';
import * as XLSX from 'xlsx';
import {Search,MapPin,Plus,Trash2,UploadCloud,Download} from 'lucide-react';
import {Order} from '../types';
import {AreaEntry,AreaClass,defaultAreas,loadAreas,saveAreas} from '../utils/areaStore';
import {loadDbAreas,saveDbAreas} from '../utils/api';
import {isOrderToday,isOrderUnfinished} from '../utils/orderStatus';

const clean=(v:any)=>String(v??'').trim();
const header=(v:any)=>clean(v).toLowerCase().replace(/[^a-z]/g,'');
const partyKey=(v:any)=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const customerCode=(v:any)=>clean(v).match(/^([A-Z]{1,8}[A-Z0-9*]*\d[A-Z0-9*]*)\s+/i)?.[1]||'';
const partyWithoutCode=(v:any)=>clean(v).replace(/^[A-Z]{1,8}[A-Z0-9*]*\d[A-Z0-9*]*\s+/i,'');
const usableArea=(v:any)=>{const area=clean(v);return area&&!['NOT ASSIGNED','UNASSIGNED','GENERAL AREA','GENERAL','N/A','NA','-','—'].includes(area.toUpperCase())?area:''};
const SHARED_AREA_MIGRATION_KEY='abc_shared_areas_migrated_v1';

export function AreasDashboard({orders}:{orders:Order[]}){
 const [areas,setAreas]=useState<AreaEntry[]>(()=>loadAreas());
 const [search,setSearch]=useState(''); const [selected,setSelected]=useState<string[]>([]);
 const [prioritySelected,setPrioritySelected]=useState<string[]>([]);
 const [code,setCode]=useState(''); const [company,setCompany]=useState(''); const [cls,setCls]=useState<AreaClass>('Local');
 const [message,setMessage]=useState(''); const fileRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  let active=true;
  const bundled=loadAreas();
  const refresh=()=>loadDbAreas().then(async(rows)=>{
   if(!active)return;
   if(Array.isArray(rows)&&rows.length>0){
    let sharedRows=rows;
    const shouldMigrate=localStorage.getItem(SHARED_AREA_MIGRATION_KEY)!=='true';
    const classified=bundled.filter(a=>a.classification==='Local'||a.classification==='Transport');
    if(shouldMigrate&&classified.length){
     const localByCode=new Map(classified.map(a=>[clean(a.code||a.id).replace(/^db-/,''),a]));
     const localByParty=new Map(classified.map(a=>[`${clean(a.companyName).toUpperCase()}|${clean(a.areaCode).toUpperCase()}`,a]));
     sharedRows=rows.map((row:AreaEntry)=>{const code=clean(row.code||row.id).replace(/^db-/,'');const local=localByCode.get(code)||localByParty.get(`${clean(row.companyName).toUpperCase()}|${clean(row.areaCode).toUpperCase()}`);return local?.classification?{...row,classification:local.classification}:row});
     try{await saveDbAreas(sharedRows,'Existing browser area classification migration');localStorage.setItem(SHARED_AREA_MIGRATION_KEY,'true')}catch{}
    }
    setAreas(sharedRows);saveAreas(sharedRows);return
   }
   setAreas(bundled);saveAreas(bundled);
   try{await saveDbAreas(bundled,'Initial 3-Year Analysis area data')}catch{}
  }).catch(()=>{/* Keep the permanently saved browser copy when Streamlit has no API route. */});
  refresh();const timer=window.setInterval(refresh,10000);return()=>{active=false;window.clearInterval(timer)};
 },[]);
 const persist=async(next:AreaEntry[],source='Manual area update')=>{setAreas(next);saveAreas(next);try{await saveDbAreas(next,source);setMessage(`${message||'Areas updated'} Saved permanently in PostgreSQL.`)}catch{setMessage(`${message||'Areas updated'} Database unavailable; saved in this browser.`)}};
 const stats=useMemo(()=>{const m=new Map<string,{n:number;q:number}>();orders.filter(o=>o.pending>0).forEach(o=>{const k=o.companyName.trim().toUpperCase();const x=m.get(k)||{n:0,q:0};x.n++;x.q+=o.pending;m.set(k,x)});return m},[orders]);
 const priorityOrders=useMemo(()=>{
  // A valid area supplied by the order/Excel is authoritative. For older
  // orders without an area, use the saved shared master and then the original
  // bundled customer master. Normalized party keys handle punctuation/spaces.
  const original=defaultAreas();
  const originalAreaByCompany=new Map(original.map(a=>[partyKey(a.companyName),usableArea(a.areaCode)]));
  const originalAreaByCode=new Map(original.map(a=>[partyKey(a.code||''),usableArea(a.areaCode)]));
  const savedAreaByCompany=new Map(areas.map(a=>[partyKey(a.companyName),usableArea(a.areaCode)]));
  const savedAreaByCode=new Map(areas.map(a=>[partyKey(a.code||''),usableArea(a.areaCode)]));
  const masterArea=(companyName:string)=>savedAreaByCode.get(partyKey(customerCode(companyName)))||originalAreaByCode.get(partyKey(customerCode(companyName)))||savedAreaByCompany.get(partyKey(companyName))||originalAreaByCompany.get(partyKey(companyName))||savedAreaByCompany.get(partyKey(partyWithoutCode(companyName)))||originalAreaByCompany.get(partyKey(partyWithoutCode(companyName)))||'';
  const classification=(companyName:string):AreaClass=>{
   const code=partyKey(customerCode(companyName));const full=partyKey(companyName);const without=partyKey(partyWithoutCode(companyName));
   return areas.find(a=>(code&&partyKey(a.code||'')===code)||partyKey(a.companyName)===full||partyKey(a.companyName)===without)?.classification||'';
  };
  return orders
   .filter(o=>isOrderToday(o.date)||!!o.rtg||isOrderUnfinished(o))
   .map(o=>({
    order:o,
    area:usableArea(o.area)||masterArea(o.companyName)||'Not Assigned',
    today:isOrderToday(o.date),
    rtg:!!o.rtg&&isOrderUnfinished(o),
    unfinished:isOrderUnfinished(o)&&!o.rtg,
    classification:classification(o.companyName)
   }))
   .sort((a,b)=>Number(b.rtg)-Number(a.rtg)||Number(b.today)-Number(a.today)||a.area.localeCompare(b.area,undefined,{numeric:true,sensitivity:'base'})||a.order.companyName.localeCompare(b.order.companyName,undefined,{sensitivity:'base'}));
 },[orders,areas]);
 const priorityAreaCount=useMemo(()=>new Set(priorityOrders.map(row=>row.area)).size,[priorityOrders]);
 const filtered=useMemo(()=>{const q=search.toLowerCase().trim();return areas.filter(a=>!q||a.areaCode.toLowerCase().includes(q)||a.companyName.toLowerCase().includes(q)||a.classification.toLowerCase().includes(q)).sort((a,b)=>a.areaCode.localeCompare(b.areaCode,undefined,{numeric:true,sensitivity:'base'})||a.companyName.localeCompare(b.companyName,undefined,{sensitivity:'base'}))},[areas,search]);
 const add=()=>{if(!code.trim()||!company.trim()){setMessage('Enter both Area Code and Company Name.');return}const id=`manual-${Date.now()}`;setMessage(`${cls} area added.`);persist([...areas,{id,code:id,areaCode:code.trim(),companyName:company.trim(),classification:cls,custom:true}],`${cls} manual entry`);setCode('');setCompany('')};
 const remove=()=>{persist(areas.filter(a=>!selected.includes(a.id)));setSelected([]);setMessage('Selected area records removed.')};
 const move=(classification:AreaClass)=>{setMessage(`${selected.length} record(s) moved to ${classification}.`);persist(areas.map(a=>selected.includes(a.id)?{...a,classification}:a),`Classified as ${classification}`);setSelected([])};
 const movePriority=async(classification:Exclude<AreaClass,''>)=>{
  if(!prioritySelected.length)return;
  const chosen=priorityOrders.filter(row=>prioritySelected.includes(row.order.id));
  const next=[...areas];
  for(const {order,area} of chosen){
   const code=customerCode(order.companyName);const codeKey=partyKey(code);const full=partyKey(order.companyName);const without=partyKey(partyWithoutCode(order.companyName));
   const index=next.findIndex(a=>(codeKey&&partyKey(a.code||'')===codeKey)||partyKey(a.companyName)===full||partyKey(a.companyName)===without);
   if(index>=0)next[index]={...next[index],areaCode:usableArea(area)||next[index].areaCode,classification};
   else {const stableCode=code||`ORDER-${order.id}`;next.push({id:`db-${stableCode}`,code:stableCode,areaCode:usableArea(area),companyName:partyWithoutCode(order.companyName)||order.companyName,classification,custom:true})}
  }
  setMessage(`${chosen.length} priority order(s) sent to ${classification}.`);
  setPrioritySelected([]);
  await persist(next,`Priority orders sent to ${classification}`);
 };
 const downloadTemplate=()=>{const ws=XLSX.utils.json_to_sheet([{'Area Code':'','Company Name':'','Area Type':'Local'}]);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Areas');XLSX.writeFile(wb,'ABC_Paints_Areas_Import_Template.xlsx')};
 const importFile=async(file:File)=>{try{const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});const parsed:AreaEntry[]=[];for(const sheetName of wb.SheetNames){const rows=XLSX.utils.sheet_to_json<any[]>(wb.Sheets[sheetName],{header:1,defval:''});const h=rows.findIndex(r=>r.some(v=>header(v)==='areacode')&&r.some(v=>['companyname','party','partyasperreport'].includes(header(v))));if(h<0)continue;const heads=rows[h].map(header);const ai=heads.findIndex(x=>x==='areacode');const ci=heads.findIndex(x=>['code','customercode'].includes(x));const pi=heads.findIndex(x=>['companyname','party','partyasperreport'].includes(x));const ti=heads.findIndex(x=>['areatype','type','classification'].includes(x));rows.slice(h+1).forEach((row,i)=>{const codeValue=clean(ci>=0?row[ci]:'')||`file-${Date.now()}-${parsed.length}`;const areaCode=clean(row[ai]);let companyName=clean(row[pi]);if(companyName.toUpperCase().startsWith(codeValue.toUpperCase()))companyName=companyName.slice(codeValue.length).trim();if(areaCode&&companyName.toUpperCase().endsWith(areaCode.toUpperCase()))companyName=companyName.slice(0,-areaCode.length).trim();const rawType=clean(ti>=0?row[ti]:'').toLowerCase();const classification:AreaClass=rawType.startsWith('t')?'Transport':rawType.startsWith('l')?'Local':'';if(companyName)parsed.push({id:`db-${codeValue}`,code:codeValue,areaCode,companyName,classification,custom:true})})}if(!parsed.length)throw new Error('No customer/area rows found');const seen=new Map(areas.map(a=>[(a as any).code||a.id,a]));parsed.forEach(a=>seen.set((a as any).code||a.id,a));setMessage(`${parsed.length} customer-area records imported from ${file.name}.`);await persist(Array.from(seen.values()),file.name)}catch(e:any){setMessage(e.message||'Area file could not be read.')}finally{if(fileRef.current)fileRef.current.value=''}};
 return <div className="space-y-4">
  <div className="bg-white rounded-2xl border p-5">
   <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between"><div><div className="flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600"/><h2 className="font-semibold">Areas Master</h2></div><p className="text-xs text-slate-500 mt-1">The 3-Year Analysis customers are loaded here for classification into Local or Transport and saved permanently in PostgreSQL.</p></div><div className="flex flex-wrap gap-2"><input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e=>e.target.files?.[0]&&importFile(e.target.files[0])}/><button onClick={()=>fileRef.current?.click()} className="border rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1"><UploadCloud className="w-4 h-4"/>Import Areas File</button><button onClick={downloadTemplate} className="border rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1"><Download className="w-4 h-4"/>Download Template</button></div></div>
   <div className="grid md:grid-cols-[1fr_2fr_160px_auto] gap-2 mt-4"><input value={code} onChange={e=>setCode(e.target.value)} placeholder="Area code" className="border rounded-xl px-3 py-2 text-sm"/><input value={company} onChange={e=>setCompany(e.target.value)} placeholder="Company / party name" className="border rounded-xl px-3 py-2 text-sm"/><select value={cls} onChange={e=>setCls(e.target.value as AreaClass)} className="border rounded-xl px-3 py-2 text-sm"><option>Local</option><option>Transport</option></select><button onClick={add} className="bg-slate-900 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center justify-center gap-1"><Plus className="w-4 h-4"/>Add</button></div>
   {message&&<div className="mt-3 text-xs font-medium text-blue-700">{message}</div>}
  </div>
  <section className="bg-white rounded-2xl border overflow-hidden" aria-labelledby="priority-areas-heading">
   <div className="p-4 border-b bg-slate-50"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h3 id="priority-areas-heading" className="font-bold text-slate-900">Priority Areas for Dispatch</h3><p className="text-xs text-slate-500 mt-1">Select Today, RTG or Unfinished orders and send them to Local or Transport. Assignments are saved for every computer.</p></div><div className="flex gap-2"><span className="rounded-full bg-violet-100 text-violet-800 px-3 py-1 text-xs font-bold">{priorityOrders.length} orders</span><span className="rounded-full bg-slate-200 text-slate-700 px-3 py-1 text-xs font-bold">{priorityAreaCount} areas</span></div></div></div>
   <div className="p-3 border-b flex flex-wrap items-center gap-2"><button disabled={!prioritySelected.length} onClick={()=>movePriority('Local')} className="bg-blue-600 text-white rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40">Send selected to Local</button><button disabled={!prioritySelected.length} onClick={()=>movePriority('Transport')} className="bg-amber-600 text-white rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40">Send selected to Transport</button><span className="text-xs text-slate-500">{prioritySelected.length} selected</span></div>
   {(()=>{const card=(row:typeof priorityOrders[number])=>{const {order,area,today,rtg,unfinished}=row;const number=order.skNumber||order.voucherNumber||order.partyOrderNumber||'No Order Number';const color=rtg?'border-cyan-300 bg-cyan-50':unfinished?'border-amber-300 bg-amber-50':'border-indigo-300 bg-indigo-50';const checked=prioritySelected.includes(order.id);return <article key={order.id} className={`rounded-xl border p-3 ${color} ${checked?'ring-2 ring-blue-500':''}`}><div className="flex items-start gap-2"><input aria-label={`Select ${number}`} type="checkbox" checked={checked} onChange={()=>setPrioritySelected(s=>s.includes(order.id)?s.filter(x=>x!==order.id):[...s,order.id])} className="mt-1 h-4 w-4"/><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Area Code</div><b className="text-base text-slate-950 break-words">{area}</b></div><div className="flex flex-wrap justify-end gap-1">{today&&<span className="rounded bg-indigo-600 text-white px-2 py-0.5 text-[10px] font-bold">TODAY</span>}{rtg&&<span className="rounded bg-cyan-700 text-white px-2 py-0.5 text-[10px] font-bold">RTG</span>}{unfinished&&<span className="rounded bg-amber-500 text-white px-2 py-0.5 text-[10px] font-bold">UNFINISHED</span>}</div></div><div className="mt-3 border-t border-slate-200 pt-2"><div className="font-semibold text-sm text-slate-900 truncate" title={order.companyName}>{order.companyName}</div><div className="mt-1 flex items-center justify-between gap-2 text-xs"><span className="font-mono font-bold text-blue-700 truncate" title={number}>{number}</span><span className="text-slate-600 whitespace-nowrap">Pending <b>{Math.max(0,order.pending).toLocaleString('en-IN')}</b></span></div></div></div></div></article>};const unassigned=priorityOrders.filter(r=>!r.classification);return <div className="p-3 space-y-3">{!!unassigned.length&&<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3"><div className="mb-2 flex items-center justify-between"><b className="text-sm">Waiting for Local / Transport selection</b><span className="text-xs font-bold text-slate-500">{unassigned.length}</span></div><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">{unassigned.map(card)}</div></div>}<div className="grid lg:grid-cols-2 gap-3">{(['Local','Transport'] as Exclude<AreaClass,''>[]).map(group=>{const rows=priorityOrders.filter(r=>r.classification===group);return <div key={group} className={`rounded-xl border overflow-hidden ${group==='Local'?'border-blue-200':'border-amber-200'}`}><div className={`px-4 py-3 flex justify-between ${group==='Local'?'bg-blue-600 text-white':'bg-amber-500 text-white'}`}><b>{group}</b><span className="text-xs font-bold">{rows.length} orders</span></div><div className="grid sm:grid-cols-2 gap-2 p-2 max-h-[620px] overflow-auto">{rows.map(card)}{!rows.length&&<div className="sm:col-span-2 p-8 text-center text-sm text-slate-500">No priority orders assigned to {group}.</div>}</div></div>})}</div>{!priorityOrders.length&&<div className="p-6 text-center text-sm text-slate-500">No Today, RTG or Unfinished orders right now.</div>}</div>})()}
  </section>
  <div className="bg-white rounded-2xl border overflow-hidden"><div className="p-4 border-b flex items-center justify-between"><div><b>Unclassified Customers</b><div className="text-xs text-slate-500">Select records, then move them to Local or Transport.</div></div><span className="text-sm font-bold">{filtered.filter(a=>!a.classification).length}</span></div><div className="max-h-72 overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-slate-50"><tr><th className="p-3"></th><th className="p-3 text-left">Area Code</th><th className="p-3 text-left">Company</th><th className="p-3 text-left">Customer Code</th></tr></thead><tbody>{filtered.filter(a=>!a.classification).map(a=><tr key={a.id} className="border-t"><td className="p-3 text-center"><input type="checkbox" checked={selected.includes(a.id)} onChange={()=>setSelected(s=>s.includes(a.id)?s.filter(x=>x!==a.id):[...s,a.id])}/></td><td className="p-3 font-semibold">{a.areaCode||'—'}</td><td className="p-3">{a.companyName}</td><td className="p-3 font-mono text-xs">{(a as any).code||a.id.replace(/^db-/,'')}</td></tr>)}</tbody></table></div><div className="p-3 border-t flex gap-2"><button disabled={!selected.length} onClick={()=>move('Local')} className="bg-blue-600 text-white rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40">Add to Local</button><button disabled={!selected.length} onClick={()=>move('Transport')} className="bg-amber-600 text-white rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40">Add to Transport</button></div></div>
  <div className="grid md:grid-cols-2 gap-4">{(['Local','Transport'] as AreaClass[]).map(group=>{const rows=filtered.filter(a=>a.classification===group);return <div key={group} className="bg-white rounded-2xl border overflow-hidden"><div className="p-4 border-b flex items-center justify-between"><div><b>{group} Areas</b><div className="text-xs text-slate-500">{rows.length} records</div></div><button disabled={!selected.length} onClick={()=>move(group)} className="text-xs border rounded-lg px-3 py-1.5 disabled:opacity-40">Move selected here</button></div><div className="p-3 border-b relative"><Search className="absolute left-6 top-5 w-4 h-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search area or company" className="w-full border rounded-xl pl-9 pr-3 py-2 text-sm"/></div><div className="max-h-[520px] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-slate-50"><tr><th className="p-3"></th><th className="p-3 text-left">Area Code</th><th className="p-3 text-left">Company</th><th className="p-3 text-right">Pending</th></tr></thead><tbody>{rows.map(a=>{const st=stats.get(a.companyName.trim().toUpperCase())||{n:0,q:0};return <tr key={a.id} className="border-t"><td className="p-3 text-center"><input type="checkbox" checked={selected.includes(a.id)} onChange={()=>setSelected(s=>s.includes(a.id)?s.filter(x=>x!==a.id):[...s,a.id])}/></td><td className="p-3 font-semibold">{a.areaCode}</td><td className="p-3">{a.companyName}</td><td className="p-3 text-right">{st.n} / {st.q.toLocaleString('en-IN')}</td></tr>})}{!rows.length&&<tr><td colSpan={4} className="p-10 text-center text-slate-500">No {group.toLowerCase()} areas added yet.</td></tr>}</tbody></table></div></div>})}</div>
  <button disabled={!selected.length} onClick={remove} className="bg-red-600 text-white rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-40 inline-flex items-center gap-1"><Trash2 className="w-4 h-4"/>Remove Selected</button>
 </div>
}

