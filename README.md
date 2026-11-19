# 🛍️ ShopNova - Full-Featured E-Commerce Web Application

ShopNova is a modern, responsive, and full-featured e-commerce platform built to fulfill **Task 1: Simple E-Commerce Store**. It delivers a complete end-to-end shopping experience featuring product discovery, dynamic shopping cart drawer, detailed product showcase, secure multi-step checkout, printable invoice generation, customer accounts, and an administrative management portal.

---

## 🌟 Key Features & Functional Modules

### 1. 🔍 Product Listings & Discovery (`/index.html`)
- **Department & Category Filtering**: Filter across *Electronics & Gadgets*, *Audio & Wearables*, *Fashion & Lifestyle*, and *Home & Workspace*.
- **Live Search & Autocomplete**: Real-time keyword matching across product titles, descriptions, and brands.
- **Price Range Filtering**: Dynamic Min and Max price constraints.
- **Sorting Options**:
  - Featured & Top Rated
  - Price: Low to High
  - Price: High to Low
  - Highest Customer Rating
  - New Arrivals
  - Alphabetical (A-Z)
- **Interactive Product Cards**:
  - High-resolution photography with hover zoom
  - Sale discounts & featured tags (`-20% OFF`, `⭐ Popular`)
  - Star ratings and verified review counts
  - Instant **"Add to Cart"** and **"Quick View"** modal overlay
  - Responsive pagination controls

### 2. 📱 Dedicated Product Details Page (`/product.html?id=...`)
- **Interactive Multi-Image Gallery**: High-res hero preview with clickable thumbnail switcher.
- **Technical Specifications**: Structured spec tables (e.g., Battery life, Connectivity, Materials, Weight).
- **Live Stock Indicator**: Dynamic stock counter (`In Stock (18 units)`, `Low Stock`, `Out of Stock`).
- **Quantity Selector**: Stepper controls bounded by live warehouse stock.
- **Customer Reviews & Ratings**:
  - Displays customer reviews with star ratings and verified buyer badges.
  - Interactive **"Share Your Review"** form to write and publish reviews instantly.
- **Related Products Carousel**: Displays recommended products from the same category.
- **"Buy Now" Direct Action**: Instantly adds item and navigates directly to checkout.

### 3. 🛒 Shopping Cart System (`Cart Drawer` & `/cart.html`)
- **Slide-Over Cart Drawer**: Offcanvas panel accessible from any page without navigation.
- **Free Shipping Progress Meter**: Real-time progress bar towards unlocking free shipping ($50 threshold).
- **Quantity Adjuster**: In-cart `[-]` and `[+]` quantity steppers and quick delete.
- **Promotional Coupon Engine**:
  - `SAVE10` → 10% discount on entire order
  - `WELCOME20` → 20% discount on orders over $50
  - `FREESHIP` → $15 shipping credit
- **Two-way Sync**: Local persistence via `localStorage` with automated database cart synchronization upon login.

### 4. 💳 Multi-Step Order Processing & Checkout (`/checkout.html`)
- **Step 1: Contact & Shipping**: Autofills saved account details for authenticated customers.
- **Step 2: Delivery Speed Options**: Standard Shipping (Free on orders $50+) vs Priority Express ($14.99).
- **Step 3: Secure Payment Simulation**:
  - Credit / Debit Card Simulator with live card chip, formatted 16-digit card input, expiry MM/YY, and CVV validation.
  - Cash on Delivery (COD) option with delivery instruction notice.
  - Instant One-Click Demo Pay option.
- **Live Order Summary Sidebar**: Real-time item preview, tax (8%), shipping, discounts, and grand total.
- **Database Transaction Protection**: Atomically decrements product stock, validates pricing server-side, and generates an official order record.

### 5. 📄 Order Confirmation & Printable Invoice (`/order-success.html`)
- **Visual Order Tracking Stepper**: Visual 4-stage pipeline (`Order Placed` ➔ `Processing` ➔ `Shipped` ➔ `Delivered`).
- **Official Commercial Invoice**: Includes customer name, shipping address, date, line items breakdown, subtotal, discounts, tax, and total.
- **Print / PDF Ready**: Styled with `@media print` CSS for clean one-click printing or PDF download.

### 6. 👤 User Authentication & Accounts (`/login.html`, `/register.html`, `/profile.html`, `/orders.html`)
- **JWT-Based Authentication**: Secure JSON Web Tokens with password hashing via `bcryptjs`.
- **User Profile Management**: Update shipping address, phone, and contact details.
- **Customer Order History**: View all past orders, tracking statuses, and invoices.
- **One-Click Demo Accounts**:
  - **Customer Demo**: `john@example.com` / `password123`
  - **Admin Demo**: `admin@shopnova.com` / `admin123`

### 7. 🛡️ Store Management Admin Portal (`/admin.html`)
- **Real-Time KPI Dashboard**: Live metrics for Total Revenue, Total Orders, Active Products, and Low Stock Alerts.
- **Customer Orders Table**: View all orders across all customers with an interactive status `<select>` to instantly update statuses (`Pending`, `Processing`, `Shipped`, `Delivered`, `Cancelled`).
- **Product Inventory Management**:
  - Inline stock quantity updater.
  - Delete product action with confirmation.
  - **"Add New Product" Modal**: Form to add new items (Title, Category, Price, Original Price, Brand, Stock, Image URL, Description, Featured toggle).

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
|---|---|
| **Backend** | Node.js (v24), Express.js (v5), SQLite via built-in `node:sqlite` |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, Cookie-Parser |
| **Database** | Persistent SQLite database (`store.sqlite`) with automatic schema setup & seeding |
| **Frontend UI** | HTML5 Semantic markup, Custom Modern CSS3 Design System, Responsive Flexbox & CSS Grid |
| **Icons & Typography** | Bootstrap Icons, Inter Google Font |
| **Client Scripting** | Vanilla Modular JavaScript (ES6+), Fetch API, Centralized State Controllers |
| **Testing** | Automated Integration Test Suite (`tests/test-suite.js`) |

---

## 📁 Project Directory Structure

```
task1_codealpha/
├── package.json               # Project manifest, scripts & dependencies
├── server.js                  # Express app entrypoint & route rewrites
├── config/
│   └── database.js            # SQLite database schema, connections & initial seed data
├── middleware/
│   ├── auth.js                # JWT token verification & role authorization (admin/customer)
│   └── error.js               # Global error handler middleware
├── routes/
│   ├── authRoutes.js          # Authentication (register, login, me, profile, demo-login)
│   ├── productRoutes.js       # Products (listing, search, filter, single detail, reviews, admin CRUD)
│   ├── orderRoutes.js         # Orders (create checkout, my-orders, single order, admin all & status)
│   └── cartRoutes.js          # Cart synchronization & promo code verification
├── public/                    # Frontend static files served by Express
│   ├── index.html             # Main storefront & product catalog
│   ├── product.html           # Dedicated product details page
│   ├── cart.html              # Dedicated shopping cart page
│   ├── checkout.html          # Multi-step checkout & payment
│   ├── order-success.html     # Order confirmation & printable commercial invoice
│   ├── orders.html            # User order history
│   ├── login.html             # User login with instant demo access
│   ├── register.html          # User registration
│   ├── profile.html           # User profile & address settings
│   ├── admin.html             # Admin management portal
│   ├── css/
│   │   ├── style.css          # Core design system, variables, header, footer & buttons
│   │   ├── components.css     # Product cards, drawer cart, checkout steps & modals
│   │   └── responsive.css     # Tablet, mobile & print media styling
│   └── js/
│       ├── api.js             # Central fetch API client with JWT header injection
│       ├── auth.js            # Authentication state manager & navbar dropdown
│       ├── cart.js            # Cart business logic, drawer controller & page renderer
│       ├── main.js            # Global toasts, search forms & quick view modal
│       ├── products.js        # Catalog search, filter chips, price sliders & sorting
│       ├── product-detail.js  # Product detail controller, gallery & review submission
│       ├── checkout.js        # Checkout validation, card simulation & order submission
│       ├── orders.js          # Order history & invoice renderer
│       └── admin.js           # Admin KPI stats, orders status changer & product adder
├── data/
│   └── store.sqlite           # Persistent SQLite database file
└── tests/
    └── test-suite.js          # Automated end-to-end integration test suite (20 tests)
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18.0.0 or higher, v22+ or v24 recommended)
- npm (v9.0.0 or higher)

### 1. Installation
Clone or navigate to the project directory and install the required dependencies:
```bash
npm install
```

### 2. Start the Application
Run the standard start command:
```bash
npm start
```
Or run with automated file watching for development:
```bash
npm run dev
```

The web server will initialize the SQLite database, seed 12 products with reviews and users, and listen on:
👉 **`http://localhost:3000`**

### 3. Run the Automated Test Suite
To verify all 20 backend endpoints (products, auth, cart, orders, reviews, and admin APIs):
```bash
npm test
```

---

## 🔑 Pre-Seeded Credentials

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Demo Customer** | `john@example.com` | `password123` | Full customer access, existing order history & prefilled address |
| **Store Admin** | `admin@shopnova.com` | `admin123` | Full administrative control, inventory management & order status controls |

*(You can also use the one-click demo login buttons directly on `/login.html` or register a new customer account anytime!)*

---

## 🏷️ Test Coupons for Checkout

- **`SAVE10`**: 10% off any order.
- **`WELCOME20`**: 20% off orders over \$50.
- **`FREESHIP`**: \$15 credit for free shipping.

---

## 📡 RESTful API Endpoints Summary

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Create customer account
- `POST /api/auth/login` - Authenticate customer or admin
- `POST /api/auth/demo-login` - Instant one-click demo token
- `GET /api/auth/me` - Get authenticated profile
- `PUT /api/auth/profile` - Update contact and address info

### Products (`/api/products`)
- `GET /api/products` - List products with query params (`search`, `category`, `minPrice`, `maxPrice`, `sort`, `page`, `limit`)
- `GET /api/products/categories` - List categories with active item counts
- `GET /api/products/featured` - List featured products
- `GET /api/products/:idOrSlug` - Get full product details, specs, and reviews
- `GET /api/products/:id/related` - Get related products in same department
- `POST /api/products/:id/reviews` - Submit a customer rating and review
- `POST /api/products` - Add product *(Admin only)*
- `PUT /api/products/:id` - Update product details or stock *(Admin only)*
- `DELETE /api/products/:id` - Delete product *(Admin only)*

### Cart & Coupons (`/api/cart`)
- `POST /api/cart/apply-promo` - Validate coupon code and compute discount
- `GET /api/cart` - Retrieve server-saved cart items
- `POST /api/cart/sync` - Synchronize client items with database cart
- `DELETE /api/cart` - Clear database cart

### Orders & Checkout (`/api/orders`)
- `POST /api/orders` - Process order checkout with atomic stock deduction
- `GET /api/orders/my-orders` - Retrieve authenticated user's order history
- `GET /api/orders/:idOrNumber` - Get single order details with printable invoice
- `GET /api/orders/admin/all` - Retrieve all orders across the store *(Admin only)*
- `PUT /api/orders/admin/:id/status` - Update order fulfillment status *(Admin only)*
