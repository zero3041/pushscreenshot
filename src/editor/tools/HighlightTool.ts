/**
 * HighlightTool - Semi-transparent highlight stroke tool
 * 
 * Creates highlight strokes with semi-transparency for marking content.
 * 
 * Requirements: 2.4
 * - WHEN a user selects the "Highlight" tool THEN the Editor SHALL allow 
 *   drawing semi-transparent highlight strokes
 * 
 * Property 6: Highlight stroke has semi-transparency
 * - For any highlight annotation, the stroke opacity SHALL be less than 1.0
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
    createTransform,
} from './index';
import type { ToolSettings, PathAnnotation, AnnotationStyle } from '../types/editor';

/**
 * Default highlight opacity (semi-transparent)
 * Property 6: Must be less than 1.0
 */
const HIGHLIGHT_OPACITY = 0.4;

/**
 * Minimum distance between points to record
 */
const MIN_POINT_DISTANCE = 3;

/**
 * Highlight drawing tool
 * Creates semi-transparent highlight strokes
 */
export class HighlightTool implements BaseTool {
    readonly type = 'highlight' as const;
    readonly name = 'Highlight';
    readonly cursor = 'crosshair';

    /**
     * Start drawing a highlight stroke
     * Creates a preview path with semi-transparency
     */
    onMouseDown(
        event: ToolMouseEvent,
        settings: ToolSettings,
        state: ToolState
    ): fabric.Path | null {
        const { point } = event;

        // Initialize points array with starting point
        state.points = [point];

        // Create initial path with highlight styling
        const pathData = this.pointsToPathData([point], settings.strokeWidth);

        const preview = new fabric.Path(pathData, {
            stroke: settings.color,
            strokeWidth: settings.strokeWidth,
            fill: 'transparent',
            opacity: HIGHLIGHT_OPACITY, // Semi-transparent
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
            selectable: false,
            evented: false,
        });

        return preview;
    }

    /**
     * Update the preview highlight as the mouse moves
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
        const pathData = this.pointsToPathData(points, settings.strokeWidth);

        // Remove old preview and create new one
        canvas.remove(previewObject);

        const newPreview = new fabric.Path(pathData, {
            stroke: settings.color,
            strokeWidth: settings.strokeWidth,
            fill: 'transparent',
            opacity: HIGHLIGHT_OPACITY,
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
            selectable: false,
            evented: false,
        });

        canvas.add(newPreview);
        state.previewObject = newPreview;
    }

    /**
     * Complete the highlight drawing
     * Returns the annotation with semi-transparent opacity
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

        // Create annotation style with semi-transparency
        // Property 6: opacity must be less than 1.0
        const style: AnnotationStyle = {
            color: settings.color,
            strokeWidth: settings.strokeWidth,
            opacity: HIGHLIGHT_OPACITY, // Always semi-transparent
        };

        // Create annotation
        const annotation: PathAnnotation = {
            id: generateAnnotationId(),
            type: 'highlight',
            style,
            transform: createTransform(bounds.minX, bounds.minY),
            locked: false,
            points: [...points],
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
        if (!this.isHighlightAnnotation(annotation)) {
            return null;
        }

        return this.createFabricObjectFromAnnotation(annotation, settings);
    }

    /**
     * Type guard to check if annotation is a highlight PathAnnotation
     */
    private isHighlightAnnotation(annotation: unknown): annotation is PathAnnotation {
        if (!annotation || typeof annotation !== 'object') return false;
        const a = annotation as Record<string, unknown>;
        return a.type === 'highlight' && Array.isArray(a.points);
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

        const pathData = this.pointsToPathData(points, style.strokeWidth);

        // Ensure opacity is always semi-transparent (Property 6)
        const opacity = style.opacity < 1.0 ? style.opacity : HIGHLIGHT_OPACITY;

        return new fabric.Path(pathData, {
            left: transform.x,
            top: transform.y,
            stroke: style.color,
            strokeWidth: style.strokeWidth,
            fill: 'transparent',
            opacity, // Semi-transparent
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
     * Creates a smooth path for highlighting
     */
    private pointsToPathData(points: Point[], _strokeWidth: number): string {
        if (points.length === 0) return '';
        if (points.length === 1) {
            const p = points[0];
            return `M ${p.x} ${p.y} L ${p.x + 0.1} ${p.y + 0.1}`;
        }

        // Start at first point
        let path = `M ${points[0].x} ${points[0].y}`;

        if (points.length === 2) {
            path += ` L ${points[1].x} ${points[1].y}`;
            return path;
        }

        // Use quadratic bezier curves for smooth path
        for (let i = 1; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];

            const midX = (current.x + next.x) / 2;
            const midY = (current.y + next.y) / 2;

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

        return { minX, minY, maxX, maxY };
    }
}

// Create singleton instance
export const highlightTool = new HighlightTool();

// Register with tool registry
toolRegistry.register(highlightTool);

/**
 * Get the highlight opacity constant
 * Used for property testing
 */
export function getHighlightOpacity(): number {
    return HIGHLIGHT_OPACITY;
}
