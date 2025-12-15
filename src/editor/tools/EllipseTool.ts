/**
 * EllipseTool - Draw ellipses/circles with configurable stroke color and width
 * 
 * Uses Fabric.js Ellipse for object manipulation.
 * 
 * Requirements: 2.2
 * - WHEN a user selects the "Ellipse" tool THEN the Editor SHALL allow 
 *   drawing ellipses/circles with configurable stroke color and width
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
 * Ellipse drawing tool
 * Creates ellipse/circle annotations with configurable stroke color and width
 */
export class EllipseTool implements BaseTool {
    readonly type = 'ellipse' as const;
    readonly name = 'Ellipse';
    readonly cursor = 'crosshair';

    /**
     * Start drawing an ellipse
     * Creates a preview ellipse at the starting point
     */
    onMouseDown(
        event: ToolMouseEvent,
        settings: ToolSettings,
        _state: ToolState
    ): fabric.Ellipse | null {
        const { point } = event;

        // Create preview ellipse
        // Fabric.js Ellipse uses rx/ry (radii) instead of width/height
        const preview = new fabric.Ellipse({
            ...getCommonFabricOptions(settings),
            left: point.x,
            top: point.y,
            rx: 0,
            ry: 0,
            strokeDashArray: [5, 5], // Dashed line for preview
        });

        return preview;
    }

    /**
     * Update the preview ellipse as the mouse moves
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

        // Ellipse uses rx/ry (radii), which are half of width/height
        const rx = bounds.width / 2;
        const ry = bounds.height / 2;

        // Position ellipse at center of bounding box
        // Fabric.js positions ellipse by its center when using originX/originY = 'center'
        // But by default it uses top-left, so we need to offset by the radius
        (previewObject as fabric.Ellipse).set({
            left: bounds.left,
            top: bounds.top,
            rx,
            ry,
        });

        previewObject.setCoords();
    }

    /**
     * Complete the ellipse drawing
     * Returns the annotation and fabric object if the ellipse has meaningful size
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
        // Store width/height in annotation, convert to rx/ry when creating fabric object
        const annotation: ShapeAnnotation = {
            id: generateAnnotationId(),
            type: 'ellipse',
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
     * Create a Fabric.js Ellipse from an annotation
     * Used when loading existing annotations
     */
    createFabricObject(
        annotation: ShapeAnnotation | unknown,
        settings: ToolSettings
    ): fabric.Ellipse | null {
        // Type guard for ShapeAnnotation with ellipse type
        if (!this.isEllipseAnnotation(annotation)) {
            return null;
        }

        return this.createFabricObjectFromAnnotation(annotation, settings);
    }

    /**
     * Type guard to check if annotation is an ellipse ShapeAnnotation
     */
    private isEllipseAnnotation(annotation: unknown): annotation is ShapeAnnotation {
        if (!annotation || typeof annotation !== 'object') return false;
        const a = annotation as Record<string, unknown>;
        return a.type === 'ellipse' &&
            typeof a.width === 'number' &&
            typeof a.height === 'number';
    }

    /**
     * Internal method to create fabric object from typed annotation
     */
    private createFabricObjectFromAnnotation(
        annotation: ShapeAnnotation,
        _settings: ToolSettings
    ): fabric.Ellipse {
        const { style, transform, width, height } = annotation;

        // Convert width/height to rx/ry (radii)
        const rx = width / 2;
        const ry = height / 2;

        return new fabric.Ellipse({
            left: transform.x,
            top: transform.y,
            rx,
            ry,
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
export const ellipseTool = new EllipseTool();

// Register with tool registry
toolRegistry.register(ellipseTool);
