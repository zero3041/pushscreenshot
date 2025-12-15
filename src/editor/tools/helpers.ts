/**
 * Tool Helper Functions
 * Shared utilities for drawing tools
 */

import * as fabric from 'fabric';
import type { Point, ToolSettings as SharedToolSettings } from '../../types';
import type { ToolType, ToolSettings, AnnotationStyle, Transform } from '../types/editor';

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

export type { ToolType, ToolSettings };
