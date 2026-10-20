/**
 * Web Bluetooth ESC/POS Direct Thermal Printer Service
 * Connects directly to mobile & desktop Bluetooth thermal printers
 * (Sunmi, MPT-II, PT-210, POS-5802, Xprinter, Rongta, etc.)
 * without requiring any desktop drivers, software, or cables.
 */

import { RestaurantOrder, RestaurantSettings } from "../types";

export interface BluetoothPrinterDevice {
  id: string;
  name: string;
  connected: boolean;
}

class BluetoothPrinterService {
  private device: any = null;
  private characteristic: any = null;
  private isConnecting: boolean = false;
  private listeners: Set<(device: BluetoothPrinterDevice | null) => void> = new Set();

  public isSupported(): boolean {
    return typeof window !== "undefined" && typeof (navigator as any).bluetooth !== "undefined";
  }

  public getConnectedDevice(): BluetoothPrinterDevice | null {
    if (this.device && this.device.gatt?.connected) {
      return {
        id: this.device.id,
        name: this.device.name || "Bluetooth Thermal Printer",
        connected: true,
      };
    }
    return null;
  }

  public subscribe(listener: (device: BluetoothPrinterDevice | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.getConnectedDevice());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const dev = this.getConnectedDevice();
    this.listeners.forEach((l) => l(dev));
  }

  /**
   * Request Bluetooth device pair and connect GATT server
   */
  public async connect(): Promise<{ success: boolean; message: string; deviceName?: string }> {
    if (!this.isSupported()) {
      return {
        success: false,
        message: "Web Bluetooth is not supported in this browser. Please use Chrome on Android, Windows, or Mac.",
      };
    }

    if (this.isConnecting) {
      return { success: false, message: "Connection attempt in progress..." };
    }

    this.isConnecting = true;

    try {
      // Standard ESC/POS Bluetooth GATT Service UUIDs
      const serviceUUIDs = [
        "000018f0-0000-1000-8000-00805f9b34fb",
        "0000ffe0-0000-1000-8000-00805f9b34fb",
        "0000ae30-0000-1000-8000-00805f9b34fb",
        "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
        "49535343-fe7d-4ae5-8fa9-9fafd205e455",
      ];

      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: serviceUUIDs,
      });

      if (!device) {
        this.isConnecting = false;
        return { success: false, message: "No device selected." };
      }

      device.addEventListener("gattserverdisconnected", () => {
        this.device = null;
        this.characteristic = null;
        this.notify();
      });

      const server = await device.gatt.connect();

      // Find first writable characteristic across known printing services
      let targetChar: any = null;
      for (const uuid of serviceUUIDs) {
        try {
          const service = await server.getPrimaryService(uuid);
          const chars = await service.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              targetChar = c;
              break;
            }
          }
          if (targetChar) break;
        } catch (_) {}
      }

      // Fallback: search all available primary services if standard ones differ
      if (!targetChar) {
        try {
          const services = await server.getPrimaryServices();
          for (const service of services) {
            try {
              const chars = await service.getCharacteristics();
              for (const c of chars) {
                if (c.properties.write || c.properties.writeWithoutResponse) {
                  targetChar = c;
                  break;
                }
              }
              if (targetChar) break;
            } catch (_) {}
          }
        } catch (_) {}
      }

      if (!targetChar) {
        await device.gatt.disconnect();
        this.isConnecting = false;
        return {
          success: false,
          message: "Connected to device, but could not find a writable ESC/POS printer characteristic.",
        };
      }

      this.device = device;
      this.characteristic = targetChar;
      this.isConnecting = false;
      this.notify();

      return {
        success: true,
        message: `Successfully connected to ${device.name || "Bluetooth Printer"}`,
        deviceName: device.name || "Bluetooth Printer",
      };
    } catch (err: any) {
      this.isConnecting = false;
      console.warn("[BluetoothPrinter] Connection failed:", err);
      return {
        success: false,
        message: err.message || "Bluetooth pairing was cancelled or failed.",
      };
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.device?.gatt?.connected) {
        await this.device.gatt.disconnect();
      }
    } catch (_) {}
    this.device = null;
    this.characteristic = null;
    this.notify();
  }

  /**
   * Write raw bytes in chunked segments (safe for BLE MTU limits)
   */
  public async writeRawBytes(bytes: Uint8Array): Promise<boolean> {
    if (!this.characteristic || !this.device?.gatt?.connected) {
      return false;
    }

    const chunkSize = 100; // 100 bytes chunk prevents BLE buffer overflows
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      try {
        if (this.characteristic.writeValueWithoutResponse) {
          await this.characteristic.writeValueWithoutResponse(chunk);
        } else {
          await this.characteristic.writeValue(chunk);
        }
        await new Promise((r) => setTimeout(r, 20)); // 20ms pacing buffer
      } catch (e) {
        console.error("[BluetoothPrinter] Chunk write failed:", e);
        return false;
      }
    }
    return true;
  }

  /**
   * Generate ESC/POS Command stream for KOT
   */
  public generateKOTBytes(order: RestaurantOrder, restaurantName: string = "Kitchen"): Uint8Array {
    const encoder = new TextEncoder();
    const parts: number[] = [];

    // ESC @ : Initialize
    parts.push(0x1b, 0x40);

    // Safe feed buffer to move paper past cutter blade before printing header
    parts.push(...encoder.encode("\n\n"));

    // ESC a 1 : Center
    parts.push(0x1b, 0x61, 0x01);
    // GS ! 0x11 : Double height & width
    parts.push(0x1d, 0x21, 0x11);
    parts.push(...encoder.encode("KITCHEN TICKET\n"));

    // GS ! 0x00 : Normal size
    parts.push(0x1d, 0x21, 0x00);
    parts.push(...encoder.encode(`${restaurantName.toUpperCase()}\n`));
    parts.push(...encoder.encode("--------------------------------\n"));

    // Table / Token
    parts.push(0x1d, 0x21, 0x11);
    const tableHeader = order.orderType === "takeaway"
      ? `TAKEAWAY #${order.tokenNumber || "PARCEL"}`
      : `${(order.tableName || "TABLE").toUpperCase()}${order.tableFloor ? ` (${order.tableFloor.toUpperCase()})` : ""}`;
    parts.push(...encoder.encode(`${tableHeader}\n`));

    // Normal text left aligned
    parts.push(0x1d, 0x21, 0x00);
    parts.push(0x1b, 0x61, 0x00);
    parts.push(...encoder.encode(`KOT: #${order.orderNumber}  Time: ${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`));
    parts.push(...encoder.encode(`Date: ${new Date(order.createdAt).toLocaleDateString()}\n`));
    if (order.customerName) {
      parts.push(...encoder.encode(`Cust: ${order.customerName}\n`));
    }
    parts.push(...encoder.encode("================================\n"));
    parts.push(...encoder.encode("ITEM                     QTY\n"));
    parts.push(...encoder.encode("--------------------------------\n"));

    (order.items || []).forEach((item) => {
      const cleanName = (item.name || "Item").substring(0, 24);
      const portion = item.portion ? ` [${item.portion.toUpperCase()}]` : "";
      const lineName = (cleanName + portion).padEnd(25, " ");
      const qtyStr = `x${item.quantity}`.padStart(6, " ");
      parts.push(0x1b, 0x45, 0x01); // Bold on
      parts.push(...encoder.encode(`${lineName} ${qtyStr}\n`));
      parts.push(0x1b, 0x45, 0x00); // Bold off

      if (item.specialInstructions) {
        parts.push(...encoder.encode(`  * NOTE: ${item.specialInstructions}\n`));
      }
    });

    parts.push(...encoder.encode("================================\n"));
    const totalQty = (order.items || []).reduce((acc, i) => acc + i.quantity, 0);
    parts.push(0x1b, 0x61, 0x02); // Align right
    parts.push(0x1b, 0x45, 0x01); // Bold on
    parts.push(...encoder.encode(`TOTAL ITEMS: ${totalQty}\n`));
    parts.push(0x1b, 0x45, 0x00);

    // Feed and Cut
    parts.push(0x1b, 0x61, 0x01);
    parts.push(...encoder.encode("*** KITCHEN ORDER TICKET ***\n\n\n"));
    parts.push(0x1d, 0x56, 0x41, 0x03); // GS V A 3 (Paper Cut)

    return new Uint8Array(parts);
  }

  /**
   * Generate ESC/POS Command stream for Tax Receipt Bill
   */
  public generateBillBytes(order: RestaurantOrder, settings?: RestaurantSettings | null): Uint8Array {
    const encoder = new TextEncoder();
    const parts: number[] = [];
    const currency = settings?.currency || "Rs.";
    const restName = settings?.name || "RESTAURANT";

    // ESC @ : Initialize
    parts.push(0x1b, 0x40);

    // Safe feed buffer to move paper past cutter blade before printing header
    parts.push(...encoder.encode("\n\n"));

    // ESC a 1 : Center
    parts.push(0x1b, 0x61, 0x01);
    parts.push(0x1d, 0x21, 0x11); // Double size
    parts.push(...encoder.encode(`${restName.toUpperCase()}\n`));

    parts.push(0x1d, 0x21, 0x00); // Normal size
    if (settings?.address) parts.push(...encoder.encode(`${settings.address}\n`));
    if (settings?.phone) parts.push(...encoder.encode(`Ph: ${settings.phone}\n`));
    if (settings?.gstNumber) parts.push(...encoder.encode(`GSTIN: ${settings.gstNumber}\n`));

    parts.push(...encoder.encode("--------------------------------\n"));
    parts.push(0x1b, 0x45, 0x01);
    parts.push(...encoder.encode("TAX INVOICE / CASH BILL\n"));
    parts.push(0x1b, 0x45, 0x00);
    parts.push(...encoder.encode("--------------------------------\n"));

    // Left align meta
    parts.push(0x1b, 0x61, 0x00);
    parts.push(...encoder.encode(`Invoice: #${order.orderNumber} Date: ${new Date(order.createdAt).toLocaleDateString()}\n`));
    const tableStr = order.orderType === "takeaway"
      ? `Type: TAKEAWAY #${order.tokenNumber || ""}`
      : `Table: ${order.tableName || "Dine-In"}`;
    parts.push(...encoder.encode(`${tableStr}\n`));
    if (order.customerName) {
      parts.push(...encoder.encode(`Customer: ${order.customerName}\n`));
    }
    parts.push(...encoder.encode("--------------------------------\n"));
    parts.push(...encoder.encode("ITEM            QTY  RATE AMOUNT\n"));
    parts.push(...encoder.encode("--------------------------------\n"));

    (order.items || []).forEach((item) => {
      const name = (item.name || "").substring(0, 15).padEnd(16, " ");
      const qty = `${item.quantity}`.padStart(3, " ");
      const rate = `${item.price.toFixed(0)}`.padStart(5, " ");
      const amt = `${(item.price * item.quantity).toFixed(0)}`.padStart(6, " ");
      parts.push(...encoder.encode(`${name}${qty} ${rate} ${amt}\n`));
    });

    parts.push(...encoder.encode("--------------------------------\n"));

    // Right align totals
    parts.push(0x1b, 0x61, 0x02);
    parts.push(...encoder.encode(`Subtotal: ${currency}${order.subtotal.toFixed(2)}\n`));
    if (order.discount && order.discount > 0) {
      parts.push(...encoder.encode(`Discount: -${currency}${order.discount.toFixed(2)}\n`));
    }
    if (order.tax && order.tax > 0) {
      parts.push(...encoder.encode(`GST / Tax: +${currency}${order.tax.toFixed(2)}\n`));
    }

    parts.push(0x1d, 0x21, 0x11); // Double size
    parts.push(0x1b, 0x45, 0x01); // Bold on
    parts.push(...encoder.encode(`TOTAL: ${currency}${order.grandTotal.toFixed(2)}\n`));
    parts.push(0x1d, 0x21, 0x00); // Normal size
    parts.push(0x1b, 0x45, 0x00); // Bold off

    // Center Footer
    parts.push(0x1b, 0x61, 0x01);
    parts.push(...encoder.encode("--------------------------------\n"));
    parts.push(...encoder.encode("Thank you for dining with us!\n"));
    parts.push(...encoder.encode("Please visit again\n\n\n"));

    // Paper Cut
    parts.push(0x1d, 0x56, 0x41, 0x03);

    return new Uint8Array(parts);
  }

  /**
   * Print KOT directly via Bluetooth
   */
  public async printKOT(order: RestaurantOrder, restaurantName: string = "Kitchen"): Promise<boolean> {
    if (!this.getConnectedDevice()) {
      return false;
    }
    const bytes = this.generateKOTBytes(order, restaurantName);
    return this.writeRawBytes(bytes);
  }

  /**
   * Print Bill directly via Bluetooth
   */
  public async printBill(order: RestaurantOrder, settings?: RestaurantSettings | null): Promise<boolean> {
    if (!this.getConnectedDevice()) {
      return false;
    }
    const bytes = this.generateBillBytes(order, settings);
    return this.writeRawBytes(bytes);
  }

  /**
   * Test Print via Bluetooth
   */
  public async testPrint(): Promise<boolean> {
    if (!this.getConnectedDevice()) return false;
    const encoder = new TextEncoder();
    const parts: number[] = [];
    parts.push(0x1b, 0x40); // Init
    parts.push(0x1b, 0x61, 0x01); // Center
    parts.push(0x1d, 0x21, 0x11); // Double
    parts.push(...encoder.encode("RestaurantsOS\n"));
    parts.push(0x1d, 0x21, 0x00); // Normal
    parts.push(...encoder.encode("BLUETOOTH PRINTER TEST OK\n"));
    parts.push(...encoder.encode(`${new Date().toLocaleString()}\n`));
    parts.push(...encoder.encode("Wireless Thermal Printing Ready\n\n\n"));
    parts.push(0x1d, 0x56, 0x41, 0x03); // Cut
    return this.writeRawBytes(new Uint8Array(parts));
  }
}

export const bluetoothPrinterService = new BluetoothPrinterService();
export default bluetoothPrinterService;
