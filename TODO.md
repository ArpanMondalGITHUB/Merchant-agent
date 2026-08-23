# TODO

## Phase 1: Data + Catalog API (START HERE)

### Database Setup
- [ ] Install PostgreSQL (Docker: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16`)
- [ ] Create `apps/api/src/db/schema.sql` with all tables (products, events, carts, cart_items, orders, agent_recommendations, action_logs, buyer_sessions)
- [ ] Run schema: `psql postgres://postgres:postgres@localhost:5432/postgres -f apps/api/src/db/schema.sql`
- [ ] Add `DATABASE_URL` to `.env`

### Dependencies
- [ ] `cd apps/api && bun add postgres razorpay dotenv`
- [ ] `cd apps/web && bun add axios lucide-react sonner @base-ui/react`

### DB Connection
- [ ] Create `apps/api/src/db/index.ts` — export `sql = postgres(process.env.DATABASE_URL!)`
- [ ] Create `apps/api/src/db/seed.ts` — reads `data/products.json`, inserts into products table
- [ ] Create `apps/api/data/products.json` — 8 products (snacks, gifts, party supplies) with name, price_paise, stock, category, tags, ai_summary, expiry_date (2 items only)
- [ ] Run seed: `bun apps/api/src/db/seed.ts`

### Products API
- [ ] `GET /api/products` — return all active products
- [ ] Query params: `?search=coffee&category=gifting&maxPrice=200000`
- [ ] Response: `{ products: [{ id, name, price_paise, stock, category, tags, ai_summary }] }`

### Products UI
- [ ] `apps/web/src/pages/Products.tsx` — fetch `/api/products`, render table
- [ ] Columns: name, price (format paise → ₹), stock, expiry_date, status badge (active/expiring/out_of_stock)
- [ ] Search input + category filter dropdown
- [ ] Route: `/products`

---

## Phase 2: Cart System

### Cart API
- [ ] `POST /api/cart` — create cart, return `{ cartId, status: 'active' }`
- [ ] `POST /api/cart/:id/items` — body: `{ productId, quantity }`, insert cart_item, update cart.total_paise, insert cart_item_added event
- [ ] `GET /api/cart/:id` — return cart with items array

### Events
- [ ] Helper: `apps/api/src/lib/events.ts` — `insertEvent(type, sessionId, productId, cartId, metadata)`
- [ ] Insert event on: cart_created, cart_item_added

---

## Phase 3: Buyer Agent

### LLM Integration
- [ ] Add `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to `.env`
- [ ] `bun add openai` or `bun add @anthropic-ai/sdk`
- [ ] Create `apps/api/src/agents/buyer-agent.ts` — system prompt + tool definitions

### Tools
- [ ] `search_products` — calls `SELECT * FROM products WHERE ...` with query/category/maxPrice filters
- [ ] `add_to_cart` — calls cart items API
- [ ] `checkout` — creates order (no Razorpay yet), returns `{ orderId, amount_paise }`

### Buyer Agent Route
- [ ] `POST /api/agents/buyer` — body: `{ message, sessionId }`
- [ ] Run LLM with tools, return response + tool calls log
- [ ] Response: `{ reply, toolCalls: [{ tool, input, output }] }`

### Buyer UI
- [ ] `apps/web/src/pages/BuyerAgent.tsx`
- [ ] Chat interface: message input + send button
- [ ] Display agent replies
- [ ] Show tool calls log below (tool name, input, output, timestamp)
- [ ] Route: `/buyer`

---

## Phase 4: Razorpay Payment

### Razorpay Setup
- [ ] Sign up for Razorpay test mode, get `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
- [ ] Add to `.env`

### Checkout Route
- [ ] Update `POST /api/checkout` to call Razorpay Payment Links API
- [ ] Create payment link, store `razorpay_payment_link_id` and `razorpay_payment_link_url` in orders table
- [ ] Return `{ orderId, paymentLinkUrl, amount_paise }`
- [ ] Insert `payment_link_created` event

### Update Buyer Agent
- [ ] Checkout tool now returns Razorpay link
- [ ] Agent includes link in response: "Here's your payment link: https://rzp.io/..."

---

## Phase 5: Webhook + Event Tracking

### Webhook Route
- [ ] `POST /api/webhooks/razorpay` — verify signature using `razorpay.webhooks.validateSignature()`
- [ ] On `payment.captured`: find order by razorpay_payment_link_id, mark as paid, insert payment_success event, reduce product stock
- [ ] On `payment.failed`: insert payment_failed event
- [ ] Return 200 always (even if order not found — log error to action_logs)

### Orders UI
- [ ] `apps/web/src/pages/Orders.tsx`
- [ ] Table: order_id, cart_id, amount (₹), status badge, razorpay_link (clickable), created_by, created_at
- [ ] Auto-refresh every 5s or use WebSocket for live updates
- [ ] Route: `/orders`

---

## Phase 6: Growth Agent Observes

### Growth Agent Tools
- [ ] `find_abandoned_carts` — SQL query (see PRODUCT.md)
- [ ] `find_low_conversion_products` — SQL query (views vs purchases)
- [ ] `find_expiring_stock` — SQL query (expiry_date within 7 days)

### Growth Agent Route
- [ ] `POST /api/agents/growth` — body: `{ message }`
- [ ] System prompt: "You detect revenue opportunities and recommend actions. Use tools to query events and products."
- [ ] Return analysis + detected signals

### Activity Log UI
- [ ] `apps/web/src/pages/ActivityLog.tsx`
- [ ] Timeline: fetch `SELECT * FROM action_logs ORDER BY created_at DESC LIMIT 100`
- [ ] Show: timestamp, level badge (info=green, warn=yellow, error=red), agent, action, message
- [ ] Route: `/logs`

---

## Phase 7: Recommendations + Approval

### Recommendation Tool
- [ ] Growth Agent tool: `recommend_action(type, productId, reasoning, actionParams, expectedRevenue)`
- [ ] Inserts into agent_recommendations with status='pending'

### Approval Route
- [ ] `POST /api/recommendations/:id/approve`
- [ ] Mark status='approved', create discounted Razorpay link (apply discount from actionParams)
- [ ] Mark status='executed', store created order_id
- [ ] Insert action_log: "Recommendation #X approved and executed"

### Recommendations UI
- [ ] `apps/web/src/pages/Admin.tsx` (main dashboard)
- [ ] Section 1: Revenue stats (2 numbers at top)
  - Total revenue today: `SELECT SUM(amount_paise) FROM orders WHERE status='paid' AND created_at >= CURRENT_DATE`
  - Agent-recovered: same query + `AND created_by='growth_agent'`
- [ ] Section 2: Pending recommendations
  - Fetch `SELECT * FROM agent_recommendations WHERE status='pending'`
  - Render cards: What (type + product name), Why (reasoning), Expected revenue (₹)
  - [Approve] [Reject] buttons
- [ ] Section 3: Orders table (reuse from Phase 5)
- [ ] Section 4: Products table (reuse from Phase 1)
- [ ] Section 5: Activity log (reuse from Phase 6)
- [ ] Route: `/admin` (default)

---

## Phase 8: One Failure Demo

### Simulate Failure
- [ ] Use Razorpay test card that triggers failure
- [ ] Buyer Agent attempts payment → fails → webhook inserts payment_failed event

### Recovery Flow
- [ ] Growth Agent detects `SELECT * FROM events WHERE type='payment_failed' AND created_at > now() - INTERVAL '1 hour'`
- [ ] Recommends: "Retry payment with 5% discount to recover ₹X"
- [ ] Merchant approves → new link created with discount
- [ ] Payment succeeds → tracked as agent-recovered revenue

---

## Phase 9: Polish

### Error Handling
- [ ] All API routes: try/catch, return 500 with `{ error: message }` on failure
- [ ] Log all errors to action_logs table (level='error')

### Loading States
- [ ] Products page: skeleton loader while fetching
- [ ] Buyer Agent: "Agent is thinking..." spinner during LLM call
- [ ] Admin dashboard: loading skeletons for stats/recommendations

### Validation
- [ ] Zod schemas for all POST body params
- [ ] Return 400 on validation failure

### Responsive UI
- [ ] Tailwind breakpoints: mobile-first, stack sections vertically on small screens

---

## Phase 10: Demo Script

### Seed Demo Data
- [ ] Update seed.ts to also insert:
  - 3 buyer_sessions
  - 5 events: 3 product_viewed (same product), 1 cart_created, 1 cart_abandoned
  - 1 product with expiry_date = today + 5 days

### Demo Flow (5 minutes)
1. Open `/admin` → show empty state (no orders yet, ₹0 revenue)
2. Open `/products` → show 8 products
3. Open `/buyer` → type "I need 5 gift boxes under ₹2000 each for a corporate event"
4. Agent searches → selects Premium Coffee Gift Box → adds 5 to cart → creates checkout
5. Payment link appears → open in new tab → complete test payment
6. Return to `/admin` → order shows "paid", revenue updates to ₹7,495
7. Run Growth Agent → detects product with 3 views, 0 purchases → recommends 15% discount
8. Click [Approve] → new Razorpay link created
9. Open `/logs` → show full audit trail: buyer actions, payment confirmation, growth recommendation, approval

---

## Done Criteria

- [ ] One successful Buyer Agent purchase (product search → cart → payment → webhook confirmation)
- [ ] Growth Agent detects 2+ signal types (abandoned cart, low conversion, or expiring stock)
- [ ] Admin approves 1 recommendation → Razorpay link created
- [ ] One payment failure → Growth Agent recovery flow → retry succeeds
- [ ] All 5 admin dashboard sections populated with live data
- [ ] Raw SQL queries visible in code (no ORM abstraction hiding them)
- [ ] Demo runs in under 5 minutes

---

## Current Status

**Done:**
- [x] Monorepo structure (apps/api, apps/web)
- [x] Express 5 API with health check
- [x] React 19 + Vite web shell

**Next:** Phase 1 — Database setup + products API + products UI (start with schema.sql)
