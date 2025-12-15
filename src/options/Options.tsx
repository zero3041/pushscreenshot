import React, { useState, useEffect } from 'react';
import type { Settings } from '../types';
import { loadSettings, saveSettings, defaultSettings } from '../services/storage';
import { validateApiKey, maskApiKey } from '../utils/validation';

const Options: React.FC = () => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // API Key section state
  const [newApiKey, setNewApiKey] = useState('');
  const [testingApiKey, setTestingApiKey] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings()
      .then((loaded) => {
        setSettings(loaded);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load settings:', error);
        setLoading(false);
      });
  }, []);

  // Show message temporarily
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Handle API key save
  const handleSaveApiKey = async () => {
    if (!newApiKey.trim()) {
      showMessage('error', 'Please enter an API key');
      return;
    }

    if (!validateApiKey(newApiKey)) {
      showMessage('error', 'Invalid API key format. Must be 32 alphanumeric characters.');
      return;
    }

    setSaving(true);
    try {
      const updatedSettings = { ...settings, imgbbApiKey: newApiKey };
      await saveSettings(updatedSettings);
      setSettings(updatedSettings);
      setNewApiKey('');
      showMessage('success', 'API key saved successfully');
    } catch (_error) {
      showMessage('error', 'Failed to save API key');
    } finally {
      setSaving(false);
    }
  };

  // Handle API key test
  const handleTestApiKey = async () => {
    const keyToTest = newApiKey.trim() || settings.imgbbApiKey;
    
    if (!keyToTest) {
      showMessage('error', 'No API key to test');
      return;
    }

    if (!validateApiKey(keyToTest)) {
      showMessage('error', 'Invalid API key format');
      return;
    }

    setTestingApiKey(true);
    try {
      // Test by making a simple request to ImgBB API
      // We'll use a minimal 1x1 transparent PNG for testing
      const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const formData = new FormData();
      formData.append('key', keyToTest);
      formData.append('image', testImage);

      const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', 'API key is valid!');
      } else {
        showMessage('error', 'Invalid API key');
      }
    } catch (_error) {
      showMessage('error', 'Failed to test API key. Check your connection.');
    } finally {
      setTestingApiKey(false);
    }
  };

  // Handle settings change
  const handleSettingChange = async <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    
    try {
      await saveSettings(updatedSettings);
    } catch (_error) {
      showMessage('error', 'Failed to save settings');
    }
  };

  // Handle shortcut change
  const handleShortcutChange = async (
    shortcutKey: keyof Settings['shortcuts'],
    value: string
  ) => {
    const updatedShortcuts = { ...settings.shortcuts, [shortcutKey]: value };
    const updatedSettings = { ...settings, shortcuts: updatedShortcuts };
    setSettings(updatedSettings);
    
    try {
      await saveSettings(updatedSettings);
    } catch (_error) {
      showMessage('error', 'Failed to save shortcut');
    }
  };

  if (loading) {
    return (
      <div className="options">
        <h1>PushScreenshot Settings</h1>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="options">
      <h1>PushScreenshot Settings</h1>
      
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* API Key Section */}
      <section className="settings-section">
        <h2>ImgBB API Key</h2>
        <p className="section-description">
          Enter your ImgBB API key to enable image uploads. 
          Get a free API key at <a href="https://api.imgbb.com/" target="_blank" rel="noopener noreferrer">api.imgbb.com</a>
        </p>
        
        {settings.imgbbApiKey && (
          <div className="current-key">
            <label>Current API Key:</label>
            <span className="masked-key">{maskApiKey(settings.imgbbApiKey)}</span>
          </div>
        )}
        
        <div className="api-key-input">
          <input
            type="text"
            placeholder="Enter new API key"
            value={newApiKey}
            onChange={(e) => setNewApiKey(e.target.value)}
            maxLength={32}
          />
          <div className="api-key-buttons">
            <button 
              onClick={handleSaveApiKey} 
              disabled={saving || !newApiKey.trim()}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button 
              onClick={handleTestApiKey} 
              disabled={testingApiKey}
              className="btn-secondary"
            >
              {testingApiKey ? 'Testing...' : 'Test API Key'}
            </button>
          </div>
        </div>
      </section>

      {/* General Settings Section */}
      <section className="settings-section">
        <h2>General Settings</h2>
        
        <div className="setting-item">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={settings.autoUpload}
              onChange={(e) => handleSettingChange('autoUpload', e.target.checked)}
            />
            <span>Auto-upload after capture</span>
          </label>
          <p className="setting-description">Automatically upload screenshots to ImgBB after capturing</p>
        </div>

        <div className="setting-item">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={settings.autoCopyLink}
              onChange={(e) => handleSettingChange('autoCopyLink', e.target.checked)}
            />
            <span>Auto-copy link after upload</span>
          </label>
          <p className="setting-description">Automatically copy the image URL to clipboard after upload</p>
        </div>
      </section>

      {/* Image Settings Section */}
      <section className="settings-section">
        <h2>Image Settings</h2>
        
        <div className="setting-item">
          <label>Image Format:</label>
          <select
            value={settings.imageFormat}
            onChange={(e) => handleSettingChange('imageFormat', e.target.value as 'png' | 'jpeg')}
          >
            <option value="png">PNG (lossless)</option>
            <option value="jpeg">JPEG (smaller size)</option>
          </select>
        </div>

        {settings.imageFormat === 'jpeg' && (
          <div className="setting-item">
            <label>JPEG Quality: {settings.imageQuality}%</label>
            <input
              type="range"
              min="10"
              max="100"
              value={settings.imageQuality}
              onChange={(e) => handleSettingChange('imageQuality', parseInt(e.target.value))}
            />
          </div>
        )}
      </section>

      {/* Video Settings Section */}
      <section className="settings-section">
        <h2>Video Settings</h2>
        
        <div className="setting-item">
          <label>Video Format:</label>
          <select
            value={settings.videoFormat}
            onChange={(e) => handleSettingChange('videoFormat', e.target.value as 'webm' | 'mp4')}
          >
            <option value="webm">WebM (better quality)</option>
            <option value="mp4">MP4 (better compatibility)</option>
          </select>
        </div>
      </section>

      {/* Keyboard Shortcuts Section */}
      <section className="settings-section">
        <h2>Keyboard Shortcuts</h2>
        <p className="section-description">
          Configure keyboard shortcuts for quick access. Use combinations like Alt+Shift+V.
        </p>
        
        <div className="shortcuts-grid">
          <div className="shortcut-item">
            <label>Capture Visible Area:</label>
            <input
              type="text"
              value={settings.shortcuts.captureVisible}
              onChange={(e) => handleShortcutChange('captureVisible', e.target.value)}
              placeholder="e.g., Alt+Shift+V"
            />
          </div>
          
          <div className="shortcut-item">
            <label>Capture Full Page:</label>
            <input
              type="text"
              value={settings.shortcuts.captureFullPage}
              onChange={(e) => handleShortcutChange('captureFullPage', e.target.value)}
              placeholder="e.g., Alt+Shift+F"
            />
          </div>
          
          <div className="shortcut-item">
            <label>Capture Selected Area:</label>
            <input
              type="text"
              value={settings.shortcuts.captureArea}
              onChange={(e) => handleShortcutChange('captureArea', e.target.value)}
              placeholder="e.g., Alt+Shift+A"
            />
          </div>
          
          <div className="shortcut-item">
            <label>Start Recording:</label>
            <input
              type="text"
              value={settings.shortcuts.startRecording}
              onChange={(e) => handleShortcutChange('startRecording', e.target.value)}
              placeholder="e.g., Alt+Shift+R"
            />
          </div>
        </div>
        
        <p className="shortcut-note">
          Note: Chrome may override some shortcuts. You can also configure shortcuts in 
          <a href="chrome://extensions/shortcuts" target="_blank" rel="noopener noreferrer"> chrome://extensions/shortcuts</a>
        </p>
      </section>
    </div>
  );
};

export default Options;
