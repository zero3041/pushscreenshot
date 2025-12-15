// ImgBB API client
import type { ImgBBResponse, UploadResult } from '../types';

/**
 * ImgBB API endpoint
 */
const IMGBB_API_URL = 'https://api.imgbb.com/1/upload';

/**
 * Error types for ImgBB upload failures
 */
export type ImgBBErrorType =
    | 'INVALID_API_KEY'
    | 'NETWORK_ERROR'
    | 'FILE_TOO_LARGE'
    | 'RATE_LIMITED'
    | 'UNKNOWN_ERROR';

/**
 * Error messages for user display
 */
export const ERROR_MESSAGES: Record<ImgBBErrorType, string> = {
    INVALID_API_KEY: 'Invalid API key. Please check your settings.',
    NETWORK_ERROR: 'Network error. Please check your connection and retry.',
    FILE_TOO_LARGE: 'Image is too large. Maximum size is 32MB.',
    RATE_LIMITED: 'Too many uploads. Please wait a moment and try again.',
    UNKNOWN_ERROR: 'Failed to upload image. Please try again.',
};

/**
 * Upload options for ImgBB API
 */
export interface UploadOptions {
    name?: string;
    expiration?: number; // seconds until image expires (60-15552000)
}

/**
 * Extracted URLs from ImgBB response
 */
export interface ExtractedUrls {
    directUrl: string;
    viewerUrl: string;
    thumbnailUrl: string;
    deleteUrl: string;
}

/**
 * Classify error based on response status and error message
 */
export function classifyError(status: number, errorMessage?: string): ImgBBErrorType {
    // Check for rate limiting (HTTP 429 or specific error message)
    if (status === 429 || errorMessage?.toLowerCase().includes('rate limit')) {
        return 'RATE_LIMITED';
    }

    // Check for invalid API key (HTTP 400 with specific message or 401/403)
    if (status === 401 || status === 403) {
        return 'INVALID_API_KEY';
    }
    if (status === 400 && errorMessage?.toLowerCase().includes('key')) {
        return 'INVALID_API_KEY';
    }

    // Check for file too large (HTTP 413 or specific error message)
    if (status === 413 || errorMessage?.toLowerCase().includes('too large') ||
        errorMessage?.toLowerCase().includes('size')) {
        return 'FILE_TOO_LARGE';
    }

    // Network errors typically don't have a status code (status 0)
    if (status === 0) {
        return 'NETWORK_ERROR';
    }

    return 'UNKNOWN_ERROR';
}

/**
 * Extract all URL formats from ImgBB response
 */
export function extractUrls(response: ImgBBResponse): ExtractedUrls {
    const { data } = response;
    return {
        directUrl: data.url,
        viewerUrl: data.url_viewer,
        thumbnailUrl: data.thumb?.url || data.display_url,
        deleteUrl: data.delete_url,
    };
}

/**
 * Strip base64 data URL prefix if present
 * @param imageData - Base64 image data, optionally with data URL prefix
 * @returns Pure base64 string without prefix
 */
function stripDataUrlPrefix(imageData: string): string {
    const base64Prefix = 'base64,';
    const prefixIndex = imageData.indexOf(base64Prefix);
    if (prefixIndex !== -1) {
        return imageData.substring(prefixIndex + base64Prefix.length);
    }
    return imageData;
}

/**
 * Upload an image to ImgBB
 * @param imageBase64 - Base64 encoded image data (with or without data URL prefix)
 * @param apiKey - ImgBB API key
 * @param options - Optional upload options (name, expiration)
 * @returns Promise resolving to upload result
 */
export async function uploadToImgBB(
    imageBase64: string,
    apiKey: string,
    options?: UploadOptions
): Promise<UploadResult> {
    // Strip data URL prefix if present
    const pureBase64 = stripDataUrlPrefix(imageBase64);

    // Build form data
    const formData = new FormData();
    formData.append('key', apiKey);
    formData.append('image', pureBase64);

    if (options?.name) {
        formData.append('name', options.name);
    }
    if (options?.expiration) {
        formData.append('expiration', options.expiration.toString());
    }

    try {
        const response = await fetch(IMGBB_API_URL, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (response.ok && data.success) {
            return {
                success: true,
                data: data as ImgBBResponse,
            };
        }

        // Handle error response
        const errorType = classifyError(response.status, data.error?.message);
        return {
            success: false,
            error: ERROR_MESSAGES[errorType],
        };
    } catch (error) {
        // Network error or other fetch failure
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Check if it's a network error
        if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            return {
                success: false,
                error: ERROR_MESSAGES.NETWORK_ERROR,
            };
        }

        return {
            success: false,
            error: ERROR_MESSAGES.UNKNOWN_ERROR,
        };
    }
}
