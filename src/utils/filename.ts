/**
 * Filename generation utilities
 * Requirements: 5.2 - Generate filename format: screenshot_YYYY-MM-DD_HH-mm-ss.png
 */

/**
 * Generates a screenshot filename with timestamp
 * Format: screenshot_YYYY-MM-DD_HH-mm-ss.png
 * @param date - Optional date to use for timestamp (defaults to current date)
 * @returns Formatted filename string
 */
export function generateScreenshotFilename(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `screenshot_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.png`;
}
