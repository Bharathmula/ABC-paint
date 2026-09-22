import React from 'react';
import { Order } from '../types';
import { ShoppingCart, CheckCircle2, Clock, AlertTriangle, TrendingUp, Building } from 'lucide-react';

interface SummaryCardsProps {
  orders: Order[];
  onFilterOverdue?: () => void;
  onFilterPending?: () => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  orders,
  onFilterOverdue,
  onFilterPending,
}) => {
  const totalOrders = orders.length;
  const uniqueCompanies = new Set(orders.map((o) => o.companyName)).size;
  const totalOrderQty = orders.reduce((sum, o) => sum + o.orderQuantity, 0);
  const totalIssueQty = orders.reduce((sum, o) => sum + o.issue, 0);
  const totalPendingQty = orders.reduce((sum, o) => sum + o.pending, 0);
  const totalValue = orders.reduce((sum, o) => sum + o.value, 0);
  const overdueOrders = orders.filter((o) => o.status === 'Overdue').length;

  const completionRate = totalOrderQty > 0 ? Math.round((totalIssueQty / totalOrderQty) * 100) : 0;

  return (
    <div id="summary-metrics-grid" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Total Orders */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Orders</span>
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <ShoppingCart className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
          {totalOrders.toLocaleString()}
        </div>
        <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
          <Building className="w-3 h-3 text-slate-400" />
          <span>{uniqueCompanies} {uniqueCompanies === 1 ? 'Party' : 'Parties'}</span>
        </div>
      </div>

      {/* 2. Total Order Qty */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Order Qty</span>
          <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
          {totalOrderQty.toLocaleString()}
        </div>
        <div className="mt-1 text-[11px] text-slate-400">Total units booked</div>
      </div>

      {/* 3. Issue (Dispatched) */}
      <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Issued Qty</span>
          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-extrabold text-emerald-800 font-mono">
          {totalIssueQty.toLocaleString()}
        </div>
        <div className="mt-1 text-[11px] text-emerald-600 font-medium">
          {completionRate}% fulfilled
        </div>
      </div>

      {/* 4. Pending */}
      <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending Qty</span>
          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-extrabold text-amber-800 font-mono">
          {totalPendingQty.toLocaleString()}
        </div>
        <div className="mt-1 text-[11px] text-amber-700 font-medium">
          {totalPendingQty > 0 ? 'Awaiting dispatch' : 'All clear'}
        </div>
      </div>

      {/* 5. Total Value */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Value</span>
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <span className="text-xs font-bold font-mono">₹</span>
          </div>
        </div>
        <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono truncate" title={`₹${totalValue.toLocaleString()}`}>
          ₹{totalValue >= 1000000 ? `${(totalValue / 100000).toFixed(2)}L` : totalValue.toLocaleString()}
        </div>
        <div className="mt-1 text-[11px] text-slate-400 font-mono">
          ₹{totalValue.toLocaleString()}
        </div>
      </div>

      {/* 6. Overdue Orders */}
      <div className={`p-4 rounded-2xl border shadow-2xs ${
        overdueOrders > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${
            overdueOrders > 0 ? 'text-rose-700' : 'text-slate-500'
          }`}>
            Overdue
          </span>
          <div className={`p-1.5 rounded-lg ${
            overdueOrders > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
          }`}>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className={`mt-2 text-2xl font-extrabold font-mono ${
          overdueOrders > 0 ? 'text-rose-700' : 'text-slate-900'
        }`}>
          {overdueOrders}
        </div>
        <div className={`mt-1 text-[11px] font-medium ${
          overdueOrders > 0 ? 'text-rose-600' : 'text-slate-400'
        }`}>
          {overdueOrders > 0 ? 'Orders past due date' : 'Zero overdue'}
        </div>
      </div>
    </div>
  );
};
