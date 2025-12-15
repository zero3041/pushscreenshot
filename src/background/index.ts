// Background service worker entry point
import { handleMessage, handleCommand } from './handlers';
import { defaultSettings, storage } from '../services/storage';
import { createContextMenus, handleContextMenuClick } from '../services/contextMenu';
import type { MessageType } from '../types';

console.log('PushScreenshot background service worker loaded');

/**
 * Initialize storage with default settings on extension install
 */
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('PushScreenshot extension installed:', details.reason);

    if (details.reason === 'install') {
        // Set default settings on first install
        const existingSettings = await storage.get('settings');
        if (!existingSettings) {
            await storage.set('settings', defaultSettings);
            console.log('Default settings initialized');
        }

        // Initialize empty history
        const existingHistory = await storage.get('history');
        if (!existingHistory) {
            await storage.set('history', []);
            console.log('History initialized');
        }
    }

    // Create context menus on install or update
    createContextMenus();
    console.log('Context menus created');
});

/**
 * Listen for context menu clicks
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
    handleContextMenuClick(info, tab).catch((error) => {
        console.error('Error handling context menu click:', error);
    });
});

/**
 * Listen for messages from popup, content script, or options page
 */
chrome.runtime.onMessage.addListener((message: MessageType, sender, sendResponse) => {
    // Handle the message asynchronously
    handleMessage(message, sender)
        .then(sendResponse)
        .catch((error) => {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message || 'Unknown error' });
        });

    // Return true to indicate we will send a response asynchronously
    return true;
});

/**
 * Listen for keyboard shortcut commands
 */
chrome.commands.onCommand.addListener((command) => {
    console.log('Command received:', command);
    handleCommand(command).catch((error) => {
        console.error('Error handling command:', error);
    });
});

export { };
