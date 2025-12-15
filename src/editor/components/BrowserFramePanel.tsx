/**
 * BrowserFramePanel Component
 * Panel for configuring browser frame settings
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4
 * - WHEN a user opens the "Border" panel THEN the Editor SHALL display browser frame options
 * - WHEN browser frame is enabled THEN the Editor SHALL allow selecting frame style: Mac, Windows, URL on top, URL on bottom
 * - WHEN browser frame is enabled THEN the Editor SHALL allow toggling "Include URL" option
 * - WHEN browser frame is enabled THEN the Editor SHALL allow toggling "Include Date" option
 */

import React, { useCallback } from 'react';
import type { BrowserFrameConfig } from '../types/editor';
import './BrowserFramePanel.css';

export type BrowserFrameStyle = BrowserFrameConfig['style'];

export interface BrowserFramePanelProps {
    /** Current browser frame configuration */
    config: BrowserFrameConfig | null;
    /** Callback when configuration changes */
    onChange: (config: BrowserFrameConfig | null) => void;
    /** Current page URL (optional, for display) */
    pageUrl?: string;
    /** Optional className for custom styling */
    className?: string;
}

/** Default browser frame configuration */
const DEFAULT_CONFIG: BrowserFrameConfig = {
    enabled: false,
    style: 'mac',
    includeUrl: true,
    includeDate: false,
    url: '',
};

/** Style options with labels and icons */
const STYLE_OPTIONS: { value: BrowserFrameStyle; label: string; icon: string }[] = [
    { value: 'mac', label: 'Mac', icon: 'mac' },
    { value: 'windows', label: 'Windows', icon: 'windows' },
    { value: 'url_top', label: 'URL Top', icon: 'url-top' },
    { value: 'url_bottom', label: 'URL Bottom', icon: 'url-bottom' },
];

export const BrowserFramePanel: React.FC<BrowserFramePanelProps> = ({
    config,
    onChange,
    pageUrl = '',
    className = '',
}) => {
    // Use default config if none provided
    const currentConfig = config || DEFAULT_CONFIG;
    const { enabled, style, includeUrl, includeDate, url } = currentConfig;

    // Handle enable/disable toggle
    const handleToggle = useCallback(() => {
        const newEnabled = !enabled;
        onChange({
            ...currentConfig,
            enabled: newEnabled,
            // Set default URL from page URL when enabling
            url: newEnabled && !currentConfig.url ? pageUrl : currentConfig.url,
        });
    }, [enabled, currentConfig, onChange, pageUrl]);

    // Handle style change
    const handleStyleChange = useCallback((newStyle: BrowserFrameStyle) => {
        onChange({
            ...currentConfig,
            style: newStyle,
        });
    }, [currentConfig, onChange]);

    // Handle include URL toggle
    const handleIncludeUrlChange = useCallback(() => {
        onChange({
            ...currentConfig,
            includeUrl: !includeUrl,
        });
    }, [currentConfig, includeUrl, onChange]);

    // Handle include date toggle
    const handleIncludeDateChange = useCallback(() => {
        onChange({
            ...currentConfig,
            includeDate: !includeDate,
        });
    }, [currentConfig, includeDate, onChange]);

    // Handle URL input change
    const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({
            ...currentConfig,
            url: e.target.value,
        });
    }, [currentConfig, onChange]);

    return (
        <div className={`browser-frame-panel ${className}`}>
            <div className="browser-frame-panel-header">
                <h3 className="browser-frame-panel-title">Browser Frame</h3>
                <label className="browser-frame-toggle">
                    <input
                        type="checkbox"
                        className="browser-frame-toggle-input"
                        checked={enabled}
                        onChange={handleToggle}
                        aria-label="Enable browser frame"
                    />
                    <span className="browser-frame-toggle-slider" />
                </label>
            </div>

            <div className={`browser-frame-panel-content ${!enabled ? 'disabled' : ''}`}>
                {/* Style Selector */}
                <div className="browser-frame-style-section">
                    <span className="browser-frame-section-label">Frame Style</span>
                    <div className="browser-frame-style-grid">
                        {STYLE_OPTIONS.map(({ value, label, icon }) => (
                            <button
                                key={value}
                                type="button"
                                className={`browser-frame-style-btn ${style === value ? 'selected' : ''}`}
                                onClick={() => handleStyleChange(value)}
                                aria-label={`Style: ${label}`}
                                aria-pressed={style === value}
                            >
                                <span className={`browser-frame-style-icon ${icon}`} />
                                <span className="browser-frame-style-label">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* URL Input */}
                <div className="browser-frame-url-section">
                    <span className="browser-frame-section-label">URL</span>
                    <input
                        type="text"
                        className="browser-frame-url-input"
                        value={url || ''}
                        onChange={handleUrlChange}
                        placeholder="https://example.com"
                        aria-label="Browser frame URL"
                    />
                </div>

                {/* Checkboxes */}
                <div className="browser-frame-options-section">
                    <label className="browser-frame-checkbox">
                        <input
                            type="checkbox"
                            checked={includeUrl}
                            onChange={handleIncludeUrlChange}
                            aria-label="Include URL in frame"
                        />
                        <span className="browser-frame-checkbox-mark" />
                        <span className="browser-frame-checkbox-label">Include URL</span>
                    </label>

                    <label className="browser-frame-checkbox">
                        <input
                            type="checkbox"
                            checked={includeDate}
                            onChange={handleIncludeDateChange}
                            aria-label="Include date in frame"
                        />
                        <span className="browser-frame-checkbox-mark" />
                        <span className="browser-frame-checkbox-label">Include Date</span>
                    </label>
                </div>

                {/* Preview */}
                <div className="browser-frame-preview-section">
                    <span className="browser-frame-section-label">Preview</span>
                    <div className="browser-frame-preview">
                        <BrowserFramePreview
                            style={style}
                            includeUrl={includeUrl}
                            url={url || 'https://example.com'}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

/** Mini preview component for browser frame */
const BrowserFramePreview: React.FC<{
    style: BrowserFrameStyle;
    includeUrl: boolean;
    url: string;
}> = ({ style, includeUrl }) => {
    const isMac = style === 'mac' || style === 'url_top' || style === 'url_bottom';
    const showUrl = style === 'url_top' || style === 'url_bottom' || includeUrl;

    return (
        <div className={`browser-frame-preview-frame ${isMac ? 'mac' : 'windows'}`}>
            <div className="browser-frame-preview-header">
                {isMac ? (
                    <div className="browser-frame-preview-buttons mac">
                        <span className="btn close" />
                        <span className="btn minimize" />
                        <span className="btn maximize" />
                    </div>
                ) : (
                    <div className="browser-frame-preview-buttons windows">
                        <span className="btn minimize">−</span>
                        <span className="btn maximize">□</span>
                        <span className="btn close">×</span>
                    </div>
                )}
            </div>
            {showUrl && (
                <div className="browser-frame-preview-urlbar">
                    <span className="lock-icon">🔒</span>
                    <span className="url-text">example.com</span>
                </div>
            )}
            <div className="browser-frame-preview-content">
                <span>Screenshot</span>
            </div>
        </div>
    );
};

export default BrowserFramePanel;
