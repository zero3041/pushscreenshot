// Message handlers for background service worker
import type { MessageType, CaptureResult, UploadResult, HistoryItem } from '../types';
import { captureVisibleArea, captureArea, captureFullPage } from './capture';
import { recorder, type RecordingResult, type RecordingStatus } from './recorder';
import { storage } from '../services/storage';
import { uploadToImgBB } from '../services/imgbb';
import { downloadImage, type DownloadResult } from '../services/download';

/**
 * Response type for message handlers
 */
export type MessageResponse = CaptureResult | UploadResult | DownloadResult | RecordingResult | RecordingStatus | HistoryItem[] | { success: boolean; error?: string };

/**
 * Extended message type to include content script messages
 */
type ExtendedMessage = MessageType
    | { action: 'openEditor'; imageDataUrl?: string }
    | { action: 'downloadImage'; imageData: string; filename?: string; saveAs?: boolean }
    | { action: 'copyImageToClipboard'; imageData: string }
    | { action: 'getRecordingStatus' }
    | { action: 'downloadVideo'; videoData: string; filename?: string }
    | { action: string };

/**
 * Handle incoming messages from popup, content script, or options page
 * @param message - The message to handle
 * @param sender - The sender of the message
 * @returns Promise resolving to the response
 */
export async function handleMessage(
    message: ExtendedMessage,
    _sender: chrome.runtime.MessageSender
): Promise<MessageResponse> {
    switch (message.action) {
        case 'captureVisible':
            return await captureVisibleArea();

        case 'captureFullPage':
            return await captureFullPage();

        case 'captureArea':
            return await captureArea((message as { action: 'captureArea'; area: import('../types').AreaRect }).area);

        case 'uploadToImgBB':
            return await handleUpload((message as { action: 'uploadToImgBB'; imageData: string }).imageData);

        case 'getHistory':
            return await getHistory();

        case 'clearHistory':
            return await clearHistory();

        case 'openEditor':
            // Open the editor page
            await chrome.tabs.create({
                url: chrome.runtime.getURL('src/editor/index.html'),
            });
            return { success: true };

        case 'downloadImage':
            return await handleDownloadImage(message as { action: 'downloadImage'; imageData: string; filename?: string; saveAs?: boolean });

        case 'copyImageToClipboard':
            return await handleCopyImageToClipboard((message as { action: 'copyImageToClipboard'; imageData: string }).imageData);

        case 'startRecording':
            return await handleStartRecording(message as { action: 'startRecording'; type: 'tab' | 'desktop' | 'camera'; audio: boolean });

        case 'stopRecording':
            return await handleStopRecording();

        case 'pauseRecording':
            return recorder.pause();

        case 'resumeRecording':
            return recorder.resume();

        case 'getRecordingStatus':
            return recorder.getStatus();

        case 'downloadVideo':
            return await handleDownloadVideo(message as { action: 'downloadVideo'; videoData: string; filename?: string });

        case 'startFullPageCaptureFromPopup':
            // Handle full page capture initiated from popup
            // This runs after popup closes, so we can safely capture
            return await handleFullPageCaptureFromPopup();

        case 'captureDesktopScreenshot':
            // Handle desktop screenshot capture
            return await handleDesktopScreenshot();

        default:
            return { success: false, error: 'Unknown action' };
    }
}

/**
 * Handle full page capture initiated from popup
 * Sends message to content script and opens editor when done
 */
async function handleFullPageCaptureFromPopup(): Promise<{ success: boolean; error?: string }> {
    try {
        // Small delay to ensure popup is fully closed
        await new Promise(resolve => setTimeout(resolve, 100));

        const result = await captureFullPage();

        if (result.success && result.imageDataUrl) {
            // Store the captured image
            await chrome.storage.local.set({ tempCapture: result.imageDataUrl });

            // Open the editor page
            await chrome.tabs.create({
                url: chrome.runtime.getURL('src/editor/index.html'),
            });

            return { success: true };
        } else {
            return { success: false, error: result.error || 'Failed to capture full page' };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, error: errorMessage };
    }
}

/**
 * Handle desktop screenshot capture using chrome.desktopCapture API
 * Shows native screen picker dialog and captures the selected screen/window
 */
async function handleDesktopScreenshot(): Promise<{ success: boolean; error?: string }> {
    try {
        // Get the current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab || !tab.id) {
            return { success: false, error: 'No active tab found' };
        }

        const tabId = tab.id;

        // Small delay to ensure popup is fully closed
        await new Promise(resolve => setTimeout(resolve, 200));

        // Use chrome.desktopCapture to show the native screen picker
        return new Promise((resolve) => {
            chrome.desktopCapture.chooseDesktopMedia(
                ['screen', 'window'],
                tab,
                async (streamId) => {
                    if (!streamId) {
                        // User cancelled the picker
                        resolve({ success: false, error: 'Screen capture was cancelled' });
                        return;
                    }

                    try {
                        // Send streamId to content script to capture the screen
                        chrome.tabs.sendMessage(
                            tabId,
                            { action: 'captureDesktopWithStreamId', streamId },
                            async (response) => {
                                if (chrome.runtime.lastError) {
                                    resolve({
                                        success: false,
                                        error: chrome.runtime.lastError.message || 'Failed to communicate with content script',
                                    });
                                    return;
                                }

                                if (response?.success && response.imageDataUrl) {
                                    // Store the captured image
                                    await chrome.storage.local.set({ tempCapture: response.imageDataUrl });

                                    // Open the editor page
                                    await chrome.tabs.create({
                                        url: chrome.runtime.getURL('src/editor/index.html'),
                                    });

                                    resolve({ success: true });
                                } else {
                                    resolve({
                                        success: false,
                                        error: response?.error || 'Failed to capture desktop',
                                    });
                                }
                            }
                        );
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        resolve({ success: false, error: errorMessage });
                    }
                }
            );
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, error: errorMessage };
    }
}


/**
 * Handle image upload to ImgBB
 * @param imageData - Base64 image data URL
 * @returns Promise resolving to UploadResult
 */
async function handleUpload(imageData: string): Promise<UploadResult> {
    try {
        const settings = await storage.get('settings');

        if (!settings?.imgbbApiKey) {
            return {
                success: false,
                error: 'No API key configured. Please set your ImgBB API key in settings.',
            };
        }

        const result = await uploadToImgBB(imageData, settings.imgbbApiKey);

        if (result.success && result.data) {
            // Add to history
            await addToHistory({
                id: result.data.data.id,
                type: 'screenshot',
                thumbnailUrl: result.data.data.thumb.url,
                uploadedUrl: result.data.data.url,
                deleteUrl: result.data.data.delete_url,
                viewerUrl: result.data.data.url_viewer,
                createdAt: Date.now(),
                size: result.data.data.size,
                dimensions: {
                    width: result.data.data.width,
                    height: result.data.data.height,
                },
            });
        }

        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: errorMessage,
        };
    }
}

/**
 * Get upload history
 * @returns Promise resolving to array of history items
 */
async function getHistory(): Promise<HistoryItem[]> {
    const history = await storage.get('history');
    return history || [];
}

/**
 * Clear upload history
 * @returns Promise resolving to success status
 */
async function clearHistory(): Promise<{ success: boolean }> {
    await storage.set('history', []);
    return { success: true };
}

/**
 * Add item to history, enforcing 50 item limit
 * @param item - The history item to add
 */
async function addToHistory(item: HistoryItem): Promise<void> {
    const history = await getHistory();
    const MAX_HISTORY_ITEMS = 50;

    // Add new item at the beginning
    history.unshift(item);

    // Enforce limit by removing oldest items
    if (history.length > MAX_HISTORY_ITEMS) {
        history.splice(MAX_HISTORY_ITEMS);
    }

    await storage.set('history', history);
}

/**
 * Handle keyboard shortcut commands
 * @param command - The command name from manifest
 */
export async function handleCommand(command: string): Promise<void> {
    let result: CaptureResult;

    switch (command) {
        case 'capture-visible':
            result = await captureVisibleArea();
            break;

        case 'capture-full':
            result = await captureFullPage();
            break;

        case 'capture-area':
            // For area capture, we need to notify the content script
            // to show the selection overlay
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                chrome.tabs.sendMessage(tab.id, { action: 'startAreaSelection' });
            }
            return;

        case 'start-recording':
            // Start tab recording with audio by default
            if (!recorder.isRecording()) {
                await recorder.startTabRecording(true);
            } else {
                // If already recording, stop it
                await recorder.stop();
            }
            return;

        default:
            console.log('Unknown command:', command);
            return;
    }

    // If capture was successful, open the editor
    if (result.success && result.imageDataUrl) {
        // Store the captured image temporarily
        await chrome.storage.local.set({ tempCapture: result.imageDataUrl });

        // Open the editor page
        chrome.tabs.create({
            url: chrome.runtime.getURL('src/editor/index.html'),
        });
    }
}

/**
 * Handle image download request
 * Requirements: 5.1, 5.2 - Download to default folder with timestamp filename
 * @param message - Download message with image data and options
 * @returns Promise resolving to DownloadResult
 */
async function handleDownloadImage(
    message: { action: 'downloadImage'; imageData: string; filename?: string; saveAs?: boolean }
): Promise<DownloadResult> {
    return await downloadImage(message.imageData, {
        filename: message.filename,
        saveAs: message.saveAs,
    });
}

/**
 * Handle copy image to clipboard request
 * Requirements: 5.4 - Copy image data to system clipboard
 * @param imageData - Base64 image data URL
 * @returns Promise resolving to success status
 */
async function handleCopyImageToClipboard(imageData: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Validate image data
        if (!imageData || !imageData.startsWith('data:image/')) {
            return {
                success: false,
                error: 'Invalid image data',
            };
        }

        // Convert data URL to blob
        const response = await fetch(imageData);
        const blob = await response.blob();

        // Use the Clipboard API to write the image
        await navigator.clipboard.write([
            new ClipboardItem({
                [blob.type]: blob,
            }),
        ]);

        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: `Failed to copy to clipboard: ${errorMessage}`,
        };
    }
}

/**
 * Handle start recording request
 * Requirements: 8.1, 8.2, 8.3 - Start recording based on type
 * @param message - Recording message with type and audio options
 * @returns Promise resolving to RecordingResult
 */
async function handleStartRecording(
    message: { action: 'startRecording'; type: 'tab' | 'desktop' | 'camera'; audio: boolean }
): Promise<RecordingResult> {
    const { type, audio } = message;

    switch (type) {
        case 'tab':
            return await recorder.startTabRecording(audio);
        case 'desktop':
            return await recorder.startDesktopRecording(audio);
        case 'camera':
            return await recorder.startCameraRecording(audio);
        default:
            return { success: false, error: 'Unknown recording type' };
    }
}

/**
 * Handle stop recording request
 * Requirements: 8.4, 8.5, 8.6 - Stop recording and process video
 * @returns Promise resolving to RecordingResult with video data
 */
async function handleStopRecording(): Promise<RecordingResult> {
    const result = await recorder.stop();

    if (result.success && result.videoDataUrl) {
        // Generate a unique ID for the video
        const videoId = `video_${Date.now()}`;

        // Create thumbnail from video (first frame)
        // For now, we'll use a placeholder - proper thumbnail generation would require canvas
        const thumbnailUrl = result.videoDataUrl;

        // Add to history
        await addToHistory({
            id: videoId,
            type: 'video',
            thumbnailUrl: thumbnailUrl.substring(0, 100) + '...', // Truncate for storage
            localPath: videoId,
            createdAt: Date.now(),
            size: result.videoDataUrl.length,
            duration: result.duration,
        });

        // Store the video data temporarily for download
        await chrome.storage.local.set({ [`tempVideo_${videoId}`]: result.videoDataUrl });
    }

    return result;
}

/**
 * Handle video download request
 * Requirements: 8.5, 8.6 - Download video as WebM or MP4
 * @param message - Download message with video data and filename
 * @returns Promise resolving to DownloadResult
 */
async function handleDownloadVideo(
    message: { action: 'downloadVideo'; videoData: string; filename?: string }
): Promise<DownloadResult> {
    const { videoData, filename } = message;

    // Generate filename with timestamp if not provided
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const defaultFilename = `recording_${timestamp}.webm`;

    return await downloadImage(videoData, {
        filename: filename || defaultFilename,
        saveAs: false,
    });
}
