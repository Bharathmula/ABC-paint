<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/134dc509-548b-4571-9589-cf68b04a30d2

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## MARG ERP pending-order Excel import

This build recognizes the report-style **ALL PENDING ORDERS (SALES)** export from MARG ERP (including `.XLS` files such as `PEND ORDER.XLS`). Company/party headings are carried into the item rows, item lines are grouped into orders by party + entry/voucher number + party order number, and the dashboard summary is recalculated from the imported data.

For later uploads, use **Merge / Append**. Existing orders are matched by voucher number (or PO/company fallback) and updated with the latest uploaded values; genuinely new orders are added. This prevents the same historical rows from being duplicated when a newer pending-order report contains old + recent orders.

## PostgreSQL persistent setup (new)
1. Create a PostgreSQL database (local PostgreSQL, Neon, Supabase, Render, etc.).
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Run `npm install --legacy-peer-deps`.
4. Run `npm run dev` and open http://localhost:3000.

The server automatically creates `customer_master`, `orders`, and `import_history` tables. On first database start it seeds 1,712 customer master records and their Area Codes extracted from `ABC Paints — 3 Year Analysis.xlsx`. Excel order imports are upserted by voucher/order identity, so refresh/restart does not erase PostgreSQL data. The Areas tab uses Area Code now; Area Name can be added later. The Dispatch tab supports multi-area selection and vehicle suggestion using pending quantity × estimated kg/unit.

## V5 Dispatch workflow (no Google Maps yet)
- Enter From Location.
- Search pending destinations by Area Code, Company, Voucher/Order number.
- Select one or more pending orders.
- Choose KG/unit per order (0.5, 1, 2, 5, 10, 15, 20, 25, 50 or Custom).
- Click Search Dispatch to reveal the manual stop sequence and weight-based vehicle recommendation.
- Reorder stops with up/down controls.
- Create Dispatch saves a Planned dispatch locally for now; production persistence should use the configured PostgreSQL backend.
- Google Maps is intentionally not enabled in this version.

## V6 workflow updates
- Main navigation order: Orders & Packing, Stock Records, Urgent Deadline, Shortage & Reorder Decisions, Areas, Dispatch.
- Orders default to the first screen.
- Unfinished orders automatically become Overdue after 3 calendar days from the order date.
- Orders & Packing includes Packing/Partial, Overdue, Unfinished, and Finished views.
- Every unfinished order has a Complete button. Completing sets pending quantity to 0, records the ordered quantity as issued, completes item lines, and moves the order to Finished Orders.
- Partial dispatch remains supported through ordered / issued / pending quantities (example: 24 ordered, 17 issued, 7 pending).

## V11 area master corrections
- Reconciles browser area storage against all 1,712 customer-master account records on load.
- Shows 47 unique area codes in sequential order with company counts per area.
- Clicking an area shows the full company list and total count for that area.
- Dispatch resolves missing order area codes from company/customer master before filtering/display.

## V12 workflow update
- Areas Master now starts empty and contains only manually added or imported Local/Transport records.
- Area files can be imported from XLSX, XLS or CSV using the included template.
- Order filters include Local Areas and Transport Areas.
- Packing / Partial is renamed to RTG, and RTG/complete actions support Undo.
- An SK Number is mandatory before Dispatch or Complete can be recorded.
- Existing dispatch-plan browser data is cleared and the Dispatch screen starts empty.
- A Report tab beside Dispatch summarizes today's order value, incomplete-order reasons and low/out-of-stock decisions, with Excel download.

## Permanent Areas, history and Streamlit deployment
- `ABC Paints — 3 Year Analysis.xlsx` is consolidated into 1,712 unique customer records. The latest yearly occurrence of each customer code is used.
- Customer records start as Unclassified and can be moved to Local or Transport. Classifications are saved in PostgreSQL.
- The left-side History control opens and closes a date-wise list of order and area uploads.
- Run the React dashboard with `npm run dev`.
- Run the Streamlit deployment with `streamlit run streamlit_app.py` after installing `requirements.txt`.
- For Streamlit Cloud, add `DATABASE_URL` under App settings → Secrets.

### PostgreSQL structure
- `customer_master`: customer code primary key, party name, area code/name, Local/Transport classification, updated time.
- `orders`: deduplication key primary key, voucher, company, area code, full order JSON, source file, updated time.
- `import_history`: upload id, source filename, import mode, received/new/updated counts, entity type (`orders` or `areas`), upload time.
