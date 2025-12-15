/**
 * PaddingPanel Component
 * Panel for configuring padding settings around the screenshot
 * 
 * Requirements: 12.1, 12.2, 12.3
 * - WHEN a user opens the "Border" panel THEN the Editor SHALL display padding configuration
 * - WHEN padding is enabled THEN the Editor SHALL allow selecting padding color
 * - WHEN padding is enabled THEN the Editor SHALL allow adjusting padding size (0-200px)
 */

import React, { useCallback, useState } from 'react';
import type { PaddingConfig } from '../types/editor';
import { PADDING_CONSTRAINTS } from '../types/editor';
import { clampPaddingSize } from '../utils/paddingUtils';
import ColorPicker from './ColorPicker';
import './PaddingPanel.css';

// Re-export for backwards compatibility
export { clampPaddingSize };

export interface PaddingPanelProps {
    /** Current padding configuration */
    config: PaddingConfig | null;
    /** Callback when configuration changes */
    onChange: (config: PaddingConfig | null) => void;
    /** Recent colors for color picker */
    recentColors: string[];
    /** Callback when a color is used */
    onColorUsed?: (color: string) => void;
    /** Optional className for custom styling */
    className?: string;
}

/** Default padding configuration */
const DEFAULT_CONFIG: PaddingConfig = {
    enabled: false,
    color: '#ffffff',
    size: 20,
};

export const PaddingPanel: React.FC<PaddingPanelProps> = ({
    config,
    onChange,
    recentColors,
    onColorUsed,
    className = '',
}) => {
    const [showColorPicker, setShowColorPicker] = useState(false);
    
    // Use default config if none provided
    const currentConfig = config || DEFAULT_CONFIG;
    const { enabled, color, size } = currentConfig;

    // Handle enable/disable toggle
    const handleToggle = useCallback(() => {
        const newEnabled = !enabled;
        onChange({
            ...currentConfig,
            enabled: newEnabled,
        });
    }, [enabled, currentConfig, onChange]);

    // Handle color change
    const handleColorChange = useCallback((newColor: string) => {
        onChange({
            ...currentConfig,
            color: newColor,
        });
    }, [currentConfig, onChange]);

    // Handle color picker toggle
    const handleColorPickerToggle = useCallback(() => {
        setShowColorPicker(prev => !prev);
    }, []);

    // Handle color picker close
    const handleColorPickerClose = useCallback(() => {
        setShowColorPicker(false);
    }, []);

    // Handle size change from slider
    const handleSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newSize = clampPaddingSize(parseInt(e.target.value, 10));
        onChange({
            ...currentConfig,
            size: newSize,
        });
    }, [currentConfig, onChange]);

    // Handle size change from input
    const handleSizeInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow empty input for typing
        if (value === '') return;
        
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
            const newSize = clampPaddingSize(numValue);
            onChange({
                ...currentConfig,
                size: newSize,
            });
        }
    }, [currentConfig, onChange]);

    return (
        <div className={`padding-panel ${className}`}>
            <div className="padding-panel-header">
                <h3 className="padding-panel-title">Padding</h3>
                <label className="padding-toggle">
                    <input
                        type="checkbox"
                        className="padding-toggle-input"
                        checked={enabled}
                        onChange={handleToggle}
                        aria-label="Enable padding"
                    />
                    <span className="padding-toggle-slider" />
                </label>
            </div>

            <div className={`padding-panel-content ${!enabled ? 'disabled' : ''}`}>
                {/* Color Selector */}
                <div className="padding-color-section">
                    <span className="padding-section-label">Color</span>
                    <div className="padding-color-row">
                        <button
                            type="button"
                            className="padding-color-btn"
                            style={{ backgroundColor: color }}
                            onClick={handleColorPickerToggle}
                            aria-label="Select padding color"
                            aria-expanded={showColorPicker}
                        />
                        <span className="padding-color-value">{color}</span>
                    </div>
                    {showColorPicker && (
                        <div className="padding-color-picker-container">
                            <ColorPicker
                                selectedColor={color}
                                onColorChange={handleColorChange}
                                recentColors={recentColors}
                                onColorUsed={onColorUsed}
                                isOpen={showColorPicker}
                                onClose={handleColorPickerClose}
                            />
                        </div>
                    )}
                </div>

                {/* Size Slider */}
                <div className="padding-slider-section">
                    <div className="padding-slider-header">
                        <span className="padding-section-label">Size</span>
                        <div className="padding-size-input-wrapper">
                            <input
                                type="number"
                                className="padding-size-input"
                                value={size}
                                onChange={handleSizeInputChange}
                                min={PADDING_CONSTRAINTS.minSize}
                                max={PADDING_CONSTRAINTS.maxSize}
                                aria-label="Padding size in pixels"
                            />
                            <span className="padding-size-unit">px</span>
                        </div>
                    </div>
                    <input
                        type="range"
                        className="padding-slider"
                        min={PADDING_CONSTRAINTS.minSize}
                        max={PADDING_CONSTRAINTS.maxSize}
                        value={size}
                        onChange={handleSizeChange}
                        aria-label="Padding size slider"
                    />
                </div>

                {/* Preview */}
                <div className="padding-preview-section">
                    <span className="padding-section-label">Preview</span>
                    <div className="padding-preview">
                        <div 
                            className="padding-preview-outer"
                            style={{ 
                                backgroundColor: color,
                                padding: `${Math.min(size / 4, 20)}px`
                            }}
                        >
                            <div className="padding-preview-inner">
                                <span>Image</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaddingPanel;
