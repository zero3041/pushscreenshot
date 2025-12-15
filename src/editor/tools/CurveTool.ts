/**
 * CurveTool - Freehand drawing tool that tracks mouse points
 * 
 * Creates smooth paths following mouse movement.
 * 
 * Requirements: 2.3
 * - WHEN a user selects the "Curve" (freehand) tool THEN the Editor SHALL allow 
 *   drawing freehand curves following mouse movement
 * 
 * Property 5: Freehand curve preserves all points
 * - For any freehand drawing with n mouse positions, the resulting curve 
 *   annotation SHALL store all n points in the exact order they were recorded.
 */

import * as fabric from 'fabric';
import type { Point } from '../../types';
import type { BaseTool, ToolMouseEvent, ToolState, DrawResult } from './registry';
import { toolRegistry } from './registry';
import {
    generateAnnotationId,
    createAnnotationStyle,
    createTransform,
    getCommonFabricOptions,
} from './helpers';
import type { ToolSettings, PathAnnotation } from '../types/editor';

/**
 * Minimum distance between points to record (prevents too many points)
 */
const MIN_POINT_DISTANCE = 2;

/**
 * Freehand curve drawing tool
 * Creates path annotations that follow mouse movement
 */
export class CurveTool implements BaseTool {
    readonly type = 'curve' as const;
    readonly name = 'Freehand';
    readonly cursor = 'crosshair';

    /**
     * Start drawing a freehand curve
     * Creates a preview path starting at the mouse position
     */
    onMouseDown(
        event: ToolMouseEvent,
        settings: ToolSettings,
        state: ToolState
    ): fabric.Path | null {
        const { point } = event;

        // Initialize points array with starting point
        state.points = [point];

        // Create initial path with just the starting point
        const pathData = this.pointsToPathData([point]);

        const preview = new fabric.Path(pathData, {
            ...getCommonFabricOptions(settings),
            fill: 'transparent',
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
        });

        return preview;
    }

    /**
     * Update the preview path as the mouse moves
     * Adds new points and redraws the path
     */
    onMouseMove(
        event: ToolMouseEvent,
        settings: ToolSettings,
        state: ToolState
    ): void {
        const { point, canvas } = event;
        const { previewObject, points } = state;

        if (!previewObject || !points || points.length === 0) return;

        // Check minimum distance from last point
        const lastPoint = points[points.length - 1];
        const distance = Math.sqrt(
            Math.pow(point.x - lastPoint.x, 2) +
            Math.pow(point.y - lastPoint.y, 2)
        );

        if (distance < MIN_POINT_DISTANCE) return;

        // Add new point
        points.push(point);

        // Update path
        const pathData = this.pointsToPathData(points);

        // Remove old preview and create new one (Fabric.js paths can't be easily updated)
        canvas.remove(previewObject);

        const newPreview = new fabric.Path(pathData, {
            ...getCommonFabricOptions(settings),
            fill: 'transparent',
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
        });

        canvas.add(newPreview);
        state.previewObject = newPreview;
    }

    /**
     * Complete the freehand drawing
     * Returns the annotation with all recorded points
     */
    onMouseUp(
        _event: ToolMouseEvent,
        settings: ToolSettings,
        state: ToolState
    ): DrawResult | null {
        const { points } = state;

        if (!points || points.length < 2) {
            return null;
        }

        // Calculate bounding box for transform
        const bounds = this.calculateBounds(points);

        // Create annotation with all points preserved
        // Property 5: All n points are stored in exact order
        const annotation: PathAnnotation = {
            id: generateAnnotationId(),
            type: 'curve',
            style: createAnnotationStyle(settings),
            transform: createTransform(bounds.minX, bounds.minY),
            locked: false,
            points: [...points], // Copy all points in order
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
     * Create a Fabric.js Path from an annotation
     * Used when loading existing annotations
     */
    createFabricObject(
        annotation: PathAnnotation | unknown,
        settings: ToolSettings
    ): fabric.Path | null {
        if (!this.isCurveAnnotation(annotation)) {
            return null;
        }

        return this.createFabricObjectFromAnnotation(annotation, settings);
    }

    /**
     * Type guard to check if annotation is a curve PathAnnotation
     */
    private isCurveAnnotation(annotation: unknown): annotation is PathAnnotation {
        if (!annotation || typeof annotation !== 'object') return false;
        const a = annotation as Record<string, unknown>;
        return a.type === 'curve' && Array.isArray(a.points);
    }

    /**
     * Internal method to create fabric object from typed annotation
     */
    private createFabricObjectFromAnnotation(
        annotation: PathAnnotation,
        _settings: ToolSettings
    ): fabric.Path | null {
        const { style, transform, points } = annotation;

        if (points.length < 2) return null;

        const pathData = this.pointsToPathData(points);

        return new fabric.Path(pathData, {
            left: transform.x,
            top: transform.y,
            stroke: style.color,
            strokeWidth: style.strokeWidth,
            fill: 'transparent',
            opacity: style.opacity,
            scaleX: transform.scaleX,
            scaleY: transform.scaleY,
            angle: transform.rotation,
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
            selectable: true,
            evented: true,
        });
    }

    /**
     * Convert array of points to SVG path data string
     * Uses quadratic bezier curves for smooth lines
     */
    private pointsToPathData(points: Point[]): string {
        if (points.length === 0) return '';
        if (points.length === 1) {
            // Single point - draw a small dot
            const p = points[0];
            return `M ${p.x} ${p.y} L ${p.x + 0.1} ${p.y + 0.1}`;
        }

        // Start at first point
        let path = `M ${points[0].x} ${points[0].y}`;

        if (points.length === 2) {
            // Two points - draw a line
            path += ` L ${points[1].x} ${points[1].y}`;
            return path;
        }

        // Use quadratic bezier curves for smooth path
        // For each point (except first and last), use it as control point
        for (let i = 1; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];

            // Midpoint between current and next
            const midX = (current.x + next.x) / 2;
            const midY = (current.y + next.y) / 2;

            // Quadratic bezier to midpoint with current as control
            path += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
        }

        // Line to last point
        const lastPoint = points[points.length - 1];
        path += ` L ${lastPoint.x} ${lastPoint.y}`;

        return path;
    }

    /**
     * Calculate bounding box of points
     */
    private calculateBounds(points: Point[]): {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
        width: number;
        height: number;
    } {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const point of points) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }

        return {
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX,
            height: maxY - minY,
        };
    }
}

// Create singleton instance
export const curveTool = new CurveTool();

// Register with tool registry
toolRegistry.register(curveTool);
