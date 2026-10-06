import { RestaurantOrder, RestaurantSettings } from "../types";
import { qzTrayService } from "../services/qzTrayService";

export const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();
  const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(ua);
  const isIOS = /ipad|iphone|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isTouchScreen = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  const isNarrowScreen = window.innerWidth <= 1024;
  return isMobileUA || isIOS || (Boolean(isTouchScreen) && isNarrowScreen);
};

export const printHTMLContent = (
  htmlContent: string,
  iframeId: string = "pos-thermal-print-frame",
  forceMobile: boolean = false
) => {
  // Never trigger standard browser print dialog on mobile devices so waiters don't get interrupted by system AirPrint/Android print sheets
  if (isMobileDevice() && !forceMobile) {
    console.info("[PrintUtils] Mobile browser print dialog suppressed. KOT/Bill is handled by central POS/Kitchen thermal printer.");
    return;
  }

  let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = iframeId;
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) return;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Print iframe error:", e);
    }
  }, 150);
};

export const generateKOTHtml = (
  order: RestaurantOrder,
  restaurantName: string = "Main Kitchen",
  paperWidth: "80mm" | "58mm" = "80mm"
): string => {
  const bodyWidth = paperWidth === "58mm" ? "58mm" : "80mm";

  const itemsHtml = order.items
    .map((item) => {
      const lowerName = item.name.toLowerCase();
      const portionStr = item.portion ? item.portion.toLowerCase() : "";
      const isHalf = portionStr.includes("half") || lowerName.includes("(half)") || lowerName.includes("[half]");
      const isFull = portionStr.includes("full") || lowerName.includes("(full)") || lowerName.includes("[full]");
      
      let portionBadge = "";
      if (isHalf) {
        portionBadge = '<span style="background: #000; color: #fff; padding: 2px 6px; font-size: 11px; font-weight: 900; border-radius: 3px; margin-left: 6px;">[ HALF ]</span>';
      } else if (isFull) {
        portionBadge = '<span style="border: 1.5px solid #000; padding: 1px 5px; font-size: 11px; font-weight: 900; border-radius: 3px; margin-left: 6px;">[ FULL ]</span>';
      } else if (item.portion) {
        portionBadge = `<span style="border: 1.5px solid #000; padding: 1px 5px; font-size: 11px; font-weight: 900; border-radius: 3px; margin-left: 6px;">[ ${item.portion.toUpperCase()} ]</span>`;
      }

      const cleanName = item.name
        .replace(/\s*\((half|full)\)/gi, "")
        .replace(/\s*\[(half|full)\]/gi, "")
        .trim();

      return `
    <tr style="border-bottom: 1px dashed #555;">
      <td style="padding: 6px 0; vertical-align: top;">
        <div style="font-size: 14px; font-weight: 900; text-transform: uppercase;">
          ${cleanName} ${portionBadge}
        </div>
        ${
          item.specialInstructions
            ? `<div style="font-size: 11px; font-weight: bold; color: #000; margin-top: 2px;">*** NOTE: ${item.specialInstructions} ***</div>`
            : ""
        }
      </td>
      <td style="text-align: right; vertical-align: top; padding: 6px 0; font-size: 18px; font-weight: 900;">
        x${item.quantity}
      </td>
    </tr>
  `;
    })
    .join("");

  const totalItemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>KOT_${order.orderNumber}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: ${bodyWidth} auto;
            margin: 0;
          }
          @media print {
            html, body {
              width: ${bodyWidth};
              margin: 0 auto;
              padding: 0;
            }
            .no-print { display: none !important; }
          }
          body {
            font-family: monospace, sans-serif;
            width: ${bodyWidth};
            margin: 0 auto;
            padding: 8px;
            box-sizing: border-box;
            font-size: 11px;
            line-height: 1.35;
            color: #000;
            background: #fff;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .font-bold { font-weight: bold; }
          .dashed-divider {
            border-top: 2px dashed #000;
            margin: 8px 0;
          }
          .double-divider {
            border-top: 3px double #000;
            margin: 8px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
        </style>
      </head>
      <body>
        <div class="text-center">
          <h1 style="margin: 0; font-size: 18px; font-weight: 900;">${order.orderType === "takeaway" || order.tableName.toLowerCase().includes("takeaway") ? "*** TAKEAWAY / PARCEL ***" : "*** KOT ***"}</h1>
          <div style="font-size: 11px; font-weight: bold; margin-top: 2px;">${order.orderType === "takeaway" || order.tableName.toLowerCase().includes("takeaway") ? "PARCEL PACKING TICKET" : "KITCHEN ORDER TICKET"}</div>
          <div style="font-size: 10px; color: #333;">${restaurantName}</div>
        </div>

        <div class="double-divider"></div>

        <div style="font-size: 13px; font-weight: 900; display: flex; justify-content: space-between;">
          <span>${order.orderType === "takeaway" || order.tableName.toLowerCase().includes("takeaway") ? "ORDER: " + (order.tokenNumber ? "TOKEN #" + order.tokenNumber : order.tableName.toUpperCase()) : "TABLE: " + order.tableName.toUpperCase() + (order.tableFloor ? " • " + order.tableFloor.toUpperCase() : "")}</span>
          <span>#${order.orderNumber}</span>
        </div>
        ${order.customerName || order.customerPhone ? `
        <div style="font-size: 11px; font-weight: bold; margin-top: 3px; background: #eee; padding: 2px 4px;">
          <span>Customer: ${order.customerName || "Guest"} ${order.customerPhone ? "(" + order.customerPhone + ")" : ""}</span>
        </div>` : ""}
        <div style="font-size: 10px; display: flex; justify-content: space-between; margin-top: 2px;">
          <span>Date: ${new Date(order.createdAt).toLocaleDateString()}</span>
          <span>Time: ${new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        <div class="dashed-divider"></div>

        <table>
          <thead>
            <tr style="border-bottom: 2px solid #000;">
              <th class="text-left" style="font-size: 12px; font-weight: 900; padding-bottom: 4px;">ITEM</th>
              <th class="text-right" style="font-size: 12px; font-weight: 900; padding-bottom: 4px;">QTY</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="dashed-divider"></div>

        <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 900;">
          <span>TOTAL ITEMS:</span>
          <span>${totalItemsCount}</span>
        </div>

        <div class="dashed-divider"></div>
        <div class="text-center" style="font-size: 10px; font-weight: bold; margin-top: 6px;">
          -- END OF KOT --
        </div>
        <div style="height: 30px;"></div>
      </body>
    </html>
  `;
};

export const generateBillReceiptHtml = (
  order: RestaurantOrder,
  settings?: RestaurantSettings | null,
  paperWidth: "80mm" | "58mm" = "80mm"
): string => {
  const currency = settings?.currency || "₹";
  const restName = (settings?.name || "DEMO RESTAURANT").toUpperCase();
  const restAddress = settings?.address || "";
  const gstNo = settings?.gstNumber ? `GSTIN: ${settings.gstNumber}` : "";
  const websiteStr = settings?.websiteUrl || "";
  const bodyWidth = paperWidth === "58mm" ? "58mm" : "80mm";

  const isTakeaway = order.orderType === "takeaway" || order.tableName.toLowerCase().includes("takeaway") || !!order.tokenNumber;
  const cleanTable = order.tableName.replace(/^table[\s\-_]*/gi, "Table ");
  const paymentMethodStr = (order.paymentMethod || "CASH").toUpperCase();

  const taxPercentage = settings?.taxPercentage ?? 0;
  const discountAmount = order.discount || 0;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt_${order.orderNumber}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: ${bodyWidth} auto;
            margin: 0;
          }
          @media print {
            html, body {
              width: ${bodyWidth};
              margin: 0 auto;
              padding: 0;
            }
            .no-print { display: none !important; }
          }
          body {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            width: ${bodyWidth};
            margin: 0 auto;
            padding: 10px 8px;
            box-sizing: border-box;
            font-size: 11px;
            line-height: 1.4;
            color: #0f172a;
            background: #ffffff;
          }
          .receipt-icon-wrap {
            text-align: center;
            margin-bottom: 6px;
          }
          .rest-name {
            font-size: 15px;
            font-weight: 900;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0;
            color: #0f172a;
          }
          .rest-sub {
            font-size: 10px;
            color: #475569;
            text-align: center;
            line-height: 1.3;
            margin-top: 3px;
          }
          .dashed-divider {
            border-top: 1px dashed #94a3b8;
            margin: 7px 0;
            width: 100%;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #334155;
            line-height: 1.5;
          }
          .meta-row.bold {
            font-weight: bold;
            color: #0f172a;
          }
          table.items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            color: #1e293b;
          }
          table.items-table th {
            border-bottom: 1px dashed #94a3b8;
            padding-bottom: 3px;
            font-weight: bold;
          }
          table.items-table td {
            padding: 3px 0;
            vertical-align: top;
          }
          .text-left { text-align: left; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .financial-row {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #1e293b;
            line-height: 1.5;
          }
          .grand-total-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: 0.5px;
            margin: 3px 0;
          }
          .footer-section {
            text-align: center;
            font-size: 9.5px;
            color: #475569;
            line-height: 1.45;
            margin-top: 6px;
          }
        </style>
      </head>
      <body>
        <!-- Header Green Receipt Icon -->
        <div class="receipt-icon-wrap">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: 0 auto;">
            <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
            <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
            <path d="M12 6v12"/>
          </svg>
        </div>

        <!-- Restaurant Name & Info -->
        <h4 class="rest-name">${restName}</h4>
        ${restAddress ? `<div class="rest-sub">${restAddress}</div>` : ""}
        ${gstNo ? `<div class="rest-sub" style="font-weight: bold;">${gstNo}</div>` : ""}

        ${isTakeaway ? `
        <div style="margin-top: 4px; padding: 3px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; text-align: center;">
          <div style="font-weight: 900; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">*** TAKEAWAY / PARCEL INVOICE ***</div>
          ${order.tokenNumber ? `<div style="font-weight: 900; font-size: 13px; margin-top: 2px;">TOKEN NUMBER: #${order.tokenNumber}</div>` : ""}
        </div>
        ` : ""}

        <div class="dashed-divider"></div>

        <!-- Order Metadata Grid -->
        <div class="meta-row">
          <span>Receipt No: ${order.orderNumber}</span>
          <span>Date: ${new Date(order.createdAt).toLocaleDateString("en-GB")}</span>
        </div>
        <div class="meta-row">
          <span>${isTakeaway ? "Order Type:" : "Table:"} ${isTakeaway ? "TAKEAWAY / PARCEL" : cleanTable}</span>
          <span>Time: ${new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
        </div>
        ${order.customerName ? `
        <div class="meta-row bold" style="margin-top: 2px;">
          <span>Customer: ${order.customerName}</span>
          ${order.customerPhone ? `<span>${order.customerPhone}</span>` : ""}
        </div>` : ""}

        <div class="dashed-divider"></div>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th class="text-left" style="width: 50%;">Item</th>
              <th class="text-center" style="width: 20%;">Qty</th>
              <th class="text-right" style="width: 30%;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(i => `
              <tr>
                <td class="text-left">
                  <div style="font-weight: 500;">${i.name}</div>
                  ${i.specialInstructions ? `<div style="font-size: 8.5px; color: #64748b;">(${i.specialInstructions})</div>` : ""}
                </td>
                <td class="text-center">${i.quantity}</td>
                <td class="text-right">${currency}${(i.price * i.quantity).toFixed(0)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="dashed-divider"></div>

        <!-- Financial Summary -->
        <div class="financial-row">
          <span>Subtotal</span>
          <span>${currency}${order.subtotal.toFixed(2)}</span>
        </div>
        ${discountAmount > 0 ? `
        <div class="financial-row" style="color: #dc2626; font-weight: bold;">
          <span>Discount</span>
          <span>-${currency}${discountAmount.toFixed(2)}</span>
        </div>` : ""}
        <div class="financial-row">
          <span>Taxes & GST (${taxPercentage}%)</span>
          <span>${currency}${order.tax.toFixed(2)}</span>
        </div>

        <div class="dashed-divider"></div>

        <!-- Grand Total -->
        <div class="grand-total-row">
          <span>GRAND TOTAL</span>
          <span>${currency}${order.grandTotal.toFixed(2)}</span>
        </div>

        <div class="dashed-divider"></div>

        <!-- Footer Section -->
        <div class="footer-section">
          <p style="margin: 2px 0;">Settled via ${paymentMethodStr}</p>
          <p style="margin: 2px 0;">${isTakeaway ? "Thank you for picking up with us!" : "Thank you for dining with us!"}</p>
          ${websiteStr ? `<p style="margin: 2px 0; font-family: ui-monospace, monospace; font-weight: 600; color: #334155;">${websiteStr}</p>` : `<p style="margin: 2px 0; color: #94a3b8;">Please visit again</p>`}
        </div>

        <div style="height: 25px;"></div>
      </body>
    </html>
  `;
};

const lastPrintedKotMap = new Map<string, number>();

export const printKOTReceipt = async (
  order: RestaurantOrder,
  restaurantName: string = "Main Kitchen",
  paperWidth?: "80mm" | "58mm",
  forcePrint: boolean = false
): Promise<{ success: boolean; mode: "qz-tray" | "browser" | "none"; message?: string }> => {
  if (!order || !order.id) return { success: false, mode: "none" };

  // CRITICAL: Customer QR orders start as "pending" and MUST NOT auto-print until the Manager clicks "Accept & Send to Kitchen"
  if (!forcePrint && order.status === "pending") {
    console.info(`[PrintKOT] Skipped KOT auto-print for pending order #${order.orderNumber || order.id} (Awaiting Manager Acceptance)`);
    return { success: true, mode: "none", message: "Awaiting Manager Acceptance" };
  }

  const now = Date.now();
  const lastPrintTime = lastPrintedKotMap.get(order.id) || 0;

  // Prevent duplicate print triggers for the exact same order within 15 seconds unless user explicitly clicks manual Print button
  if (!forcePrint && now - lastPrintTime < 15000) {
    console.log(`[PrintKOT] Skipped duplicate print trigger for order ${order.orderNumber || order.id}`);
    return { success: true, mode: "none" };
  }

  lastPrintedKotMap.set(order.id, now);

  const qzConfig = qzTrayService.getConfig();
  const effectiveWidth = paperWidth || qzConfig.paperWidth || "80mm";
  const kotHtml = generateKOTHtml(order, restaurantName, effectiveWidth);

  // 1. If QZ Tray is connected, execute silent direct thermal printing
  if (qzTrayService.isConnected() && (qzConfig.kotPrinter || qzTrayService.getPrinters().length > 0)) {
    // If it is an automatic print trigger, check if autoPrintKOT is enabled
    if (!forcePrint && qzConfig.autoPrintKOT === false) {
      return { success: true, mode: "none", message: "Auto-print KOT disabled" };
    }

    try {
      const res = await qzTrayService.printHTML({
        printerName: qzConfig.kotPrinter,
        html: kotHtml,
        paperWidth: effectiveWidth,
        jobName: `KOT #${order.orderNumber}`,
      });

      if (res.success) {
        return { success: true, mode: "qz-tray", message: res.message };
      }
      console.warn("QZ Tray print failed:", res.message);
    } catch (qzErr) {
      console.warn("QZ Tray print exception:", qzErr);
    }
  }

  // 2. If QZ Tray is NOT connected:
  // On mobile devices (Waiters / Captains), NEVER open the mobile browser AirPrint/Android print modal
  if (isMobileDevice()) {
    console.info("[PrintKOT] Mobile browser print dialog suppressed on phone. Central POS printer station handles physical KOT.");
    return { success: true, mode: "none", message: "Mobile print suppressed" };
  }

  // ONLY open browser print dialog on desktop PC if the user MANUALLY clicked print
  if (forcePrint) {
    printHTMLContent(kotHtml, "pos-kot-print-frame");
    return { success: true, mode: "browser" };
  }

  console.info("[PrintKOT] QZ Tray is offline. Silent KOT skipped (Start QZ Tray for zero-popup direct thermal printing).");
  return { success: false, mode: "none", message: "QZ Tray offline" };
};

const lastPrintedBillMap = new Map<string, number>();

export const printBillReceipt = async (
  order: RestaurantOrder,
  settings?: RestaurantSettings | null,
  paperWidth?: "80mm" | "58mm",
  forcePrint: boolean = false
): Promise<{ success: boolean; mode: "qz-tray" | "browser" | "none"; message?: string }> => {
  if (!order || !order.id) return { success: false, mode: "none" };

  const now = Date.now();
  const lastPrintTime = lastPrintedBillMap.get(order.id) || 0;

  // Prevent duplicate print triggers for the exact same bill within 15 seconds unless user explicitly clicks manual Print button
  if (!forcePrint && now - lastPrintTime < 15000) {
    console.log(`[PrintBill] Skipped duplicate print trigger for order ${order.orderNumber || order.id}`);
    return { success: true, mode: "none" };
  }

  lastPrintedBillMap.set(order.id, now);

  const qzConfig = qzTrayService.getConfig();
  const effectiveWidth = paperWidth || qzConfig.paperWidth || "80mm";
  const receiptHtml = generateBillReceiptHtml(order, settings, effectiveWidth);

  // 1. If QZ Tray is connected, execute silent direct thermal printing
  if (qzTrayService.isConnected() && (qzConfig.billPrinter || qzTrayService.getPrinters().length > 0)) {
    if (!forcePrint && qzConfig.autoPrintBill === false) {
      return { success: true, mode: "none", message: "Auto-print Bill disabled" };
    }

    try {
      const res = await qzTrayService.printHTML({
        printerName: qzConfig.billPrinter,
        html: receiptHtml,
        paperWidth: effectiveWidth,
        jobName: `Receipt #${order.orderNumber}`,
      });

      if (res.success) {
        return { success: true, mode: "qz-tray", message: res.message };
      }
      console.warn("QZ Tray bill print failed:", res.message);
    } catch (qzErr) {
      console.warn("QZ Tray bill print exception:", qzErr);
    }
  }

  // 2. If QZ Tray is NOT connected:
  // ONLY open browser print dialog if the user MANUALLY requested it (forcePrint === true).
  if (forcePrint) {
    printHTMLContent(receiptHtml, "pos-receipt-print-frame");
    return { success: true, mode: "browser" };
  }

  console.info("[PrintBill] QZ Tray is offline. Silent Bill skipped (Start QZ Tray for zero-popup direct thermal printing).");
  return { success: false, mode: "none", message: "QZ Tray offline" };
};
