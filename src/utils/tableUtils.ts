import { RestaurantTable } from "../types";

/**
 * Checks whether an identifier or number string is a raw machine-generated
 * timestamp ID (e.g., "178556021144", "table-1791215624675", or a UUID)
 * rather than a human-assigned table number (e.g., "1", "2", "T-3", "VIP").
 */
export const isTimestampId = (val: string | number | undefined | null): boolean => {
  if (val === undefined || val === null) return false;
  const str = String(val).replace(/^table[\s\-_]*/i, "").trim();
  // 7 or more consecutive digits indicate epoch timestamp (milliseconds or seconds)
  if (/^\d{7,}$/.test(str)) return true;
  // Standard UUID format
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) return true;
  return false;
};

/**
 * Extracts a clean, human-readable table number/label.
 * Guarantees that internal timestamp IDs (e.g. 178556021144) are NEVER returned.
 */
export const getCleanTableNumber = (
  table?: RestaurantTable | null,
  tablesList: RestaurantTable[] = [],
  fallbackId?: string
): string => {
  // 1. Look up the table in tablesList by matching ID or fallbackId first
  const targetId = table?.id || fallbackId;
  if (targetId && tablesList && tablesList.length > 0) {
    const cleanTargetId = String(targetId).replace(/^table[\s\-_]*/i, "").trim();
    const matchedIdx = tablesList.findIndex(
      (t) =>
        t.id === targetId ||
        t.number === targetId ||
        t.number === cleanTargetId ||
        t.id.replace(/^table[\s\-_]*/i, "") === cleanTargetId
    );

    if (matchedIdx !== -1) {
      const matched = tablesList[matchedIdx];
      if (matched.number) {
        const cleanMatched = String(matched.number).replace(/^table[\s\-_]*/i, "").trim();
        if (cleanMatched && !isTimestampId(cleanMatched)) {
          return cleanMatched;
        }
      }
      // If table number itself was saved as a timestamp, fallback to 1-based index in the restaurant table list
      return String(matchedIdx + 1);
    }
  }

  // 2. Check if the provided table object has a clean, human-assigned number
  if (table?.number) {
    const clean = String(table.number).replace(/^table[\s\-_]*/i, "").trim();
    if (clean && !isTimestampId(clean)) {
      return clean;
    }
  }

  // 3. Check if fallbackId itself is a clean short number (e.g. "table-2" -> "2")
  if (fallbackId) {
    const cleanFallback = String(fallbackId).replace(/^table[\s\-_]*/i, "").trim();
    if (cleanFallback && !isTimestampId(cleanFallback)) {
      return cleanFallback;
    }
  }

  // 4. Ultimate safe fallback
  return "1";
};

/**
 * Formats a canonical, human-friendly table display name (e.g., "Table 1", "Table 2", "Table VIP").
 * Guarantees that timestamp IDs (e.g. "Table 178556021144") will NEVER be generated.
 */
export const formatTableDisplayName = (
  table?: RestaurantTable | null,
  tablesList: RestaurantTable[] = [],
  fallbackId?: string
): string => {
  const cleanNumber = getCleanTableNumber(table, tablesList, fallbackId);
  return cleanNumber.toLowerCase().startsWith("table") ? cleanNumber : `Table ${cleanNumber}`;
};

/**
 * Sanitizes existing or incoming order tableName strings to ensure legacy or corrupted
 * timestamp names (e.g., "Table 178556021144" or "Table table-178556021144")
 * are automatically sanitized to canonical human labels ("Table 1", "Table 2", etc.).
 */
export const sanitizeOrderTableName = (
  rawTableName?: string | null,
  tableId?: string,
  tablesList: RestaurantTable[] = []
): string => {
  if (!rawTableName) {
    return formatTableDisplayName(undefined, tablesList, tableId);
  }

  // If takeaway order, keep as is
  if (rawTableName.toLowerCase().includes("takeaway") || rawTableName.toLowerCase().includes("parcel")) {
    return rawTableName;
  }

  const cleanNum = rawTableName.replace(/^table[\s\-_]*/i, "").trim();
  // If the tableName contains a raw 7+ digit timestamp or UUID
  if (isTimestampId(cleanNum) || /\d{7,}/.test(rawTableName)) {
    return formatTableDisplayName(undefined, tablesList, tableId);
  }

  // Format cleanly with proper casing
  return cleanNum.toLowerCase().startsWith("table") ? cleanNum : `Table ${cleanNum}`;
};

/**
 * Returns the public web base URL for customer QR codes and menu links.
 * When running inside native desktop apps (Electron, where window.location.origin is "file://"),
 * this reliably falls back to settings.websiteUrl or https://app.restaurantsos.in
 * so customer smartphone cameras always navigate to the public web application.
 */
export const getPublicMenuBaseUrl = (websiteUrl?: string | null): string => {
  if (websiteUrl && /^https?:\/\//i.test(websiteUrl.trim())) {
    return websiteUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin;
    if (origin.startsWith('http://') || origin.startsWith('https://')) {
      // If deployed web app (e.g. app.restaurantsos.in or localhost dev), use current origin
      return origin.replace(/\/+$/, '');
    }
  }
  return ((import.meta as any).env?.VITE_PUBLIC_APP_URL || 'https://app.restaurantsos.in').replace(/\/+$/, '');
};

