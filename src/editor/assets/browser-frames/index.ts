/**
 * Browser Frame Assets
 * SVG-based browser frame components for Mac and Windows styles
 * 
 * Requirements: 11.2
 * - WHEN browser frame is enabled THEN the Editor SHALL allow selecting frame style: Mac, Windows, URL on top, URL on bottom
 */

// Mac style frame colors
export const MAC_FRAME_COLORS = {
    background: '#e8e8e8',
    border: '#d0d0d0',
    closeButton: '#ff5f57',
    minimizeButton: '#febc2e',
    maximizeButton: '#28c840',
    buttonBorder: 'rgba(0, 0, 0, 0.1)',
    urlBarBackground: '#ffffff',
    urlBarBorder: '#d0d0d0',
    textColor: '#333333',
    secureIconColor: '#28c840',
};

// Windows style frame colors
export const WINDOWS_FRAME_COLORS = {
    background: '#f0f0f0',
    border: '#d0d0d0',
    closeButton: '#e81123',
    closeButtonHover: '#f1707a',
    minimizeButton: '#333333',
    maximizeButton: '#333333',
    buttonBackground: 'transparent',
    urlBarBackground: '#ffffff',
    urlBarBorder: '#d0d0d0',
    textColor: '#333333',
    secureIconColor: '#28c840',
};

// Frame dimensions
export const FRAME_DIMENSIONS = {
    mac: {
        headerHeight: 38,
        buttonSize: 12,
        buttonSpacing: 8,
        buttonMarginLeft: 12,
        urlBarHeight: 28,
        urlBarMargin: 8,
        borderRadius: 8,
    },
    windows: {
        headerHeight: 32,
        buttonWidth: 46,
        buttonHeight: 32,
        urlBarHeight: 28,
        urlBarMargin: 8,
        borderRadius: 0,
    },
};

/**
 * Generate Mac-style browser frame header SVG
 */
export function generateMacFrameHeader(width: number, showUrl: boolean, url?: string, showDate?: boolean): string {
    const { headerHeight, buttonSize, buttonSpacing, buttonMarginLeft, urlBarHeight, urlBarMargin, borderRadius } = FRAME_DIMENSIONS.mac;
    const totalHeight = headerHeight + (showUrl ? urlBarHeight + urlBarMargin * 2 : 0);

    const buttonY = (headerHeight - buttonSize) / 2;
    const closeX = buttonMarginLeft;
    const minimizeX = closeX + buttonSize + buttonSpacing;
    const maximizeX = minimizeX + buttonSize + buttonSpacing;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}">`;

    // Background
    svg += `<rect x="0" y="0" width="${width}" height="${totalHeight}" fill="${MAC_FRAME_COLORS.background}" rx="${borderRadius}" ry="${borderRadius}"/>`;

    // Bottom border (no radius at bottom)
    svg += `<rect x="0" y="${totalHeight - 1}" width="${width}" height="1" fill="${MAC_FRAME_COLORS.border}"/>`;

    // Traffic light buttons
    svg += `<circle cx="${closeX + buttonSize / 2}" cy="${buttonY + buttonSize / 2}" r="${buttonSize / 2}" fill="${MAC_FRAME_COLORS.closeButton}" stroke="${MAC_FRAME_COLORS.buttonBorder}" stroke-width="0.5"/>`;
    svg += `<circle cx="${minimizeX + buttonSize / 2}" cy="${buttonY + buttonSize / 2}" r="${buttonSize / 2}" fill="${MAC_FRAME_COLORS.minimizeButton}" stroke="${MAC_FRAME_COLORS.buttonBorder}" stroke-width="0.5"/>`;
    svg += `<circle cx="${maximizeX + buttonSize / 2}" cy="${buttonY + buttonSize / 2}" r="${buttonSize / 2}" fill="${MAC_FRAME_COLORS.maximizeButton}" stroke="${MAC_FRAME_COLORS.buttonBorder}" stroke-width="0.5"/>`;

    // URL bar (if enabled)
    if (showUrl) {
        const urlBarY = headerHeight + urlBarMargin;
        const urlBarWidth = width - urlBarMargin * 2;

        svg += `<rect x="${urlBarMargin}" y="${urlBarY}" width="${urlBarWidth}" height="${urlBarHeight}" fill="${MAC_FRAME_COLORS.urlBarBackground}" rx="6" ry="6" stroke="${MAC_FRAME_COLORS.urlBarBorder}" stroke-width="1"/>`;

        // Lock icon
        svg += `<g transform="translate(${urlBarMargin + 10}, ${urlBarY + 6})">`;
        svg += `<path d="M8 1a2 2 0 0 0-2 2v2H5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H9V3a1 1 0 0 1 2 0v1h1V3a2 2 0 0 0-2-2H8zm0 1a1 1 0 0 1 1 1v2H7V3a1 1 0 0 1 1-1z" fill="${MAC_FRAME_COLORS.secureIconColor}" transform="scale(1.2)"/>`;
        svg += `</g>`;

        // URL text
        const displayUrl = url || 'https://example.com';
        const truncatedUrl = displayUrl.length > 50 ? displayUrl.substring(0, 50) + '...' : displayUrl;
        svg += `<text x="${urlBarMargin + 35}" y="${urlBarY + urlBarHeight / 2 + 4}" font-family="Arial, sans-serif" font-size="12" fill="${MAC_FRAME_COLORS.textColor}">${escapeXml(truncatedUrl)}</text>`;

        // Date (if enabled)
        if (showDate) {
            const dateStr = new Date().toLocaleDateString();
            svg += `<text x="${width - urlBarMargin - 10}" y="${urlBarY + urlBarHeight / 2 + 4}" font-family="Arial, sans-serif" font-size="11" fill="#888888" text-anchor="end">${escapeXml(dateStr)}</text>`;
        }
    }

    svg += `</svg>`;
    return svg;
}

/**
 * Generate Windows-style browser frame header SVG
 */
export function generateWindowsFrameHeader(width: number, showUrl: boolean, url?: string, showDate?: boolean): string {
    const { headerHeight, buttonWidth, buttonHeight, urlBarHeight, urlBarMargin, borderRadius } = FRAME_DIMENSIONS.windows;
    const totalHeight = headerHeight + (showUrl ? urlBarHeight + urlBarMargin * 2 : 0);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}">`;

    // Background
    svg += `<rect x="0" y="0" width="${width}" height="${totalHeight}" fill="${WINDOWS_FRAME_COLORS.background}" rx="${borderRadius}" ry="${borderRadius}"/>`;

    // Bottom border
    svg += `<rect x="0" y="${totalHeight - 1}" width="${width}" height="1" fill="${WINDOWS_FRAME_COLORS.border}"/>`;

    // Window control buttons (right side)
    const closeX = width - buttonWidth;
    const maximizeX = closeX - buttonWidth;
    const minimizeX = maximizeX - buttonWidth;

    // Minimize button
    svg += `<g transform="translate(${minimizeX}, 0)">`;
    svg += `<rect width="${buttonWidth}" height="${buttonHeight}" fill="transparent"/>`;
    svg += `<line x1="${buttonWidth / 2 - 5}" y1="${buttonHeight / 2}" x2="${buttonWidth / 2 + 5}" y2="${buttonHeight / 2}" stroke="${WINDOWS_FRAME_COLORS.minimizeButton}" stroke-width="1"/>`;
    svg += `</g>`;

    // Maximize button
    svg += `<g transform="translate(${maximizeX}, 0)">`;
    svg += `<rect width="${buttonWidth}" height="${buttonHeight}" fill="transparent"/>`;
    svg += `<rect x="${buttonWidth / 2 - 5}" y="${buttonHeight / 2 - 5}" width="10" height="10" fill="none" stroke="${WINDOWS_FRAME_COLORS.maximizeButton}" stroke-width="1"/>`;
    svg += `</g>`;

    // Close button
    svg += `<g transform="translate(${closeX}, 0)">`;
    svg += `<rect width="${buttonWidth}" height="${buttonHeight}" fill="transparent"/>`;
    svg += `<line x1="${buttonWidth / 2 - 5}" y1="${buttonHeight / 2 - 5}" x2="${buttonWidth / 2 + 5}" y2="${buttonHeight / 2 + 5}" stroke="${WINDOWS_FRAME_COLORS.closeButton}" stroke-width="1"/>`;
    svg += `<line x1="${buttonWidth / 2 + 5}" y1="${buttonHeight / 2 - 5}" x2="${buttonWidth / 2 - 5}" y2="${buttonHeight / 2 + 5}" stroke="${WINDOWS_FRAME_COLORS.closeButton}" stroke-width="1"/>`;
    svg += `</g>`;

    // URL bar (if enabled)
    if (showUrl) {
        const urlBarY = headerHeight + urlBarMargin;
        const urlBarWidth = width - urlBarMargin * 2;

        svg += `<rect x="${urlBarMargin}" y="${urlBarY}" width="${urlBarWidth}" height="${urlBarHeight}" fill="${WINDOWS_FRAME_COLORS.urlBarBackground}" rx="4" ry="4" stroke="${WINDOWS_FRAME_COLORS.urlBarBorder}" stroke-width="1"/>`;

        // Lock icon
        svg += `<g transform="translate(${urlBarMargin + 10}, ${urlBarY + 6})">`;
        svg += `<path d="M8 1a2 2 0 0 0-2 2v2H5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H9V3a1 1 0 0 1 2 0v1h1V3a2 2 0 0 0-2-2H8zm0 1a1 1 0 0 1 1 1v2H7V3a1 1 0 0 1 1-1z" fill="${WINDOWS_FRAME_COLORS.secureIconColor}" transform="scale(1.2)"/>`;
        svg += `</g>`;

        // URL text
        const displayUrl = url || 'https://example.com';
        const truncatedUrl = displayUrl.length > 50 ? displayUrl.substring(0, 50) + '...' : displayUrl;
        svg += `<text x="${urlBarMargin + 35}" y="${urlBarY + urlBarHeight / 2 + 4}" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="${WINDOWS_FRAME_COLORS.textColor}">${escapeXml(truncatedUrl)}</text>`;

        // Date (if enabled)
        if (showDate) {
            const dateStr = new Date().toLocaleDateString();
            svg += `<text x="${width - urlBarMargin - 10}" y="${urlBarY + urlBarHeight / 2 + 4}" font-family="Segoe UI, Arial, sans-serif" font-size="11" fill="#888888" text-anchor="end">${escapeXml(dateStr)}</text>`;
        }
    }

    svg += `</svg>`;
    return svg;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Get frame header height based on style and options
 */
export function getFrameHeaderHeight(style: 'mac' | 'windows', showUrl: boolean): number {
    const dims = style === 'mac' ? FRAME_DIMENSIONS.mac : FRAME_DIMENSIONS.windows;
    const baseHeight = dims.headerHeight;
    const urlBarHeight = style === 'mac' ? FRAME_DIMENSIONS.mac.urlBarHeight : FRAME_DIMENSIONS.windows.urlBarHeight;
    const urlBarMargin = style === 'mac' ? FRAME_DIMENSIONS.mac.urlBarMargin : FRAME_DIMENSIONS.windows.urlBarMargin;

    return baseHeight + (showUrl ? urlBarHeight + urlBarMargin * 2 : 0);
}

/**
 * Browser frame style type
 */
export type BrowserFrameStyle = 'mac' | 'windows' | 'url_top' | 'url_bottom';

/**
 * Browser frame configuration for rendering
 */
export interface BrowserFrameRenderConfig {
    style: BrowserFrameStyle;
    includeUrl: boolean;
    includeDate: boolean;
    url?: string;
}

/**
 * Generate browser frame SVG based on configuration
 */
export function generateBrowserFrame(
    width: number,
    config: BrowserFrameRenderConfig
): string {
    const { style, includeUrl, includeDate, url } = config;

    // Determine base style (mac or windows)
    const baseStyle = style === 'url_top' || style === 'url_bottom' ? 'mac' : style;

    // For url_top and url_bottom, always show URL bar
    const showUrl = style === 'url_top' || style === 'url_bottom' || includeUrl;

    if (baseStyle === 'mac') {
        return generateMacFrameHeader(width, showUrl, url, includeDate);
    } else {
        return generateWindowsFrameHeader(width, showUrl, url, includeDate);
    }
}
