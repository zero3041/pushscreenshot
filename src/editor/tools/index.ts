/**
 * Tool Registry System
 * 
 * Provides a modular tool system where each tool is an independent module.
 * Uses the Tool Registry Pattern for dynamic tool registration.
 * 
 * Requirements: 2.1, 2.2
 */

import * as fabric from 'fabric';
import type { Point, ToolSettings as SharedToolSettings } from '../../types';
import type { ToolType, ToolSettings, Annotation, AnnotationStyle, Transform } from '../types/editor';

// ============================================================================
// Base Tool Interface
// ============================================================================

/**
 * Mouse event data passed to tool handlers
 */
export interface ToolMouseEvent {
    /** Current pointer position on canvas */
    point: Point;
    /** Original browser event */
    originalEvent: MouseEvent | TouchEvent;
    /** Fabric.js canvas instance */
    canvas: fabric.Canvas;
}

/**
 * Tool state during drawing operations
 */
export interface ToolState {
    /** Whether the tool is currently drawing */
    isDrawing: boolean;
    /** Starting point of the drawing operation */
    startPoint: Point | null;
    /** All points collected during drawing (for freehand tools) */
    points: Point[];
    /** Preview object displayed while drawing */
    previewObject: fabric.FabricObject | null;
}

/**
 * Result of completing a drawing operation
 */
export interface DrawResult {
    /** The created annotation */
    annotation: Annotation;
    /** The Fabric.js object to add to canvas */
    fabricObject: fabric.FabricObject;
}

/**
 * Base interface for all drawing tools
 */
export interface BaseTool {
    /** Unique tool type identifier */
    readonly type: ToolType;

    /** Human-readable tool name */
    readonly name: string;

    /** Tool cursor style */
    readonly cursor: string;

    /**
     * Called when mouse/touch is pressed down
     * @returns Preview object to display, or null
     */
    onMouseDown(event: ToolMouseEvent, settings: ToolSettings, state: ToolState): fabric.FabricObject | null;

    /**
     * Called when mouse/touch moves during drawing
     * Updates the preview object
     */
    onMouseMove(event: ToolMouseEvent, settings: ToolSettings, state: ToolState): void;

    /**
     * Called when mouse/touch is released
     * @returns The completed annotation and fabric object, or null if cancelled
     */
    onMouseUp(event: ToolMouseEvent, settings: ToolSettings, state: ToolState): DrawResult | null;

    /**
     * Create a Fabric.js object from an existing annotation
     * Used when loading annotations from storage
     */
    createFabricObject(annotation: Annotation, settings: ToolSettings): fabric.FabricObject | null;
}

// ============================================================================
// Tool Registry
// ============================================================================

/**
 * Registry for managing drawing tools
 */
class ToolRegistry {
    private tools: Map<ToolType, BaseTool> = new Map();

    /**
     * Register a tool
     */
    register(tool: BaseTool): void {
        this.tools.set(tool.type, tool);
    }

    /**
     * Get a tool by type
     */
    get(type: ToolType): BaseTool | undefined {
        return this.tools.get(type);
    }

    /**
     * Check if a tool is registered
     */
    has(type: ToolType): boolean {
        return this.tools.has(type);
    }

    /**
     * Get all registered tools
     */
    getAll(): BaseTool[] {
        return Array.from(this.tools.values());
    }

    /**
     * Get all registered tool types
     */
    getTypes(): ToolType[] {
        return Array.from(this.tools.keys());
    }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique annotation ID
 */
export function generateAnnotationId(): string {
    return crypto.randomUUID();
}

/**
 * Create default annotation style from tool settings
 */
export function createAnnotationStyle(settings: ToolSettings): AnnotationStyle {
    return {
        color: settings.color,
        strokeWidth: settings.strokeWidth,
        opacity: settings.opacity,
    };
}

/**
 * Create default transform at a position
 */
export function createTransform(x: number, y: number): Transform {
    return {
        x,
        y,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
    };
}

/**
 * Get common Fabric.js object options from tool settings
 */
export function getCommonFabricOptions(settings: ToolSettings): Partial<fabric.FabricObjectProps> {
    return {
        stroke: settings.color,
        strokeWidth: settings.strokeWidth,
        fill: 'transparent',
        opacity: settings.opacity,
        selectable: true,
        evented: true,
    };
}

/**
 * Calculate rectangle bounds from two points
 */
export function calculateRectBounds(start: Point, end: Point): {
    left: number;
    top: number;
    width: number;
    height: number;
} {
    return {
        left: Math.min(start.x, end.x),
        top: Math.min(start.y, end.y),
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y),
    };
}

/**
 * Check if a drawing has meaningful size (not just a click)
 */
export function hasMinimumSize(start: Point, end: Point, minSize: number = 5): boolean {
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);
    return width > minSize || height > minSize;
}

/**
 * Convert shared ToolSettings to editor ToolSettings
 */
export function toEditorToolSettings(settings: SharedToolSettings): ToolSettings {
    return {
        color: settings.color,
        strokeWidth: settings.strokeWidth,
        fontSize: settings.fontSize,
        fontFamily: 'Arial',
        backgroundColor: 'transparent',
        hasShadow: false,
        opacity: 1,
    };
}

// ============================================================================
// Tool Imports (for self-registration)
// ============================================================================

// Import all tools to trigger their self-registration with the registry
// Shape tools
export { rectangleTool } from './RectangleTool';
export { ellipseTool } from './EllipseTool';
export { curveTool } from './CurveTool';
export { highlightTool } from './HighlightTool';

// Arrow and line tools
export { bigHeadArrowTool } from './BigHeadArrowTool';
export { lineArrowTool } from './LineArrowTool';
export { bezierArrowTool } from './BezierArrowTool';
export { lineTool } from './LineTool';

// Text tools
export { textTool } from './TextTool';
export { calloutTool } from './CalloutTool';

// Sequence tool
export { sequenceTool, sequenceCounter, restartSequence, getCurrentSequenceNumber } from './SequenceTool';

// Sticker tool
export { stickerTool, setSelectedSticker, getSelectedSticker } from './StickerTool';

// Image tool
export {
    imageTool,
    setSelectedImage,
    getSelectedImage,
    clearSelectedImage,
    openImagePicker,
    loadImageFromFile,
    calculateFitDimensions,
} from './ImageTool';

// Blur tool
export {
    blurTool,
    getBlurPixelSize,
    setBlurPixelSize,
    applyPixelation,
    applyBlurAnnotation,
    DEFAULT_BLUR_PIXEL_SIZE,
    MIN_BLUR_PIXEL_SIZE,
    MAX_BLUR_PIXEL_SIZE,
    BLUR_PIXEL_SIZES,
} from './BlurTool';

// Resize tool
export {
    resizeImage,
    calculateResizeDimensions,
    calculateProportionalHeight,
    calculateProportionalWidth,
    clampResizeDimension,
    validateResizeDimensions,
    getAspectRatio,
    aspectRatiosEqual,
    MIN_RESIZE_DIMENSION,
    MAX_RESIZE_DIMENSION,
} from './ResizeTool';
export type { ResizeConfig, ResizeResult } from './ResizeTool';

// Crop tool
export {
    cropImage,
    validateCropSelection,
    normalizeCropSelection,
    clampCropSelection,
    roundCropSelection,
    calculateCropSelection,
    hasMinimumCropSize,
    formatCropDimensions,
    MIN_CROP_DIMENSION,
} from './CropTool';
export type { CropSelection, CropConfig, CropResult } from './CropTool';

// ============================================================================
// Exports
// ============================================================================

export type { ToolType, ToolSettings, Annotation };
