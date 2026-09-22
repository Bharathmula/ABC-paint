import React, { useState, useMemo } from 'react';
import { Order } from '../types';
import { isOrderToday, isOrderUnfinished, calculateOrderMetrics, isOverdueAfterThreeDays, orderThreeDayDeadline } from '../utils/orderStatus';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  UserCheck,
  Package,
  Layers,
  AlertTriangle
} from 'lucide-react';

interface OrdersTableProps {
  orders: Order[];
  onSelectCompany: (companyName: string) => void;
  onClearFilters?: () => void;
  onCompleteOrder?: (order: Order, skNumber: string) => void;
  onRecordDispatch?: (order: Order, quantity: number, skNumber: string) => void;
  onUndoComplete?: (order: Order) => void;
}

type SortField =
  | 'companyName'
  | 'voucherNumber'
  | 'date'
  | 'orderQuantity'
  | 'issue'
  | 'pending'
  | 'rate'
  | 'value'
  | 'dueDate'
  | 'partyOrderNumber';

type StatusViewFilter = 'all' | 'today' | 'rtg' | 'overdue' | 'unfinished' | 'finished';

export const OrdersTable: React.FC<OrdersTableProps> = ({
  orders,
  onSelectCompany,
  onClearFilters,
  onCompleteOrder,
  onRecordDispatch,
  onUndoComplete,
}) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusViewFilter>('all');
  const [dispatchQty, setDispatchQty] = useState<Record<string, string>>({});
  const [skNumbers, setSkNumbers] = useState<Record<string, string>>({});

  // Overall metrics
  const metrics = useMemo(() => calculateOrderMetrics(orders), [orders]);

  // Filter orders based on the selected Status Tab (All vs Today Orders vs Unfinished Orders vs Finished)
  const displayOrders = useMemo(() => {
    switch (statusFilter) {
      case 'today':
        return orders.filter((o) => isOrderToday(o.date));
      case 'rtg':
        return orders.filter((o) => o.issue > 0 && o.pending > 0);
      case 'overdue':
        return orders.filter((o) => isOverdueAfterThreeDays(o));
      case 'unfinished':
        return orders.filter((o) => isOrderUnfinished(o));
      case 'finished':
        return orders.filter((o) => !isOrderUnfinished(o));
      case 'all':
      default:
        return orders;
    }
  }, [orders, statusFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'companyName' || field === 'voucherNumber');
    }
  };

  const toggleRowExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(expandedOrderIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedOrderIds(newSet);
  };

  const sortedOrders = useMemo(() => {
    return [...displayOrders].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [displayOrders, sortField, sortAsc]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-80" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
    );
  };

  return (
    <div id="orders-list-card" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Title Bar & Quick Status Differentiation Tabs */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 id="orders-list-heading" className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Orders &amp; Packing</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-200/70 text-slate-700">
              {displayOrders.length} {displayOrders.length === 1 ? 'Order' : 'Orders'}
            </span>
          </div>

          <div className="text-xs text-slate-500 hidden sm:block">
            💡 Tip: Click on any <strong className="text-blue-600">Company Name</strong> to view ordered items & quantities
          </div>
        </div>

        {/* View switcher tabs: All Orders | Today's Orders | Unfinished Orders | Finished Orders */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {/* Tab 1: All Orders */}
          <button
            type="button"
            id="tab-all-orders"
            onClick={() => setStatusFilter('all')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all shrink-0 ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Orders</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                statusFilter === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {orders.length}
            </span>
          </button>

          {/* Tab 2: Today's Orders - Differentiated */}
          <button
            type="button"
            id="tab-today-orders"
            onClick={() => setStatusFilter('today')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all shrink-0 ${
              statusFilter === 'today'
                ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300'
                : 'bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 border border-indigo-200'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${statusFilter === 'today' ? 'text-white' : 'text-indigo-600'}`} />
            <span>Today's Orders</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                statusFilter === 'today' ? 'bg-indigo-800 text-white' : 'bg-indigo-200 text-indigo-900'
              }`}
            >
              {metrics.todayCount}
            </span>
          </button>

          <button type="button" onClick={() => setStatusFilter('rtg')} className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl shrink-0 ${statusFilter === 'rtg' ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-900 border border-violet-200'}`}>
            <Package className="w-3.5 h-3.5" /><span>RTG</span>
            <span className="px-1.5 rounded-full text-[10px] font-mono">{orders.filter(o => o.issue > 0 && o.pending > 0).length}</span>
          </button>
          <button type="button" onClick={() => setStatusFilter('overdue')} className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl shrink-0 ${statusFilter === 'overdue' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-900 border border-rose-200'}`}>
            <AlertTriangle className="w-3.5 h-3.5" /><span>Overdue (3+ Days)</span>
            <span className="px-1.5 rounded-full text-[10px] font-mono">{orders.filter(o => isOverdueAfterThreeDays(o)).length}</span>
          </button>

          {/* Tab 3: Unfinished Orders - Differentiated */}
          <button
            type="button"
            id="tab-unfinished-orders"
            onClick={() => setStatusFilter('unfinished')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all shrink-0 ${
              statusFilter === 'unfinished'
                ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-300'
                : 'bg-amber-50/70 hover:bg-amber-100 text-amber-900 border border-amber-200'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${statusFilter === 'unfinished' ? 'text-white' : 'text-amber-600'}`} />
            <span>Unfinished Orders</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                statusFilter === 'unfinished' ? 'bg-amber-800 text-white' : 'bg-amber-200 text-amber-900'
              }`}
            >
              {metrics.unfinishedCount}
            </span>
          </button>

          {/* Tab 4: Finished Orders */}
          <button
            type="button"
            id="tab-finished-orders"
            onClick={() => setStatusFilter('finished')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all shrink-0 ${
              statusFilter === 'finished'
                ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                : 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${statusFilter === 'finished' ? 'text-white' : 'text-emerald-600'}`} />
            <span>Finished Orders</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                statusFilter === 'finished' ? 'bg-emerald-800 text-white' : 'bg-emerald-200 text-emerald-900'
              }`}
            >
              {metrics.finishedCount}
            </span>
          </button>
        </div>

        {/* Informative breakdown strip */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
              <strong>Today's Orders:</strong> {metrics.todayCount} (₹{metrics.todayValue.toLocaleString()})
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-medium text-amber-800">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              <strong>Unfinished Orders:</strong> {metrics.unfinishedCount} ({metrics.unfinishedPendingQty} pending units • ₹{metrics.unfinishedValue.toLocaleString()})
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-medium text-emerald-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <strong>Finished:</strong> {metrics.finishedCount} (₹{metrics.finishedValue.toLocaleString()})
            </span>
          </div>

          {statusFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className="text-blue-600 hover:text-blue-800 font-semibold hover:underline text-[11px]"
            >
              Show All Orders &rarr;
            </button>
          )}
        </div>
      </div>

      {/* Table Container with EXACT 10 COLUMNS */}
      <div className="overflow-x-auto">
        <table id="orders-main-table" className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-2 w-8 text-center"></th>
              {/* 1. Company Name */}
              <th
                onClick={() => handleSort('companyName')}
                className="py-3 px-3.5 cursor-pointer select-none group hover:bg-slate-200/60 transition-colors min-w-[220px]"
              >
                <div className="flex items-center gap-1.5">
                  <span>Company Name</span>
                  {renderSortIcon('companyName')}
                </div>
              </th>

              {/* 2. Voucher Number */}
              <th
                onClick={() => handleSort('voucherNumber')}
                className="py-3 px-3 cursor-pointer select-none group hover:bg-slate-200/60 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Voucher Number</span>
                  {renderSortIcon('voucherNumber')}
                </div>
              </th>

              {/* 3. Date */}
              <th
                onClick={() => handleSort('date')}
                className="py-3 px-3 cursor-pointer select-none group hover:bg-slate-200/60 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Date</span>
                  {renderSortIcon('date')}
                </div>
              </th>

              {/* 4. Order Quantity */}
              <th
                onClick={() => handleSort('orderQuantity')}
                className="py-3 px-3 text-right cursor-pointer select-none group hover:bg-slate-200/60 transition-colors"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Order Quantity</span>
                  {renderSortIcon('orderQuantity')}
                </div>
              </th>

              {/* 5. Issue */}
              <th
                onClick={() => handleSort('issue')}
                className="py-3 px-3 text-right cursor-pointer select-none group hover:bg-slate-200/60 transition-colors text-emerald-800"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Issue</span>
                  {renderSortIcon('issue')}
                </div>
              </th>

              {/* 6. Pending */}
              <th
                onClick={() => handleSort('pending')}
                className="py-3 px-3 text-right cursor-pointer select-none group hover:bg-slate-200/60 transition-colors text-amber-800"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Pending</span>
                  {renderSortIcon('pending')}
                </div>
              </th>

              {/* 7. Rate */}
              <th
                onClick={() => handleSort('rate')}
                className="py-3 px-3 text-right cursor-pointer select-none group hover:bg-slate-200/60 transition-colors"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Rate</span>
                  {renderSortIcon('rate')}
                </div>
              </th>

              {/* 8. Value */}
              <th
                onClick={() => handleSort('value')}
                className="py-3 px-3 text-right cursor-pointer select-none group hover:bg-slate-200/60 transition-colors"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Value</span>
                  {renderSortIcon('value')}
                </div>
              </th>

              {/* 9. Due Date */}
              <th
                onClick={() => handleSort('dueDate')}
                className="py-3 px-3 cursor-pointer select-none group hover:bg-slate-200/60 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>3-Day Deadline</span>
                  {renderSortIcon('dueDate')}
                </div>
              </th>

              {/* 10. Party Order Number */}
              <th
                onClick={() => handleSort('partyOrderNumber')}
                className="py-3 px-4 cursor-pointer select-none group hover:bg-slate-200/60 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Party Order Number</span>
                  {renderSortIcon('partyOrderNumber')}
                </div>
              </th>
              <th className="py-3 px-4 text-center"><span>Action</span></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {sortedOrders.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-8 h-8 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700">
                      {orders.length === 0
                        ? 'No orders in storage. Upload an Excel sheet to populate orders.'
                        : statusFilter === 'today'
                        ? "No orders found for today's date."
                        : statusFilter === 'unfinished'
                        ? 'No unfinished orders found!'
                        : 'No orders match your filter criteria.'}
                    </p>
                    {statusFilter !== 'all' ? (
                      <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className="mt-1 px-4 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        View All Orders
                      </button>
                    ) : (
                      onClearFilters && (
                        <button
                          type="button"
                          onClick={onClearFilters}
                          className="mt-1 px-4 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          Reset All Filters
                        </button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              sortedOrders.map((order) => {
                const isExpanded = expandedOrderIds.has(order.id);
                const isToday = isOrderToday(order.date);
                const isUnfinished = isOrderUnfinished(order);

                // Row border styling for differentiation
                let rowBorderClass = 'border-l-4 border-l-transparent';
                let rowBgClass = '';

                if (isToday) {
                  rowBorderClass = 'border-l-4 border-l-indigo-600';
                  rowBgClass = 'bg-indigo-50/25';
                } else if (isUnfinished) {
                  rowBorderClass = 'border-l-4 border-l-amber-500';
                  rowBgClass = 'bg-amber-50/15';
                } else {
                  rowBorderClass = 'border-l-4 border-l-emerald-500';
                }

                return (
                  <React.Fragment key={order.id}>
                    <tr
                      id={`order-row-${order.id}`}
                      className={`hover:bg-blue-50/50 transition-colors group ${rowBorderClass} ${rowBgClass} ${
                        isExpanded ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      {/* Expand toggle */}
                      <td className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={(e) => toggleRowExpand(order.id, e)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
                          title="Toggle item details preview"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>

                      {/* 1. Company Name - CLICKABLE TO VIEW ITEMS & QUANTITY + Differentiated Badges */}
                      <td className="py-3 px-3.5 font-medium text-slate-900">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            id={`company-name-btn-${order.id}`}
                            onClick={() => onSelectCompany(order.companyName)}
                            className="text-left font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 group/btn"
                            title={`Click to view all items and quantities for ${order.companyName}`}
                          >
                            <span>{order.companyName}</span>
                            <Eye className="w-3.5 h-3.5 opacity-0 group-hover/btn:opacity-100 transition-opacity text-blue-600 shrink-0" />
                          </button>

                          {/* Differentiation Badge for Today */}
                          {isToday && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                              <Sparkles className="w-2.5 h-2.5 text-indigo-600" /> TODAY'S ORDER
                            </span>
                          )}

                          {/* Differentiation Badge for Unfinished vs Finished */}
                          {isUnfinished ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-2.5 h-2.5 text-amber-600" /> UNFINISHED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> FINISHED
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-normal mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" /> {order.area}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <UserCheck className="w-2.5 h-2.5" /> {order.salesPerson}
                          </span>
                        </div>
                      </td>

                      {/* 2. Voucher Number */}
                      <td className="py-3 px-3 font-mono font-semibold text-slate-700">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                          {order.voucherNumber}
                        </span>
                      </td>

                      {/* 3. Date - Highlighted if Today */}
                      <td className="py-3 px-3 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className={isToday ? 'font-bold text-indigo-700' : 'text-slate-600'}>
                            {order.date}
                          </span>
                          {isToday && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-indigo-600 text-white">
                              TODAY
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Order Quantity */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {order.orderQuantity.toLocaleString()}
                      </td>

                      {/* 5. Issue */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700">
                        {order.issue.toLocaleString()}
                      </td>

                      {/* 6. Pending - Differentiated with Amber Badge */}
                      <td className="py-3 px-3 text-right font-mono font-semibold">
                        {order.pending > 0 ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold border border-amber-300">
                              {order.pending.toLocaleString()}
                            </span>
                            <span className="text-[9px] text-amber-700 font-normal mt-0.5">
                              to issue
                            </span>
                          </div>
                        ) : (
                          <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 0
                          </span>
                        )}
                      </td>

                      {/* 7. Rate */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        ₹{order.rate.toLocaleString()}
                      </td>

                      {/* 8. Value */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{order.value.toLocaleString()}
                      </td>

                      {/* 9. Due Date */}
                      <td className="py-3 px-3 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={
                              isOverdueAfterThreeDays(order)
                                ? 'text-rose-700 font-bold'
                                : order.status === 'Completed'
                                ? 'text-slate-500'
                                : 'text-slate-700'
                            }
                          >
                            {orderThreeDayDeadline(order)}
                          </span>
                          {isOverdueAfterThreeDays(order) && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800">
                              OVERDUE
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 10. Party Order Number */}
                      <td className="py-3 px-4 font-mono text-slate-700">
                        <span className="text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                          {order.partyOrderNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isUnfinished ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <input type="text" value={skNumbers[order.id] ?? order.skNumber ?? ''} onChange={(e) => setSkNumbers(prev => ({...prev, [order.id]: e.target.value}))} placeholder="SK Number *" className="w-24 px-2 py-1.5 rounded-lg border border-slate-300 text-[11px]" />
                            <input type="number" min="1" max={order.pending} value={dispatchQty[order.id] ?? ''} onChange={(e) => setDispatchQty(prev => ({...prev, [order.id]: e.target.value}))} placeholder={`Qty ≤ ${order.pending}`} className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 text-[11px]" />
                            <button type="button" onClick={(e) => { e.stopPropagation(); const q=Number(dispatchQty[order.id]); const sk=(skNumbers[order.id]||order.skNumber||'').trim(); if(q>0&&sk) { onRecordDispatch?.(order, q, sk); setDispatchQty(prev=>({...prev,[order.id]:''})); } }} disabled={!(skNumbers[order.id]||order.skNumber||'').trim()} className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-[11px] font-bold">Dispatch</button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); const sk=(skNumbers[order.id]||order.skNumber||'').trim(); if(sk) onCompleteOrder?.(order,sk); }} disabled={!(skNumbers[order.id]||order.skNumber||'').trim()} className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-[11px] font-bold">Complete</button>
                            {order.completionUndo && <button type="button" onClick={(e)=>{e.stopPropagation();onUndoComplete?.(order)}} className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-[11px] font-bold">Undo</button>}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold"><CheckCircle2 className="w-3.5 h-3.5"/> Finished</span>
                            {order.completionUndo && <button type="button" onClick={(e)=>{e.stopPropagation();onUndoComplete?.(order)}} className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold">Undo</button>}
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Inline expanded item drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90 border-b border-slate-200">
                        <td colSpan={12} className="p-3 sm:px-6">
                          <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 font-semibold text-slate-800">
                                <Package className="w-3.5 h-3.5 text-blue-600" />
                                <span>Items in this Voucher ({order.items.length}):</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => onSelectCompany(order.companyName)}
                                className="text-blue-600 hover:text-blue-800 font-medium hover:underline flex items-center gap-1"
                              >
                                View full history for {order.companyName} &rarr;
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {order.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 bg-slate-50 rounded-lg text-xs flex items-center justify-between border border-slate-100"
                                >
                                  <div className="truncate pr-2">
                                    <div className="font-semibold text-slate-800 truncate">{item.name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      Rate: ₹{item.rate} | Val: ₹{item.value.toLocaleString()}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
                                    <span className="text-slate-600">Qty: <strong>{item.quantity}</strong></span>
                                    <span className="text-emerald-700">Iss: <strong>{item.issue}</strong></span>
                                    <span className={item.pending > 0 ? 'text-amber-700 font-bold bg-amber-50 px-1 rounded' : 'text-slate-400'}>
                                      Pend: <strong>{item.pending}</strong>
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>

          {/* Table Footer Totals */}
          {sortedOrders.length > 0 && (
            <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
              <tr>
                <td className="py-3 px-2"></td>
                <td className="py-3 px-3.5">
                  Total ({sortedOrders.length} Orders)
                </td>
                <td className="py-3 px-3"></td>
                <td className="py-3 px-3"></td>
                {/* Sum of Order Quantity */}
                <td className="py-3 px-3 text-right font-mono text-slate-900">
                  {sortedOrders.reduce((sum, o) => sum + o.orderQuantity, 0).toLocaleString()}
                </td>
                {/* Sum of Issue */}
                <td className="py-3 px-3 text-right font-mono text-emerald-700">
                  {sortedOrders.reduce((sum, o) => sum + o.issue, 0).toLocaleString()}
                </td>
                {/* Sum of Pending */}
                <td className="py-3 px-3 text-right font-mono text-amber-700">
                  {sortedOrders.reduce((sum, o) => sum + o.pending, 0).toLocaleString()}
                </td>
                <td className="py-3 px-3 text-right text-slate-400">—</td>
                {/* Sum of Value */}
                <td className="py-3 px-3 text-right font-mono text-slate-900 font-bold">
                  ₹{sortedOrders.reduce((sum, o) => sum + o.value, 0).toLocaleString()}
                </td>
                <td className="py-3 px-3"></td>
                <td className="py-3 px-4"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
