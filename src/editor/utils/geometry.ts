/**
 * Geometry Utilities
 * Functions for point and shape calculations
 */

import type { Point, Transform } from '../types/editor';

/**
 * Calculate distance between two points
 */
export function distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate midpoint between two points
 */
export function midpoint(p1: Point, p2: Point): Point {
    return {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
    };
}

/**
 * Calculate angle between two points in radians
 */
export function angle(p1: Point, p2: Point): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

/**
 * Calculate angle between two points in degrees
 */
export function angleDegrees(p1: Point, p2: Point): number {
    return angle(p1, p2) * (180 / Math.PI);
}

/**
 * Rotate a point around an origin
 */
export function rotatePoint(point: Point, origin: Point, angleRad: number): Point {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;

    return {
        x: origin.x + dx * cos - dy * sin,
        y: origin.y + dx * sin + dy * cos,
    };
}

/**
 * Scale a point relative to an origin
 */
export function scalePoint(point: Point, origin: Point, scaleX: number, scaleY: number): Point {
    return {
        x: origin.x + (point.x - origin.x) * scaleX,
        y: origin.y + (point.y - origin.y) * scaleY,
    };
}


/**
 * Apply a transform to a point
 */
export function applyTransform(point: Point, transform: Transform): Point {
    // First translate to origin
    let p = { x: point.x - transform.x, y: point.y - transform.y };

    // Apply scale
    p = { x: p.x * transform.scaleX, y: p.y * transform.scaleY };

    // Apply rotation
    const angleRad = transform.rotation * (Math.PI / 180);
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    p = {
        x: p.x * cos - p.y * sin,
        y: p.x * sin + p.y * cos,
    };

    // Translate back
    return {
        x: p.x + transform.x,
        y: p.y + transform.y,
    };
}

/**
 * Create a default transform at a position
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
 * Calculate bounding box from a list of points
 */
export function getBoundingBox(points: Point[]): { x: number; y: number; width: number; height: number } | null {
    if (points.length === 0) return null;

    let minX = points[0].x;
    let minY = points[0].y;
    let maxX = points[0].x;
    let maxY = points[0].y;

    for (const point of points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    }

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
    };
}

/**
 * Check if a point is inside a rectangle
 */
export function pointInRect(
    point: Point,
    rect: { x: number; y: number; width: number; height: number }
): boolean {
    return (
        point.x >= rect.x &&
        point.x <= rect.x + rect.width &&
        point.y >= rect.y &&
        point.y <= rect.y + rect.height
    );
}

/**
 * Check if a point is inside an ellipse
 */
export function pointInEllipse(
    point: Point,
    center: Point,
    radiusX: number,
    radiusY: number
): boolean {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY) <= 1;
}

/**
 * Calculate aspect ratio
 */
export function aspectRatio(width: number, height: number): number {
    if (height === 0) return 0;
    return width / height;
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
export function maintainAspectRatio(
    originalWidth: number,
    originalHeight: number,
    newWidth?: number,
    newHeight?: number
): { width: number; height: number } {
    const ratio = aspectRatio(originalWidth, originalHeight);

    if (newWidth !== undefined && newHeight === undefined) {
        return {
            width: newWidth,
            height: Math.round(newWidth / ratio),
        };
    }

    if (newHeight !== undefined && newWidth === undefined) {
        return {
            width: Math.round(newHeight * ratio),
            height: newHeight,
        };
    }

    // If both provided, use width as primary
    if (newWidth !== undefined) {
        return {
            width: newWidth,
            height: Math.round(newWidth / ratio),
        };
    }

    return { width: originalWidth, height: originalHeight };
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

/**
 * Linear interpolation between two points
 */
export function lerpPoint(p1: Point, p2: Point, t: number): Point {
    return {
        x: lerp(p1.x, p2.x, t),
        y: lerp(p1.y, p2.y, t),
    };
}

/**
 * Calculate a point on a quadratic bezier curve
 */
export function quadraticBezier(p0: Point, p1: Point, p2: Point, t: number): Point {
    const mt = 1 - t;
    return {
        x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
        y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    };
}

/**
 * Calculate a point on a cubic bezier curve
 */
export function cubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    return {
        x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
        y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
    };
}
