/**
 * Format a date to ISO string without milliseconds
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Log a message with timestamp
 * @param message The message to log
 * @param level The log level
 */
export function log(message: string, level: "info" | "error" | "warn" = "info"): void {
  const timestamp = formatDate();
  const prefix = level === "info" ? "INFO" : level === "error" ? "ERROR" : "WARN";
  console.log(`[${timestamp}] [${prefix}] ${message}`);
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type Constructor<T> = new (...args: any[]) => T;
