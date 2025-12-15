import React from 'react';
import type { ToolType, ToolSettings } from '../types';

interface ToolbarProps {
  selectedTool: ToolType;
  toolSettings: ToolSettings;
  onToolChange: (tool: ToolType) => void;
  onSettingsChange: (settings: Partial<ToolSettings>) => void;
  onUndo: () => void;
  onClearAll: () => void;
  onDownload: () => void;
  onCopy: () => void;
  onUpload: () => void;
  canUndo: boolean;
  isUploading?: boolean;
}

const tools: { type: ToolType; label: string; icon: string }[] = [
  { type: 'select', label: 'Select', icon: '↖' },
  { type: 'rectangle', label: 'Rectangle', icon: '▢' },
  { type: 'arrow', label: 'Arrow', icon: '→' },
  { type: 'text', label: 'Text', icon: 'T' },
  { type: 'blur', label: 'Blur', icon: '▦' },
];

const colors = [
  '#ff0000', // Red
  '#ff9900', // Orange
  '#ffff00', // Yellow
  '#00ff00', // Green
  '#00ffff', // Cyan
  '#0000ff', // Blue
  '#9900ff', // Purple
  '#ff00ff', // Magenta
  '#000000', // Black
  '#ffffff', // White
];

const strokeWidths = [1, 2, 3, 5, 8];
const fontSizes = [12, 14, 16, 20, 24, 32];

const Toolbar: React.FC<ToolbarProps> = ({
  selectedTool,
  toolSettings,
  onToolChange,
  onSettingsChange,
  onUndo,
  onClearAll,
  onDownload,
  onCopy,
  onUpload,
  canUndo,
  isUploading = false,
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-section toolbar-tools">
        {tools.map(tool => (
          <button
            key={tool.type}
            className={`toolbar-btn ${selectedTool === tool.type ? 'active' : ''}`}
            onClick={() => onToolChange(tool.type)}
            title={tool.label}
          >
            <span className="tool-icon">{tool.icon}</span>
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section toolbar-colors">
        <label className="toolbar-label">Color:</label>
        <div className="color-picker">
          {colors.map(color => (
            <button
              key={color}
              className={`color-btn ${toolSettings.color === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onSettingsChange({ color })}
              title={color}
            />
          ))}
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section toolbar-stroke">
        <label className="toolbar-label">Stroke:</label>
        <select
          value={toolSettings.strokeWidth}
          onChange={(e) => onSettingsChange({ strokeWidth: Number(e.target.value) })}
          className="toolbar-select"
        >
          {strokeWidths.map(width => (
            <option key={width} value={width}>{width}px</option>
          ))}
        </select>
      </div>

      {selectedTool === 'text' && (
        <>
          <div className="toolbar-divider" />
          <div className="toolbar-section toolbar-font">
            <label className="toolbar-label">Font Size:</label>
            <select
              value={toolSettings.fontSize}
              onChange={(e) => onSettingsChange({ fontSize: Number(e.target.value) })}
              className="toolbar-select"
            >
              {fontSizes.map(size => (
                <option key={size} value={size}>{size}px</option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="toolbar-spacer" />

      <div className="toolbar-section toolbar-actions">
        <button
          className="toolbar-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↩ Undo
        </button>
        <button
          className="toolbar-btn"
          onClick={onClearAll}
          disabled={!canUndo}
          title="Clear All"
        >
          ✕ Clear
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section toolbar-export">
        <button
          className="toolbar-btn toolbar-btn-primary"
          onClick={onCopy}
          title="Copy to Clipboard"
        >
          📋 Copy
        </button>
        <button
          className="toolbar-btn toolbar-btn-primary"
          onClick={onDownload}
          title="Download"
        >
          ⬇ Download
        </button>
        <button
          className="toolbar-btn toolbar-btn-primary"
          onClick={onUpload}
          disabled={isUploading}
          title="Upload to ImgBB"
        >
          {isUploading ? '⏳ Uploading...' : '☁ Upload'}
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
