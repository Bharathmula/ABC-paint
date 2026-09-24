import React, { useEffect, useState } from 'react';
import { Order } from '../types';

interface Props { order: Order | null; onClose: () => void; onSave: (order: Order) => void; }

export const OrderEditModal: React.FC<Props> = ({ order, onClose, onSave }) => {
  const [draft, setDraft] = useState<Order | null>(order);
  useEffect(() => setDraft(order ? { ...order, items: order.items.map(i => ({ ...i })) } : null), [order]);
  if (!draft) return null;
  const text = (key: keyof Order, label: string, required=false) => (
    <label className="space-y-1 text-xs font-semibold text-slate-700"><span>{label}{required ? ' *' : ''}</span>
      <input required={required} value={String(draft[key] ?? '')} onChange={e=>setDraft({...draft,[key]:e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
    </label>
  );
  const number = (key: 'orderQuantity'|'issue'|'rate'|'value', label: string) => (
    <label className="space-y-1 text-xs font-semibold text-slate-700"><span>{label}</span>
      <input type="number" min="0" step="any" value={draft[key]} onChange={e=>setDraft({...draft,[key]:Math.max(0,Number(e.target.value)||0)})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
    </label>
  );
  return <div className="fixed inset-0 z-[100] bg-slate-950/55 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
    <form onSubmit={e=>{e.preventDefault(); const quantity=Math.max(0,draft.orderQuantity); const issue=Math.min(quantity,Math.max(0,draft.issue)); onSave({...draft,orderQuantity:quantity,issue,pending:Math.max(0,quantity-issue)});}} className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200">
      <div className="flex items-center justify-between p-5 border-b"><div><h2 className="text-lg font-bold">Edit Order Details</h2><p className="text-xs text-slate-500 mt-1">Enter or correct OB, SK, party and quantity details manually.</p></div><button type="button" onClick={onClose} className="px-3 py-2 rounded-lg border text-sm font-semibold">Close</button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5">
        {text('companyName','Company Name',true)}{text('voucherNumber','OB Number')}{text('skNumber','SK Number')}{text('partyOrderNumber','Party Order Number')}
        {text('date','Order Date',true)}{text('dueDate','Deadline Date')}{text('area','Area Code')}{text('salesPerson','Sales Person')}
        {number('orderQuantity','Order Quantity')}{number('issue','Issued Quantity')}{number('rate','Rate')}{number('value','Order Value')}
        <label className="sm:col-span-2 space-y-1 text-xs font-semibold text-slate-700"><span>Notes</span><textarea value={draft.notes||''} onChange={e=>setDraft({...draft,notes:e.target.value})} className="w-full min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
      </div>
      <div className="flex justify-end gap-2 p-5 border-t bg-slate-50 rounded-b-2xl"><button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border bg-white text-sm font-semibold">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold">Save Details</button></div>
    </form>
  </div>;
};
