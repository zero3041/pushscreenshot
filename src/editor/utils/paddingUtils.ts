/**
 * Padding utility functions
 * Extracted from PaddingPanel for fast-refresh compatibility
 */

import { PADDING_CONSTRAINTS } from '../types/editor';

/**
 * Clamp padding size value to valid range (0-200)
 * Property 17: Padding size within valid range
 */
export function clampPaddingSize(value: number): number {
    return Math.max(
        PADDING_CONSTRAINTS.minSize,
        Math.min(PADDING_CONSTRAINTS.maxSize, Math.round(value))
    );
}
