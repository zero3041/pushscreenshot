/**
 * Watermark Utilities
 * Functions for applying watermark to images during export
 * 
 * Requirements: 10.3, 10.4, 10.5
 * - WHEN watermark is configured THEN the Editor SHALL allow selecting position
 * - WHEN watermark is configured THEN the Editor SHALL allow adjusting size (20%-200%)
 * - WHEN watermark is configured THEN the Editor SHALL allow adjusting opacity (0%-100%)
 */

import type { WatermarkConfig } from '../types/editor';
import { WATERMARK_CONSTRAINTS } from '../types/editor';

export type WatermarkPosition = WatermarkConfig['position'];

/**
 * Calculate watermark position coordinates based on position setting
 * 
 * @param position - Position setting (top_left, top_right, center, bottom_left, bottom_right)
 * @param canvasWidth - Width of the canvas
 * @param canvasHeight - Height of the canvas
 * @param watermarkWidth - Width of the watermark image (after scaling)
 * @param watermarkHeight - Height of the watermark image (after scaling)
 * @param padding - Padding from edges (default 10px)
 * @returns Coordinates {x, y} for watermark placement
 */
export function calculateWatermarkPosition(
    position: WatermarkPosition,
    canvasWidth: number,
    canvasHeight: number,
    watermarkWidth: number,
    watermarkHeight: number,
    padding: number = 10
): { x: number; y: number } {
    switch (position) {
        case 'top_left':
            return { x: padding, y: padding };

        case 'top_right':
            return { x: canvasWidth - watermarkWidth - padding, y: padding };

        case 'center':
            return {
                x: (canvasWidth - watermarkWidth) / 2,
                y: (canvasHeight - watermarkHeight) / 2,
            };

        case 'bottom_left':
            return { x: padding, y: canvasHeight - watermarkHeight - padding };

        case 'bottom_right':
        default:
            return {
                x: canvasWidth - watermarkWidth - padding,
                y: canvasHeight - watermarkHeight - padding,
            };
    }
}

/**
 * Calculate scaled watermark dimensions based on size percentage
 * 
 * @param originalWidth - Original watermark image width
 * @param originalHeight - Original watermark image height
 * @param sizePercent - Size percentage (20-200)
 * @param maxWidth - Maximum width constraint (optional, defaults to 50% of canvas)
 * @param maxHeight - Maximum height constraint (optional, defaults to 50% of canvas)
 * @returns Scaled dimensions {width, height}
 */
export function calculateWatermarkDimensions(
    originalWidth: number,
    originalHeight: number,
    sizePercent: number,
    maxWidth?: number,
    maxHeight?: number
): { width: number; height: number } {
    // Clamp size to valid range
    const clampedSize = Math.max(
        WATERMARK_CONSTRAINTS.minSize,
        Math.min(WATERMARK_CONSTRAINTS.maxSize, sizePercent)
    );

    // Calculate scaled dimensions
    let width = originalWidth * (clampedSize / 100);
    let height = originalHeight * (clampedSize / 100);

    // Apply max constraints if provided
    if (maxWidth && width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
    }

    if (maxHeight && height > maxHeight) {
        const ratio = maxHeight / height;
        height = maxHeight;
        width = width * ratio;
    }

    return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Load an image from a data URL
 * 
 * @param imageData - Base64 encoded image data URL
 * @returns Promise resolving to HTMLImageElement
 */
export function loadWatermarkImage(imageData: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load watermark image'));
        img.src = imageData;
    });
}

/**
 * Apply watermark to a canvas
 * 
 * @param ctx - Canvas 2D rendering context
 * @param config - Watermark configuration
 * @param canvasWidth - Width of the canvas
 * @param canvasHeight - Height of the canvas
 * @returns Promise that resolves when watermark is applied
 */
export async function applyWatermarkToCanvas(
    ctx: CanvasRenderingContext2D,
    config: WatermarkConfig,
    canvasWidth: number,
    canvasHeight: number
): Promise<void> {
    // Skip if not enabled or no image
    if (!config.enabled || !config.imageData) {
        return;
    }

    try {
        // Load watermark image
        const watermarkImg = await loadWatermarkImage(config.imageData);

        // Calculate dimensions (max 50% of canvas size)
        const maxWidth = canvasWidth * 0.5;
        const maxHeight = canvasHeight * 0.5;
        const { width, height } = calculateWatermarkDimensions(
            watermarkImg.width,
            watermarkImg.height,
            config.size,
            maxWidth,
            maxHeight
        );

        // Calculate position
        const { x, y } = calculateWatermarkPosition(
            config.position,
            canvasWidth,
            canvasHeight,
            width,
            height
        );

        // Apply opacity
        const opacity = Math.max(
            WATERMARK_CONSTRAINTS.minOpacity,
            Math.min(WATERMARK_CONSTRAINTS.maxOpacity, config.opacity)
        ) / 100;

        // Save context state
        ctx.save();

        // Set opacity
        ctx.globalAlpha = opacity;

        // Draw watermark
        ctx.drawImage(watermarkImg, x, y, width, height);

        // Restore context state
        ctx.restore();
    } catch (error) {
        console.error('Failed to apply watermark:', error);
        throw error;
    }
}

/**
 * Create a canvas with watermark applied to an image
 * 
 * @param imageData - Base64 encoded source image
 * @param config - Watermark configuration
 * @returns Promise resolving to canvas with watermark applied
 */
export async function createWatermarkedCanvas(
    imageData: string,
    config: WatermarkConfig
): Promise<HTMLCanvasElement> {
    // Load source image
    const sourceImg = await loadWatermarkImage(imageData);

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = sourceImg.width;
    canvas.height = sourceImg.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }

    // Draw source image
    ctx.drawImage(sourceImg, 0, 0);

    // Apply watermark
    await applyWatermarkToCanvas(ctx, config, canvas.width, canvas.height);

    return canvas;
}

/**
 * Export image with watermark as data URL
 * 
 * @param imageData - Base64 encoded source image
 * @param config - Watermark configuration
 * @param format - Output format ('image/png' or 'image/jpeg')
 * @param quality - JPEG quality (0-1, only used for JPEG)
 * @returns Promise resolving to data URL of watermarked image
 */
export async function exportWithWatermark(
    imageData: string,
    config: WatermarkConfig,
    format: 'image/png' | 'image/jpeg' = 'image/png',
    quality: number = 0.92
): Promise<string> {
    const canvas = await createWatermarkedCanvas(imageData, config);
    return canvas.toDataURL(format, quality);
}
