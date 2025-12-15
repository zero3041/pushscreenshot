/**
 * Download service for saving screenshots and videos
 * Requirements: 5.1, 5.2 - Download to default folder with timestamp filename
 */

import { generateScreenshotFilename } from '../utils/filename';

/**
 * Download result interface
 */
export interface DownloadResult {
    success: boolean;
    downloadId?: number;
    error?: string;
}

/**
 * Download options interface
 */
export interface DownloadOptions {
    filename?: string;
    saveAs?: boolean;
}

/**
 * Download an image from a data URL using chrome.downloads API
 * @param dataUrl - Base64 data URL of the image
 * @param options - Optional download options
 * @returns Promise resolving to DownloadResult
 */
export async function downloadImage(
    dataUrl: string,
    options: DownloadOptions = {}
): Promise<DownloadResult> {
    try {
        // Validate data URL
        if (!dataUrl || !dataUrl.startsWith('data:image/')) {
            return {
                success: false,
                error: 'Invalid image data URL',
            };
        }

        // Generate filename with timestamp if not provided
        const filename = options.filename || generateScreenshotFilename(new Date());

        // Use chrome.downloads API if available (in extension context)
        if (typeof chrome !== 'undefined' && chrome.downloads) {
            return await downloadWithChromeAPI(dataUrl, filename, options.saveAs);
        }

        // Fallback for non-extension context (e.g., testing)
        return downloadWithAnchor(dataUrl, filename);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: `Download failed: ${errorMessage}`,
        };
    }
}

/**
 * Download using chrome.downloads API
 * @param dataUrl - Base64 data URL
 * @param filename - Filename to save as
 * @param saveAs - Whether to show save dialog
 * @returns Promise resolving to DownloadResult
 */
async function downloadWithChromeAPI(
    dataUrl: string,
    filename: string,
    saveAs: boolean = false
): Promise<DownloadResult> {
    return new Promise((resolve) => {
        chrome.downloads.download(
            {
                url: dataUrl,
                filename: filename,
                saveAs: saveAs,
            },
            (downloadId) => {
                if (chrome.runtime.lastError) {
                    resolve({
                        success: false,
                        error: chrome.runtime.lastError.message || 'Download failed',
                    });
                } else if (downloadId === undefined) {
                    resolve({
                        success: false,
                        error: 'Download was cancelled or failed',
                    });
                } else {
                    resolve({
                        success: true,
                        downloadId: downloadId,
                    });
                }
            }
        );
    });
}

/**
 * Fallback download using anchor element
 * Used when chrome.downloads API is not available
 * @param dataUrl - Base64 data URL
 * @param filename - Filename to save as
 * @returns DownloadResult
 */
function downloadWithAnchor(dataUrl: string, filename: string): DownloadResult {
    try {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return {
            success: true,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: `Fallback download failed: ${errorMessage}`,
        };
    }
}

/**
 * Download a video file
 * @param blob - Video blob data
 * @param format - Video format ('webm' or 'mp4')
 * @param options - Optional download options
 * @returns Promise resolving to DownloadResult
 */
export async function downloadVideo(
    blob: Blob,
    format: 'webm' | 'mp4' = 'webm',
    options: DownloadOptions = {}
): Promise<DownloadResult> {
    try {
        // Generate filename with timestamp if not provided
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = options.filename || `recording_${timestamp}.${format}`;

        // Create object URL from blob
        const url = URL.createObjectURL(blob);

        // Use chrome.downloads API if available
        if (typeof chrome !== 'undefined' && chrome.downloads) {
            const result = await downloadWithChromeAPI(url, filename, options.saveAs);
            // Clean up object URL after download starts
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            return result;
        }

        // Fallback for non-extension context
        const result = downloadWithAnchor(url, filename);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: `Video download failed: ${errorMessage}`,
        };
    }
}
