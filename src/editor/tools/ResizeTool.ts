/**
 * ResizeTool - Resize image to specified dimensions
 * 
 * Provides functionality to resize the base image while maintaining
 * aspect ratio when proportional mode is enabled.
 * 
 * Requirements: 1.3
 * - WHEN a user clicks "Resize" in the panel THEN the Editor SHALL 
 *   resize the image to the specified dimensions
 * 
 * Property 1: Proportional resize maintains aspect ratio
 * - For any image with dimensions (W, H) and any new width W', when proportional 
 *   resize is enabled, the new height H' SHALL equal W' × H / W (rounded to nearest integer).
 * 
 * Property 3: Resize produces correct dimensions
 * - For any resize operation with target dimensions (W, H), the resulting image 
 *   SHALL have dimensions exactly (W, H).
 */

/** Minimum allowed dimension */
export const MIN_RESIZE_DIMENSION = 1;

/** Maximum allowed dimension */
export const MAX_RESIZE_DIMENSION = 10000;

/**
 * Resize configuration
 */
export interface ResizeConfig {
    /** Target width in pixels */
    width: number;
    /** Target height in pixels */
    height: number;
    /** Whether to maintain aspect ratio */
    proportional?: boolean;
}

/**
 * Result of a resize operation
 */
export interface ResizeResult {
    /** Resized image as data URL */
    imageData: string;
    /** Final width after resize */
    width: number;
    /** Final height after resize */
    height: number;
}

/**
 * Clamp a dimension value to valid range
 */
export function clampResizeDimension(value: number): number {
    return Math.max(MIN_RESIZE_DIMENSION, Math.min(MAX_RESIZE_DIMENSION, Math.round(value)));
}

/**
 * Calculate proportional height from new width
 * Maintains aspect ratio: newHeight = newWidth * originalHeight / originalWidth
 */
export function calculateProportionalHeight(
    newWidth: number,
    originalWidth: number,
    originalHeight: number
): number {
    if (originalWidth === 0) return originalHeight;
    return Math.round(newWidth * originalHeight / originalWidth);
}

/**
 * Calculate proportional width from new height
 * Maintains aspect ratio: newWidth = newHeight * originalWidth / originalHeight
 */
export function calculateProportionalWidth(
    newHeight: number,
    originalWidth: number,
    originalHeight: number
): number {
    if (originalHeight === 0) return originalWidth;
    return Math.round(newHeight * originalWidth / originalHeight);
}

/**
 * Validate resize dimensions
 * Returns error message if invalid, null if valid
 */
export function validateResizeDimensions(width: number, height: number): string | null {
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
        return 'Invalid dimensions';
    }
    if (width < MIN_RESIZE_DIMENSION || height < MIN_RESIZE_DIMENSION) {
        return `Dimensions must be at least ${MIN_RESIZE_DIMENSION}x${MIN_RESIZE_DIMENSION}`;
    }
    if (width > MAX_RESIZE_DIMENSION || height > MAX_RESIZE_DIMENSION) {
        return `Dimensions cannot exceed ${MAX_RESIZE_DIMENSION}x${MAX_RESIZE_DIMENSION}`;
    }
    return null;
}

/**
 * Resize an image to specified dimensions
 * 
 * @param imageData - Source image as data URL
 * @param config - Resize configuration
 * @returns Promise resolving to resize result
 */
export async function resizeImage(
    imageData: string,
    config: ResizeConfig
): Promise<ResizeResult> {
    const { width, height } = config;

    // Validate dimensions
    const validationError = validateResizeDimensions(width, height);
    if (validationError) {
        throw new Error(validationError);
    }

    // Clamp dimensions
    const targetWidth = clampResizeDimension(width);
    const targetHeight = clampResizeDimension(height);

    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            try {
                // Create canvas with target dimensions
                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                // Enable image smoothing for better quality
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Draw resized image
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                // Export as PNG
                const resizedImageData = canvas.toDataURL('image/png');

                resolve({
                    imageData: resizedImageData,
                    width: targetWidth,
                    height: targetHeight,
                });
            } catch (error) {
                reject(error);
            }
        };

        img.onerror = () => {
            reject(new Error('Failed to load image for resize'));
        };

        img.src = imageData;
    });
}

/**
 * Calculate resize dimensions maintaining aspect ratio
 * 
 * @param originalWidth - Original image width
 * @param originalHeight - Original image height
 * @param targetWidth - Desired width (optional)
 * @param targetHeight - Desired height (optional)
 * @param proportional - Whether to maintain aspect ratio
 * @returns Calculated dimensions
 */
export function calculateResizeDimensions(
    originalWidth: number,
    originalHeight: number,
    targetWidth?: number,
    targetHeight?: number,
    proportional: boolean = true
): { width: number; height: number } {
    // If both dimensions provided and not proportional, use them directly
    if (targetWidth !== undefined && targetHeight !== undefined && !proportional) {
        return {
            width: clampResizeDimension(targetWidth),
            height: clampResizeDimension(targetHeight),
        };
    }

    // If only width provided, calculate height proportionally
    if (targetWidth !== undefined && targetHeight === undefined) {
        const newWidth = clampResizeDimension(targetWidth);
        const newHeight = proportional
            ? clampResizeDimension(calculateProportionalHeight(newWidth, originalWidth, originalHeight))
            : originalHeight;
        return { width: newWidth, height: newHeight };
    }

    // If only height provided, calculate width proportionally
    if (targetHeight !== undefined && targetWidth === undefined) {
        const newHeight = clampResizeDimension(targetHeight);
        const newWidth = proportional
            ? clampResizeDimension(calculateProportionalWidth(newHeight, originalWidth, originalHeight))
            : originalWidth;
        return { width: newWidth, height: newHeight };
    }

    // If both provided and proportional, use width as primary
    if (targetWidth !== undefined && targetHeight !== undefined && proportional) {
        const newWidth = clampResizeDimension(targetWidth);
        const newHeight = clampResizeDimension(calculateProportionalHeight(newWidth, originalWidth, originalHeight));
        return { width: newWidth, height: newHeight };
    }

    // Default: return original dimensions
    return {
        width: originalWidth,
        height: originalHeight,
    };
}

/**
 * Get aspect ratio of dimensions
 */
export function getAspectRatio(width: number, height: number): number {
    if (height === 0) return 0;
    return width / height;
}

/**
 * Check if two aspect ratios are approximately equal
 * Uses a small epsilon for floating point comparison
 */
export function aspectRatiosEqual(ratio1: number, ratio2: number, epsilon: number = 0.001): boolean {
    return Math.abs(ratio1 - ratio2) < epsilon;
}
