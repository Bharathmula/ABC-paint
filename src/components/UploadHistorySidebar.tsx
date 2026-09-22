import React,{useEffect,useState} from 'react';
import {ChevronLeft,ChevronRight,History,FileSpreadsheet,MapPin,Trash2} from 'lucide-react';
import {deleteImportHistory,loadImportHistory} from '../utils/api';

type HistoryRow={id:string|number;sourceFile:string;mode:string;receivedCount:number;insertedCount:number;updatedCount:number;entityType:string;importedAt:string};

export function UploadHistorySidebar(){
 const [open,setOpen]=useState(false); const [rows,setRows]=useState<HistoryRow[]>([]);
 const [selected,setSelected]=useState<string[]>([]); const [message,setMessage]=useState('');
 useEffect(()=>{if(open)loadImportHistory().then(setRows).catch(()=>setRows([]))},[open]);
 const allSelected=rows.length>0&&selected.length===rows.length;
 const toggle=(id:string|number)=>setSelected(s=>s.includes(String(id))?s.filter(x=>x!==String(id)):[...s,String(id)]);
 const removeSelected=async()=>{
  if(!selected.length||!window.confirm(`Delete ${selected.length} selected history record(s)?`))return;
  try{await deleteImportHistory(selected);setRows(r=>r.filter(x=>!selected.includes(String(x.id))));setSelected([]);setMessage('Selected history deleted.')}catch{setMessage('Could not delete history. Check the database connection.')}
 };
 return <>
  <button type="button" onClick={()=>setOpen(v=>!v)} className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-slate-900 text-white rounded-r-2xl px-5 py-4 min-w-40 shadow-xl flex items-center justify-center gap-3 text-base font-bold" title={open?'Close upload history':'Open upload history'}><History className="w-6 h-6"/><span>History</span>{open?<ChevronLeft className="w-5 h-5"/>:<ChevronRight className="w-5 h-5"/>}</button>
  <aside className={`fixed left-0 top-0 bottom-0 z-40 w-96 max-w-[92vw] bg-white border-r shadow-2xl transition-transform duration-200 ${open?'translate-x-0':'-translate-x-full'}`}>
   <div className="h-full flex flex-col pt-20">
    <div className="px-5 pb-4 border-b"><h2 className="font-bold text-lg flex items-center gap-2"><History className="w-6 h-6"/>Upload History</h2><p className="text-xs text-slate-500 mt-1">Select upload records and delete them when they are no longer required.</p></div>
    <div className="p-3 border-b bg-slate-50 flex items-center gap-2">
     <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer"><input type="checkbox" checked={allSelected} onChange={()=>setSelected(allSelected?[]:rows.map(r=>String(r.id)))}/>Select all</label>
     <span className="text-xs text-slate-500 ml-auto">{selected.length} selected</span>
     <button disabled={!selected.length} onClick={removeSelected} className="bg-red-600 text-white rounded-lg px-3 py-2 text-xs font-bold inline-flex items-center gap-1 disabled:opacity-40"><Trash2 className="w-4 h-4"/>Delete</button>
    </div>
    {message&&<div className="px-4 py-2 text-xs font-semibold text-blue-700 border-b">{message}</div>}
    <div className="flex-1 overflow-auto p-3 space-y-2">{rows.map(r=><label key={r.id} className={`block border rounded-xl p-3 cursor-pointer ${selected.includes(String(r.id))?'border-blue-500 bg-blue-50':'bg-white'}`}><div className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={selected.includes(String(r.id))} onChange={()=>toggle(r.id)}/>{r.entityType==='areas'?<MapPin className="w-4 h-4 text-blue-600 mt-0.5"/>:<FileSpreadsheet className="w-4 h-4 text-emerald-600 mt-0.5"/>}<div className="min-w-0"><div className="font-semibold text-sm truncate" title={r.sourceFile}>{r.sourceFile}</div><div className="text-[11px] text-slate-500 mt-1">{new Date(r.importedAt).toLocaleString()}</div><div className="text-[11px] mt-2"><b>{r.receivedCount}</b> received · <b>{r.insertedCount}</b> new · <b>{r.updatedCount}</b> updated</div><div className="text-[10px] uppercase tracking-wide text-slate-400 mt-1">{r.entityType} · {r.mode}</div></div></div></label>)}{!rows.length&&<div className="text-center text-sm text-slate-500 py-12">No database upload history yet.</div>}</div>
   </div>
  </aside>
 </>
}
