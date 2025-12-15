/**
 * CropTool - Crop image to selected area
 * 
 * Provides functionality to select a rectangular area and crop the image
 * to that selection.
 * 
 * Requirements: 1.4, 1.5
 * - WHEN a user clicks the "Crop" button THEN the Editor SHALL enable crop selection mode
 * - WHEN a user completes crop selection THEN the Editor SHALL crop the image to the selected area
 * 
 * Property 2: Crop produces correct dimensions
 * - For any crop selection with area (x, y, width, height), the resulting cropped image 
 *   SHALL have dimensions exactly (width, height).
 */

/** Minimum crop dimension in pixels */
export const MIN_CROP_DIMENSION = 1;

/**
 * Crop selection area
 */
export interface CropSelection {
    /** X coordinate of top-left corner */
    x: number;
    /** Y coordinate of top-left corner */
    y: number;
    /** Width of selection */
    width: number;
    /** Height of selection */
    height: number;
}

/**
 * Crop configuration
 */
export interface CropConfig {
    /** Selection area */
    selection: CropSelection;
}

/**
 * Result of a crop operation
 */
export interface CropResult {
    /** Cropped image as data URL */
    imageData: string;
    /** Final width after crop */
    width: number;
    /** Final height after crop */
    height: number;
}

/**
 * Validate crop selection
 * Returns error message if invalid, null if valid
 */
export function validateCropSelection(
    selection: CropSelection,
    imageWidth: number,
    imageHeight: number
): string | null {
    const { x, y, width, height } = selection;

    // Check for valid numbers
    if (!Number.isFinite(x) || !Number.isFinite(y) ||
        !Number.isFinite(width) || !Number.isFinite(height)) {
        return 'Invalid crop selection values';
    }

    // Check minimum dimensions
    if (width < MIN_CROP_DIMENSION || height < MIN_CROP_DIMENSION) {
        return `Crop area must be at least ${MIN_CROP_DIMENSION}x${MIN_CROP_DIMENSION} pixels`;
    }

    // Check bounds
    if (x < 0 || y < 0) {
        return 'Crop selection cannot start outside image bounds';
    }

    if (x + width > imageWidth || y + height > imageHeight) {
        return 'Crop selection extends beyond image bounds';
    }

    return null;
}

/**
 * Normalize crop selection to ensure positive dimensions
 * Handles cases where user drags from bottom-right to top-left
 */
export function normalizeCropSelection(
    startX: number,
    startY: number,
    endX: number,
    endY: number
): CropSelection {
    return {
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width: Math.abs(endX - startX),
        height: Math.abs(endY - startY),
    };
}

/**
 * Clamp crop selection to image bounds
 */
export function clampCropSelection(
    selection: CropSelection,
    imageWidth: number,
    imageHeight: number
): CropSelection {
    // Clamp starting position
    const x = Math.max(0, Math.min(selection.x, imageWidth - MIN_CROP_DIMENSION));
    const y = Math.max(0, Math.min(selection.y, imageHeight - MIN_CROP_DIMENSION));

    // Clamp dimensions to not exceed image bounds
    const maxWidth = imageWidth - x;
    const maxHeight = imageHeight - y;
    const width = Math.max(MIN_CROP_DIMENSION, Math.min(selection.width, maxWidth));
    const height = Math.max(MIN_CROP_DIMENSION, Math.min(selection.height, maxHeight));

    return { x, y, width, height };
}

/**
 * Round crop selection to integer values
 * Canvas operations require integer pixel coordinates
 */
export function roundCropSelection(selection: CropSelection): CropSelection {
    return {
        x: Math.round(selection.x),
        y: Math.round(selection.y),
        width: Math.round(selection.width),
        height: Math.round(selection.height),
    };
}

/**
 * Crop an image to the specified selection area
 * 
 * @param imageData - Source image as data URL
 * @param config - Crop configuration with selection area
 * @param imageWidth - Original image width (for validation)
 * @param imageHeight - Original image height (for validation)
 * @returns Promise resolving to crop result
 */
export async function cropImage(
    imageData: string,
    config: CropConfig,
    imageWidth: number,
    imageHeight: number
): Promise<CropResult> {
    // Round selection to integers
    const selection = roundCropSelection(config.selection);

    // Validate selection
    const validationError = validateCropSelection(selection, imageWidth, imageHeight);
    if (validationError) {
        throw new Error(validationError);
    }

    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            try {
                // Create canvas with crop dimensions
                const canvas = document.createElement('canvas');
                canvas.width = selection.width;
                canvas.height = selection.height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                // Draw the cropped portion of the image
                // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
                ctx.drawImage(
                    img,
                    selection.x,      // Source X
                    selection.y,      // Source Y
                    selection.width,  // Source width
                    selection.height, // Source height
                    0,                // Destination X
                    0,                // Destination Y
                    selection.width,  // Destination width
                    selection.height  // Destination height
                );

                // Export as PNG
                const croppedImageData = canvas.toDataURL('image/png');

                resolve({
                    imageData: croppedImageData,
                    width: selection.width,
                    height: selection.height,
                });
            } catch (error) {
                reject(error);
            }
        };

        img.onerror = () => {
            reject(new Error('Failed to load image for crop'));
        };

        img.src = imageData;
    });
}

/**
 * Calculate crop selection from two points (start and end of drag)
 */
export function calculateCropSelection(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    imageWidth: number,
    imageHeight: number
): CropSelection {
    // Normalize to handle any drag direction
    const normalized = normalizeCropSelection(startX, startY, endX, endY);

    // Clamp to image bounds
    const clamped = clampCropSelection(normalized, imageWidth, imageHeight);

    // Round to integers
    return roundCropSelection(clamped);
}

/**
 * Check if a crop selection has minimum viable size
 */
export function hasMinimumCropSize(selection: CropSelection, minSize: number = 5): boolean {
    return selection.width >= minSize && selection.height >= minSize;
}

/**
 * Get crop selection dimensions as a formatted string
 */
export function formatCropDimensions(selection: CropSelection): string {
    return `${Math.round(selection.width)} × ${Math.round(selection.height)}`;
}
