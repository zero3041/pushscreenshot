// Chrome storage wrapper with type safety
import type { Settings, HistoryItem } from '../types';

/**
 * Storage schema defining all keys and their types
 */
export interface StorageSchema {
    settings: Settings;
    history: HistoryItem[];
}

/**
 * Default settings for the extension
 */
export const defaultSettings: Settings = {
    imgbbApiKey: '',
    autoUpload: false,
    autoCopyLink: true,
    imageFormat: 'png',
    imageQuality: 92,
    videoFormat: 'webm',
    shortcuts: {
        captureVisible: 'Alt+Shift+V',
        captureFullPage: 'Alt+Shift+F',
        captureArea: 'Alt+Shift+A',
        startRecording: 'Alt+Shift+R',
    },
};

/**
 * Typed storage wrapper for chrome.storage.sync
 * Provides type-safe get/set methods using TypeScript generics
 */
export const storage = {
    /**
     * Get a value from chrome.storage.sync
     * @param key - The key to retrieve
     * @returns Promise resolving to the stored value or undefined
     */
    async get<K extends keyof StorageSchema>(key: K): Promise<StorageSchema[K] | undefined> {
        return new Promise((resolve) => {
            chrome.storage.sync.get(key, (result) => {
                resolve(result[key] as StorageSchema[K] | undefined);
            });
        });
    },

    /**
     * Set a value in chrome.storage.sync
     * @param key - The key to store
     * @param value - The value to store
     * @returns Promise resolving when the value is stored
     */
    async set<K extends keyof StorageSchema>(key: K, value: StorageSchema[K]): Promise<void> {
        return new Promise((resolve) => {
            chrome.storage.sync.set({ [key]: value }, () => {
                resolve();
            });
        });
    },
};

/**
 * Load settings from storage, returning defaults if not found
 * @returns Promise resolving to the current settings
 */
export async function loadSettings(): Promise<Settings> {
    const stored = await storage.get('settings');
    if (!stored) {
        return { ...defaultSettings };
    }
    // Merge with defaults to ensure all fields exist
    return {
        ...defaultSettings,
        ...stored,
        shortcuts: {
            ...defaultSettings.shortcuts,
            ...stored.shortcuts,
        },
    };
}

/**
 * Save settings to storage
 * @param settings - The settings to save
 * @returns Promise resolving when settings are saved
 */
export async function saveSettings(settings: Settings): Promise<void> {
    await storage.set('settings', settings);
}

/**
 * Maximum number of history items to store
 */
export const MAX_HISTORY_ITEMS = 50;

/**
 * Get all history items from storage
 * @returns Promise resolving to array of history items (empty array if none)
 */
export async function getHistory(): Promise<HistoryItem[]> {
    const history = await storage.get('history');
    return history ?? [];
}

/**
 * Add a new history item to storage
 * Enforces the 50 item limit by removing oldest items when exceeded
 * @param item - The history item to add
 * @returns Promise resolving when the item is added
 */
export async function addHistoryItem(item: HistoryItem): Promise<void> {
    const history = await getHistory();

    // Add new item at the beginning (most recent first)
    history.unshift(item);

    // Enforce 50 item limit by removing oldest items
    while (history.length > MAX_HISTORY_ITEMS) {
        history.pop();
    }

    await storage.set('history', history);
}

/**
 * Delete a history item by ID
 * @param id - The ID of the history item to delete
 * @returns Promise resolving to true if item was found and deleted, false otherwise
 */
export async function deleteHistoryItem(id: string): Promise<boolean> {
    const history = await getHistory();
    const initialLength = history.length;

    const filteredHistory = history.filter(item => item.id !== id);

    if (filteredHistory.length === initialLength) {
        // Item was not found
        return false;
    }

    await storage.set('history', filteredHistory);
    return true;
}

/**
 * Clear all history items
 * @returns Promise resolving when history is cleared
 */
export async function clearHistory(): Promise<void> {
    await storage.set('history', []);
}
