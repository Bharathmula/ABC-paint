import React, { useMemo, useState } from 'react';
import { Trash2, AlertTriangle, X, RotateCcw, FileSpreadsheet } from 'lucide-react';

export type ClearTarget = 'orders' | 'stock' | 'dispatch' | 'all';
export interface RestoreEntry {
  id: string;
  label: string;
  target: string;
  deletedAt: string;
}
interface Props {
  isOpen:boolean;
  onClose:()=>void;
  onConfirmClear:(target:ClearTarget)=>void;
  onClearSource:(sourceFile:string)=>void;
  onRestore:(id:string)=>void;
  onDeletePermanently:(id:string)=>void;
  orderCount:number;
  stockCount:number;
  sourceFiles:string[];
  restoreEntries:RestoreEntry[];
}
export const ClearDataConfirmModal:React.FC<Props>=({isOpen,onClose,onConfirmClear,onClearSource,onRestore,onDeletePermanently,orderCount,stockCount,sourceFiles,restoreEntries})=>{
 const [target,setTarget]=useState<ClearTarget>('orders');
 const [selectedSource,setSelectedSource]=useState('');
 const sorted=useMemo(()=>[...restoreEntries].sort((a,b)=>b.deletedAt.localeCompare(a.deletedAt)),[restoreEntries]);
 if(!isOpen)return null;
 return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60" onClick={onClose}><div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border" onClick={e=>e.stopPropagation()}>
  <div className="p-5 border-b flex justify-between"><div><h3 className="font-semibold">Clear Data / Recycle Bin</h3><p className="text-xs text-slate-500">Choose a dataset or a specific imported Excel file. Deleted data goes to the Recycle Bin first.</p></div><button onClick={onClose}><X/></button></div>
  <div className="p-5 space-y-5">
   <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0"/><span>Clear does not permanently destroy data immediately. Use Recycle Bin to restore it. “Delete Permanently” removes that recovery copy.</span></div>
   <section><h4 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">Clear by dataset</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-2">{([['orders',`Orders (${orderCount})`],['stock',`Stock Records (${stockCount})`],['dispatch','Dispatch Plans'],['all','All Application Data']] as [ClearTarget,string][]).map(([v,l])=><label key={v} className={`p-3 border rounded-xl text-sm cursor-pointer ${target===v?'border-slate-900 bg-slate-50':''}`}><input type="radio" className="mr-2" checked={target===v} onChange={()=>setTarget(v)}/>{l}</label>)}</div><button onClick={()=>onConfirmClear(target)} className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl inline-flex gap-1"><Trash2 className="w-4 h-4"/>Move Selected Dataset to Recycle Bin</button></section>
   <section className="border-t pt-4"><h4 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">Clear one imported file</h4>{sourceFiles.length===0?<p className="text-xs text-slate-500">No imported source files are currently identified.</p>:<div className="flex gap-2"><select value={selectedSource} onChange={e=>setSelectedSource(e.target.value)} className="flex-1 border rounded-xl px-3 py-2 text-sm"><option value="">Select imported Excel file…</option>{sourceFiles.map(f=><option key={f} value={f}>{f}</option>)}</select><button disabled={!selectedSource} onClick={()=>{onClearSource(selectedSource);setSelectedSource('')}} className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl disabled:opacity-40">Clear File Data</button></div>}</section>
   <section className="border-t pt-4"><div className="flex items-center justify-between mb-2"><h4 className="text-xs font-bold uppercase tracking-wide text-slate-600">Recycle Bin</h4><span className="text-xs text-slate-500">{sorted.length} deleted item(s)</span></div>{sorted.length===0?<div className="p-4 rounded-xl bg-slate-50 border text-xs text-slate-500">Recycle Bin is empty.</div>:<div className="space-y-2">{sorted.map(e=><div key={e.id} className="p-3 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div className="flex gap-2"><FileSpreadsheet className="w-4 h-4 text-slate-500 mt-0.5"/><div><div className="text-sm font-semibold">{e.label}</div><div className="text-[11px] text-slate-500">Deleted {new Date(e.deletedAt).toLocaleString()}</div></div></div><div className="flex gap-2"><button onClick={()=>onRestore(e.id)} className="px-3 py-1.5 text-xs font-semibold border rounded-lg inline-flex gap-1"><RotateCcw className="w-3.5 h-3.5"/>Restore</button><button onClick={()=>onDeletePermanently(e.id)} className="px-3 py-1.5 text-xs font-semibold text-rose-700 border border-rose-200 rounded-lg">Delete Permanently</button></div></div>)}</div>}</section>
  </div>
  <div className="p-4 border-t bg-slate-50 flex justify-end"><button onClick={onClose} className="px-4 py-2 text-xs border rounded-xl">Close</button></div>
 </div></div>
}
