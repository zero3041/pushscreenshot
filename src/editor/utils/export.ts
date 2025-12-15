/**
 * Export Utilities
 * Functions for exporting images with all annotations, watermark, frame, and padding
 * 
 * Requirements: 18.1, 18.2
 * - WHEN a user clicks "Copy" THEN the Editor SHALL copy the final image to clipboard
 * - WHEN a user clicks "Done" THEN the Editor SHALL save/upload the final image and close the editor
 */

import type { WatermarkConfig, BrowserFrameConfig, PaddingConfig } from '../types/editor';
import { applyWatermarkToCanvas } from './watermark';
import { calculateFrameHeaderHeight } from './browserFrame';
import { clampPaddingSize } from './padding';
import { generateBrowserFrame } from '../assets/browser-frames';
import type { BrowserFrameRenderConfig } from '../assets/browser-frames';
import type * as fabric from 'fabric';

// ============================================================================
// Types
// ============================================================================

export interface ExportConfig {
    /** Watermark configuration */
    watermark?: WatermarkConfig | null;
    /** Browser frame configuration */
    browserFrame?: BrowserFrameConfig | null;
    /** Padding configuration */
    padding?: PaddingConfig | null;
    /** Output format */
    format?: 'image/png' | 'image/jpeg';
    /** JPEG quality (0-1) */
    quality?: number;
}

export interface ExportResult {
    /** Data URL of the exported image */
    dataUrl: string;
    /** Width of the exported image */
    width: number;
    /** Height of the exported image */
    height: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Load an image from a data URL
 */
function loadImage(imageData: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageData;
    });
}

/**
 * Calculate final dimensions with all effects applied
 */
export function calculateFinalDimensions(
    imageWidth: number,
    imageHeight: number,
    config: ExportConfig
): { width: number; height: number; paddingSize: number; frameHeaderHeight: number } {
    let width = imageWidth;
    let height = imageHeight;
    let paddingSize = 0;
    let frameHeaderHeight = 0;

    // Add browser frame height
    if (config.browserFrame?.enabled) {
        frameHeaderHeight = calculateFrameHeaderHeight(config.browserFrame);
        height += frameHeaderHeight;
    }

    // Add padding
    if (config.padding?.enabled && config.padding.size > 0) {
        paddingSize = clampPaddingSize(config.padding.size);
        width += paddingSize * 2;
        height += paddingSize * 2;
    }

    return { width, height, paddingSize, frameHeaderHeight };
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export canvas with all annotations as data URL
 * This is the main export function that combines all effects
 * 
 * @param fabricCanvas - Fabric.js canvas instance
 * @param config - Export configuration
 * @returns Promise resolving to ExportResult
 */
export async function exportCanvasWithEffects(
    fabricCanvas: fabric.Canvas,
    config: ExportConfig = {}
): Promise<ExportResult> {
    const format = config.format || 'image/png';
    const quality = config.quality || 0.92;

    // Deselect all objects before export
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();

    // Get canvas data URL (includes base image and all annotations)
    const canvasDataUrl = fabricCanvas.toDataURL({
        format: format === 'image/png' ? 'png' : 'jpeg',
        quality,
        multiplier: 1,
    });

    // Apply additional effects
    return applyExportEffects(canvasDataUrl, config);
}

/**
 * Apply export effects (watermark, frame, padding) to an image
 * 
 * @param imageData - Base64 encoded source image
 * @param config - Export configuration
 * @returns Promise resolving to ExportResult
 */
export async function applyExportEffects(
    imageData: string,
    config: ExportConfig = {}
): Promise<ExportResult> {
    const format = config.format || 'image/png';
    const quality = config.quality || 0.92;

    // Load source image
    const sourceImg = await loadImage(imageData);
    const sourceWidth = sourceImg.width;
    const sourceHeight = sourceImg.height;

    // Calculate final dimensions
    const { width, height, paddingSize, frameHeaderHeight } = calculateFinalDimensions(
        sourceWidth,
        sourceHeight,
        config
    );

    // Create final canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }

    // Fill with padding color or white background
    if (config.padding?.enabled && config.padding.size > 0) {
        ctx.fillStyle = config.padding.color;
    } else {
        ctx.fillStyle = '#ffffff';
    }
    ctx.fillRect(0, 0, width, height);

    // Calculate image position
    const imageX = paddingSize;
    let imageY = paddingSize;

    // Handle browser frame
    if (config.browserFrame?.enabled) {
        const isUrlBottom = config.browserFrame.style === 'url_bottom';

        if (isUrlBottom) {
            // Draw source image first
            ctx.drawImage(sourceImg, imageX, imageY);

            // Draw frame at bottom
            await drawBrowserFrame(ctx, config.browserFrame, sourceWidth, imageY + sourceHeight, imageX);
        } else {
            // Draw frame at top
            await drawBrowserFrame(ctx, config.browserFrame, sourceWidth, imageY, imageX);

            // Draw source image below frame
            imageY += frameHeaderHeight;
            ctx.drawImage(sourceImg, imageX, imageY);
        }
    } else {
        // No frame, just draw the image
        ctx.drawImage(sourceImg, imageX, imageY);
    }

    // Apply watermark (on top of everything)
    if (config.watermark?.enabled) {
        await applyWatermarkToCanvas(ctx, config.watermark, width, height);
    }

    return {
        dataUrl: canvas.toDataURL(format, quality),
        width,
        height,
    };
}

/**
 * Draw browser frame on canvas
 */
async function drawBrowserFrame(
    ctx: CanvasRenderingContext2D,
    config: BrowserFrameConfig,
    imageWidth: number,
    yOffset: number,
    xOffset: number = 0
): Promise<void> {
    const renderConfig: BrowserFrameRenderConfig = {
        style: config.style,
        includeUrl: config.includeUrl,
        includeDate: config.includeDate,
        url: config.url,
    };

    const frameSvg = generateBrowserFrame(imageWidth, renderConfig);

    // Convert SVG to image
    const encoded = encodeURIComponent(frameSvg)
        .replace(/'/g, '%27')
        .replace(/"/g, '%22');
    const dataUrl = `data:image/svg+xml,${encoded}`;

    const frameImg = await loadImage(dataUrl);
    ctx.drawImage(frameImg, xOffset, yOffset);
}

// ============================================================================
// Clipboard and Download Functions
// ============================================================================

/**
 * Copy image to clipboard
 * 
 * @param dataUrl - Data URL of the image to copy
 * @returns Promise that resolves when copy is complete
 */
export async function copyImageToClipboard(dataUrl: string): Promise<void> {
    try {
        // Convert data URL to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        // Use Clipboard API
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        throw new Error('Cannot copy to clipboard. Please try downloading instead.');
    }
}

/**
 * Generate timestamp filename for download
 * 
 * @param prefix - Filename prefix (default: 'screenshot')
 * @param extension - File extension (default: 'png')
 * @returns Filename with timestamp
 */
export function generateTimestampFilename(
    prefix: string = 'screenshot',
    extension: string = 'png'
): string {
    const timestamp = new Date().toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, 19);
    return `${prefix}_${timestamp}.${extension}`;
}

/**
 * Download image as file
 * 
 * @param dataUrl - Data URL of the image to download
 * @param filename - Optional filename (auto-generated if not provided)
 */
export function downloadImage(dataUrl: string, filename?: string): void {
    const finalFilename = filename || generateTimestampFilename();

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = finalFilename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============================================================================
// High-Level Export Functions
// ============================================================================

/**
 * Export and copy to clipboard
 * Combines export with effects and clipboard copy
 * 
 * @param fabricCanvas - Fabric.js canvas instance
 * @param config - Export configuration
 * @returns Promise that resolves when copy is complete
 */
export async function exportAndCopy(
    fabricCanvas: fabric.Canvas,
    config: ExportConfig = {}
): Promise<void> {
    const result = await exportCanvasWithEffects(fabricCanvas, config);
    await copyImageToClipboard(result.dataUrl);
}

/**
 * Export and download
 * Combines export with effects and file download
 * 
 * @param fabricCanvas - Fabric.js canvas instance
 * @param config - Export configuration
 * @param filename - Optional filename
 */
export async function exportAndDownload(
    fabricCanvas: fabric.Canvas,
    config: ExportConfig = {},
    filename?: string
): Promise<void> {
    const result = await exportCanvasWithEffects(fabricCanvas, config);
    downloadImage(result.dataUrl, filename);
}

/**
 * Export image data URL with all effects applied
 * For use when you have a data URL instead of a Fabric canvas
 * 
 * @param imageData - Base64 encoded source image
 * @param config - Export configuration
 * @returns Promise resolving to data URL
 */
export async function exportImageWithEffects(
    imageData: string,
    config: ExportConfig = {}
): Promise<string> {
    const result = await applyExportEffects(imageData, config);
    return result.dataUrl;
}
