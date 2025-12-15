import React, { useState, useEffect } from 'react';
import type { CaptureResult } from '../types';
import {
  captureVisible,
  startAreaSelection,
  openEditor,
} from '../services/messaging';

const CaptureTab: React.FC = () => {
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load last capture thumbnail from storage on mount
    chrome.storage.local.get('lastCapture', (result) => {
      if (result.lastCapture && typeof result.lastCapture === 'string') {
        setLastCapture(result.lastCapture);
      }
    });
  }, []);

  const handleCapture = async (mode: 'visible' | 'fullPage' | 'area' | 'desktop') => {
    setIsCapturing(true);
    setError(null);

    try {
      let response: CaptureResult;

      switch (mode) {
        case 'visible':
          response = await captureVisible();
          break;
        case 'fullPage':
          // For full page capture, close popup first to allow scrolling capture
          // The content script will handle the capture and open editor
          window.close();
          // Send message to background to start full page capture via content script
          chrome.runtime.sendMessage({ action: 'startFullPageCaptureFromPopup' });
          return;
        case 'area':
          // For area capture, we need to trigger the content script
          // and close the popup to allow selection
          await startAreaSelection();
          window.close(); // Close popup to allow area selection
          return;
        case 'desktop':
          // For desktop capture, close popup and trigger screen capture
          window.close();
          chrome.runtime.sendMessage({ action: 'captureDesktopScreenshot' });
          return;
        default:
          response = await captureVisible();
      }

      if (response.success && response.imageDataUrl) {
        setLastCapture(response.imageDataUrl);
        // Store last capture for persistence
        chrome.storage.local.set({ lastCapture: response.imageDataUrl });
        // Store for editor and open it
        chrome.storage.local.set({ editorImage: response.imageDataUrl });
        await openEditor();
      } else if (response.error) {
        setError(response.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to capture screenshot';
      setError(errorMessage);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="capture-tab">
      <div className="capture-buttons">
        <button
          className="capture-button"
          onClick={() => handleCapture('visible')}
          disabled={isCapturing}
        >
          <span className="button-icon">📷</span>
          <span className="button-text">Visible Area</span>
        </button>
        
        <button
          className="capture-button"
          onClick={() => handleCapture('fullPage')}
          disabled={isCapturing}
        >
          <span className="button-icon">📄</span>
          <span className="button-text">Full Page</span>
        </button>
        
        <button
          className="capture-button"
          onClick={() => handleCapture('area')}
          disabled={isCapturing}
        >
          <span className="button-icon">✂️</span>
          <span className="button-text">Selected Area</span>
        </button>
        
        <button
          className="capture-button"
          onClick={() => handleCapture('desktop')}
          disabled={isCapturing}
        >
          <span className="button-icon">🖥️</span>
          <span className="button-text">Desktop</span>
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {lastCapture && (
        <div className="last-capture">
          <h3>Last Capture</h3>
          <img 
            src={lastCapture} 
            alt="Last captured screenshot" 
            className="capture-thumbnail"
          />
        </div>
      )}
    </div>
  );
};

export default CaptureTab;
