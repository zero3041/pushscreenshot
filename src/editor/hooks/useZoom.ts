/**
 * useZoom Hook - Zoom Management for Editor Canvas
 * 
 * Implements zoom in/out functionality with fixed step increments.
 * Zoom level is clamped to valid range (25% - 400%).
 * 
 * Requirements: 16.1, 16.2
 * - WHEN a user clicks "Zoom In" THEN the Editor SHALL increase canvas zoom level
 * - WHEN a user clicks "Zoom Out" THEN the Editor SHALL decrease canvas zoom level
 * 
 * Property 26: Zoom changes by fixed step
 * For any zoom level Z, zoom in SHALL result in Z + step and zoom out SHALL result in Z - step
 * (clamped to valid range).
 */

import { useState, useCallback, useMemo } from 'react';
import { ZOOM_CONSTRAINTS } from '../types/editor';

/**
 * Result returned by the useZoom hook
 */
export interface UseZoomResult {
    /** Current zoom level (1.0 = 100%) */
    zoom: number;
    /** Current zoom as percentage (100 = 100%) */
    zoomPercentage: number;
    /** Zoom in by one step */
    zoomIn: () => void;
    /** Zoom out by one step */
    zoomOut: () => void;
    /** Set zoom to a specific level */
    setZoom: (level: number) => void;
    /** Reset zoom to 100% */
    resetZoom: () => void;
    /** Whether zoom in is available (not at max) */
    canZoomIn: boolean;
    /** Whether zoom out is available (not at min) */
    canZoomOut: boolean;
    /** Minimum zoom level */
    minZoom: number;
    /** Maximum zoom level */
    maxZoom: number;
    /** Zoom step size */
    zoomStep: number;
}

/**
 * Clamps a zoom value to the valid range.
 * 
 * @param value - The zoom value to clamp
 * @param min - Minimum allowed zoom
 * @param max - Maximum allowed zoom
 * @returns The clamped zoom value
 */
export function clampZoom(value: number, min: number = ZOOM_CONSTRAINTS.min, max: number = ZOOM_CONSTRAINTS.max): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Custom hook for managing zoom level with fixed step increments.
 * 
 * @param initialZoom - Initial zoom level (default: 1.0 = 100%)
 * @returns Zoom management functions and current state
 * 
 * @example
 * ```tsx
 * const { zoom, zoomPercentage, zoomIn, zoomOut, canZoomIn, canZoomOut } = useZoom();
 * 
 * // Zoom in
 * if (canZoomIn) zoomIn();
 * 
 * // Zoom out
 * if (canZoomOut) zoomOut();
 * 
 * // Display current zoom
 * console.log(`Current zoom: ${zoomPercentage}%`);
 * ```
 */
export function useZoom(initialZoom: number = 1.0): UseZoomResult {
    const { min, max, step } = ZOOM_CONSTRAINTS;

    // Clamp initial zoom to valid range
    const [zoom, setZoomState] = useState<number>(() => clampZoom(initialZoom, min, max));

    /**
     * Zoom in by one step.
     * Increases zoom level by the fixed step amount, clamped to max.
     */
    const zoomIn = useCallback(() => {
        setZoomState(currentZoom => {
            const newZoom = currentZoom + step;
            return clampZoom(newZoom, min, max);
        });
    }, [min, max, step]);

    /**
     * Zoom out by one step.
     * Decreases zoom level by the fixed step amount, clamped to min.
     */
    const zoomOut = useCallback(() => {
        setZoomState(currentZoom => {
            const newZoom = currentZoom - step;
            return clampZoom(newZoom, min, max);
        });
    }, [min, max, step]);

    /**
     * Set zoom to a specific level.
     * The value is clamped to the valid range.
     */
    const setZoom = useCallback((level: number) => {
        setZoomState(clampZoom(level, min, max));
    }, [min, max]);

    /**
     * Reset zoom to 100%.
     */
    const resetZoom = useCallback(() => {
        setZoomState(1.0);
    }, []);

    /**
     * Current zoom as percentage (e.g., 100 for 100%)
     */
    const zoomPercentage = useMemo(() => Math.round(zoom * 100), [zoom]);

    /**
     * Whether zoom in is available (not at max).
     * Uses a small epsilon for floating point comparison.
     */
    const canZoomIn = useMemo(() => zoom < max - 0.001, [zoom, max]);

    /**
     * Whether zoom out is available (not at min).
     * Uses a small epsilon for floating point comparison.
     */
    const canZoomOut = useMemo(() => zoom > min + 0.001, [zoom, min]);

    return {
        zoom,
        zoomPercentage,
        zoomIn,
        zoomOut,
        setZoom,
        resetZoom,
        canZoomIn,
        canZoomOut,
        minZoom: min,
        maxZoom: max,
        zoomStep: step,
    };
}

export default useZoom;
