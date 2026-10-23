import { RestaurantOrder, RestaurantSettings } from "../types";
import { qzTrayService, PaperWidth } from "../services/qzTrayService";
import { bluetoothPrinterService } from "../services/bluetoothPrinterService";

export type { PaperWidth };

export const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || "").toLowerCase();
  const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(ua);
  const isIOS = /ipad|iphone|ipod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isTouchScreen = "ontouchstart" in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
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
  paperWidth: PaperWidth;
  jobName: string;
  forcePrint: boolean;
  retries: number;
  rawOrder?: RestaurantOrder;
  restaurantName?: string;
  settings?: RestaurantSettings | null;
  resolve: (res: { success: boolean; mode: "qz-tray" | "browser" | "bluetooth" | "none"; message?: string }) => void;
  reject: (err: any) => void;
}

/**
 * Sequential FIFO Print Queue Manager
 * Guarantees zero dropped print jobs when multiple orders arrive simultaneously.
 * Supports QZ Tray silent printing, Bluetooth ESC/POS wireless printing, and native browser/mobile AirPrint.
 */
class PrintQueueManager {
  private queue: PrintTask[] = [];
  private isProcessing: boolean = false;
  private lastPrintedMap: Map<string, number> = new Map();

  public enqueue(
    task: Omit<PrintTask, "resolve" | "reject" | "retries">
  ): Promise<{ success: boolean; mode: "qz-tray" | "browser" | "bluetooth" | "none"; message?: string }> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        ...task,
        retries: 0,
        resolve,
        reject,
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
          await new Promise((r) => setTimeout(r, 400));
          continue; // retry this task
        } else {
          console.error(`[PrintQueue] Print job failed after retries:`, err);
          task.resolve({ success: false, mode: "none", message: err.message || String(err) });
        }
      }

      // Remove finished task and add spacing buffer so thermal hardware feeds and prints smoothly
      this.queue.shift();
      await new Promise((r) => setTimeout(r, 300));
    }

    this.isProcessing = false;
  }

  private async executePrintTask(
    task: PrintTask
  ): Promise<{ success: boolean; mode: "qz-tray" | "browser" | "bluetooth" | "none"; message?: string }> {
    // Global duplicate print suppression (suppresses accidental double clicks and duplicate auto-dispatches)
    const printKey = `${task.type}-${task.orderId || task.orderNumber || "generic"}`;
    const now = Date.now();
    const last = this.lastPrintedMap.get(printKey) || 0;
    const suppressWindow = task.type === "bill" ? 8000 : (task.forcePrint ? 2000 : 20000);
    if (now - last < suppressWindow) {
      console.log(`[PrintQueue] Duplicate print suppressed for ${task.jobName} (${printKey})`);
      return { success: true, mode: "none", message: "Duplicate print suppressed" };
    }
    this.lastPrintedMap.set(printKey, now);

    // 1. Direct Web Bluetooth Thermal Printing (if a Bluetooth printer is paired)
    if (bluetoothPrinterService.getConnectedDevice()) {
      try {
        let btSuccess = false;
        if (task.type === "kot" && task.rawOrder) {
          btSuccess = await bluetoothPrinterService.printKOT(task.rawOrder, task.restaurantName);
        } else if (task.type === "bill" && task.rawOrder) {
          btSuccess = await bluetoothPrinterService.printBill(task.rawOrder, task.settings);
        }
        if (btSuccess) {
          return { success: true, mode: "bluetooth", message: "Dispatched to wireless Bluetooth thermal printer" };
        }
      } catch (btErr) {
        console.warn("[PrintQueue] Bluetooth print error:", btErr);
      }
    }

    // 2. Silent direct thermal printing via QZ Tray (if connected to desktop daemon)
    const qzConfig = qzTrayService.getConfig();
    const targetPrinter = task.printerName || (task.type === "kot" ? qzConfig.kotPrinter : qzConfig.billPrinter);

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
        await this.printViaBrowser(task.html, task.type === "kot" ? "pos-kot-print-frame" : "pos-receipt-print-frame");
        return { success: true, mode: "browser" };
      }

      return { success: false, mode: "none", message: "QZ Tray printing failed" };
    }

    // 3. Mobile device suppression for silent background KOTs (avoids disrupting mobile waiter punches)
    if (isMobileDevice() && !task.forcePrint) {
      return { success: true, mode: "none", message: "Mobile print suppressed (handled by POS terminal)" };
    }

    // 4. Universal Native Browser Print Dialog (AirPrint on iOS/iPadOS, Android Print, Windows & Mac CUPS)
    if (task.forcePrint) {
      await this.printViaBrowser(task.html, task.type === "kot" ? "pos-kot-print-frame" : "pos-receipt-print-frame");
      return { success: true, mode: "browser" };
    }

    return { success: false, mode: "none", message: "QZ Tray offline" };
  }

  /**
   * Universal Browser Printing with iOS/WebKit compatibility & popup fallback
   */
  private printViaBrowser(htmlContent: string, iframeId: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
        if (iframe) {
          try {
            document.body.removeChild(iframe);
          } catch (_) {}
        }

        // WebKit/Safari requires non-zero iframe dimensions to calculate pagination correctly for AirPrint
        iframe = document.createElement("iframe");
        iframe.id = iframeId;
        iframe.style.position = "fixed";
        iframe.style.top = "-10000px";
        iframe.style.left = "-10000px";
        iframe.style.width = "700px";
        iframe.style.height = "900px";
        iframe.style.border = "0";
        iframe.style.visibility = "hidden";
        iframe.setAttribute("aria-hidden", "true");
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document || iframe.contentDocument;
        if (!doc) {
          this.printViaPopupFallback(htmlContent);
          resolve();
          return;
        }

        doc.open();
        doc.write(htmlContent);
        doc.close();

        let printed = false;
        const triggerPrint = () => {
          if (printed) return;
          printed = true;
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn("[PrintUtils] Iframe print call failed, using popup fallback:", e);
            this.printViaPopupFallback(htmlContent);
          }
          setTimeout(() => {
            resolve();
          }, 600);
        };

        if (iframe.contentWindow) {
          iframe.contentWindow.onload = triggerPrint;
        }
        setTimeout(triggerPrint, 350);
      } catch (err) {
        console.warn("[PrintUtils] Error creating print iframe, falling back to popup:", err);
        this.printViaPopupFallback(htmlContent);
        resolve();
      }
    });
  }

  private printViaPopupFallback(htmlContent: string) {
    try {
      const printWin = window.open("", "_blank", "width=700,height=900,toolbar=no,menubar=no,scrollbars=yes");
      if (printWin) {
        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
          try {
            printWin.print();
          } catch (_) {}
        }, 300);
      }
    } catch (e) {
      console.error("[PrintUtils] Popup print fallback failed:", e);
    }
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
    forcePrint: true,
  });
};

/**
 * Generate Kitchen Order Ticket (KOT) HTML for 80mm, 58mm, or A4 printers
 */
export const generateKOTHtml = (
  order: RestaurantOrder,
  restaurantName: string = "Main Kitchen",
  paperWidth: PaperWidth = "80mm"
): string => {
  const isTakeaway = order.orderType === "takeaway" || (!order.tableId && !order.tableName);
  const totalItemsCount = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);

  // A4 KITCHEN MASTER PRODUCTION SHEET
  if (paperWidth === "A4") {
    const itemsRows = (order.items || [])
      .map((item, idx) => {
        const portionBadge = item.portion ? ` [${item.portion.toUpperCase()}]` : "";
        return `
          <tr style="border-bottom: 1.5px solid #000; font-size: 13px;">
            <td style="padding: 10px 8px; text-align: center; font-weight: bold; width: 40px;">${idx + 1}</td>
            <td style="padding: 10px 8px; text-align: left;">
              <span style="font-weight: 900; font-size: 15px; text-transform: uppercase;">${item.name}</span>
              ${portionBadge ? `<span style="border: 1.5px solid #000; padding: 2px 6px; font-weight: 800; border-radius: 3px; margin-left: 6px; font-size: 11px;">${portionBadge}</span>` : ""}
              ${item.specialInstructions ? `<div style="margin-top: 4px; font-size: 12px; font-weight: bold; background: #f0f0f0; padding: 4px 8px; border-left: 4px solid #000;">*** NOTE: ${item.specialInstructions} ***</div>` : ""}
            </td>
            <td style="padding: 10px 8px; text-align: center; font-size: 20px; font-weight: 900; font-family: ui-monospace, monospace; width: 80px;">x${item.quantity}</td>
            <td style="padding: 10px 8px; text-align: center; width: 70px;">
              <span style="display: inline-block; width: 22px; height: 22px; border: 2px solid #000; border-radius: 4px;"></span>
            </td>
          </tr>
        `;
      })
      .join("");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>KOT_${order.orderNumber}_A4</title>
          <meta charset="utf-8" />
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 0; color: #000; background: #fff; }
            .a4-kot { width: 100%; max-width: 180mm; margin: 0 auto; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 8px; font-size: 12px; text-transform: uppercase; font-weight: 900; background: #fafafa; }
          </style>
        </head>
        <body>
          <div class="a4-kot">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #000; padding-bottom: 12px;">
              <div>
                <h1 style="margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">KITCHEN ORDER TICKET</h1>
                <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #333;">${restaurantName.toUpperCase()} &bull; PRODUCTION ORDER</p>
              </div>
              <div style="background: #000; color: #fff; padding: 8px 16px; border-radius: 6px; text-align: center;">
                <div style="font-size: 12px; font-weight: 800; letter-spacing: 0.5px;">STATION</div>
                <div style="font-size: 22px; font-weight: 900; text-transform: uppercase;">${isTakeaway ? `TAKEAWAY #${order.tokenNumber || "PARCEL"}` : (order.tableName || "TABLE").toUpperCase()}</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 12px; padding: 10px; background: #f8f8f8; border: 1.5px solid #000; border-radius: 6px; font-size: 12px;">
              <div><strong>KOT Number:</strong> #${order.orderNumber}</div>
              <div><strong>Time:</strong> ${new Date(order.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}</div>
              <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</div>
              <div><strong>Dining Zone:</strong> ${order.tableFloor ? order.tableFloor.toUpperCase() : "Main Dining"}</div>
              <div><strong>Order Type:</strong> ${isTakeaway ? "TAKEAWAY (PARCEL)" : "DINE-IN"}</div>
              <div><strong>Attendant / Captain:</strong> Server</div>
              ${order.customerName ? `<div style="grid-column: span 3;"><strong>Customer:</strong> ${order.customerName}${order.customerPhone ? " (" + order.customerPhone + ")" : ""}</div>` : ""}
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">#</th>
                  <th style="text-align: left;">ORDERED ITEM & CHEF NOTES</th>
                  <th style="width: 80px; text-align: center;">QUANTITY</th>
                  <th style="width: 70px; text-align: center;">DONE</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2.5px solid #000; margin-top: 20px; padding-top: 10px;">
              <span style="font-size: 14px; font-weight: 900; text-transform: uppercase;">Total Items to Prepare:</span>
              <span style="font-size: 20px; font-weight: 900; font-family: ui-monospace, monospace;">${totalItemsCount} PORTIONS</span>
            </div>

            <div style="margin-top: 35px; display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #555; border-top: 1px dashed #999; padding-top: 10px;">
              <span>Dispatched to Kitchen &bull; Verified by Chef</span>
              <span>Chef Signature: _________________________</span>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // 80mm & 58mm THERMAL TICKET FORMAT
  const printableWidth = paperWidth === "58mm" ? "48mm" : "72mm";
  const rollWidth = paperWidth === "58mm" ? "58mm" : "80mm";
  const is58mm = paperWidth === "58mm";

  const itemsHtml = (order.items || [])
    .map((item) => {
      const lowerName = item.name.toLowerCase();
      const portionStr = item.portion ? item.portion.toLowerCase() : "";
      const isHalf = portionStr.includes("half") || lowerName.includes("(half)") || lowerName.includes("[half]");
      const isFull = portionStr.includes("full") || lowerName.includes("(full)") || lowerName.includes("[full]");

      let portionBadge = "";
      if (isHalf) {
        portionBadge = '<span style="background: #000; color: #fff; padding: 1px 4px; font-size: 9.5px; font-weight: 900; border-radius: 2px; margin-left: 3px;">[HALF]</span>';
      } else if (isFull) {
        portionBadge = '<span style="border: 1.5px solid #000; padding: 0.5px 3px; font-size: 9.5px; font-weight: 900; border-radius: 2px; margin-left: 3px;">[FULL]</span>';
      } else if (item.portion) {
        portionBadge = `<span style="border: 1.5px solid #000; padding: 0.5px 3px; font-size: 9.5px; font-weight: 900; border-radius: 2px; margin-left: 3px;">[${item.portion.toUpperCase().slice(0, 4)}]</span>`;
      }

      const cleanName = item.name
        .replace(/\s*\((half|full)\)/gi, "")
        .replace(/\s*\[(half|full)\]/gi, "")
        .trim();

      return `
        <tr style="border-bottom: 1.5px dashed #000;">
          <td style="padding: ${is58mm ? "4px 0" : "5px 0"}; vertical-align: top; text-align: left;">
            <div style="font-size: ${is58mm ? "11.5px" : "13.5px"}; font-weight: 900; text-transform: uppercase; color: #000; line-height: 1.25;">
              ${cleanName} ${portionBadge}
            </div>
            ${
              item.specialInstructions
                ? `<div style="font-size: ${is58mm ? "9.5px" : "11px"}; font-weight: 800; color: #000; margin-top: 2px; background: #eee; padding: 2px 4px; border-radius: 2px;">*** NOTE: ${item.specialInstructions} ***</div>`
                : ""
            }
          </td>
          <td style="text-align: right; vertical-align: top; padding: ${is58mm ? "4px 0 4px 2px" : "5px 0 5px 4px"}; font-size: ${is58mm ? "15px" : "18px"}; font-weight: 900; font-family: ui-monospace, monospace; color: #000; white-space: nowrap;">
            x${item.quantity}
          </td>
        </tr>
      `;
    })
    .join("");

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
              padding-top: 12mm !important;
              padding-bottom: 12mm !important;
            }
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #000;
            background: #fff;
            display: flex;
            justify-content: center;
          }
          .kot-container {
            width: ${printableWidth};
            max-width: 100%;
            margin: 0 auto;
            padding-top: 12mm;
            padding-bottom: 12mm;
            text-align: center;
          }
          .center { text-align: center; }
          .bold { font-weight: 900; }
        </style>
      </head>
      <body>
        <div class="kot-container">
          <!-- Top Safe Feed Buffer: Prevents hardware auto-cutter from cutting into the header -->
          <div style="height: 3mm; width: 100%; font-size: 1px; line-height: 1px;">&nbsp;</div>

          <!-- HEADER -->
          <div style="border-bottom: 2px solid #000; padding-bottom: ${is58mm ? "3px" : "5px"}; margin-bottom: 4px;">
            <div style="font-size: ${is58mm ? "14px" : "18px"}; font-weight: 900; letter-spacing: 0.5px; color: #000; text-transform: uppercase;">
              KITCHEN ORDER TICKET
            </div>
            <div style="font-size: ${is58mm ? "10px" : "11.5px"}; font-weight: 800; color: #000; margin-top: 1px; text-transform: uppercase;">
              ${restaurantName}
            </div>
          </div>

          <!-- TABLE / TOKEN HERO BANNER -->
          <div style="background: #000; color: #fff; padding: ${is58mm ? "4px 2px" : "6px 4px"}; margin: 4px 0; border-radius: 3px; font-size: ${is58mm ? "14px" : "17px"}; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase;">
            ${isTakeaway ? `TAKEAWAY ${order.tokenNumber ? "#" + order.tokenNumber : "(PARCEL)"}` : (order.tableName || "TABLE").toUpperCase()}
            ${order.tableFloor ? ` - ${order.tableFloor.toUpperCase()}` : ""}
          </div>

          <!-- META DETAILS -->
          <div style="font-size: ${is58mm ? "9.5px" : "10.5px"}; font-weight: 700; border-bottom: 1.5px solid #000; padding-bottom: 4px; margin-bottom: 4px; text-align: left;">
            <div style="display: flex; justify-content: space-between;">
              <span>KOT: <strong>#${order.orderNumber}</strong></span>
              <span>Time: <strong>${new Date(order.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 2px;">
              <span>Date: <strong>${new Date(order.createdAt).toLocaleDateString()}</strong></span>
              <span>Type: <strong>${isTakeaway ? "TAKEAWAY" : "DINE-IN"}</strong></span>
            </div>
            ${
              order.customerName
                ? `<div style="margin-top: 2px; font-size: ${is58mm ? "9px" : "10px"};">
                    Customer: <strong>${order.customerName}${order.customerPhone ? " (" + order.customerPhone + ")" : ""}</strong>
                  </div>`
                : ""
            }
          </div>

          <!-- ITEMS TABLE -->
          <table style="width: 100%; border-collapse: collapse; margin: 3px 0 5px 0;">
            <thead>
              <tr style="border-bottom: 2px solid #000; font-size: ${is58mm ? "9.5px" : "10.5px"}; font-weight: 900;">
                <th style="text-align: left; padding: 2px 0;">ITEM NAME</th>
                <th style="text-align: right; padding: 2px 0;">QTY</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- FOOTER / SUMMARY -->
          <div style="border-top: 2px solid #000; padding-top: 4px; margin-top: 4px; font-size: ${is58mm ? "11px" : "12px"}; font-weight: 900; display: flex; justify-content: space-between; align-items: center;">
            <span>TOTAL QTY:</span>
            <span style="font-size: ${is58mm ? "14px" : "16px"}; font-family: ui-monospace, monospace;">${totalItemsCount} ITEMS</span>
          </div>

          <div style="margin-top: 6px; font-size: 8.5px; font-weight: 700; color: #444; border-top: 1px dashed #000; padding-top: 4px;">
            *** DISPATCHED TO KITCHEN STATION ***
          </div>
          <!-- Bottom Safe Feed Buffer: Ensures footer feeds past cutter before slicing -->
          <div style="height: 15mm; width: 100%; font-size: 1px; line-height: 1px;">&nbsp;</div>
        </div>
      </body>
    </html>
  `;
};

/**
 * Generate Bill / Tax Invoice HTML for 80mm, 58mm, or A4 printers
 */
export const generateBillReceiptHtml = (
  order: RestaurantOrder & { paymentMethod?: string },
  settings?: RestaurantSettings | null,
  paperWidth: PaperWidth = "80mm"
): string => {
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

  const currency = resolvedSettings?.currency || "₹";
  const restName = resolvedSettings?.name || "RESTAURANT";
  const address = resolvedSettings?.address || "";
  const phone = resolvedSettings?.phone || "";
  const email = resolvedSettings?.email || "";
  const gstin = resolvedSettings?.gstNumber || "";
  const websiteStr = resolvedSettings?.websiteUrl || "";

  const isTakeaway = order.orderType === "takeaway" || (!order.tableId && !order.tableName);
  const paymentModeStr = (order.paymentMethod || "CASH").toUpperCase();

  const taxRate = settings?.taxPercentage || 5;
  const hasTax = (order.tax && order.tax > 0) || taxRate > 0;
  const halfTaxRate = taxRate / 2;
  const halfTaxAmount = (order.tax || 0) / 2;
  const taxableAmount = Math.max(0, (order.subtotal || 0) - (order.discount || 0));
  const totalItemsCount = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);

  // A4 OFFICIAL GST TAX INVOICE FORMAT
  if (paperWidth === "A4") {
    const tableRows = (order.items || [])
      .map((item, idx) => {
        const itemTotal = item.price * item.quantity;
        const portionText = item.portion ? item.portion.toUpperCase() : "-";
        return `
          <tr style="border-bottom: 1px solid #ddd; font-size: 12px;">
            <td style="padding: 8px 6px; text-align: center; font-weight: bold; width: 35px;">${idx + 1}</td>
            <td style="padding: 8px 6px; text-align: left;">
              <strong style="font-size: 13px; text-transform: uppercase;">${item.name}</strong>
              ${item.specialInstructions ? `<div style="font-size: 11px; color: #555;">Note: ${item.specialInstructions}</div>` : ""}
            </td>
            <td style="padding: 8px 6px; text-align: center; color: #444;">${portionText}</td>
            <td style="padding: 8px 6px; text-align: center; font-weight: bold; font-family: ui-monospace, monospace;">${item.quantity}</td>
            <td style="padding: 8px 6px; text-align: right; font-family: ui-monospace, monospace;">${currency}${item.price.toFixed(2)}</td>
            <td style="padding: 8px 6px; text-align: right; font-weight: bold; font-family: ui-monospace, monospace;">${currency}${itemTotal.toFixed(2)}</td>
          </tr>
        `;
      })
      .join("");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>TAX_INVOICE_${order.orderNumber}_A4</title>
          <meta charset="utf-8" />
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm; }
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 0; color: #000; background: #fff; line-height: 1.4; }
            .a4-bill { width: 100%; max-width: 180mm; margin: 0 auto; }
            .meta-box { display: grid; grid-template-columns: 1fr 1fr; border: 1.5px solid #000; border-radius: 6px; margin: 15px 0; padding: 12px; font-size: 12px; gap: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; border: 1.5px solid #000; }
            th { border-bottom: 2px solid #000; padding: 8px 6px; font-size: 11.5px; text-transform: uppercase; font-weight: 900; background: #f5f5f5; }
          </style>
        </head>
        <body>
          <div class="a4-bill">
            <!-- RESTAURANT LETTERHEAD -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #000; padding-bottom: 12px;">
              <div>
                <h1 style="margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">${restName}</h1>
                ${address ? `<p style="margin: 3px 0; font-size: 12px; color: #333;">${address}</p>` : ""}
                <p style="margin: 2px 0; font-size: 12px; color: #333;">
                  ${phone ? `Tel: <strong>${phone}</strong> &bull; ` : ""}
                  ${email ? `Email: <strong>${email}</strong>` : ""}
                </p>
                ${gstin ? `<p style="margin: 2px 0; font-size: 12px; font-weight: bold;">GSTIN: <span>${gstin}</span></p>` : ""}
              </div>
              <div style="text-align: right;">
                <div style="border: 2px solid #000; padding: 6px 14px; border-radius: 6px; display: inline-block; background: #fafafa;">
                  <span style="font-size: 14px; font-weight: 900; letter-spacing: 1px; display: block;">TAX INVOICE</span>
                  <span style="font-size: 11px; font-weight: 700; color: #555;">ORIGINAL FOR RECIPIENT</span>
                </div>
              </div>
            </div>

            <!-- INVOICE & CUSTOMER INFO BOX -->
            <div class="meta-box">
              <div>
                <div style="font-size: 11px; font-weight: 800; color: #666; text-transform: uppercase; margin-bottom: 4px;">Invoice Information</div>
                <div style="margin-bottom: 2px;">Invoice No: <strong>#${order.orderNumber}</strong></div>
                <div style="margin-bottom: 2px;">Invoice Date: <strong>${new Date(order.createdAt).toLocaleDateString()}</strong></div>
                <div style="margin-bottom: 2px;">Time: <strong>${new Date(order.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}</strong></div>
                <div>Dining Area: <strong>${isTakeaway ? "TAKEAWAY (PARCEL)" : (order.tableName || "Dine-In")}</strong></div>
              </div>
              <div>
                <div style="font-size: 11px; font-weight: 800; color: #666; text-transform: uppercase; margin-bottom: 4px;">Billing & Payment Details</div>
                <div style="margin-bottom: 2px;">Customer: <strong>${order.customerName || "Walk-in Guest"}</strong></div>
                ${order.customerPhone ? `<div style="margin-bottom: 2px;">Phone: <strong>${order.customerPhone}</strong></div>` : ""}
                <div style="margin-bottom: 2px;">Payment Mode: <strong style="text-transform: uppercase;">${paymentModeStr}</strong></div>
                <div>Payment Status: <strong style="color: #059669;">COMPLETED / PAID</strong></div>
              </div>
            </div>

            <!-- ITEMIZED TABLE -->
            <table>
              <thead>
                <tr>
                  <th style="width: 35px; text-align: center;">#</th>
                  <th style="text-align: left;">ITEM DESCRIPTION</th>
                  <th style="width: 70px; text-align: center;">PORTION</th>
                  <th style="width: 50px; text-align: center;">QTY</th>
                  <th style="width: 90px; text-align: right;">RATE (${currency})</th>
                  <th style="width: 100px; text-align: right;">AMOUNT (${currency})</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>

            <!-- TOTALS & TAX BREAKDOWN BLOCK -->
            <div style="display: flex; justify-content: flex-end; margin-top: 15px;">
              <div style="width: 320px; font-size: 12.5px;">
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee;">
                  <span>Subtotal (${totalItemsCount} items):</span>
                  <span style="font-family: ui-monospace, monospace; font-weight: bold;">${currency}${order.subtotal.toFixed(2)}</span>
                </div>
                ${
                  order.discount && order.discount > 0
                    ? `<div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee; color: #dc2626;">
                        <span>Discount:</span>
                        <span style="font-family: ui-monospace, monospace; font-weight: bold;">-${currency}${order.discount.toFixed(2)}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee; color: #555; font-size: 11.5px;">
                        <span>Taxable Value:</span>
                        <span style="font-family: ui-monospace, monospace;">${currency}${taxableAmount.toFixed(2)}</span>
                      </div>`
                    : ""
                }
                ${
                  hasTax && halfTaxRate > 0
                    ? `<div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee;">
                        <span>CGST (${halfTaxRate}%):</span>
                        <span style="font-family: ui-monospace, monospace;">${currency}${halfTaxAmount.toFixed(2)}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee;">
                        <span>SGST (${halfTaxRate}%):</span>
                        <span style="font-family: ui-monospace, monospace;">${currency}${halfTaxAmount.toFixed(2)}</span>
                      </div>`
                    : order.tax && order.tax > 0
                    ? `<div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee;">
                        <span>GST / Tax (${taxRate}%):</span>
                        <span style="font-family: ui-monospace, monospace;">${currency}${order.tax.toFixed(2)}</span>
                      </div>`
                    : ""
                }
                <div style="display: flex; justify-content: space-between; padding: 8px 10px; margin-top: 6px; background: #f0fdf4; border: 2px solid #059669; border-radius: 6px; font-size: 16px; font-weight: 900;">
                  <span>GRAND TOTAL:</span>
                  <span style="font-family: ui-monospace, monospace;">${currency}${order.grandTotal.toFixed(2)}</span>
                </div>
                <div style="text-align: center; font-size: 11px; font-weight: bold; margin-top: 4px; color: #059669;">
                  *** PAID IN FULL VIA ${paymentModeStr} ***
                </div>
              </div>
            </div>

            <!-- TERMS & SIGNATURE BLOCK -->
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding-top: 15px; border-top: 1.5px solid #000; font-size: 11px;">
              <div style="max-width: 60%; color: #444;">
                <p style="margin: 0 0 3px 0; font-weight: bold;">Terms & Conditions:</p>
                <p style="margin: 0;">1. Goods once sold will not be taken back or exchanged.</p>
                <p style="margin: 0;">2. Subject to local jurisdiction. This is a computer generated tax invoice.</p>
                ${websiteStr ? `<p style="margin: 4px 0 0 0; font-weight: bold; color: #000;">Visit: ${websiteStr}</p>` : ""}
              </div>
              <div style="text-align: center; width: 180px;">
                <div style="height: 45px;"></div>
                <div style="border-top: 1px solid #000; padding-top: 4px; font-weight: bold;">Authorized Signatory</div>
                <div style="font-size: 10px; color: #555;">For ${restName}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // 80mm & 58mm THERMAL RECEIPT FORMAT
  const printableWidth = paperWidth === "58mm" ? "48mm" : "72mm";
  const rollWidth = paperWidth === "58mm" ? "58mm" : "80mm";
  const is58mm = paperWidth === "58mm";

  const itemsHtml = (order.items || [])
    .map((item) => {
      const lowerName = item.name.toLowerCase();
      const portionStr = item.portion ? item.portion.toLowerCase() : "";
      const isHalf = portionStr.includes("half") || lowerName.includes("(half)") || lowerName.includes("[half]");
      const isFull = portionStr.includes("full") || lowerName.includes("(full)") || lowerName.includes("[full]");

      let portionBadge = "";
      if (isHalf) {
        portionBadge = ' <span style="background: #000; color: #fff; padding: 0 3px; font-size: 8.5px; font-weight: 800; border-radius: 2px;">H</span>';
      } else if (isFull) {
        portionBadge = ' <span style="border: 1px solid #000; padding: 0 2px; font-size: 8.5px; font-weight: 800; border-radius: 2px;">F</span>';
      } else if (item.portion) {
        portionBadge = ` <span style="border: 1px solid #000; padding: 0 2px; font-size: 8.5px; font-weight: 800; border-radius: 2px;">${item.portion.toUpperCase().slice(0, 4)}</span>`;
      }

      const cleanName = item.name
        .replace(/\s*\((half|full)\)/gi, "")
        .replace(/\s*\[(half|full)\]/gi, "")
        .trim();

      const itemTotal = item.price * item.quantity;

      return `
        <tr style="border-bottom: 1px dashed #777; font-size: ${is58mm ? "9.5px" : "10.5px"}; color: #000;">
          <td style="padding: ${is58mm ? "2.5px 0" : "3.5px 0"}; text-align: left; vertical-align: top; font-weight: 700; word-break: break-word;">
            ${cleanName}${portionBadge}
          </td>
          <td style="padding: ${is58mm ? "2.5px 1px" : "3.5px 2px"}; text-align: center; vertical-align: top; font-weight: 900; font-family: ui-monospace, monospace;">
            ${item.quantity}
          </td>
          <td style="padding: ${is58mm ? "2.5px 1px" : "3.5px 2px"}; text-align: right; vertical-align: top; font-family: ui-monospace, monospace; font-weight: 600;">
            ${currency}${item.price.toFixed(0)}
          </td>
          <td style="padding: ${is58mm ? "2.5px 0" : "3.5px 0"}; text-align: right; vertical-align: top; font-weight: 900; font-family: ui-monospace, monospace;">
            ${currency}${itemTotal.toFixed(0)}
          </td>
        </tr>
      `;
    })
    .join("");

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
              padding-top: 12mm !important;
              padding-bottom: 12mm !important;
            }
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 0;
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
            padding-top: 12mm;
            padding-bottom: 12mm;
            text-align: left;
          }
          .center { text-align: center; }
          .bold { font-weight: 900; }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Top Safe Feed Buffer: Prevents hardware auto-cutter from cutting into restaurant title -->
          <div style="height: 3mm; width: 100%; font-size: 1px; line-height: 1px;">&nbsp;</div>

          <!-- RESTAURANT BRAND & TAX HEADER (CENTERED) -->
          <div class="center" style="margin-bottom: 4px; border-bottom: 2px dashed #000; padding-bottom: ${is58mm ? "3px" : "5px"};">
            <h2 style="margin: 0 0 2px 0; font-size: ${is58mm ? "14px" : "16.5px"}; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #000;">${restName}</h2>
            ${address ? `<p style="margin: 1px 0; font-size: ${is58mm ? "8.5px" : "9.5px"}; font-weight: 600; color: #111;">${address}</p>` : ""}
            ${phone ? `<p style="margin: 1px 0; font-size: ${is58mm ? "8.5px" : "9.5px"}; font-weight: 600; color: #111;">Phone: ${phone}</p>` : ""}
            ${gstin ? `<p style="margin: 1px 0; font-size: ${is58mm ? "8.5px" : "9.5px"}; font-weight: 800; color: #000;">GSTIN: ${gstin}</p>` : ""}
            <div style="font-size: ${is58mm ? "9px" : "10px"}; font-weight: 900; letter-spacing: 0.5px; margin-top: 2px;">
              *** TAX INVOICE ***
            </div>
          </div>

          <!-- META DETAILS -->
          <div style="font-size: ${is58mm ? "9px" : "10px"}; border-bottom: 1.5px dashed #000; padding-bottom: 3px; margin-bottom: 4px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Bill No: <strong>#${order.orderNumber}</strong></span>
              <span>Date: <strong>${new Date(order.createdAt).toLocaleDateString()}</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 1.5px;">
              <span>${isTakeaway ? `Type: <strong>TAKEAWAY ${order.tokenNumber ? "#" + order.tokenNumber : ""}</strong>` : `Table: <strong>${(order.tableName || "Dine-In").replace(/^table\s*-\s*/gi, "Table ")}</strong>`}</span>
              <span>Time: <strong>${new Date(order.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</strong></span>
            </div>
            ${
              order.customerName
                ? `<div style="margin-top: 1.5px; font-weight: 700;">
                    Customer: ${order.customerName}${order.customerPhone ? " (" + order.customerPhone + ")" : ""}
                  </div>`
                : ""
            }
            <div style="display: flex; justify-content: space-between; margin-top: 1.5px;">
              <span>Pay Mode: <strong>${paymentModeStr}</strong></span>
              <span>Total Items: <strong>${totalItemsCount}</strong></span>
            </div>
          </div>

          <!-- BILLING ITEMS TABLE -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 3px;">
            <thead>
              <tr style="border-bottom: 1.5px solid #000; font-size: ${is58mm ? "8.5px" : "9.5px"}; font-weight: 900;">
                <th style="text-align: left; padding: 2px 0; width: 48%;">ITEM</th>
                <th style="text-align: center; padding: 2px 1px; width: 14%;">QTY</th>
                <th style="text-align: right; padding: 2px 1px; width: 18%;">RATE</th>
                <th style="text-align: right; padding: 2px 0; width: 20%;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- TOTALS & TAX BREAKDOWN -->
          <div style="border-top: 1.5px solid #000; padding-top: 3px; font-size: ${is58mm ? "9px" : "10px"}; font-weight: 600;">
            <div style="display: flex; justify-content: space-between; margin: 1px 0;">
              <span>Subtotal:</span>
              <span style="font-family: ui-monospace, monospace; font-weight: 800;">${currency}${order.subtotal.toFixed(2)}</span>
            </div>

            ${
              order.discount && order.discount > 0
                ? `<div style="display: flex; justify-content: space-between; margin: 1px 0; font-weight: 800;">
                    <span>Discount:</span>
                    <span style="font-family: ui-monospace, monospace;">-${currency}${order.discount.toFixed(2)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 1px 0; font-size: ${is58mm ? "8px" : "9px"}; color: #222;">
                    <span>Taxable Amount:</span>
                    <span style="font-family: ui-monospace, monospace;">${currency}${taxableAmount.toFixed(2)}</span>
                  </div>`
                : ""
            }

            ${
              hasTax && halfTaxRate > 0
                ? `<div style="display: flex; justify-content: space-between; margin: 1px 0; font-size: ${is58mm ? "8.5px" : "9.5px"};">
                    <span>CGST (${halfTaxRate}%):</span>
                    <span style="font-family: ui-monospace, monospace;">${currency}${halfTaxAmount.toFixed(2)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 1px 0; font-size: ${is58mm ? "8.5px" : "9.5px"};">
                    <span>SGST (${halfTaxRate}%):</span>
                    <span style="font-family: ui-monospace, monospace;">${currency}${halfTaxAmount.toFixed(2)}</span>
                  </div>`
                : order.tax && order.tax > 0
                ? `<div style="display: flex; justify-content: space-between; margin: 1px 0;">
                    <span>GST / Tax (${taxRate}%):</span>
                    <span style="font-family: ui-monospace, monospace;">${currency}${order.tax.toFixed(2)}</span>
                  </div>`
                : ""
            }

            <!-- PROMINENT GRAND TOTAL BOX -->
            <div style="display: flex; justify-content: space-between; margin: 3px 0; font-size: ${is58mm ? "13px" : "14.5px"}; font-weight: 900; border-top: 1.5px dashed #000; border-bottom: 1.5px dashed #000; padding: 3px 0;">
              <span>GRAND TOTAL:</span>
              <span style="font-family: ui-monospace, monospace;">${currency}${order.grandTotal.toFixed(2)}</span>
            </div>

            <div style="text-align: center; font-size: ${is58mm ? "8.5px" : "9.5px"}; font-weight: 900; margin: 2px 0; letter-spacing: 0.5px;">
              *** PAID VIA ${paymentModeStr} ***
            </div>
          </div>

          <!-- FOOTER & BRANDING (CENTERED) -->
          <div class="center" style="margin-top: 5px; border-top: 1px solid #000; padding-top: 3px; font-size: ${is58mm ? "8px" : "9px"}; color: #111;">
            <p style="margin: 1px 0; font-weight: 800;">${isTakeaway ? "Thank you for ordering with us!" : "Thank you for dining with us!"}</p>
            <p style="margin: 1px 0;">Please visit again!</p>
            ${websiteStr ? `<p style="margin: 1px 0; font-family: ui-monospace, monospace; font-weight: 800; color: #000;">${websiteStr}</p>` : ""}
            <p style="margin: 2px 0 0 0; font-size: 7.5px; color: #444;">*** Computer Generated Tax Invoice ***</p>
          </div>
          <!-- Bottom Safe Feed Buffer: Ensures footer feeds past cutter before slicing -->
          <div style="height: 15mm; width: 100%; font-size: 1px; line-height: 1px;">&nbsp;</div>
        </div>
      </body>
    </html>
  `;
};

/**
 * Print KOT Ticket across QZ Tray, Bluetooth, or Native AirPrint
 */
export const printKOTReceipt = async (
  order: RestaurantOrder,
  restaurantName: string = "Main Kitchen",
  paperWidth?: PaperWidth,
  forcePrint: boolean = false
): Promise<{ success: boolean; mode: "qz-tray" | "browser" | "bluetooth" | "none"; message?: string }> => {
  if (!order || !order.id) return { success: false, mode: "none" };

  if (!forcePrint && order.status === "pending") {
    console.info(`[PrintKOT] Skipped KOT auto-print for pending order #${order.orderNumber || order.id} (Awaiting Manager Acceptance)`);
    return { success: true, mode: "none", message: "Awaiting Manager Acceptance" };
  }

  const qzConfig = qzTrayService.getConfig();
  const effectiveWidth: PaperWidth = paperWidth || qzConfig.paperWidth || "80mm";
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
    forcePrint,
    rawOrder: order,
    restaurantName,
  });
};

/**
 * Print Bill / Tax Invoice across QZ Tray, Bluetooth, or Native AirPrint
 */
export const printBillReceipt = async (
  order: RestaurantOrder,
  settings?: RestaurantSettings | null,
  paperWidth?: PaperWidth,
  forcePrint: boolean = false
): Promise<{ success: boolean; mode: "qz-tray" | "browser" | "bluetooth" | "none"; message?: string }> => {
  if (!order || !order.id) return { success: false, mode: "none" };

  const qzConfig = qzTrayService.getConfig();
  const effectiveWidth: PaperWidth = paperWidth || qzConfig.paperWidth || "80mm";
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
    forcePrint,
    rawOrder: order,
    settings,
  });
};
