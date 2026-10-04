import qz from "qz-tray";
import { RestaurantOrder, RestaurantSettings } from "../types";

export interface QZPrinterConfig {
  kotPrinter?: string;
  billPrinter?: string;
  paperWidth: "80mm" | "58mm";
  autoPrintKOT: boolean;
  autoPrintBill: boolean;
  autoConnect: boolean;
  cutPaper: boolean;
  openCashDrawer: boolean;
}

export type QZConnectionStatus = "connected" | "connecting" | "disconnected" | "error";

const LOCAL_STORAGE_KEY = "restaurantsos_qz_config_v1";

const DEFAULT_CONFIG: QZPrinterConfig = {
  kotPrinter: "",
  billPrinter: "",
  paperWidth: "80mm",
  autoPrintKOT: true,
  autoPrintBill: true,
  autoConnect: true,
  cutPaper: true,
  openCashDrawer: false,
};

// Trusted Demo / Production Certificate generated via QZ Tray Site Manager
const QZ_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIEMDCCAxigAwIBAgIGAaEGLylcMA0GCSqGSIb3DQEBCwUAMIGiMQswCQYDVQQG
EwJVUzELMAkGA1UECAwCTlkxEjAQBgNVBAcMCUNhbmFzdG90YTEbMBkGA1UECgwS
UVogSW5kdXN0cmllcywgTExDMRswGQYDVQQLDBJRWiBJbmR1c3RyaWVzLCBMTEMx
HDAaBgkqhkiG9w0BCQEWDXN1cHBvcnRAcXouaW8xGjAYBgNVBAMMEVFaIFRyYXkg
RGVtbyBDZXJ0MB4XDTI2MTAwMzA5MTE1NloXDTQ2MTAwMzA5MTE1NlowgaIxCzAJ
BgNVBAYTAlVTMQswCQYDVQQIDAJOWTESMBAGA1UEBwwJQ2FuYXN0b3RhMRswGQYD
VQQKDBJRWiBJbmR1c3RyaWVzLCBMTEMxGzAZBgNVBAsMElFaIEluZHVzdHJpZXMs
IExMQzEcMBoGCSqGSIb3DQEJARYNc3VwcG9ydEBxei5pbzEaMBgGA1UEAwwRUVog
VHJheSBEZW1vIENlcnQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDD
HBrgICRFScy4Qs7Vbkslwiv1piaEzWfX1VE7UhD/vix0YxB32TUdc0Dnp6BJww8w
Gd+h97osF00/L5RqlabZpkhWlQxDpgViGRRZXRbpfTF0RIbSVp8sl7obH6rAYHSU
4pbwKRs73mOVwiip2SFdJL+HU38V0GfJZyNqlwxkMTQx8IitsGF4Q+gjtIEWqXhx
We+KPze6Gk/3Zy6OyLj/3eW/w2SjCwFTWJ41OMTM1G3OezzgHAhWz3iq28DVf3lQ
BtMSHd3dCGTVV3HxGeiMEzw093OWxVgPaN9lw1HcW8DWtoI2CLau5hF4mWTkFGzi
ROiTlJsnxzp21kFtK2y5AgMBAAGjajBoMBIGA1UdEwEB/wQIMAYBAf8CAQEwDgYD
VR0PAQH/BAQDAgEGMB0GA1UdDgQWBBT5tWiziJp1L7j5SAAp0UqmGDbpOTAjBgNV
HR4BAf8EGTAXoBUwE4IRUVogVHJheSBEZW1vIENlcnQwDQYJKoZIhvcNAQELBQAD
ggEBAB2VuXN4uFGJzzo/fYDDebadlhPsSaH3XWZkXSGnZfGcpRB8XKegRaWRsJU6
6Imu4bDAWluhzZ+KNRxw6O4dY1B8BQx/zDKk5krrqmLiJFiyt2hhGZRHknM+u/rs
xsfEd5jm6ESXkJsovTscRzcLP+7zJRWuf7HVR1swXE952vLm6RTehduI8QVXlqVx
V16SNkD9LDXslanoq05DVcE/jytjOhGE+umO/sGrZZz9Ll5qtztXRAtgFJPp5a1R
V6leNuGwjtrFU1JCJyvKmPnADyHVVo5o6kq5Sus7zCPfX/avsj9ZpP+y0IGRLnDJ
oxlakf7yDUTjjyZAiIGpQNUNLQg=
-----END CERTIFICATE-----`;

const QZ_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDDHBrgICRFScy4
Qs7Vbkslwiv1piaEzWfX1VE7UhD/vix0YxB32TUdc0Dnp6BJww8wGd+h97osF00/
L5RqlabZpkhWlQxDpgViGRRZXRbpfTF0RIbSVp8sl7obH6rAYHSU4pbwKRs73mOV
wiip2SFdJL+HU38V0GfJZyNqlwxkMTQx8IitsGF4Q+gjtIEWqXhxWe+KPze6Gk/3
Zy6OyLj/3eW/w2SjCwFTWJ41OMTM1G3OezzgHAhWz3iq28DVf3lQBtMSHd3dCGTV
V3HxGeiMEzw093OWxVgPaN9lw1HcW8DWtoI2CLau5hF4mWTkFGziROiTlJsnxzp2
1kFtK2y5AgMBAAECggEAAsFVcD+enTM0VjrReHSAKa5xzVpqCt2o2dIvJhlgr74J
E17EhDS/6wpCigACwrT9BAYSe17p53BO68gA0OM6Fy7jqOT7O+p5huUvMbp4wWdN
3bxo2CNH1ABGBlL4UossF9wFxei1PaO4ys37DoHfjNERj/8JO1ikzlCbZ+WcfnFD
fJllV9KdwYsFsjalfXFobzphPOW1uLX8GAPYhN+I8mtmmNCza7EXVYSWUTYL0mt1
8n4XPNXG005sKMuGRvGdlB38Xz0OIkbOvGHitKwK98LEPoPHt7cTOUCRyFi7NqXt
wtSHQvYKWmYQg18HoKFNV4W0JxgqsrzzLnGQlzFf4wKBgQDhKLb9+y44u120DXJh
VONvh+3HnI/axm5k6BE2LvVZE8RYrOY2YBgOPgKHhz6zIQBpxYeVh/Fz/2ICz7qv
YoIwTwqP3ClbHibumFCJ6IbozD9E4aqioEKnl9W4WZoihY8l0DH4xHRXKjFDiuLp
+AkPeJrizbvZeweWOK5InA3jWwKBgQDd1bOr2Pk6otuozu0r9TGZ56reiTD84hU4
dUKvh7b5ke+IzDG0nzjxbmL4wYyyI5eHL1prhxyYZHGcWJdCf6fJq7x55MJPknD5
5rw2XfV8bGjRXRvogpk6wphV8uSK1PFqnPAZNiymx9rHmum78yA/sQkJtsEFTfD/
eMfuNpSQewKBgFlrHPlSxrF7H6SA7pre5pAFkJYEhFDjGzZxv1wgXAmrQv/gcnDH
yuXlFIYUXP8wrQRUkRr+aRKjKp5pNv+uBHwA9/XX/oiUOevpi5qpQOK1Mq89W9HI
CZCbSSI0W3U4S3g97YqZIob3V6c2QhWfDqIZSJGoGOEu7f1ntzdY2l8fAoGARoAQ
JeFC89umK7P3tCysotj5eNfo9bV0QQkjNF3RTOeQVM1wTpL7qd8HHT+F02d0VMY7
2kiKUfQ6FxIgoEWpsXIe6C5HgrprpUArOKwLxIs/lKoeoHpA8Ge/ujEDaQvb3aIa
vCh3cFm7sgwNlGnkKdm9oZSvK1xl5wsfnxlBhdkCgYEAuWmoUk6qHAxkFOcyFQD6
aY72WeIJa+zvEk9trk8QRcSkYBxnyIu7wldEmCAVoJxx630nI88bxvRmCMKR+fqv
euMjy9yerKhhibCd42JNzULL354Bds0nietrTeooP6luGITPQqF+Brn/ZUlYrLkp
MGUSpHgKrFQ9wy8BM01qw9s=
-----END PRIVATE KEY-----`;

class QZTrayService {
  private status: QZConnectionStatus = "disconnected";
  private printers: string[] = [];
  private defaultPrinter: string = "";
  private config: QZPrinterConfig = DEFAULT_CONFIG;
  private listeners: Set<(status: QZConnectionStatus, printers: string[]) => void> = new Set();
  private lastError: string | null = null;
  private isSecurityConfigured = false;
  private signingKey: CryptoKey | null = null;

  constructor() {
    this.loadStoredConfig();
    this.setupSecurity();
  }

  public getStatus(): QZConnectionStatus {
    return this.status;
  }

  public isConnected(): boolean {
    try {
      return this.status === "connected" && qz.websocket.isActive();
    } catch {
      return false;
    }
  }

  public getPrinters(): string[] {
    return this.printers;
  }

  public getDefaultPrinterName(): string {
    return this.defaultPrinter;
  }

  public getConfig(): QZPrinterConfig {
    return { ...this.config };
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public subscribe(listener: (status: QZConnectionStatus, printers: string[]) => void): () => void {
    this.listeners.add(listener);
    // Initial notification
    listener(this.status, this.printers);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.status, this.printers);
      } catch (err) {
        console.error("Error in QZ subscriber callback:", err);
      }
    });
  }

  private loadStoredConfig() {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn("Failed to load QZ config from localStorage:", e);
      this.config = DEFAULT_CONFIG;
    }
  }

  public saveConfig(newConfig: Partial<QZPrinterConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.config));
      } catch (e) {
        console.warn("Failed to save QZ config to localStorage:", e);
      }
    }
    this.notify();
  }

  private async getSigningKey(): Promise<CryptoKey | null> {
    if (this.signingKey) return this.signingKey;
    if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
      return null;
    }

    try {
      const pem = QZ_PRIVATE_KEY
        .replace(/-----BEGIN PRIVATE KEY-----/g, "")
        .replace(/-----END PRIVATE KEY-----/g, "")
        .replace(/\s+/g, "");

      const binaryDerString = window.atob(pem);
      const binaryDer = new Uint8Array(binaryDerString.length);
      for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
      }

      this.signingKey = await window.crypto.subtle.importKey(
        "pkcs8",
        binaryDer.buffer,
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-512",
        },
        false,
        ["sign"]
      );

      return this.signingKey;
    } catch (err) {
      console.warn("Failed to import QZ signing key:", err);
      return null;
    }
  }

  private async signMessage(toSign: string): Promise<string> {
    const key = await this.getSigningKey();
    if (!key) {
      throw new Error("WebCrypto signing key unavailable");
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(toSign);
    const signatureBuffer = await window.crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5" },
      key,
      data
    );

    let binary = "";
    const bytes = new Uint8Array(signatureBuffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private setupSecurity() {
    if (this.isSecurityConfigured) return;
    try {
      // 1. Set algorithm to SHA512
      qz.security.setSignatureAlgorithm("SHA512");

      // 2. Supply the digital certificate installed in QZ Tray Site Manager
      qz.security.setCertificatePromise((resolve: (cert?: string) => void) => {
        resolve(QZ_CERTIFICATE);
      });

      // 3. Provide automatic cryptographic signature for all requests
      qz.security.setSignaturePromise((toSign: string) => {
        return async (resolve: (sig?: string) => void, reject: (err: any) => void) => {
          try {
            const signature = await this.signMessage(toSign);
            resolve(signature);
          } catch (err) {
            console.warn("QZ Tray auto-signing error:", err);
            // Fallback: resolve without signature to allow standard prompt if needed
            resolve();
          }
        };
      });

      this.isSecurityConfigured = true;
    } catch (err) {
      console.warn("QZ security configuration warning:", err);
    }
  }

  public async connect(): Promise<boolean> {
    if (this.isConnected()) {
      return true;
    }

    this.status = "connecting";
    this.lastError = null;
    this.notify();

    try {
      this.setupSecurity();

      if (!qz.websocket.isActive()) {
        await qz.websocket.connect({
          retries: 2,
          delay: 1,
        });
      }

      this.status = "connected";
      this.lastError = null;

      // Fetch printers list immediately upon connection
      await this.refreshPrinters();

      // Listen for socket closing
      qz.websocket.setClosedCallbacks(() => {
        this.status = "disconnected";
        this.notify();
      });

      qz.websocket.setErrorCallbacks((err: any) => {
        console.warn("QZ WebSocket error:", err);
        this.status = "error";
        this.lastError = err?.message || String(err);
        this.notify();
      });

      this.notify();
      return true;
    } catch (err: any) {
      console.warn("Failed to connect to QZ Tray daemon:", err);
      this.status = "disconnected";
      this.lastError = err?.message || "QZ Tray is not running locally. Please start QZ Tray.";
      this.notify();
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (qz.websocket.isActive()) {
        await qz.websocket.disconnect();
      }
    } catch (e) {
      console.warn("Error disconnecting QZ Tray:", e);
    } finally {
      this.status = "disconnected";
      this.notify();
    }
  }

  public async refreshPrinters(): Promise<string[]> {
    if (!this.isConnected()) {
      return [];
    }

    try {
      const printerList = await qz.printers.find();
      this.printers = Array.isArray(printerList) ? printerList : [printerList].filter(Boolean);

      try {
        const def = await qz.printers.getDefault();
        this.defaultPrinter = typeof def === "string" ? def : "";
      } catch {
        this.defaultPrinter = this.printers[0] || "";
      }

      // Auto-assign default printers if not yet configured
      if (!this.config.kotPrinter && this.defaultPrinter) {
        this.saveConfig({ kotPrinter: this.defaultPrinter });
      }
      if (!this.config.billPrinter && this.defaultPrinter) {
        this.saveConfig({ billPrinter: this.defaultPrinter });
      }

      this.notify();
      return this.printers;
    } catch (err: any) {
      console.error("Error fetching printers from QZ Tray:", err);
      return [];
    }
  }

  public async printHTML(options: {
    printerName?: string;
    html: string;
    paperWidth?: "80mm" | "58mm";
    jobName?: string;
  }): Promise<{ success: boolean; message?: string }> {
    const width = options.paperWidth || this.config.paperWidth || "80mm";
    const targetPrinter =
      options.printerName ||
      this.config.billPrinter ||
      this.config.kotPrinter ||
      this.defaultPrinter ||
      (this.printers.length > 0 ? this.printers[0] : null);

    if (!targetPrinter) {
      return {
        success: false,
        message: "No thermal printer configured or detected in QZ Tray.",
      };
    }

    if (!this.isConnected()) {
      const connected = await this.connect();
      if (!connected) {
        return {
          success: false,
          message: "QZ Tray connection is offline. Fallback to standard browser print.",
        };
      }
    }

    try {
      const inchWidth = width === "58mm" ? 2.28 : 3.14;

      const printConfig = qz.configs.create(targetPrinter, {
        colorType: "grayscale",
        rasterize: true,
        scaleContent: true,
        size: {
          width: inchWidth,
        },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        units: "in",
        reopenWait: 100,
        jobName: options.jobName || "RestaurantsOS Thermal Ticket",
      });

      const printData = [
        {
          type: "pixel" as const,
          format: "html" as const,
          flavor: "plain" as const,
          data: options.html,
          options: {
            pageWidth: inchWidth,
            pageHeight: "auto",
          },
        },
      ];

      await qz.print(printConfig, printData);
      return {
        success: true,
        message: `Silent print sent directly to ${targetPrinter}`,
      };
    } catch (err: any) {
      console.error("Error during QZ silent print:", err);
      return {
        success: false,
        message: err?.message || "Failed to print via QZ Tray.",
      };
    }
  }
}

export const qzTrayService = new QZTrayService();
export default qzTrayService;
