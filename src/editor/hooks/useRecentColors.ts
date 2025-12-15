/**
 * useRecentColors Hook
 * Tracks last 5 used colors with localStorage persistence
 * Requirements: 13.3
 */

import { useState, useCallback, useEffect } from 'react';
import { MAX_RECENT_COLORS } from '../types/editor';
import { colorsEqual } from '../utils/colors';

const STORAGE_KEY = 'pushscreenshot_recent_colors';

/**
 * Load recent colors from localStorage
 */
function loadRecentColors(): string[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                return parsed.slice(0, MAX_RECENT_COLORS);
            }
        }
    } catch {
        // Ignore parse errors
    }
    return [];
}

/**
 * Save recent colors to localStorage
 */
function saveRecentColors(colors: string[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
    } catch {
        // Ignore storage errors (e.g., quota exceeded)
    }
}

export interface UseRecentColorsReturn {
    /** List of recent colors, ordered from most recent to least recent */
    recentColors: string[];
    /** Add a color to the recent colors list */
    addRecentColor: (color: string) => void;
    /** Clear all recent colors */
    clearRecentColors: () => void;
}

/**
 * Hook to manage recent colors with localStorage persistence
 * 
 * - Maintains max 5 colors (MAX_RECENT_COLORS)
 * - Most recently used color is first in the list
 * - Persists to localStorage
 * - Deduplicates colors (moves existing color to front)
 */
export function useRecentColors(): UseRecentColorsReturn {
    const [recentColors, setRecentColors] = useState<string[]>(() => loadRecentColors());

    // Persist to localStorage when colors change
    useEffect(() => {
        saveRecentColors(recentColors);
    }, [recentColors]);

    const addRecentColor = useCallback((color: string) => {
        setRecentColors(prevColors => {
            // Remove the color if it already exists (to avoid duplicates)
            const filteredColors = prevColors.filter(c => !colorsEqual(c, color));

            // Add the new color at the beginning (most recent)
            const newColors = [color, ...filteredColors];

            // Limit to MAX_RECENT_COLORS
            return newColors.slice(0, MAX_RECENT_COLORS);
        });
    }, []);

    const clearRecentColors = useCallback(() => {
        setRecentColors([]);
    }, []);

    return {
        recentColors,
        addRecentColor,
        clearRecentColors,
    };
}

export default useRecentColors;
