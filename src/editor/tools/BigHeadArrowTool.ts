/**
 * BigHeadArrowTool - Draw arrows with large triangular heads
 * 
 * Creates arrow annotations with prominent triangular arrowheads.
 * 
 * Requirements: 3.1
 * - WHEN a user selects the "Big Head Arrow" tool THEN the Editor SHALL allow 
 *   drawing arrows with large triangular heads
 * 
 * Property 4: Annotation preserves style settings
 * - For any annotation created with tool settings (color, strokeWidth, opacity), 
 *   the stored annotation style SHALL contain the exact same values.
 */

import * as fabric from 'fabric';
import type { Point } from '../../types';
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
 * Size of the arrowhead relative to stroke width
 */
const ARROWHEAD_SIZE_MULTIPLIER = 4;

/**
 * Big Head Arrow drawing tool
 * Creates arrow annotations with large triangular arrowheads
 */
export class BigHeadArrowTool implements BaseTool {
    readonly type = 'big_head_arrow' as const;
    readonly name = 'Big Head Arrow';
    readonly cursor = 'crosshair';

    /**
     * Start drawing an arrow
     * Creates a preview group with line and arrowhead
     */
    onMouseDown(
        event: ToolMouseEvent,
        settings: ToolSettings,
        _state: ToolState
    ): fabric.Group | null {
        const { point } = event;

        // Create preview with line and arrowhead at same point
        const preview = this.createArrowGroup(point, point, settings);

        return preview;
    }

    /**
     * Update the preview arrow as the mouse moves
     */
    onMouseMove(
        event: ToolMouseEvent,
        settings: ToolSettings,
        state: ToolState
    ): void {
        const { point, canvas } = event;
        const { startPoint, previewObject } = state;

        if (!startPoint || !previewObject) return;

        // Remove old preview and create new one
        canvas.remove(previewObject);

        const newPreview = this.createArrowGroup(startPoint, point, settings);
        canvas.add(newPreview);
        state.previewObject = newPreview;
    }

    /**
     * Complete the arrow drawing
     * Returns the annotation and fabric object if the arrow has meaningful length
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
            type: 'big_head_arrow',
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
     * Create a Fabric.js Group from an annotation
     * Used when loading existing annotations
     */
    createFabricObject(
        annotation: ArrowAnnotation | unknown,
        settings: ToolSettings
    ): fabric.Group | null {
        if (!this.isBigHeadArrowAnnotation(annotation)) {
            return null;
        }

        return this.createFabricObjectFromAnnotation(annotation, settings);
    }

    /**
     * Type guard to check if annotation is a big_head_arrow ArrowAnnotation
     */
    private isBigHeadArrowAnnotation(annotation: unknown): annotation is ArrowAnnotation {
        if (!annotation || typeof annotation !== 'object') return false;
        const a = annotation as Record<string, unknown>;
        return a.type === 'big_head_arrow' &&
            typeof a.startPoint === 'object' &&
            typeof a.endPoint === 'object';
    }

    /**
     * Internal method to create fabric object from typed annotation
     */
    private createFabricObjectFromAnnotation(
        annotation: ArrowAnnotation,
        _settings: ToolSettings
    ): fabric.Group {
        const { style, transform, startPoint, endPoint } = annotation;

        const group = this.createArrowGroup(startPoint, endPoint, {
            color: style.color,
            strokeWidth: style.strokeWidth,
            opacity: style.opacity,
        } as ToolSettings);

        group.set({
            scaleX: transform.scaleX,
            scaleY: transform.scaleY,
            angle: transform.rotation,
        });

        return group;
    }

    /**
     * Create arrow group with line and triangular arrowhead
     */
    private createArrowGroup(
        start: Point,
        end: Point,
        settings: ToolSettings
    ): fabric.Group {
        const { color, strokeWidth, opacity } = settings;

        // Calculate arrow direction
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const angle = Math.atan2(dy, dx);

        // Arrowhead size based on stroke width
        const headLength = strokeWidth * ARROWHEAD_SIZE_MULTIPLIER;
        const headWidth = headLength * 0.8;

        // Calculate arrowhead base point (where line meets arrowhead)
        const lineEndX = end.x - Math.cos(angle) * headLength;
        const lineEndY = end.y - Math.sin(angle) * headLength;

        // Create line (from start to arrowhead base)
        const line = new fabric.Line([start.x, start.y, lineEndX, lineEndY], {
            stroke: color,
            strokeWidth: strokeWidth,
            strokeLineCap: 'round',
            selectable: false,
            evented: false,
        });

        // Create triangular arrowhead
        const arrowhead = this.createTriangularArrowhead(
            end,
            angle,
            headLength,
            headWidth,
            color
        );

        // Group line and arrowhead
        const group = new fabric.Group([line, arrowhead], {
            opacity: opacity,
            selectable: true,
            evented: true,
        });

        return group;
    }

    /**
     * Create a filled triangular arrowhead
     */
    private createTriangularArrowhead(
        tip: Point,
        angle: number,
        length: number,
        width: number,
        color: string
    ): fabric.Polygon {
        // Calculate the three points of the triangle
        // Tip is at the end point
        // Base points are perpendicular to the arrow direction

        const baseX = tip.x - Math.cos(angle) * length;
        const baseY = tip.y - Math.sin(angle) * length;

        // Perpendicular offset for base points
        const perpAngle = angle + Math.PI / 2;
        const halfWidth = width / 2;

        const point1 = { x: tip.x, y: tip.y }; // Tip
        const point2 = {
            x: baseX + Math.cos(perpAngle) * halfWidth,
            y: baseY + Math.sin(perpAngle) * halfWidth,
        };
        const point3 = {
            x: baseX - Math.cos(perpAngle) * halfWidth,
            y: baseY - Math.sin(perpAngle) * halfWidth,
        };

        return new fabric.Polygon([point1, point2, point3], {
            fill: color,
            stroke: color,
            strokeWidth: 1,
            selectable: false,
            evented: false,
        });
    }
}

// Create singleton instance
export const bigHeadArrowTool = new BigHeadArrowTool();

// Register with tool registry
toolRegistry.register(bigHeadArrowTool);
