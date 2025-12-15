/**
 * Browser Frame Utilities
 * Functions for applying browser frame to images during export
 * 
 * Requirements: 11.2, 11.3, 11.4
 * - WHEN browser frame is enabled THEN the Editor SHALL allow selecting frame style: Mac, Windows, URL on top, URL on bottom
 * - WHEN browser frame is enabled THEN the Editor SHALL allow toggling "Include URL" option
 * - WHEN browser frame is enabled THEN the Editor SHALL allow toggling "Include Date" option
 */

import type { BrowserFrameConfig } from '../types/editor';
import {
    generateBrowserFrame,
    getFrameHeaderHeight,
} from '../assets/browser-frames';
import type { BrowserFrameRenderConfig } from '../assets/browser-frames';

export type BrowserFrameStyle = BrowserFrameConfig['style'];

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
 * Convert SVG string to data URL
 * 
 * @param svg - SVG string
 * @returns Data URL for the SVG
 */
export function svgToDataUrl(svg: string): string {
    const encoded = encodeURIComponent(svg)
        .replace(/'/g, '%27')
        .replace(/"/g, '%22');
    return `data:image/svg+xml,${encoded}`;
}

/**
 * Load SVG as an image
 * 
 * @param svg - SVG string
 * @returns Promise resolving to HTMLImageElement
 */
export async function loadSvgAsImage(svg: string): Promise<HTMLImageElement> {
    const dataUrl = svgToDataUrl(svg);
    return loadImage(dataUrl);
}

/**
 * Get the base style (mac or windows) from any frame style
 * 
 * @param style - Frame style
 * @returns Base style ('mac' or 'windows')
 */
export function getBaseStyle(style: BrowserFrameStyle): 'mac' | 'windows' {
    return style === 'windows' ? 'windows' : 'mac';
}

/**
 * Calculate the total height needed for the frame header
 * 
 * @param config - Browser frame configuration
 * @returns Header height in pixels
 */
export function calculateFrameHeaderHeight(config: BrowserFrameConfig): number {
    if (!config.enabled) return 0;

    const baseStyle = getBaseStyle(config.style);
    const showUrl = config.style === 'url_top' || config.style === 'url_bottom' || config.includeUrl;

    return getFrameHeaderHeight(baseStyle, showUrl);
}

/**
 * Apply browser frame to a canvas
 * 
 * @param ctx - Canvas 2D rendering context
 * @param config - Browser frame configuration
 * @param imageWidth - Width of the source image
 * @param imageHeight - Height of the source image
 * @param yOffset - Y offset where to draw the frame header
 * @returns Promise that resolves when frame is applied
 */
export async function applyBrowserFrameToCanvas(
    ctx: CanvasRenderingContext2D,
    config: BrowserFrameConfig,
    imageWidth: number,
    _imageHeight: number,
    yOffset: number = 0
): Promise<void> {
    // Skip if not enabled
    if (!config.enabled) {
        return;
    }

    try {
        // Generate frame SVG
        const renderConfig: BrowserFrameRenderConfig = {
            style: config.style,
            includeUrl: config.includeUrl,
            includeDate: config.includeDate,
            url: config.url,
        };

        const frameSvg = generateBrowserFrame(imageWidth, renderConfig);

        // Load SVG as image
        const frameImg = await loadSvgAsImage(frameSvg);

        // Draw frame header at the specified position
        ctx.drawImage(frameImg, 0, yOffset);
    } catch (error) {
        console.error('Failed to apply browser frame:', error);
        throw error;
    }
}

/**
 * Create a canvas with browser frame applied to an image
 * 
 * @param imageData - Base64 encoded source image
 * @param config - Browser frame configuration
 * @returns Promise resolving to canvas with browser frame applied
 */
export async function createFramedCanvas(
    imageData: string,
    config: BrowserFrameConfig
): Promise<HTMLCanvasElement> {
    // Load source image
    const sourceImg = await loadImage(imageData);

    // Calculate frame header height
    const headerHeight = calculateFrameHeaderHeight(config);

    // Determine if URL bar should be at bottom
    const isUrlBottom = config.style === 'url_bottom';

    // Create canvas with extra height for frame
    const canvas = document.createElement('canvas');
    canvas.width = sourceImg.width;
    canvas.height = sourceImg.height + headerHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }

    // Fill background (for rounded corners on Mac style)
    const baseStyle = getBaseStyle(config.style);
    if (baseStyle === 'mac') {
        ctx.fillStyle = '#e8e8e8';
    } else {
        ctx.fillStyle = '#f0f0f0';
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (isUrlBottom) {
        // Draw source image at top
        ctx.drawImage(sourceImg, 0, 0);

        // Apply frame at bottom
        await applyBrowserFrameToCanvas(ctx, config, sourceImg.width, sourceImg.height, sourceImg.height);
    } else {
        // Apply frame at top
        await applyBrowserFrameToCanvas(ctx, config, sourceImg.width, sourceImg.height, 0);

        // Draw source image below frame
        ctx.drawImage(sourceImg, 0, headerHeight);
    }

    return canvas;
}

/**
 * Export image with browser frame as data URL
 * 
 * @param imageData - Base64 encoded source image
 * @param config - Browser frame configuration
 * @param format - Output format ('image/png' or 'image/jpeg')
 * @param quality - JPEG quality (0-1, only used for JPEG)
 * @returns Promise resolving to data URL of framed image
 */
export async function exportWithBrowserFrame(
    imageData: string,
    config: BrowserFrameConfig,
    format: 'image/png' | 'image/jpeg' = 'image/png',
    quality: number = 0.92
): Promise<string> {
    if (!config.enabled) {
        return imageData;
    }

    const canvas = await createFramedCanvas(imageData, config);
    return canvas.toDataURL(format, quality);
}

/**
 * Validate browser frame configuration
 * 
 * @param config - Browser frame configuration to validate
 * @returns Validated configuration with defaults applied
 */
export function validateBrowserFrameConfig(config: Partial<BrowserFrameConfig>): BrowserFrameConfig {
    return {
        enabled: config.enabled ?? false,
        style: config.style ?? 'mac',
        includeUrl: config.includeUrl ?? true,
        includeDate: config.includeDate ?? false,
        url: config.url ?? '',
    };
}

/**
 * Check if browser frame configuration preserves all settings
 * Used for property testing
 * 
 * @param original - Original configuration
 * @param stored - Stored configuration
 * @returns True if all settings are preserved
 */
export function browserFrameConfigPreservesSettings(
    original: BrowserFrameConfig,
    stored: BrowserFrameConfig
): boolean {
    return (
        original.enabled === stored.enabled &&
        original.style === stored.style &&
        original.includeUrl === stored.includeUrl &&
        original.includeDate === stored.includeDate &&
        original.url === stored.url
    );
}
