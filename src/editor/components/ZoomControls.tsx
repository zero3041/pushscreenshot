/**
 * ZoomControls Component
 * Displays zoom in/out buttons and current zoom percentage
 * 
 * Requirements: 16.1, 16.2, 16.3
 * - WHEN a user clicks "Zoom In" THEN the Editor SHALL increase canvas zoom level
 * - WHEN a user clicks "Zoom Out" THEN the Editor SHALL decrease canvas zoom level
 * - THE Editor SHALL display current zoom percentage between zoom buttons
 */

import React from 'react';
import './ZoomControls.css';

export interface ZoomControlsProps {
    /** Current zoom level (1.0 = 100%) */
    zoom: number;
    /** Current zoom as percentage (100 = 100%) */
    zoomPercentage: number;
    /** Callback to zoom in */
    onZoomIn: () => void;
    /** Callback to zoom out */
    onZoomOut: () => void;
    /** Callback to reset zoom to 100% */
    onResetZoom?: () => void;
    /** Whether zoom in is available */
    canZoomIn: boolean;
    /** Whether zoom out is available */
    canZoomOut: boolean;
    /** Optional className for custom styling */
    className?: string;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
    zoomPercentage,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    canZoomIn,
    canZoomOut,
    className = '',
}) => {
    const handleResetClick = () => {
        if (onResetZoom) {
            onResetZoom();
        }
    };

    return (
        <div className={`zoom-controls ${className}`}>
            <button
                className="zoom-button zoom-out-button"
                onClick={onZoomOut}
                disabled={!canZoomOut}
                aria-label="Zoom out"
                title="Zoom out"
            >
                <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 16 16" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path 
                        d="M3 8H13" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round"
                    />
                </svg>
            </button>
            
            <button
                className="zoom-percentage"
                onClick={handleResetClick}
                disabled={!onResetZoom}
                aria-label={`Current zoom: ${zoomPercentage}%. Click to reset to 100%`}
                title={onResetZoom ? 'Click to reset to 100%' : `Current zoom: ${zoomPercentage}%`}
            >
                {zoomPercentage}%
            </button>
            
            <button
                className="zoom-button zoom-in-button"
                onClick={onZoomIn}
                disabled={!canZoomIn}
                aria-label="Zoom in"
                title="Zoom in"
            >
                <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 16 16" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path 
                        d="M8 3V13M3 8H13" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round"
                    />
                </svg>
            </button>
        </div>
    );
};

export default ZoomControls;
