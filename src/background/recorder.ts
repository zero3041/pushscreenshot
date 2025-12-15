// Video recording logic
// Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8

export type RecordingType = 'tab' | 'desktop' | 'camera';

export interface RecordingOptions {
    type: RecordingType;
    audio: boolean;
}

export interface RecordingStatus {
    isRecording: boolean;
    isPaused: boolean;
    recordingTime: number;
    recordingType: RecordingType | null;
}

export interface RecordingResult {
    success: boolean;
    videoDataUrl?: string;
    duration?: number;
    error?: string;
    audioIncluded?: boolean;
}

/**
 * Recorder class manages video recording for tab, desktop, and camera
 */
class Recorder {
    private mediaRecorder: MediaRecorder | null = null;
    private mediaStream: MediaStream | null = null;
    private recordedChunks: Blob[] = [];
    private startTime: number = 0;
    private pausedTime: number = 0;
    private totalPausedDuration: number = 0;
    private recordingType: RecordingType | null = null;
    private isPaused: boolean = false;
    private audioIncluded: boolean = false;

    /**
     * Get current recording status
     */
    getStatus(): RecordingStatus {
        const isRecording = this.mediaRecorder !== null &&
            (this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused');

        return {
            isRecording,
            isPaused: this.isPaused,
            recordingTime: this.getElapsedTime(),
            recordingType: this.recordingType,
        };
    }

    /**
     * Get elapsed recording time in seconds
     */
    getElapsedTime(): number {
        if (!this.startTime) return 0;

        const endTime = this.isPaused ? this.pausedTime : Date.now();
        return Math.floor((endTime - this.startTime - this.totalPausedDuration) / 1000);
    }


    /**
     * Start tab recording using chrome.tabCapture API
     * Requirements: 8.1 - Record current browser tab with audio option
     */
    async startTabRecording(audio: boolean): Promise<RecordingResult> {
        try {
            // Get the current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) {
                return { success: false, error: 'No active tab found' };
            }

            // Use chrome.tabCapture to get the media stream
            const stream = await new Promise<MediaStream>((resolve, reject) => {
                chrome.tabCapture.capture(
                    {
                        audio: audio,
                        video: true,
                        videoConstraints: {
                            mandatory: {
                                chromeMediaSource: 'tab',
                                minWidth: 1280,
                                minHeight: 720,
                            },
                        },
                    },
                    (stream) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else if (stream) {
                            resolve(stream);
                        } else {
                            reject(new Error('Failed to capture tab'));
                        }
                    }
                );
            });

            this.audioIncluded = audio && stream.getAudioTracks().length > 0;
            return this.startRecordingWithStream(stream, 'tab');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { success: false, error: `Tab recording failed: ${errorMessage}` };
        }
    }

    /**
     * Start desktop recording using getDisplayMedia API
     * Requirements: 8.2 - Record selected screen with screen selection prompt
     */
    async startDesktopRecording(audio: boolean): Promise<RecordingResult> {
        try {
            // Use getDisplayMedia for screen capture
            // Note: In service worker context, we need to use offscreen document or content script
            // For now, we'll use the desktopCapture API which works in service workers

            const streamId = await new Promise<string>((resolve, reject) => {
                chrome.desktopCapture.chooseDesktopMedia(
                    ['screen', 'window', 'tab'],
                    (streamId) => {
                        if (streamId) {
                            resolve(streamId);
                        } else {
                            reject(new Error('Screen recording was cancelled'));
                        }
                    }
                );
            });

            // Create constraints with the stream ID
            const constraints: MediaStreamConstraints = {
                video: {
                    // @ts-expect-error - chromeMediaSourceId is a Chrome-specific constraint
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: streamId,
                        minWidth: 1280,
                        minHeight: 720,
                    },
                },
                audio: audio ? {
                    // @ts-expect-error - chromeMediaSource is a Chrome-specific constraint
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: streamId,
                    },
                } : false,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.audioIncluded = audio && stream.getAudioTracks().length > 0;

            return this.startRecordingWithStream(stream, 'desktop');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Check for specific error types
            if (errorMessage.includes('cancelled')) {
                return { success: false, error: 'Screen recording was cancelled' };
            }

            return { success: false, error: `Desktop recording failed: ${errorMessage}` };
        }
    }


    /**
     * Start camera recording using getUserMedia API
     * Requirements: 8.3 - Record from webcam with camera selection
     */
    async startCameraRecording(audio: boolean): Promise<RecordingResult> {
        try {
            const constraints: MediaStreamConstraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user',
                },
                audio: audio,
            };

            let stream: MediaStream;

            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (mediaError) {
                // Requirements: 8.8 - Continue without audio if mic denied
                if (audio && (mediaError as Error).name === 'NotAllowedError') {
                    // Try again without audio
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: constraints.video,
                            audio: false,
                        });
                        this.audioIncluded = false;
                        return {
                            ...await this.startRecordingWithStream(stream, 'camera'),
                            audioIncluded: false,
                        };
                    } catch (_videoOnlyError) {
                        return {
                            success: false,
                            error: 'Camera access was denied. Please grant permission.'
                        };
                    }
                }
                throw mediaError;
            }

            this.audioIncluded = audio && stream.getAudioTracks().length > 0;
            return this.startRecordingWithStream(stream, 'camera');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorName = error instanceof Error ? error.name : '';

            // Handle specific permission errors
            if (errorName === 'NotAllowedError') {
                return {
                    success: false,
                    error: 'Camera access was denied. Please grant permission.'
                };
            }
            if (errorName === 'NotFoundError') {
                return {
                    success: false,
                    error: 'No camera found. Please connect a camera and try again.'
                };
            }

            return { success: false, error: `Camera recording failed: ${errorMessage}` };
        }
    }

    /**
     * Start recording with the provided media stream
     */
    private async startRecordingWithStream(
        stream: MediaStream,
        type: RecordingType
    ): Promise<RecordingResult> {
        // Stop any existing recording
        if (this.mediaRecorder) {
            await this.stop();
        }

        this.mediaStream = stream;
        this.recordingType = type;
        this.recordedChunks = [];
        this.isPaused = false;
        this.totalPausedDuration = 0;

        // Determine the best supported MIME type
        const mimeType = this.getSupportedMimeType();

        try {
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 2500000, // 2.5 Mbps
            });
        } catch {
            // Fallback without specifying mimeType
            this.mediaRecorder = new MediaRecorder(stream);
        }

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        this.mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event);
        };

        // Start recording
        this.mediaRecorder.start(1000); // Collect data every second
        this.startTime = Date.now();

        return {
            success: true,
            audioIncluded: this.audioIncluded
        };
    }


    /**
     * Get supported MIME type for recording
     * Requirements: 8.5, 8.6 - Support WebM and MP4 formats
     */
    private getSupportedMimeType(): string {
        const types = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4',
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return 'video/webm';
    }

    /**
     * Pause the recording
     * Requirements: 8.4 - Pause functionality
     */
    pause(): RecordingResult {
        if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
            return { success: false, error: 'No active recording to pause' };
        }

        this.mediaRecorder.pause();
        this.isPaused = true;
        this.pausedTime = Date.now();

        return { success: true };
    }

    /**
     * Resume the recording
     * Requirements: 8.4 - Resume functionality
     */
    resume(): RecordingResult {
        if (!this.mediaRecorder || this.mediaRecorder.state !== 'paused') {
            return { success: false, error: 'No paused recording to resume' };
        }

        // Calculate paused duration
        this.totalPausedDuration += Date.now() - this.pausedTime;

        this.mediaRecorder.resume();
        this.isPaused = false;

        return { success: true };
    }

    /**
     * Stop the recording and return the video data
     * Requirements: 8.4 - Stop functionality
     * Requirements: 8.5, 8.6 - Process video for download
     */
    async stop(): Promise<RecordingResult> {
        if (!this.mediaRecorder) {
            return { success: false, error: 'No active recording to stop' };
        }

        const duration = this.getElapsedTime();

        return new Promise((resolve) => {
            if (!this.mediaRecorder) {
                resolve({ success: false, error: 'No active recording' });
                return;
            }

            this.mediaRecorder.onstop = async () => {
                // Stop all tracks
                if (this.mediaStream) {
                    this.mediaStream.getTracks().forEach(track => track.stop());
                }

                // Create blob from recorded chunks
                const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
                const blob = new Blob(this.recordedChunks, { type: mimeType });

                // Convert to data URL
                const reader = new FileReader();
                reader.onloadend = () => {
                    const videoDataUrl = reader.result as string;

                    // Clean up
                    this.cleanup();

                    resolve({
                        success: true,
                        videoDataUrl,
                        duration,
                        audioIncluded: this.audioIncluded,
                    });
                };
                reader.onerror = () => {
                    this.cleanup();
                    resolve({ success: false, error: 'Failed to process video' });
                };
                reader.readAsDataURL(blob);
            };

            // Stop the recorder
            if (this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            } else {
                // Already stopped, just cleanup
                this.cleanup();
                resolve({ success: false, error: 'Recording was already stopped' });
            }
        });
    }

    /**
     * Clean up resources
     */
    private cleanup(): void {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.startTime = 0;
        this.pausedTime = 0;
        this.totalPausedDuration = 0;
        this.recordingType = null;
        this.isPaused = false;
        this.audioIncluded = false;
    }

    /**
     * Check if currently recording
     */
    isRecording(): boolean {
        return this.mediaRecorder !== null &&
            (this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused');
    }
}

// Singleton instance
export const recorder = new Recorder();

