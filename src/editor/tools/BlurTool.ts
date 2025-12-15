/**
 * BlurTool - Pixelate rectangular areas to hide sensitive information
 * 
 * Provides configurable pixel size for blur effect with optimized performance.
 * 
 * Requirements: 5.1, 5.2
 * - WHEN a user selects the "Blur" tool THEN the Editor SHALL allow selecting 
 *   rectangular areas to pixelate
 * - WHEN blur is applied THEN the Editor SHALL pixelate the selected area 
 *   with configurable pixel size
 */

import * as fabric from 'fabric';
import type {
    BaseTool,
    ToolMouseEvent,
    ToolState,
    DrawResult
} from './index';
import {
    toolRegistry,
    generateAnnotationId,
    createAnnotationStyle,
    createTransform,
    calculateRectBounds,
    hasMinimumSize,
} from './index';
import type { ToolSettings, BlurAnnotation } from '../types/editor';

// ============================================================================
// Constants
// ============================================================================

/** Default pixel size for blur effect */
export const DEFAULT_BLUR_PIXEL_SIZE = 10;

/** Minimum pixel size for blur effect */
export const MIN_BLUR_PIXEL_SIZE = 4;

/** Maximum pixel size for blur effect */
export const MAX_BLUR_PIXEL_SIZE = 32;

/** Available pixel size options */
export const BLUR_PIXEL_SIZES = [4, 6, 8, 10, 12, 16, 20, 24, 32] as const;

// ============================================================================
// Blur Pixel Size State
// ============================================================================

/** Current blur pixel size (module-level state) */
let currentPixelSize = DEFAULT_BLUR_PIXEL_SIZE;

/**
 * Get the current blur pixel size
 */
export function getBlurPixelSize(): number {
    return currentPixelSize;
}

/**
 * Set the blur pixel size
 * @param size - Pixel size (will be clamped to valid range)
 */
export function setBlurPixelSize(size: number): void {
    currentPixelSize = Math.max(MIN_BLUR_PIXEL_SIZE, Math.min(MAX_BLUR_PIXEL_SIZE, size));
}

// ============================================================================
// BlurTool Class
// ============================================================================

/**
 * Blur tool for pixelating rectangular areas
 * Creates blur annotations with configurable pixel size
 */
export class BlurTool implements BaseTool {
    readonly type = 'blur' as const;
    readonly name = 'Blur';
    readonly cursor = 'crosshair';

    /**
     * Start drawing a blur region
     * Creates a preview rectangle at the starting point
     */
    onMouseDown(
        event: ToolMouseEvent,
        settings: ToolSettings,
        _state: ToolState
    ): fabric.Rect | null {
        const { point } = event;

        // Create preview rectangle with blur indicator styling
        const preview = new fabric.Rect({
            left: point.x,
            top: point.y,
            width: 0,
            height: 0,
            fill: 'rgba(128, 128, 128, 0.3)',
            stroke: settings.color || 'rgba(128, 128, 128, 0.8)',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
            opacity: 0.7,
        });

        return preview;
    }

    /**
     * Update the preview rectangle as the mouse moves
     */
    onMouseMove(
        event: ToolMouseEvent,
        _settings: ToolSettings,
        state: ToolState
    ): void {
        const { point } = event;
        const { startPoint, previewObject } = state;

        if (!startPoint || !previewObject) return;

        const bounds = calculateRectBounds(startPoint, point);

        previewObject.set({
            left: bounds.left,
            top: bounds.top,
            width: bounds.width,
            height: bounds.height,
        });

        previewObject.setCoords();
    }

    /**
     * Complete the blur region drawing
     * Returns the annotation and fabric object if the region has meaningful size
     */
    onMouseUp(
        event: ToolMouseEvent,
        settings: ToolSettings,
        state: ToolState
    ): DrawResult | null {
        const { point } = event;
        const { startPoint } = state;

        if (!startPoint) return null;

        // Check minimum size
        if (!hasMinimumSize(startPoint, point)) {
            return null;
        }

        const bounds = calculateRectBounds(startPoint, point);

        // Create annotation with current pixel size
        const annotation: BlurAnnotation = {
            id: generateAnnotationId(),
            type: 'blur',
            style: createAnnotationStyle(settings),
            transform: createTransform(bounds.left, bounds.top),
            locked: false,
            width: bounds.width,
            height: bounds.height,
            pixelSize: currentPixelSize,
        };

        // Create fabric object
        const fabricObject = this.createFabricObjectFromAnnotation(annotation);

        if (!fabricObject) return null;

        return {
            annotation,
            fabricObject,
        };
    }

    /**
     * Create a Fabric.js object from an annotation
     * Used when loading existing annotations
     */
    createFabricObject(
        annotation: BlurAnnotation | unknown,
        _settings: ToolSettings
    ): fabric.Rect | null {
        // Type guard for BlurAnnotation
        if (!this.isBlurAnnotation(annotation)) {
            return null;
        }

        return this.createFabricObjectFromAnnotation(annotation);
    }

    /**
     * Type guard to check if annotation is a BlurAnnotation
     */
    private isBlurAnnotation(annotation: unknown): annotation is BlurAnnotation {
        if (!annotation || typeof annotation !== 'object') return false;
        const a = annotation as Record<string, unknown>;
        return a.type === 'blur' &&
            typeof a.width === 'number' &&
            typeof a.height === 'number' &&
            typeof a.pixelSize === 'number';
    }

    /**
     * Internal method to create fabric object from typed annotation
     * Creates a visual indicator for the blur region
     */
    private createFabricObjectFromAnnotation(
        annotation: BlurAnnotation
    ): fabric.Rect {
        const { transform, width, height, style } = annotation;

        // Create a rectangle with blur indicator pattern
        return new fabric.Rect({
            left: transform.x,
            top: transform.y,
            width,
            height,
            // Semi-transparent gray fill to indicate blur region
            fill: 'rgba(128, 128, 128, 0.3)',
            stroke: style.color || 'rgba(128, 128, 128, 0.8)',
            strokeWidth: 2,
            opacity: style.opacity || 0.7,
            scaleX: transform.scaleX,
            scaleY: transform.scaleY,
            angle: transform.rotation,
            selectable: true,
            evented: true,
        });
    }
}

// ============================================================================
// Pixelation Functions
// ============================================================================

/**
 * Apply pixelation blur effect to a canvas region
 * Optimized for performance with configurable pixel size
 * 
 * @param ctx - Canvas 2D rendering context
 * @param x - X coordinate of the region
 * @param y - Y coordinate of the region
 * @param width - Width of the region
 * @param height - Height of the region
 * @param pixelSize - Size of each pixel block (default: 10)
 */
export function applyPixelation(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    pixelSize: number = DEFAULT_BLUR_PIXEL_SIZE
): void {
    // Validate dimensions
    if (width <= 0 || height <= 0) return;

    // Clamp pixel size to valid range
    const clampedPixelSize = Math.max(MIN_BLUR_PIXEL_SIZE, Math.min(MAX_BLUR_PIXEL_SIZE, pixelSize));

    // Get the image data for the selected area
    const imageData = ctx.getImageData(x, y, width, height);
    const data = imageData.data;

    // Apply pixelation using block averaging
    for (let py = 0; py < height; py += clampedPixelSize) {
        for (let px = 0; px < width; px += clampedPixelSize) {
            // Calculate average color for this block
            let r = 0, g = 0, b = 0, a = 0, count = 0;

            const blockHeight = Math.min(clampedPixelSize, height - py);
            const blockWidth = Math.min(clampedPixelSize, width - px);

            for (let dy = 0; dy < blockHeight; dy++) {
                for (let dx = 0; dx < blockWidth; dx++) {
                    const i = ((py + dy) * width + (px + dx)) * 4;
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                    a += data[i + 3];
                    count++;
                }
            }

            // Calculate average
            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);
            a = Math.round(a / count);

            // Set all pixels in this block to the average color
            for (let dy = 0; dy < blockHeight; dy++) {
                for (let dx = 0; dx < blockWidth; dx++) {
                    const i = ((py + dy) * width + (px + dx)) * 4;
                    data[i] = r;
                    data[i + 1] = g;
                    data[i + 2] = b;
                    data[i + 3] = a;
                }
            }
        }
    }

    ctx.putImageData(imageData, x, y);
}

/**
 * Apply pixelation to a blur annotation
 * Convenience function that extracts coordinates from annotation
 * 
 * @param ctx - Canvas 2D rendering context
 * @param annotation - Blur annotation with position and size
 */
export function applyBlurAnnotation(
    ctx: CanvasRenderingContext2D,
    annotation: BlurAnnotation
): void {
    const { transform, width, height, pixelSize } = annotation;

    // Calculate actual dimensions considering scale
    const actualWidth = width * transform.scaleX;
    const actualHeight = height * transform.scaleY;

    applyPixelation(
        ctx,
        Math.round(transform.x),
        Math.round(transform.y),
        Math.round(actualWidth),
        Math.round(actualHeight),
        pixelSize
    );
}

// ============================================================================
// Singleton and Registration
// ============================================================================

// Create singleton instance
export const blurTool = new BlurTool();

// Register with tool registry
toolRegistry.register(blurTool);
