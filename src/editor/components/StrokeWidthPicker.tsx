/**
 * StrokeWidthPicker Component
 * Displays stroke width options for drawing tools
 * - Default mode: 2, 4, 6, 8, 16 pixels
 * - Highlight mode: 6, 8, 16, 32, 48 pixels
 * Requirements: 14.1, 14.2
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { getStrokeWidthOptions, StrokeWidthMode } from '../utils/strokeWidth';
import './StrokeWidthPicker.css';

export type { StrokeWidthMode } from '../utils/strokeWidth';

export interface StrokeWidthPickerProps {
    /** Currently selected stroke width */
    selectedWidth: number;
    /** Callback when stroke width is selected */
    onWidthChange: (width: number) => void;
    /** Mode determines which width options to display */
    mode?: StrokeWidthMode;
    /** Whether the picker is open */
    isOpen?: boolean;
    /** Callback to close the picker */
    onClose?: () => void;
}

export const StrokeWidthPicker: React.FC<StrokeWidthPickerProps> = ({
    selectedWidth,
    onWidthChange,
    mode = 'default',
    isOpen = true,
    onClose,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widthOptions = getStrokeWidthOptions(mode);

    // Handle click outside to close
    useEffect(() => {
        if (!isOpen || !onClose) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const handleWidthSelect = useCallback((width: number) => {
        onWidthChange(width);
    }, [onWidthChange]);

    if (!isOpen) return null;

    return (
        <div className="stroke-width-picker-panel" ref={containerRef}>
            <label className="stroke-width-picker-label">
                {mode === 'highlight' ? 'Highlight Width' : 'Stroke Width'}
            </label>
            <div className="stroke-width-picker-options">
                {widthOptions.map((width) => (
                    <button
                        key={width}
                        className={`stroke-width-option ${selectedWidth === width ? 'selected' : ''}`}
                        onClick={() => handleWidthSelect(width)}
                        aria-label={`Select stroke width ${width} pixels`}
                        aria-pressed={selectedWidth === width}
                    >
                        <div className="stroke-width-preview">
                            <div 
                                className="stroke-width-line"
                                style={{ height: `${Math.min(width, 24)}px` }}
                            />
                        </div>
                        <span className="stroke-width-value">{width}px</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default StrokeWidthPicker;
