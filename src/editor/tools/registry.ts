/**
 * Tool Registry
 * Manages registration and lookup of drawing tools
 */

import * as fabric from 'fabric';
import type { Point } from '../../types';
import type { ToolType, ToolSettings, Annotation } from '../types/editor';

/**
 * Mouse event data passed to tool handlers
 */
export interface ToolMouseEvent {
    point: Point;
    originalEvent: MouseEvent | TouchEvent;
    canvas: fabric.Canvas;
}

/**
 * Tool state during drawing operations
 */
export interface ToolState {
    isDrawing: boolean;
    startPoint: Point | null;
    points: Point[];
    previewObject: fabric.FabricObject | null;
}

/**
 * Result of completing a drawing operation
 */
export interface DrawResult {
    annotation: Annotation;
    fabricObject: fabric.FabricObject;
}

/**
 * Base interface for all drawing tools
 */
export interface BaseTool {
    readonly type: ToolType;
    readonly name: string;
    readonly cursor: string;
    onMouseDown(event: ToolMouseEvent, settings: ToolSettings, state: ToolState): fabric.FabricObject | null;
    onMouseMove(event: ToolMouseEvent, settings: ToolSettings, state: ToolState): void;
    onMouseUp(event: ToolMouseEvent, settings: ToolSettings, state: ToolState): DrawResult | null;
    createFabricObject(annotation: Annotation, settings: ToolSettings): fabric.FabricObject | null;
}

/**
 * Registry for managing drawing tools
 */
class ToolRegistry {
    private tools: Map<ToolType, BaseTool> = new Map();

    register(tool: BaseTool): void {
        this.tools.set(tool.type, tool);
    }

    get(type: ToolType): BaseTool | undefined {
        return this.tools.get(type);
    }

    has(type: ToolType): boolean {
        return this.tools.has(type);
    }

    getAll(): BaseTool[] {
        return Array.from(this.tools.values());
    }

    getTypes(): ToolType[] {
        return Array.from(this.tools.keys());
    }
}

export const toolRegistry = new ToolRegistry();
