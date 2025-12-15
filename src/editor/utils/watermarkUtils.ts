/**
 * Watermark utility functions
 * Extracted from WatermarkPanel for fast-refresh compatibility
 */

import { WATERMARK_CONSTRAINTS } from '../types/editor';

/**
 * Clamp size value to valid range (20-200)
 */
export function clampWatermarkSize(value: number): number {
    return Math.max(
        WATERMARK_CONSTRAINTS.minSize,
        Math.min(WATERMARK_CONSTRAINTS.maxSize, Math.round(value))
    );
}

/**
 * Clamp opacity value to valid range (0-100)
 */
export function clampWatermarkOpacity(value: number): number {
    return Math.max(
        WATERMARK_CONSTRAINTS.minOpacity,
        Math.min(WATERMARK_CONSTRAINTS.maxOpacity, Math.round(value))
    );
}
