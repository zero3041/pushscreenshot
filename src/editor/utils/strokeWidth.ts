/**
 * Stroke Width Utilities
 * Helper functions for stroke width operations
 * Requirements: 14.1, 14.2
 */

import { STROKE_WIDTHS } from '../types/editor';

export type StrokeWidthMode = 'default' | 'highlight';

/**
 * Get the stroke width options based on mode
 */
export function getStrokeWidthOptions(mode: StrokeWidthMode): readonly number[] {
    return mode === 'highlight' ? STROKE_WIDTHS.highlight : STROKE_WIDTHS.default;
}
