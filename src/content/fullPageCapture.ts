// Full page scroll capture implementation
// Requirements: 1.2

/**
 * Configuration for full page capture
 */
interface FullPageCaptureConfig {
    scrollDelay: number;  // Delay between scrolls in ms
    maxScrollTime: number; // Maximum time for scroll capture in ms
}

const DEFAULT_CONFIG: FullPageCaptureConfig = {
    scrollDelay: 500,  // Increased delay for more stable capture (Chrome rate limiting)
    maxScrollTime: 120000, // 120 seconds max
};

/**
 * Capture information for each viewport
 */
interface ViewportCapture {
    imageDataUrl: string;
    scrollY: number;
    viewportHeight: number;
}

/**
 * FullPageCapture class handles scrolling through the page and capturing each viewport
 * Then stitches all captures together into a single image
 */
export class FullPageCapture {
    private config: FullPageCaptureConfig;
    private originalScrollPosition: number = 0;
    private isCapturing: boolean = false;

    constructor(config: Partial<FullPageCaptureConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Capture the full page by scrolling and stitching images
     * @returns Promise resolving to the stitched image data URL
     */
    async capture(): Promise<string> {
        if (this.isCapturing) {
            throw new Error('Capture already in progress');
        }

        this.isCapturing = true;
        this.originalScrollPosition = window.scrollY;

        try {
            // Get page dimensions
            const pageHeight = Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.offsetHeight
            );
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;


            // If page fits in viewport, just capture visible area
            if (pageHeight <= viewportHeight) {
                const capture = await this.captureViewport();
                return capture;
            }

            // Calculate number of captures needed
            const captures: ViewportCapture[] = [];
            const startTime = Date.now();

            // Scroll to top first
            window.scrollTo(0, 0);
            await this.delay(this.config.scrollDelay);

            let currentScrollY = 0;

            while (currentScrollY < pageHeight) {
                // Check timeout
                if (Date.now() - startTime > this.config.maxScrollTime) {
                    throw new Error('Full page capture timed out');
                }

                // Capture current viewport
                const imageDataUrl = await this.captureViewport();
                captures.push({
                    imageDataUrl,
                    scrollY: currentScrollY,
                    viewportHeight,
                });

                // Calculate next scroll position
                // Overlap slightly to avoid gaps
                const overlap = 10;
                currentScrollY += viewportHeight - overlap;

                // Check if we've reached the bottom
                if (currentScrollY >= pageHeight - viewportHeight) {
                    // Capture the final viewport at the bottom
                    window.scrollTo(0, pageHeight - viewportHeight);
                    await this.delay(this.config.scrollDelay);

                    const finalCapture = await this.captureViewport();
                    captures.push({
                        imageDataUrl: finalCapture,
                        scrollY: pageHeight - viewportHeight,
                        viewportHeight,
                    });
                    break;
                }

                // Scroll to next position
                window.scrollTo(0, currentScrollY);
                await this.delay(this.config.scrollDelay);
            }

            // Stitch images together
            const stitchedImage = await this.stitchImages(captures, viewportWidth, pageHeight);

            return stitchedImage;
        } finally {
            // Restore original scroll position
            window.scrollTo(0, this.originalScrollPosition);
            this.isCapturing = false;
        }
    }

    /**
     * Capture the current viewport by sending message to background
     * Includes retry logic for more reliable capture
     */
    private async captureViewport(retries: number = 5): Promise<string> {
        console.log('captureViewport: Requesting capture from background');

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                // Add delay before capture to avoid Chrome rate limiting
                if (attempt > 1) {
                    console.log(`captureViewport: Retry attempt ${attempt}, waiting...`);
                }
                const result = await this.captureViewportOnce();
                // Add small delay after successful capture to avoid rate limiting
                await this.delay(100);
                return result;
            } catch (error) {
                console.warn(`captureViewport: Attempt ${attempt} failed:`, error);
                if (attempt < retries) {
                    // Wait before retry with exponential backoff (longer delays)
                    const waitTime = 500 * attempt;
                    console.log(`captureViewport: Waiting ${waitTime}ms before retry...`);
                    await this.delay(waitTime);
                } else {
                    throw error;
                }
            }
        }

        throw new Error('Failed to capture viewport after retries');
    }

    /**
     * Single attempt to capture viewport
     */
    private captureViewportOnce(): Promise<string> {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'captureVisible' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('captureViewport: Runtime error:', chrome.runtime.lastError.message);
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                console.log('captureViewport: Response received:', response?.success, response?.error);
                if (response?.success && response.imageDataUrl) {
                    resolve(response.imageDataUrl);
                } else {
                    reject(new Error(response?.error || 'Failed to capture viewport'));
                }
            });
        });
    }


    /**
     * Stitch multiple viewport captures into a single image
     */
    private async stitchImages(
        captures: ViewportCapture[],
        width: number,
        totalHeight: number
    ): Promise<string> {
        const dpr = window.devicePixelRatio || 1;
        const canvas = document.createElement('canvas');
        canvas.width = width * dpr;
        canvas.height = totalHeight * dpr;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to create canvas context');
        }

        // Scale for device pixel ratio
        ctx.scale(dpr, dpr);

        // Load and draw each capture
        for (let i = 0; i < captures.length; i++) {
            const capture = captures[i];
            const img = await this.loadImage(capture.imageDataUrl);

            // Calculate the portion of this capture to use
            let sourceY = 0;
            let sourceHeight = capture.viewportHeight * dpr;
            let destY = capture.scrollY;
            let destHeight = capture.viewportHeight;

            // For overlapping captures, only use the non-overlapping portion
            if (i > 0) {
                const prevCapture = captures[i - 1];
                const overlap = (prevCapture.scrollY + prevCapture.viewportHeight) - capture.scrollY;
                if (overlap > 0) {
                    sourceY = overlap * dpr;
                    sourceHeight -= overlap * dpr;
                    destY += overlap;
                    destHeight -= overlap;
                }
            }

            // For the last capture, ensure we don't exceed total height
            if (destY + destHeight > totalHeight) {
                const excess = (destY + destHeight) - totalHeight;
                destHeight -= excess;
                sourceHeight -= excess * dpr;
            }

            ctx.drawImage(
                img,
                0, sourceY,                    // Source x, y
                img.width, sourceHeight,       // Source width, height
                0, destY,                      // Dest x, y
                width, destHeight              // Dest width, height
            );
        }

        return canvas.toDataURL('image/png');
    }

    /**
     * Load an image from a data URL
     */
    private loadImage(dataUrl: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = dataUrl;
        });
    }

    /**
     * Delay helper
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Singleton instance
let fullPageCaptureInstance: FullPageCapture | null = null;

/**
 * Get or create the full page capture instance
 */
export function getFullPageCapture(): FullPageCapture {
    if (!fullPageCaptureInstance) {
        fullPageCaptureInstance = new FullPageCapture();
    }
    return fullPageCaptureInstance;
}

/**
 * Capture the full page
 */
export async function captureFullPage(): Promise<string> {
    const capture = getFullPageCapture();
    return capture.capture();
}
