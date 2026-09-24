import * as XLSX from 'xlsx';
import { StockRecord, StockStatus, RestockPriority, Order, UrgentDeliveryItem, DeadlineUrgency } from '../types';

export const INITIAL_STOCK_RECORDS: StockRecord[] = [
  {
    id: 'stk-101',
    sku: 'PNT-EXT-WTR-20L',
    name: 'Weatherproof Exterior Emulsion 20L',
    category: 'Exterior Emulsion',
    unit: 'Buckets',
    availableStock: 65,
    stockQuantity: 115,
    minimumLimit: 120, // availableStock (65) < minimumLimit (120) -> Yellow Low Stock alert!
    maximumLimit: 400,
    unavailableStock: 50, // Reserved for packing/pending orders
    shortageQuantity: 55, // 120 - 65 = 55
    status: 'Low Stock',
    unitCost: 380,
    supplierName: 'Asian Poly-Chemicals Ltd',
    leadTimeDays: 4,
    lastRestockedDate: '2026-08-25',
    recommendedReorderQty: 250,
    restockPriority: 'High',
    discussionStatus: 'Needs Discussion',
    discussionNotes: 'Current available stock is 65 buckets against minimum 120. Pending orders need 110 units. Expedite order.',
  },
  {
    id: 'stk-102',
    sku: 'PNT-INT-SAT-20L',
    name: 'Super Satin Interior Emulsion 20L',
    category: 'Interior Emulsion',
    unit: 'Buckets',
    availableStock: 40,
    stockQuantity: 90,
    minimumLimit: 100, // availableStock (40) < minimumLimit (100) -> Yellow Low Stock alert!
    maximumLimit: 350,
    unavailableStock: 50,
    shortageQuantity: 60, // 100 - 40 = 60
    status: 'Low Stock',
    unitCost: 320,
    supplierName: 'DecoColor Synthetic Corp',
    leadTimeDays: 3,
    lastRestockedDate: '2026-08-29',
    recommendedReorderQty: 220,
    restockPriority: 'Urgent',
    discussionStatus: 'Needs Discussion',
    discussionNotes: 'Very high demand from Kaveri Paints & Apex Builders. Stock is critically below minimum threshold.',
  },
  {
    id: 'stk-103',
    sku: 'PRM-ZINC-EPX-10L',
    name: 'Zinc Phosphate Epoxy Primer 10L',
    category: 'Industrial Primers',
    unit: 'Cans',
    availableStock: 25,
    stockQuantity: 55,
    minimumLimit: 75, // availableStock (25) < minimumLimit (75) -> Yellow Low Stock alert!
    maximumLimit: 250,
    unavailableStock: 30,
    shortageQuantity: 50, // 75 - 25 = 50
    status: 'Low Stock',
    unitCost: 340,
    supplierName: 'RustShield Chemical Industries',
    leadTimeDays: 5,
    lastRestockedDate: '2026-08-15',
    recommendedReorderQty: 180,
    restockPriority: 'Urgent',
    discussionStatus: 'Approved by Purchase',
    discussionNotes: 'Metro & Kolkata clients waiting for deliveries. Approved reorder of 180 cans with RustShield.',
  },
  {
    id: 'stk-104',
    sku: 'ENM-SYN-GLS-BLK-4L',
    name: 'High Gloss Synthetic Enamel Black 4L',
    category: 'Enamel Paints',
    unit: 'Tins',
    availableStock: 15,
    stockQuantity: 45,
    minimumLimit: 80, // availableStock (15) < minimumLimit (80) -> Yellow Low Stock alert!
    maximumLimit: 300,
    unavailableStock: 30,
    shortageQuantity: 65, // 80 - 15 = 65
    status: 'Low Stock',
    unitCost: 460,
    supplierName: 'Evergloss Coatings Pvt Ltd',
    leadTimeDays: 6,
    lastRestockedDate: '2026-08-10',
    recommendedReorderQty: 200,
    restockPriority: 'Urgent',
    discussionStatus: 'Needs Discussion',
    discussionNotes: 'Stock nearing exhaustion (only 15 available). Sri Rama Color World delivery is delayed due to stock shortage.',
  },
  {
    id: 'stk-105',
    sku: 'PRM-RED-OXI-20L',
    name: 'Anti-Corrosive Red Oxide Primer 20L',
    category: 'Industrial Primers',
    unit: 'Drums',
    availableStock: 35,
    stockQuantity: 65,
    minimumLimit: 60, // availableStock (35) < minimumLimit (60) -> Yellow Low Stock alert!
    maximumLimit: 200,
    unavailableStock: 30,
    shortageQuantity: 25, // 60 - 35 = 25
    status: 'Low Stock',
    unitCost: 410,
    supplierName: 'RustShield Chemical Industries',
    leadTimeDays: 4,
    lastRestockedDate: '2026-08-20',
    recommendedReorderQty: 120,
    restockPriority: 'High',
    discussionStatus: 'Needs Discussion',
    discussionNotes: 'Review minimum safety batch with purchase committee. Lead time 4 days.',
  },
  {
    id: 'stk-106',
    sku: 'PUT-ACR-WLL-40KG',
    name: 'Acrylic Wall Putty 40kg',
    category: 'Wall Putty & Prep',
    unit: 'Bags',
    availableStock: 180,
    stockQuantity: 240,
    minimumLimit: 100, // availableStock (180) >= minimumLimit (100) -> Healthy/Optimal!
    maximumLimit: 500,
    unavailableStock: 60,
    shortageQuantity: 0,
    status: 'Optimal',
    unitCost: 260,
    supplierName: 'Shree Cement & Polymers',
    leadTimeDays: 2,
    lastRestockedDate: '2026-09-08',
    recommendedReorderQty: 0,
    restockPriority: 'Low',
    discussionStatus: 'Supplier Confirmed',
    discussionNotes: 'Stock is healthy and well above minimum limit.',
  },
  {
    id: 'stk-107',
    sku: 'FLR-EPX-GRY-20L',
    name: 'Heavy Duty Epoxy Floor Coating Grey 20L',
    category: 'Epoxy & Heavy Industrial',
    unit: 'Sets',
    availableStock: 20,
    stockQuantity: 50,
    minimumLimit: 70, // availableStock (20) < minimumLimit (70) -> Yellow Low Stock alert!
    maximumLimit: 250,
    unavailableStock: 30,
    shortageQuantity: 50, // 70 - 20 = 50
    status: 'Low Stock',
    unitCost: 580,
    supplierName: 'Indo-German Industrial Polymers',
    leadTimeDays: 7,
    lastRestockedDate: '2026-08-12',
    recommendedReorderQty: 150,
    restockPriority: 'Urgent',
    discussionStatus: 'PO Raised',
    discussionNotes: 'PO #PO-IND-884 issued to Indo-German Polymers for 150 sets. Expected delivery next Tuesday.',
  },
  {
    id: 'stk-108',
    sku: 'WTR-ACR-SLR-20L',
    name: 'Waterproof Acrylic Sealer 20L',
    category: 'Waterproofing',
    unit: 'Buckets',
    availableStock: 140,
    stockQuantity: 180,
    minimumLimit: 80, // availableStock (140) >= minimumLimit (80) -> Healthy!
    maximumLimit: 300,
    unavailableStock: 40,
    shortageQuantity: 0,
    status: 'Optimal',
    unitCost: 310,
    supplierName: 'AquaSeal Tech India',
    leadTimeDays: 3,
    lastRestockedDate: '2026-09-05',
    recommendedReorderQty: 0,
    restockPriority: 'Low',
    discussionStatus: 'Supplier Confirmed',
    discussionNotes: 'Stock sufficient for ongoing construction orders.',
  },
  {
    id: 'stk-109',
    sku: 'POL-RUB-SWP-20L',
    name: 'Chlorinated Rubber Swimming Pool Paint 20L',
    category: 'Specialty Coatings',
    unit: 'Buckets',
    availableStock: 10,
    stockQuantity: 30,
    minimumLimit: 40, // availableStock (10) < minimumLimit (40) -> Yellow Low Stock alert!
    maximumLimit: 120,
    unavailableStock: 20,
    shortageQuantity: 30, // 40 - 10 = 30
    status: 'Low Stock',
    unitCost: 480,
    supplierName: 'HydroCoat Specialties',
    leadTimeDays: 6,
    lastRestockedDate: '2026-08-01',
    recommendedReorderQty: 80,
    restockPriority: 'High',
    discussionStatus: 'Needs Discussion',
    discussionNotes: 'Shree Krishna Paints order requires 80 buckets. Urgent meeting needed with procurement.',
  },
  {
    id: 'stk-110',
    sku: 'VRN-PLY-CLR-5L',
    name: 'Polyurethane Clear Wood Varnish 5L',
    category: 'Wood Finishes',
    unit: 'Cans',
    availableStock: 18,
    stockQuantity: 38,
    minimumLimit: 50, // availableStock (18) < minimumLimit (50) -> Yellow Low Stock alert!
    maximumLimit: 150,
    unavailableStock: 20,
    shortageQuantity: 32, // 50 - 18 = 32
    status: 'Low Stock',
    unitCost: 460,
    supplierName: 'TimberShine Products',
    leadTimeDays: 4,
    lastRestockedDate: '2026-08-18',
    recommendedReorderQty: 90,
    restockPriority: 'Medium',
    discussionStatus: 'Needs Discussion',
    discussionNotes: 'Stock is below 50 cans threshold. Discuss batch size with supplier for volume discount.',
  },
  {
    id: 'stk-111',
    sku: 'THN-EPI-GEN-20L',
    name: 'Epoxy General Purpose Thinner T-100 20L',
    category: 'Thinners & Solvents',
    unit: 'Drums',
    availableStock: 210,
    stockQuantity: 230,
    minimumLimit: 80,
    maximumLimit: 250,
    unavailableStock: 20,
    shortageQuantity: 0,
    status: 'Optimal',
    unitCost: 190,
    supplierName: 'Solvent Chem India',
    leadTimeDays: 2,
    lastRestockedDate: '2026-09-12',
    recommendedReorderQty: 0,
    restockPriority: 'Low',
    discussionStatus: 'Supplier Confirmed',
    discussionNotes: 'Adequate stock maintained in drum yard.',
  },
  {
    id: 'stk-112',
    sku: 'PRM-RUST-RED-20L',
    name: 'Anti-Rust Red Oxide Primer 20L',
    category: 'Industrial Primers',
    unit: 'Drums',
    availableStock: 22,
    stockQuantity: 42,
    minimumLimit: 50, // availableStock (22) < minimumLimit (50) -> Yellow Low Stock alert!
    maximumLimit: 180,
    unavailableStock: 20,
    shortageQuantity: 28, // 50 - 22 = 28
    status: 'Low Stock',
    unitCost: 395,
    supplierName: 'RustShield Chemical Industries',
    leadTimeDays: 4,
    lastRestockedDate: '2026-08-22',
    recommendedReorderQty: 100,
    restockPriority: 'High',
    discussionStatus: 'Needs Discussion',
    discussionNotes: 'Kolkata West branch has pending order for 30 units. Immediate order proposal.',
  },
  {
    id: 'stk-113',
    sku: 'MAR-CT-HVR-20L',
    name: 'Marine Grade High Build Chlorinated Finish 20L',
    category: 'Marine Coatings',
    unit: 'Drums',
    availableStock: 5,
    stockQuantity: 25,
    minimumLimit: 40, // availableStock (5) < minimumLimit (40) -> Yellow Low Stock alert!
    maximumLimit: 120,
    unavailableStock: 20,
    shortageQuantity: 35, // 40 - 5 = 35
    status: 'Critical Shortage',
    unitCost: 650,
    supplierName: 'OceanTech Marine Coatings',
    leadTimeDays: 10,
    lastRestockedDate: '2026-07-28',
    recommendedReorderQty: 80,
    restockPriority: 'Urgent',
    discussionStatus: 'Needs Discussion',
    discussionNotes: 'Critical shortage! Coastal Shipyards repeat order expected. Lead time is 10 days.',
  },
  {
    id: 'stk-114',
    sku: 'FLR-SLF-LVL-GRN-20KG',
    name: 'Self-Levelling Polyurethane Floor Screed Green 20kg',
    category: 'Epoxy & Heavy Industrial',
    unit: 'Bags',
    availableStock: 85,
    stockQuantity: 95,
    minimumLimit: 50,
    maximumLimit: 200,
    unavailableStock: 10,
    shortageQuantity: 0,
    status: 'Optimal',
    unitCost: 520,
    supplierName: 'Indo-German Industrial Polymers',
    leadTimeDays: 5,
    lastRestockedDate: '2026-09-02',
    recommendedReorderQty: 0,
    restockPriority: 'Low',
    discussionStatus: 'Supplier Confirmed',
    discussionNotes: 'Stock sufficient for next 30 days.',
  }
];

/**
 * Calculates current customer pending demand for an item from all orders
 */
export function calculateItemPendingFromOrders(itemName: string, orders: Order[]): number {
  let pendingCount = 0;
  for (const order of orders) {
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        if (item.name.trim().toLowerCase() === itemName.trim().toLowerCase()) {
          pendingCount += item.pending || 0;
        }
      }
    }
  }
  return pendingCount;
}

/**
 * Dynamically updates stock record values based on minimum limits and pending demand
 */
export function getUpdatedStockRecord(record: StockRecord, orders: Order[]): StockRecord {
  const pendingFromOrders = calculateItemPendingFromOrders(record.name, orders);
  
  // Total stock is available stock + unavailable stock
  const stockQuantity = record.availableStock + record.unavailableStock;
  
  // Shortage below minimum limit
  const deficitBelowMin = Math.max(0, record.minimumLimit - record.availableStock);
  
  // Also account for customer demand that cannot be fulfilled immediately
  const deficitAgainstDemand = Math.max(0, pendingFromOrders - record.availableStock);
  
  // Overall shortage is the max needed to restore minimum safety or meet pending orders
  const shortageQuantity = Math.max(deficitBelowMin, deficitAgainstDemand);

  // Status calculation
  let status: StockStatus = 'Optimal';
  if (record.availableStock === 0) {
    status = 'Critical Shortage';
  } else if (record.availableStock < record.minimumLimit) {
    status = 'Low Stock'; // MUST BE YELLOW DISPLAY!
  } else if (record.availableStock > record.maximumLimit) {
    status = 'Overstock';
  }

  // Restock Priority calculation
  let restockPriority: RestockPriority = 'Low';
  if (record.availableStock === 0 || shortageQuantity >= record.minimumLimit * 0.5 || deficitAgainstDemand > 0) {
    restockPriority = 'Urgent';
  } else if (record.availableStock < record.minimumLimit) {
    restockPriority = deficitBelowMin >= record.minimumLimit * 0.3 ? 'High' : 'Medium';
  }

  // Recommended Reorder Qty (bring to maximum capacity or economic batch)
  const recommendedReorderQty = record.availableStock < record.minimumLimit
    ? Math.max(50, Math.ceil((record.maximumLimit - record.availableStock) / 10) * 10)
    : 0;

  return {
    ...record,
    stockQuantity,
    shortageQuantity,
    status,
    restockPriority: record.restockPriority || restockPriority,
    recommendedReorderQty: record.recommendedReorderQty ?? recommendedReorderQty,
  };
}

/**
 * Calculate Summary Metrics for Stock
 */
export function calculateStockOverviewMetrics(stockList: StockRecord[], orders: Order[]) {
  let totalItems = stockList.length;
  let itemsBelowMinimum = 0; // Yellow Alert count!
  let itemsInShortage = 0;
  let totalAvailableStockUnits = 0;
  let totalStockQuantityUnits = 0;
  let totalUnavailableUnits = 0;
  let totalShortageUnits = 0;
  let estimatedReorderCost = 0;

  stockList.forEach((item) => {
    const updated = getUpdatedStockRecord(item, orders);
    totalAvailableStockUnits += updated.availableStock;
    totalStockQuantityUnits += updated.stockQuantity;
    totalUnavailableUnits += updated.unavailableStock;
    totalShortageUnits += updated.shortageQuantity;
    estimatedReorderCost += (updated.recommendedReorderQty || 0) * updated.unitCost;

    if (updated.availableStock < updated.minimumLimit) {
      itemsBelowMinimum++;
    }
    if (updated.shortageQuantity > 0) {
      itemsInShortage++;
    }
  });

  return {
    totalItems,
    itemsBelowMinimum,
    itemsInShortage,
    totalAvailableStockUnits,
    totalStockQuantityUnits,
    totalUnavailableUnits,
    totalShortageUnits,
    estimatedReorderCost,
  };
}

/**
 * Calculate Urgent Deliveries for Deadline Dashboard
 * Local anchor date: 2026-09-18
 */
export function calculateUrgentDeliveries(orders: Order[], stockList: StockRecord[]): UrgentDeliveryItem[] {
  const TODAY_STR = '2026-09-18';
  const today = new Date(TODAY_STR);

  // Map stock name to available qty
  const stockMap = new Map<string, number>();
  stockList.forEach((s) => {
    stockMap.set(s.name.trim().toLowerCase(), s.availableStock);
  });

  const urgentItems: UrgentDeliveryItem[] = [];

  // Filter orders that have pending units to dispatch
  const pendingOrders = orders.filter((o) => o.pending > 0);

  for (const order of pendingOrders) {
    const dueDate = new Date(order.dueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let urgency: DeadlineUrgency = 'Scheduled (Later)';
    if (daysRemaining < 0) {
      urgency = 'Overdue';
    } else if (daysRemaining === 0) {
      urgency = 'Due Today';
    } else if (daysRemaining >= 1 && daysRemaining <= 3) {
      urgency = 'Urgent (1-3 Days)';
    } else if (daysRemaining >= 4 && daysRemaining <= 7) {
      urgency = 'Upcoming (4-7 Days)';
    }

    // Check stock readiness for this order
    const stockShortages: { itemName: string; requiredQty: number; availableQty: number; deficit: number }[] = [];
    let isStockReady = true;

    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        if (item.pending > 0) {
          const available = stockMap.get(item.name.trim().toLowerCase()) ?? 0;
          if (available < item.pending) {
            isStockReady = false;
            stockShortages.push({
              itemName: item.name,
              requiredQty: item.pending,
              availableQty: available,
              deficit: item.pending - available,
            });
          }
        }
      }
    }

    urgentItems.push({
      order,
      urgency,
      daysRemaining,
      isStockReady,
      stockShortages,
    });
  }

  // Sort: Overdue first (most overdue first), then Due Today, then Urgent, etc.
  return urgentItems.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Downloads the Shortage and Reorder Decisions report in Excel format (.xlsx)
 */
export function exportReorderDecisionsToExcel(stockList: StockRecord[], orders: Order[]) {
  // Filter items that need discussion or have shortage or below minimum
  const reorderList = stockList
    .map((item) => getUpdatedStockRecord(item, orders))
    .filter((item) => item.availableStock < item.minimumLimit || item.shortageQuantity > 0 || item.discussionStatus === 'Needs Discussion');

  const rows = reorderList.map((item, idx) => {
    const pendingDemand = calculateItemPendingFromOrders(item.name, orders);
    const totalRestockEst = (item.recommendedReorderQty || 0) * item.unitCost;
    const isBelowMin = item.availableStock < item.minimumLimit;

    return {
      'S.No': idx + 1,
      'Restock Priority': item.restockPriority || 'Medium',
      'Item SKU': item.sku,
      'Item Name': item.name,
      'Category': item.category,
      'Available Stock': item.availableStock,
      'Min Limit (Threshold)': item.minimumLimit,
      'Max Limit (Capacity)': item.maximumLimit,
      'Total Stock Qty': item.stockQuantity,
      'Unavailable Stock': item.unavailableStock,
      'Stock Shortage Qty': item.shortageQuantity,
      'Below Minimum Alert': isBelowMin ? 'YES (BELOW MINIMUM)' : 'NO',
      'Customer Pending Demand': pendingDemand,
      'Recommended Reorder Qty': item.recommendedReorderQty || 0,
      'Unit Cost (₹)': item.unitCost,
      'Est. Restock Value (₹)': totalRestockEst,
      'Lead Time (Days)': item.leadTimeDays || 'N/A',
      'Supplier / Vendor': item.supplierName || 'N/A',
      'Discussion Status': item.discussionStatus || 'Needs Discussion',
      'Discussion / Decision Notes': item.discussionNotes || '',
      'Report Date': new Date().toISOString().slice(0, 10),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Column widths
  worksheet['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 18 }, // Restock Priority
    { wch: 20 }, // Item SKU
    { wch: 38 }, // Item Name
    { wch: 22 }, // Category
    { wch: 16 }, // Available Stock
    { wch: 20 }, // Min Limit
    { wch: 20 }, // Max Limit
    { wch: 16 }, // Total Stock Qty
    { wch: 18 }, // Unavailable Stock
    { wch: 18 }, // Stock Shortage Qty
    { wch: 22 }, // Below Minimum Alert
    { wch: 24 }, // Customer Pending Demand
    { wch: 24 }, // Recommended Reorder Qty
    { wch: 14 }, // Unit Cost
    { wch: 20 }, // Est. Restock Value
    { wch: 16 }, // Lead Time
    { wch: 30 }, // Supplier
    { wch: 22 }, // Discussion Status
    { wch: 45 }, // Discussion Notes
    { wch: 14 }, // Report Date
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reorder Decisions');

  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Shortage_and_Reorder_Decisions_${timestamp}.xlsx`);
}

/**
 * Ensures all distinct items present in the orders list exist in the Stock catalog.
 * If new items appear in an uploaded Excel file, they are auto-added to the Stock inventory.
 */
export function syncStockWithOrders(currentStock: StockRecord[], orders: Order[]): StockRecord[] {
  const stockMap = new Map<string, StockRecord>();
  currentStock.forEach((s) => {
    stockMap.set(s.name.trim().toLowerCase(), s);
  });

  const updatedStock = [...currentStock];

  orders.forEach((order) => {
    if (order.items && order.items.length > 0) {
      order.items.forEach((item) => {
        const key = item.name.trim().toLowerCase();
        if (!stockMap.has(key) && item.name.trim() !== '') {
          // Generate a clean SKU
          const cleanCode = item.name
            .replace(/[^a-zA-Z0-9]/g, '')
            .slice(0, 8)
            .toUpperCase();
          const sku = `PNT-${cleanCode || 'GEN'}-NEW`;

          // Inferred default limits
          const estimatedDemand = item.quantity || 50;
          const minLimit = Math.max(30, Math.round(estimatedDemand * 0.5));
          const maxLimit = Math.max(minLimit * 3, 200);
          const availableStock = Math.round(minLimit * 0.7); // slightly below min to trigger attention if demand exists
          const unavailableStock = Math.min(availableStock, Math.round(item.pending * 0.5));

          const newRecord: StockRecord = {
            id: `stk-dyn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            sku,
            name: item.name.trim(),
            category: 'Coatings & Paint Materials',
            unit: item.unit || 'Units',
            availableStock,
            stockQuantity: availableStock + unavailableStock,
            minimumLimit: minLimit,
            maximumLimit: maxLimit,
            unavailableStock,
            shortageQuantity: Math.max(0, minLimit - availableStock),
            status: availableStock < minLimit ? 'Low Stock' : 'Optimal',
            unitCost: Math.round(item.rate * 0.75) || 350,
            supplierName: 'Associated Paint Chem Supplier',
            leadTimeDays: 4,
            lastRestockedDate: '2026-09-01',
            recommendedReorderQty: Math.max(50, maxLimit - availableStock),
            restockPriority: availableStock < minLimit ? 'High' : 'Medium',
            discussionStatus: 'Needs Discussion',
            discussionNotes: `Auto-registered from order ${order.voucherNumber} for ${order.companyName}. Pending requirement: ${item.pending} units.`,
          };

          stockMap.set(key, newRecord);
          updatedStock.push(newRecord);
        }
      });
    }
  });

  return updatedStock;
}
