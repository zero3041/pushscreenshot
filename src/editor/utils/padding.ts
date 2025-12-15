/**
 * Padding Utilities
 * Functions for applying padding to images during export
 * 
 * Requirements: 12.2, 12.3
 * - WHEN padding is enabled THEN the Editor SHALL allow selecting padding color
 * - WHEN padding is enabled THEN the Editor SHALL allow adjusting padding size (0-200px)
 */

import type { PaddingConfig } from '../types/editor';
import { PADDING_CONSTRAINTS } from '../types/editor';

/**
 * Clamp padding size value to valid range (0-200)
 * Property 17: Padding size within valid range
 * 
 * @param value - Size value to clamp
 * @returns Clamped size value
 */
export function clampPaddingSize(value: number): number {
    return Math.max(
        PADDING_CONSTRAINTS.minSize,
        Math.min(PADDING_CONSTRAINTS.maxSize, Math.round(value))
    );
}

/**
 * Load an image from a data URL
 * 
 * @param imageData - Base64 encoded image data URL
 * @returns Promise resolving to HTMLImageElement
 */
export function loadImage(imageData: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageData;
    });
}

/**
 * Calculate the total dimensions with padding applied
 * 
 * @param imageWidth - Original image width
 * @param imageHeight - Original image height
 * @param config - Padding configuration
 * @returns Object with new width and height
 */
export function calculatePaddedDimensions(
    imageWidth: number,
    imageHeight: number,
    config: PaddingConfig
): { width: number; height: number } {
    if (!config.enabled || config.size <= 0) {
        return { width: imageWidth, height: imageHeight };
    }

    const paddingSize = clampPaddingSize(config.size);
    return {
        width: imageWidth + paddingSize * 2,
        height: imageHeight + paddingSize * 2,
    };
}

/**
 * Apply padding to a canvas
 * 
 * @param ctx - Canvas 2D rendering context
 * @param config - Padding configuration
 * @param canvasWidth - Total canvas width (including padding)
 * @param canvasHeight - Total canvas height (including padding)
 */
export function applyPaddingToCanvas(
    ctx: CanvasRenderingContext2D,
    config: PaddingConfig,
    canvasWidth: number,
    canvasHeight: number
): void {
    if (!config.enabled || config.size <= 0) {
        return;
    }

    // Fill entire canvas with padding color
    ctx.fillStyle = config.color;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
}

/**
 * Create a canvas with padding applied to an image
 * 
 * @param imageData - Base64 encoded source image
 * @param config - Padding configuration
 * @returns Promise resolving to canvas with padding applied
 */
export async function createPaddedCanvas(
    imageData: string,
    config: PaddingConfig
): Promise<HTMLCanvasElement> {
    // Load source image
    const sourceImg = await loadImage(imageData);

    // Calculate padded dimensions
    const { width, height } = calculatePaddedDimensions(
        sourceImg.width,
        sourceImg.height,
        config
    );

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }

    // Apply padding (fill background)
    applyPaddingToCanvas(ctx, config, width, height);

    // Calculate image position (centered with padding)
    const paddingSize = config.enabled ? clampPaddingSize(config.size) : 0;
    const imageX = paddingSize;
    const imageY = paddingSize;

    // Draw source image
    ctx.drawImage(sourceImg, imageX, imageY);

    return canvas;
}

/**
 * Export image with padding as data URL
 * 
 * @param imageData - Base64 encoded source image
 * @param config - Padding configuration
 * @param format - Output format ('image/png' or 'image/jpeg')
 * @param quality - JPEG quality (0-1, only used for JPEG)
 * @returns Promise resolving to data URL of padded image
 */
export async function exportWithPadding(
    imageData: string,
    config: PaddingConfig,
    format: 'image/png' | 'image/jpeg' = 'image/png',
    quality: number = 0.92
): Promise<string> {
    if (!config.enabled || config.size <= 0) {
        return imageData;
    }

    const canvas = await createPaddedCanvas(imageData, config);
    return canvas.toDataURL(format, quality);
}

/**
 * Validate padding configuration
 * 
 * @param config - Padding configuration to validate
 * @returns Validated configuration with defaults applied
 */
export function validatePaddingConfig(config: Partial<PaddingConfig>): PaddingConfig {
    return {
        enabled: config.enabled ?? false,
        color: config.color ?? '#ffffff',
        size: clampPaddingSize(config.size ?? 20),
    };
}

/**
 * Check if padding configuration preserves all settings
 * Used for property testing
 * 
 * @param original - Original configuration
 * @param stored - Stored configuration
 * @returns True if all settings are preserved
 */
export function paddingConfigPreservesSettings(
    original: PaddingConfig,
    stored: PaddingConfig
): boolean {
    return (
        original.enabled === stored.enabled &&
        original.color === stored.color &&
        original.size === stored.size
    );
}

/**
 * Check if padding size is within valid range
 * Property 17: Padding size within valid range
 * 
 * @param size - Size value to check
 * @returns True if size is within valid range
 */
export function isPaddingSizeValid(size: number): boolean {
    return size >= PADDING_CONSTRAINTS.minSize && size <= PADDING_CONSTRAINTS.maxSize;
}
