# Agentic Commerce Project Blueprint

## Project Name

Working name: **Raw-Gent Commerce**

One-line idea:

> An AI growth agent that helps a Razorpay merchant increase revenue, plus an AI buyer flow that can discover products, create a cart, and complete payment end to end.

This is not a simple ecommerce CRUD app. The CRUD parts are only the foundation. The real project is an agentic commerce system where agents can observe merchant data, make decisions, take revenue actions, create payment flows, and learn from outcomes.

---

## What The Project Does

The app has two main agent experiences:

1. **Growth Agent**
   - Works for the merchant.
   - Looks at products, customer behavior, carts, failed payments, abandoned carts, and sales.
   - Finds revenue opportunities.
   - Suggests actions like discounts, bundles, recovery campaigns, upsells, and payment reminders.
   - Creates Razorpay test-mode payment links/orders through safe backend tools.
   - Tracks results through Razorpay webhooks.
   - Shows what worked and what did not.

2. **Buyer Agent**
   - Acts like an AI customer.
   - Searches the merchant catalog.
   - Compares products.
   - Decides what to buy or not buy.
   - Creates a cart.
   - Requests checkout.
   - Receives a Razorpay payment link.
   - Completes the purchase in test mode.

The important feedback loop:

```text
Buyer Agent browses products
-> Buyer Agent adds items to cart
-> Buyer Agent buys or abandons
-> Razorpay confirms payment or failure
-> Growth Agent observes what happened
-> Growth Agent recommends better offers/catalog/payment actions
-> Merchant approves action
-> Revenue improves
```

---

## Do You Need A JSON Catalog First?

Yes. Start with a JSON catalog first because it is fast, clear, and easy to test.

In the early MVP, create:

```text
/data/products.json
/data/customers.json
/data/events.json
```

This lets you build the agents and UI before adding a full database.

Later, move the same structure into PostgreSQL using Prisma models.

Recommended path:

```text
Phase 1: JSON file catalog
Phase 2: API routes read from JSON
Phase 3: UI displays catalog
Phase 4: Buyer agent uses catalog tools
Phase 5: Add cart and checkout
Phase 6: Add Razorpay test-mode payment link
Phase 7: Add database
Phase 8: Add webhooks and growth analytics
```

---

## High-Level Architecture

```text
Frontend UI
  |
  |-- Merchant Dashboard
  |-- Product Catalog UI
  |-- Growth Agent Panel
  |-- Buyer Agent Chat/Simulator
  |-- Orders and Payments UI
  |
Backend API
  |
  |-- Product routes
  |-- Cart routes
  |-- Checkout routes
  |-- Agent routes
  |-- Razorpay routes
  |-- Webhook routes
  |
Agent Layer
  |
  |-- Growth Agent
  |-- Buyer Agent
  |-- Shared tool registry
  |
Data Layer
  |
  |-- Products
  |-- Customers
  |-- Carts
  |-- Orders
  |-- Payments
  |-- Events
  |-- Campaigns
  |-- Agent decisions
  |
Razorpay Test Mode
  |
  |-- Create payment link/order
  |-- Hosted payment page
  |-- Payment status
  |-- Webhook confirmation
```

---

## Recommended Tech Stack

Use this stack if you want to build fast:

```text
Frontend: Next.js + TypeScript + Tailwind CSS
Backend: Next.js API routes / route handlers
Database: PostgreSQL
ORM: Prisma
AI: OpenAI API or another LLM provider with tool calling
Payments: Razorpay test-mode APIs
Dev webhook tunnel: ngrok or localtunnel
Deployment: Vercel + Railway/Render/Supabase
```

For the first prototype, you can skip PostgreSQL and use JSON files. But the real version should use a database.

---

## Core App Roles

### Merchant

The merchant owns the store.

The merchant can:

- Add products.
- View catalog.
- See orders.
- See abandoned carts.
- Chat with the Growth Agent.
- Approve/reject agent recommendations.
- See campaign results.
- See revenue generated.

### Growth Agent

The Growth Agent is not a normal chatbot. It is a decision-making assistant with tools.

It can:

- Read product data.
- Read customer/cart/payment events.
- Detect abandoned carts.
- Detect products with high views but low sales.
- Suggest discounts/bundles.
- Generate campaign copy.
- Create Razorpay payment links after merchant approval.
- Track results.

The Growth Agent should not directly do risky actions without approval in the MVP.

### Buyer Agent

The Buyer Agent simulates an AI buyer.

It can:

- Search products.
- Ask questions about price, stock, category, delivery, use case.
- Decide which products fit the buyer need.
- Add products to cart.
- Remove products from cart.
- Ask for checkout.
- Receive payment link.
- Mark whether it paid, abandoned, or failed.

In a real-world future version, the buyer agent might not belong to your app. Your app should expose APIs so any AI buyer can transact with the merchant.

---

## Important Design Decision

The agents should not directly touch the database or Razorpay API.

They should call safe backend tools:

```text
search_products()
get_product_details()
create_cart()
add_item_to_cart()
remove_item_from_cart()
create_checkout()
create_razorpay_payment_link()
get_payment_status()
find_abandoned_carts()
recommend_growth_actions()
create_campaign()
```

This makes the system safer and easier to debug.

The LLM decides what tool to call. Your backend executes the tool.

---

## Product Catalog

### Start With JSON

Create a file like:

```json
[
  {
    "id": "prod_001",
    "name": "Premium Coffee Gift Box",
    "slug": "premium-coffee-gift-box",
    "description": "A curated gift box with roasted coffee, cookies, and a ceramic mug.",
    "category": "gifting",
    "price": 149900,
    "currency": "INR",
    "stock": 25,
    "images": [
      "/images/products/coffee-gift-box.jpg"
    ],
    "tags": ["gift", "coffee", "corporate", "premium"],
    "marginPercent": 35,
    "aiSummary": "Good for corporate gifts, birthdays, and premium food gifting.",
    "isActive": true
  }
]
```

Use paise for INR amounts:

```text
149900 paise = INR 1,499
```

### Why Add AI Fields?

Normal ecommerce fields are not enough for AI buyers.

Add fields like:

```text
aiSummary
bestFor
notGoodFor
commonBuyerQuestions
deliveryNotes
returnPolicy
bundleSuggestions
```

This makes the merchant more understandable to AI buyers.

Example:

```json
{
  "bestFor": ["corporate gifting", "birthday gift", "coffee lovers"],
  "notGoodFor": ["people who avoid caffeine", "same-day delivery outside Kolkata"],
  "bundleSuggestions": ["Add handwritten card", "Add extra cookie pack"]
}
```

---

## Database Models

When you move from JSON to DB, use these models.

### Product

```text
id
merchantId
name
slug
description
category
price
currency
stock
images
tags
marginPercent
aiSummary
bestFor
notGoodFor
isActive
createdAt
updatedAt
```

### Customer

```text
id
merchantId
name
email
phone
source
segment
totalSpend
lastOrderAt
createdAt
updatedAt
```

### Cart

```text
id
merchantId
customerId nullable
buyerSessionId
status
subtotal
discountTotal
total
currency
createdBy
createdAt
updatedAt
expiresAt
```

Cart status:

```text
active
checkout_created
paid
abandoned
expired
failed
```

### CartItem

```text
id
cartId
productId
quantity
unitPrice
lineTotal
createdAt
updatedAt
```

### Order

```text
id
merchantId
cartId
customerId nullable
status
amount
currency
razorpayOrderId nullable
razorpayPaymentLinkId nullable
razorpayPaymentLinkUrl nullable
createdBy
createdAt
updatedAt
```

Order status:

```text
draft
payment_pending
paid
failed
cancelled
refunded
```

### Payment

```text
id
merchantId
orderId
provider
status
amount
currency
razorpayPaymentId nullable
razorpayOrderId nullable
razorpayPaymentLinkId nullable
rawPayload
createdAt
updatedAt
```

Payment status:

```text
created
authorized
captured
failed
refunded
```

### Event

Every important thing should become an event.

```text
id
merchantId
type
actorType
actorId
entityType
entityId
metadata
createdAt
```

Event types:

```text
product_viewed
product_compared
cart_created
cart_item_added
cart_item_removed
checkout_started
payment_link_created
payment_success
payment_failed
cart_abandoned
growth_recommendation_created
growth_action_approved
campaign_created
campaign_sent
campaign_converted
```

### AgentDecision

Store what agents decided and why.

```text
id
merchantId
agentType
inputSummary
decision
reasoningSummary
toolsUsed
confidence
status
createdAt
```

Agent types:

```text
growth_agent
buyer_agent
```

### Campaign

```text
id
merchantId
name
type
status
targetSegment
offerType
discountPercent nullable
message
expectedRevenue
actualRevenue
createdByAgentDecisionId
createdAt
updatedAt
```

Campaign types:

```text
abandoned_cart_recovery
upsell
cross_sell
bundle_offer
failed_payment_recovery
repeat_customer_offer
```

---

## UI Screens To Build

### 1. Merchant Dashboard

Purpose:

Show the merchant what is happening and what the agent is doing.

Sections:

```text
Revenue today
Revenue recovered by agent
Active carts
Abandoned carts
Payment success rate
Top products
Agent recommendations
Recent events
```

Important UI cards:

```text
Total revenue
Agent-generated revenue
Abandoned cart value
Conversion rate
Pending approvals
```

### 2. Product Catalog Page

Purpose:

Let merchant see and manage products.

Features:

```text
Product grid/list
Search
Category filter
Stock status
Price
AI readiness score
Edit product
Preview as AI buyer
```

AI readiness score means:

```text
Does this product have a useful description?
Does it have tags?
Does it have use cases?
Does it have good images?
Does it have clear price and stock?
```

### 3. Product Detail Page

Purpose:

Show normal ecommerce details plus AI-commerce metadata.

Sections:

```text
Product information
Pricing
Stock
Images
AI summary
Best for
Not good for
Common questions
Bundle suggestions
Sales performance
Cart abandonment data
```

### 4. Buyer Agent Simulator

Purpose:

Demo that an AI buyer can transact.

UI layout:

```text
Left: Buyer chat
Right: Catalog/cart/payment state
Bottom/side: Agent tool calls log
```

Example buyer prompt:

```text
I need 5 premium gift boxes under INR 2,000 each for a corporate event.
```

Buyer Agent actions:

```text
search_products
compare_products
add_item_to_cart
create_checkout
open_payment_link
```

### 5. Growth Agent Workspace

Purpose:

Show what the Growth Agent sees and recommends.

Sections:

```text
Observed signals
Revenue opportunities
Recommended actions
Approval queue
Campaign drafts
Expected impact
Results
```

Example recommendation:

```text
Opportunity:
8 buyer sessions viewed Premium Coffee Gift Box but did not buy.

Reason:
High interest, low checkout conversion.

Action:
Send a 7% discount payment link to warm leads.

Expected revenue:
INR 8,365

Approval:
[Approve] [Reject] [Edit offer]
```

### 6. Orders And Payments Page

Purpose:

Track end-to-end commerce flow.

Columns:

```text
Order ID
Cart ID
Customer / Buyer session
Amount
Status
Razorpay payment link
Razorpay payment ID
Created by
Created at
```

### 7. Event Timeline Page

Purpose:

Make the agentic behavior visible.

Example timeline:

```text
10:01 Buyer Agent searched "corporate gift under 2000"
10:02 Buyer Agent viewed Premium Coffee Gift Box
10:03 Buyer Agent added 5 units to cart
10:04 Checkout created
10:04 Razorpay payment link created
10:08 Payment success webhook received
10:09 Growth Agent updated conversion report
```

---

## API Routes

Assuming Next.js App Router:

```text
/app/api/products/route.ts
/app/api/products/[id]/route.ts
/app/api/cart/route.ts
/app/api/cart/[id]/route.ts
/app/api/cart/[id]/items/route.ts
/app/api/checkout/route.ts
/app/api/orders/route.ts
/app/api/orders/[id]/route.ts
/app/api/payments/route.ts
/app/api/webhooks/razorpay/route.ts
/app/api/agents/buyer/route.ts
/app/api/agents/growth/route.ts
/app/api/agents/growth/recommendations/route.ts
/app/api/agents/growth/actions/[id]/approve/route.ts
/app/api/ai-commerce/search/route.ts
/app/api/ai-commerce/quote/route.ts
/app/api/ai-commerce/checkout/route.ts
/app/api/events/route.ts
```

---

## Route Responsibilities

### `GET /api/products`

Returns all active products.

Used by:

```text
Catalog UI
Buyer Agent
Growth Agent
AI-commerce search API
```

### `GET /api/products/:id`

Returns full product details.

Used by:

```text
Product detail page
Buyer Agent comparison
Growth Agent product analysis
```

### `POST /api/cart`

Creates a new cart.

Input:

```json
{
  "buyerSessionId": "buyer_session_123",
  "createdBy": "buyer_agent"
}
```

Output:

```json
{
  "cartId": "cart_123",
  "status": "active"
}
```

### `POST /api/cart/:id/items`

Adds item to cart.

Input:

```json
{
  "productId": "prod_001",
  "quantity": 5
}
```

### `POST /api/checkout`

Creates an order and Razorpay payment link.

Input:

```json
{
  "cartId": "cart_123",
  "customer": {
    "name": "AI Buyer",
    "email": "buyer@example.com",
    "phone": "+919999999999"
  }
}
```

Output:

```json
{
  "orderId": "order_123",
  "amount": 749500,
  "currency": "INR",
  "paymentLinkUrl": "https://rzp.io/i/example",
  "razorpayPaymentLinkId": "plink_example"
}
```

### `POST /api/webhooks/razorpay`

Receives Razorpay webhook events.

Responsibilities:

```text
Verify webhook signature
Parse event type
Find matching order/payment link
Mark payment/order status
Create payment_success or payment_failed event
Notify Growth Agent analytics layer
```

Important:

Use webhooks for server-side payment confirmation. A callback URL is useful for redirecting the customer after payment, but it should not replace webhooks.

### `POST /api/agents/buyer`

Runs the Buyer Agent.

Example input:

```json
{
  "message": "I need 5 gift boxes under INR 2000 each.",
  "buyerSessionId": "buyer_session_123"
}
```

The Buyer Agent can call tools:

```text
search_products
get_product_details
create_cart
add_item_to_cart
remove_item_from_cart
create_checkout
check_order_status
```

### `POST /api/agents/growth`

Runs the Growth Agent.

Example input:

```json
{
  "message": "Analyze revenue opportunities for today."
}
```

The Growth Agent can call tools:

```text
get_sales_summary
find_abandoned_carts
find_failed_payments
find_high_interest_low_conversion_products
recommend_offer
draft_campaign
create_payment_link_for_campaign
```

### `POST /api/agents/growth/actions/:id/approve`

Merchant approves an agent action.

Example:

```json
{
  "actionId": "action_123"
}
```

Then backend executes the approved action.

---

## Agent Tools

### Buyer Agent Tools

#### `search_products`

Input:

```json
{
  "query": "premium corporate gift under 2000",
  "maxPrice": 200000,
  "category": "gifting"
}
```

Output:

```json
{
  "products": [
    {
      "id": "prod_001",
      "name": "Premium Coffee Gift Box",
      "price": 149900,
      "currency": "INR",
      "stock": 25,
      "reason": "Fits budget and corporate gifting use case."
    }
  ]
}
```

#### `create_cart`

Creates a cart for the buyer session.

#### `add_item_to_cart`

Adds selected products to the cart.

#### `create_checkout`

Creates order and payment link through the backend.

The Buyer Agent should not call Razorpay directly.

---

### Growth Agent Tools

#### `find_abandoned_carts`

Finds carts where checkout was not completed.

Example output:

```json
{
  "abandonedCarts": [
    {
      "cartId": "cart_123",
      "amount": 749500,
      "products": ["Premium Coffee Gift Box"],
      "lastActivityAt": "2026-08-20T10:12:00Z"
    }
  ]
}
```

#### `find_high_interest_low_conversion_products`

Finds products with many views but low purchases.

#### `recommend_offer`

Creates an offer strategy.

Example:

```json
{
  "type": "abandoned_cart_recovery",
  "discountPercent": 7,
  "reason": "High cart value and no completed checkout within 30 minutes.",
  "expectedRevenue": 697000
}
```

#### `draft_campaign`

Creates a campaign message.

#### `create_payment_link_for_campaign`

Creates Razorpay payment links only after merchant approval.

---

## Razorpay Test-Mode Flow

Use Razorpay test mode for the demo.

There are two common ways:

1. **Payment Links**
   - Easier for this project.
   - Backend creates a hosted Razorpay payment link.
   - Buyer opens link and pays.
   - Razorpay sends webhook.

2. **Orders + Checkout**
   - More custom frontend checkout.
   - Backend creates Razorpay order.
   - Frontend opens Razorpay Checkout.
   - Backend verifies payment signature.
   - Webhook confirms server-side state.

For this project, start with **Payment Links**.

Razorpay Payment Links API:

```text
POST https://api.razorpay.com/v1/payment_links
```

Basic payload shape:

```json
{
  "amount": 749500,
  "currency": "INR",
  "reference_id": "order_123",
  "description": "Payment for Premium Coffee Gift Box x 5",
  "customer": {
    "name": "AI Buyer",
    "contact": "+919999999999",
    "email": "buyer@example.com"
  },
  "notify": {
    "sms": false,
    "email": false
  },
  "callback_url": "https://your-app.com/payment/success",
  "callback_method": "get",
  "notes": {
    "cartId": "cart_123",
    "createdBy": "buyer_agent"
  }
}
```

Store these fields:

```text
razorpayPaymentLinkId
paymentLinkUrl
referenceId
cartId
orderId
status
```

Important Razorpay docs notes:

- Payment Links can be created, fetched, updated, cancelled, and resent through APIs.
- The Create Standard Payment Link endpoint is `POST /v1/payment_links`.
- In Razorpay test mode, there can be a Payment Links creation limit, so do not create unlimited test links.
- Webhooks are server-to-server event notifications and should be used for reliable backend payment updates.

References:

```text
https://razorpay.com/docs/payments/payment-links/apis/
https://razorpay.com/docs/api/payments/payment-links/create-standard/
https://razorpay.com/docs/api/orders/
https://razorpay.com/docs/webhooks/
```

---

## Full Buyer Agent Flow

### Step 1: Buyer Starts Conversation

Buyer says:

```text
I need 5 premium gift boxes under INR 2,000 each for a company event.
```

### Step 2: Buyer Agent Searches Products

Tool call:

```text
search_products({
  query: "premium gift boxes corporate event",
  maxPrice: 200000,
  category: "gifting"
})
```

### Step 3: Backend Returns Matching Products

Buyer Agent receives:

```text
Premium Coffee Gift Box - INR 1,499 - stock 25
Luxury Tea Gift Box - INR 1,799 - stock 10
Chocolate Hamper - INR 999 - stock 40
```

### Step 4: Buyer Agent Decides What To Buy

Buyer Agent reasoning summary:

```text
Premium Coffee Gift Box fits the budget, has enough stock, and is appropriate for corporate gifting.
Luxury Tea Gift Box also fits, but total cost is higher.
Chocolate Hamper is cheaper but less premium.
Decision: buy Premium Coffee Gift Box x 5.
```

### Step 5: Buyer Agent Creates Cart

Tool calls:

```text
create_cart({ buyerSessionId: "buyer_session_123" })
add_item_to_cart({
  cartId: "cart_123",
  productId: "prod_001",
  quantity: 5
})
```

### Step 6: Buyer Agent Requests Checkout

Tool call:

```text
create_checkout({
  cartId: "cart_123",
  customer: {
    name: "AI Buyer",
    email: "buyer@example.com",
    phone: "+919999999999"
  }
})
```

### Step 7: Backend Creates Razorpay Payment Link

Backend:

```text
Validates cart
Checks stock
Calculates amount
Creates order in DB
Calls Razorpay Payment Links API
Stores Razorpay payment link ID and URL
Returns payment link to Buyer Agent
```

### Step 8: Buyer Pays In Test Mode

Buyer opens:

```text
https://rzp.io/i/example
```

Completes Razorpay test payment.

### Step 9: Razorpay Sends Webhook

Webhook route receives payment event.

Backend:

```text
Verifies webhook signature
Finds order by Razorpay payment link/order/payment ID
Marks order as paid
Marks cart as paid
Creates payment_success event
Reduces stock
Updates revenue analytics
```

### Step 10: Growth Agent Learns From The Flow

Growth Agent sees:

```text
Buyer asked for corporate gift boxes
Buyer compared 3 products
Buyer chose Premium Coffee Gift Box
Buyer did not choose Luxury Tea Gift Box
Buyer completed payment
```

Growth Agent can recommend:

```text
Promote Premium Coffee Gift Box for corporate buyers.
Create a bundle with handwritten card.
Improve Luxury Tea Gift Box description because it was considered but not bought.
Show Chocolate Hamper as budget alternative.
```

---

## Full Abandoned Cart Growth Flow

### Step 1: Buyer Does Not Pay

Buyer Agent creates cart but does not complete payment.

Event:

```text
cart_abandoned
```

### Step 2: Growth Agent Detects Opportunity

Growth Agent finds:

```text
Cart value: INR 7,495
Product: Premium Coffee Gift Box x 5
Status: checkout_created but not paid
Time since checkout: 45 minutes
```

### Step 3: Growth Agent Suggests Action

Recommendation:

```text
Send 7% discount payment link for this cart.
Reason: High-value cart, buyer had strong intent, no payment after checkout.
Expected recovered revenue: INR 6,970
```

### Step 4: Merchant Approves

Merchant clicks:

```text
Approve
```

### Step 5: Backend Creates Discounted Payment Link

Backend:

```text
Creates new order or updates offer
Creates Razorpay payment link
Stores campaign ID
Stores payment link ID
Creates campaign_sent event
```

### Step 6: Buyer Pays

Webhook confirms payment.

Growth Agent reports:

```text
Recovered revenue: INR 6,970
Campaign conversion: 1/1
Recommendation: use this discount only for carts above INR 5,000.
```

---

## Agent Memory

Do not make the agent remember only in conversation.

Store memory as structured events and decisions.

Examples:

```text
Buyer sessions
Products viewed
Products compared
Products added to cart
Products rejected
Reasons for rejection
Payment success/failure
Growth recommendations
Campaign outcomes
```

This lets the Growth Agent answer:

```text
Which products are AI buyers choosing?
Which products are ignored?
Which products are viewed but not bought?
Which offer type converts best?
Which buyer need appears most often?
```

---

## AI Buyer Readiness

Your merchant becomes "sellable to AI buyers" when the app exposes structured commerce endpoints.

Build these routes:

```text
GET /api/ai-commerce/search
POST /api/ai-commerce/quote
POST /api/ai-commerce/checkout
GET /api/ai-commerce/order-status/:id
```

### Search

Input:

```json
{
  "query": "corporate gifts under INR 2000",
  "quantity": 5
}
```

Output:

```json
{
  "results": [
    {
      "productId": "prod_001",
      "name": "Premium Coffee Gift Box",
      "unitPrice": 149900,
      "currency": "INR",
      "availableQuantity": 25,
      "fitReason": "Within budget and suitable for corporate gifting."
    }
  ]
}
```

### Quote

Input:

```json
{
  "items": [
    {
      "productId": "prod_001",
      "quantity": 5
    }
  ]
}
```

Output:

```json
{
  "subtotal": 749500,
  "discount": 0,
  "total": 749500,
  "currency": "INR",
  "expiresAt": "2026-08-20T12:00:00Z"
}
```

### Checkout

Input:

```json
{
  "items": [
    {
      "productId": "prod_001",
      "quantity": 5
    }
  ],
  "buyer": {
    "name": "AI Buyer",
    "email": "buyer@example.com",
    "phone": "+919999999999"
  }
}
```

Output:

```json
{
  "orderId": "order_123",
  "paymentLinkUrl": "https://rzp.io/i/example",
  "amount": 749500,
  "currency": "INR"
}
```

This is what makes the merchant transactable by an AI buyer.

---

## Agent Prompts

### Growth Agent System Prompt

```text
You are the merchant's Growth Agent.
Your goal is to increase revenue safely and measurably.
You may analyze catalog, cart, payment, and event data.
You may recommend campaigns, offers, bundles, and payment recovery actions.
You must explain the business reason for each recommendation.
You must estimate expected revenue impact when possible.
You must not create discounts, campaigns, or payment links unless the merchant approves.
Use tools instead of guessing when data is needed.
Return concise recommendations with evidence.
```

### Buyer Agent System Prompt

```text
You are an AI buyer.
Your goal is to satisfy the buyer's purchase request using the merchant catalog.
Search products, compare options, check stock and price, create a cart, and request checkout when ready.
Do not invent products.
Do not claim payment is complete until the backend confirms it.
Use tools for catalog search, cart changes, checkout, and order status.
When rejecting a product, store a short reason.
```

---

## What The LLM Should Decide

The LLM can decide:

```text
Which products match a buyer request
Which products to compare
Which product is best
Whether to add to cart
What campaign to recommend
What offer copy to draft
Which abandoned carts are worth recovering
```

The LLM should not directly decide:

```text
Whether payment succeeded
Whether inventory changed
Whether Razorpay accepted payment
Whether money was received
Whether to send real messages without approval
```

Those must come from backend logic and Razorpay webhooks.

---

## Development Milestones

### Milestone 1: Static Catalog MVP

Build:

```text
products.json
GET /api/products
Catalog UI
Product detail UI
```

Goal:

Merchant can see products.

### Milestone 2: Buyer Agent Reads Catalog

Build:

```text
POST /api/agents/buyer
search_products tool
Buyer Agent UI
Tool call log
```

Goal:

Buyer Agent can search and choose products.

### Milestone 3: Cart System

Build:

```text
POST /api/cart
POST /api/cart/:id/items
GET /api/cart/:id
Cart UI
cart_created and cart_item_added events
```

Goal:

Buyer Agent can create a cart.

### Milestone 4: Razorpay Payment Link

Build:

```text
POST /api/checkout
Razorpay payment link service
Order model
Payment model
payment_link_created event
```

Goal:

Buyer Agent can get a Razorpay test-mode payment link.

### Milestone 5: Webhook Confirmation

Build:

```text
POST /api/webhooks/razorpay
Webhook signature verification
payment_success event
Order status update
Cart status update
```

Goal:

Payment status updates automatically.

### Milestone 6: Growth Agent Observes Buyer Behavior

Build:

```text
Event timeline
Growth Agent analysis route
find_abandoned_carts tool
find_high_interest_low_conversion_products tool
```

Goal:

Growth Agent can explain what buyers bought, rejected, and abandoned.

### Milestone 7: Growth Recommendations

Build:

```text
Recommendation cards
Approve/reject UI
Campaign model
create_campaign tool
```

Goal:

Merchant can approve agent revenue actions.

### Milestone 8: AI-Commerce API

Build:

```text
/api/ai-commerce/search
/api/ai-commerce/quote
/api/ai-commerce/checkout
/api/ai-commerce/order-status
```

Goal:

External AI buyers can transact with the merchant.

---

## Folder Structure

```text
/app
  /dashboard
  /catalog
  /catalog/[id]
  /buyer-agent
  /growth-agent
  /orders
  /events
  /api
    /products
    /cart
    /checkout
    /orders
    /payments
    /webhooks/razorpay
    /agents/buyer
    /agents/growth
    /ai-commerce/search
    /ai-commerce/quote
    /ai-commerce/checkout
/components
  ProductCard.tsx
  ProductTable.tsx
  CartPanel.tsx
  AgentChat.tsx
  AgentToolLog.tsx
  GrowthRecommendationCard.tsx
  EventTimeline.tsx
  PaymentStatusBadge.tsx
/lib
  products.ts
  carts.ts
  orders.ts
  events.ts
  razorpay.ts
  agents
    buyer-agent.ts
    growth-agent.ts
    tools.ts
  analytics
    growth-signals.ts
    recommendations.ts
/data
  products.json
  customers.json
  events.json
/prisma
  schema.prisma
```

---

## Minimal First Demo Script

Use this flow in your demo:

1. Open merchant dashboard.
2. Show product catalog.
3. Open Buyer Agent.
4. Type:

```text
I need 5 premium gift boxes under INR 2,000 each.
```

5. Buyer Agent searches catalog.
6. Buyer Agent chooses product.
7. Buyer Agent creates cart.
8. Buyer Agent requests checkout.
9. App creates Razorpay test-mode payment link.
10. Open payment link and complete test payment.
11. Razorpay webhook updates order to paid.
12. Dashboard shows new revenue.
13. Growth Agent explains:

```text
This buyer searched for corporate gifting, compared 3 products, chose Premium Coffee Gift Box, and paid INR 7,495.
Recommendation: promote this product for corporate gifting and create a 10-unit bundle.
```

---

## What Makes This Project Strong

The project is strong because it proves a real business loop:

```text
AI understands buyer intent
AI searches merchant catalog
AI creates cart
AI triggers checkout
Razorpay processes payment
Webhook confirms payment
Growth Agent learns from the outcome
Merchant gets revenue insights
```

That is much better than only saying:

```text
We used AI to recommend products.
```

Your actual claim becomes:

```text
We made a merchant transactable by AI buyers and gave the merchant an AI growth agent that can increase revenue using real payment flows.
```

---

## What To Learn

Learn in this order:

1. **Next.js API routes**
   - Build backend routes.
   - Validate request bodies.
   - Return clean JSON.

2. **Product/catalog modeling**
   - Price in paise.
   - Stock.
   - Product tags.
   - AI-readable descriptions.

3. **Cart and order systems**
   - Cart states.
   - Order states.
   - Payment states.

4. **Razorpay test mode**
   - API keys.
   - Payment Links.
   - Orders.
   - Webhooks.
   - Signature verification.

5. **LLM tool calling**
   - Tools are backend functions.
   - Agent chooses tools.
   - Backend executes tools.

6. **Agent workflows**
   - Buyer Agent workflow.
   - Growth Agent workflow.
   - Approval system.

7. **Events and analytics**
   - Track every meaningful action.
   - Let Growth Agent learn from structured events.

8. **Security and safety**
   - Keep Razorpay secret keys server-side.
   - Verify webhooks.
   - Do not let agents perform risky merchant actions without approval.

---

## Final Mental Model

Think of the project like this:

```text
Product catalog = what the merchant sells
Buyer Agent = AI customer that can buy
Cart/order/payment = commerce engine
Razorpay = payment rail
Events = memory of what happened
Growth Agent = AI revenue strategist
Dashboard = proof that revenue changed
```

Do not start by training a model.

Start by building the commerce system, then give the AI agents safe tools to operate it.

