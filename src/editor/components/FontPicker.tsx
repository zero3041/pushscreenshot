/**
 * FontPicker Component
 * Displays font family dropdown and font size selector with +/- buttons
 * Requirements: 4.1, 4.2, 4.5
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FONT_FAMILIES, FONT_SIZE_CONSTRAINTS } from '../types/editor';
import { clampFontSize } from '../utils/fonts';
import './FontPicker.css';

export interface FontPickerProps {
    /** Currently selected font family */
    selectedFontFamily: string;
    /** Currently selected font size */
    selectedFontSize: number;
    /** Callback when font family is selected */
    onFontFamilyChange: (fontFamily: string) => void;
    /** Callback when font size is changed */
    onFontSizeChange: (fontSize: number) => void;
    /** Whether the picker is open */
    isOpen?: boolean;
    /** Callback to close the picker */
    onClose?: () => void;
}

export const FontPicker: React.FC<FontPickerProps> = ({
    selectedFontFamily,
    selectedFontSize,
    onFontFamilyChange,
    onFontSizeChange,
    isOpen = true,
    onClose,
}) => {
    const [fontSizeInput, setFontSizeInput] = useState(String(selectedFontSize));
    const [fontSizeError, setFontSizeError] = useState(false);
    const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close the main panel
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

    // Close font dropdown when clicking outside
    useEffect(() => {
        if (!isFontDropdownOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsFontDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isFontDropdownOpen]);

    const handleFontFamilySelect = useCallback((fontFamily: string) => {
        onFontFamilyChange(fontFamily);
        setIsFontDropdownOpen(false);
    }, [onFontFamilyChange]);

    const handleFontSizeInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFontSizeInput(value);

        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= FONT_SIZE_CONSTRAINTS.min && numValue <= FONT_SIZE_CONSTRAINTS.max) {
            setFontSizeError(false);
            onFontSizeChange(numValue);
        } else {
            setFontSizeError(value.length > 0);
        }
    }, [onFontSizeChange]);

    const handleFontSizeInputBlur = useCallback(() => {
        // Reset to current font size if invalid
        const numValue = parseInt(fontSizeInput, 10);
        if (isNaN(numValue) || numValue < FONT_SIZE_CONSTRAINTS.min || numValue > FONT_SIZE_CONSTRAINTS.max) {
            setFontSizeInput(String(selectedFontSize));
            setFontSizeError(false);
        }
    }, [fontSizeInput, selectedFontSize]);

    const handleFontSizeInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    }, []);

    const handleIncrementFontSize = useCallback(() => {
        const newSize = clampFontSize(selectedFontSize + FONT_SIZE_CONSTRAINTS.step);
        onFontSizeChange(newSize);
        setFontSizeInput(String(newSize));
    }, [selectedFontSize, onFontSizeChange]);

    const handleDecrementFontSize = useCallback(() => {
        const newSize = clampFontSize(selectedFontSize - FONT_SIZE_CONSTRAINTS.step);
        onFontSizeChange(newSize);
        setFontSizeInput(String(newSize));
    }, [selectedFontSize, onFontSizeChange]);

    const toggleFontDropdown = useCallback(() => {
        setIsFontDropdownOpen(prev => !prev);
    }, []);

    if (!isOpen) return null;

    // Derive display value - use input state for editing, but show prop value when not focused
    const displayFontSize = fontSizeError ? fontSizeInput : String(selectedFontSize);

    return (
        <div className="font-picker-panel" ref={containerRef}>
            {/* Font Family Selector */}
            <div className="font-picker-section">
                <label className="font-picker-label">Font Family</label>
                <div className="font-picker-dropdown-container" ref={dropdownRef}>
                    <button
                        className="font-picker-dropdown-trigger"
                        onClick={toggleFontDropdown}
                        aria-expanded={isFontDropdownOpen}
                        aria-haspopup="listbox"
                        style={{ fontFamily: selectedFontFamily }}
                    >
                        <span className="font-picker-dropdown-text">{selectedFontFamily}</span>
                        <span className="font-picker-dropdown-arrow">
                            {isFontDropdownOpen ? '▲' : '▼'}
                        </span>
                    </button>
                    {isFontDropdownOpen && (
                        <div className="font-picker-dropdown-menu" role="listbox">
                            {FONT_FAMILIES.map((fontFamily) => (
                                <button
                                    key={fontFamily}
                                    className={`font-picker-dropdown-item ${selectedFontFamily === fontFamily ? 'selected' : ''}`}
                                    onClick={() => handleFontFamilySelect(fontFamily)}
                                    style={{ fontFamily }}
                                    role="option"
                                    aria-selected={selectedFontFamily === fontFamily}
                                >
                                    {fontFamily}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Font Size Selector */}
            <div className="font-picker-section">
                <label className="font-picker-label">Font Size</label>
                <div className="font-picker-size-controls">
                    <button
                        className="font-picker-size-button"
                        onClick={handleDecrementFontSize}
                        disabled={selectedFontSize <= FONT_SIZE_CONSTRAINTS.min}
                        aria-label="Decrease font size"
                    >
                        −
                    </button>
                    <input
                        type="text"
                        className={`font-picker-size-input ${fontSizeError ? 'error' : ''}`}
                        value={fontSizeError ? fontSizeInput : displayFontSize}
                        onChange={handleFontSizeInputChange}
                        onBlur={handleFontSizeInputBlur}
                        onKeyDown={handleFontSizeInputKeyDown}
                        aria-label="Font size"
                    />
                    <span className="font-picker-size-unit">px</span>
                    <button
                        className="font-picker-size-button"
                        onClick={handleIncrementFontSize}
                        disabled={selectedFontSize >= FONT_SIZE_CONSTRAINTS.max}
                        aria-label="Increase font size"
                    >
                        +
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FontPicker;
