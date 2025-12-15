/**
 * Toolbar Component
 * Main toolbar with all annotation tools, submenus, and action buttons
 * 
 * Requirements: All tool requirements, 15.1-15.5
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ToolType, ToolSettings } from './types/editor';
import { ColorPicker } from './components/ColorPicker';
import { StrokeWidthPicker } from './components/StrokeWidthPicker';
import { FontPicker } from './components/FontPicker';
import { StickerPicker } from './components/StickerPicker';
import { ZoomControls } from './components/ZoomControls';
import type { StickerItem } from './assets/stickers';
import './Toolbar.css';

// Tool configuration with grouping
interface ToolConfig {
  type: ToolType;
  label: string;
  icon: string;
  group?: string;
}

// Tool groups for submenus
const SHAPE_TOOLS: ToolConfig[] = [
  { type: 'rectangle', label: 'Rectangle', icon: '▢', group: 'shapes' },
  { type: 'ellipse', label: 'Ellipse', icon: '○', group: 'shapes' },
  { type: 'curve', label: 'Freehand', icon: '〰', group: 'shapes' },
  { type: 'highlight', label: 'Highlight', icon: '🖍', group: 'shapes' },
];

const ARROW_TOOLS: ToolConfig[] = [
  { type: 'big_head_arrow', label: 'Big Arrow', icon: '➤', group: 'arrows' },
  { type: 'line_arrow', label: 'Line Arrow', icon: '→', group: 'arrows' },
  { type: 'bezier_arrow', label: 'Curved Arrow', icon: '↝', group: 'arrows' },
  { type: 'line', label: 'Line', icon: '─', group: 'arrows' },
];

const TEXT_TOOLS: ToolConfig[] = [
  { type: 'text', label: 'Text', icon: 'T', group: 'text' },
  { type: 'callout', label: 'Callout', icon: '💬', group: 'text' },
];

// Main tools (not in submenus)
const MAIN_TOOLS: ToolConfig[] = [
  { type: 'select', label: 'Select', icon: '↖' },
];

// Image editing tools
const IMAGE_TOOLS: ToolConfig[] = [
  { type: 'resize', label: 'Resize', icon: '⤢' },
  { type: 'crop', label: 'Crop', icon: '⬚' },
];

export interface ToolbarProps {
  selectedTool: ToolType;
  toolSettings: ToolSettings;
  onToolChange: (tool: ToolType) => void;
  onSettingsChange: (settings: Partial<ToolSettings>) => void;
  // History actions
  onUndo: () => void;
  onRedo: () => void;
  onClearAll: () => void;
  onDeleteSelected: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  // Export actions
  onDownload: () => void;
  onCopy: () => void;
  onUpload: () => void;
  isUploading?: boolean;
  // Zoom
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  // Recent colors
  recentColors: string[];
  onColorUsed: (color: string) => void;
  // Sticker selection
  onStickerSelect: (sticker: StickerItem) => void;
  // Sequence
  onRestartSequence: () => void;
  // Panel toggles
  onToggleWatermark?: () => void;
  onToggleBrowserFrame?: () => void;
  onTogglePadding?: () => void;
  showWatermarkPanel?: boolean;
  showBrowserFramePanel?: boolean;
  showPaddingPanel?: boolean;
}

type OpenSubmenu = 'shapes' | 'arrows' | 'text' | 'color' | 'stroke' | 'font' | 'sticker' | null;

const Toolbar: React.FC<ToolbarProps> = ({
  selectedTool,
  toolSettings,
  onToolChange,
  onSettingsChange,
  onUndo,
  onRedo,
  onClearAll,
  onDeleteSelected,
  canUndo,
  canRedo,
  hasSelection,
  onDownload,
  onCopy,
  onUpload,
  isUploading = false,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  canZoomIn,
  canZoomOut,
  recentColors,
  onColorUsed,
  onStickerSelect,
  onRestartSequence,
  onToggleWatermark,
  onToggleBrowserFrame,
  onTogglePadding,
  showWatermarkPanel = false,
  showBrowserFramePanel = false,
  showPaddingPanel = false,
}) => {
  const [openSubmenu, setOpenSubmenu] = useState<OpenSubmenu>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close submenu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setOpenSubmenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get the currently selected tool from a group
  const getSelectedFromGroup = (tools: ToolConfig[]): ToolConfig => {
    const found = tools.find(t => t.type === selectedTool);
    return found || tools[0];
  };

  // Check if any tool in a group is selected
  const isGroupActive = (tools: ToolConfig[]): boolean => {
    return tools.some(t => t.type === selectedTool);
  };

  const handleToolSelect = useCallback((tool: ToolType) => {
    onToolChange(tool);
    setOpenSubmenu(null);
  }, [onToolChange]);

  const toggleSubmenu = useCallback((submenu: OpenSubmenu) => {
    setOpenSubmenu(prev => prev === submenu ? null : submenu);
  }, []);

  const handleColorChange = useCallback((color: string) => {
    onSettingsChange({ color });
  }, [onSettingsChange]);

  const handleStrokeWidthChange = useCallback((strokeWidth: number) => {
    onSettingsChange({ strokeWidth });
    setOpenSubmenu(null);
  }, [onSettingsChange]);

  const handleFontFamilyChange = useCallback((fontFamily: string) => {
    onSettingsChange({ fontFamily });
  }, [onSettingsChange]);

  const handleFontSizeChange = useCallback((fontSize: number) => {
    onSettingsChange({ fontSize });
  }, [onSettingsChange]);

  const handleStickerSelect = useCallback((sticker: StickerItem) => {
    onStickerSelect(sticker);
    onToolChange('sticker');
    setOpenSubmenu(null);
  }, [onStickerSelect, onToolChange]);

  // Determine stroke width mode based on selected tool
  const strokeWidthMode = selectedTool === 'highlight' ? 'highlight' : 'default';

  // Check if current tool needs font settings
  const needsFontSettings = selectedTool === 'text' || selectedTool === 'callout';

  // Get current shape/arrow/text tool for display
  const currentShapeTool = getSelectedFromGroup(SHAPE_TOOLS);
  const currentArrowTool = getSelectedFromGroup(ARROW_TOOLS);
  const currentTextTool = getSelectedFromGroup(TEXT_TOOLS);

  return (
    <div className="toolbar" ref={toolbarRef}>
      {/* Image Tools Section */}
      <div className="toolbar-section toolbar-image-tools">
        {IMAGE_TOOLS.map(tool => (
          <button
            key={tool.type}
            className={`toolbar-btn ${selectedTool === tool.type ? 'active' : ''}`}
            onClick={() => handleToolSelect(tool.type)}
            title={tool.label}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-label">{tool.label}</span>
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      {/* Main Tools Section */}
      <div className="toolbar-section toolbar-main-tools">
        {/* Select Tool */}
        {MAIN_TOOLS.map(tool => (
          <button
            key={tool.type}
            className={`toolbar-btn ${selectedTool === tool.type ? 'active' : ''}`}
            onClick={() => handleToolSelect(tool.type)}
            title={tool.label}
          >
            <span className="tool-icon">{tool.icon}</span>
          </button>
        ))}

        {/* Shapes Dropdown */}
        <div className="toolbar-dropdown">
          <button
            className={`toolbar-btn toolbar-dropdown-trigger ${isGroupActive(SHAPE_TOOLS) ? 'active' : ''}`}
            onClick={() => toggleSubmenu('shapes')}
            title="Shapes"
          >
            <span className="tool-icon">{currentShapeTool.icon}</span>
            <span className="dropdown-arrow">▾</span>
          </button>
          {openSubmenu === 'shapes' && (
            <div className="toolbar-submenu">
              {SHAPE_TOOLS.map(tool => (
                <button
                  key={tool.type}
                  className={`toolbar-submenu-item ${selectedTool === tool.type ? 'active' : ''}`}
                  onClick={() => handleToolSelect(tool.type)}
                >
                  <span className="tool-icon">{tool.icon}</span>
                  <span className="tool-label">{tool.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Arrows Dropdown */}
        <div className="toolbar-dropdown">
          <button
            className={`toolbar-btn toolbar-dropdown-trigger ${isGroupActive(ARROW_TOOLS) ? 'active' : ''}`}
            onClick={() => toggleSubmenu('arrows')}
            title="Arrows & Lines"
          >
            <span className="tool-icon">{currentArrowTool.icon}</span>
            <span className="dropdown-arrow">▾</span>
          </button>
          {openSubmenu === 'arrows' && (
            <div className="toolbar-submenu">
              {ARROW_TOOLS.map(tool => (
                <button
                  key={tool.type}
                  className={`toolbar-submenu-item ${selectedTool === tool.type ? 'active' : ''}`}
                  onClick={() => handleToolSelect(tool.type)}
                >
                  <span className="tool-icon">{tool.icon}</span>
                  <span className="tool-label">{tool.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Text Dropdown */}
        <div className="toolbar-dropdown">
          <button
            className={`toolbar-btn toolbar-dropdown-trigger ${isGroupActive(TEXT_TOOLS) ? 'active' : ''}`}
            onClick={() => toggleSubmenu('text')}
            title="Text Tools"
          >
            <span className="tool-icon">{currentTextTool.icon}</span>
            <span className="dropdown-arrow">▾</span>
          </button>
          {openSubmenu === 'text' && (
            <div className="toolbar-submenu">
              {TEXT_TOOLS.map(tool => (
                <button
                  key={tool.type}
                  className={`toolbar-submenu-item ${selectedTool === tool.type ? 'active' : ''}`}
                  onClick={() => handleToolSelect(tool.type)}
                >
                  <span className="tool-icon">{tool.icon}</span>
                  <span className="tool-label">{tool.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Other Tools */}
        <button
          className={`toolbar-btn ${selectedTool === 'blur' ? 'active' : ''}`}
          onClick={() => handleToolSelect('blur')}
          title="Blur"
        >
          <span className="tool-icon">▦</span>
        </button>

        {/* Sequence Tool with Restart */}
        <div className="toolbar-tool-group">
          <button
            className={`toolbar-btn ${selectedTool === 'list' ? 'active' : ''}`}
            onClick={() => handleToolSelect('list')}
            title="Sequence Markers"
          >
            <span className="tool-icon">①</span>
          </button>
          {selectedTool === 'list' && (
            <button
              className="toolbar-btn toolbar-btn-small"
              onClick={onRestartSequence}
              title="Restart Sequence"
            >
              ↺
            </button>
          )}
        </div>

        {/* Sticker Dropdown */}
        <div className="toolbar-dropdown">
          <button
            className={`toolbar-btn toolbar-dropdown-trigger ${selectedTool === 'sticker' ? 'active' : ''}`}
            onClick={() => toggleSubmenu('sticker')}
            title="Stickers"
          >
            <span className="tool-icon">😀</span>
            <span className="dropdown-arrow">▾</span>
          </button>
          {openSubmenu === 'sticker' && (
            <StickerPicker
              onStickerSelect={handleStickerSelect}
              isOpen={true}
              onClose={() => setOpenSubmenu(null)}
            />
          )}
        </div>

        <button
          className={`toolbar-btn ${selectedTool === 'insert_image' ? 'active' : ''}`}
          onClick={() => handleToolSelect('insert_image')}
          title="Insert Image"
        >
          <span className="tool-icon">🖼</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Style Settings Section */}
      <div className="toolbar-section toolbar-style-settings">
        {/* Color Picker */}
        <div className="toolbar-dropdown">
          <button
            className="toolbar-btn toolbar-color-btn"
            onClick={() => toggleSubmenu('color')}
            title="Color"
          >
            <span 
              className="color-preview" 
              style={{ backgroundColor: toolSettings.color }}
            />
            <span className="dropdown-arrow">▾</span>
          </button>
          {openSubmenu === 'color' && (
            <ColorPicker
              selectedColor={toolSettings.color}
              onColorChange={handleColorChange}
              recentColors={recentColors}
              onColorUsed={onColorUsed}
              isOpen={true}
              onClose={() => setOpenSubmenu(null)}
            />
          )}
        </div>

        {/* Stroke Width Picker */}
        <div className="toolbar-dropdown">
          <button
            className="toolbar-btn"
            onClick={() => toggleSubmenu('stroke')}
            title="Stroke Width"
          >
            <span className="stroke-preview">
              <span 
                className="stroke-line" 
                style={{ height: `${Math.min(toolSettings.strokeWidth, 8)}px` }}
              />
            </span>
            <span className="stroke-value">{toolSettings.strokeWidth}px</span>
            <span className="dropdown-arrow">▾</span>
          </button>
          {openSubmenu === 'stroke' && (
            <StrokeWidthPicker
              selectedWidth={toolSettings.strokeWidth}
              onWidthChange={handleStrokeWidthChange}
              mode={strokeWidthMode}
              isOpen={true}
              onClose={() => setOpenSubmenu(null)}
            />
          )}
        </div>

        {/* Font Picker (only for text tools) */}
        {needsFontSettings && (
          <div className="toolbar-dropdown">
            <button
              className="toolbar-btn toolbar-font-btn"
              onClick={() => toggleSubmenu('font')}
              title="Font Settings"
            >
              <span className="font-preview" style={{ fontFamily: toolSettings.fontFamily }}>
                Aa
              </span>
              <span className="font-size">{toolSettings.fontSize}px</span>
              <span className="dropdown-arrow">▾</span>
            </button>
            {openSubmenu === 'font' && (
              <FontPicker
                selectedFontFamily={toolSettings.fontFamily}
                selectedFontSize={toolSettings.fontSize}
                onFontFamilyChange={handleFontFamilyChange}
                onFontSizeChange={handleFontSizeChange}
                isOpen={true}
                onClose={() => setOpenSubmenu(null)}
              />
            )}
          </div>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* Effects Section */}
      <div className="toolbar-section toolbar-effects">
        <button
          className={`toolbar-btn ${showWatermarkPanel ? 'active' : ''}`}
          onClick={onToggleWatermark}
          title="Watermark"
        >
          <span className="tool-icon">💧</span>
          <span className="tool-label">Watermark</span>
        </button>
        <button
          className={`toolbar-btn ${showBrowserFramePanel ? 'active' : ''}`}
          onClick={onToggleBrowserFrame}
          title="Browser Frame"
        >
          <span className="tool-icon">🖥</span>
          <span className="tool-label">Frame</span>
        </button>
        <button
          className={`toolbar-btn ${showPaddingPanel ? 'active' : ''}`}
          onClick={onTogglePadding}
          title="Padding"
        >
          <span className="tool-icon">⬜</span>
          <span className="tool-label">Padding</span>
        </button>
      </div>

      <div className="toolbar-spacer" />

      {/* Actions Section */}
      <div className="toolbar-section toolbar-actions">
        <button
          className="toolbar-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <span className="tool-icon">↩</span>
          <span className="tool-label">Undo</span>
        </button>
        <button
          className="toolbar-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <span className="tool-icon">↪</span>
          <span className="tool-label">Redo</span>
        </button>
        <button
          className="toolbar-btn"
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          title="Delete Selected (Del)"
        >
          <span className="tool-icon">🗑</span>
        </button>
        <button
          className="toolbar-btn toolbar-btn-danger"
          onClick={onClearAll}
          disabled={!canUndo}
          title="Clear All"
        >
          <span className="tool-icon">✕</span>
          <span className="tool-label">Clear</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Zoom Controls */}
      <div className="toolbar-section toolbar-zoom">
        <ZoomControls
          zoom={zoom}
          zoomPercentage={Math.round(zoom * 100)}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onResetZoom={onResetZoom}
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
        />
      </div>

      <div className="toolbar-divider" />

      {/* Export Section */}
      <div className="toolbar-section toolbar-export">
        <button
          className="toolbar-btn toolbar-btn-primary"
          onClick={onCopy}
          title="Copy to Clipboard"
        >
          <span className="tool-icon">📋</span>
          <span className="tool-label">Copy</span>
        </button>
        <button
          className="toolbar-btn toolbar-btn-primary"
          onClick={onDownload}
          title="Download"
        >
          <span className="tool-icon">⬇</span>
          <span className="tool-label">Download</span>
        </button>
        <button
          className="toolbar-btn toolbar-btn-primary"
          onClick={onUpload}
          disabled={isUploading}
          title="Upload to ImgBB"
        >
          <span className="tool-icon">{isUploading ? '⏳' : '☁'}</span>
          <span className="tool-label">{isUploading ? 'Uploading...' : 'Upload'}</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
