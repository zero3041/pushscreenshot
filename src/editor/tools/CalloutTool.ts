/**
 * CalloutTool - Create text boxes with pointer arrows
 * 
 * Features:
 * - Text box with configurable font family and size
 * - Pointer arrow with configurable direction (top, bottom, left, right)
 * - Background color support
 * 
 * Requirements: 6.1, 6.2, 6.3
 * - WHEN a user selects the "Callout" tool THEN the Editor SHALL allow creating text boxes with pointer arrows
 * - WHEN creating a callout THEN the Editor SHALL allow configuring font family, font size, and text color
 * - WHEN creating a callout THEN the Editor SHALL allow positioning the pointer arrow direction
 * 
 * Property 9: Callout preserves pointer direction
 * - For any callout annotation with pointer direction D, the stored annotation SHALL have pointerDirection equal to D.
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
} from './index';
import type { ToolSettings, CalloutAnnotation } from '../types/editor';

/**
 * Default text content for new callout annotations
 */
const DEFAULT_CALLOUT_TEXT = 'Callout';

/**
 * Default callout box dimensions
 */
const DEFAULT_BOX_WIDTH = 120;
const DEFAULT_BOX_HEIGHT = 40;

/**
 * Pointer arrow configuration
 */
const POINTER_CONFIG = {
    length: 20,
    width: 16,
};

/**
 * Box styling configuration
 */
const BOX_CONFIG = {
    cornerRadius: 6,
    padding: 8,
    strokeWidth: 2,
};

/**
 * Pointer direction type
 */
export type PointerDirection = 'top' | 'bottom' | 'left' | 'right';

/**
 * Callout drawing tool
 * Creates callout annotations with text boxes and pointer arrows
 */
export class CalloutTool implements BaseTool {
    readonly type = 'callout' as const;
    readonly name = 'Callout';
    readonly cursor = 'crosshair';

    /**
     * Current pointer direction (can be changed via UI)
     */
    private pointerDirection: PointerDirection = 'bottom';

    /**
     * Set the pointer direction for new callouts
     */
    setPointerDirection(direction: PointerDirection): void {
        this.pointerDirection = direction;
    }

    /**
     * Get the current pointer direction
     */
    getPointerDirection(): PointerDirection {
        return this.pointerDirection;
    }

    /**
     * Start creating a callout annotation
     * Creates a preview callout at the click position
     */
    onMouseDown(
        event: ToolMouseEvent,
        settings: ToolSettings,
        _state: ToolState
    ): fabric.Group | null {
        const { point } = event;

        // Create preview callout
        const preview = this.createCalloutGroup(
            DEFAULT_CALLOUT_TEXT,
            point.x,
            point.y,
            DEFAULT_BOX_WIDTH,
            DEFAULT_BOX_HEIGHT,
            this.pointerDirection,
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
     * Complete the callout annotation
     * Returns the annotation and fabric object
     */
    onMouseUp(
        event: ToolMouseEvent,
        settings: ToolSettings,
        _state: ToolState
    ): DrawResult | null {
        const { point } = event;

        // Create annotation
        const annotation: CalloutAnnotation = {
            id: generateAnnotationId(),
            type: 'callout',
            style: createAnnotationStyle(settings),
            transform: createTransform(point.x, point.y),
            locked: false,
            text: DEFAULT_CALLOUT_TEXT,
            fontFamily: settings.fontFamily,
            fontSize: settings.fontSize,
            pointerDirection: this.pointerDirection,
            boxWidth: DEFAULT_BOX_WIDTH,
            boxHeight: DEFAULT_BOX_HEIGHT,
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
        annotation: CalloutAnnotation | unknown,
        settings: ToolSettings
    ): fabric.Group | null {
        if (!this.isCalloutAnnotation(annotation)) {
            return null;
        }

        return this.createFabricObjectFromAnnotation(annotation, settings);
    }

    /**
     * Type guard to check if annotation is a CalloutAnnotation
     */
    private isCalloutAnnotation(annotation: unknown): annotation is CalloutAnnotation {
        if (!annotation || typeof annotation !== 'object') return false;
        const a = annotation as Record<string, unknown>;
        return a.type === 'callout' &&
            typeof a.text === 'string' &&
            typeof a.fontFamily === 'string' &&
            typeof a.fontSize === 'number' &&
            typeof a.pointerDirection === 'string' &&
            typeof a.boxWidth === 'number' &&
            typeof a.boxHeight === 'number';
    }

    /**
     * Internal method to create fabric object from typed annotation
     */
    private createFabricObjectFromAnnotation(
        annotation: CalloutAnnotation,
        _settings: ToolSettings
    ): fabric.Group {
        const { style, transform, text, fontFamily, fontSize, pointerDirection, boxWidth, boxHeight } = annotation;

        return this.createCalloutGroup(
            text,
            transform.x,
            transform.y,
            boxWidth,
            boxHeight,
            pointerDirection,
            {
                color: style.color,
                strokeWidth: style.strokeWidth,
                opacity: style.opacity,
                fontFamily,
                fontSize,
                backgroundColor: style.fill || 'rgba(255, 255, 255, 0.9)',
                hasShadow: false,
            } as ToolSettings,
            false, // not preview
            transform.scaleX,
            transform.scaleY,
            transform.rotation
        );
    }

    /**
     * Create a Fabric.js Group containing the callout box, pointer, and text
     */
    private createCalloutGroup(
        text: string,
        left: number,
        top: number,
        boxWidth: number,
        boxHeight: number,
        pointerDirection: PointerDirection,
        settings: ToolSettings,
        isPreview: boolean = false,
        scaleX: number = 1,
        scaleY: number = 1,
        angle: number = 0
    ): fabric.Group {
        const { color, opacity, fontFamily, fontSize, backgroundColor } = settings;

        // Calculate box position based on pointer direction
        const boxPosition = this.calculateBoxPosition(left, top, boxWidth, boxHeight, pointerDirection);

        // Create rounded rectangle box
        const box = new fabric.Rect({
            left: boxPosition.boxLeft,
            top: boxPosition.boxTop,
            width: boxWidth,
            height: boxHeight,
            fill: backgroundColor === 'transparent' ? 'rgba(255, 255, 255, 0.9)' : backgroundColor,
            stroke: color,
            strokeWidth: BOX_CONFIG.strokeWidth,
            rx: BOX_CONFIG.cornerRadius,
            ry: BOX_CONFIG.cornerRadius,
            selectable: false,
            evented: false,
        });

        // Create pointer arrow
        const pointer = this.createPointer(
            boxPosition.boxLeft,
            boxPosition.boxTop,
            boxWidth,
            boxHeight,
            pointerDirection,
            color,
            backgroundColor === 'transparent' ? 'rgba(255, 255, 255, 0.9)' : backgroundColor
        );

        // Create text
        const textObject = new fabric.FabricText(text, {
            left: boxPosition.boxLeft + BOX_CONFIG.padding,
            top: boxPosition.boxTop + (boxHeight - fontSize) / 2,
            fill: color,
            fontFamily,
            fontSize,
            selectable: false,
            evented: false,
        });

        // Group all elements
        const group = new fabric.Group([box, pointer, textObject], {
            left,
            top,
            opacity: isPreview ? 0.7 : opacity,
            scaleX,
            scaleY,
            angle,
            selectable: true,
            evented: true,
        });

        return group;
    }

    /**
     * Calculate box position based on pointer direction
     * The pointer tip is at (left, top), box is positioned accordingly
     */
    private calculateBoxPosition(
        tipX: number,
        tipY: number,
        boxWidth: number,
        boxHeight: number,
        direction: PointerDirection
    ): { boxLeft: number; boxTop: number } {
        switch (direction) {
            case 'top':
                // Pointer points up, box is below
                return {
                    boxLeft: tipX - boxWidth / 2,
                    boxTop: tipY + POINTER_CONFIG.length,
                };
            case 'bottom':
                // Pointer points down, box is above
                return {
                    boxLeft: tipX - boxWidth / 2,
                    boxTop: tipY - boxHeight - POINTER_CONFIG.length,
                };
            case 'left':
                // Pointer points left, box is to the right
                return {
                    boxLeft: tipX + POINTER_CONFIG.length,
                    boxTop: tipY - boxHeight / 2,
                };
            case 'right':
                // Pointer points right, box is to the left
                return {
                    boxLeft: tipX - boxWidth - POINTER_CONFIG.length,
                    boxTop: tipY - boxHeight / 2,
                };
        }
    }

    /**
     * Create the pointer arrow polygon
     */
    private createPointer(
        boxLeft: number,
        boxTop: number,
        boxWidth: number,
        boxHeight: number,
        direction: PointerDirection,
        strokeColor: string,
        fillColor: string
    ): fabric.Polygon {
        const points = this.calculatePointerPoints(
            boxLeft,
            boxTop,
            boxWidth,
            boxHeight,
            direction
        );

        return new fabric.Polygon(points, {
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth: BOX_CONFIG.strokeWidth,
            selectable: false,
            evented: false,
        });
    }

    /**
     * Calculate the three points of the pointer triangle
     */
    private calculatePointerPoints(
        boxLeft: number,
        boxTop: number,
        boxWidth: number,
        boxHeight: number,
        direction: PointerDirection
    ): { x: number; y: number }[] {
        const halfWidth = POINTER_CONFIG.width / 2;

        switch (direction) {
            case 'top':
                // Pointer points up from top edge of box
                return [
                    { x: boxLeft + boxWidth / 2, y: boxTop - POINTER_CONFIG.length }, // tip
                    { x: boxLeft + boxWidth / 2 - halfWidth, y: boxTop }, // base left
                    { x: boxLeft + boxWidth / 2 + halfWidth, y: boxTop }, // base right
                ];
            case 'bottom':
                // Pointer points down from bottom edge of box
                return [
                    { x: boxLeft + boxWidth / 2, y: boxTop + boxHeight + POINTER_CONFIG.length }, // tip
                    { x: boxLeft + boxWidth / 2 - halfWidth, y: boxTop + boxHeight }, // base left
                    { x: boxLeft + boxWidth / 2 + halfWidth, y: boxTop + boxHeight }, // base right
                ];
            case 'left':
                // Pointer points left from left edge of box
                return [
                    { x: boxLeft - POINTER_CONFIG.length, y: boxTop + boxHeight / 2 }, // tip
                    { x: boxLeft, y: boxTop + boxHeight / 2 - halfWidth }, // base top
                    { x: boxLeft, y: boxTop + boxHeight / 2 + halfWidth }, // base bottom
                ];
            case 'right':
                // Pointer points right from right edge of box
                return [
                    { x: boxLeft + boxWidth + POINTER_CONFIG.length, y: boxTop + boxHeight / 2 }, // tip
                    { x: boxLeft + boxWidth, y: boxTop + boxHeight / 2 - halfWidth }, // base top
                    { x: boxLeft + boxWidth, y: boxTop + boxHeight / 2 + halfWidth }, // base bottom
                ];
        }
    }
}

// Create singleton instance
export const calloutTool = new CalloutTool();

// Register with tool registry
toolRegistry.register(calloutTool);
