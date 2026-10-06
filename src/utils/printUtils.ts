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
    // Global duplicate print suppression (suppresses rapid duplicate print triggers within 3.5s)
    const printKey = `${task.type}-${task.orderId || task.orderNumber || 'generic'}`;
    const now = Date.now();
    const last = this.lastPrintedMap.get(printKey) || 0;
    if (now - last < 3500) {
      console.log(`[PrintQueue] Rapid duplicate print suppressed for ${task.jobName} (${printKey})`);
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

      const res = await qzTrayService.printHTML({
        printerName: targetPrinter,
        html: task.html,
        paperWidth: task.paperWidth,
        jobName: task.jobName,
      });

      if (res.success) {
        return { success: true, mode: "qz-tray", message: res.message };
      }
      throw new Error(res.message || "QZ Tray printing failed");
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
              margin: 0;
              padding: 0;
            }
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: ${bodyWidth};
            margin: 0 auto;
            padding: 8px 6px;
            color: #000;
            background: #fff;
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .title {
            font-size: 20px;
            font-weight: 900;
            margin: 0;
            letter-spacing: 1px;
          }
          .subtitle {
            font-size: 12px;
            font-weight: bold;
            margin: 2px 0;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            font-weight: bold;
            margin: 3px 0;
          }
          .table-badge {
            font-size: 18px;
            font-weight: 900;
            text-align: center;
            background: #000;
            color: #fff;
            padding: 5px;
            margin: 6px 0;
            border-radius: 4px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
          }
          .footer {
            border-top: 2px solid #000;
            padding-top: 6px;
            margin-top: 8px;
            text-align: center;
            font-size: 12px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">KITCHEN ORDER TICKET</div>
          <div class="subtitle">${restaurantName.toUpperCase()}</div>
        </div>

        <div class="meta-row">
          <span>KOT #: <strong>${order.orderNumber}</strong></span>
          <span>${new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
        </div>
        <div class="meta-row">
          <span>Date: ${new Date(order.createdAt).toLocaleDateString()}</span>
          <span>Type: <strong>${order.orderType === 'takeaway' ? 'TAKEAWAY' : 'DINE-IN'}</strong></span>
        </div>

        <div class="table-badge">
          ${order.orderType === 'takeaway' ? `TAKEAWAY ${order.tokenNumber ? '#' + order.tokenNumber : ''}` : order.tableName.toUpperCase()}
          ${order.tableFloor ? ` (${order.tableFloor.toUpperCase()})` : ''}
        </div>

        ${order.customerName ? `<div class="meta-row"><span>Customer: ${order.customerName}</span>${order.customerPhone ? `<span>Ph: ${order.customerPhone}</span>` : ''}</div>` : ''}

        <table class="items-table">
          <thead>
            <tr style="border-bottom: 2px solid #000; font-size: 13px;">
              <th style="text-align: left; padding-bottom: 4px;">ITEM</th>
              <th style="text-align: right; padding-bottom: 4px;">QTY</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div style="font-size: 14px; font-weight: 900; margin-bottom: 4px;">
            TOTAL ITEMS: ${totalItemsCount}
          </div>
          ${order.orderNotes ? `<div style="border: 1px dashed #000; padding: 4px; margin-top: 4px; font-weight: bold;">ORDER NOTE: ${order.orderNotes}</div>` : ''}
        </div>
        <div style="height: 25px;"></div>
      </body>
    </html>
  `;
};

export const generateBillReceiptHtml = (
  order: RestaurantOrder,
  settings?: RestaurantSettings | null,
  paperWidth: "80mm" | "58mm" = "80mm"
): string => {
  const bodyWidth = paperWidth === "58mm" ? "58mm" : "80mm";
  const currency = settings?.currency || "₹";
  const restName = settings?.name || "RestaurantsOS";
  const address = settings?.address || "";
  const phone = settings?.phone || "";
  const gstin = settings?.gstNumber || "";
  const websiteStr = settings?.websiteUrl || "";

  const isTakeaway = order.orderType === "takeaway" || !!order.tokenNumber;

  const itemsHtml = order.items
    .map((item) => {
      const lowerName = item.name.toLowerCase();
      const portionStr = item.portion ? item.portion.toLowerCase() : "";
      const isHalf = portionStr.includes("half") || lowerName.includes("(half)") || lowerName.includes("[half]");
      const isFull = portionStr.includes("full") || lowerName.includes("(full)") || lowerName.includes("[full]");

      let portionBadge = "";
      if (isHalf) {
        portionBadge = ' <span style="font-size: 9px; font-weight: 800; border: 1px solid #334155; padding: 0 3px; border-radius: 2px;">HALF</span>';
      } else if (isFull) {
        portionBadge = ' <span style="font-size: 9px; font-weight: 800; border: 1px solid #334155; padding: 0 3px; border-radius: 2px;">FULL</span>';
      } else if (item.portion) {
        portionBadge = ` <span style="font-size: 9px; font-weight: 800; border: 1px solid #334155; padding: 0 3px; border-radius: 2px;">${item.portion.toUpperCase()}</span>`;
      }

      const cleanName = item.name
        .replace(/\s*\((half|full)\)/gi, "")
        .replace(/\s*\[(half|full)\]/gi, "")
        .trim();

      const itemTotal = item.price * item.quantity;

      return `
        <tr style="border-bottom: 1px dashed #cbd5e1; font-size: 11px;">
          <td style="padding: 5px 0; text-align: left; vertical-align: top; font-weight: 700;">
            ${cleanName}${portionBadge}
          </td>
          <td style="padding: 5px 2px; text-align: center; vertical-align: top; font-weight: 800; font-family: ui-monospace, monospace;">
            ${item.quantity}
          </td>
          <td style="padding: 5px 2px; text-align: right; vertical-align: top; font-family: ui-monospace, monospace;">
            ${currency}${item.price.toFixed(2)}
          </td>
          <td style="padding: 5px 0; text-align: right; vertical-align: top; font-weight: 800; font-family: ui-monospace, monospace;">
            ${currency}${itemTotal.toFixed(2)}
          </td>
        </tr>
      `;
    })
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
              margin: 0;
              padding: 0;
            }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            width: ${bodyWidth};
            margin: 0 auto;
            padding: 8px 6px;
            color: #0f172a;
            background: #fff;
            box-sizing: border-box;
          }
          .center { text-align: center; }
          .bold { font-weight: 800; }
        </style>
      </head>
      <body>
        <div class="center" style="margin-bottom: 8px; border-bottom: 2px dashed #0f172a; padding-bottom: 6px;">
          <h2 style="margin: 0; font-size: 16px; font-weight: 900; text-transform: uppercase;">${restName}</h2>
          ${address ? `<p style="margin: 2px 0; font-size: 10px; color: #475569;">${address}</p>` : ''}
          ${phone ? `<p style="margin: 2px 0; font-size: 10px; color: #475569;">Ph: ${phone}</p>` : ''}
          ${gstin ? `<p style="margin: 2px 0; font-size: 10px; font-weight: bold;">GSTIN: ${gstin}</p>` : ''}
          <div style="font-size: 11px; font-weight: 900; margin-top: 4px; letter-spacing: 0.5px;">TAX INVOICE</div>
        </div>

        <div style="font-size: 10px; margin-bottom: 6px; line-height: 1.4;">
          <div style="display: flex; justify-content: space-between;">
            <span>Bill #: <strong>${order.orderNumber}</strong></span>
            <span>${new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>${isTakeaway ? `Takeaway ${order.tokenNumber ? '#' + order.tokenNumber : ''}` : order.tableName}</span>
            <span>${new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
          </div>
          ${order.customerName ? `<div>Customer: <strong>${order.customerName}</strong>${order.customerPhone ? ` (${order.customerPhone})` : ''}</div>` : ''}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
          <thead>
            <tr style="border-bottom: 1.5px solid #0f172a; font-size: 10px; font-weight: 900;">
              <th style="text-align: left; padding: 4px 0;">ITEM</th>
              <th style="text-align: center; padding: 4px 2px;">QTY</th>
              <th style="text-align: right; padding: 4px 2px;">RATE</th>
              <th style="text-align: right; padding: 4px 0;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="border-top: 1.5px solid #0f172a; padding-top: 4px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between; margin: 2px 0;">
            <span>Subtotal:</span>
            <span style="font-family: ui-monospace, monospace; font-weight: 700;">${currency}${order.subtotal.toFixed(2)}</span>
          </div>
          ${order.tax > 0 ? `
            <div style="display: flex; justify-content: space-between; margin: 2px 0; color: #475569;">
              <span>GST / Tax:</span>
              <span style="font-family: ui-monospace, monospace;">${currency}${order.tax.toFixed(2)}</span>
            </div>
          ` : ''}
          ${order.discount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin: 2px 0; color: #16a34a;">
              <span>Discount:</span>
              <span style="font-family: ui-monospace, monospace;">-${currency}${order.discount.toFixed(2)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; font-weight: 900; border-top: 1.5px dashed #0f172a; padding-top: 4px;">
            <span>GRAND TOTAL:</span>
            <span style="font-family: ui-monospace, monospace;">${currency}${order.grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div class="center" style="margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 6px; font-size: 10px; color: #64748b;">
          <p style="margin: 2px 0;">${isTakeaway ? "Thank you for picking up with us!" : "Thank you for dining with us!"}</p>
          ${websiteStr ? `<p style="margin: 2px 0; font-family: ui-monospace, monospace; font-weight: 600; color: #334155;">${websiteStr}</p>` : '<p style="margin: 2px 0; color: #94a3b8;">Please visit again</p>'}
        </div>
        <div style="height: 25px;"></div>
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
