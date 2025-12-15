/**
 * ResizePanel Component
 * Panel for resizing images with width/height inputs and proportional option
 * 
 * Requirements: 1.1, 1.2
 * - WHEN a user clicks the "Resize" button THEN the Editor SHALL display a panel with width and height input fields
 * - WHEN a user enters new dimensions with "Proportional" checked THEN the Editor SHALL maintain aspect ratio automatically
 */

import React, { useState, useCallback, useRef, useLayoutEffect } from 'react';
import {
    MIN_DIMENSION,
    MAX_DIMENSION,
    calculateProportionalHeight,
    calculateProportionalWidth,
    clampDimension,
} from '../utils/resize';
import './ResizePanel.css';

// Re-export for backwards compatibility
export { calculateProportionalHeight, calculateProportionalWidth, clampDimension };

export interface ResizePanelProps {
    /** Current image width */
    currentWidth: number;
    /** Current image height */
    currentHeight: number;
    /** Callback when resize is confirmed */
    onResize: (width: number, height: number) => void;
    /** Callback when panel is cancelled/closed */
    onCancel: () => void;
    /** Optional className for custom styling */
    className?: string;
}

export const ResizePanel: React.FC<ResizePanelProps> = ({
    currentWidth,
    currentHeight,
    onResize,
    onCancel,
    className = '',
}) => {
    const [width, setWidth] = useState<number>(currentWidth);
    const [height, setHeight] = useState<number>(currentHeight);
    const [proportional, setProportional] = useState<boolean>(true);
    const [widthInput, setWidthInput] = useState<string>(String(currentWidth));
    const [heightInput, setHeightInput] = useState<string>(String(currentHeight));
    
    // Track previous dimensions to detect external changes
    const prevDimensionsRef = useRef({ width: currentWidth, height: currentHeight });

    // Sync state when current dimensions change externally (using useLayoutEffect to avoid flicker)
    useLayoutEffect(() => {
        if (prevDimensionsRef.current.width !== currentWidth || 
            prevDimensionsRef.current.height !== currentHeight) {
            setWidth(currentWidth);
            setHeight(currentHeight);
            setWidthInput(String(currentWidth));
            setHeightInput(String(currentHeight));
            prevDimensionsRef.current = { width: currentWidth, height: currentHeight };
        }
    }, [currentWidth, currentHeight]);

    // Handle width change
    const handleWidthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        setWidthInput(inputValue);

        const newWidth = parseInt(inputValue, 10);
        if (!isNaN(newWidth) && newWidth > 0) {
            const clampedWidth = clampDimension(newWidth);
            setWidth(clampedWidth);

            if (proportional) {
                const newHeight = calculateProportionalHeight(clampedWidth, currentWidth, currentHeight);
                const clampedHeight = clampDimension(newHeight);
                setHeight(clampedHeight);
                setHeightInput(String(clampedHeight));
            }
        }
    }, [proportional, currentWidth, currentHeight]);

    // Handle height change
    const handleHeightChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        setHeightInput(inputValue);

        const newHeight = parseInt(inputValue, 10);
        if (!isNaN(newHeight) && newHeight > 0) {
            const clampedHeight = clampDimension(newHeight);
            setHeight(clampedHeight);

            if (proportional) {
                const newWidth = calculateProportionalWidth(clampedHeight, currentWidth, currentHeight);
                const clampedWidth = clampDimension(newWidth);
                setWidth(clampedWidth);
                setWidthInput(String(clampedWidth));
            }
        }
    }, [proportional, currentWidth, currentHeight]);

    // Handle proportional toggle
    const handleProportionalChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setProportional(e.target.checked);
    }, []);

    // Handle resize button click
    const handleResize = useCallback(() => {
        const finalWidth = clampDimension(width);
        const finalHeight = clampDimension(height);
        onResize(finalWidth, finalHeight);
    }, [width, height, onResize]);

    // Handle input blur - validate and clamp values
    const handleWidthBlur = useCallback(() => {
        const parsed = parseInt(widthInput, 10);
        if (isNaN(parsed) || parsed < MIN_DIMENSION) {
            setWidthInput(String(width));
        } else {
            const clamped = clampDimension(parsed);
            setWidth(clamped);
            setWidthInput(String(clamped));
        }
    }, [widthInput, width]);

    const handleHeightBlur = useCallback(() => {
        const parsed = parseInt(heightInput, 10);
        if (isNaN(parsed) || parsed < MIN_DIMENSION) {
            setHeightInput(String(height));
        } else {
            const clamped = clampDimension(parsed);
            setHeight(clamped);
            setHeightInput(String(clamped));
        }
    }, [heightInput, height]);

    // Check if dimensions have changed
    const hasChanges = width !== currentWidth || height !== currentHeight;

    return (
        <div className={`resize-panel ${className}`}>
            <div className="resize-panel-header">
                <h3 className="resize-panel-title">Resize Image</h3>
            </div>

            <div className="resize-panel-content">
                <div className="resize-input-group">
                    <label htmlFor="resize-width" className="resize-label">
                        Width
                    </label>
                    <div className="resize-input-wrapper">
                        <input
                            id="resize-width"
                            type="number"
                            className="resize-input"
                            value={widthInput}
                            onChange={handleWidthChange}
                            onBlur={handleWidthBlur}
                            min={MIN_DIMENSION}
                            max={MAX_DIMENSION}
                            aria-label="Width in pixels"
                        />
                        <span className="resize-unit">px</span>
                    </div>
                </div>

                <div className="resize-input-group">
                    <label htmlFor="resize-height" className="resize-label">
                        Height
                    </label>
                    <div className="resize-input-wrapper">
                        <input
                            id="resize-height"
                            type="number"
                            className="resize-input"
                            value={heightInput}
                            onChange={handleHeightChange}
                            onBlur={handleHeightBlur}
                            min={MIN_DIMENSION}
                            max={MAX_DIMENSION}
                            aria-label="Height in pixels"
                        />
                        <span className="resize-unit">px</span>
                    </div>
                </div>

                <div className="resize-checkbox-group">
                    <label className="resize-checkbox-label">
                        <input
                            type="checkbox"
                            className="resize-checkbox"
                            checked={proportional}
                            onChange={handleProportionalChange}
                            aria-label="Maintain aspect ratio"
                        />
                        <span className="resize-checkbox-icon">
                            {proportional ? (
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <rect x="1" y="1" width="14" height="14" rx="2" fill="#4a9eff" stroke="#4a9eff" strokeWidth="2"/>
                                    <path d="M4 8L7 11L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <rect x="1" y="1" width="14" height="14" rx="2" stroke="#666" strokeWidth="2"/>
                                </svg>
                            )}
                        </span>
                        <span className="resize-checkbox-text">Proportional</span>
                    </label>
                </div>

                <div className="resize-info">
                    <span className="resize-info-text">
                        Original: {currentWidth} × {currentHeight} px
                    </span>
                </div>
            </div>

            <div className="resize-panel-actions">
                <button
                    className="resize-button resize-button-cancel"
                    onClick={onCancel}
                    type="button"
                >
                    Cancel
                </button>
                <button
                    className="resize-button resize-button-apply"
                    onClick={handleResize}
                    disabled={!hasChanges}
                    type="button"
                >
                    Resize
                </button>
            </div>
        </div>
    );
};

export default ResizePanel;
