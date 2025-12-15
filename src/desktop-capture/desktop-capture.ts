// Desktop Screenshot Capture
// Uses getDisplayMedia API to capture screen/window/tab

const captureBtn = document.getElementById('captureBtn') as HTMLButtonElement;
const loadingEl = document.getElementById('loading') as HTMLDivElement;
const statusEl = document.getElementById('status') as HTMLDivElement;

function showLoading(show: boolean) {
    loadingEl.classList.toggle('show', show);
    captureBtn.disabled = show;
}

function showStatus(message: string, isError: boolean) {
    statusEl.textContent = message;
    statusEl.className = `status ${isError ? 'error' : 'success'}`;
}

async function captureDesktop() {
    showLoading(true);
    statusEl.className = 'status';

    try {
        // Request screen capture permission
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                displaySurface: 'monitor', // Prefer full screen
            },
            audio: false,
        });

        // Get video track
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        const width = settings.width || 1920;
        const height = settings.height || 1080;

        // Create video element to capture frame
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;

        await new Promise<void>((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                resolve();
            };
        });

        // Wait a bit for the video to be ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Create canvas and capture frame
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to create canvas context');
        }

        ctx.drawImage(video, 0, 0, width, height);

        // Stop the stream
        stream.getTracks().forEach(track => track.stop());

        // Convert to data URL
        const imageDataUrl = canvas.toDataURL('image/png');

        // Store the captured image
        await chrome.storage.local.set({ tempCapture: imageDataUrl });

        showStatus('Screenshot captured! Opening editor...', false);

        // Small delay before redirecting
        await new Promise(resolve => setTimeout(resolve, 500));

        // Redirect to editor
        window.location.href = chrome.runtime.getURL('src/editor/index.html');

    } catch (error) {
        showLoading(false);

        if (error instanceof Error) {
            if (error.name === 'NotAllowedError') {
                showStatus('Screen capture was cancelled or denied.', true);
            } else {
                showStatus(`Error: ${error.message}`, true);
            }
        } else {
            showStatus('An unknown error occurred.', true);
        }
    }
}

// Auto-start capture when page loads
captureBtn.addEventListener('click', captureDesktop);

// Optionally auto-start after a short delay
setTimeout(() => {
    captureDesktop();
}, 500);
