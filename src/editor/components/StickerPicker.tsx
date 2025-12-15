/**
 * StickerPicker Component
 * Displays sticker grid panel organized by categories
 * Requirements: 8.1
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { STICKER_CATEGORIES } from '../assets/stickers';
import type { StickerItem, StickerCategory } from '../assets/stickers';
import './StickerPicker.css';

export interface StickerPickerProps {
  /** Callback when a sticker is selected */
  onStickerSelect: (sticker: StickerItem) => void;
  /** Whether the picker is open */
  isOpen?: boolean;
  /** Callback to close the picker */
  onClose?: () => void;
}

export const StickerPicker: React.FC<StickerPickerProps> = ({
  onStickerSelect,
  isOpen = true,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>(
    STICKER_CATEGORIES[0]?.id || ''
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleStickerClick = useCallback(
    (sticker: StickerItem) => {
      onStickerSelect(sticker);
    },
    [onStickerSelect]
  );

  const handleCategoryClick = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
  }, []);

  const activeStickers =
    STICKER_CATEGORIES.find((cat) => cat.id === activeCategory)?.stickers || [];

  if (!isOpen) return null;

  return (
    <div className="sticker-picker-panel" ref={containerRef}>
      {/* Category Tabs */}
      <div className="sticker-picker-tabs">
        {STICKER_CATEGORIES.map((category: StickerCategory) => (
          <button
            key={category.id}
            className={`sticker-picker-tab ${
              activeCategory === category.id ? 'active' : ''
            }`}
            onClick={() => handleCategoryClick(category.id)}
            title={category.name}
            aria-label={`${category.name} stickers`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Sticker Grid */}
      <div className="sticker-picker-grid">
        {activeStickers.map((sticker: StickerItem) => (
          <button
            key={sticker.id}
            className="sticker-picker-item"
            onClick={() => handleStickerClick(sticker)}
            title={sticker.name}
            aria-label={`Select ${sticker.name} sticker`}
            dangerouslySetInnerHTML={{ __html: sticker.svg }}
          />
        ))}
      </div>
    </div>
  );
};

export default StickerPicker;
