/**
 * ImageTool - Insert external images onto canvas
 *
 * Features:
 * - File picker for image selection
 * - Place image on canvas
 * - Support resize, move, rotate
 *
 * Requirements: 9.1, 9.2, 9.3
 * - WHEN a user clicks "Insert Image" THEN the Editor SHALL open a file picker for image selection
 * - WHEN an image is selected THEN the Editor SHALL place it on the canvas
 * - WHEN an image is placed THEN the Editor SHALL allow resizing, moving, and rotating it
 */

import * as fabric from 'fabric';
import type { BaseTool, ToolMouseEvent, ToolState, DrawResult } from './registry';
import { toolRegistry } from './registry';
import { generateAnnotationId, createAnnotationStyle, createTransform } from './helpers';
import type { ToolSettings, ImageAnnotation } from '../types/editor';

/**
 * Default image size when placed on canvas
 */
const DEFAULT_IMAGE_SIZE = 200;

/**
 * Maximum image dimension to prevent performance issues
 */
const MAX_IMAGE_DIMENSION = 2000;

/**
 * Currently selected image data for placement
 */
let selectedImageData: string | null = null;

/**
 * Original image dimensions
 */
let originalImageDimensions: { width: number; height: number } | null = null;

/**
 * Set the image data to be placed
 */
export function setSelectedImage(imageData: string | null, width?: number, height?: number): void {
    selectedImageData = imageData;
    if (imageData && width && height) {
        originalImageDimensions = { width, height };
    } else {
        originalImageDimensions = null;
    }
}

/**
 * Get the currently selected image data
 */
export function getSelectedImage(): string | null {
    return selectedImageData;
}

/**
 * Clear the selected image
 */
export function clearSelectedImage(): void {
    selectedImageData = null;
    originalImageDimensions = null;
}

/**
 * Open file picker and load image
 * Returns a promise that resolves with the image data URL and dimensions
 */
export function openImagePicker(): Promise<{ imageData: string; width: number; height: number } | null> {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = async (event) => {
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];

            if (!file) {
                resolve(null);
                return;
            }

            try {
                const result = await loadImageFromFile(file);
                resolve(result);
            } catch (error) {
                console.error('Failed to load image:', error);
                resolve(null);
            }
        };

        input.oncancel = () => {
            resolve(null);
        };

        input.click();
    });
}

/**
 * Load image from file and return data URL with dimensions
 */
export function loadImageFromFile(file: File): Promise<{ imageData: string; width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;

            // Load image to get dimensions
            const img = new Image();
            img.onload = () => {
                resolve({
                    imageData: dataUrl,
                    width: img.width,
                    height: img.height,
                });
            };
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            img.src = dataUrl;
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Calculate scaled dimensions to fit within max size while maintaining aspect ratio
 */
export function calculateFitDimensions(
    originalWidth: number,
    originalHeight: number,
    maxSize: number = DEFAULT_IMAGE_SIZE
): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;

    let width: number;
    let height: number;

    if (originalWidth > originalHeight) {
        width = Math.min(originalWidth, maxSize);
        height = width / aspectRatio;
    } else {
        height = Math.min(originalHeight, maxSize);
        width = height * aspectRatio;
    }

    // Ensure dimensions don't exceed max
    if (width > MAX_IMAGE_DIMENSION) {
        width = MAX_IMAGE_DIMENSION;
        height = width / aspectRatio;
    }
    if (height > MAX_IMAGE_DIMENSION) {
        height = MAX_IMAGE_DIMENSION;
        width = height * aspectRatio;
    }

    return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Image insertion tool
 * Allows placing external images on the canvas with resize, move, and rotate support
 */
export class ImageTool implements BaseTool {
    readonly type = 'insert_image' as const;
    readonly name = 'Insert Image';
    readonly cursor = 'crosshair';

    /**
     * Start placing an image
     * Creates a preview at the click position
     */
    onMouseDown(
        event: ToolMouseEvent,
        settings: ToolSettings,
        _state: ToolState
    ): fabric.FabricObject | null {
        const { point } = event;

        if (!selectedImageData) {
            return null;
        }

        // Calculate dimensions
        const dimensions = originalImageDimensions
            ? calculateFitDimensions(originalImageDimensions.width, originalImageDimensions.height)
            : { width: DEFAULT_IMAGE_SIZE, height: DEFAULT_IMAGE_SIZE };

        // Create preview placeholder
        const preview = this.createPreviewPlaceholder(
            point.x,
            point.y,
            dimensions.width,
            dimensions.height,
            settings
        );

        return preview;
    }

    /**
     * Update preview position as mouse moves
     */
    onMouseMove(
        event: ToolMouseEvent,
        _settings: ToolSettings,
        state: ToolState
    ): void {
        const { point } = event;
        const { previewObject } = state;

        if (!previewObject) return;

        previewObject.set({
            left: point.x,
            top: point.y,
        });

        previewObject.setCoords();
    }

    /**
     * Complete the image placement
     * Returns the annotation and fabric object
     */
    onMouseUp(
        event: ToolMouseEvent,
        settings: ToolSettings,
        _state: ToolState
    ): DrawResult | null {
        const { point, canvas } = event;

        if (!selectedImageData) {
            return null;
        }

        // Calculate dimensions
        const dimensions = originalImageDimensions
            ? calculateFitDimensions(originalImageDimensions.width, originalImageDimensions.height)
            : { width: DEFAULT_IMAGE_SIZE, height: DEFAULT_IMAGE_SIZE };

        // Create annotation
        const annotation: ImageAnnotation = {
            id: generateAnnotationId(),
            type: 'insert_image',
            style: createAnnotationStyle(settings),
            transform: createTransform(point.x, point.y),
            locked: false,
            imageData: selectedImageData,
            width: dimensions.width,
            height: dimensions.height,
        };

        // Create placeholder that will be replaced with actual image
        const placeholder = this.createPreviewPlaceholder(
            point.x,
            point.y,
            dimensions.width,
            dimensions.height,
            settings,
            false
        );

        // Load and replace with actual image
        this.loadAndReplaceWithImage(
            selectedImageData,
            placeholder,
            point.x,
            point.y,
            dimensions.width,
            dimensions.height,
            settings.opacity,
            canvas
        );

        // Clear selected image after placement
        clearSelectedImage();

        return {
            annotation,
            fabricObject: placeholder,
        };
    }

    /**
     * Create a Fabric.js object from an annotation
     * Used when loading existing annotations
     */
    createFabricObject(
        annotation: ImageAnnotation | unknown,
        settings: ToolSettings
    ): fabric.FabricObject | null {
        if (!this.isImageAnnotation(annotation)) {
            return null;
        }

        return this.createFabricObjectFromAnnotation(annotation, settings);
    }

    /**
     * Type guard to check if annotation is an ImageAnnotation
     */
    private isImageAnnotation(
        annotation: unknown
    ): annotation is ImageAnnotation {
        if (!annotation || typeof annotation !== 'object') return false;
        const a = annotation as Record<string, unknown>;
        return (
            a.type === 'insert_image' &&
            typeof a.imageData === 'string' &&
            typeof a.width === 'number' &&
            typeof a.height === 'number'
        );
    }

    /**
     * Internal method to create fabric object from typed annotation
     */
    private createFabricObjectFromAnnotation(
        annotation: ImageAnnotation,
        settings: ToolSettings
    ): fabric.FabricObject | null {
        const { transform, imageData, width, height } = annotation;

        // Create placeholder
        const placeholder = this.createPreviewPlaceholder(
            transform.x,
            transform.y,
            width,
            height,
            settings,
            false
        );

        // Load actual image asynchronously
        this.loadImageAsync(
            imageData,
            placeholder,
            transform.x,
            transform.y,
            width,
            height,
            settings.opacity,
            transform.scaleX,
            transform.scaleY,
            transform.rotation
        );

        return placeholder;
    }

    /**
     * Create a preview placeholder rectangle
     */
    private createPreviewPlaceholder(
        left: number,
        top: number,
        width: number,
        height: number,
        settings: ToolSettings,
        isPreview: boolean = true
    ): fabric.Rect {
        return new fabric.Rect({
            left,
            top,
            width,
            height,
            fill: isPreview ? 'rgba(74, 158, 255, 0.1)' : 'transparent',
            stroke: isPreview ? '#4a9eff' : 'transparent',
            strokeWidth: isPreview ? 2 : 0,
            strokeDashArray: isPreview ? [6, 4] : undefined,
            originX: 'center',
            originY: 'center',
            opacity: isPreview ? 0.7 : settings.opacity,
            selectable: true,
            evented: true,
        });
    }

    /**
     * Load image and replace placeholder on canvas
     */
    private async loadAndReplaceWithImage(
        imageData: string,
        placeholder: fabric.Rect,
        left: number,
        top: number,
        width: number,
        height: number,
        opacity: number,
        canvas: fabric.Canvas
    ): Promise<void> {
        try {
            const img = await this.loadFabricImage(imageData);

            // Calculate scale to fit desired dimensions
            const scaleX = width / (img.width || width);
            const scaleY = height / (img.height || height);

            img.set({
                left,
                top,
                originX: 'center',
                originY: 'center',
                scaleX,
                scaleY,
                opacity,
                selectable: true,
                evented: true,
            });

            // Replace placeholder with actual image
            canvas.remove(placeholder);
            canvas.add(img);
            canvas.renderAll();
        } catch (error) {
            console.error('Failed to load image:', error);
        }
    }

    /**
     * Load image asynchronously and update placeholder
     */
    private async loadImageAsync(
        imageData: string,
        placeholder: fabric.Rect,
        left: number,
        top: number,
        width: number,
        height: number,
        opacity: number,
        scaleX: number = 1,
        scaleY: number = 1,
        angle: number = 0
    ): Promise<void> {
        try {
            const img = await this.loadFabricImage(imageData);

            // Calculate base scale to fit desired dimensions
            const baseScaleX = width / (img.width || width);
            const baseScaleY = height / (img.height || height);

            img.set({
                left,
                top,
                originX: 'center',
                originY: 'center',
                scaleX: baseScaleX * scaleX,
                scaleY: baseScaleY * scaleY,
                angle,
                opacity,
                selectable: true,
                evented: true,
            });

            // Get canvas from placeholder and replace
            const canvas = placeholder.canvas;
            if (canvas) {
                canvas.remove(placeholder);
                canvas.add(img);
                canvas.renderAll();
            }
        } catch (error) {
            console.error('Failed to load image:', error);
        }
    }

    /**
     * Load a Fabric.js image from data URL
     */
    private loadFabricImage(imageData: string): Promise<fabric.FabricImage> {
        return new Promise((resolve, reject) => {
            const imgElement = new Image();
            imgElement.crossOrigin = 'anonymous';

            imgElement.onload = () => {
                const fabricImage = new fabric.FabricImage(imgElement);
                resolve(fabricImage);
            };

            imgElement.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            imgElement.src = imageData;
        });
    }
}

// Create singleton instance
export const imageTool = new ImageTool();

// Register with tool registry
toolRegistry.register(imageTool);
