// Recording indicator overlay
// Requirements: 8.4, 8.7

/**
 * Recording state
 */
export type RecordingState = 'recording' | 'paused' | 'stopped';

/**
 * RecordingIndicator class displays a floating panel during recording
 * Shows recording time and control buttons
 */
export class RecordingIndicator {
    private container: HTMLDivElement | null = null;
    private timeDisplay: HTMLSpanElement | null = null;
    private statusDot: HTMLSpanElement | null = null;
    private pauseButton: HTMLButtonElement | null = null;
    private stopButton: HTMLButtonElement | null = null;

    private state: RecordingState = 'stopped';
    private startTime: number = 0;
    private pausedTime: number = 0;
    private timerInterval: number | null = null;

    private onPauseCallback: (() => void) | null = null;
    private onResumeCallback: (() => void) | null = null;
    private onStopCallback: (() => void) | null = null;

    /**
     * Show the recording indicator
     */
    show(): void {
        if (this.container) {
            this.hide();
        }

        this.createIndicator();
        this.state = 'recording';
        this.startTime = Date.now();
        this.pausedTime = 0;
        this.startTimer();
        this.updateUI();
    }

    /**
     * Hide the recording indicator
     */
    hide(): void {
        this.stopTimer();

        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        this.container = null;
        this.timeDisplay = null;
        this.statusDot = null;
        this.pauseButton = null;
        this.stopButton = null;
        this.state = 'stopped';
    }


    /**
     * Pause the recording
     */
    pause(): void {
        if (this.state !== 'recording') return;

        this.state = 'paused';
        this.pausedTime = Date.now();
        this.stopTimer();
        this.updateUI();

        if (this.onPauseCallback) {
            this.onPauseCallback();
        }
    }

    /**
     * Resume the recording
     */
    resume(): void {
        if (this.state !== 'paused') return;

        // Adjust start time to account for pause duration
        const pauseDuration = Date.now() - this.pausedTime;
        this.startTime += pauseDuration;

        this.state = 'recording';
        this.startTimer();
        this.updateUI();

        if (this.onResumeCallback) {
            this.onResumeCallback();
        }
    }

    /**
     * Stop the recording
     */
    stop(): void {
        this.state = 'stopped';
        this.stopTimer();

        if (this.onStopCallback) {
            this.onStopCallback();
        }

        this.hide();
    }

    /**
     * Get elapsed recording time in seconds
     */
    getElapsedTime(): number {
        if (this.state === 'stopped') return 0;

        const endTime = this.state === 'paused' ? this.pausedTime : Date.now();
        return Math.floor((endTime - this.startTime) / 1000);
    }

    /**
     * Set callback for pause action
     */
    onPause(callback: () => void): void {
        this.onPauseCallback = callback;
    }

    /**
     * Set callback for resume action
     */
    onResume(callback: () => void): void {
        this.onResumeCallback = callback;
    }

    /**
     * Set callback for stop action
     */
    onStop(callback: () => void): void {
        this.onStopCallback = callback;
    }

    /**
     * Create the indicator UI
     */
    private createIndicator(): void {
        this.container = document.createElement('div');
        this.container.id = 'pushscreenshot-recording-indicator';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            z-index: 2147483647;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            user-select: none;
            cursor: move;
        `;

        // Status dot (red for recording, yellow for paused)
        this.statusDot = document.createElement('span');
        this.statusDot.style.cssText = `
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #ff4444;
            animation: pulse 1s infinite;
        `;

        // Add pulse animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);


        // Time display
        this.timeDisplay = document.createElement('span');
        this.timeDisplay.style.cssText = `
            font-variant-numeric: tabular-nums;
            min-width: 60px;
        `;
        this.timeDisplay.textContent = '00:00';

        // Pause/Resume button
        this.pauseButton = document.createElement('button');
        this.pauseButton.style.cssText = `
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
        `;
        this.pauseButton.textContent = 'Pause';
        this.pauseButton.addEventListener('click', () => {
            if (this.state === 'recording') {
                this.pause();
            } else if (this.state === 'paused') {
                this.resume();
            }
        });
        this.pauseButton.addEventListener('mouseenter', () => {
            if (this.pauseButton) {
                this.pauseButton.style.background = 'rgba(255, 255, 255, 0.1)';
            }
        });
        this.pauseButton.addEventListener('mouseleave', () => {
            if (this.pauseButton) {
                this.pauseButton.style.background = 'transparent';
            }
        });

        // Stop button
        this.stopButton = document.createElement('button');
        this.stopButton.style.cssText = `
            background: #ff4444;
            border: none;
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
        `;
        this.stopButton.textContent = 'Stop';
        this.stopButton.addEventListener('click', () => this.stop());
        this.stopButton.addEventListener('mouseenter', () => {
            if (this.stopButton) {
                this.stopButton.style.background = '#ff6666';
            }
        });
        this.stopButton.addEventListener('mouseleave', () => {
            if (this.stopButton) {
                this.stopButton.style.background = '#ff4444';
            }
        });

        // Make draggable
        this.makeDraggable();

        // Assemble
        this.container.appendChild(this.statusDot);
        this.container.appendChild(this.timeDisplay);
        this.container.appendChild(this.pauseButton);
        this.container.appendChild(this.stopButton);

        document.body.appendChild(this.container);
    }

    /**
     * Make the indicator draggable
     */
    private makeDraggable(): void {
        if (!this.container) return;

        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        this.container.addEventListener('mousedown', (e) => {
            // Don't drag if clicking buttons
            if ((e.target as HTMLElement).tagName === 'BUTTON') return;

            isDragging = true;
            offsetX = e.clientX - this.container!.getBoundingClientRect().left;
            offsetY = e.clientY - this.container!.getBoundingClientRect().top;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging || !this.container) return;

            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;

            // Keep within viewport
            const maxX = window.innerWidth - this.container.offsetWidth;
            const maxY = window.innerHeight - this.container.offsetHeight;

            this.container.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
            this.container.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
            this.container.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }


    /**
     * Start the timer interval
     */
    private startTimer(): void {
        this.stopTimer();
        this.timerInterval = window.setInterval(() => {
            this.updateTimeDisplay();
        }, 1000);
    }

    /**
     * Stop the timer interval
     */
    private stopTimer(): void {
        if (this.timerInterval !== null) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * Update the time display
     */
    private updateTimeDisplay(): void {
        if (!this.timeDisplay) return;

        const elapsed = this.getElapsedTime();
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;

        this.timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Update UI based on current state
     */
    private updateUI(): void {
        if (!this.statusDot || !this.pauseButton) return;

        if (this.state === 'recording') {
            this.statusDot.style.background = '#ff4444';
            this.statusDot.style.animation = 'pulse 1s infinite';
            this.pauseButton.textContent = 'Pause';
        } else if (this.state === 'paused') {
            this.statusDot.style.background = '#ffaa00';
            this.statusDot.style.animation = 'none';
            this.pauseButton.textContent = 'Resume';
        }
    }
}

// Singleton instance
let recordingIndicatorInstance: RecordingIndicator | null = null;

/**
 * Get or create the recording indicator instance
 */
export function getRecordingIndicator(): RecordingIndicator {
    if (!recordingIndicatorInstance) {
        recordingIndicatorInstance = new RecordingIndicator();
    }
    return recordingIndicatorInstance;
}

/**
 * Show the recording indicator
 */
export function showRecordingIndicator(): RecordingIndicator {
    const indicator = getRecordingIndicator();
    indicator.show();
    return indicator;
}

/**
 * Hide the recording indicator
 */
export function hideRecordingIndicator(): void {
    if (recordingIndicatorInstance) {
        recordingIndicatorInstance.hide();
    }
}
