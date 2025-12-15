// Content script entry point
// Handles messages from background service worker and manages overlays

import { startAreaSelection, getAreaSelector } from './areaSelector';
import { captureFullPage } from './fullPageCapture';
import { showRecordingIndicator, hideRecordingIndicator, getRecordingIndicator } from './recordingIndicator';
import type { AreaRect } from '../types';

console.log('PushScreenshot content script loaded');

/**
 * Message types that content script handles
 */
interface ContentMessage {
    action: string;
    [key: string]: unknown;
}

/**
 * Crop an image to the specified area
 */
async function cropImage(imageDataUrl: string, area: AreaRect): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const dpr = area.devicePixelRatio;

            // Set canvas size to the cropped area (accounting for DPR)
            canvas.width = area.width * dpr;
            canvas.height = area.height * dpr;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to create canvas context'));
                return;
            }

            // Draw the cropped portion
            ctx.drawImage(
                img,
                area.x * dpr, area.y * dpr,           // Source x, y
                area.width * dpr, area.height * dpr,  // Source width, height
                0, 0,                                  // Dest x, y
                canvas.width, canvas.height            // Dest width, height
            );

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('Failed to load image for cropping'));
        img.src = imageDataUrl;
    });
}


/**
 * Handle area selection and capture
 */
async function handleAreaSelection(): Promise<void> {
    const area = await startAreaSelection();

    if (!area) {
        // Selection was cancelled
        return;
    }

    // Request capture from background
    chrome.runtime.sendMessage({ action: 'captureVisible' }, async (response) => {
        if (chrome.runtime.lastError) {
            console.error('Capture error:', chrome.runtime.lastError.message);
            return;
        }

        if (response?.success && response.imageDataUrl) {
            try {
                // Crop the image to the selected area
                const croppedImage = await cropImage(response.imageDataUrl, area);

                // Store the cropped image and open editor
                await chrome.storage.local.set({ tempCapture: croppedImage });

                // Open the editor page
                chrome.runtime.sendMessage({
                    action: 'openEditor',
                    imageDataUrl: croppedImage,
                });
            } catch (error) {
                console.error('Error cropping image:', error);
            }
        } else {
            console.error('Capture failed:', response?.error);
        }
    });
}

/**
 * Handle full page capture
 * @returns Promise resolving to capture result with imageDataUrl
 */
async function handleFullPageCapture(): Promise<{ success: boolean; imageDataUrl?: string; error?: string }> {
    console.log('handleFullPageCapture: Starting full page capture');
    try {
        const imageDataUrl = await captureFullPage();
        console.log('handleFullPageCapture: Capture completed, image length:', imageDataUrl?.length);

        // Store the captured image
        await chrome.storage.local.set({ tempCapture: imageDataUrl });

        return {
            success: true,
            imageDataUrl,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Full page capture error:', error);
        return {
            success: false,
            error: errorMessage,
        };
    }
}

/**
 * Handle recording start
 */
function handleStartRecording(): void {
    const indicator = showRecordingIndicator();

    indicator.onPause(() => {
        chrome.runtime.sendMessage({ action: 'pauseRecording' });
    });

    indicator.onResume(() => {
        chrome.runtime.sendMessage({ action: 'resumeRecording' });
    });

    indicator.onStop(() => {
        chrome.runtime.sendMessage({ action: 'stopRecording' });
    });
}

/**
 * Handle recording stop
 */
function handleStopRecording(): void {
    hideRecordingIndicator();
}

/**
 * Handle desktop capture with streamId from chrome.desktopCapture
 * @param streamId - The stream ID from chrome.desktopCapture.chooseDesktopMedia
 * @returns Promise resolving to capture result with imageDataUrl
 */
async function handleDesktopCapture(streamId: string): Promise<{ success: boolean; imageDataUrl?: string; error?: string }> {
    try {
        // Get the media stream using the streamId
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                // @ts-expect-error - chromeMediaSourceId is a Chrome-specific constraint
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: streamId,
                },
            },
            audio: false,
        });

        // Get video track settings for dimensions
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        const width = settings.width || 1920;
        const height = settings.height || 1080;

        // Create video element to capture frame
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;

        await new Promise<void>((resolve, reject) => {
            video.onloadedmetadata = () => {
                video.play().then(() => resolve()).catch(reject);
            };
            video.onerror = () => reject(new Error('Failed to load video'));
        });

        // Wait a bit for the video to be ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Create canvas and capture frame
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            stream.getTracks().forEach(track => track.stop());
            throw new Error('Failed to create canvas context');
        }

        ctx.drawImage(video, 0, 0, width, height);

        // Stop the stream
        stream.getTracks().forEach(track => track.stop());

        // Convert to data URL
        const imageDataUrl = canvas.toDataURL('image/png');

        return {
            success: true,
            imageDataUrl,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Desktop capture error:', error);
        return {
            success: false,
            error: errorMessage,
        };
    }
}

/**
 * Listen for messages from background service worker
 */
chrome.runtime.onMessage.addListener((message: ContentMessage, _sender, sendResponse) => {
    switch (message.action) {
        case 'ping':
            // Respond to ping to confirm content script is loaded
            sendResponse({ pong: true });
            break;

        case 'startAreaSelection':
            handleAreaSelection();
            sendResponse({ success: true });
            break;

        case 'startFullPageCapture':
            // Handle full page capture asynchronously and send response
            handleFullPageCapture().then((result) => {
                sendResponse(result);
            }).catch((error) => {
                sendResponse({
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                });
            });
            return true; // Keep message channel open for async response

        case 'startRecordingIndicator':
            handleStartRecording();
            sendResponse({ success: true });
            break;

        case 'stopRecordingIndicator':
            handleStopRecording();
            sendResponse({ success: true });
            break;

        case 'cancelAreaSelection':
            getAreaSelector().cancel();
            sendResponse({ success: true });
            break;

        case 'getRecordingTime':
            const indicator = getRecordingIndicator();
            sendResponse({ time: indicator.getElapsedTime() });
            break;

        case 'captureDesktopWithStreamId':
            // Handle desktop capture with streamId from chrome.desktopCapture
            handleDesktopCapture(message.streamId as string).then((result) => {
                sendResponse(result);
            }).catch((error) => {
                sendResponse({
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                });
            });
            return true; // Keep message channel open for async response

        default:
            // Unknown action, ignore
            break;
    }

    return true; // Keep message channel open for async response
});

export { };
