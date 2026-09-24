import { Order } from '../types';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if an order date matches today's date in local time or ISO format.
 */
export function isOrderToday(orderDateStr: string | undefined): boolean {
  if (!orderDateStr) return false;
  const trimmed = orderDateStr.trim();
  const todayStr = getTodayDateString();

  // Direct match YYYY-MM-DD
  if (trimmed === todayStr) return true;

  // Check if DD-MM-YYYY or DD/MM/YYYY
  const parts = trimmed.split(/[-/]/);
  if (parts.length === 3) {
    // If format is YYYY-MM-DD
    if (parts[0].length === 4) {
      const formatted = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      if (formatted === todayStr) return true;
    }
    // If format is DD-MM-YYYY
    else if (parts[2].length === 4) {
      const formatted = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      if (formatted === todayStr) return true;
    }
  }

  // Parse Date object fallback
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const now = new Date();
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    }
  } catch {
    // ignore
  }

  return false;
}

/**
 * Checks if an order is unfinished (pending quantity > 0 or status is not completed)
 */
export function isOrderUnfinished(order: Order): boolean {
  if (order.pending > 0) return true;
  if (order.status && order.status !== 'Completed') return true;
  return false;
}

/**
 * Calculates metrics summary for orders: today orders, unfinished orders, finished orders
 */
export function calculateOrderMetrics(orders: Order[]) {
  let todayCount = 0;
  let todayValue = 0;
  let todayPendingQty = 0;

  let unfinishedCount = 0;
  let unfinishedPendingQty = 0;
  let unfinishedValue = 0;

  let finishedCount = 0;
  let finishedValue = 0;

  orders.forEach((ord) => {
    const today = isOrderToday(ord.date);
    const unfinished = isOrderUnfinished(ord);

    if (today) {
      todayCount += 1;
      todayValue += ord.value;
      todayPendingQty += ord.pending;
    }

    if (unfinished) {
      unfinishedCount += 1;
      unfinishedPendingQty += ord.pending;
      unfinishedValue += ord.value;
    } else {
      finishedCount += 1;
      finishedValue += ord.value;
    }
  });

  return {
    totalCount: orders.length,
    todayCount,
    todayValue,
    todayPendingQty,
    unfinishedCount,
    unfinishedPendingQty,
    unfinishedValue,
    finishedCount,
    finishedValue,
  };
}

/** Parse common order-date formats used by MARG/Excel. */
export function parseOrderDate(value: string | undefined): Date | null {
  if (!value) return null;
  const s = String(value).trim();
  const p = s.split(/[-/]/);
  if (p.length === 3) {
    if (p[0].length === 4) {
      const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
      return isNaN(d.getTime()) ? null : d;
    }
    if (p[2].length === 4) {
      const d = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
      return isNaN(d.getTime()) ? null : d;
    }
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Business rule: an unfinished order becomes overdue after 3 calendar days from order date. */
export function isOverdueAfterThreeDays(order: Order, now = new Date()): boolean {
  if (!isOrderUnfinished(order)) return false;
  const ordered = parseOrderDate(order.date);
  if (!ordered) return order.status === 'Overdue';
  ordered.setHours(0, 0, 0, 0);
  const deadline = new Date(ordered);
  deadline.setDate(deadline.getDate() + 3);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return today > deadline;
}

export function orderThreeDayDeadline(order: Order): string {
  const ordered = parseOrderDate(order.date);
  if (!ordered) return order.dueDate || '—';
  ordered.setDate(ordered.getDate() + 3);
  const y = ordered.getFullYear();
  const m = String(ordered.getMonth() + 1).padStart(2, '0');
  const d = String(ordered.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function applyOrderLifecycle(order: Order): Order {
  if (order.pending <= 0 || order.status === 'Completed') {
    return { ...order, pending: 0, status: 'Completed' };
  }
  if (isOverdueAfterThreeDays(order)) return { ...order, status: 'Overdue' };
  if (order.issue > 0 && order.pending > 0) return { ...order, status: 'Partial' };
  return { ...order, status: 'Pending' };
}
