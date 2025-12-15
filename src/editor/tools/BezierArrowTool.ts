/**
 * BezierArrowTool - Draw curved arrows with control points
 * 
 * Creates arrow annotations with curved paths using Bezier curves.
 * 
 * Requirements: 3.3
 * - WHEN a user selects the "Bezier Arrow" tool THEN the Editor SHALL allow 
 *   drawing curved arrows with control points
 * 
 * Property 7: Bezier arrow stores control points
 * - For any bezier arrow annotation, the stored data SHALL include start point, 
 *   end point, and at least one control point.
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
const ARROWHEAD_SIZE_MULTIPLIER = 3;

/**
 * Angle of the arrowhead lines (in radians)
 */
const ARROWHEAD_ANGLE = Math.PI / 6; // 30 degrees

/**
 * Bezier Arrow drawing tool
 * Creates curved arrow annotations with control points
 */
export class BezierArrowTool implements BaseTool {
    readonly type = 'bezier_arrow' as const;
    readonly name = 'Bezier Arrow';
    readonly cursor = 'crosshair';

    /**
     * Start drawing a bezier arrow
     * Creates a preview with the starting point
     */
    onMouseDown(
        event: ToolMouseEvent,
        settings: ToolSettings,
        _state: ToolState
    ): fabric.Group | null {
        const { point } = event;

        // Create preview with line at same point (will become curved as mouse moves)
        const preview = this.createBezierArrowGroup(point, point, this.calculateControlPoint(point, point), settings);

        return preview;
    }

    /**
     * Update the preview bezier arrow as the mouse moves
     */
    onMouseMove(
        event: ToolMouseEvent,
        settings: ToolSettings,
        state: ToolState
    ): void {
        const { point, canvas } = event;
        const { startPoint, previewObject } = state;

        if (!startPoint || !previewObject) return;

        // Calculate control point for the curve
        const controlPoint = this.calculateControlPoint(startPoint, point);

        // Remove old preview and create new one
        canvas.remove(previewObject);

        const newPreview = this.createBezierArrowGroup(startPoint, point, controlPoint, settings);
        canvas.add(newPreview);
        state.previewObject = newPreview;
    }

    /**
     * Complete the bezier arrow drawing
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

        // Calculate control point
        const controlPoint = this.calculateControlPoint(startPoint, point);

        // Create annotation with control point
        // Property 7: Bezier arrow stores control points
        const annotation: ArrowAnnotation = {
            id: generateAnnotationId(),
            type: 'bezier_arrow',
            style: createAnnotationStyle(settings),
            transform: createTransform(
                Math.min(startPoint.x, point.x, controlPoint.x),
                Math.min(startPoint.y, point.y, controlPoint.y)
            ),
            locked: false,
            startPoint: { ...startPoint },
            endPoint: { ...point },
            controlPoints: [{ ...controlPoint }], // At least one control point
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
        if (!this.isBezierArrowAnnotation(annotation)) {
            return null;
        }

        return this.createFabricObjectFromAnnotation(annotation, settings);
    }

    /**
     * Type guard to check if annotation is a bezier_arrow ArrowAnnotation
     */
    private isBezierArrowAnnotation(annotation: unknown): annotation is ArrowAnnotation {
        if (!annotation || typeof annotation !== 'object') return false;
        const a = annotation as Record<string, unknown>;
        return a.type === 'bezier_arrow' &&
            typeof a.startPoint === 'object' &&
            typeof a.endPoint === 'object' &&
            Array.isArray(a.controlPoints) &&
            a.controlPoints.length >= 1;
    }

    /**
     * Internal method to create fabric object from typed annotation
     */
    private createFabricObjectFromAnnotation(
        annotation: ArrowAnnotation,
        _settings: ToolSettings
    ): fabric.Group {
        const { style, transform, startPoint, endPoint, controlPoints } = annotation;

        // Use first control point (or calculate one if missing)
        const controlPoint = controlPoints && controlPoints.length > 0
            ? controlPoints[0]
            : this.calculateControlPoint(startPoint, endPoint);

        const group = this.createBezierArrowGroup(startPoint, endPoint, controlPoint, {
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
     * Calculate a control point for the bezier curve
     * Creates a natural curve perpendicular to the line
     */
    private calculateControlPoint(start: Point, end: Point): Point {
        // Midpoint of the line
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;

        // Calculate perpendicular offset
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        // Offset perpendicular to the line (30% of length)
        const offsetAmount = length * 0.3;

        // Perpendicular direction (rotate 90 degrees)
        const perpX = -dy / length;
        const perpY = dx / length;

        return {
            x: midX + perpX * offsetAmount,
            y: midY + perpY * offsetAmount,
        };
    }

    /**
     * Create bezier arrow group with curved path and arrowhead
     */
    private createBezierArrowGroup(
        start: Point,
        end: Point,
        control: Point,
        settings: ToolSettings
    ): fabric.Group {
        const { color, strokeWidth, opacity } = settings;

        // Arrowhead size based on stroke width
        const headLength = strokeWidth * ARROWHEAD_SIZE_MULTIPLIER;

        // Calculate tangent angle at the end point for arrowhead direction
        // For quadratic bezier, tangent at t=1 is direction from control to end
        const tangentAngle = Math.atan2(end.y - control.y, end.x - control.x);

        // Create bezier path
        const pathData = `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;

        const path = new fabric.Path(pathData, {
            stroke: color,
            strokeWidth: strokeWidth,
            fill: 'transparent',
            strokeLineCap: 'round',
            selectable: false,
            evented: false,
        });

        // Create V-shaped arrowhead at the end
        const arrowheadLines = this.createVArrowhead(
            end,
            tangentAngle,
            headLength,
            color,
            strokeWidth
        );

        // Group path and arrowhead
        const group = new fabric.Group([path, ...arrowheadLines], {
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
export const bezierArrowTool = new BezierArrowTool();

// Register with tool registry
toolRegistry.register(bezierArrowTool);
