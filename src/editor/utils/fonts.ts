/**
 * Font Utilities
 * Helper functions for font operations
 * Requirements: 4.1, 4.2, 4.5
 */

import { FONT_SIZE_CONSTRAINTS } from '../types/editor';

/**
 * Clamp font size to valid range
 */
export function clampFontSize(size: number): number {
    return Math.max(FONT_SIZE_CONSTRAINTS.min, Math.min(FONT_SIZE_CONSTRAINTS.max, size));
}

/**
 * Check if a font size is valid
 */
export function isValidFontSize(size: number): boolean {
    return size >= FONT_SIZE_CONSTRAINTS.min && size <= FONT_SIZE_CONSTRAINTS.max;
}

/**
 * Get the next font size (increment)
 */
export function incrementFontSize(currentSize: number): number {
    return clampFontSize(currentSize + FONT_SIZE_CONSTRAINTS.step);
}

/**
 * Get the previous font size (decrement)
 */
export function decrementFontSize(currentSize: number): number {
    return clampFontSize(currentSize - FONT_SIZE_CONSTRAINTS.step);
}
