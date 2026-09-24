import React,{useEffect,useState} from 'react';
import {ChevronLeft,ChevronRight,History,FileSpreadsheet,Trash2} from 'lucide-react';
import {deleteImportHistory,loadImportHistory} from '../utils/api';

type HistoryRow={id:string|number;sourceFile:string;mode:string;receivedCount:number;insertedCount:number;updatedCount:number;entityType:string;importedAt:string};

export function UploadHistorySidebar(){
 const [open,setOpen]=useState(false); const [rows,setRows]=useState<HistoryRow[]>([]);
 const [selected,setSelected]=useState<string[]>([]); const [message,setMessage]=useState('');
 const [column,setColumn]=useState<'added'|'activity'>('added');
 useEffect(()=>{if(open)loadImportHistory().then(history=>setRows(history.filter((row:HistoryRow)=>row.entityType==='orders'))).catch(()=>setRows([]))},[open]);
 useEffect(()=>{const toggleHistory=()=>setOpen(v=>!v);const closeHistory=()=>setOpen(false);window.addEventListener('dashboard-toggle-history',toggleHistory);window.addEventListener('dashboard-close-overlays',closeHistory);return()=>{window.removeEventListener('dashboard-toggle-history',toggleHistory);window.removeEventListener('dashboard-close-overlays',closeHistory)}},[]);
 const addedReports=rows.filter(r=>!/(existing browser data migration|migration|legacy data)/i.test(r.sourceFile));
 const displayedRows=column==='added'?addedReports:rows;
 const allSelected=displayedRows.length>0&&displayedRows.every(r=>selected.includes(String(r.id)));
 const toggle=(id:string|number)=>setSelected(s=>s.includes(String(id))?s.filter(x=>x!==String(id)):[...s,String(id)]);
 const removeSelected=async()=>{
  if(!selected.length||!window.confirm(`Delete ${selected.length} selected history record(s)?`))return;
  try{await deleteImportHistory(selected);setRows(r=>r.filter(x=>!selected.includes(String(x.id))));setSelected([]);setMessage('Selected history deleted.')}catch{setMessage('Could not delete history. Check the database connection.')}
 };
 return <>
  <button type="button" onClick={()=>setOpen(v=>!v)} className="fixed left-0 top-24 z-50 bg-slate-900 text-white rounded-r-xl px-2 py-4 shadow-lg flex flex-col items-center gap-1" title={open?'Close Excel reports':'Open Excel reports added'}><History className="w-4 h-4"/><span className="text-[10px] [writing-mode:vertical-rl]">History</span>{open?<ChevronLeft className="w-3 h-3"/>:<ChevronRight className="w-3 h-3"/>}</button>
  <aside className={`fixed left-0 top-0 bottom-0 z-40 w-96 max-w-[92vw] bg-white border-r shadow-2xl transition-transform duration-200 ${open?'translate-x-0':'-translate-x-full'}`}>
   <div className="h-full flex flex-col pt-20">
    <div className="px-5 pb-4 border-b"><h2 className="font-bold text-lg flex items-center gap-2"><History className="w-6 h-6"/>Excel History</h2><p className="text-xs text-slate-500 mt-1">Uploaded reports and database activity.</p></div>
    <div className="grid grid-cols-2 gap-2 p-3 border-b bg-white">
     <button type="button" onClick={()=>{setColumn('added');setSelected([])}} className={`rounded-xl px-3 py-2.5 text-sm font-bold border ${column==='added'?'bg-emerald-600 text-white border-emerald-600':'bg-white text-slate-600'}`}>Added Reports <span className="ml-1 rounded bg-black/10 px-1.5">{addedReports.length}</span></button>
     <button type="button" onClick={()=>{setColumn('activity');setSelected([])}} className={`rounded-xl px-3 py-2.5 text-sm font-bold border ${column==='activity'?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-600'}`}>All Activity <span className="ml-1 rounded bg-black/10 px-1.5">{rows.length}</span></button>
    </div>
    <div className="p-3 border-b bg-slate-50 flex items-center gap-2">
     <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer"><input type="checkbox" checked={allSelected} onChange={()=>setSelected(allSelected?[]:displayedRows.map(r=>String(r.id)))}/>Select all</label>
     <span className="text-xs text-slate-500 ml-auto">{selected.length} selected</span>
     <button disabled={!selected.length} onClick={removeSelected} className="bg-red-600 text-white rounded-lg px-3 py-2 text-xs font-bold inline-flex items-center gap-1 disabled:opacity-40"><Trash2 className="w-4 h-4"/>Delete</button>
    </div>
    {message&&<div className="px-4 py-2 text-xs font-semibold text-blue-700 border-b">{message}</div>}
    <div className="flex-1 overflow-auto p-3 space-y-2">{displayedRows.map(r=><label key={r.id} className={`block border rounded-xl p-3 cursor-pointer ${selected.includes(String(r.id))?'border-blue-500 bg-blue-50':'bg-white'}`}><div className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={selected.includes(String(r.id))} onChange={()=>toggle(r.id)}/><FileSpreadsheet className="w-4 h-4 text-emerald-600 mt-0.5"/><div className="min-w-0"><div className="font-semibold text-sm break-words" title={r.sourceFile}>{r.sourceFile}</div><div className="text-[11px] text-slate-500 mt-1">{new Date(r.importedAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'medium'})}</div>{column==='activity'&&<><div className="text-[11px] mt-2"><b>{r.receivedCount}</b> orders · <b>{r.insertedCount}</b> new · <b>{r.updatedCount}</b> updated</div><div className="text-[10px] uppercase tracking-wide text-slate-400 mt-1">Excel report · {r.mode}</div></>}</div></div></label>)}{!displayedRows.length&&<div className="text-center text-sm text-slate-500 py-12">{column==='added'?'No Excel reports have been added yet.':'No activity recorded yet.'}</div>}</div>
   </div>
  </aside>
 </>
}
