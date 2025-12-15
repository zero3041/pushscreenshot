/**
 * LineTool - Draw simple lines without arrowheads
 * 
 * Creates line annotations without any arrowhead decoration.
 * 
 * Requirements: 3.4
 * - WHEN a user selects the "Line" tool THEN the Editor SHALL allow 
 *   drawing straight lines without arrowheads
 * 
 * Property 4: Annotation preserves style settings
 * - For any annotation created with tool settings (color, strokeWidth, opacity), 
 *   the stored annotation style SHALL contain the exact same values.
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
    hasMinimumSize,
} from './index';
import type { ToolSettings, ArrowAnnotation } from '../types/editor';

/**
 * Line drawing tool
 * Creates simple line annotations without arrowheads
 */
export class LineTool implements BaseTool {
    readonly type = 'line' as const;
    readonly name = 'Line';
    readonly cursor = 'crosshair';

    /**
     * Start drawing a line
     * Creates a preview line at the starting point
     */
    onMouseDown(
        event: ToolMouseEvent,
        settings: ToolSettings,
        _state: ToolState
    ): fabric.Line | null {
        const { point } = event;

        // Create preview line
        const preview = new fabric.Line([point.x, point.y, point.x, point.y], {
            stroke: settings.color,
            strokeWidth: settings.strokeWidth,
            strokeLineCap: 'round',
            opacity: settings.opacity,
            selectable: false,
            evented: false,
        });

        return preview;
    }

    /**
     * Update the preview line as the mouse moves
     */
    onMouseMove(
        event: ToolMouseEvent,
        _settings: ToolSettings,
        state: ToolState
    ): void {
        const { point } = event;
        const { startPoint, previewObject } = state;

        if (!startPoint || !previewObject) return;

        // Update line end point
        const line = previewObject as fabric.Line;
        line.set({
            x2: point.x,
            y2: point.y,
        });
        line.setCoords();
    }

    /**
     * Complete the line drawing
     * Returns the annotation and fabric object if the line has meaningful length
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

        // Create annotation
        const annotation: ArrowAnnotation = {
            id: generateAnnotationId(),
            type: 'line',
            style: createAnnotationStyle(settings),
            transform: createTransform(Math.min(startPoint.x, point.x), Math.min(startPoint.y, point.y)),
            locked: false,
            startPoint: { ...startPoint },
            endPoint: { ...point },
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
     * Create a Fabric.js Line from an annotation
     * Used when loading existing annotations
     */
    createFabricObject(
        annotation: ArrowAnnotation | unknown,
        settings: ToolSettings
    ): fabric.Line | null {
        if (!this.isLineAnnotation(annotation)) {
            return null;
        }

        return this.createFabricObjectFromAnnotation(annotation, settings);
    }

    /**
     * Type guard to check if annotation is a line ArrowAnnotation
     */
    private isLineAnnotation(annotation: unknown): annotation is ArrowAnnotation {
        if (!annotation || typeof annotation !== 'object') return false;
        const a = annotation as Record<string, unknown>;
        return a.type === 'line' &&
            typeof a.startPoint === 'object' &&
            typeof a.endPoint === 'object';
    }

    /**
     * Internal method to create fabric object from typed annotation
     */
    private createFabricObjectFromAnnotation(
        annotation: ArrowAnnotation,
        _settings: ToolSettings
    ): fabric.Line {
        const { style, transform, startPoint, endPoint } = annotation;

        const line = new fabric.Line([startPoint.x, startPoint.y, endPoint.x, endPoint.y], {
            stroke: style.color,
            strokeWidth: style.strokeWidth,
            strokeLineCap: 'round',
            opacity: style.opacity,
            scaleX: transform.scaleX,
            scaleY: transform.scaleY,
            angle: transform.rotation,
            selectable: true,
            evented: true,
        });

        return line;
    }
}

// Create singleton instance
export const lineTool = new LineTool();

// Register with tool registry
toolRegistry.register(lineTool);
