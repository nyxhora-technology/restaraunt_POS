# Restaurant POS System — Complete Project Documentation

> Multi-tenant cloud POS platform for restaurants. Supports dine-in, takeaway, kitchen display, inventory, QR menus, and online payments.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack](#2-tech-stack)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Multi-Tenant Model](#4-multi-tenant-model)
5. [Database Schema](#5-database-schema)
6. [Order Lifecycle](#6-order-lifecycle)
7. [API Reference](#7-api-reference)
8. [Role & Permission Matrix](#8-role--permission-matrix)
9. [Subscription Plans](#9-subscription-plans)
10. [Frontend Architecture](#10-frontend-architecture)
11. [Real-Time Events](#11-real-time-events)
12. [Security Model](#12-security-model)
13. [Known Issues & Fixes Applied](#13-known-issues--fixes-applied)
14. [Deployment Guide](#14-deployment-guide)

---

## 1. System Overview

The Restaurant POS System is a **multi-tenant SaaS** platform. A single deployment serves many independent restaurants, each completely isolated from one another. Each restaurant has its own menu, tables, orders, staff, inventory, and settings.

### Core Capabilities

| Module | Description |
|--------|-------------|
| **Point of Sale** | Cart-based order creation with variant support |
| **Table Management** | Visual table map with occupancy status |
| **Kitchen Display** | Live order queue for kitchen staff |
| **Order Management** | Full lifecycle tracking with real-time updates |
| **Inventory** | Auto-deduction on serve, restock, low-stock alerts |
| **QR Menu** | Public digital menu via unique restaurant slug |
| **Payments** | Razorpay online + cash, with webhook verification |
| **Platform Admin** | SUPER_ADMIN portal for managing all restaurants |

---

## 2. Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js v22 |
| Framework | Express.js |
| Database | PostgreSQL (via Prisma ORM) |
| Auth | better-auth (session-based, cookie) |
| Real-time | Socket.IO |
| Validation | Zod v4 |
| Payments | Razorpay (webhook verified) |
| Email | Resend |
| Security | helmet, cors, express-rate-limit |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18 (Vite) |
| Routing | React Router v6 |
| State | Redux Toolkit |
| Server State | TanStack Query (React Query) |
| Real-time | Socket.IO client (via `useRealtimeSync` hook) |
| UI | Vanilla CSS + CSS variables |
| Notifications | notistack |

---

## 3. High-Level Architecture

```mermaid
graph TB
    subgraph Client["Browser Client"]
        FE["React Frontend\n(Vite + Redux)"]
    end

    subgraph Backend["Node.js Backend (Express)"]
        API["REST API\n/api/*"]
        WS["Socket.IO\nReal-time Events"]
        AUTH["better-auth\n/api/auth/*"]
        MID["Middleware Stack\nrequireAuth → requireTenant\n→ requireRole → requireFeature → validate"]
    end

    subgraph Data["Data Layer"]
        PG[("PostgreSQL\n(Prisma ORM)")]
    end

    subgraph External["External Services"]
        RZP["Razorpay\nPayments"]
        RSN["Resend\nEmail"]
    end

    FE -- "HTTP REST" --> API
    FE -- "WebSocket" --> WS
    FE -- "Session Cookie" --> AUTH
    API --> MID
    MID --> PG
    WS --> PG
    API --> RZP
    API --> RSN
    RZP -- "Webhook POST" --> API
```

---

## 4. Multi-Tenant Model

Every restaurant is an isolated **tenant**. Isolation is enforced at the middleware layer — `requireTenant` reads the authenticated user's `restaurantId` from the DB session and attaches it to `req.restaurantId`. Every controller then scopes **all** Prisma queries with `where: { restaurantId: req.restaurantId }`.

```mermaid
graph LR
    U1["Staff User A\n(Restaurant Alpha)"] --> SESSION
    U2["Staff User B\n(Restaurant Beta)"] --> SESSION
    SESSION["better-auth Session\n(HTTP-only cookie)"] --> MW
    MW["requireTenant\nMiddleware"] --> |"restaurantId = Alpha"| QA["Prisma Query\nwhere: restaurantId=Alpha"]
    MW --> |"restaurantId = Beta"| QB["Prisma Query\nwhere: restaurantId=Beta"]
    QA --> DB[("PostgreSQL\nShared DB")]
    QB --> DB
```

### Tenant Isolation Checklist
- ✅ All orders scoped by `restaurantId`
- ✅ All tables scoped by `restaurantId`
- ✅ All menu items scoped by `restaurantId`
- ✅ All inventory items scoped by `restaurantId`
- ✅ Socket.IO rooms are `restaurant:{id}` — no cross-tenant event leakage
- ✅ Restaurant status checked on every request (`APPROVED` only)

---

## 5. Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    Restaurant {
        string id PK
        string name
        string slug
        string status
        string plan
    }
    User {
        string id PK
        string email
        string role
        string restaurantId FK
    }
    MenuCategory {
        string id PK
        string name
        string restaurantId FK
        int sortOrder
    }
    MenuItem {
        string id PK
        string name
        float price
        boolean available
        boolean isVeg
        string categoryId FK
        string restaurantId FK
    }
    MenuItemVariant {
        string id PK
        string label
        float price
        string menuItemId FK
    }
    Table {
        string id PK
        string name
        int capacity
        string status
        string restaurantId FK
    }
    Order {
        string id PK
        int orderNo
        string orderType
        string orderStatus
        string paymentStatus
        float subtotal
        float tax
        float totalWithTax
        string tableId FK
        string restaurantId FK
    }
    OrderItem {
        string id PK
        string name
        float price
        int quantity
        string variantLabel
        string menuItemId FK
        string variantId FK
        string orderId FK
    }
    Payment {
        string id PK
        string method
        string status
        float amount
        string orderId FK
    }
    InventoryItem {
        string id PK
        string name
        string unit
        float currentStock
        float totalStock
        string variantLabel
        string menuItemId FK
        string restaurantId FK
    }
    InventoryLog {
        string id PK
        string type
        float quantity
        float stockAfter
        string orderId FK
        string inventoryItemId FK
    }
    QrCode {
        string id PK
        string slug
        string restaurantId FK
    }
    AuditLog {
        string id PK
        string action
        string resource
        string restaurantId FK
    }

    Restaurant ||--o{ User : "has staff"
    Restaurant ||--o{ MenuCategory : "has categories"
    Restaurant ||--o{ Table : "has tables"
    Restaurant ||--o{ Order : "has orders"
    Restaurant ||--o{ InventoryItem : "tracks inventory"
    Restaurant ||--o{ QrCode : "has QR codes"
    MenuCategory ||--o{ MenuItem : "contains items"
    MenuItem ||--o{ MenuItemVariant : "has variants"
    MenuItem ||--o{ OrderItem : "referenced by"
    MenuItem ||--o{ InventoryItem : "linked to"
    Order ||--o{ OrderItem : "contains"
    Order ||--|| Payment : "has payment"
    Order }o--|| Table : "assigned to"
    InventoryItem ||--o{ InventoryLog : "has logs"
```

### Key Design Decisions

| Decision | Reason |
|----------|--------|
| `OrderItem` stores `name`, `price`, `variantLabel` as **snapshots** | Menu can change after order is placed — historical accuracy |
| `restaurantId` on every model | Multi-tenant row-level isolation without row-level-security (RLS) |
| `orderNo` is per-restaurant sequential (`@@unique([restaurantId, orderNo])`) | Human-readable order numbers per restaurant (001, 002…) |
| `InventoryItem.variantLabel` is a plain string | FK migration deferred — string match is fragile (known ARCH-3 issue) |

---

## 6. Order Lifecycle

### State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING : Order placed (POST /order)

    PENDING --> ACCEPTED : Kitchen/Manager accepts
    PENDING --> REJECTED : Kitchen/Manager rejects
    PENDING --> CANCELLED : Staff cancels

    ACCEPTED --> PREPARING : Kitchen starts cooking
    ACCEPTED --> CANCELLED : Staff cancels

    PREPARING --> READY : Food is ready
    PREPARING --> CANCELLED : Staff cancels

    READY --> SERVED : Waiter serves the table
    READY --> CANCELLED : Staff cancels

    SERVED --> COMPLETED : Payment confirmed
    SERVED --> CANCELLED : Manager cancels (⚠️ triggers inventory reversal)

    COMPLETED --> [*]
    REJECTED --> [*]
    CANCELLED --> [*]
```

### Status Transition Rules (Role-Based)

```mermaid
graph LR
    subgraph KITCHEN_STAFF["Kitchen Role"]
        K1["PENDING → ACCEPTED"]
        K2["PENDING → REJECTED"]
        K3["ACCEPTED → PREPARING"]
        K4["PREPARING → READY"]
    end
    subgraph WAITER_CASHIER["Waiter / Cashier Role"]
        W1["READY → SERVED"]
        W2["SERVED → COMPLETED"]
    end
    subgraph MANAGER_OWNER["Manager / Owner Role"]
        M1["Any → CANCELLED"]
        M2["All above transitions"]
    end
```

### Inventory Auto-Deduction Flow

```mermaid
sequenceDiagram
    participant Staff
    participant API
    participant OrderController
    participant InventoryController
    participant DB

    Staff->>API: PUT /order/:id/status {SERVED}
    API->>OrderController: updateOrderStatus()
    OrderController->>DB: UPDATE order SET status=SERVED
    OrderController-->>Staff: 200 OK (fast response)
    OrderController-)InventoryController: processOrderConsumption() [background async]
    InventoryController->>DB: For each OrderItem → decrement InventoryItem.currentStock
    InventoryController->>DB: INSERT InventoryLog (type=ORDER_DEDUCTION)
    InventoryController-)DB: Check alert thresholds → fire InventoryAlert if low
```

---

## 7. API Reference

### Base URL
- **Development:** `http://localhost:8000/api`
- Auth via HTTP-only session cookie

### Auth Endpoints (`/api/auth/*`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/sign-in/email` | Login with email + password |
| POST | `/auth/sign-up/email` | Register new user |
| GET | `/auth/get-session` | Check current session |
| POST | `/auth/sign-out` | Logout |
| POST | `/auth/change-password` | Change password |

### Restaurant (`/api/restaurant`)
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/restaurant/me` | Any | Get own restaurant info |
| PUT | `/restaurant/me` | OWNER | Update restaurant profile |
| POST | `/restaurant/register` | Auth | Register a new restaurant |
| GET | `/restaurant/staff` | OWNER/MANAGER | List all staff |
| POST | `/restaurant/staff/invite` | OWNER | Invite staff member |
| DELETE | `/restaurant/staff/:id` | OWNER | Remove staff member |

### Menu (`/api/menu`)
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/menu` | Any tenant | Full menu with categories + items + variants |
| POST | `/menu/category` | OWNER/MANAGER | Create category |
| PUT | `/menu/category/:id` | OWNER/MANAGER | Update category |
| DELETE | `/menu/category/:id` | OWNER/MANAGER | Delete category |
| POST | `/menu/item` | OWNER/MANAGER | Create menu item (with optional variants) |
| PUT | `/menu/item/:id` | OWNER/MANAGER | Update menu item |
| PATCH | `/menu/item/:id/toggle` | OWNER/MANAGER | Toggle availability |
| DELETE | `/menu/item/:id` | OWNER/MANAGER | Delete item (blocked if in orders → archive instead) |

### Orders (`/api/order`)
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/order` | Owner/Manager/Cashier/Waiter | List orders (paginated, filterable) |
| POST | `/order` | Owner/Manager/Cashier/Waiter | Create new order |
| GET | `/order/kitchen` | KITCHEN | Kitchen queue (active orders) |
| GET | `/order/dashboard` | OWNER/MANAGER | Dashboard metrics |
| GET | `/order/:id` | Owner/Manager/Cashier/Waiter | Get single order |
| PUT | `/order/:id/status` | All roles | Update order status |
| PUT | `/order/:id/items` | Owner/Manager/Cashier/Waiter | Edit order items |

### Tables (`/api/table`)
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/table` | Any tenant | List all tables + status |
| POST | `/table` | OWNER/MANAGER | Create table |
| PUT | `/table/:id` | OWNER/MANAGER | Update table |
| DELETE | `/table/:id` | OWNER/MANAGER | Delete table |

### Inventory (`/api/inventory`) — `PROFESSIONAL` plan required
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/inventory` | OWNER/MANAGER | List all items (with linked menu item + category) |
| POST | `/inventory` | OWNER/MANAGER | Create inventory item |
| PATCH | `/inventory/:id` | OWNER/MANAGER | Update inventory item |
| DELETE | `/inventory/:id` | OWNER/MANAGER | Delete item |
| POST | `/inventory/:id/restock` | OWNER/MANAGER | Add stock |
| POST | `/inventory/:id/adjust` | OWNER/MANAGER | Manual adjustment / waste |
| GET | `/inventory/alerts` | OWNER/MANAGER | Low-stock alerts |
| GET | `/inventory/logs` | OWNER/MANAGER | Full audit log |

### Payments (`/api/payment`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/payment/create-order` | Initiate Razorpay order |
| POST | `/payment/verify` | Verify Razorpay signature |
| POST | `/payment/cash/:orderId` | Record cash payment |
| GET | `/payment/history` | Payment history |
| POST | `/payment/webhook` | Razorpay webhook (raw body, verified) |

---

## 8. Role & Permission Matrix

```mermaid
graph TD
    SA["SUPER_ADMIN\n(Platform Admin)"]
    OW["OWNER"]
    MG["MANAGER"]
    CS["CASHIER"]
    WT["WAITER"]
    KT["KITCHEN"]

    SA -.->|"Platform only\nNo tenant access"| OW
    OW -->|"Full restaurant control"| MG
    MG -->|"Operational control"| CS
    MG --> WT
    MG --> KT
```

| Permission | SUPER_ADMIN | OWNER | MANAGER | CASHIER | WAITER | KITCHEN |
|-----------|:-----------:|:-----:|:-------:|:-------:|:------:|:-------:|
| Platform admin portal | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View all restaurants | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage restaurant profile | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite / remove staff | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage menu | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage tables | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create orders | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| View orders | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit order items | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Update order status | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cancel any order | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Kitchen queue view | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Manage inventory | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Dashboard & metrics | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Payment management | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 9. Subscription Plans

```mermaid
graph LR
    ST["🥉 STARTER\n· Core POS\n· Orders & Tables\n· Basic Menu"]
    PR["🥈 PROFESSIONAL\n· Everything in Starter\n· Inventory Management\n· QR Digital Menu"]
    EN["🥇 ENTERPRISE\n· Everything in Professional\n· Advanced Analytics"]

    ST --> PR --> EN
```

| Feature | STARTER | PROFESSIONAL | ENTERPRISE |
|---------|:-------:|:------------:|:----------:|
| Core POS (orders, tables, menu) | ✅ | ✅ | ✅ |
| Inventory Management | ❌ | ✅ | ✅ |
| QR Digital Menu | ❌ | ✅ | ✅ |
| Advanced Analytics | ❌ | ❌ | ✅ |

> Features are enforced server-side by `requireFeature()` middleware. In development, all features are unlocked via `DEV_UNLOCK_FEATURES=true`.

---

## 10. Frontend Architecture

### Page Routing Map

```mermaid
graph TD
    ROOT["/"] -->|"Not Auth"| AUTH["/auth\nLogin / Register"]
    ROOT -->|"Auth + no restaurant"| ONBOARD["/onboarding\nRestaurant Setup"]
    ROOT -->|"SUPER_ADMIN"| PLATFORM["/platform\nPlatform Admin"]
    ROOT -->|"OWNER/MANAGER"| HOME["/\nPOS Home\nMenu + Cart + Bill"]
    ROOT -->|"Other roles"| DASH["/dashboard\nDashboard"]

    DASH --> D1["Metrics Panel"]
    DASH --> D2["Recent Orders"]
    DASH --> D3["Menu Management"]
    DASH --> D4["Table Management"]
    DASH --> D5["Staff Panel"]
    DASH --> D6["Payment History"]
    DASH --> D7["Inventory (PRO)"]
    DASH --> D8["QR Menu (PRO)"]

    HOME --> H1["MenuContainer\n(Browse + Add to Cart)"]
    HOME --> H2["CartInfo\n(Order Details)"]
    HOME --> H3["Bill\n(Totals + Place Order)"]
    HOME --> H4["Invoice\n(Order Confirmation)"]

    ORDERS["/orders"] --> O1["OrderCard\n(per order)"]
    ORDERS --> O2["OrderDetailsModal\n(status + edit)"]
    TABLES["/tables"] --> T1["TableCard\n(occupancy)"]
    TABLES --> T2["CreateOrderModal"]
```

### Redux State Shape

```mermaid
graph LR
    STORE["Redux Store"]
    STORE --> USER["user\n─────\nid, name, email\nphone, role\nrestaurantId\nrestaurant\nisAuth"]
    STORE --> CART["cart  (Array)\n─────\nid, menuItemId\nvariantId, variantLabel\nname, price\npricePerQuantity\nquantity"]
    STORE --> CUSTOMER["customer\n─────\ncustomerName\ncustomerPhone\nguests\norderType\ntable { tableId, name }"]
```

### Data Fetching Strategy

| Data Type | Tool | Cache Key | Notes |
|-----------|------|-----------|-------|
| User session | `useLoadData` hook | Redux | Loaded once on mount |
| Menu | TanStack Query | `["menu"]` | Invalidated on menu changes |
| Orders | TanStack Query | `["orders"]` | Real-time updates via socket |
| Tables | TanStack Query | `["tables"]` | Real-time updates via socket |
| Inventory | TanStack Query | `["inventory"]` | Invalidated on stock changes |
| Kitchen orders | TanStack Query | `["kitchenOrders"]` | Polling + socket |

---

## 11. Real-Time Events

All events are scoped to the `restaurant:{restaurantId}` Socket.IO room. Clients can only receive events for their own restaurant.

### Socket Authentication
Every Socket.IO connection goes through the same session-based auth as REST:
```
Client → WebSocket handshake with session cookie
→ Socket middleware validates session via better-auth
→ Client joins room: restaurant:{restaurantId}
```

### Event Reference

| Event Name | Direction | Payload | Trigger |
|-----------|-----------|---------|---------|
| `order:updated` | Server → Client | Full order object | Any order status/item change |
| `order:created` | Server → Client | Full order object | New order placed |
| `table:updated` | Server → Client | Table object | Table status change |
| `inventory:updated` | Server → Client | Inventory summary | Stock level change |
| `inventory:alert` | Server → Client | Alert object | Stock falls below threshold |

```mermaid
sequenceDiagram
    participant Kitchen as Kitchen Display
    participant Server
    participant POS as POS Terminal
    participant Manager as Manager Dashboard

    Kitchen->>Server: PUT /order/:id/status {PREPARING}
    Server->>Server: Update DB
    Server->>POS: emit order:updated
    Server->>Manager: emit order:updated
    Server->>Kitchen: emit order:updated
    Note over POS,Manager: All screens update instantly
```

---

## 12. Security Model

### Request Middleware Chain

```mermaid
flowchart LR
    REQ["HTTP Request"] --> RL["Rate Limiter\n30 req/15min (auth)\n500 req/15min (api)"]
    RL --> HELMET["helmet()\nSecurity Headers"]
    HELMET --> CORS["CORS Check\norigin whitelist"]
    CORS --> AUTH["requireAuth\n(session cookie)"]
    AUTH --> TENANT["requireTenant\n(restaurantId + APPROVED status)"]
    TENANT --> ROLE["requireRole\n(OWNER/MANAGER/etc.)"]
    ROLE --> FEATURE["requireFeature\n(plan check)"]
    FEATURE --> VALIDATE["validate(schema)\n(Zod)"]
    VALIDATE --> CTRL["Controller\n(business logic)"]
    CTRL --> ERR["globalErrorHandler\n(structured JSON errors)"]
```

### Security Controls Summary

| Control | Implementation | Status |
|---------|---------------|--------|
| Authentication | better-auth (HTTP-only session cookies) | ✅ |
| Authorization | Role-based via `requireRole` middleware | ✅ |
| Tenant isolation | `restaurantId` scoping on all queries | ✅ |
| Input validation | Zod schemas on all write endpoints | ✅ |
| SQL injection | Prisma parameterised queries | ✅ |
| Rate limiting | express-rate-limit (in-memory) | ⚠️ Not shared across instances |
| Security headers | helmet() | ✅ |
| CORS | Whitelist by `FRONTEND_URL` env | ✅ |
| Payment webhook | HMAC signature verification | ✅ |
| Stack trace exposure | Only in `NODE_ENV=development` | ✅ |
| Process crash recovery | `uncaughtException` handler | ⚠️ Not yet added |

---

## 13. Known Issues & Fixes Applied

### Fixes Applied in This Session

| # | Issue | File(s) Changed | Status |
|---|-------|----------------|--------|
| BUG-1 | Inventory "Link Menu Item" dropdown showed categories, not items | `InventoryModal.jsx` | ✅ Fixed |
| BUG-2 | Inventory had no category filter | `inventoryController.js`, `InventoryManagement.jsx` | ✅ Fixed |
| BUG-3 | Invoice showed "UNPAID" misleadingly after order creation | `Invoice.jsx` | ✅ Fixed |
| BUG-4 | Adding variant dish gave `price: Too small` validation error | `menuRoute.js`, `MenuModal.jsx` | ✅ Fixed |
| BUG-5 | `.partial()` crash when editing dish schema had `superRefine` | `menuRoute.js` | ✅ Fixed |
| BUG-6 | Deleting referenced dish crashed with unhelpful error + browser `confirm()` | `MenuManagement.jsx` | ✅ Fixed |
| ARCH-1 | Inventory never re-credited when SERVED order was cancelled | `inventoryController.js`, `orderController.js` | ✅ Fixed |
| ARCH-5 | Tax rate hardcoded in two unlinked files | `Bill.jsx` | ✅ Documented |

### Outstanding Issues

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| CRIT-1 | 🔴 Critical | No `uncaughtException` / `unhandledRejection` handlers | Add to `app.js` |
| CRIT-2 | 🔴 Critical | Socket.IO emits unguarded — can crash if socket not ready | Wrap in try/catch |
| CRIT-3 | 🟠 High | Background inventory errors logged but not alerted to staff | Add socket alert |
| SEC-1 | 🟠 High | CORS fallback to empty string is unsafe | Strict origin check |
| SEC-2 | 🟠 High | SuperAdmin email-match runs on every request (DB write overhead) | Elevate once at login |
| SEC-3 | 🟡 Medium | Rate limiter in-memory (breaks at 2+ instances) | Add Redis store |
| RACE-2 | 🟡 Medium | Inventory deduction is non-atomic (read-modify-write race) | Use Prisma `decrement` |
| ARCH-3 | 🟡 Medium | `InventoryItem.variantLabel` has no FK to `MenuItemVariant` | DB migration |
| ARCH-A | 🟡 Medium | No request logging / observability | Add morgan + pino |
| BUG-4b | 🟡 Medium | `customerPhone` field accepts any string including scripts | Add regex validation |

---

## 14. Deployment Guide

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/dbname
BETTER_AUTH_SECRET=<random-64-char-string>
BETTER_AUTH_URL=https://your-api-domain.com
FRONTEND_URL=https://your-frontend-domain.com

# Optional but recommended
NODE_ENV=production
PORT=8000
SUPER_ADMIN_EMAIL=admin@yourdomain.com

# Payment (required for Razorpay)
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx

# Email (required for staff invitations)
RESEND_API_KEY=re_xxx
RESEND_FROM=POS Platform <noreply@yourdomain.com>
```

### Startup Sequence

```mermaid
sequenceDiagram
    participant Process
    participant Config
    participant Prisma
    participant Express
    participant Socket

    Process->>Config: Load env vars (dotenv)
    Config-->>Process: Validate secrets (throws in prod if missing)
    Process->>Prisma: prisma.$connect()
    Prisma-->>Process: DB connected
    Process->>Express: server.listen(PORT)
    Express->>Socket: initSocket(server)
    Socket-->>Express: Socket.IO ready
    Express-->>Process: Listening on PORT
```

### Database Migrations
```bash
# Apply all pending migrations
npx prisma migrate deploy

# Generate Prisma client after schema changes
npx prisma generate
```

### Development
```bash
# Backend
cd pos-backend
npm run dev         # nodemon, hot-reload

# Frontend
cd pos-frontend
npm run dev         # Vite dev server (localhost:5173)
```

### Health Check
```
GET /api/health
→ { "success": true, "database": "connected" }
```
