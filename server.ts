import 'dotenv/config';
import express from 'express';
import { Pool } from 'pg';
import { createServer as createViteServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '15mb' }));
app.use((req,res,next)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.sendStatus(204);
  next();
});

const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl, ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false } }) : null;

async function initDb() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_master (
      code TEXT PRIMARY KEY,
      party_name TEXT NOT NULL,
      area_code TEXT NOT NULL DEFAULT '',
      area_name TEXT,
      classification TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS orders (
      dedup_key TEXT PRIMARY KEY,
      voucher_number TEXT,
      company_name TEXT NOT NULL,
      area_code TEXT NOT NULL DEFAULT '',
      order_data JSONB NOT NULL,
      source_file TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS stock_records (
      id TEXT PRIMARY KEY,
      stock_data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS import_history (
      id BIGSERIAL PRIMARY KEY,
      source_file TEXT NOT NULL,
      import_mode TEXT NOT NULL,
      received_count INTEGER NOT NULL,
      inserted_count INTEGER NOT NULL,
      updated_count INTEGER NOT NULL,
      imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE customer_master ADD COLUMN IF NOT EXISTS classification TEXT;
    ALTER TABLE import_history ADD COLUMN IF NOT EXISTS entity_type TEXT NOT NULL DEFAULT 'orders';
  `);
  const masterPath = path.join(__dirname, 'src/data/customerMaster.json');
  const rows = JSON.parse(fs.readFileSync(masterPath, 'utf8')) as Array<{code:string;partyName:string;areaCode:string}>;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const r of rows) {
      await client.query(`INSERT INTO customer_master(code,party_name,area_code) VALUES($1,$2,$3)
        ON CONFLICT(code) DO UPDATE SET party_name=EXCLUDED.party_name, area_code=EXCLUDED.area_code, updated_at=now()`, [r.code, r.partyName, r.areaCode || '']);
    }
    await client.query(`INSERT INTO import_history(source_file,import_mode,received_count,inserted_count,updated_count,entity_type)
      SELECT 'ABC Paints — 3 Year Analysis.xlsx','seed',$1,$1,0,'areas'
      WHERE NOT EXISTS (SELECT 1 FROM import_history WHERE source_file='ABC Paints — 3 Year Analysis.xlsx' AND entity_type='areas')`,[rows.length]);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

function norm(s='') { return s.toUpperCase().replace(/[^A-Z0-9]/g,''); }
function dedupKey(o:any) {
  const v=String(o.voucherNumber||'').trim().toLowerCase();
  if (v && !v.startsWith('vch-autogen') && v !== 'n/a') return `vch:${v}`;
  const sk=String(o.skNumber||'').trim().toLowerCase();
  if (sk && sk !== 'n/a') return `sk:${sk}`;
  const po=String(o.partyOrderNumber||'').trim().toLowerCase();
  const c=String(o.companyName||'').trim().toLowerCase();
  if (po && po !== 'n/a') return `po:${c}___${po}`;
  return `sig:${c}___${o.date||''}___${o.orderQuantity||0}___${o.value||0}`;
}

app.get('/api/health', async (_req,res) => {
  if (!pool) return res.status(503).json({ok:false, database:false, message:'DATABASE_URL is not configured'});
  try { await pool.query('SELECT 1'); res.json({ok:true,database:true}); } catch(e:any) { res.status(500).json({ok:false,database:false,message:e.message}); }
});

app.get('/api/orders', async (_req,res) => {
  if (!pool) return res.status(503).json({error:'DATABASE_URL is not configured'});
  const q=await pool.query('SELECT order_data FROM orders ORDER BY updated_at DESC');
  res.json(q.rows.map(r=>r.order_data));
});

app.get('/api/areas', async (_req,res) => {
  if (!pool) return res.status(503).json({error:'DATABASE_URL is not configured'});
  const q=await pool.query(`SELECT area_code, COALESCE(MAX(area_name),'') area_name, COUNT(*)::int companies
    FROM customer_master WHERE area_code<>'' GROUP BY area_code ORDER BY area_code`);
  res.json(q.rows);
});

app.get('/api/area-master', async (_req,res) => {
  if (!pool) return res.status(503).json({error:'DATABASE_URL is not configured'});
  const q=await pool.query(`SELECT code,party_name AS "companyName",area_code AS "areaCode",COALESCE(classification,'') classification FROM customer_master ORDER BY area_code,party_name`);
  res.json(q.rows.map((r:any)=>({...r,id:`db-${r.code}`})));
});

app.post('/api/area-master/import', async (req,res) => {
  if (!pool) return res.status(503).json({error:'DATABASE_URL is not configured'});
  const {areas=[],sourceFile='Area upload'}=req.body||{}; const client=await pool.connect(); let updated=0;
  try { await client.query('BEGIN');
    for(const a of areas){const code=String(a.code||a.id||'').replace(/^db-/,'').trim();if(!code)continue;await client.query(`INSERT INTO customer_master(code,party_name,area_code,classification) VALUES($1,$2,$3,$4) ON CONFLICT(code) DO UPDATE SET party_name=EXCLUDED.party_name,area_code=EXCLUDED.area_code,classification=EXCLUDED.classification,updated_at=now()`,[code,a.companyName||'',a.areaCode||'',a.classification||null]);updated++;}
    await client.query(`INSERT INTO import_history(source_file,import_mode,received_count,inserted_count,updated_count,entity_type) VALUES($1,'merge',$2,0,$2,'areas')`,[sourceFile,updated]);
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  res.json({ok:true,updated});
});

app.get('/api/import-history', async (_req,res) => {
  if (!pool) return res.status(503).json({error:'DATABASE_URL is not configured'});
  const q=await pool.query(`SELECT id,source_file AS "sourceFile",import_mode AS "mode",received_count AS "receivedCount",inserted_count AS "insertedCount",updated_count AS "updatedCount",entity_type AS "entityType",imported_at AS "importedAt" FROM import_history ORDER BY imported_at DESC LIMIT 250`);
  res.json(q.rows);
});

app.delete('/api/import-history', async (req,res) => {
  if (!pool) return res.status(503).json({error:'DATABASE_URL is not configured'});
  const ids=(Array.isArray(req.body?.ids)?req.body.ids:[]).map(String).filter((id:string)=>/^\d+$/.test(id));
  if (!ids.length) return res.status(400).json({error:'Select at least one history record'});
  const q=await pool.query('DELETE FROM import_history WHERE id = ANY($1::bigint[]) RETURNING id',[ids]);
  res.json({ok:true,deleted:q.rowCount});
});

app.post('/api/orders/import', async (req,res) => {
  if (!pool) return res.status(503).json({error:'DATABASE_URL is not configured'});
  const {orders=[], sourceFile='Excel Upload', mode='merge'} = req.body || {};
  const masters=(await pool.query('SELECT code,party_name,area_code FROM customer_master')).rows;
  const byParty=new Map(masters.map((m:any)=>[norm(m.party_name),m]));
  const client=await pool.connect(); let inserted=0, updated=0;
  try {
    await client.query('BEGIN');
    if (mode==='replace') await client.query('DELETE FROM orders');
    for (const original of orders) {
      const o={...original};
      const master=byParty.get(norm(o.companyName));
      if (master?.area_code) o.area=master.area_code;
      const key=dedupKey(o);
      // A manual edit can add or change the OB/SK number, which changes the
      // dedup key. Remove the previous row for the same dashboard order id so
      // editing never leaves a duplicate or a visual gap in the order list.
      if (o.id) await client.query(`DELETE FROM orders WHERE order_data->>'id'=$1 AND dedup_key<>$2`, [String(o.id), key]);
      const existed=(await client.query('SELECT 1 FROM orders WHERE dedup_key=$1',[key])).rowCount;
      await client.query(`INSERT INTO orders(dedup_key,voucher_number,company_name,area_code,order_data,source_file)
        VALUES($1,$2,$3,$4,$5::jsonb,$6)
        ON CONFLICT(dedup_key) DO UPDATE SET voucher_number=EXCLUDED.voucher_number,company_name=EXCLUDED.company_name,
        area_code=EXCLUDED.area_code,order_data=EXCLUDED.order_data,source_file=EXCLUDED.source_file,updated_at=now()`,
        [key,o.voucherNumber||'',o.companyName||'',o.area||'',JSON.stringify(o),sourceFile]);
      existed ? updated++ : inserted++;
    }
    await client.query(`INSERT INTO import_history(source_file,import_mode,received_count,inserted_count,updated_count,entity_type) VALUES($1,$2,$3,$4,$5,'orders')`,[sourceFile,mode,orders.length,inserted,updated]);
    await client.query('COMMIT');
  } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  const q=await pool.query('SELECT order_data FROM orders ORDER BY updated_at DESC');
  res.json({orders:q.rows.map(r=>r.order_data),inserted,updated,total:q.rowCount});
});

app.delete('/api/orders', async (_req,res) => {
  if (!pool) return res.status(503).json({error:'DATABASE_URL is not configured'});
  await pool.query('DELETE FROM orders'); res.json({ok:true});
});

app.get('/api/stock', async (_req,res) => {
  if (!pool) return res.status(503).json({error:'DATABASE_URL is not configured'});
  const q=await pool.query('SELECT stock_data FROM stock_records ORDER BY updated_at DESC');
  res.json(q.rows.map(r=>r.stock_data));
});

app.put('/api/stock', async (req,res) => {
  if (!pool) return res.status(503).json({error:'DATABASE_URL is not configured'});
  const records=Array.isArray(req.body?.records)?req.body.records:[];const client=await pool.connect();
  try{await client.query('BEGIN');await client.query('DELETE FROM stock_records');for(const record of records){await client.query('INSERT INTO stock_records(id,stock_data) VALUES($1,$2::jsonb)',[String(record.id),JSON.stringify(record)])}await client.query('COMMIT')}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  res.json({ok:true,total:records.length});
});

await initDb();
const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
app.use(vite.middlewares);
app.listen(3000,'0.0.0.0',()=>console.log('Paint Dashboard: http://localhost:3000'));
