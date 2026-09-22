import React, { useState, useMemo } from 'react';
import { Order, StockRecord, UrgentDeliveryItem, DeadlineUrgency } from '../types';
import { calculateUrgentDeliveries } from '../utils/stockData';
import {
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Calendar,
  Building,
  User,
  MapPin,
  Package,
  Search,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  Filter
} from 'lucide-react';

interface DeadlineDashboardProps {
  orders: Order[];
  stockRecords: StockRecord[];
  onSelectCompany: (company: string) => void;
  onNavigateToStock?: () => void;
  onNavigateToReorder?: () => void;
}

export const DeadlineDashboard: React.FC<DeadlineDashboardProps> = ({
  orders,
  stockRecords,
  onSelectCompany,
  onNavigateToStock,
  onNavigateToReorder,
}) => {
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all-urgent');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'ready' | 'shortage'>('all');

  // Compute urgent delivery items with live stock readiness
  const urgentDeliveries = useMemo(() => {
    return calculateUrgentDeliveries(orders, stockRecords);
  }, [orders, stockRecords]);

  // Breakdown statistics
  const stats = useMemo(() => {
    let overdueCount = 0;
    let overdueValue = 0;
    let dueTodayCount = 0;
    let dueTodayValue = 0;
    let urgent1to3Count = 0;
    let upcomingCount = 0;
    let shortageBlockedCount = 0;

    urgentDeliveries.forEach((item) => {
      const pendingVal = item.order.pending * item.order.rate;
      if (item.urgency === 'Overdue') {
        overdueCount++;
        overdueValue += pendingVal;
      } else if (item.urgency === 'Due Today') {
        dueTodayCount++;
        dueTodayValue += pendingVal;
      } else if (item.urgency === 'Urgent (1-3 Days)') {
        urgent1to3Count++;
      } else if (item.urgency === 'Upcoming (4-7 Days)') {
        upcomingCount++;
      }

      if (!item.isStockReady) {
        shortageBlockedCount++;
      }
    });

    return {
      totalPendingDeliveries: urgentDeliveries.length,
      overdueCount,
      overdueValue,
      dueTodayCount,
      dueTodayValue,
      urgent1to3Count,
      upcomingCount,
      shortageBlockedCount,
    };
  }, [urgentDeliveries]);

  // Filtered deliveries
  const filteredDeliveries = useMemo(() => {
    return urgentDeliveries.filter((item) => {
      // Urgency filter
      let matchesUrgency = true;
      if (urgencyFilter === 'all-urgent') {
        matchesUrgency =
          item.urgency === 'Overdue' ||
          item.urgency === 'Due Today' ||
          item.urgency === 'Urgent (1-3 Days)';
      } else if (urgencyFilter === 'overdue') {
        matchesUrgency = item.urgency === 'Overdue';
      } else if (urgencyFilter === 'today') {
        matchesUrgency = item.urgency === 'Due Today';
      } else if (urgencyFilter === 'urgent-3') {
        matchesUrgency = item.urgency === 'Urgent (1-3 Days)';
      } else if (urgencyFilter === 'all') {
        matchesUrgency = true;
      }

      // Stock status filter
      let matchesStock = true;
      if (stockStatusFilter === 'ready') {
        matchesStock = item.isStockReady;
      } else if (stockStatusFilter === 'shortage') {
        matchesStock = !item.isStockReady;
      }

      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        item.order.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.order.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.order.partyOrderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.order.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.order.salesPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.order.items.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesUrgency && matchesStock && matchesSearch;
    });
  }, [urgentDeliveries, urgencyFilter, stockStatusFilter, searchQuery]);

  return (
    <div id="deadline-dashboard-section" className="space-y-4">
      {/* Deadline Header Banner - Decent Clean Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 text-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs border border-slate-200">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              Delivery Commitment Radar
            </span>
            <h2 id="deadline-dashboard-heading" className="text-base sm:text-lg font-semibold text-slate-900">
              Urgent Delivery &amp; Deadline Dashboard
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Live deadline tracking sorted by critical delivery commitments, overdue vouchers, and inventory fulfillment readiness.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>Current Date Anchor: <strong className="text-slate-900">2026-09-18</strong></span>
        </div>
      </div>

      {/* 4 Urgency Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Overdue Deliveries */}
        <div
          onClick={() => setUrgencyFilter(urgencyFilter === 'overdue' ? 'all-urgent' : 'overdue')}
          className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-white transition-all cursor-pointer shadow-2xs hover:bg-slate-50/70"
          title="Click to filter Overdue Deliveries"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Overdue Deliveries</span>
            <div className="p-1.5 bg-rose-50 text-rose-700 rounded-lg">
              <Flame className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-rose-700 flex items-baseline gap-1.5">
            <span>{stats.overdueCount}</span>
            <span className="text-xs font-normal text-rose-600 font-sans">orders past due</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400 font-mono">
            Pending: ₹{stats.overdueValue.toLocaleString()}
          </div>
        </div>

        {/* Metric 2: Due Today */}
        <div
          onClick={() => setUrgencyFilter(urgencyFilter === 'today' ? 'all-urgent' : 'today')}
          className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-white transition-all cursor-pointer shadow-2xs hover:bg-slate-50/70"
          title="Click to filter Deliveries Due Today"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Due Today</span>
            <div className="p-1.5 bg-amber-50 text-amber-800 rounded-lg">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-amber-900 flex items-baseline gap-1.5">
            <span>{stats.dueTodayCount}</span>
            <span className="text-xs font-normal text-amber-700 font-sans">deliveries today</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400 font-mono">
            Pending: ₹{stats.dueTodayValue.toLocaleString()}
          </div>
        </div>

        {/* Metric 3: Next 1-3 Days */}
        <div
          onClick={() => setUrgencyFilter(urgencyFilter === 'urgent-3' ? 'all-urgent' : 'urgent-3')}
          className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-white transition-all cursor-pointer shadow-2xs hover:bg-slate-50/70"
          title="Click to filter Deliveries in Next 1-3 Days"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Urgent (1-3 Days)</span>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-slate-900">
            {stats.urgent1to3Count} <span className="text-xs font-normal text-slate-500">Orders</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">Due Sep 19 - Sep 21</div>
        </div>

        {/* Metric 4: Stock Readiness Shortage Blockers */}
        <div
          onClick={() => setStockStatusFilter(stockStatusFilter === 'shortage' ? 'all' : 'shortage')}
          className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-white transition-all cursor-pointer shadow-2xs hover:bg-slate-50/70"
          title="Click to view deliveries blocked by insufficient available stock"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Stock Shortage Alert</span>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-slate-900 flex items-baseline gap-1.5">
            <span>{stats.shortageBlockedCount}</span>
            <span className="text-xs font-normal text-slate-500 font-sans">blocked orders</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            {onNavigateToReorder ? (
              <span className="hover:underline text-slate-700 font-medium">Needs restock discussion &rarr;</span>
            ) : (
              'Available stock &lt; pending demand'
            )}
          </div>
        </div>
      </div>

      {/* Deliveries Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Filter Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Filter Urgent Deliveries:
              </span>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              Showing <strong>{filteredDeliveries.length}</strong> of {urgentDeliveries.length} pending deliveries
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            {/* Urgency Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setUrgencyFilter('all-urgent')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 ${
                  urgencyFilter === 'all-urgent'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Urgent ({stats.overdueCount + stats.dueTodayCount + stats.urgent1to3Count})
              </button>

              <button
                type="button"
                onClick={() => setUrgencyFilter('overdue')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 ${
                  urgencyFilter === 'overdue'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                }`}
              >
                <Flame className="w-3 h-3 text-rose-500" />
                <span>Overdue ({stats.overdueCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setUrgencyFilter('today')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 ${
                  urgencyFilter === 'today'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                }`}
              >
                <Clock className="w-3 h-3 text-amber-600" />
                <span>Due Today ({stats.dueTodayCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setUrgencyFilter('urgent-3')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 ${
                  urgencyFilter === 'urgent-3'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                1-3 Days ({stats.urgent1to3Count})
              </button>

              <button
                type="button"
                onClick={() => setUrgencyFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 ${
                  urgencyFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Orders ({urgentDeliveries.length})
              </button>
            </div>

            {/* Stock Shortage Filter Toggle & Search */}
            <div className="flex items-center gap-2">
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value as any)}
                className="text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="all">All Stock Statuses</option>
                <option value="ready">✅ Stock Ready for Dispatch</option>
                <option value="shortage">⚠️ Stock Shortage Blocked</option>
              </select>

              <div className="relative min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search customer, area, item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Deliveries List / Table */}
        <div className="divide-y divide-slate-200/80">
          {filteredDeliveries.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-slate-800 text-sm">No deliveries match the selected urgency criteria.</p>
              <p className="text-xs text-slate-400 mt-1">All urgent deliveries are handled or scheduled for future dates.</p>
            </div>
          ) : (
            filteredDeliveries.map((item) => {
              const { order, urgency, daysRemaining, isStockReady, stockShortages } = item;
              const pendingVal = order.pending * order.rate;

              // Card styling depending on urgency
              let urgencyBadgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
              let borderLeftClass = 'border-l-4 border-l-slate-400';
              let countdownText = `${daysRemaining} days remaining`;

              if (urgency === 'Overdue') {
                urgencyBadgeClass = 'bg-rose-100 text-rose-950 border-rose-300 font-black';
                borderLeftClass = 'border-l-4 border-l-rose-500 bg-rose-50/20';
                countdownText = `OVERDUE BY ${Math.abs(daysRemaining)} DAY${Math.abs(daysRemaining) > 1 ? 'S' : ''}!`;
              } else if (urgency === 'Due Today') {
                urgencyBadgeClass = 'bg-amber-100 text-amber-950 border-amber-400 font-black';
                borderLeftClass = 'border-l-4 border-l-amber-500 bg-amber-50/20';
                countdownText = 'DISPATCH DUE TODAY (CRITICAL)';
              } else if (urgency === 'Urgent (1-3 Days)') {
                urgencyBadgeClass = 'bg-blue-100 text-blue-950 border-blue-300 font-bold';
                borderLeftClass = 'border-l-4 border-l-blue-500';
                countdownText = `Due in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`;
              } else if (urgency === 'Upcoming (4-7 Days)') {
                urgencyBadgeClass = 'bg-slate-100 text-slate-800 border-slate-200';
                borderLeftClass = 'border-l-4 border-l-slate-400';
                countdownText = `Due in ${daysRemaining} days`;
              }

              return (
                <div
                  key={order.id}
                  id={`urgent-delivery-${order.id}`}
                  className={`p-4 sm:p-5 hover:bg-slate-50/80 transition-colors ${borderLeftClass}`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Left Column: Party, Voucher, Dates, Urgency */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Urgency Pill */}
                        <span className={`px-2.5 py-1 rounded-full text-[11px] border shadow-2xs flex items-center gap-1 ${urgencyBadgeClass}`}>
                          {urgency === 'Overdue' ? (
                            <Flame className="w-3 h-3 text-rose-600" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          <span>{countdownText}</span>
                        </span>

                        {/* Stock Readiness Pill */}
                        {isStockReady ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Stock Ready for Dispatch</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-yellow-200 text-yellow-950 border border-yellow-400 shadow-2xs flex items-center gap-1 ring-1 ring-yellow-400">
                            <AlertTriangle className="w-3 h-3 text-yellow-800" />
                            <span>Stock Shortage Blocked</span>
                          </span>
                        )}

                        <span className="text-xs text-slate-400 font-mono">
                          Voucher: <strong className="text-slate-700">{order.voucherNumber}</strong>
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          PO: {order.partyOrderNumber}
                        </span>
                      </div>

                      {/* Party Name Clickable */}
                      <div>
                        <button
                          type="button"
                          onClick={() => onSelectCompany(order.companyName)}
                          className="text-left font-bold text-base sm:text-lg text-slate-900 hover:text-blue-700 transition-colors inline-flex items-center gap-1.5 group"
                          title="Click to view all items and history for this company"
                        >
                          <span>{order.companyName}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                        </button>

                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{order.area}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>Rep: {order.salesPerson}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Booked: {order.date}</span>
                          </span>
                          <span>•</span>
                          <span className="font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Due Deadline: {order.dueDate}
                          </span>
                        </div>
                      </div>

                      {/* Items in Delivery */}
                      <div className="bg-slate-100/80 rounded-xl p-3 border border-slate-200/80 text-xs">
                        <div className="font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Package className="w-3.5 h-3.5 text-slate-500" />
                            <span>Items Pending Dispatch:</span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {order.items.length} Product Line{order.items.length > 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {order.items.map((it) => {
                            const isShortageItem = stockShortages.some(
                              (s) => s.itemName.toLowerCase() === it.name.toLowerCase()
                            );

                            return (
                              <div
                                key={it.id}
                                className={`flex items-center justify-between text-xs py-1 px-2 rounded-lg ${
                                  isShortageItem
                                    ? 'bg-yellow-100/90 text-yellow-950 font-medium border border-yellow-300'
                                    : 'bg-white text-slate-800 border border-slate-200/60'
                                }`}
                              >
                                <span className="font-medium truncate max-w-[280px] sm:max-w-md">
                                  {it.name}
                                </span>
                                <div className="flex items-center gap-3 font-mono shrink-0">
                                  <span className="text-slate-500">
                                    Ordered: {it.quantity} {it.unit || 'units'}
                                  </span>
                                  <span className="text-emerald-700 font-semibold">
                                    Issued: {it.issue}
                                  </span>
                                  <span className="font-black text-rose-800 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                    Pending: {it.pending} {it.unit || 'units'}
                                  </span>
                                  {isShortageItem && (
                                    <span className="text-[10px] font-extrabold uppercase text-yellow-900 bg-yellow-200 px-1.5 py-0.5 rounded">
                                      SHORTAGE
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Shortage Warning Box if blocked */}
                        {!isStockReady && stockShortages.length > 0 && (
                          <div className="mt-2 p-2 bg-yellow-200/70 border border-yellow-400 rounded-lg text-xs text-yellow-950 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-800 shrink-0 mt-0.5" />
                            <div>
                              <strong>Inventory Shortage Warning:</strong> Current available warehouse stock cannot fulfill this delivery.
                              <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-[11px]">
                                {stockShortages.map((s, idx) => (
                                  <li key={idx}>
                                    <strong>{s.itemName}</strong>: Need {s.requiredQty}, but only {s.availableQty} available (Deficit: -{s.deficit})
                                  </li>
                                ))}
                              </ul>
                              {onNavigateToReorder && (
                                <button
                                  type="button"
                                  onClick={onNavigateToReorder}
                                  className="mt-1 text-[11px] font-bold text-yellow-950 underline hover:text-black inline-flex items-center gap-1"
                                >
                                  Take to Reorder Decisions Workspace &rarr;
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Quantities, Pending Value, Actions */}
                    <div className="flex flex-row lg:flex-col items-end justify-between lg:justify-start gap-3 shrink-0 text-right">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Pending Dispatch Qty
                        </div>
                        <div className="text-2xl font-black font-mono text-rose-800">
                          {order.pending.toLocaleString()} <span className="text-xs font-normal text-slate-500">units</span>
                        </div>
                        <div className="text-xs font-mono font-semibold text-slate-700 mt-0.5">
                          Pending Val: ₹{pendingVal.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Total Order Val: ₹{order.value.toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectCompany(order.companyName)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors shadow-2xs"
                        >
                          <Building className="w-3.5 h-3.5" />
                          <span>Party Details</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
