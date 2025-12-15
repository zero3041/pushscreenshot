/**
 * ColorPicker Component
 * Displays 40 preset colors, hex input, and recent colors section
 * Requirements: 13.1, 13.2, 13.3
 */

import React, { useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import { PRESET_COLORS } from '../types/editor';
import { parseColor, formatHexColor, isValidColor } from '../utils/colors';
import './ColorPicker.css';

export interface ColorPickerProps {
    /** Currently selected color */
    selectedColor: string;
    /** Callback when color is selected */
    onColorChange: (color: string) => void;
    /** Recent colors list (max 5) */
    recentColors: string[];
    /** Callback when a color is used (to update recent colors) */
    onColorUsed?: (color: string) => void;
    /** Whether the picker is open */
    isOpen?: boolean;
    /** Callback to close the picker */
    onClose?: () => void;
}

/**
 * Convert any color format to hex for display in input
 */
function colorToHex(color: string): string {
    const parsed = parseColor(color);
    if (!parsed) return '#FF0000';
    return formatHexColor(parsed);
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
    selectedColor,
    onColorChange,
    recentColors,
    onColorUsed,
    isOpen = true,
    onClose,
}) => {
    const [hexInput, setHexInput] = useState(() => colorToHex(selectedColor));
    const [hexError, setHexError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const prevSelectedColorRef = useRef(selectedColor);

    // Update hex input when selected color changes externally (using useLayoutEffect to avoid flicker)
    useLayoutEffect(() => {
        if (prevSelectedColorRef.current !== selectedColor) {
            setHexInput(colorToHex(selectedColor));
            setHexError(false);
            prevSelectedColorRef.current = selectedColor;
        }
    }, [selectedColor]);

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

    const handleColorSelect = useCallback((color: string) => {
        onColorChange(color);
        onColorUsed?.(color);
    }, [onColorChange, onColorUsed]);

    const handleHexInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        
        // Ensure # prefix
        if (!value.startsWith('#')) {
            value = '#' + value;
        }
        
        setHexInput(value);
        
        // Validate and apply if valid
        if (isValidColor(value)) {
            setHexError(false);
            onColorChange(value);
            onColorUsed?.(value);
        } else {
            setHexError(value.length > 1); // Show error only if user has typed something
        }
    }, [onColorChange, onColorUsed]);

    const handleHexInputBlur = useCallback(() => {
        // Reset to current color if invalid
        if (hexError || !isValidColor(hexInput)) {
            setHexInput(colorToHex(selectedColor));
            setHexError(false);
        }
    }, [hexError, hexInput, selectedColor]);

    const handleHexInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    }, []);

    if (!isOpen) return null;

    return (
        <div className="color-picker-panel" ref={containerRef}>
            {/* Preset Colors Grid - 40 colors in 5 rows of 8 */}
            <div className="color-picker-section">
                <div className="color-picker-grid">
                    {PRESET_COLORS.map((color, index) => {
                        const parsed = parseColor(color);
                        const parsedSelected = parseColor(selectedColor);
                        const isSelected = parsed && parsedSelected && 
                            parsed.r === parsedSelected.r && 
                            parsed.g === parsedSelected.g && 
                            parsed.b === parsedSelected.b;
                        
                        return (
                            <button
                                key={index}
                                className={`color-picker-swatch ${isSelected ? 'selected' : ''}`}
                                style={{ backgroundColor: color }}
                                onClick={() => handleColorSelect(color)}
                                title={colorToHex(color)}
                                aria-label={`Select color ${colorToHex(color)}`}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Hex Input */}
            <div className="color-picker-section">
                <label className="color-picker-label">Hex Color</label>
                <div className="color-picker-hex-row">
                    <div 
                        className="color-picker-preview"
                        style={{ backgroundColor: hexError ? '#ccc' : selectedColor }}
                    />
                    <input
                        type="text"
                        className={`color-picker-hex-input ${hexError ? 'error' : ''}`}
                        value={hexInput}
                        onChange={handleHexInputChange}
                        onBlur={handleHexInputBlur}
                        onKeyDown={handleHexInputKeyDown}
                        placeholder="#FF0000"
                        maxLength={9} // #RRGGBBAA
                        aria-label="Hex color input"
                    />
                </div>
            </div>

            {/* Recent Colors */}
            {recentColors.length > 0 && (
                <div className="color-picker-section">
                    <label className="color-picker-label">Recent Colors</label>
                    <div className="color-picker-recent">
                        {recentColors.map((color, index) => {
                            const parsed = parseColor(color);
                            const parsedSelected = parseColor(selectedColor);
                            const isSelected = parsed && parsedSelected && 
                                parsed.r === parsedSelected.r && 
                                parsed.g === parsedSelected.g && 
                                parsed.b === parsedSelected.b;
                            
                            return (
                                <button
                                    key={index}
                                    className={`color-picker-swatch recent ${isSelected ? 'selected' : ''}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => handleColorSelect(color)}
                                    title={colorToHex(color)}
                                    aria-label={`Select recent color ${colorToHex(color)}`}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ColorPicker;
