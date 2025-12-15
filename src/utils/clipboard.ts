/**
 * Clipboard utilities for copying URLs, text, and images
 * Requirements: 5.4 - Copy image data to system clipboard
 */

/**
 * Copy result interface
 */
export interface CopyResult {
    success: boolean;
    error?: string;
}

/**
 * Copy text to clipboard using the Clipboard API
 * @param text - The text to copy to clipboard
 * @returns Promise resolving to true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (_error) {
        // Fallback for older browsers or when Clipboard API is not available
        return copyToClipboardFallback(text);
    }
}

/**
 * Fallback method for copying text using execCommand
 * @param text - The text to copy
 * @returns true if successful, false otherwise
 */
function copyToClipboardFallback(text: string): boolean {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;

        // Avoid scrolling to bottom
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        return successful;
    } catch (_error) {
        return false;
    }
}

/**
 * Copy a history item's URL to clipboard
 * Copies the uploaded URL if available, otherwise returns false
 * @param url - The URL to copy
 * @returns Promise resolving to true if successful, false otherwise
 */
export async function copyHistoryItemUrl(url: string | undefined): Promise<boolean> {
    if (!url) {
        return false;
    }
    return copyToClipboard(url);
}

/**
 * Copy image data to clipboard
 * Requirements: 5.4 - Copy image data to system clipboard
 * @param imageDataUrl - Base64 data URL of the image
 * @returns Promise resolving to CopyResult
 */
export async function copyImageToClipboard(imageDataUrl: string): Promise<CopyResult> {
    try {
        // Validate image data URL
        if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
            return {
                success: false,
                error: 'Invalid image data URL',
            };
        }

        // Convert data URL to blob
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();

        // Determine the MIME type
        const mimeType = blob.type || 'image/png';

        // Use the Clipboard API to write the image
        // Note: Most browsers only support image/png for clipboard
        if (mimeType === 'image/png') {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'image/png': blob,
                }),
            ]);
        } else {
            // Convert to PNG if not already PNG
            const pngBlob = await convertToPng(imageDataUrl);
            await navigator.clipboard.write([
                new ClipboardItem({
                    'image/png': pngBlob,
                }),
            ]);
        }

        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: `Failed to copy image to clipboard: ${errorMessage}`,
        };
    }
}

/**
 * Convert an image data URL to PNG blob
 * @param imageDataUrl - Base64 data URL of the image
 * @returns Promise resolving to PNG blob
 */
async function convertToPng(imageDataUrl: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to convert to PNG'));
                }
            }, 'image/png');
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageDataUrl;
    });
}

/**
 * Copy image from blob to clipboard
 * @param blob - Image blob
 * @returns Promise resolving to CopyResult
 */
export async function copyBlobToClipboard(blob: Blob): Promise<CopyResult> {
    try {
        // Ensure it's a PNG blob for clipboard compatibility
        if (blob.type !== 'image/png') {
            // Convert to PNG using canvas
            const dataUrl = await blobToDataUrl(blob);
            const pngBlob = await convertToPng(dataUrl);
            await navigator.clipboard.write([
                new ClipboardItem({
                    'image/png': pngBlob,
                }),
            ]);
        } else {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'image/png': blob,
                }),
            ]);
        }

        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: `Failed to copy image to clipboard: ${errorMessage}`,
        };
    }
}

/**
 * Convert blob to data URL
 * @param blob - Blob to convert
 * @returns Promise resolving to data URL string
 */
function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read blob'));
        reader.readAsDataURL(blob);
    });
}
