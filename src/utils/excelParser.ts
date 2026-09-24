import * as XLSX from 'xlsx';
import { Order, OrderItem } from '../types';
import customerMaster from '../data/customerMaster.json';

const normalizePartyName = (value: string) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const AREA_BY_PARTY = new Map<string, string>((customerMaster as Array<{partyName:string; areaCode:string}>).map(c => [normalizePartyName(c.partyName), c.areaCode]));
const getMasterAreaCode = (companyName: string) => AREA_BY_PARTY.get(normalizePartyName(companyName)) || '';

// Normalize spreadsheet headers so imports work across spaces, punctuation and casing.
// Example: "Order Quantity", "order_quantity" and "ORDER-QTY" can be matched reliably.
function cleanHeader(value: string): string {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export interface ParseExcelResult {
  orders: Order[];
  sheetNames: string[];
  totalRows: number;
  internalDuplicatesCount: number;
  duplicateVouchers: string[];
  error?: string;
}

// Convert Excel dates (either serial number or string) to YYYY-MM-DD
export function formatExcelDate(raw: any): string {
  if (raw === undefined || raw === null || String(raw).trim() === '') return '';

  if (typeof raw === 'number') {
    // Excel serial date to JS Date
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + raw * 86400000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  const str = String(raw).trim();
  // If DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // If already YYYY-MM-DD
  const yyyymmdd = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (yyyymmdd) {
    const year = yyyymmdd[1];
    const month = yyyymmdd[2].padStart(2, '0');
    const day = yyyymmdd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return str;
}

function isMargSalesOrderReport(matrix:any[][]):boolean {
  // MARG uses both "SALES ORDER FROM ... TO ..." and "SALES ORDER AS ON ...".
  return matrix.some(row=>row.some(cell=>String(cell??'').toUpperCase().includes('SALES ORDER')))
    && matrix.some(row=>String(row?.[0]??'').trim().toUpperCase()==='ORDER NO.');
}

function isMargSalesBillReport(matrix:any[][]):boolean {
  return matrix.some(row=>row.some(cell=>/\bSALE FROM\b/i.test(String(cell??''))))
    && matrix.some(row=>cleanHeader(String(row?.[0]??''))==='billno');
}

function lastNumber(value:any):number {
  const matches=String(value??'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/g);
  return matches?.length ? Number(matches[matches.length-1]) : 0;
}

function parseMargSalesOrderReport(matrix:any[][],sheetNames:string[], billReport=false):ParseExcelResult {
  const orders:Order[]=[]; let current:Order|null=null; let currentDate=''; let itemCounter=0; let sourceRows=0;
  const dateOnly=/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/;
  for(let r=0;r<matrix.length;r++){
    const row=matrix[r]||[]; const a=String(row[0]??'').trim(); const b=String(row[1]??'').trim();
    if(dateOnly.test(a)){currentDate=formatExcelDate(a);continue}
    if((billReport ? /^SK-/i : /^OB-/i).test(a)){
      const value=lastNumber(row[6])||lastNumber(row[2]);
      const salesPerson=(String(row[2]??'').match(/^\s*([A-Z]+)-?/)?.[1]||'').trim();
      current={id:`marg-sales-${a}-${orders.length}`,companyName:b,voucherNumber:billReport?'':a,skNumber:billReport?a:'',date:currentDate,orderQuantity:0,issue:0,pending:0,rate:0,value,dueDate:currentDate,partyOrderNumber:'',area:getMasterAreaCode(b)||'Not Assigned',salesPerson,items:[],status:billReport?'Completed':'Pending'};
      orders.push(current); sourceRows++; continue;
    }
    if(current && !a && /^\s*\d+\s+/.test(b)){
      const detail=String(row[3]??'').trim(); const value=Number(String(row[5]??'').replace(/,/g,''))||0; const rate=lastNumber(detail);
      const quantity=parseMargQuantity(detail.split(/\s+[A-Za-z]+\s+/)[0],rate,value);
      const unit=detail.match(/\s([A-Za-z]+)\s+-?\d+(?:\.\d+)?\s*$/)?.[1]||'';
      const name=`${b.replace(/^\s*\d+\s+/,'').trim()}${String(row[2]??'').trim()?` ${String(row[2]).trim()}`:''}`.trim();
      const issued=billReport?quantity:0; const pending=billReport?0:quantity;
      current.items.push({id:`marg-sales-item-${itemCounter++}`,name,quantity,issue:issued,pending,rate,value:value||quantity*rate,unit});
      current.orderQuantity+=quantity; current.issue+=issued; current.pending+=pending; sourceRows++;
    }
  }
  for(const order of orders){
    if(!order.value)order.value=order.items.reduce((sum,item)=>sum+item.value,0);
    order.rate=order.orderQuantity?order.value/order.orderQuantity:0;
  }
  return {orders,sheetNames,totalRows:sourceRows,internalDuplicatesCount:0,duplicateVouchers:[]};
}


// Parse numbers from MARG ERP reports. MARG may export quantities as values such as
// "10:0.000" (pack/loose notation). When possible, Value / Rate is the most reliable
// base-unit quantity, so that is used for these formatted quantities.
function parseMargQuantity(raw: any, rate = 0, value = 0): number {
  const text = String(raw ?? '').trim();
  if (!text) return 0;
  const normal = Number(text.replace(/,/g, ''));
  if (Number.isFinite(normal)) return normal;
  if (text.includes(':') && rate > 0 && value > 0) {
    const calculated = value / rate;
    if (Number.isFinite(calculated)) return calculated;
  }
  const first = Number(text.split(':')[0]);
  return Number.isFinite(first) ? first : 0;
}

function parseMargDate(raw: any, referenceDate?: string): string {
  const text = String(raw ?? '').trim();
  if (!text) return referenceDate || new Date().toISOString().slice(0, 10);
  const partial = text.match(/^(\d{1,2})-(\d{1,2})-?$/);
  if (partial) {
    const year = referenceDate?.slice(0, 4) || String(new Date().getFullYear());
    return `${year}-${partial[2].padStart(2, '0')}-${partial[1].padStart(2, '0')}`;
  }
  return formatExcelDate(raw);
}

function isMargPendingOrderReport(matrix: any[][]): boolean {
  return matrix.some((row) =>
    row.some((cell) => String(cell ?? '').toUpperCase().includes('ALL PENDING ORDERS (SALES)'))
  ) && matrix.some((row) =>
    row.some((cell) => cleanHeader(String(cell ?? '')) === 'itemname') &&
    row.some((cell) => cleanHeader(String(cell ?? '')) === 'entryno')
  );
}

function parseMargPendingOrderReport(matrix: any[][], sheetNames: string[]): ParseExcelResult {
  let currentCompany = '';
  const grouped = new Map<string, Order>();
  let itemCounter = 0;
  let sourceRows = 0;
  const todayStr = new Date().toISOString().slice(0, 10);

  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const cells = row.map((v) => String(v ?? '').trim());
    const itemName = cells[1] || '';
    const entryNo = cells[2] || '';
    const datedRaw = cells[3] || '';

    // A MARG party/company heading is a mostly-text row immediately before its item rows.
    // It can appear in column A or B depending on page/export formatting.
    if (!entryNo.startsWith('OB-')) {
      const next = (matrix[r + 1] || []).map((v) => String(v ?? '').trim());
      const nextIsItem = String(next[2] || '').startsWith('OB-');
      if (nextIsItem) {
        const candidate = (cells[0] || cells[1] || '').trim();
        const upper = candidate.toUpperCase();
        if (candidate && upper !== 'ABC' && !upper.includes('ITEM NAME') && !upper.includes('ALL PENDING ORDERS')) {
          currentCompany = candidate;
        }
      }
      continue;
    }

    sourceRows++;
    const companyName = currentCompany || 'Unassigned Party';
    const date = parseMargDate(datedRaw);
    const rate = Number(String(cells[7] || '0').replace(/,/g, '')) || 0;
    const value = Number(String(cells[8] || '0').replace(/,/g, '')) || 0;
    const quantity = parseMargQuantity(cells[4], rate, value);
    const pending = parseMargQuantity(cells[6], rate, value);
    // Issue in this report is normally numeric. If it is blank, derive it from order - pending.
    const issueRaw = Number(String(cells[5] || '').replace(/,/g, ''));
    const issue = Number.isFinite(issueRaw) ? issueRaw : Math.max(0, quantity - pending);
    const dueDate = parseMargDate(cells[9], date);
    const partyOrderNumber = cells[10] || '';
    const voucherNumber = entryNo;
    const groupKey = `${companyName.toLowerCase()}___${voucherNumber.toLowerCase()}___${partyOrderNumber.toLowerCase()}`;

    const item: OrderItem = {
      id: `marg-item-${itemCounter++}`,
      name: itemName || 'Unnamed Item',
      quantity,
      issue,
      pending,
      rate,
      value: value || quantity * rate,
      unit: 'Units',
    };

    const existing = grouped.get(groupKey);
    if (existing) {
      existing.items.push(item);
      existing.orderQuantity += quantity;
      existing.issue += issue;
      existing.pending += pending;
      existing.value += item.value;
      if (!existing.partyOrderNumber && partyOrderNumber) existing.partyOrderNumber = partyOrderNumber;
      if (dueDate && dueDate < existing.dueDate) existing.dueDate = dueDate;
    } else {
      grouped.set(groupKey, {
        id: `marg-order-${grouped.size + 1}`,
        companyName,
        voucherNumber,
        date,
        orderQuantity: quantity,
        issue,
        pending,
        rate,
        value: item.value,
        dueDate,
        partyOrderNumber,
        area: getMasterAreaCode(companyName) || 'Not Assigned',
        salesPerson: 'Not Provided',
        items: [item],
        status: 'Pending',
      });
    }
  }

  const orders = Array.from(grouped.values()).map((order) => {
    order.rate = order.orderQuantity > 0 ? order.value / order.orderQuantity : 0;
    if (order.pending <= 0 && order.orderQuantity > 0) order.status = 'Completed';
    else if (order.dueDate < todayStr && order.pending > 0) order.status = 'Overdue';
    else if (order.issue > 0 && order.pending > 0) order.status = 'Partial';
    else order.status = 'Pending';
    return order;
  });

  return {
    orders,
    sheetNames,
    totalRows: sourceRows,
    internalDuplicatesCount: Math.max(0, sourceRows - orders.reduce((n, o) => n + o.items.length, 0)),
    duplicateVouchers: [],
  };
}

// Parse uploaded excel file buffer with duplicate detection
export function parseExcelFile(fileData: ArrayBuffer): ParseExcelResult {
  try {
    const workbook = XLSX.read(fileData, { type: 'array' });
    const sheetNames = workbook.SheetNames;
    if (!sheetNames || sheetNames.length === 0) {
      return { orders: [], sheetNames: [], totalRows: 0, internalDuplicatesCount: 0, duplicateVouchers: [], error: 'The Excel workbook has no sheets.' };
    }

    const firstSheet = workbook.Sheets[sheetNames[0]];

    // MARG ERP pending-order exports are report-style sheets: company names are section
    // headings and item rows sit underneath them. They are not ordinary header-row tables.
    const matrix = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1, defval: '', raw: false });
    if (isMargSalesBillReport(matrix)) {
      return parseMargSalesOrderReport(matrix, sheetNames, true);
    }
    if (isMargSalesOrderReport(matrix)) {
      return parseMargSalesOrderReport(matrix, sheetNames);
    }
    if (isMargPendingOrderReport(matrix)) {
      return parseMargPendingOrderReport(matrix, sheetNames);
    }

    const headerNames=new Set(['companyname','company','partyname','party','customer','client','vouchernumber','voucherno','orderno','date','orderdate','itemname','item']);
    const headerRow=matrix.findIndex(row=>row.filter(cell=>headerNames.has(cleanHeader(String(cell??'')))).length>=2);
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '', range:headerRow>=0?headerRow:0 });

    if (!rawRows || rawRows.length === 0) {
      return { orders: [], sheetNames, totalRows: 0, internalDuplicatesCount: 0, duplicateVouchers: [], error: 'The active sheet contains no rows or data.' };
    }

    const rawParsedOrders: Order[] = [];
    const todayStr = new Date().toISOString().slice(0, 10);

    rawRows.forEach((row, index) => {
      // Find matching keys dynamically
      const keys = Object.keys(row);

      const findValue = (possibleNames: string[]): any => {
        const cleanPossibles = possibleNames.map(cleanHeader);
        for (const key of keys) {
          const cleanK = cleanHeader(key);
          if (cleanPossibles.includes(cleanK)) {
            return row[key];
          }
        }
        return undefined;
      };

      const companyName = String(findValue(['company name', 'company', 'party name', 'party', 'customer', 'client']) || '').trim();
      const voucherNumber = String(findValue(['voucher number', 'voucher no', 'vocher number', 'vocher no', 'voucher', 'vocher', 'bill no', 'inv no','order no','order number']) || '').trim();
      const skNumber = String(findValue(['sk number', 'sk no', 'sknumber', 'skno']) || '').trim();
      if(!companyName&&!voucherNumber&&!skNumber)return;
      const date = formatExcelDate(findValue(['date', 'order date', 'orderdate', 'booking date']));
      
      const rawOrderQty = parseFloat(String(findValue(['order quantity', 'order qty', 'orderquantity', 'orderqty', 'qty', 'quantity', 'total qty']) || '0'));
      const orderQuantity = isNaN(rawOrderQty) ? 0 : rawOrderQty;

      const rawIssue = parseFloat(String(findValue(['issue', 'issued', 'issued quantity', 'issued qty', 'dispatch', 'dispatched']) || '0'));
      const issue = isNaN(rawIssue) ? 0 : rawIssue;

      let pending = orderQuantity - issue;
      const rawPending = parseFloat(String(findValue(['pending', 'pending quantity', 'pending qty', 'balance']) || ''));
      if (!isNaN(rawPending) && rawPending >= 0) {
        pending = rawPending;
      }
      if (pending < 0) pending = 0;

      const rawRate = parseFloat(String(findValue(['rate', 'unit rate', 'price', 'unit price']) || '0'));
      const rate = isNaN(rawRate) ? 0 : rawRate;

      let value = parseFloat(String(findValue(['value', 'total value', 'amount', 'total amount']) || '0'));
      if (isNaN(value) || value <= 0) {
        value = orderQuantity * rate;
      }

      const dueDate = formatExcelDate(findValue(['due date', 'duedate', 'deadline', 'deadline date', 'delivery date', 'deliverydate']));
      const partyOrderNumber = String(findValue(['party order number', 'party order no', 'partyordernumber', 'partyorderno', 'party order', 'po number', 'po no', 'ponumber']) || '').trim();
      
      const excelArea = String(findValue(['area', 'region', 'location', 'city', 'zone', 'place']) || '').trim();
      const area = excelArea || getMasterAreaCode(companyName) || 'Not Assigned';
      const salesPerson = String(findValue(['sales person', 'salesperson', 'sales rep', 'executive', 'agent', 'staff']) || '').trim();

      // Items parsing: could be column 'items' or 'item name'
      const rawItems = findValue(['items', 'item', 'item name', 'products', 'product', 'materials', 'material']);

      let items: OrderItem[] = [];
      if (rawItems && String(rawItems).trim() !== '') {
        const itemStr = String(rawItems);
        // Might be comma separated e.g. "Gloss White (10), Primer (5)" or simply "Weatherproof Exterior Paint"
        const parts = itemStr.split(/[;,]/).map(s => s.trim()).filter(Boolean);
        if (parts.length > 1) {
          const perItemQty = Math.max(1, Math.round(orderQuantity / parts.length));
          const perItemIssue = Math.max(0, Math.round(issue / parts.length));
          items = parts.map((part, pIdx) => {
            const match = part.match(/^(.*?)\s*\((\d+)\)$/);
            const name = match ? match[1].trim() : part;
            const q = match ? parseInt(match[2], 10) : perItemQty;
            const iss = Math.min(q, perItemIssue);
            const pend = Math.max(0, q - iss);
            return {
              id: `item-${index}-${pIdx}`,
              name,
              quantity: q,
              issue: iss,
              pending: pend,
              rate: rate,
              value: q * rate,
              unit: 'Units',
            };
          });
        } else {
          items = [
            {
              id: `item-${index}-0`,
              name: parts[0] || '',
              quantity: orderQuantity,
              issue: issue,
              pending: pending,
              rate: rate,
              value: value,
              unit: 'Units',
            },
          ];
        }
      } else {
        items = [
          {
            id: `item-${index}-0`,
            name: '',
            quantity: orderQuantity,
            issue: issue,
            pending: pending,
            rate: rate,
            value: value,
            unit: 'Units',
          },
        ];
      }

      // Compute status
      let status: 'Completed' | 'Partial' | 'Pending' | 'Overdue' = 'Pending';
      if (pending === 0 && orderQuantity > 0) {
        status = 'Completed';
      } else if (issue > 0 && pending > 0) {
        status = 'Partial';
      } else if (dueDate < todayStr && pending > 0) {
        status = 'Overdue';
      }

      rawParsedOrders.push({
        id: `ord-uploaded-${index + 1}`,
        companyName,
        voucherNumber,
        skNumber,
        date,
        orderQuantity,
        issue,
        pending,
        rate,
        value,
        dueDate,
        partyOrderNumber,
        area,
        salesPerson,
        status,
        items,
      });
    });

    // Remove internal duplicates from the same uploaded file
    const uniqueOrdersMap = new Map<string, Order>();
    const duplicateVouchers: string[] = [];
    let internalDuplicatesCount = 0;

    for (const order of rawParsedOrders) {
      const key = getOrderDeduplicationKey(order);
      if (uniqueOrdersMap.has(key)) {
        internalDuplicatesCount++;
        duplicateVouchers.push(order.voucherNumber || order.partyOrderNumber || `Row with ${order.companyName}`);
        // Keep the latest record for this key or merge
        uniqueOrdersMap.set(key, order);
      } else {
        uniqueOrdersMap.set(key, order);
      }
    }

    const orders = Array.from(uniqueOrdersMap.values());

    return {
      orders,
      sheetNames,
      totalRows: rawParsedOrders.length,
      internalDuplicatesCount,
      duplicateVouchers: Array.from(new Set(duplicateVouchers)),
    };
  } catch (err: any) {
    return {
      orders: [],
      sheetNames: [],
      totalRows: 0,
      internalDuplicatesCount: 0,
      duplicateVouchers: [],
      error: err.message || 'Failed to parse Excel file.'
    };
  }
}

export interface MergeCalculation {
  mergedOrders: Order[];
  incomingTotal: number;
  internalDuplicatesRemoved: number;
  existingDuplicatesMatched: number;
  newOrdersAdded: number;
  finalTotal: number;
}

/**
 * Deduplicate and merge incoming orders with existing orders, or replace cleanly.
 */
export function deduplicateAndMergeOrders(
  incomingOrders: Order[],
  existingOrders: Order[],
  mode: 'merge' | 'replace'
): MergeCalculation {
  if (mode === 'replace') {
    return {
      mergedOrders: incomingOrders,
      incomingTotal: incomingOrders.length,
      internalDuplicatesRemoved: 0,
      existingDuplicatesMatched: 0,
      newOrdersAdded: incomingOrders.length,
      finalTotal: incomingOrders.length,
    };
  }

  // Merge mode:
  const mergedMap = new Map<string, Order>();
  let existingDuplicatesMatched = 0;
  let newOrdersAdded = 0;

  // 1. Seed with existing orders
  existingOrders.forEach((order) => {
    const key = getOrderDeduplicationKey(order);
    mergedMap.set(key, order);
  });

  // 2. Add or update with incoming orders
  incomingOrders.forEach((newOrder) => {
    const key = getOrderDeduplicationKey(newOrder);
    if (mergedMap.has(key)) {
      existingDuplicatesMatched++;
      // Update existing order with the newer incoming data, preserving id if preferred
      const existing = mergedMap.get(key)!;
      mergedMap.set(key, {
        ...newOrder,
        id: existing.id, // keep stable id
      });
    } else {
      newOrdersAdded++;
      mergedMap.set(key, newOrder);
    }
  });

  const mergedOrders = Array.from(mergedMap.values());

  return {
    mergedOrders,
    incomingTotal: incomingOrders.length,
    internalDuplicatesRemoved: 0,
    existingDuplicatesMatched,
    newOrdersAdded,
    finalTotal: mergedOrders.length,
  };
}

// Download blank Orders Import Template XLSX
export function downloadOrdersImportTemplate(): void {
  const headers = [{
    'Company Name':'','Voucher Number':'','SK Number':'','Date':'','Order Quantity':'','Issue':'','Pending':'','Rate':'','Value':'','Due Date':'','Party Order Number':'','Area':'','Sales Person':'','Items':''
  }];
  const ws = XLSX.utils.json_to_sheet(headers);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Orders Import');
  XLSX.writeFile(wb, 'ABC_Paints_Orders_Import_Template.xlsx');
}

// Export current filtered orders list to XLSX
export function exportOrdersToExcel(orders: Order[], fileName = 'Orders_Export.xlsx'): void {
  const exportData = orders.map((o) => ({
    'Company Name': o.companyName,
    'Voucher Number': o.voucherNumber,
    'SK Number': o.skNumber || '',
    'Date': o.date,
    'Order Quantity': o.orderQuantity,
    'Issue': o.issue,
    'Pending': o.pending,
    'Rate': o.rate,
    'Value': o.value,
    'Due Date': o.dueDate,
    'Party Order Number': o.partyOrderNumber,
    'Area': o.area,
    'Sales Person': o.salesPerson,
    'Status': o.status,
    'Items Count': o.items.length,
    'Items Summary': o.items.map(i => `${i.name} (${i.quantity})`).join('; '),
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Filtered Orders');

  XLSX.writeFile(wb, fileName);
}

export function getOrderDeduplicationKey(order: any): string {
  const party = String(order?.partyName || order?.companyName || order?.company || '').trim().toLowerCase();
  const voucher = String(order?.voucherNumber || order?.voucherNo || order?.orderNumber || order?.orderNo || order?.entryNumber || '').trim().toLowerCase();
  const sk = String(order?.skNumber || order?.skNo || '').trim().toLowerCase();
  const po = String(order?.partyOrderNumber || order?.partyOrderNo || order?.poNumber || '').trim().toLowerCase();
  return `${party}|${voucher || sk}|${po}`;
}
