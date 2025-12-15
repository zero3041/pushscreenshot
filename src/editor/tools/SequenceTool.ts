/**
 * SequenceTool - Add numbered circle markers for step-by-step instructions
 * 
 * Features:
 * - Numbered circle markers
 * - Auto-increment counter
 * - Restart sequence functionality
 * - Configurable marker color
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 * - WHEN a user selects the "List" tool THEN the Editor SHALL allow placing numbered circle markers
 * - WHEN placing markers THEN the Editor SHALL auto-increment the number for each new marker
 * - WHEN a user clicks "Restart Sequence" THEN the Editor SHALL reset the counter to 1
 * - WHEN placing markers THEN the Editor SHALL allow configuring marker color
 * 
 * Property 10: Sequence markers auto-increment
 * - For any sequence of n markers placed without restart, the markers SHALL have numbers 1, 2, 3, ..., n
 * 
 * Property 11: Sequence restart resets counter
 * - For any state with sequence counter > 1, after restart, the next marker placed SHALL have number 1
 */

import * as fabric from 'fabric';
import type { BaseTool, ToolMouseEvent, ToolState, DrawResult } from './registry';
import { toolRegistry } from './registry';
import { generateAnnotationId, createAnnotationStyle, createTransform } from './helpers';
import type { ToolSettings, SequenceMarkerAnnotation } from '../types/editor';

/**
 * Default radius for sequence markers
 */
const DEFAULT_MARKER_RADIUS = 16;

/**
 * Font size relative to marker radius
 */
const FONT_SIZE_RATIO = 0.75;

/**
 * Sequence counter manager
 * Tracks the current sequence number across marker placements
 */
class SequenceCounter {
    private counter: number = 1;

    /**
     * Get the current counter value
     */
    getCurrent(): number {
        return this.counter;
    }

    /**
     * Get the next counter value and increment
     */
    getNextAndIncrement(): number {
        const current = this.counter;
        this.counter++;
        return current;
    }

    /**
     * Reset the counter to 1
     */
    restart(): void {
        this.counter = 1;
    }

    /**
     * Set the counter to a specific value
     */
    setCounter(value: number): void {
        this.counter = Math.max(1, value);
    }
}

// Singleton counter instance
export const sequenceCounter = new SequenceCounter();

/**
 * Sequence marker drawing tool
 * Creates numbered circle markers with auto-incrementing numbers
 */
export class SequenceTool implements BaseTool {
    readonly type = 'list' as const;
    readonly name = 'Sequence List';
    readonly cursor = 'crosshair';

    /**
     * Start creating a sequence marker
     * Creates a preview marker at the click position
     */
    onMouseDown(
        event: ToolMouseEvent,
        settings: ToolSettings,
        _state: ToolState
    ): fabric.Group | null {
        const { point } = event;
        const currentNumber = sequenceCounter.getCurrent();

        // Create preview marker
        const preview = this.createMarkerGroup(
            currentNumber,
            point.x,
            point.y,
            DEFAULT_MARKER_RADIUS,
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
     * Complete the sequence marker
     * Returns the annotation and fabric object
     */
    onMouseUp(
        event: ToolMouseEvent,
        settings: ToolSettings,
        _state: ToolState
    ): DrawResult | null {
        const { point } = event;

        // Get the next number and increment the counter
        const markerNumber = sequenceCounter.getNextAndIncrement();

        // Create annotation
        const annotation: SequenceMarkerAnnotation = {
            id: generateAnnotationId(),
            type: 'list',
            style: createAnnotationStyle(settings),
            transform: createTransform(point.x, point.y),
            locked: false,
            number: markerNumber,
            radius: DEFAULT_MARKER_RADIUS,
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
        annotation: SequenceMarkerAnnotation | unknown,
        settings: ToolSettings
    ): fabric.Group | null {
        if (!this.isSequenceMarkerAnnotation(annotation)) {
            return null;
        }

        return this.createFabricObjectFromAnnotation(annotation, settings);
    }

    /**
     * Type guard to check if annotation is a SequenceMarkerAnnotation
     */
    private isSequenceMarkerAnnotation(annotation: unknown): annotation is SequenceMarkerAnnotation {
        if (!annotation || typeof annotation !== 'object') return false;
        const a = annotation as Record<string, unknown>;
        return a.type === 'list' &&
            typeof a.number === 'number' &&
            typeof a.radius === 'number';
    }

    /**
     * Internal method to create fabric object from typed annotation
     */
    private createFabricObjectFromAnnotation(
        annotation: SequenceMarkerAnnotation,
        _settings: ToolSettings
    ): fabric.Group {
        const { style, transform, number, radius } = annotation;

        return this.createMarkerGroup(
            number,
            transform.x,
            transform.y,
            radius,
            {
                color: style.color,
                strokeWidth: style.strokeWidth,
                opacity: style.opacity,
            } as ToolSettings,
            false, // not preview
            transform.scaleX,
            transform.scaleY,
            transform.rotation
        );
    }

    /**
     * Create a Fabric.js Group containing the circle and number text
     */
    private createMarkerGroup(
        number: number,
        left: number,
        top: number,
        radius: number,
        settings: ToolSettings,
        isPreview: boolean = false,
        scaleX: number = 1,
        scaleY: number = 1,
        angle: number = 0
    ): fabric.Group {
        const { color, opacity } = settings;

        // Create the circle background
        const circle = new fabric.Circle({
            radius,
            fill: color,
            stroke: color,
            strokeWidth: 0,
            originX: 'center',
            originY: 'center',
        });

        // Calculate font size based on radius and number of digits
        const digits = number.toString().length;
        const baseFontSize = radius * FONT_SIZE_RATIO * 2;
        const fontSize = digits > 2 ? baseFontSize * 0.7 : (digits > 1 ? baseFontSize * 0.85 : baseFontSize);

        // Create the number text
        // Use white text for contrast against the colored circle
        const text = new fabric.FabricText(number.toString(), {
            fontSize,
            fill: 'white',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            originX: 'center',
            originY: 'center',
        });

        // Create group with circle and text
        const group = new fabric.Group([circle, text], {
            left,
            top,
            originX: 'center',
            originY: 'center',
            opacity: isPreview ? 0.7 : opacity,
            scaleX,
            scaleY,
            angle,
            selectable: true,
            evented: true,
        });

        return group;
    }
}

// Create singleton instance
export const sequenceTool = new SequenceTool();

// Register with tool registry
toolRegistry.register(sequenceTool);

/**
 * Restart the sequence counter to 1
 * Called when user clicks "Restart Sequence" button
 */
export function restartSequence(): void {
    sequenceCounter.restart();
}

/**
 * Get the current sequence counter value
 */
export function getCurrentSequenceNumber(): number {
    return sequenceCounter.getCurrent();
}
