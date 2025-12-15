// Message passing utilities for PushScreenshot extension
// Provides type-safe wrappers for chrome.runtime messaging

import type {
    MessageType,
    CaptureResult,
    UploadResult,
    HistoryItem,
    AreaRect,
} from '../types';

/**
 * Response types for different message actions
 */
export interface RecordingResult {
    success: boolean;
    videoDataUrl?: string;
    duration?: number;
    audioIncluded?: boolean;
    error?: string;
}

export interface RecordingStatus {
    isRecording: boolean;
    isPaused: boolean;
    recordingTime: number;
    recordingType: 'tab' | 'desktop' | 'camera' | null;
}

export interface DownloadResult {
    success: boolean;
    downloadId?: number;
    error?: string;
}

/**
 * Send a message to the background service worker
 * @param message - The message to send
 * @returns Promise resolving to the response
 */
export async function sendMessage<T>(message: MessageType | Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response as T);
            }
        });
    });
}

/**
 * Send a message to a specific tab's content script
 * @param tabId - The tab ID to send the message to
 * @param message - The message to send
 * @returns Promise resolving to the response
 */
export async function sendMessageToTab<T>(
    tabId: number,
    message: Record<string, unknown>
): Promise<T> {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response as T);
            }
        });
    });
}

/**
 * Send a message to the active tab's content script
 * @param message - The message to send
 * @returns Promise resolving to the response
 */
export async function sendMessageToActiveTab<T>(
    message: Record<string, unknown>
): Promise<T> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
        throw new Error('No active tab found');
    }
    return sendMessageToTab<T>(tab.id, message);
}

// ============================================
// Capture API
// ============================================

/**
 * Capture the visible area of the current tab
 */
export async function captureVisible(): Promise<CaptureResult> {
    return sendMessage<CaptureResult>({ action: 'captureVisible' });
}

/**
 * Capture the full page (scrolling capture)
 */
export async function captureFullPage(): Promise<CaptureResult> {
    return sendMessage<CaptureResult>({ action: 'captureFullPage' });
}

/**
 * Capture a selected area
 * @param area - The area coordinates to capture
 */
export async function captureArea(area: AreaRect): Promise<CaptureResult> {
    return sendMessage<CaptureResult>({ action: 'captureArea', area });
}

/**
 * Start area selection in the content script
 */
export async function startAreaSelection(): Promise<{ success: boolean }> {
    return sendMessageToActiveTab<{ success: boolean }>({ action: 'startAreaSelection' });
}

// ============================================
// Upload API
// ============================================

/**
 * Upload an image to ImgBB
 * @param imageData - Base64 image data URL
 */
export async function uploadToImgBB(imageData: string): Promise<UploadResult> {
    return sendMessage<UploadResult>({ action: 'uploadToImgBB', imageData });
}

// ============================================
// History API
// ============================================

/**
 * Get upload history
 */
export async function getHistory(): Promise<HistoryItem[]> {
    return sendMessage<HistoryItem[]>({ action: 'getHistory' });
}

/**
 * Clear upload history
 */
export async function clearHistory(): Promise<{ success: boolean }> {
    return sendMessage<{ success: boolean }>({ action: 'clearHistory' });
}

// ============================================
// Recording API
// ============================================

/**
 * Start recording
 * @param type - The type of recording (tab, desktop, camera)
 * @param audio - Whether to include audio
 */
export async function startRecording(
    type: 'tab' | 'desktop' | 'camera',
    audio: boolean
): Promise<RecordingResult> {
    return sendMessage<RecordingResult>({ action: 'startRecording', type, audio });
}

/**
 * Stop recording
 */
export async function stopRecording(): Promise<RecordingResult> {
    return sendMessage<RecordingResult>({ action: 'stopRecording' });
}

/**
 * Pause recording
 */
export async function pauseRecording(): Promise<RecordingStatus> {
    return sendMessage<RecordingStatus>({ action: 'pauseRecording' });
}

/**
 * Resume recording
 */
export async function resumeRecording(): Promise<RecordingStatus> {
    return sendMessage<RecordingStatus>({ action: 'resumeRecording' });
}

/**
 * Get current recording status
 */
export async function getRecordingStatus(): Promise<RecordingStatus> {
    return sendMessage<RecordingStatus>({ action: 'getRecordingStatus' });
}

// ============================================
// Download API
// ============================================

/**
 * Download an image
 * @param imageData - Base64 image data URL
 * @param filename - Optional filename
 * @param saveAs - Whether to show save dialog
 */
export async function downloadImage(
    imageData: string,
    filename?: string,
    saveAs?: boolean
): Promise<DownloadResult> {
    return sendMessage<DownloadResult>({
        action: 'downloadImage',
        imageData,
        filename,
        saveAs,
    });
}

/**
 * Download a video
 * @param videoData - Base64 video data URL
 * @param filename - Optional filename
 */
export async function downloadVideo(
    videoData: string,
    filename?: string
): Promise<DownloadResult> {
    return sendMessage<DownloadResult>({
        action: 'downloadVideo',
        videoData,
        filename,
    });
}

/**
 * Copy image to clipboard
 * @param imageData - Base64 image data URL
 */
export async function copyImageToClipboard(
    imageData: string
): Promise<{ success: boolean; error?: string }> {
    return sendMessage<{ success: boolean; error?: string }>({
        action: 'copyImageToClipboard',
        imageData,
    });
}

// ============================================
// Editor API
// ============================================

/**
 * Open the editor page
 * @param imageDataUrl - Optional image data URL to edit
 */
export async function openEditor(imageDataUrl?: string): Promise<{ success: boolean }> {
    return sendMessage<{ success: boolean }>({
        action: 'openEditor',
        imageDataUrl,
    });
}

// ============================================
// Content Script Messages
// ============================================

/**
 * Show recording indicator in content script
 */
export async function showRecordingIndicator(): Promise<{ success: boolean }> {
    return sendMessageToActiveTab<{ success: boolean }>({ action: 'startRecordingIndicator' });
}

/**
 * Hide recording indicator in content script
 */
export async function hideRecordingIndicator(): Promise<{ success: boolean }> {
    return sendMessageToActiveTab<{ success: boolean }>({ action: 'stopRecordingIndicator' });
}

/**
 * Get recording time from content script indicator
 */
export async function getRecordingTime(): Promise<{ time: number }> {
    return sendMessageToActiveTab<{ time: number }>({ action: 'getRecordingTime' });
}
