/**
 * StickerTool - Place stickers on canvas
 *
 * Features:
 * - Place stickers at click position
 * - Support resize and move
 * - Configurable sticker type
 *
 * Requirements: 8.3, 8.4
 * - WHEN a user selects a sticker THEN the Editor SHALL allow placing it on the canvas
 * - WHEN a sticker is placed THEN the Editor SHALL allow resizing and moving it
 *
 * Property 12: Sticker preserves type and transform
 * - For any sticker placed with type T at position (x, y) with size (w, h),
 *   the stored annotation SHALL have stickerType=T, transform.x=x, transform.y=y, width=w, height=h
 */

import * as fabric from 'fabric';
import type {
    BaseTool,
    ToolMouseEvent,
    ToolState,
    DrawResult,
} from './index';
import {
    toolRegistry,
    generateAnnotationId,
    createAnnotationStyle,
    createTransform,
} from './index';
import type { ToolSettings, StickerAnnotation } from '../types/editor';
import { getStickerById } from '../assets/stickers';
import type { StickerItem } from '../assets/stickers';

/**
 * Default sticker size
 */
const DEFAULT_STICKER_SIZE = 64;

/**
 * Currently selected sticker for placement
 */
let selectedSticker: StickerItem | null = null;

/**
 * Set the sticker to be placed
 */
export function setSelectedSticker(sticker: StickerItem | null): void {
    selectedSticker = sticker;
}

/**
 * Get the currently selected sticker
 */
export function getSelectedSticker(): StickerItem | null {
    return selectedSticker;
}

/**
 * Sticker placement tool
 * Places stickers on the canvas with resize and move support
 */
export class StickerTool implements BaseTool {
    readonly type = 'sticker' as const;
    readonly name = 'Sticker';
    readonly cursor = 'crosshair';

    /**
     * Start placing a sticker
     * Creates a preview at the click position
     */
    onMouseDown(
        event: ToolMouseEvent,
        settings: ToolSettings,
        _state: ToolState
    ): fabric.FabricObject | null {
        const { point } = event;

        if (!selectedSticker) {
            return null;
        }

        // Create preview sticker
        const preview = this.createStickerObject(
            selectedSticker,
            point.x,
            point.y,
            DEFAULT_STICKER_SIZE,
            DEFAULT_STICKER_SIZE,
            settings,
            true // isPreview
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
     * Complete the sticker placement
     * Returns the annotation and fabric object
     */
    onMouseUp(
        event: ToolMouseEvent,
        settings: ToolSettings,
        _state: ToolState
    ): DrawResult | null {
        const { point } = event;

        if (!selectedSticker) {
            return null;
        }

        // Create annotation
        const annotation: StickerAnnotation = {
            id: generateAnnotationId(),
            type: 'sticker',
            style: createAnnotationStyle(settings),
            transform: createTransform(point.x, point.y),
            locked: false,
            stickerType: selectedSticker.id,
            width: DEFAULT_STICKER_SIZE,
            height: DEFAULT_STICKER_SIZE,
        };

        // Create fabric object
        const fabricObject = this.createFabricObjectFromAnnotation(
            annotation,
            settings
        );

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
        annotation: StickerAnnotation | unknown,
        settings: ToolSettings
    ): fabric.FabricObject | null {
        if (!this.isStickerAnnotation(annotation)) {
            return null;
        }

        return this.createFabricObjectFromAnnotation(annotation, settings);
    }

    /**
     * Type guard to check if annotation is a StickerAnnotation
     */
    private isStickerAnnotation(
        annotation: unknown
    ): annotation is StickerAnnotation {
        if (!annotation || typeof annotation !== 'object') return false;
        const a = annotation as Record<string, unknown>;
        return (
            a.type === 'sticker' &&
            typeof a.stickerType === 'string' &&
            typeof a.width === 'number' &&
            typeof a.height === 'number'
        );
    }

    /**
     * Internal method to create fabric object from typed annotation
     */
    private createFabricObjectFromAnnotation(
        annotation: StickerAnnotation,
        settings: ToolSettings
    ): fabric.FabricObject | null {
        const { transform, stickerType, width, height } = annotation;

        const sticker = getStickerById(stickerType);
        if (!sticker) {
            console.warn(`Sticker not found: ${stickerType}`);
            return null;
        }

        return this.createStickerObject(
            sticker,
            transform.x,
            transform.y,
            width,
            height,
            settings,
            false, // not preview
            transform.scaleX,
            transform.scaleY,
            transform.rotation
        );
    }

    /**
     * Create a Fabric.js object from SVG string
     */
    private createStickerObject(
        sticker: StickerItem,
        left: number,
        top: number,
        width: number,
        height: number,
        settings: ToolSettings,
        isPreview: boolean = false,
        scaleX: number = 1,
        scaleY: number = 1,
        angle: number = 0
    ): fabric.FabricObject {
        // Create a placeholder rect while SVG loads
        // We'll use fabric.loadSVGFromString for proper SVG rendering
        const placeholder = new fabric.Rect({
            left,
            top,
            width,
            height,
            fill: 'transparent',
            stroke: isPreview ? '#4a9eff' : 'transparent',
            strokeWidth: isPreview ? 1 : 0,
            strokeDashArray: isPreview ? [4, 4] : undefined,
            originX: 'center',
            originY: 'center',
            opacity: isPreview ? 0.7 : settings.opacity,
            scaleX,
            scaleY,
            angle,
            selectable: true,
            evented: true,
        });

        // Load SVG asynchronously and replace placeholder
        this.loadSvgAndReplace(
            sticker.svg,
            placeholder,
            left,
            top,
            width,
            height,
            settings.opacity,
            scaleX,
            scaleY,
            angle,
            isPreview
        );

        return placeholder;
    }

    /**
     * Load SVG and replace placeholder with actual SVG object
     */
    private async loadSvgAndReplace(
        svgString: string,
        placeholder: fabric.Rect,
        left: number,
        top: number,
        width: number,
        height: number,
        opacity: number,
        scaleX: number,
        scaleY: number,
        angle: number,
        isPreview: boolean
    ): Promise<void> {
        try {
            const result = await fabric.loadSVGFromString(svgString);
            // Filter out null objects before grouping
            const validObjects = result.objects.filter((obj): obj is fabric.FabricObject => obj !== null);
            if (validObjects.length === 0) return;

            const svgGroup = fabric.util.groupSVGElements(validObjects, result.options);

            if (!svgGroup) return;

            // Get the canvas from placeholder
            const canvas = placeholder.canvas;
            if (!canvas) return;

            // Calculate scale to fit desired size
            const svgWidth = svgGroup.width || width;
            const svgHeight = svgGroup.height || height;
            const fitScaleX = width / svgWidth;
            const fitScaleY = height / svgHeight;
            const fitScale = Math.min(fitScaleX, fitScaleY);

            // Apply properties
            svgGroup.set({
                left,
                top,
                originX: 'center',
                originY: 'center',
                scaleX: fitScale * scaleX,
                scaleY: fitScale * scaleY,
                angle,
                opacity: isPreview ? 0.7 : opacity,
                selectable: true,
                evented: true,
            });

            // Replace placeholder with SVG group
            canvas.remove(placeholder);
            canvas.add(svgGroup);
            canvas.renderAll();
        } catch (error) {
            console.error('Failed to load SVG:', error);
        }
    }
}

// Create singleton instance
export const stickerTool = new StickerTool();

// Register with tool registry
toolRegistry.register(stickerTool);
