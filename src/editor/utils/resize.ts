/**
 * Resize utility functions
 * Extracted from ResizePanel for fast-refresh compatibility
 */

/** Minimum allowed dimension */
export const MIN_DIMENSION = 1;
/** Maximum allowed dimension */
export const MAX_DIMENSION = 10000;

/**
 * Calculate new height maintaining aspect ratio
 */
export function calculateProportionalHeight(
    newWidth: number,
    originalWidth: number,
    originalHeight: number
): number {
    if (originalWidth === 0) return originalHeight;
    return Math.round(newWidth * originalHeight / originalWidth);
}

/**
 * Calculate new width maintaining aspect ratio
 */
export function calculateProportionalWidth(
    newHeight: number,
    originalWidth: number,
    originalHeight: number
): number {
    if (originalHeight === 0) return originalWidth;
    return Math.round(newHeight * originalWidth / originalHeight);
}

/**
 * Clamp a dimension value to valid range
 */
export function clampDimension(value: number): number {
    return Math.max(MIN_DIMENSION, Math.min(MAX_DIMENSION, Math.round(value)));
}
