/**
 * LineArrowTool - Draw arrows with simple line heads
 * 
 * Creates arrow annotations with simple V-shaped arrowheads.
 * 
 * Requirements: 3.2
 * - WHEN a user selects the "Line Arrow" tool THEN the Editor SHALL allow 
 *   drawing arrows with simple line heads
 * 
 * Property 4: Annotation preserves style settings
 * - For any annotation created with tool settings (color, strokeWidth, opacity), 
 *   the stored annotation style SHALL contain the exact same values.
 */

import * as fabric from 'fabric';
import type { Point } from '../../types';
import type { BaseTool, ToolMouseEvent, ToolState, DrawResult } from './registry';
import { toolRegistry } from './registry';
import { generateAnnotationId, createAnnotationStyle, createTransform, hasMinimumSize } from './helpers';
import type { ToolSettings, ArrowAnnotation } from '../types/editor';

const ARROWHEAD_SIZE_MULTIPLIER = 3;

/**
 * Angle of the arrowhead lines (in radians)
 */
const ARROWHEAD_ANGLE = Math.PI / 6; // 30 degrees

/**
 * Line Arrow drawing tool
 * Creates arrow annotations with simple V-shaped arrowheads
 */
export class LineArrowTool implements BaseTool {
    readonly type = 'line_arrow' as const;
    readonly name = 'Line Arrow';
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
            type: 'line_arrow',
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
        if (!this.isLineArrowAnnotation(annotation)) {
            return null;
        }

        return this.createFabricObjectFromAnnotation(annotation, settings);
    }

    /**
     * Type guard to check if annotation is a line_arrow ArrowAnnotation
     */
    private isLineArrowAnnotation(annotation: unknown): annotation is ArrowAnnotation {
        if (!annotation || typeof annotation !== 'object') return false;
        const a = annotation as Record<string, unknown>;
        return a.type === 'line_arrow' &&
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
     * Create arrow group with line and V-shaped arrowhead
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

        // Create main line
        const line = new fabric.Line([start.x, start.y, end.x, end.y], {
            stroke: color,
            strokeWidth: strokeWidth,
            strokeLineCap: 'round',
            selectable: false,
            evented: false,
        });

        // Create V-shaped arrowhead lines
        const arrowheadLines = this.createVArrowhead(
            end,
            angle,
            headLength,
            color,
            strokeWidth
        );

        // Group line and arrowhead
        const group = new fabric.Group([line, ...arrowheadLines], {
            opacity: opacity,
            selectable: true,
            evented: true,
        });

        return group;
    }

    /**
     * Create V-shaped arrowhead (two lines)
     */
    private createVArrowhead(
        tip: Point,
        angle: number,
        length: number,
        color: string,
        strokeWidth: number
    ): fabric.Line[] {
        // Calculate the two lines of the V
        // Each line goes from the tip backwards at an angle

        const leftAngle = angle + Math.PI - ARROWHEAD_ANGLE;
        const rightAngle = angle + Math.PI + ARROWHEAD_ANGLE;

        const leftEnd = {
            x: tip.x + Math.cos(leftAngle) * length,
            y: tip.y + Math.sin(leftAngle) * length,
        };

        const rightEnd = {
            x: tip.x + Math.cos(rightAngle) * length,
            y: tip.y + Math.sin(rightAngle) * length,
        };

        const leftLine = new fabric.Line([tip.x, tip.y, leftEnd.x, leftEnd.y], {
            stroke: color,
            strokeWidth: strokeWidth,
            strokeLineCap: 'round',
            selectable: false,
            evented: false,
        });

        const rightLine = new fabric.Line([tip.x, tip.y, rightEnd.x, rightEnd.y], {
            stroke: color,
            strokeWidth: strokeWidth,
            strokeLineCap: 'round',
            selectable: false,
            evented: false,
        });

        return [leftLine, rightLine];
    }
}

// Create singleton instance
export const lineArrowTool = new LineArrowTool();

// Register with tool registry
toolRegistry.register(lineArrowTool);
