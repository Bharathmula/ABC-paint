import React, { useMemo } from 'react';
import { Order, OrderItem } from '../types';
import {
  X,
  ArrowLeft,
  Building2,
  Package,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  MapPin,
  UserCheck,
  Hash
} from 'lucide-react';

interface CompanyDetailModalProps {
  companyName: string | null;
  orders: Order[];
  onClose: () => void;
}

export const CompanyDetailModal: React.FC<CompanyDetailModalProps> = ({
  companyName,
  orders,
  onClose,
}) => {
  if (!companyName) return null;

  // Filter all orders for this company
  const companyOrders = useMemo(() => {
    return orders.filter(
      (o) => o.companyName.toLowerCase().trim() === companyName.toLowerCase().trim()
    );
  }, [orders, companyName]);

  // Aggregate items and quantities ordered by this particular company
  const aggregatedItems = useMemo(() => {
    const itemMap = new Map<string, {
      name: string;
      totalOrdered: number;
      totalIssued: number;
      totalPending: number;
      avgRate: number;
      totalValue: number;
      unit: string;
      orderCount: number;
    }>();

    companyOrders.forEach((ord) => {
      ord.items.forEach((item) => {
        const key = item.name.trim();
        const existing = itemMap.get(key);
        if (existing) {
          existing.totalOrdered += item.quantity;
          existing.totalIssued += item.issue;
          existing.totalPending += item.pending;
          existing.totalValue += item.value;
          existing.orderCount += 1;
        } else {
          itemMap.set(key, {
            name: item.name,
            totalOrdered: item.quantity,
            totalIssued: item.issue,
            totalPending: item.pending,
            avgRate: item.rate,
            totalValue: item.value,
            unit: item.unit || 'Units',
            orderCount: 1,
          });
        }
      });
    });

    return Array.from(itemMap.values()).sort((a, b) => b.totalOrdered - a.totalOrdered);
  }, [companyOrders]);

  // Overall statistics for this company
  const stats = useMemo(() => {
    const totalOrders = companyOrders.length;
    const totalOrderedQty = companyOrders.reduce((sum, o) => sum + o.orderQuantity, 0);
    const totalIssuedQty = companyOrders.reduce((sum, o) => sum + o.issue, 0);
    const totalPendingQty = companyOrders.reduce((sum, o) => sum + o.pending, 0);
    const totalValue = companyOrders.reduce((sum, o) => sum + o.value, 0);
    const primaryArea = companyOrders[0]?.area || 'N/A';
    const primarySalesPerson = companyOrders[0]?.salesPerson || 'N/A';

    return {
      totalOrders,
      totalOrderedQty,
      totalIssuedQty,
      totalPendingQty,
      totalValue,
      primaryArea,
      primarySalesPerson,
    };
  }, [companyOrders]);

  return (
    <div
      id="company-detail-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="company-detail-modal-container"
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 gap-3">
          <div className="flex items-start gap-3">
            <button
              type="button"
              id="company-detail-back-btn"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 rounded-xl transition-colors shadow-2xs group shrink-0 mt-1"
              title="Return to Orders List"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-transform group-hover:-translate-x-0.5" />
              <span>Back</span>
            </button>
            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="modal-company-name-title" className="text-xl sm:text-2xl font-bold text-slate-900">
                  {companyName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {stats.totalOrders} {stats.totalOrders === 1 ? 'Order' : 'Orders'}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {stats.primaryArea}
                </span>
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-slate-400" />
                  Sales Rep: <span className="font-medium text-slate-700">{stats.primarySalesPerson}</span>
                </span>
              </div>
            </div>
          </div>
          <button
            id="close-company-detail-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-6 bg-slate-50/40 border-b border-slate-100">
          <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Ordered</div>
            <div className="mt-1 text-xl font-bold text-slate-900 font-mono">
              {stats.totalOrderedQty.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">All items combined</div>
          </div>

          <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 shadow-xs">
            <div className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Dispatched / Issue</div>
            <div className="mt-1 text-xl font-bold text-emerald-800 font-mono">
              {stats.totalIssuedQty.toLocaleString()}
            </div>
            <div className="text-xs text-emerald-600 mt-0.5">
              {stats.totalOrderedQty > 0 ? Math.round((stats.totalIssuedQty / stats.totalOrderedQty) * 100) : 0}% completed
            </div>
          </div>

          <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-100 shadow-xs">
            <div className="text-xs font-medium text-amber-700 uppercase tracking-wider">Pending Delivery</div>
            <div className="mt-1 text-xl font-bold text-amber-800 font-mono">
              {stats.totalPendingQty.toLocaleString()}
            </div>
            <div className="text-xs text-amber-600 mt-0.5">To be dispatched</div>
          </div>

          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 shadow-xs">
            <div className="text-xs font-medium text-blue-700 uppercase tracking-wider">Total Value</div>
            <div className="mt-1 text-xl font-bold text-blue-900 font-mono">
              ₹{stats.totalValue.toLocaleString()}
            </div>
            <div className="text-xs text-blue-600 mt-0.5">Order book value</div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Section 1: Aggregated Items & Quantities Ordered */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Items & Quantities Ordered by {companyName}
                </h3>
              </div>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                {aggregatedItems.length} unique {aggregatedItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="py-3 px-4">Item Name / Product</th>
                    <th className="py-3 px-3 text-right">Order Qty</th>
                    <th className="py-3 px-3 text-right">Issued Qty</th>
                    <th className="py-3 px-3 text-right">Pending Qty</th>
                    <th className="py-3 px-3 text-right">Unit Rate</th>
                    <th className="py-3 px-4 text-right">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aggregatedItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {item.name}
                        {item.unit && (
                          <span className="text-xs font-normal text-slate-400">({item.unit})</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                        {item.totalOrdered.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700 font-medium">
                        {item.totalIssued.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold">
                        {item.totalPending > 0 ? (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                            {item.totalPending.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        ₹{item.avgRate.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{item.totalValue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50/80 border-t border-slate-200 text-xs font-bold text-slate-900">
                  <tr>
                    <td className="py-3 px-4">Total Aggregated</td>
                    <td className="py-3 px-3 text-right font-mono">
                      {stats.totalOrderedQty.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700">
                      {stats.totalIssuedQty.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-700">
                      {stats.totalPendingQty.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-500">—</td>
                    <td className="py-3 px-4 text-right font-mono">
                      ₹{stats.totalValue.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section 2: Associated Vouchers & Orders */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-slate-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Order Vouchers for {companyName}
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {companyOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-2xs"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-blue-700 text-sm bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                        {ord.voucherNumber}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        PO: <span className="text-slate-800 font-medium">{ord.partyOrderNumber}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Date: <span className="font-medium text-slate-700">{ord.date}</span>
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Due: <span className="font-medium text-slate-700">{ord.dueDate}</span>
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-medium ${
                          ord.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : ord.status === 'Overdue'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : ord.status === 'Partial'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>
                  </div>

                  {/* Items in this voucher */}
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                      Voucher Items & Quantities
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ord.items.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs"
                        >
                          <div className="font-medium text-slate-800 truncate pr-2">
                            {it.name}
                          </div>
                          <div className="flex items-center gap-2 font-mono shrink-0">
                            <span className="text-slate-500">Qty: <strong className="text-slate-900">{it.quantity}</strong></span>
                            <span className="text-emerald-700">Iss: <strong>{it.issue}</strong></span>
                            <span className="text-amber-700">Pend: <strong>{it.pending}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 text-xs border-t border-dashed border-slate-200 text-slate-500">
                    <div>
                      Rate: <span className="font-mono text-slate-800">₹{ord.rate}</span>
                    </div>
                    <div>
                      Voucher Total Value:{' '}
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        ₹{ord.value.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            id="modal-footer-back-btn"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Back to Orders List</span>
          </button>
          <button
            id="modal-done-btn"
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
