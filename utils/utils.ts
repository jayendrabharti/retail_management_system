/**
 * Utility Functions for Retail Management System
 *
 * Common utility functions used throughout the application for:
 * - Error handling and logging
 * - Date and time formatting
 * - Data validation and transformation
 */

/**
 * Standardized error message extraction
 *
 * Safely extracts error messages from various error types while
 * preventing sensitive information leakage and overly long messages.
 *
 * @param error - The error object to extract message from
 * @param defaultMessage - Fallback message if extraction fails
 * @returns User-friendly error message
 */
export const getErrorMessage = (
  error: unknown,
  defaultMessage: string = "Something went wrong",
) => {
  console.error(error);
  let errorMessage = defaultMessage;

  // Only use error message if it's safe and reasonable length
  if (error instanceof Error && error.message.length < 100) {
    errorMessage = error.message;
  }

  return errorMessage;
};

/**
 * Formats timestamps for consistent display across the application
 *
 * Converts various timestamp formats to user-friendly display strings
 * with support for different formatting styles.
 *
 * @param timestamp - Date to format (string, number, or Date object)
 * @param format - Format style (1 = full, 2 = date only)
 * @returns Formatted date string or null if invalid
 */
export const formatTimestamp = (
  timestamp: string | number | Date,
  format = 1,
) => {
  if (!timestamp) return null;

  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("default", { month: "long" });
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12; // Convert to 12-hour format and handle midnight (0)

  // Format 2: Date only (e.g., "January 15, 2024")
  if (format == 2) {
    return `${month} ${day}, ${year}`;
  }

  // Format 1: Full timestamp (e.g., "15 January 2024 • 2:30 pm")
  return `${day} ${month} ${year} • ${hours}:${minutes} ${ampm}`;
};
