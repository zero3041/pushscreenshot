/**
 * TextTool - Add text annotations with advanced styling options
 * 
 * Features:
 * - Font family selection
 * - Font size with +/- controls
 * - Background color support
 * - Shadow effect
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 * - WHEN a user selects the "Text" tool THEN the Editor SHALL display font family selector
 * - WHEN a user selects the "Text" tool THEN the Editor SHALL display font size selector
 * - WHEN a user adds text THEN the Editor SHALL allow setting text background color
 * - WHEN a user adds text THEN the Editor SHALL allow enabling text shadow effect
 * 
 * Property 8: Text annotation preserves all properties
 * - For any text annotation with (text, fontFamily, fontSize, backgroundColor, hasShadow),
 *   the stored annotation SHALL contain all these exact values.
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
import type { ToolSettings, TextAnnotation } from '../types/editor';

/**
 * Default text content for new text annotations
 */
const DEFAULT_TEXT = 'Text';

/**
 * Shadow configuration for text with shadow effect
 */
const TEXT_SHADOW_CONFIG = {
    color: 'rgba(0, 0, 0, 0.5)',
    blur: 4,
    offsetX: 2,
    offsetY: 2,
};

/**
 * Text drawing tool
 * Creates text annotations with configurable font, size, background, and shadow
 */
export class TextTool implements BaseTool {
    readonly type = 'text' as const;
    readonly name = 'Text';
    readonly cursor = 'text';

    /**
     * Start creating a text annotation
     * Creates a preview text at the click position
     */
    onMouseDown(
        event: ToolMouseEvent,
        settings: ToolSettings,
        _state: ToolState
    ): fabric.FabricText | null {
        const { point } = event;

        // Create preview text
        const preview = this.createTextObject(
            DEFAULT_TEXT,
            point.x,
            point.y,
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
     * Complete the text annotation
     * Returns the annotation and fabric object
     */
    onMouseUp(
        event: ToolMouseEvent,
        settings: ToolSettings,
        _state: ToolState
    ): DrawResult | null {
        const { point } = event;

        // Create annotation
        const annotation: TextAnnotation = {
            id: generateAnnotationId(),
            type: 'text',
            style: createAnnotationStyle(settings),
            transform: createTransform(point.x, point.y),
            locked: false,
            text: DEFAULT_TEXT,
            fontFamily: settings.fontFamily,
            fontSize: settings.fontSize,
            backgroundColor: settings.backgroundColor,
            hasShadow: settings.hasShadow,
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
     * Create a Fabric.js Text from an annotation
     * Used when loading existing annotations
     */
    createFabricObject(
        annotation: TextAnnotation | unknown,
        settings: ToolSettings
    ): fabric.FabricText | null {
        if (!this.isTextAnnotation(annotation)) {
            return null;
        }

        return this.createFabricObjectFromAnnotation(annotation, settings);
    }

    /**
     * Type guard to check if annotation is a TextAnnotation
     */
    private isTextAnnotation(annotation: unknown): annotation is TextAnnotation {
        if (!annotation || typeof annotation !== 'object') return false;
        const a = annotation as Record<string, unknown>;
        return a.type === 'text' &&
            typeof a.text === 'string' &&
            typeof a.fontFamily === 'string' &&
            typeof a.fontSize === 'number';
    }

    /**
     * Internal method to create fabric object from typed annotation
     */
    private createFabricObjectFromAnnotation(
        annotation: TextAnnotation,
        _settings: ToolSettings
    ): fabric.FabricText {
        const { style, transform, text, fontFamily, fontSize, backgroundColor, hasShadow } = annotation;

        return this.createTextObject(
            text,
            transform.x,
            transform.y,
            {
                color: style.color,
                strokeWidth: style.strokeWidth,
                opacity: style.opacity,
                fontFamily,
                fontSize,
                backgroundColor,
                hasShadow,
            } as ToolSettings,
            false, // not preview
            transform.scaleX,
            transform.scaleY,
            transform.rotation
        );
    }

    /**
     * Create a Fabric.js Text object with all styling options
     */
    private createTextObject(
        text: string,
        left: number,
        top: number,
        settings: ToolSettings,
        isPreview: boolean = false,
        scaleX: number = 1,
        scaleY: number = 1,
        angle: number = 0
    ): fabric.FabricText {
        const { color, opacity, fontFamily, fontSize, backgroundColor, hasShadow } = settings;

        // Create shadow if enabled
        const shadow = hasShadow
            ? new fabric.Shadow({
                color: TEXT_SHADOW_CONFIG.color,
                blur: TEXT_SHADOW_CONFIG.blur,
                offsetX: TEXT_SHADOW_CONFIG.offsetX,
                offsetY: TEXT_SHADOW_CONFIG.offsetY,
            })
            : undefined;

        const textObject = new fabric.FabricText(text, {
            left,
            top,
            fill: color,
            fontFamily,
            fontSize,
            backgroundColor: backgroundColor === 'transparent' ? '' : backgroundColor,
            opacity: isPreview ? 0.7 : opacity,
            shadow,
            scaleX,
            scaleY,
            angle,
            selectable: true,
            evented: true,
            // Enable text editing on double-click
            editable: true,
        });

        return textObject;
    }
}

// Create singleton instance
export const textTool = new TextTool();

// Register with tool registry
toolRegistry.register(textTool);
