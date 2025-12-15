/**
 * RectangleTool - Draw rectangles with configurable stroke color and width
 * 
 * Migrated to Fabric.js Rect for better object manipulation.
 * 
 * Requirements: 2.1
 * - WHEN a user selects the "Rectangle" tool THEN the Editor SHALL allow 
 *   drawing rectangles with configurable stroke color and width
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
    getCommonFabricOptions,
    calculateRectBounds,
    hasMinimumSize,
} from './index';
import type { ToolSettings, ShapeAnnotation } from '../types/editor';

/**
 * Rectangle drawing tool
 * Creates rectangle annotations with configurable stroke color and width
 */
export class RectangleTool implements BaseTool {
    readonly type = 'rectangle' as const;
    readonly name = 'Rectangle';
    readonly cursor = 'crosshair';

    /**
     * Start drawing a rectangle
     * Creates a preview rectangle at the starting point
     */
    onMouseDown(
        event: ToolMouseEvent,
        settings: ToolSettings,
        _state: ToolState
    ): fabric.Rect | null {
        const { point } = event;

        // Create preview rectangle
        const preview = new fabric.Rect({
            ...getCommonFabricOptions(settings),
            left: point.x,
            top: point.y,
            width: 0,
            height: 0,
            strokeDashArray: [5, 5], // Dashed line for preview
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
     * Complete the rectangle drawing
     * Returns the annotation and fabric object if the rectangle has meaningful size
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

        // Create annotation
        const annotation: ShapeAnnotation = {
            id: generateAnnotationId(),
            type: 'rectangle',
            style: createAnnotationStyle(settings),
            transform: createTransform(bounds.left, bounds.top),
            locked: false,
            width: bounds.width,
            height: bounds.height,
        };

        // Create fabric object
        const fabricObject = this.createFabricObjectFromAnnotation(annotation, settings);

        if (!fabricObject) return null;

        return {
            annotation,
            fabricObject,
        };
    }

    /**
     * Create a Fabric.js Rect from an annotation
     * Used when loading existing annotations
     */
    createFabricObject(
        annotation: ShapeAnnotation | unknown,
        settings: ToolSettings
    ): fabric.Rect | null {
        // Type guard for ShapeAnnotation with rectangle type
        if (!this.isRectangleAnnotation(annotation)) {
            return null;
        }

        return this.createFabricObjectFromAnnotation(annotation, settings);
    }

    /**
     * Type guard to check if annotation is a rectangle ShapeAnnotation
     */
    private isRectangleAnnotation(annotation: unknown): annotation is ShapeAnnotation {
        if (!annotation || typeof annotation !== 'object') return false;
        const a = annotation as Record<string, unknown>;
        return a.type === 'rectangle' &&
            typeof a.width === 'number' &&
            typeof a.height === 'number';
    }

    /**
     * Internal method to create fabric object from typed annotation
     */
    private createFabricObjectFromAnnotation(
        annotation: ShapeAnnotation,
        _settings: ToolSettings
    ): fabric.Rect {
        const { style, transform, width, height } = annotation;

        return new fabric.Rect({
            left: transform.x,
            top: transform.y,
            width,
            height,
            stroke: style.color,
            strokeWidth: style.strokeWidth,
            fill: style.fill || 'transparent',
            opacity: style.opacity,
            scaleX: transform.scaleX,
            scaleY: transform.scaleY,
            angle: transform.rotation,
            selectable: true,
            evented: true,
        });
    }
}

// Create singleton instance
export const rectangleTool = new RectangleTool();

// Register with tool registry
toolRegistry.register(rectangleTool);
