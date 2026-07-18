# 📖 RestaurantsOS Interactive Demo & Journey Guide

Welcome to the **RestaurantsOS** interactive demo guide. This document walks you through the step-by-step user journeys of the two primary user groups: **The Dining Customer** (self-ordering via QR code) and **The Restaurant Owner / Manager / Staff** (portal operations).

---

## 🚀 Setting Up the Demo
Before starting the journey, launch the application in your local environment.

1. **Start the Dev Server**:
   ```bash
   npm run dev
   ```
2. **Access URL**: Open the local address in your browser (usually `http://localhost:5173/` or `http://localhost:5174/`).

> [!TIP]
> **No-Setup Local Sync (Mock Mode)**
> If Supabase credentials are not configured, the app runs in **Real-time Mock Mode**. 
> Open **two browser windows side-by-side**:
> - **Left Window (Customer)**: Navigate to `http://localhost:5173/menu/table-1`
> - **Right Window (Staff Dashboard)**: Navigate to `http://localhost:5173/` and click **Staff Dashboard**.

---

## 🍽️ 1. The Customer Journey
This journey represents a guest walking into a restaurant, scanning a QR code on Table 1, and ordering their meal.

### Step 1: Scanning & Browsing
1. The customer lands on the menu page for Table 1 (`/menu/table-1`).
2. They are greeted with the restaurant logo, table indicator, and category slider (e.g. *All Items, Appetizers, Main Course, Drinks*).
3. **Taste Customization**:
   - Use the **Search Bar** to search for a specific item (e.g. "Paneer").
   - Click the **Veg Only** filter to filter out non-vegetarian dishes.
   - Click the **Bestsellers (POP)** filter to find top-rated recommendations.
   - Change the language toggle (top header) to **Hindi (हिन्दी)** or **English** to translate the entire UI.

### Step 2: Customizing and Carting
1. Click on a dish card to open the **Item Customization Modal**:
   - If the dish has variants (e.g. *Half* or *Full* portion sizes), select the size. Note how the price dynamically recalculates!
   - Select a **Spicy Level** (MILD, MEDIUM, HOT).
   - Enter special instructions (e.g. *"Make it extra spicy, less salt"*).
   - Adjust quantity and click **Add to Basket**.
2. Tap the bottom **View Basket** bar to open the slide-up mobile cart drawer:
   - Verify items, subtotals, tax rate (GST), and grand total.
   - Click **Confirm & Place Order**.

### Step 3: Interactive Tracking & Calling Staff
1. On successful order placement, a victory confetti shower bursts across the screen, and the customer is redirected to the **Live Order Tracker**.
2. The tracker displays a step-by-step progress timeline:
   - `Pending` (Awaiting kitchen confirmation)
   - `Accepted` (Acknowledged by chef)
   - `Preparing` (Cooking in progress)
   - `Ready` (Ready in plating area)
   - `Served` (Delivered to table)
3. **Staff Notifications**:
   - Tap **Call Waiter** in the header. The button turns orange indicating a call is active.
   - Tap **Request Bill** to let the cashier know you are ready to check out. The button turns green.

---

## 💼 2. The Restaurant Owner & Staff Journey
This journey represents the restaurant team accepting orders, cooking, generating invoices, and managing the business.

### Step 1: Staff Portal Login
1. On the home page, click **Staff Dashboard** to open the login page.
2. If in Mock Mode, bypass credentials by clicking any of the **Quick Demo Profile** buttons (e.g., *Super Admin, Administrator, Store Manager, Cashier, Kitchen, Waiter*).

### Step 2: Live Orders Board (POS Console)
* **Access**: Choose **Administrator / Store Manager / Cashier** role. Select the **Live Orders** tab.
* **Journey**:
  - Once the customer places an order, the POS terminal immediately plays a **glowing 4-note bell chime** and announces the ticket using voice synthesis: *"New order ORD-XXXX received from Table 1."*
  - The order card appears under the **New Pending** column on the Kanban board.
  - Hover or click the card to view special instructions, quantities, and elapsed timer (flashes red if pending for too long).
  - Click **Accept Order** to move it to **In Kitchen**.
  - *Need changes?* Click **Edit Items** to manually add/remove items or edit instructions on behalf of the customer.

### Step 3: Kitchen Display Screen (KDS)
* **Access**: Log in as **Kitchen Chef** or select **Kitchen Display** view.
* **Journey**:
  - The chef views orders sorted by waiting time (oldest first).
  - As they plate individual dishes, they check them off on the ticket to track progress.
  - Once all items are cooked, click **Mark Ready** to notify waitstaff. The order card moves to **Ready / Serving**.

### Step 4: Bill Settlement (POS Billing)
* **Access**: Log in as **Cashier / Administrator** and select the **POS Billing** tab.
* **Journey**:
  - Tables requesting check-out appear in the left list under **Awaiting Billing**.
  - Select the table to load its billing invoice details.
  - **Apply Discount**: Slide the discount selector to apply a custom percentage (e.g. 10% off).
  - **Receipt Print**: Click **Print Receipt** (triggers browser thermal print dialog) or **Download PDF Receipt** to generate a 3-inch PDF standee.
  - **Settle Payment**: Choose the payment method (Cash, Card, UPI, Wallet) and click **Settle & Mark Paid**.
  - *Automated Reset*: Once paid, the table's active orders are finalized, and Table 1 status automatically updates to **Available** on all screens. The order is automatically dismissed from the customer's active menu page exactly **2 minutes** later.

### Step 5: Tables & QR Flyer standees
* **Access**: Select the **Table & QR** tab.
* **Journey**:
  - Click **Add Table** to add a new physical table.
  - Manage table capacity limits or status (toggle between *Available, Occupied, Reserved*).
  - Hover on any table card and click **Download Standee** to save a print-ready PDF flyer with the table number, instructions, and QR code to place on the physical table.

### Step 6: Menu & Dishes Configurator
* **Access**: Select the **Menu List** tab.
* **Journey**:
  - Re-order categories using the **Up / Down** arrows to organize the customer's menu structure.
  - Click **Add Food Item** or edit an existing one:
    - Upload an image URL, set base price, and category.
    - Set custom portion pricing using variants (e.g., `Half=120;Full=220`).
    - Toggle **Stock Status** (marking it unavailable hides it from the customer menu).
    - Add **Discounts** (displays red price tags on the customer screen) or toggle **Bestseller** banners.

### Step 7: Sales Analytics & PDF Reports
* **Access**: Select the **Analytics** tab.
* **Journey**:
  - Review weekly sales charts, peak dining hours heatmaps (bar charts), category breakdown, and bestsellers.
  - Select a date range and click **Download CSV** or **Download PDF Report** to export business logs.
  - *Security*: All completed order history older than 30 days is auto-pruned from the database for performance scaling, but owners can download historical archives prior to deletion.

### Step 8: Super Admin SaaS Central Controls
* **Access**: Log in as **Super Admin** (or click the Super Admin button).
* **Journey**:
  - **Onboard Restaurants**: Click **Onboard Restaurant** to spin up a new tenant. Select their Initial Plan:
    - *Starter Plan*: Auto-sets expiration date to **1 Month**.
    - *Pro 6-Month*: Auto-sets expiration date to **6 Months**.
    - *Pro 1-Year*: Auto-sets expiration date to **1 Year**.
  - **Manage Subscriptions**: View active trials, expired accounts, or edit billing dates. Use **Quick Renewal** buttons (`+30 Days`, `+6 Months`, `+1 Year`) to instantly extend plan timelines.
  - **Create Staff**: Select any tenant restaurant, enter name/email, set a custom account password, and provision their administrator account.
  - **Banned/Expired Lockout**: If a tenant's subscription expires, any manager or staff trying to log into their dashboard is met with a gorgeous, full-screen lockout window, keeping your SaaS business secure and profitable.
