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

export interface PrintTask {
  id: string;
  orderId?: string;
  orderNumber?: string;
  type: "kot" | "bill" | "custom";
  html: string;
  printerName?: string;
  paperWidth: "80mm" | "58mm";
  jobName: string;
  forcePrint: boolean;
  retries: number;
  resolve: (res: { success: boolean; mode: "qz-tray" | "browser" | "none"; message?: string }) => void;
  reject: (err: any) => void;
}

/**
 * Sequential FIFO Print Queue Manager
 * Guarantees zero dropped print jobs when multiple orders arrive simultaneously.
 */
class PrintQueueManager {
  private queue: PrintTask[] = [];
  private isProcessing: boolean = false;
  private lastPrintedMap: Map<string, number> = new Map();

  public enqueue(task: Omit<PrintTask, "resolve" | "reject" | "retries">): Promise<{ success: boolean; mode: "qz-tray" | "browser" | "none"; message?: string }> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        ...task,
        retries: 0,
        resolve,
        reject
      });
      this.processQueue();
    });
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue[0];
      try {
        const res = await this.executePrintTask(task);
        task.resolve(res);
      } catch (err: any) {
        if (task.retries < 2) {
          task.retries += 1;
          console.warn(`[PrintQueue] Retrying print job ${task.jobName} (attempt ${task.retries + 1})...`);
          await new Promise(r => setTimeout(r, 400));
          continue; // retry this task
        } else {
          console.error(`[PrintQueue] Print job failed after retries:`, err);
          task.resolve({ success: false, mode: "none", message: err.message || String(err) });
        }
      }

      // Remove finished task and add spacing buffer so thermal hardware feeds and prints smoothly
      this.queue.shift();
      await new Promise(r => setTimeout(r, 300));
    }

    this.isProcessing = false;
  }

  private async executePrintTask(task: PrintTask): Promise<{ success: boolean; mode: "qz-tray" | "browser" | "none"; message?: string }> {
    // Global duplicate print suppression (suppresses accidental double clicks and duplicate auto-dispatches)
    const printKey = `${task.type}-${task.orderId || task.orderNumber || 'generic'}`;
    const now = Date.now();
    const last = this.lastPrintedMap.get(printKey) || 0;
    const suppressWindow = task.forcePrint ? 2500 : 20000;
    if (now - last < suppressWindow) {
      console.log(`[PrintQueue] Duplicate print suppressed for ${task.jobName} (${printKey})`);
      return { success: true, mode: "none", message: "Duplicate print suppressed" };
    }
    this.lastPrintedMap.set(printKey, now);

    const qzConfig = qzTrayService.getConfig();
    const targetPrinter = task.printerName || (task.type === "kot" ? qzConfig.kotPrinter : qzConfig.billPrinter);

    // 1. Silent direct thermal printing via QZ Tray if connected
    if (qzTrayService.isConnected() && (targetPrinter || qzTrayService.getPrinters().length > 0)) {
      if (!task.forcePrint) {
        if (task.type === "kot" && qzConfig.autoPrintKOT === false) {
          return { success: true, mode: "none", message: "Auto-print KOT disabled" };
        }
        if (task.type === "bill" && qzConfig.autoPrintBill === false) {
          return { success: true, mode: "none", message: "Auto-print Bill disabled" };
        }
      }

      try {
        const res = await qzTrayService.printHTML({
          printerName: targetPrinter,
          html: task.html,
          paperWidth: task.paperWidth,
          jobName: task.jobName,
        });

        if (res.success) {
          return { success: true, mode: "qz-tray", message: res.message };
        }
        console.warn("[PrintQueue] QZ Tray printHTML returned unsuccessful:", res.message);
      } catch (qzErr) {
        console.warn("[PrintQueue] QZ Tray direct print error:", qzErr);
      }

      // If QZ Tray direct print failed and user explicitly requested print, fallback to browser print dialog
      if (task.forcePrint) {
        await this.printViaBrowserIframe(task.html, task.type === "kot" ? "pos-kot-print-frame" : "pos-receipt-print-frame");
        return { success: true, mode: "browser" };
      }

      return { success: false, mode: "none", message: "QZ Tray printing failed" };
    }

    // 2. Mobile device suppression for silent background KOTs
    if (isMobileDevice() && !task.forcePrint) {
      return { success: true, mode: "none", message: "Mobile print suppressed (handled by POS)" };
    }

    // 3. Desktop manual browser print dialog fallback
    if (task.forcePrint) {
      await this.printViaBrowserIframe(task.html, task.type === "kot" ? "pos-kot-print-frame" : "pos-receipt-print-frame");
      return { success: true, mode: "browser" };
    }

    return { success: false, mode: "none", message: "QZ Tray offline" };
  }

  private printViaBrowserIframe(htmlContent: string, iframeId: string): Promise<void> {
    return new Promise((resolve) => {
      let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
      if (iframe) {
        try { document.body.removeChild(iframe); } catch (_) {}
      }

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

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) {
        resolve();
        return;
      }

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
        // Spacing buffer before next print in queue
        setTimeout(() => {
          resolve();
        }, 500);
      }, 200);
    });
  }
}

export const printQueueManager = new PrintQueueManager();

export const printHTMLContent = (
  htmlContent: string,
  iframeId: string = "pos-thermal-print-frame",
  forceMobile: boolean = false
) => {
  if (isMobileDevice() && !forceMobile) {
    console.info("[PrintUtils] Mobile browser print dialog suppressed.");
    return;
  }

  printQueueManager.enqueue({
    id: `manual-${Date.now()}`,
    type: "custom",
    html: htmlContent,
    paperWidth: "80mm",
    jobName: "POS Manual Print",
    forcePrint: true
  });
};

export const generateKOTHtml = (
  order: RestaurantOrder,
  restaurantName: string = "Main Kitchen",
  paperWidth: "80mm" | "58mm" = "80mm"
): string => {
  const printableWidth = paperWidth === "58mm" ? "48mm" : "72mm";
  const rollWidth = paperWidth === "58mm" ? "58mm" : "80mm";

  const isTakeaway = order.orderType === "takeaway" || (!order.tableId && !order.tableName);

  const itemsHtml = order.items
    .map((item) => {
      const lowerName = item.name.toLowerCase();
      const portionStr = item.portion ? item.portion.toLowerCase() : "";
      const isHalf = portionStr.includes("half") || lowerName.includes("(half)") || lowerName.includes("[half]");
      const isFull = portionStr.includes("full") || lowerName.includes("(full)") || lowerName.includes("[full]");
      
      let portionBadge = "";
      if (isHalf) {
        portionBadge = '<span style="background: #000; color: #fff; padding: 1px 5px; font-size: 10.5px; font-weight: 900; border-radius: 2px; margin-left: 4px;">[HALF]</span>';
      } else if (isFull) {
        portionBadge = '<span style="border: 1.5px solid #000; padding: 0.5px 4px; font-size: 10.5px; font-weight: 900; border-radius: 2px; margin-left: 4px;">[FULL]</span>';
      } else if (item.portion) {
        portionBadge = `<span style="border: 1.5px solid #000; padding: 0.5px 4px; font-size: 10.5px; font-weight: 900; border-radius: 2px; margin-left: 4px;">[${item.portion.toUpperCase()}]</span>`;
      }

      const cleanName = item.name
        .replace(/\s*\((half|full)\)/gi, "")
        .replace(/\s*\[(half|full)\]/gi, "")
        .trim();

      return `
        <tr style="border-bottom: 1.5px dashed #000;">
          <td style="padding: 5px 0; vertical-align: top; text-align: left;">
            <div style="font-size: 13.5px; font-weight: 900; text-transform: uppercase; color: #000; line-height: 1.25;">
              ${cleanName} ${portionBadge}
            </div>
            ${
              item.specialInstructions
                ? `<div style="font-size: 11px; font-weight: 800; color: #000; margin-top: 2px; background: #eee; padding: 2px 4px; border-radius: 2px;">*** NOTE: ${item.specialInstructions} ***</div>`
                : ""
            }
          </td>
          <td style="text-align: right; vertical-align: top; padding: 5px 0 5px 4px; font-size: 18px; font-weight: 900; font-family: ui-monospace, monospace; color: #000; white-space: nowrap;">
            x${item.quantity}
          </td>
        </tr>
      `;
    })
    .join("");

  const totalItemsCount = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>KOT_${order.orderNumber}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: ${rollWidth} auto;
            margin: 0;
          }
          @media print {
            html, body {
              width: 100%;
              margin: 0 !important;
              padding: 0 !important;
              display: flex;
              justify-content: center;
            }
            .kot-container {
              width: ${printableWidth} !important;
              margin: 0 auto !important;
            }
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 4px;
            color: #000;
            background: #fff;
            display: flex;
            justify-content: center;
          }
          .kot-container {
            width: ${printableWidth};
            max-width: 100%;
            margin: 0 auto;
            text-align: center;
          }
          .center { text-align: center; }
          .bold { font-weight: 900; }
        </style>
      </head>
      <body>
        <div class="kot-container">
          <!-- HEADER -->
          <div style="border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 5px;">
            <div style="font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #000; text-transform: uppercase;">
              KITCHEN ORDER TICKET
            </div>
            <div style="font-size: 11.5px; font-weight: 800; color: #000; margin-top: 1px; text-transform: uppercase;">
              ${restaurantName}
            </div>
          </div>

          <!-- TABLE / TOKEN HERO BANNER -->
          <div style="background: #000; color: #fff; padding: 6px 4px; margin: 5px 0; border-radius: 3px; font-size: 17px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase;">
            ${isTakeaway ? `TAKEAWAY ${order.tokenNumber ? '#' + order.tokenNumber : '(PARCEL)'}` : order.tableName.toUpperCase()}
            ${order.tableFloor ? ` - ${order.tableFloor.toUpperCase()}` : ''}
          </div>

          <!-- META DETAILS -->
          <div style="font-size: 10.5px; font-weight: 700; border-bottom: 1.5px solid #000; padding-bottom: 4px; margin-bottom: 5px; text-align: left;">
            <div style="display: flex; justify-content: space-between;">
              <span>KOT No: <strong>#${order.orderNumber}</strong></span>
              <span>Time: <strong>${new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 2px;">
              <span>Date: <strong>${new Date(order.createdAt).toLocaleDateString()}</strong></span>
              <span>Type: <strong>${isTakeaway ? 'TAKEAWAY' : 'DINE-IN'}</strong></span>
            </div>
            ${order.customerName ? `
              <div style="margin-top: 2px; font-size: 10px;">
                Customer: <strong>${order.customerName}${order.customerPhone ? ' (' + order.customerPhone + ')' : ''}</strong>
              </div>
            ` : ''}
          </div>

          <!-- ITEMS TABLE -->
          <table style="width: 100%; border-collapse: collapse; margin: 4px 0 6px 0;">
            <thead>
              <tr style="border-bottom: 2px solid #000; font-size: 10.5px; font-weight: 900;">
                <th style="text-align: left; padding: 2px 0;">ITEM NAME</th>
                <th style="text-align: right; padding: 2px 0;">QTY</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- FOOTER / SUMMARY -->
          <div style="border-top: 2px solid #000; padding-top: 4px; margin-top: 4px; font-size: 12px; font-weight: 900; display: flex; justify-content: space-between; align-items: center;">
            <span>TOTAL QUANTITY:</span>
            <span style="font-size: 16px; font-family: ui-monospace, monospace;">${totalItemsCount} ITEMS</span>
          </div>

          <div style="margin-top: 8px; font-size: 9px; font-weight: 700; color: #444; border-top: 1px dashed #000; padding-top: 4px;">
            *** DISPATCHED TO KITCHEN STATION ***
          </div>
          <div style="height: 25px;"></div>
        </div>
      </body>
    </html>
  `;
};

export const generateBillReceiptHtml = (
  order: RestaurantOrder & { paymentMethod?: string },
  settings?: RestaurantSettings | null,
  paperWidth: "80mm" | "58mm" = "80mm"
): string => {
  // Always ensure full restaurant profile is hydrated even if settings object is initially loading
  let resolvedSettings = settings;
  if (!resolvedSettings || !resolvedSettings.name) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("cached_settings_")) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.name) {
              resolvedSettings = { ...parsed, ...(settings || {}) };
              break;
            }
          }
        }
      }
    } catch (_) {}
  }

  const printableWidth = paperWidth === "58mm" ? "48mm" : "72mm";
  const rollWidth = paperWidth === "58mm" ? "58mm" : "80mm";

  const currency = resolvedSettings?.currency || "₹";
  const restName = resolvedSettings?.name || "DEMO RESTAURANT";
  const address = resolvedSettings?.address || "";
  const phone = resolvedSettings?.phone || "";
  const email = resolvedSettings?.email || "";
  const gstin = resolvedSettings?.gstNumber || "";
  
  const websiteStr = resolvedSettings?.websiteUrl || "";

  const isTakeaway = order.orderType === "takeaway" || (!order.tableId && !order.tableName);
  const paymentModeStr = (order.paymentMethod || "CASH").toUpperCase();

  const taxRate = settings?.taxPercentage || 5;
  const hasTax = (order.tax && order.tax > 0) || taxRate > 0;
  const halfTaxRate = (taxRate / 2);
  const halfTaxAmount = (order.tax || 0) / 2;
  const taxableAmount = Math.max(0, (order.subtotal || 0) - (order.discount || 0));

  const itemsHtml = (order.items || [])
    .map((item) => {
      const lowerName = item.name.toLowerCase();
      const portionStr = item.portion ? item.portion.toLowerCase() : "";
      const isHalf = portionStr.includes("half") || lowerName.includes("(half)") || lowerName.includes("[half]");
      const isFull = portionStr.includes("full") || lowerName.includes("(full)") || lowerName.includes("[full]");

      let portionBadge = "";
      if (isHalf) {
        portionBadge = ' <span style="background: #000; color: #fff; padding: 0 4px; font-size: 9px; font-weight: 800; border-radius: 2px;">H</span>';
      } else if (isFull) {
        portionBadge = ' <span style="border: 1px solid #000; padding: 0 3px; font-size: 9px; font-weight: 800; border-radius: 2px;">F</span>';
      } else if (item.portion) {
        portionBadge = ` <span style="border: 1px solid #000; padding: 0 3px; font-size: 9px; font-weight: 800; border-radius: 2px;">${item.portion.toUpperCase().slice(0, 4)}</span>`;
      }

      const cleanName = item.name
        .replace(/\s*\((half|full)\)/gi, "")
        .replace(/\s*\[(half|full)\]/gi, "")
        .trim();

      const itemTotal = item.price * item.quantity;

      return `
        <tr style="border-bottom: 1px dashed #777; font-size: 10.5px; color: #000;">
          <td style="padding: 3.5px 0; text-align: left; vertical-align: top; font-weight: 700; word-break: break-word;">
            ${cleanName}${portionBadge}
          </td>
          <td style="padding: 3.5px 2px; text-align: center; vertical-align: top; font-weight: 900; font-family: ui-monospace, monospace;">
            ${item.quantity}
          </td>
          <td style="padding: 3.5px 2px; text-align: right; vertical-align: top; font-family: ui-monospace, monospace; font-weight: 600;">
            ${currency}${item.price.toFixed(2)}
          </td>
          <td style="padding: 3.5px 0; text-align: right; vertical-align: top; font-weight: 900; font-family: ui-monospace, monospace;">
            ${currency}${itemTotal.toFixed(2)}
          </td>
        </tr>
      `;
    })
    .join("");

  const totalItemsCount = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>TAX_INVOICE_${order.orderNumber}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: ${rollWidth} auto;
            margin: 0;
          }
          @media print {
            html, body {
              width: 100%;
              margin: 0 !important;
              padding: 0 !important;
              display: flex;
              justify-content: center;
            }
            .receipt-container {
              width: ${printableWidth} !important;
              margin: 0 auto !important;
            }
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 4px;
            color: #000;
            background: #fff;
            display: flex;
            justify-content: center;
            line-height: 1.3;
          }
          .receipt-container {
            width: ${printableWidth};
            max-width: 100%;
            margin: 0 auto;
            text-align: left;
          }
          .center { text-align: center; }
          .bold { font-weight: 900; }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- RESTAURANT BRAND & TAX HEADER (CENTERED) -->
          <div class="center" style="margin-bottom: 5px; border-bottom: 2px dashed #000; padding-bottom: 5px;">
            <h2 style="margin: 0 0 2px 0; font-size: 16.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #000;">${restName}</h2>
            ${address ? `<p style="margin: 1px 0; font-size: 9.5px; font-weight: 600; color: #111;">${address}</p>` : ''}
            ${phone ? `<p style="margin: 1px 0; font-size: 9.5px; font-weight: 800; color: #000;">Ph: ${phone}${email ? ' | ' + email : ''}</p>` : (email ? `<p style="margin: 1px 0; font-size: 9.5px; color: #222;">${email}</p>` : '')}
            ${gstin ? `<p style="margin: 2px 0 0 0; font-size: 10px; font-weight: 900; letter-spacing: 0.5px;">GSTIN: ${gstin}</p>` : ''}
            
            
            <div style="font-size: 11.5px; font-weight: 900; margin-top: 5px; padding: 2.5px 0; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; letter-spacing: 1.5px;">
              *** TAX INVOICE ***
            </div>
          </div>

          <!-- INVOICE META DETAILS -->
          <div style="font-size: 9.5px; font-weight: 600; margin-bottom: 5px; padding-bottom: 4px; border-bottom: 1px dashed #000;">
            <div style="display: flex; justify-content: space-between;">
              <span>Invoice: <strong>#${order.orderNumber}</strong></span>
              <span>Date: <strong>${new Date(order.createdAt).toLocaleDateString()}</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 1.5px;">
              <span>${isTakeaway ? `Type: <strong>TAKEAWAY ${order.tokenNumber ? '#' + order.tokenNumber : ''}</strong>` : `Table: <strong>${order.tableName.replace(/^table\s*-\s*/gi, 'Table ')}</strong>`}</span>
              <span>Time: <strong>${new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</strong></span>
            </div>
            ${order.customerName ? `
              <div style="margin-top: 1.5px; font-weight: 700;">
                Customer: ${order.customerName}${order.customerPhone ? ' (' + order.customerPhone + ')' : ''}
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; margin-top: 1.5px;">
              <span>Pay Mode: <strong>${paymentModeStr}</strong></span>
              <span>Total Items: <strong>${totalItemsCount}</strong></span>
            </div>
          </div>

          <!-- BILLING ITEMS TABLE -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
            <thead>
              <tr style="border-bottom: 1.5px solid #000; font-size: 9.5px; font-weight: 900;">
                <th style="text-align: left; padding: 3px 0; width: 50%;">ITEM</th>
                <th style="text-align: center; padding: 3px 2px; width: 14%;">QTY</th>
                <th style="text-align: right; padding: 3px 2px; width: 18%;">RATE</th>
                <th style="text-align: right; padding: 3px 0; width: 18%;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- TOTALS & TAX BREAKDOWN -->
          <div style="border-top: 1.5px solid #000; padding-top: 4px; font-size: 10px; font-weight: 600;">
            <div style="display: flex; justify-content: space-between; margin: 1px 0;">
              <span>Subtotal:</span>
              <span style="font-family: ui-monospace, monospace; font-weight: 800;">${currency}${order.subtotal.toFixed(2)}</span>
            </div>

            ${order.discount && order.discount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin: 1px 0; font-weight: 800;">
                <span>Discount:</span>
                <span style="font-family: ui-monospace, monospace;">-${currency}${order.discount.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 1px 0; font-size: 9px; color: #222;">
                <span>Taxable Amount:</span>
                <span style="font-family: ui-monospace, monospace;">${currency}${taxableAmount.toFixed(2)}</span>
              </div>
            ` : ''}

            ${hasTax && halfTaxRate > 0 ? `
              <div style="display: flex; justify-content: space-between; margin: 1px 0; font-size: 9.5px;">
                <span>CGST (${halfTaxRate}%):</span>
                <span style="font-family: ui-monospace, monospace;">${currency}${halfTaxAmount.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 1px 0; font-size: 9.5px;">
                <span>SGST (${halfTaxRate}%):</span>
                <span style="font-family: ui-monospace, monospace;">${currency}${halfTaxAmount.toFixed(2)}</span>
              </div>
            ` : (order.tax && order.tax > 0 ? `
              <div style="display: flex; justify-content: space-between; margin: 1px 0;">
                <span>GST / Tax (${taxRate}%):</span>
                <span style="font-family: ui-monospace, monospace;">${currency}${order.tax.toFixed(2)}</span>
              </div>
            ` : '')}

            <!-- PROMINENT GRAND TOTAL BOX -->
            <div style="display: flex; justify-content: space-between; margin: 4px 0 3px 0; font-size: 14.5px; font-weight: 900; border-top: 1.5px dashed #000; border-bottom: 1.5px dashed #000; padding: 4px 0;">
              <span>GRAND TOTAL:</span>
              <span style="font-family: ui-monospace, monospace;">${currency}${order.grandTotal.toFixed(2)}</span>
            </div>

            <div style="text-align: center; font-size: 9.5px; font-weight: 900; margin: 3px 0 2px 0; letter-spacing: 0.5px;">
              *** PAID VIA ${paymentModeStr} ***
            </div>
          </div>

          <!-- FOOTER & BRANDING (CENTERED) -->
          <div class="center" style="margin-top: 6px; border-top: 1px solid #000; padding-top: 4px; font-size: 9px; color: #111;">
            <p style="margin: 1px 0; font-weight: 800;">${isTakeaway ? "Thank you for ordering with us!" : "Thank you for dining with us!"}</p>
            <p style="margin: 1px 0;">Please visit again!</p>
            ${websiteStr ? `<p style="margin: 2px 0; font-family: ui-monospace, monospace; font-weight: 800; color: #000;">${websiteStr}</p>` : ''}
            <p style="margin: 3px 0 0 0; font-size: 8px; color: #444;">*** Computer Generated Tax Invoice ***</p>
          </div>
          <div style="height: 25px;"></div>
        </div>
      </body>
    </html>
  `;
};

export const printKOTReceipt = async (
  order: RestaurantOrder,
  restaurantName: string = "Main Kitchen",
  paperWidth?: "80mm" | "58mm",
  forcePrint: boolean = false
): Promise<{ success: boolean; mode: "qz-tray" | "browser" | "none"; message?: string }> => {
  if (!order || !order.id) return { success: false, mode: "none" };

  if (!forcePrint && order.status === "pending") {
    console.info(`[PrintKOT] Skipped KOT auto-print for pending order #${order.orderNumber || order.id} (Awaiting Manager Acceptance)`);
    return { success: true, mode: "none", message: "Awaiting Manager Acceptance" };
  }

  const qzConfig = qzTrayService.getConfig();
  const effectiveWidth = paperWidth || qzConfig.paperWidth || "80mm";
  const kotHtml = generateKOTHtml(order, restaurantName, effectiveWidth);

  return printQueueManager.enqueue({
    id: `kot-${order.id}-${Date.now()}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    type: "kot",
    html: kotHtml,
    printerName: qzConfig.kotPrinter,
    paperWidth: effectiveWidth,
    jobName: `KOT #${order.orderNumber}`,
    forcePrint
  });
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

  return printQueueManager.enqueue({
    id: `bill-${order.id}-${Date.now()}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    type: "bill",
    html: receiptHtml,
    printerName: qzConfig.billPrinter,
    paperWidth: effectiveWidth,
    jobName: `Receipt #${order.orderNumber}`,
    forcePrint
  });
};
