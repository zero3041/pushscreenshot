// Screenshot capture logic
import type { CaptureResult, AreaRect } from '../types';

/**
 * Error types for capture operations
 */
export const CaptureErrorType = {
    TAB_NOT_ACCESSIBLE: 'TAB_NOT_ACCESSIBLE',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    CAPTURE_FAILED: 'CAPTURE_FAILED',
    SCROLL_TIMEOUT: 'SCROLL_TIMEOUT',
    NO_ACTIVE_TAB: 'NO_ACTIVE_TAB',
} as const;

export type CaptureErrorTypeValue = typeof CaptureErrorType[keyof typeof CaptureErrorType];

/**
 * Error messages for capture operations
 */
export const CaptureErrorMessages: Record<CaptureErrorTypeValue, string> = {
    [CaptureErrorType.TAB_NOT_ACCESSIBLE]: 'Cannot capture this page. Try a regular web page.',
    [CaptureErrorType.PERMISSION_DENIED]: 'Screen capture permission was denied.',
    [CaptureErrorType.CAPTURE_FAILED]: 'Failed to capture screenshot. Please try again.',
    [CaptureErrorType.SCROLL_TIMEOUT]: 'Page took too long to scroll. Try visible area capture.',
    [CaptureErrorType.NO_ACTIVE_TAB]: 'No active tab found. Please open a web page.',
};

/**
 * Check if a URL is capturable (not a chrome:// or other restricted URL)
 */
function isCapturableUrl(url: string | undefined): boolean {
    if (!url) return false;
    const restrictedPrefixes = [
        'chrome://',
        'chrome-extension://',
        'edge://',
        'about:',
        'file://',
        'devtools://',
    ];
    return !restrictedPrefixes.some(prefix => url.startsWith(prefix));
}

/**
 * Get the error type from a Chrome runtime error
 */
function getErrorType(error: string | undefined): CaptureErrorTypeValue {
    if (!error) return CaptureErrorType.CAPTURE_FAILED;

    const lowerError = error.toLowerCase();
    if (lowerError.includes('permission') || lowerError.includes('denied')) {
        return CaptureErrorType.PERMISSION_DENIED;
    }
    if (lowerError.includes('cannot access') || lowerError.includes('not accessible')) {
        return CaptureErrorType.TAB_NOT_ACCESSIBLE;
    }
    return CaptureErrorType.CAPTURE_FAILED;
}


/**
 * Capture the visible area of the current tab
 * Uses chrome.tabs.captureVisibleTab API
 * @returns Promise resolving to CaptureResult with base64 image data URL
 */
export async function captureVisibleArea(): Promise<CaptureResult> {
    try {
        // Get the current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab || !tab.id) {
            return {
                success: false,
                error: CaptureErrorMessages[CaptureErrorType.NO_ACTIVE_TAB],
            };
        }

        // Check if the URL is capturable
        if (!isCapturableUrl(tab.url)) {
            return {
                success: false,
                error: CaptureErrorMessages[CaptureErrorType.TAB_NOT_ACCESSIBLE],
            };
        }

        // Capture the visible tab
        const imageDataUrl = await chrome.tabs.captureVisibleTab(
            tab.windowId,
            { format: 'png' }
        );

        // Validate the result
        if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
            return {
                success: false,
                error: CaptureErrorMessages[CaptureErrorType.CAPTURE_FAILED],
            };
        }

        return {
            success: true,
            imageDataUrl,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorType = getErrorType(errorMessage);

        return {
            success: false,
            error: CaptureErrorMessages[errorType],
        };
    }
}

/**
 * Capture a selected area of the current tab
 * This requires coordination with the content script
 * @param area - The area rectangle to capture
 * @returns Promise resolving to CaptureResult
 */
export async function captureArea(_area: AreaRect): Promise<CaptureResult> {
    try {
        // First capture the visible area
        const fullCapture = await captureVisibleArea();

        if (!fullCapture.success || !fullCapture.imageDataUrl) {
            return fullCapture;
        }

        // The actual cropping will be done in the content script or editor
        // For now, return the full capture with area info
        // The cropping logic will be implemented in the content script phase
        return {
            success: true,
            imageDataUrl: fullCapture.imageDataUrl,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: CaptureErrorMessages[getErrorType(errorMessage)],
        };
    }
}

/**
 * Check if content script is already injected
 * @param tabId - The tab ID to check
 */
async function isContentScriptInjected(tabId: number): Promise<boolean> {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
            if (chrome.runtime.lastError) {
                resolve(false);
            } else {
                resolve(response?.pong === true);
            }
        });
    });
}

/**
 * Capture the full page (scrolling capture)
 * This requires coordination with the content script
 * @returns Promise resolving to CaptureResult
 */
export async function captureFullPage(): Promise<CaptureResult> {
    try {
        // Get the current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab || !tab.id) {
            return {
                success: false,
                error: CaptureErrorMessages[CaptureErrorType.NO_ACTIVE_TAB],
            };
        }

        // Check if the URL is capturable
        if (!isCapturableUrl(tab.url)) {
            return {
                success: false,
                error: CaptureErrorMessages[CaptureErrorType.TAB_NOT_ACCESSIBLE],
            };
        }

        const tabId = tab.id;

        // Check if content script is already injected
        const isInjected = await isContentScriptInjected(tabId);

        if (!isInjected) {
            // Try to trigger content script injection by reloading the tab
            // Or inform user to refresh the page
            return {
                success: false,
                error: 'Please refresh the page and try again. Content script not loaded.',
            };
        }

        // Send message to content script to perform full page capture
        // Content script will handle scrolling and stitching
        return new Promise((resolve) => {
            chrome.tabs.sendMessage(
                tabId,
                { action: 'startFullPageCapture' },
                (response) => {
                    if (chrome.runtime.lastError) {
                        // Content script not loaded or error
                        resolve({
                            success: false,
                            error: chrome.runtime.lastError.message || CaptureErrorMessages[CaptureErrorType.CAPTURE_FAILED],
                        });
                        return;
                    }

                    if (response?.success && response.imageDataUrl) {
                        resolve({
                            success: true,
                            imageDataUrl: response.imageDataUrl,
                        });
                    } else {
                        resolve({
                            success: false,
                            error: response?.error || CaptureErrorMessages[CaptureErrorType.CAPTURE_FAILED],
                        });
                    }
                }
            );
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: CaptureErrorMessages[getErrorType(errorMessage)],
        };
    }
}
