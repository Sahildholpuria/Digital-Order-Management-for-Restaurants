import { RestaurantOrder, RestaurantSettings } from "../types";
import { qzTrayService } from "../services/qzTrayService";

export const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);
  const isTouchScreen = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
  const isNarrowScreen = window.innerWidth <= 768;
  return isMobileUA || (Boolean(isTouchScreen) && isNarrowScreen);
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
    .map(
      (item) => `
    <tr style="border-bottom: 1px dashed #666;">
      <td style="padding: 6px 0; vertical-align: top;">
        <div style="font-size: 14px; font-weight: 900; text-transform: uppercase;">${item.name}</div>
        ${
          item.specialInstructions
            ? `<div style="font-size: 11px; font-weight: bold; color: #d97706; margin-top: 2px;">*** NOTE: ${item.specialInstructions} ***</div>`
            : ""
        }
      </td>
      <td style="text-align: right; vertical-align: top; padding: 6px 0; font-size: 18px; font-weight: 900;">
        x${item.quantity}
      </td>
    </tr>
  `
    )
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
  const restName = settings?.name || "RestaurantsOS POS";
  const restAddress = settings?.address || "";
  const restPhone = settings?.phone ? `Tel: ${settings.phone}` : "";
  const gstNo = settings?.gstNumber ? `GSTIN: ${settings.gstNumber}` : "";
  const websiteStr = settings?.websiteUrl || "";
  const bodyWidth = paperWidth === "58mm" ? "58mm" : "80mm";

  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 3px 0; vertical-align: top;">
          <div style="font-weight: bold;">${item.name}</div>
          ${item.specialInstructions ? `<div style="font-size: 9px; color: #444;">(${item.specialInstructions})</div>` : ""}
        </td>
        <td style="text-align: center; vertical-align: top; padding: 3px 0;">${item.quantity}</td>
        <td style="text-align: right; vertical-align: top; padding: 3px 0;">${currency}${item.price.toFixed(2)}</td>
        <td style="text-align: right; vertical-align: top; font-weight: bold; padding: 3px 0;">${currency}${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `
    )
    .join("");

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
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .double-divider {
            border-top: 2px double #000;
            margin: 6px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th {
            border-bottom: 1px dashed #000;
            padding: 4px 0;
            font-size: 10px;
          }
          .total-row {
            font-size: 13px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="text-center">
          <h2 style="margin: 0; font-size: 16px; font-weight: 900;">${restName}</h2>
          ${restAddress ? `<div style="font-size: 10px; margin-top: 2px;">${restAddress}</div>` : ""}
          ${restPhone ? `<div style="font-size: 10px;">${restPhone}</div>` : ""}
          ${gstNo ? `<div style="font-size: 10px; font-weight: bold; margin-top: 2px;">${gstNo}</div>` : ""}
        </div>

        <div class="double-divider"></div>

        <div style="font-size: 11px; font-weight: 900; text-align: center; margin-bottom: 4px;">
          ${order.orderType === "takeaway" || order.tableName.toLowerCase().includes("takeaway") ? "*** TAKEAWAY / PARCEL INVOICE ***" : "TAX INVOICE"}
        </div>

        <div style="font-size: 10px; display: flex; justify-content: space-between;">
          <span>INV: #${order.orderNumber}</span>
          <span>${order.orderType === "takeaway" || order.tableName.toLowerCase().includes("takeaway") ? (order.tokenNumber ? "TOKEN: #" + order.tokenNumber : order.tableName.toUpperCase()) : "TBL: " + order.tableName.toUpperCase()}</span>
        </div>
        ${order.customerName || order.customerPhone ? `
        <div style="font-size: 10px; margin-top: 2px;">
          <span>Customer: ${order.customerName || "Guest"} ${order.customerPhone ? "(" + order.customerPhone + ")" : ""}</span>
        </div>` : ""}
        <div style="font-size: 10px; display: flex; justify-content: space-between;">
          <span>Date: ${new Date(order.createdAt).toLocaleDateString()}</span>
          <span>Time: ${new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        <div class="dashed-divider"></div>

        <table>
          <thead>
            <tr>
              <th class="text-left" style="width: 45%;">Item</th>
              <th class="text-center" style="width: 15%;">Qty</th>
              <th class="text-right" style="width: 20%;">Price</th>
              <th class="text-right" style="width: 20%;">Amt</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="dashed-divider"></div>

        <table style="font-size: 11px;">
          <tr>
            <td class="text-left">Subtotal:</td>
            <td class="text-right">${currency}${order.subtotal.toFixed(2)}</td>
          </tr>
          ${
            order.discount > 0
              ? `
            <tr style="color: #000;">
              <td class="text-left">Discount:</td>
              <td class="text-right">-${currency}${order.discount.toFixed(2)}</td>
            </tr>
          `
              : ""
          }
          ${
            order.tax > 0
              ? `
            <tr>
              <td class="text-left">GST / Taxes:</td>
              <td class="text-right">${currency}${order.tax.toFixed(2)}</td>
            </tr>
          `
              : ""
          }
          <tr class="total-row" style="border-top: 1px solid #000; border-bottom: 1px solid #000;">
            <td class="text-left" style="padding: 4px 0;">GRAND TOTAL:</td>
            <td class="text-right" style="padding: 4px 0;">${currency}${order.grandTotal.toFixed(2)}</td>
          </tr>
        </table>

        <div class="dashed-divider"></div>

        <div class="text-center" style="font-size: 10px; margin-top: 6px;">
          <div style="font-weight: bold;">THANK YOU FOR DINING WITH US!</div>
          <div style="margin-top: 2px;">Please visit again</div>
          ${websiteStr ? `<div style="font-size: 9px; margin-top: 3px;">${websiteStr}</div>` : ""}
        </div>
        <div style="height: 30px;"></div>
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

export const printBillReceipt = async (
  order: RestaurantOrder,
  settings?: RestaurantSettings | null,
  paperWidth?: "80mm" | "58mm",
  forcePrint: boolean = false
): Promise<{ success: boolean; mode: "qz-tray" | "browser" | "none"; message?: string }> => {
  if (!order || !order.id) return { success: false, mode: "none" };

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
