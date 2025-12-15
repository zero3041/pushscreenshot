/**
 * WatermarkPanel Component
 * Panel for configuring watermark settings
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 * - WHEN a user opens the "Watermark" panel THEN the Editor SHALL display watermark configuration options
 * - WHEN watermark is enabled THEN the Editor SHALL allow uploading a custom watermark image
 * - WHEN watermark is configured THEN the Editor SHALL allow selecting position
 * - WHEN watermark is configured THEN the Editor SHALL allow adjusting size (20%-200%)
 * - WHEN watermark is configured THEN the Editor SHALL allow adjusting opacity (0%-100%)
 */

import React, { useCallback, useRef } from 'react';
import type { WatermarkConfig } from '../types/editor';
import { WATERMARK_CONSTRAINTS } from '../types/editor';
import { clampWatermarkSize, clampWatermarkOpacity } from '../utils/watermarkUtils';
import './WatermarkPanel.css';

// Re-export for backwards compatibility
export { clampWatermarkSize, clampWatermarkOpacity };

export type WatermarkPosition = WatermarkConfig['position'];

export interface WatermarkPanelProps {
    /** Current watermark configuration */
    config: WatermarkConfig | null;
    /** Callback when configuration changes */
    onChange: (config: WatermarkConfig | null) => void;
    /** Optional className for custom styling */
    className?: string;
}

/** Default watermark configuration */
const DEFAULT_CONFIG: WatermarkConfig = {
    enabled: false,
    imageData: '',
    position: 'bottom_right',
    size: 100,
    opacity: 100,
};

/** Position options with grid placement */
const POSITION_OPTIONS: { value: WatermarkPosition; gridArea: string }[] = [
    { value: 'top_left', gridArea: '1 / 1' },
    { value: 'top_right', gridArea: '1 / 3' },
    { value: 'center', gridArea: '1 / 2 / 3 / 3' },
    { value: 'bottom_left', gridArea: '2 / 1' },
    { value: 'bottom_right', gridArea: '2 / 3' },
];

export const WatermarkPanel: React.FC<WatermarkPanelProps> = ({
    config,
    onChange,
    className = '',
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Use default config if none provided
    const currentConfig = config || DEFAULT_CONFIG;
    const { enabled, imageData, position, size, opacity } = currentConfig;

    // Handle enable/disable toggle
    const handleToggle = useCallback(() => {
        const newEnabled = !enabled;
        onChange({
            ...currentConfig,
            enabled: newEnabled,
        });
    }, [enabled, currentConfig, onChange]);

    // Handle image upload
    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            console.error('Invalid file type. Please select an image.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            if (result) {
                onChange({
                    ...currentConfig,
                    imageData: result,
                    enabled: true,
                });
            }
        };
        reader.readAsDataURL(file);

        // Reset input value to allow re-uploading same file
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [currentConfig, onChange]);

    // Handle click on upload area
    const handleUploadClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // Handle remove image
    const handleRemoveImage = useCallback(() => {
        onChange({
            ...currentConfig,
            imageData: '',
        });
    }, [currentConfig, onChange]);

    // Handle position change
    const handlePositionChange = useCallback((newPosition: WatermarkPosition) => {
        onChange({
            ...currentConfig,
            position: newPosition,
        });
    }, [currentConfig, onChange]);

    // Handle size change
    const handleSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newSize = clampWatermarkSize(parseInt(e.target.value, 10));
        onChange({
            ...currentConfig,
            size: newSize,
        });
    }, [currentConfig, onChange]);

    // Handle opacity change
    const handleOpacityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newOpacity = clampWatermarkOpacity(parseInt(e.target.value, 10));
        onChange({
            ...currentConfig,
            opacity: newOpacity,
        });
    }, [currentConfig, onChange]);

    return (
        <div className={`watermark-panel ${className}`}>
            <div className="watermark-panel-header">
                <h3 className="watermark-panel-title">Watermark</h3>
                <label className="watermark-toggle">
                    <input
                        type="checkbox"
                        className="watermark-toggle-input"
                        checked={enabled}
                        onChange={handleToggle}
                        aria-label="Enable watermark"
                    />
                    <span className="watermark-toggle-slider" />
                </label>
            </div>

            <div className={`watermark-panel-content ${!enabled ? 'disabled' : ''}`}>
                {/* Image Upload Section */}
                <div className="watermark-upload-section">
                    <span className="watermark-section-label">Watermark Image</span>
                    <div
                        className={`watermark-upload-area ${imageData ? 'has-image' : ''}`}
                        onClick={handleUploadClick}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleUploadClick()}
                        aria-label="Upload watermark image"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="watermark-upload-input"
                            accept="image/*"
                            onChange={handleImageUpload}
                            aria-hidden="true"
                        />
                        {imageData ? (
                            <>
                                <img
                                    src={imageData}
                                    alt="Watermark preview"
                                    className="watermark-preview"
                                />
                                <div className="watermark-preview-actions">
                                    <button
                                        type="button"
                                        className="watermark-preview-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleUploadClick();
                                        }}
                                    >
                                        Change
                                    </button>
                                    <button
                                        type="button"
                                        className="watermark-preview-btn remove"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveImage();
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <svg
                                    className="watermark-upload-icon"
                                    width="32"
                                    height="32"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                <span className="watermark-upload-text">
                                    Click to upload image
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Position Selector */}
                <div className="watermark-position-section">
                    <span className="watermark-section-label">Position</span>
                    <div className="watermark-position-grid">
                        {POSITION_OPTIONS.map(({ value, gridArea }) => (
                            <button
                                key={value}
                                type="button"
                                className={`watermark-position-btn ${value === 'center' ? 'center' : ''} ${position === value ? 'selected' : ''}`}
                                style={{ gridArea }}
                                onClick={() => handlePositionChange(value)}
                                aria-label={`Position: ${value.replace('_', ' ')}`}
                                aria-pressed={position === value}
                            >
                                <span className="watermark-position-dot" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Size Slider */}
                <div className="watermark-slider-section">
                    <div className="watermark-slider-header">
                        <span className="watermark-section-label">Size</span>
                        <span className="watermark-slider-value">{size}%</span>
                    </div>
                    <input
                        type="range"
                        className="watermark-slider"
                        min={WATERMARK_CONSTRAINTS.minSize}
                        max={WATERMARK_CONSTRAINTS.maxSize}
                        value={size}
                        onChange={handleSizeChange}
                        aria-label="Watermark size"
                    />
                </div>

                {/* Opacity Slider */}
                <div className="watermark-slider-section">
                    <div className="watermark-slider-header">
                        <span className="watermark-section-label">Opacity</span>
                        <span className="watermark-slider-value">{opacity}%</span>
                    </div>
                    <input
                        type="range"
                        className="watermark-slider"
                        min={WATERMARK_CONSTRAINTS.minOpacity}
                        max={WATERMARK_CONSTRAINTS.maxOpacity}
                        value={opacity}
                        onChange={handleOpacityChange}
                        aria-label="Watermark opacity"
                    />
                </div>

                {/* Warning if no image */}
                {enabled && !imageData && (
                    <div className="watermark-no-image">
                        Please upload a watermark image
                    </div>
                )}
            </div>
        </div>
    );
};

export default WatermarkPanel;
