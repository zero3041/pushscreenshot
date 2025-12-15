// Area selection overlay for capturing selected regions
import type { AreaRect } from '../types';

/**
 * AreaSelector class handles the overlay UI for selecting a rectangular area on the page
 * Requirements: 1.3, 1.4
 */
export class AreaSelector {
    private overlay: HTMLDivElement | null = null;
    private selectionBox: HTMLDivElement | null = null;
    private isSelecting = false;
    private startX = 0;
    private startY = 0;
    private onSelectCallback: ((area: AreaRect) => void) | null = null;
    private onCancelCallback: (() => void) | null = null;

    // Bound event handlers for proper cleanup
    private boundMouseDown: (e: MouseEvent) => void;
    private boundMouseMove: (e: MouseEvent) => void;
    private boundMouseUp: (e: MouseEvent) => void;
    private boundKeyDown: (e: KeyboardEvent) => void;

    constructor() {
        this.boundMouseDown = this.handleMouseDown.bind(this);
        this.boundMouseMove = this.handleMouseMove.bind(this);
        this.boundMouseUp = this.handleMouseUp.bind(this);
        this.boundKeyDown = this.handleKeyDown.bind(this);
    }

    /**
     * Start the area selection mode
     * Injects overlay div on page and sets up mouse event handlers
     */
    start(): void {
        if (this.overlay) {
            this.cleanup();
        }

        this.createOverlay();
        this.attachEventListeners();
    }

    /**
     * Cancel the area selection
     */
    cancel(): void {
        this.cleanup();
        if (this.onCancelCallback) {
            this.onCancelCallback();
        }
    }

    /**
     * Set callback for when area is selected
     */
    onSelect(callback: (area: AreaRect) => void): void {
        this.onSelectCallback = callback;
    }


    /**
     * Set callback for when selection is cancelled
     */
    onCancel(callback: () => void): void {
        this.onCancelCallback = callback;
    }

    /**
     * Create the overlay element that covers the entire page
     */
    private createOverlay(): void {
        // Create main overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'pushscreenshot-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.3);
            cursor: crosshair;
            z-index: 2147483647;
            user-select: none;
        `;

        // Create selection box
        this.selectionBox = document.createElement('div');
        this.selectionBox.id = 'pushscreenshot-selection';
        this.selectionBox.style.cssText = `
            position: fixed;
            border: 2px dashed #4a90d9;
            background: rgba(74, 144, 217, 0.1);
            display: none;
            z-index: 2147483647;
            pointer-events: none;
            box-sizing: border-box;
        `;

        // Create instruction text
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            z-index: 2147483647;
            pointer-events: none;
        `;
        instructions.textContent = 'Click and drag to select area. Press ESC to cancel.';

        this.overlay.appendChild(instructions);
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.selectionBox);
    }

    /**
     * Attach mouse and keyboard event listeners
     */
    private attachEventListeners(): void {
        if (!this.overlay) return;

        this.overlay.addEventListener('mousedown', this.boundMouseDown);
        document.addEventListener('mousemove', this.boundMouseMove);
        document.addEventListener('mouseup', this.boundMouseUp);
        document.addEventListener('keydown', this.boundKeyDown);
    }

    /**
     * Remove event listeners
     */
    private removeEventListeners(): void {
        if (this.overlay) {
            this.overlay.removeEventListener('mousedown', this.boundMouseDown);
        }
        document.removeEventListener('mousemove', this.boundMouseMove);
        document.removeEventListener('mouseup', this.boundMouseUp);
        document.removeEventListener('keydown', this.boundKeyDown);
    }

    /**
     * Handle mouse down - start selection
     */
    private handleMouseDown(e: MouseEvent): void {
        e.preventDefault();
        this.isSelecting = true;
        this.startX = e.clientX;
        this.startY = e.clientY;

        if (this.selectionBox) {
            this.selectionBox.style.display = 'block';
            this.selectionBox.style.left = `${this.startX}px`;
            this.selectionBox.style.top = `${this.startY}px`;
            this.selectionBox.style.width = '0px';
            this.selectionBox.style.height = '0px';
        }
    }


    /**
     * Handle mouse move - update selection rectangle
     */
    private handleMouseMove(e: MouseEvent): void {
        if (!this.isSelecting || !this.selectionBox) return;

        const currentX = e.clientX;
        const currentY = e.clientY;

        // Calculate rectangle dimensions (handle negative drag)
        const left = Math.min(this.startX, currentX);
        const top = Math.min(this.startY, currentY);
        const width = Math.abs(currentX - this.startX);
        const height = Math.abs(currentY - this.startY);

        this.selectionBox.style.left = `${left}px`;
        this.selectionBox.style.top = `${top}px`;
        this.selectionBox.style.width = `${width}px`;
        this.selectionBox.style.height = `${height}px`;
    }

    /**
     * Handle mouse up - complete selection
     */
    private handleMouseUp(e: MouseEvent): void {
        if (!this.isSelecting) return;

        this.isSelecting = false;

        const currentX = e.clientX;
        const currentY = e.clientY;

        // Calculate final rectangle
        const x = Math.min(this.startX, currentX);
        const y = Math.min(this.startY, currentY);
        const width = Math.abs(currentX - this.startX);
        const height = Math.abs(currentY - this.startY);

        // Only trigger callback if selection has meaningful size
        if (width > 5 && height > 5) {
            const area: AreaRect = {
                x,
                y,
                width,
                height,
                devicePixelRatio: window.devicePixelRatio || 1,
            };

            this.cleanup();

            if (this.onSelectCallback) {
                this.onSelectCallback(area);
            }
        } else {
            // Selection too small, reset
            if (this.selectionBox) {
                this.selectionBox.style.display = 'none';
            }
        }
    }

    /**
     * Handle keyboard events - ESC to cancel
     */
    private handleKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Escape') {
            this.cancel();
        }
    }

    /**
     * Clean up overlay and event listeners
     */
    private cleanup(): void {
        this.removeEventListeners();

        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        if (this.selectionBox && this.selectionBox.parentNode) {
            this.selectionBox.parentNode.removeChild(this.selectionBox);
        }

        this.overlay = null;
        this.selectionBox = null;
        this.isSelecting = false;
    }
}

// Singleton instance for use in content script
let areaSelectorInstance: AreaSelector | null = null;

/**
 * Get or create the area selector instance
 */
export function getAreaSelector(): AreaSelector {
    if (!areaSelectorInstance) {
        areaSelectorInstance = new AreaSelector();
    }
    return areaSelectorInstance;
}

/**
 * Start area selection and return a promise that resolves with the selected area
 */
export function startAreaSelection(): Promise<AreaRect | null> {
    return new Promise((resolve) => {
        const selector = getAreaSelector();

        selector.onSelect((area) => {
            resolve(area);
        });

        selector.onCancel(() => {
            resolve(null);
        });

        selector.start();
    });
}
