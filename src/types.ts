export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  issue: number;
  pending: number;
  rate: number;
  value: number;
  unit?: string;
}

export interface Order {
  id: string;
  companyName: string;
  voucherNumber: string;
  date: string;
  orderQuantity: number;
  issue: number;
  pending: number;
  rate: number;
  value: number;
  dueDate: string;
  partyOrderNumber: string;
  area: string;
  salesPerson: string;
  items: OrderItem[];
  status?: 'Completed' | 'Partial' | 'Pending' | 'Overdue';
  notes?: string;
  skNumber?: string;
  /** Workflow marker: dispatch moves the order to RTG; RTG completion moves it to Finished. */
  rtg?: boolean;
  /** Excel/import file this order most recently came from. */
  sourceFile?: string;
  /** Previous quantities saved when a user action finishes an order, enabling one-click Undo. */
  completionUndo?: { issue: number; pending: number; status?: 'Completed' | 'Partial' | 'Pending' | 'Overdue'; items: OrderItem[]; skNumber?: string; rtg?: boolean };
}

export type FilterCategory = 'area' | 'areaClass' | 'party' | 'deadline' | 'salesPerson' | 'item';

export interface ActiveFilters {
  areas: string[];
  areaClasses: ('Local' | 'Transport')[];
  parties: string[];
  deadlineRanges: string[]; // e.g. 'overdue', 'next-7-days', 'next-15-days', 'this-month', or specific YYYY-MM-DD
  salesPersons: string[];
  items: string[];
  customAreas: string[];
  customParties: string[];
  customSalesPersons: string[];
  customItems: string[];
  customDeadlines: string[];
  searchQuery: string;
}

// Stock & Inventory Types
export type StockStatus = 'Low Stock' | 'Critical Shortage' | 'Optimal' | 'Overstock';

export type RestockPriority = 'Urgent' | 'High' | 'Medium' | 'Low';

export type ReorderDiscussionStatus =
  | 'Needs Discussion'
  | 'Approved by Purchase'
  | 'PO Raised'
  | 'Supplier Confirmed'
  | 'Deferred';

export interface StockRecord {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  availableStock: number;        // How much stock is currently available for issue/dispatch
  stockQuantity: number;         // Total stock quantity = availableStock + unavailableStock
  minimumLimit: number;          // Minimum safety threshold
  maximumLimit: number;          // Maximum storage capacity
  unavailableStock: number;      // Reserved for pending orders, damaged, QA inspection, or in-transit
  shortageQuantity: number;      // Shortage below minimum or customer demand deficit
  status: StockStatus;           // Status of stock ('Low Stock' | 'Critical Shortage' | 'Optimal' | 'Overstock')
  unitCost: number;              // Unit purchase/cost price in ₹
  supplierName?: string;
  leadTimeDays?: number;
  lastRestockedDate?: string;
  recommendedReorderQty?: number;
  restockPriority?: RestockPriority;
  discussionStatus?: ReorderDiscussionStatus;
  discussionNotes?: string;
}

export type DeadlineUrgency = 'Overdue' | 'Due Today' | 'Urgent (1-3 Days)' | 'Upcoming (4-7 Days)' | 'Scheduled (Later)';

export interface UrgentDeliveryItem {
  order: Order;
  urgency: DeadlineUrgency;
  daysRemaining: number; // Negative if overdue, 0 if today, positive if future
  isStockReady: boolean;
  stockShortages: { itemName: string; requiredQty: number; availableQty: number; deficit: number }[];
}
