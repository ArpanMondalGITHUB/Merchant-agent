# Raw-Gent Commerce

## What It Is

Two AI agents transact over Razorpay test mode:
- **Buyer Agent** — simulated AI customer that searches products, creates cart, completes checkout
- **Growth Agent** — merchant's revenue strategist that detects opportunities, recommends actions, requires approval before execution

One merchant admin approves or rejects what the Growth Agent suggests.

## Problem It Solves

**For merchants:** AI buyers are coming (ChatGPT/Gemini with wallet access). Merchants need their catalog to be AI-readable and transactable. This proves a merchant can serve AI customers end-to-end.

**For growth:** Abandoned carts, low-converting products, expiring inventory — merchants miss revenue because they can't act fast. An AI agent spots these signals in real-time and drafts recovery actions. Merchant just clicks approve.

## How It Works

```
Buyer Agent browses → adds to cart → checks out
  ↓
Razorpay payment link created (test mode)
  ↓
Payment succeeds/fails → webhook updates order status
  ↓
Growth Agent reads events table, detects patterns:
  - Product viewed 8x, bought 0x → recommend 15% discount
  - Cart abandoned for 30min, value ₹7,495 → recommend recovery link
  - Product expiry in 5 days, stock 12 → recommend BOGO
  ↓
Growth Agent writes to agent_recommendations (status = pending)
  ↓
Merchant sees card: "What: 15% off Coffee Box | Why: 8 views, 0 buys | Revenue: ₹6,970"
  ↓
Merchant clicks [Approve] → backend creates Razorpay link → tracks outcome
```

Every decision logged. Every action gated.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Web UI                           │
│  /admin     → revenue stats, pending approvals, orders      │
│  /products  → inventory table (readonly)                    │
│  /logs      → activity timeline                             │
│  /buyer     → buyer agent simulator (demo)                  │
└─────────────────────────────────────────────────────────────┘
                           ↓ HTTP
┌─────────────────────────────────────────────────────────────┐
│                   Express API (Bun)                         │
│  GET  /api/products          → list catalog                 │
│  POST /api/cart              → create cart                  │
│  POST /api/cart/:id/items    → add item                     │
│  POST /api/checkout          → create order + Razorpay link │
│  POST /api/webhooks/razorpay → payment confirmation         │
│  POST /api/agents/buyer      → run Buyer Agent              │
│  POST /api/agents/growth     → run Growth Agent             │
│  POST /api/recommendations/:id/approve → execute action     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL                             │
│  products | carts | cart_items | orders                     │
│  events | agent_recommendations | action_logs               │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    Razorpay Test Mode
```

**Agents don't touch DB or Razorpay directly.** They call backend functions (tools) that enforce rules.

## Tech Stack

- **Runtime:** Bun
- **API:** Express 5, Zod validation, `postgres` (raw SQL, no ORM)
- **Web:** React 19, Vite, Tailwind CSS 4, react-router-dom v7
- **DB:** PostgreSQL (local Docker or Neon free tier)
- **LLM:** OpenAI or Anthropic with tool calling
- **Payments:** Razorpay SDK (test mode)
- **Deployment:** Render/Railway (API), Vercel (web), Neon (DB)

## Database Schema (Key Tables)

```sql
products (id, name, price_paise, stock, expiry_date, tags, ai_summary)
events (id, type, session_id, product_id, cart_id, order_id, created_at)
carts (id, session_id, status, total_paise)
cart_items (id, cart_id, product_id, quantity, unit_price_paise)
orders (id, cart_id, status, amount_paise, razorpay_payment_link_id, created_by)
agent_recommendations (id, type, reasoning, action_params, status, expected_revenue_paise)
action_logs (id, level, agent, action, message, created_at)
```

**Events are agent memory.** Every product view, cart action, payment result becomes a row. Growth Agent queries this to detect patterns.

## Agent Tools

### Buyer Agent Tools (6)

```ts
// These are backend functions exposed as LLM tools.
// Buyer Agent calls them via the API — never touches DB directly.

async function search_catalog({ category, query, maxPrice }) {
  const row = await sql`SELECT id, name, price_paise, stock, category, ai_summary, tags
    FROM products 
    WHERE is_active = true 
      AND category = ${category}
      AND price_paise <= ${maxPrice}
      AND (name ILIKE ${'%' + query + '%'} OR ai_summary ILIKE ${'%' + query + '%'})`;
  // Returns only: id, name, price_paise, stock, category, ai_summary
  // Never returns: margin_pct, cost fields, internal notes
}

async function get_product({ productId, sessionId }) {
  const row = await sql`SELECT * FROM products WHERE id = ${productId}`;
  await sql`INSERT INTO events (type, session_id, product_id) 
    VALUES ('product_viewed', ${sessionId}, ${productId})`;
  
  // Security boundary: return only public fields
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price_paise: row.price_paise,
    in_stock: row.stock > 0,  // boolean, not exact count
    tags: row.tags,
    ai_summary: row.ai_summary,
    best_for: row.best_for
  };
  // Never returns: margin_pct, expiry_date (merchant-only), cost data
}

async function propose_checkout({ sessionId, items }) {
  // items = [{ productId, quantity }]
  // Create cart, add items, check stock, calculate total
  const cartId = randomUUID();
  await sql`INSERT INTO carts (id, session_id, status) VALUES (${cartId}, ${sessionId}, 'active')`;
  
  let total = 0;
  for (const item of items) {
    const product = await sql`SELECT price_paise, stock FROM products WHERE id = ${item.productId}`;
    if (product.stock < item.quantity) throw new Error('Insufficient stock');
    
    await sql`INSERT INTO cart_items (cart_id, product_id, quantity, unit_price_paise)
      VALUES (${cartId}, ${item.productId}, ${item.quantity}, ${product.price_paise})`;
    total += product.price_paise * item.quantity;
  }
  
  await sql`UPDATE carts SET total_paise = ${total} WHERE id = ${cartId}`;
  await sql`INSERT INTO events (type, session_id, cart_id) VALUES ('cart_created', ${sessionId}, ${cartId})`;
  
  // Merchant Agent logic: detect upsell opportunity
  const upsell = await generate_upsell({ cartId, items });
  
  return { cartId, total_paise: total, items, upsellOffer: upsell };
}

async function respond_to_upsell({ cartId, accept, upsellProductId }) {
  if (accept) {
    const product = await sql`SELECT price_paise FROM products WHERE id = ${upsellProductId}`;
    await sql`INSERT INTO cart_items (cart_id, product_id, quantity, unit_price_paise)
      VALUES (${cartId}, ${upsellProductId}, 1, ${product.price_paise})`;
    await sql`UPDATE carts SET total_paise = total_paise + ${product.price_paise} WHERE id = ${cartId}`;
  }
  const cart = await sql`SELECT total_paise FROM carts WHERE id = ${cartId}`;
  return { cartId, total_paise: cart.total_paise, upsellAccepted: accept };
}

async function finalize_checkout({ cartId, customer }) {
  const cart = await sql`SELECT total_paise FROM carts WHERE id = ${cartId}`;
  const orderId = randomUUID();
  
  await sql`INSERT INTO orders (id, cart_id, status, amount_paise, created_by)
    VALUES (${orderId}, ${cartId}, 'payment_pending', ${cart.total_paise}, 'buyer_agent')`;
  
  const { paymentLinkId, paymentLinkUrl } = await createPaymentLink(orderId, cart.total_paise, customer);
  
  await sql`UPDATE orders SET razorpay_payment_link_id = ${paymentLinkId}, razorpay_payment_link_url = ${paymentLinkUrl}
    WHERE id = ${orderId}`;
  await sql`UPDATE carts SET status = 'checkout_created' WHERE id = ${cartId}`;
  await sql`INSERT INTO events (type, cart_id, order_id) VALUES ('payment_link_created', ${cartId}, ${orderId})`;
  
  return { orderId, paymentLinkUrl, amount_paise: cart.total_paise };
}

async function check_order_status({ orderId }) {
  const order = await sql`SELECT status, razorpay_payment_id FROM orders WHERE id = ${orderId}`;
  return { status: order.status, paymentId: order.razorpay_payment_id };
}
```

### Growth Agent (Merchant Agent) Tools (7)

```ts
async function find_abandoned_carts() {
  const carts = await sql`
    SELECT c.id, c.total_paise, c.created_at,
      json_agg(json_build_object('product', p.name, 'qty', ci.quantity)) AS items
    FROM carts c
    JOIN cart_items ci ON ci.cart_id = c.id
    JOIN products p ON ci.product_id = p.id
    WHERE c.status = 'checkout_created'
      AND c.updated_at < now() - INTERVAL '30 minutes'
    GROUP BY c.id
    ORDER BY c.total_paise DESC`;
  return { carts };
}

async function find_low_conversion_products() {
  const products = await sql`
    SELECT p.id, p.name, p.price_paise,
      COUNT(DISTINCT CASE WHEN e.type = 'product_viewed' THEN e.session_id END) AS views,
      COUNT(DISTINCT CASE WHEN e.type = 'payment_success' THEN e.session_id END) AS purchases
    FROM products p
    JOIN events e ON e.product_id = p.id
    GROUP BY p.id
    HAVING COUNT(DISTINCT CASE WHEN e.type = 'product_viewed' THEN e.session_id END) >= 3
      AND COUNT(DISTINCT CASE WHEN e.type = 'payment_success' THEN e.session_id END) = 0
    ORDER BY views DESC`;
  return { products };
}

async function find_expiring_stock() {
  const products = await sql`
    SELECT id, name, stock, expiry_date, (expiry_date - CURRENT_DATE) AS days_left
    FROM products
    WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      AND is_active = true AND stock > 0
    ORDER BY days_left`;
  return { products };
}

async function recommend_action({ type, productId, cartId, reasoning, actionParams, expectedRevenuePaise }) {
  const id = await sql`
    INSERT INTO agent_recommendations (type, product_id, cart_id, reasoning, action_params, expected_revenue_paise, status)
    VALUES (${type}, ${productId}, ${cartId}, ${reasoning}, ${json(actionParams)}, ${expectedRevenuePaise}, 'pending')
    RETURNING id`;
  return { recommendationId: id };
}

async function get_revenue_stats({ since }) {
  const stats = await sql`
    SELECT 
      SUM(amount_paise) FILTER (WHERE created_at >= ${since}) AS total_paise,
      SUM(amount_paise) FILTER (WHERE created_at >= ${since} AND created_by = 'growth_agent') AS agent_recovered_paise,
      COUNT(*) FILTER (WHERE created_at >= ${since}) AS order_count
    FROM orders
    WHERE status = 'paid'`;
  return stats;
}

async function get_product_performance({ productId }) {
  const events = await sql`
    SELECT type, COUNT(*) AS count
    FROM events
    WHERE product_id = ${productId}
    GROUP BY type`;
  
  const revenue = await sql`
    SELECT SUM(o.amount_paise) AS revenue_paise
    FROM orders o
    JOIN carts c ON o.cart_id = c.id
    JOIN cart_items ci ON ci.cart_id = c.id
    WHERE ci.product_id = ${productId} AND o.status = 'paid'`;
  
  return { events, revenue_paise: revenue.revenue_paise || 0 };
}

async function generate_upsell({ cartId, items }) {
  // Find complementary products based on cart contents
  const cartProductIds = items.map(i => i.productId);
  
  const upsell = await sql`
    SELECT id, name, price_paise, ai_summary
    FROM products
    WHERE id NOT IN (${cartProductIds})
      AND (tags && (SELECT array_agg(tags) FROM products WHERE id = ANY(${cartProductIds})))
      AND is_active = true
    ORDER BY random()
    LIMIT 1`;
  
  if (!upsell) return null;
  
  return {
    productId: upsell.id,
    name: upsell.name,
    price_paise: upsell.price_paise,
    reason: `Pairs well with your selected items`
  };
}
```

### Security: Why Buyer Agent Can't See Merchant Data

Buyer Agent tools return **only public fields**. Example:

**What's in the database (full row):**
```json
{
  "id": "prod_001",
  "name": "Premium Coffee Gift Box",
  "price_paise": 149900,
  "cost_paise": 95000,
  "margin_pct": 37,
  "stock": 25,
  "min_discount_pct": 5,
  "internal_notes": "slow mover, push in upsells"
}
```

**What `get_product()` returns to Buyer Agent:**
```json
{
  "id": "prod_001",
  "name": "Premium Coffee Gift Box",
  "price_paise": 149900,
  "in_stock": true,
  "ai_summary": "Good for corporate gifts"
}
```

`cost_paise`, `margin_pct`, `min_discount_pct`, `internal_notes` — **never sent**. Not hidden, not masked, simply not constructed in the response object. The tool function is the security boundary. Buyer Agent has no DB credentials, no SQL access, no way to bypass this.

**Key SQL Queries for Growth Agent:**

```sql
-- Find products viewed but never purchased
SELECT
  p.id, p.name, p.price_paise,
  COUNT(DISTINCT CASE WHEN e.type = 'product_viewed' THEN e.session_id END) AS views,
  COUNT(DISTINCT CASE WHEN e.type = 'payment_success' THEN e.session_id END) AS purchases
FROM products p
JOIN events e ON e.product_id = p.id
GROUP BY p.id, p.name, p.price_paise
HAVING
  COUNT(DISTINCT CASE WHEN e.type = 'product_viewed' THEN e.session_id END) >= 3
  AND COUNT(DISTINCT CASE WHEN e.type = 'payment_success' THEN e.session_id END) = 0
ORDER BY views DESC;

-- Find abandoned carts worth recovering
SELECT
  c.id, c.total_paise, c.created_at,
  json_agg(json_build_object('product', p.name, 'qty', ci.quantity)) AS items
FROM carts c
JOIN cart_items ci ON ci.cart_id = c.id
JOIN products p ON ci.product_id = p.id
WHERE c.status = 'checkout_created'
  AND c.updated_at < now() - INTERVAL '30 minutes'
GROUP BY c.id
ORDER BY c.total_paise DESC;

-- Find expiring stock
SELECT id, name, stock, expiry_date, (expiry_date - CURRENT_DATE) AS days_left
FROM products
WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  AND is_active = true AND stock > 0
ORDER BY days_left;
```

## Important: Not a CRUD App

This is **not** "add/edit/delete products." The merchant dashboard is observation + approval, not data entry.

The catalog is fixed seed data. The merchant watches agents work and gates their actions. No "Create Product" button, no "Edit Order" form.

The UI shows:
- What the agents detected (signals from events table)
- What they recommend (pending actions)
- What happened when admin approved (revenue, logs)

This is an **agent commerce system**, not an admin panel for a store.

## Price Discounts: One-Time Links, Not Catalog Updates

When Growth Agent recommends a discount:
- Product price in DB stays ₹800
- Agent recommends: "Create payment link at ₹752 (6% off) for this abandoned cart"
- Admin approves → backend calls Razorpay Payment Links API with `amount: 75200`
- Only that link has the discount — catalog unchanged
- If it converts, revenue tracked as "agent-recovered"

The agent **never** runs `UPDATE products SET price = ...`. It creates targeted, one-time discounted checkout links.

## What Makes This Strong

1. **Agents are bounded** — hard limits on discount %, max order value, retry count (enforced in code, not prompts)
2. **Gated** — no money action happens without human approval
3. **Explainable** — every recommendation has a `reasoning` field visible to merchant
4. **Real payment rail** — uses actual Razorpay APIs (test mode), not mocked responses
5. **One failure handled** — payment failure triggers Growth Agent recovery flow
6. **End-to-end flow** — buyer search → cart → payment → webhook → growth detection → approval → recovery → revenue attribution

## What We Can Do Better (Future)

- **Multi-merchant:** Right now one merchant, one catalog. Add `merchant_id` to all tables, make it a SaaS.
- **Campaign analytics:** Track conversion rates per recommendation type (discount vs BOGO vs cross-sell).
- **A/B testing:** Growth Agent proposes 2 discounts, merchant picks one, agent learns from outcome.
- **Real buyer integration:** External AI buyers hit `/api/ai-commerce/*` endpoints (Phase 8 in blueprint).
- **Stock sync:** Webhook from inventory system auto-updates `products.stock`.
- **Margin protection:** Growth Agent never recommends discount that drops margin below X%.

## Phased Build Plan

### Phase 1: Data + Catalog API (Week 1)
- PostgreSQL + schema.sql
- Seed 8 products (snacks, gifts, party items) from products.json
- `GET /api/products` with search/filter
- Product inventory UI (table: name, price, stock, expiry)

### Phase 2: Cart System (Week 1)
- `POST /api/cart`, `POST /api/cart/:id/items`
- Cart state machine: active → checkout_created → paid/abandoned
- Insert `cart_created`, `cart_item_added` events

### Phase 3: Buyer Agent (Week 2)
- OpenAI/Anthropic integration with tool calling
- `POST /api/agents/buyer` route
- Tools: search_products, add_to_cart, checkout (creates order, no Razorpay yet)
- Buyer simulator UI: chat on left, cart state on right
- Tool call log visible below

### Phase 4: Razorpay Payment (Week 2)
- Add Razorpay SDK
- `POST /api/checkout` creates Payment Link via Razorpay API
- Store razorpay_payment_link_id, razorpay_payment_link_url in orders table
- Return link to Buyer Agent
- Manual test: open link, complete payment in Razorpay test mode

### Phase 5: Webhook + Event Tracking (Week 3)
- `POST /api/webhooks/razorpay` with signature verification
- On payment.captured: mark order as paid, insert payment_success event, update stock
- On payment.failed: insert payment_failed event
- Orders table in admin UI shows live status

### Phase 6: Growth Agent Observes (Week 3)
- Growth Agent with tools: find_abandoned_carts, find_low_conversion_products, find_expiring_stock
- `POST /api/agents/growth` route
- Activity log UI: events + action_logs timeline

### Phase 7: Recommendations + Approval (Week 4)
- Growth Agent writes to agent_recommendations on detect
- Admin UI: pending recommendation cards with reasoning
- `POST /api/recommendations/:id/approve` creates discounted Razorpay link
- Track: expected_revenue_paise vs actual

### Phase 8: Revenue Dashboard (Week 4)
- Total revenue today
- Agent-recovered revenue (orders where created_by='growth_agent')
- Conversion rate per recommendation type
- Top products by revenue

### Phase 9: One Failure Demo (Week 4)
- Simulate payment failure (Razorpay test card)
- Growth Agent detects payment_failed event
- Recommends retry with 5% discount
- Merchant approves → new link sent → payment succeeds
- Full flow logged

### Phase 10: Polish + Demo Script (Week 5)
- Error boundaries, loading states
- Seed realistic demo data: 3 buyer sessions, 2 abandoned carts, 1 expiring product
- 5-minute demo script:
  1. Show catalog
  2. Run Buyer Agent: "I need 5 gift boxes under ₹2000 each"
  3. Agent searches → adds to cart → checks out → payment link created
  4. Complete payment → webhook confirms → order shows "paid"
  5. Growth Agent detects another product viewed 8x, bought 0x → recommends discount
  6. Merchant approves → new link created
  7. Show activity log with full audit trail

## Success Criteria

- [ ] Buyer Agent completes one purchase end-to-end without human intervention
- [ ] Growth Agent detects 3 signal types: abandoned cart, low conversion, expiring stock
- [ ] Admin approves one recommendation → Razorpay link created → revenue tracked
- [ ] One payment failure → Growth Agent recovery → retry succeeds
- [ ] Every money action has a reasoning entry visible in UI
- [ ] Raw SQL queries for agent tools showcased (no ORM magic)

## Repository Structure

```
merchant-agent/
├── apps/
│   ├── api/                          # Express API (Bun)
│   │   ├── src/
│   │   │   ├── index.ts              # entry point
│   │   │   ├── app.ts                # Express app setup
│   │   │   ├── config/
│   │   │   │   └── config.ts         # env vars
│   │   │   ├── db/
│   │   │   │   ├── index.ts          # postgres connection
│   │   │   │   ├── schema.sql        # CREATE TABLE statements
│   │   │   │   └── seed.ts           # insert products.json
│   │   │   ├── routes/
│   │   │   │   ├── products.ts       # GET /api/products
│   │   │   │   ├── cart.ts           # POST /api/cart, /api/cart/:id/items
│   │   │   │   ├── checkout.ts       # POST /api/checkout
│   │   │   │   ├── orders.ts         # GET /api/orders
│   │   │   │   ├── recommendations.ts# GET /api/recommendations, POST /:id/approve
│   │   │   │   ├── agents.ts         # POST /api/agents/buyer, /api/agents/growth
│   │   │   │   ├── webhooks.ts       # POST /api/webhooks/razorpay
│   │   │   │   └── logs.ts           # GET /api/logs
│   │   │   ├── agents/
│   │   │   │   ├── buyer-agent.ts    # Buyer Agent system prompt + tool definitions
│   │   │   │   ├── growth-agent.ts   # Growth Agent system prompt + tool definitions
│   │   │   │   └── tools.ts          # tool execution functions
│   │   │   ├── lib/
│   │   │   │   ├── events.ts         # insertEvent() helper
│   │   │   │   ├── razorpay.ts       # Razorpay SDK wrapper
│   │   │   │   └── logger.ts         # insertActionLog() helper
│   │   │   └── types/
│   │   │       └── index.ts          # shared TypeScript types
│   │   ├── data/
│   │   │   └── products.json         # seed data (8 products)
│   │   └── package.json
│   └── web/                          # React SPA
│       ├── src/
│       │   ├── main.tsx              # entry point
│       │   ├── App.tsx               # router setup
│       │   ├── pages/
│       │   │   ├── Admin.tsx         # /admin (dashboard: stats, recommendations, orders, products)
│       │   │   ├── BuyerAgent.tsx    # /buyer (chat simulator)
│       │   │   └── ActivityLog.tsx   # /logs (timeline)
│       │   ├── components/
│       │   │   ├── RecommendationCard.tsx
│       │   │   ├── OrdersTable.tsx
│       │   │   ├── ProductsTable.tsx
│       │   │   ├── RevenueStats.tsx
│       │   │   ├── ChatInterface.tsx
│       │   │   └── ActivityTimeline.tsx
│       │   ├── lib/
│       │   │   └── api.ts            # axios client
│       │   └── types/
│       │       └── index.ts
│       └── package.json
├── packages/                         # (empty for now, shared utils go here later)
├── .env.example
├── PRODUCT.md
├── TODO.md
├── agentic-commerce-project-blueprint.md
├── package.json
└── README.md
```

## All API Routes (Complete List)

### Products
- `GET /api/products` — list all active products, supports `?search=`, `?category=`, `?maxPrice=`
- `GET /api/products/:id` — single product details (not used in MVP, add if needed)

### Cart
- `POST /api/cart` — create cart, body: `{ sessionId }`, returns `{ cartId, status }`
- `POST /api/cart/:id/items` — add item, body: `{ productId, quantity }`, returns updated cart
- `GET /api/cart/:id` — get cart with items array (for display)

### Checkout
- `POST /api/checkout` — create order + Razorpay link, body: `{ cartId, customer: { name, email, phone } }`, returns `{ orderId, paymentLinkUrl, amount_paise }`

### Orders
- `GET /api/orders` — list all orders with status, optional `?status=paid|pending|failed`

### Recommendations
- `GET /api/recommendations` — list pending recommendations (for admin approval UI)
- `POST /api/recommendations/:id/approve` — execute approved action, creates discounted Razorpay link
- `POST /api/recommendations/:id/reject` — mark as rejected

### Agents
- `POST /api/agents/buyer` — run Buyer Agent, body: `{ message, sessionId }`, returns `{ reply, toolCalls: [...] }`
- `POST /api/agents/growth` — run Growth Agent, body: `{ message }`, returns `{ reply, signals: [...], recommendations: [...] }`

### Webhooks
- `POST /api/webhooks/razorpay` — receive Razorpay events, verifies signature, updates order status, inserts events

### Activity Logs
- `GET /api/logs` — return action_logs ordered by created_at DESC, optional `?level=error|warn|info`

### Stats (for dashboard)
- `GET /api/stats/revenue` — returns `{ total_today_paise, agent_recovered_paise }`

**Total: 14 routes.** No update/delete routes — this is not CRUD.

## Web UI Routes

- `/admin` (default) — main dashboard: stats, pending recommendations, orders table, products table, activity preview
- `/buyer` — Buyer Agent simulator: chat interface + tool call log
- `/logs` — full activity timeline (all action_logs + events)

**Total: 3 pages.**

## Demo Pitch

"This is an AI commerce system on Razorpay test mode. The Buyer Agent just bought 5 coffee gift boxes — no human clicked add to cart. Payment went through Razorpay. Now watch: the Growth Agent detected another product with 8 views but zero sales. It's recommending a 15% discount to recover that interest. I click approve. Razorpay link created. If someone pays, we'll see the revenue attributed to the agent. Every decision the agents made is logged here — what they recommended, why, and how much revenue it's expected to recover. The agents don't have database access — they call safe backend functions. The merchant stays in control: no money moves without that approve click."
