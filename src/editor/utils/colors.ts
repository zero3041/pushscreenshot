/**
 * Color Utilities
 * Functions for parsing and formatting colors
 */

export interface RGBAColor {
    r: number;
    g: number;
    b: number;
    a: number;
}

/**
 * Parse a hex color string to RGBA components
 * Supports formats: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
 */
export function parseHexColor(hex: string): RGBAColor | null {
    // Remove # prefix if present
    const cleanHex = hex.replace(/^#/, '');

    let r: number, g: number, b: number, a: number = 255;

    if (cleanHex.length === 3) {
        // #RGB format
        r = parseInt(cleanHex[0] + cleanHex[0], 16);
        g = parseInt(cleanHex[1] + cleanHex[1], 16);
        b = parseInt(cleanHex[2] + cleanHex[2], 16);
    } else if (cleanHex.length === 4) {
        // #RGBA format
        r = parseInt(cleanHex[0] + cleanHex[0], 16);
        g = parseInt(cleanHex[1] + cleanHex[1], 16);
        b = parseInt(cleanHex[2] + cleanHex[2], 16);
        a = parseInt(cleanHex[3] + cleanHex[3], 16);
    } else if (cleanHex.length === 6) {
        // #RRGGBB format
        r = parseInt(cleanHex.substring(0, 2), 16);
        g = parseInt(cleanHex.substring(2, 4), 16);
        b = parseInt(cleanHex.substring(4, 6), 16);
    } else if (cleanHex.length === 8) {
        // #RRGGBBAA format
        r = parseInt(cleanHex.substring(0, 2), 16);
        g = parseInt(cleanHex.substring(2, 4), 16);
        b = parseInt(cleanHex.substring(4, 6), 16);
        a = parseInt(cleanHex.substring(6, 8), 16);
    } else {
        return null;
    }

    // Validate parsed values
    if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
        return null;
    }

    return { r, g, b, a };
}


/**
 * Parse an RGBA color string to components
 * Format: rgba(r, g, b, a) where a is 0-1
 */
export function parseRgbaColor(rgba: string): RGBAColor | null {
    const match = rgba.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i);

    if (!match) {
        return null;
    }

    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    const a = match[4] !== undefined ? Math.round(parseFloat(match[4]) * 255) : 255;

    // Validate ranges
    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255 || a < 0 || a > 255) {
        return null;
    }

    return { r, g, b, a };
}

/**
 * Parse any color string (hex or rgba) to RGBA components
 */
export function parseColor(color: string): RGBAColor | null {
    const trimmed = color.trim();

    if (trimmed.startsWith('#')) {
        return parseHexColor(trimmed);
    }

    if (trimmed.toLowerCase().startsWith('rgb')) {
        return parseRgbaColor(trimmed);
    }

    return null;
}

/**
 * Format RGBA components to hex string
 * Returns #RRGGBB if alpha is 255, otherwise #RRGGBBAA
 */
export function formatHexColor(color: RGBAColor): string {
    const r = Math.max(0, Math.min(255, Math.round(color.r)));
    const g = Math.max(0, Math.min(255, Math.round(color.g)));
    const b = Math.max(0, Math.min(255, Math.round(color.b)));
    const a = Math.max(0, Math.min(255, Math.round(color.a)));

    const hex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();

    if (a === 255) {
        return `#${hex(r)}${hex(g)}${hex(b)}`;
    }

    return `#${hex(r)}${hex(g)}${hex(b)}${hex(a)}`;
}

/**
 * Format RGBA components to rgba() string
 */
export function formatRgbaColor(color: RGBAColor): string {
    const r = Math.max(0, Math.min(255, Math.round(color.r)));
    const g = Math.max(0, Math.min(255, Math.round(color.g)));
    const b = Math.max(0, Math.min(255, Math.round(color.b)));
    const a = Math.max(0, Math.min(1, color.a / 255));

    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Convert hex color to rgba string
 */
export function hexToRgba(hex: string): string | null {
    const color = parseHexColor(hex);
    if (!color) return null;
    return formatRgbaColor(color);
}

/**
 * Convert rgba string to hex
 */
export function rgbaToHex(rgba: string): string | null {
    const color = parseRgbaColor(rgba);
    if (!color) return null;
    return formatHexColor(color);
}

/**
 * Check if a color string is valid
 */
export function isValidColor(color: string): boolean {
    return parseColor(color) !== null;
}

/**
 * Compare two colors for equality (ignoring format differences)
 */
export function colorsEqual(color1: string, color2: string): boolean {
    const c1 = parseColor(color1);
    const c2 = parseColor(color2);

    if (!c1 || !c2) return false;

    return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b && c1.a === c2.a;
}
