# Restaurant Order Management System (SaaS)

A modern, production-ready, and highly aesthetic QR-based self-ordering and POS dashboard system designed for both single-location diners and multi-branch restaurant chains. 

Built using **React (latest)**, **Vite**, **TypeScript**, **Tailwind CSS v4**, and **Firebase** (with an intelligent real-time fallback mock engine).

---

## 🌟 Core Features

### 1. Customer Self-Ordering (QR Flow)
- **Zero Friction**: Customers scan a table-specific QR Code (e.g. `/menu/table-3`) and browse menus instantly without login.
- **Dietary & Taste Selectors**: Veg/Non-veg indicators, custom spicy level rankings, and special cooking instruction drawers.
- **Cart Manager**: Slick slide-up mobile cart drawer with real-time tax/discount parameters and quantity controls.
- **Real-Time Tracker**: Progress timeline tracking preparation states (Pending &rarr; Accepted &rarr; Preparing &rarr; Ready &rarr; Served) using real-time sync.

### 2. Live Order POS Console
- **Kitchen Notifications**: Plays chime audio and uses browser **Speech Synthesis (Web Speech API)** to speak incoming tickets ("*New order received from Table 4*").
- **Kanban Board**: Drag/stage boards separating orders into New Pending, In-Kitchen cooking, and Ready/Serving.
- **Order Editor**: Modifies quantities, items, and comments on orders before final settlements.

### 3. Smart Tables & QR Flyers
- **Capacity Controls**: Edit seating capacity, table name tags, and occupancy status.
- **Instant Export**: Generates table standees and download options for high-quality **PNG** and **PDF print-ready flyers** dynamically using `html2canvas` and `jspdf`.

### 4. Menu & Category Organizer
- **Interactive Sidebar**: Add, delete, and re-order category lists (Shift Up/Down).
- **Dish Configurator**: Toggle stock availability, duplicate items, set discount percentages, and flag bestseller/recommended dishes.

### 5. Settlement Terminal (Billing)
- **Taxes & Receipts**: Automatically calculates subtotals, custom discounts, and GST.
- **Thermal Invoice Generator**: Renders beautiful 3-inch POS thermal receipts. Supports printing via browser and downloading as PDF.
- **Settle Methods**: Clear tickets using Cash, Card, UPI, or Mobile Wallets.

### 6. Kitchen Display Screen (KDS)
- **Chef Board**: High-contrast, large typography panel displaying items grouped by table.
- **Individual Plating**: Chefs can cross off individual items as they cook before marking the entire ticket ready.
- **Timer Alerts**: Tickers highlight delayed tables (turning red/flashing if cooking exceeds 15 minutes).

### 7. Staff Roles & Reports
- **Role Permissions**: Visual controls and interface filtering for Admin, Store Manager, Cashier, Kitchen Staff, and Waiter.
- **Analytics Widgets**: Peak dining hour curves, bestselling item shares, category metrics, and weekly revenue.
- **Data Export**: Exposes transactional reports downloadable as CSV.

---

## 🛠️ Technology Stack
- **Frontend**: React (v19), Vite, TypeScript, Tailwind CSS v4, Lucide Icons.
- **Analytics & Graphs**: Recharts.
- **Document Exporter**: jsPDF & html2canvas.
- **QR Engine**: qrcode.react.
- **Database / Backend**: Firebase (Auth, Firestore, Hosting, Storage).

---

## 🚀 Getting Started

### 1. Installation
Clone the project, navigate to the directory, and install dependencies:
```bash
npm install
```

### 2. Running Locally (Demo Mode)
Run the development server:
```bash
npm run dev
```

> [!TIP]
> **Intelligent Multi-Tab Sync (No Firebase Required)**
> By default, if no Firebase environment keys are provided in `.env`, the app launches in **Real-time Mock Mode**. 
> - Open two browser tabs side-by-side:
>   1. **Tab A (Customer View)**: Go to `http://localhost:5173/menu/table-3` and add items to place an order.
>   2. **Tab B (POS Console)**: Go to `http://localhost:5173/` and click **Staff Dashboard**. Login as any role.
> - When you place an order in Tab A, Tab B will instantly play a notification chime, speak the warning message, and add the order to the Kanban board using HTML5 local storage synchronization!

---

## ☁️ Firebase Configuration

To switch the system to a live Firebase backend:

1. Create a Firebase Project at [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database**, **Authentication** (Email/Password & Google Sign-In), and **Firebase Storage**.
3. Create a `.env` file in the root directory:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```
4. Restart the development server. The app will automatically connect to your live Firebase project.

### 🔒 Firestore Security Rules
Deploy the included `firestore.rules` file to restrict access:
```bash
firebase deploy --only firestore:rules
```

---

## 📂 Project Structure
```
/src
  /assets        - Images, audio alerts
  /components    - Generic layouts
  /context       - State Providers (Theme, Restaurant context)
  /pages
    /customer    - Menu, Cart, Order Tracker
    /owner       - POS Dashboard, Tables, Menu, Settlements, Reports, Settings
    /kitchen     - KDS Displays
    /waiter      - Service Requests
    /auth        - Login portal
  /services      - Firebase client service, Mock service (fallback)
  /types         - TS type definitions
  /utils         - PDF exports, formatting helpers
```

---

## 📈 Database Schema Design (Firestore Collections)

### `restaurants/{restaurantId}`
Main settings document containing tax ratios, opening hours, brand details, and themes.

### `restaurants/{restaurantId}/users`
Accounts assigned roles: `admin`, `manager`, `cashier`, `kitchen`, or `waiter`.

### `restaurants/{restaurantId}/tables`
Physical tables tracking seat limits, table statuses (`available`, `occupied`, `reserved`), and QR code landing URLs.

### `restaurants/{restaurantId}/categories`
Food course groups ordered via order index.

### `restaurants/{restaurantId}/foodItems`
Individual menu cards containing prices, discount rates, descriptions, spicy tags, and dietary labels.

### `restaurants/{restaurantId}/orders`
Active cooking tickets and receipts listing ordered items, subtotals, table mappings, and statuses.

### `restaurants/{restaurantId}/payments`
Completed sales records for accounting dashboards.

### `restaurants/{restaurantId}/notifications`
Chimes and alerts database triggering sound chimes and screen warnings in POS sidebars.
