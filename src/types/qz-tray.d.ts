declare module "qz-tray" {
  export interface QZConfigOptions {
    colorType?: "color" | "grayscale" | "blackwhite";
    copies?: number;
    density?: number | string;
    duplex?: boolean | string;
    fallback?: boolean;
    header?: boolean;
    jobName?: string;
    legacy?: boolean;
    margins?: number | { top?: number; right?: number; bottom?: number; left?: number };
    orientation?: "portrait" | "landscape" | "reverse-landscape";
    paperThickness?: string | number;
    printerTray?: string;
    rasterize?: boolean | number;
    rotation?: number;
    scaleContent?: boolean;
    size?: { width?: number; height?: number };
    units?: "in" | "mm" | "cm";
    altPrinting?: boolean;
    encoding?: string;
    spool?: { size?: number; end?: string };
    bounds?: { x?: number; y?: number; width?: number; height?: number };
    reopenWait?: number;
  }

  export interface QZPrintData {
    type: "pixel" | "raw" | "pdf" | "image" | "html";
    format?: "plain" | "html" | "image" | "pdf" | "command" | "base64" | "hex";
    flavor?: "plain" | "base64" | "file" | "xml";
    data: any;
    options?: any;
  }

  export const version: string;

  export namespace websocket {
    export function connect(options?: { host?: string; port?: { secure?: number[]; insecure?: number[] }; usingSecure?: boolean; keepAlive?: number; retries?: number; delay?: number }): Promise<void>;
    export function disconnect(): Promise<void>;
    export function isActive(): boolean;
    export function setClosedCallbacks(callback: (event: any) => void): void;
    export function setErrorCallbacks(callback: (event: any) => void): void;
    export function getConnectionInfo(): Promise<any>;
    export function getNetworkInfo(): Promise<any>;
  }

  export namespace printers {
    export function getDefault(): Promise<string>;
    export function find(query?: string): Promise<string[] | string>;
    export function details(printer: string): Promise<any>;
    export function getStatus(): Promise<any>;
    export function setPrinterCallbacks(callback: (event: any) => void): void;
  }

  export namespace configs {
    export function create(printer: string, options?: QZConfigOptions): any;
    export function setDefaults(options: QZConfigOptions): void;
  }

  export function print(config: any, data: QZPrintData[]): Promise<void>;

  export namespace security {
    export function setCertificatePromise(promise: (resolve: (cert?: string) => void, reject: (err?: any) => void) => void): void;
    export function setSignaturePromise(promise: (toSign: string) => (resolve: (signature?: string) => void, reject: (err?: any) => void) => void): void;
    export function setSignatureAlgorithm(algorithm: string): void;
    export function getSignatureAlgorithm(): string;
  }

  const qz: {
    version: typeof version;
    websocket: typeof websocket;
    printers: typeof printers;
    configs: typeof configs;
    print: typeof print;
    security: typeof security;
  };

  export default qz;
}
