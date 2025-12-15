/**
 * Context menu service for right-click options
 * Requirements: 5.3 - Add "Save As" option on right-click
 */

/**
 * Context menu item IDs
 */
export const CONTEXT_MENU_IDS = {
    SAVE_AS: 'pushscreenshot-save-as',
    COPY_IMAGE: 'pushscreenshot-copy-image',
    CAPTURE_VISIBLE: 'pushscreenshot-capture-visible',
    CAPTURE_AREA: 'pushscreenshot-capture-area',
} as const;

/**
 * Create context menu items
 * Should be called on extension install/startup
 */
export function createContextMenus(): void {
    // Remove existing menus first to avoid duplicates
    chrome.contextMenus.removeAll(() => {
        // Parent menu for PushScreenshot
        chrome.contextMenus.create({
            id: 'pushscreenshot-parent',
            title: 'PushScreenshot',
            contexts: ['page', 'image'],
        });

        // Capture visible area
        chrome.contextMenus.create({
            id: CONTEXT_MENU_IDS.CAPTURE_VISIBLE,
            parentId: 'pushscreenshot-parent',
            title: 'Capture Visible Area',
            contexts: ['page', 'image'],
        });

        // Capture selected area
        chrome.contextMenus.create({
            id: CONTEXT_MENU_IDS.CAPTURE_AREA,
            parentId: 'pushscreenshot-parent',
            title: 'Capture Selected Area',
            contexts: ['page', 'image'],
        });

        // Separator
        chrome.contextMenus.create({
            id: 'pushscreenshot-separator',
            parentId: 'pushscreenshot-parent',
            type: 'separator',
            contexts: ['image'],
        });

        // Save As option for images
        chrome.contextMenus.create({
            id: CONTEXT_MENU_IDS.SAVE_AS,
            parentId: 'pushscreenshot-parent',
            title: 'Save Image As...',
            contexts: ['image'],
        });

        // Copy image option
        chrome.contextMenus.create({
            id: CONTEXT_MENU_IDS.COPY_IMAGE,
            parentId: 'pushscreenshot-parent',
            title: 'Copy Image',
            contexts: ['image'],
        });
    });
}

/**
 * Handle context menu click
 * @param info - Context menu click info
 * @param tab - The tab where the click occurred
 */
export async function handleContextMenuClick(
    info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
): Promise<void> {
    switch (info.menuItemId) {
        case CONTEXT_MENU_IDS.CAPTURE_VISIBLE:
            await handleCaptureVisible(tab);
            break;

        case CONTEXT_MENU_IDS.CAPTURE_AREA:
            await handleCaptureArea(tab);
            break;

        case CONTEXT_MENU_IDS.SAVE_AS:
            await handleSaveAs(info);
            break;

        case CONTEXT_MENU_IDS.COPY_IMAGE:
            await handleCopyImage(info, tab);
            break;
    }
}

/**
 * Handle capture visible area from context menu
 */
async function handleCaptureVisible(tab?: chrome.tabs.Tab): Promise<void> {
    if (!tab?.id) return;

    try {
        // Capture the visible area
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'png',
        });

        // Store the image and open editor
        await chrome.storage.local.set({ editorImage: dataUrl });
        await chrome.tabs.create({
            url: chrome.runtime.getURL('src/editor/index.html'),
        });
    } catch (error) {
        console.error('Failed to capture visible area:', error);
    }
}

/**
 * Handle capture selected area from context menu
 */
async function handleCaptureArea(tab?: chrome.tabs.Tab): Promise<void> {
    if (!tab?.id) return;

    try {
        // Send message to content script to start area selection
        await chrome.tabs.sendMessage(tab.id, { action: 'startAreaSelection' });
    } catch (error) {
        console.error('Failed to start area selection:', error);
    }
}

/**
 * Handle save as from context menu
 * Requirements: 5.3 - Add "Save As" option on right-click
 */
async function handleSaveAs(info: chrome.contextMenus.OnClickData): Promise<void> {
    const imageUrl = info.srcUrl;
    if (!imageUrl) return;

    try {
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const extension = getImageExtension(imageUrl);
        const filename = `screenshot_${timestamp}.${extension}`;

        // Download with save dialog
        await chrome.downloads.download({
            url: imageUrl,
            filename: filename,
            saveAs: true,
        });
    } catch (error) {
        console.error('Failed to save image:', error);
    }
}

/**
 * Handle copy image from context menu
 */
async function handleCopyImage(
    info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
): Promise<void> {
    const imageUrl = info.srcUrl;
    if (!imageUrl || !tab?.id) return;

    try {
        // Execute script in the page to copy the image
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: copyImageFromUrl,
            args: [imageUrl],
        });
    } catch (error) {
        console.error('Failed to copy image:', error);
    }
}

/**
 * Function to be injected into the page to copy an image
 * @param imageUrl - URL of the image to copy
 */
async function copyImageFromUrl(imageUrl: string): Promise<void> {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();

        // Convert to PNG if needed (clipboard only supports PNG)
        if (blob.type !== 'image/png') {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = imageUrl;
            });

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Failed to get canvas context');

            ctx.drawImage(img, 0, 0);

            const pngBlob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error('Failed to convert to PNG'));
                }, 'image/png');
            });

            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': pngBlob }),
            ]);
        } else {
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob }),
            ]);
        }
    } catch (error) {
        console.error('Failed to copy image:', error);
    }
}

/**
 * Get image extension from URL or data URL
 */
function getImageExtension(url: string): string {
    if (url.startsWith('data:image/')) {
        const match = url.match(/data:image\/(\w+)/);
        return match ? match[1] : 'png';
    }

    const urlPath = new URL(url).pathname;
    const extension = urlPath.split('.').pop()?.toLowerCase();

    if (extension && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(extension)) {
        return extension;
    }

    return 'png';
}
