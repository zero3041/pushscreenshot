/**
 * Editor Component
 * Main editor component with annotation tools and export functionality
 * 
 * Requirements: All
 * - Full integration of all annotation tools, panels, and export functionality
 * - WHEN a user clicks "Copy" THEN the Editor SHALL copy the final image to clipboard
 * - WHEN a user clicks "Done" THEN the Editor SHALL save/upload the final image and close the editor
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
// Use editor types for Toolbar
import type { ToolType, ToolSettings, WatermarkConfig, BrowserFrameConfig, PaddingConfig } from './types/editor';
import { DEFAULT_TOOL_SETTINGS } from './types/editor';
// Use shared types for AnnotationCanvas compatibility
import type { Annotation, ToolType as SharedToolType, ToolSettings as SharedToolSettings } from '../types';
import Toolbar from './Toolbar';
import AnnotationCanvas from './AnnotationCanvas';
import type { AnnotationCanvasRef } from './AnnotationCanvas';
import { uploadToImgBB } from '../services/messaging';
import { useHistory } from './hooks/useHistory';
import { useRecentColors } from './hooks/useRecentColors';
import { useZoom } from './hooks/useZoom';
import { restartSequence } from './tools/SequenceTool';
import { setSelectedSticker } from './tools/StickerTool';
import type { StickerItem } from './assets/stickers';
import {
  ResizePanel,
  WatermarkPanel,
  BrowserFramePanel,
  PaddingPanel,
} from './components';
import { resizeImage } from './tools/ResizeTool';
import { cropImage, type CropSelection } from './tools/CropTool';
import {
  exportCanvasWithEffects,
  applyExportEffects,
  copyImageToClipboard,
  downloadImage,
  generateTimestampFilename,
  type ExportConfig,
} from './utils/export';
import './editor.css';

// Convert editor ToolType to shared ToolType for AnnotationCanvas
function toSharedToolType(tool: ToolType): SharedToolType {
  // Map new tool types to closest shared equivalents
  const sharedTools: SharedToolType[] = ['select', 'rectangle', 'arrow', 'text', 'blur'];
  if (sharedTools.includes(tool as SharedToolType)) {
    return tool as SharedToolType;
  }
  
  // Map new tools to closest shared equivalents
  if (['ellipse', 'curve', 'highlight', 'resize', 'crop'].includes(tool)) {
    return 'rectangle';
  }
  if (['big_head_arrow', 'line_arrow', 'bezier_arrow', 'line'].includes(tool)) {
    return 'arrow';
  }
  if (['callout', 'list'].includes(tool)) {
    return 'text';
  }
  
  return 'select';
}

// Convert editor ToolSettings to shared ToolSettings
function toSharedToolSettings(settings: ToolSettings): SharedToolSettings {
  return {
    color: settings.color,
    strokeWidth: settings.strokeWidth,
    fontSize: settings.fontSize,
  };
}

const Editor: React.FC = () => {
  const [imageData, setImageData] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState<ToolType>('select');
  const [toolSettings, setToolSettings] = useState<ToolSettings>(DEFAULT_TOOL_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ url: string; deleteUrl: string } | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<AnnotationCanvasRef>(null);

  // Export effect configurations
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig | null>(null);
  const [browserFrameConfig, setBrowserFrameConfig] = useState<BrowserFrameConfig | null>(null);
  const [paddingConfig, setPaddingConfig] = useState<PaddingConfig | null>(null);

  // Panel visibility states
  const [showResizePanel, setShowResizePanel] = useState(false);
  const [showWatermarkPanel, setShowWatermarkPanel] = useState(false);
  const [showBrowserFramePanel, setShowBrowserFramePanel] = useState(false);
  const [showPaddingPanel, setShowPaddingPanel] = useState(false);

  // Crop state
  const [isCropping, setIsCropping] = useState(false);
  const [cropSelection, setCropSelection] = useState<CropSelection | null>(null);

  // Use history hook for undo/redo
  const {
    state: annotations,
    pushState: pushAnnotations,
    undo,
    redo,
    canUndo,
    canRedo,
    clear: _clearHistory,
  } = useHistory<Annotation[]>([]);

  // Use recent colors hook
  const { recentColors, addRecentColor } = useRecentColors();

  // Use zoom hook
  const { zoom, zoomIn, zoomOut, resetZoom, canZoomIn, canZoomOut } = useZoom();

  // Load image from URL params or storage
  useEffect(() => {
    const loadImage = async () => {
      try {
        console.log('Editor: Starting to load image...');
        const urlParams = new URLSearchParams(window.location.search);
        const imageUrl = urlParams.get('image');
        
        let loadedImageData: string | null = null;
        
        if (imageUrl) {
          loadedImageData = decodeURIComponent(imageUrl);
          console.log('Editor: Loaded image from URL param');
        } else if (typeof chrome !== 'undefined' && chrome.storage) {
          const result = await chrome.storage.local.get(['editorImage', 'tempCapture']);
          console.log('Editor: Storage result keys:', Object.keys(result));
          
          if (result.editorImage && typeof result.editorImage === 'string') {
            loadedImageData = result.editorImage;
            await chrome.storage.local.remove('editorImage');
            console.log('Editor: Loaded image from editorImage storage');
          } else if (result.tempCapture && typeof result.tempCapture === 'string') {
            loadedImageData = result.tempCapture;
            await chrome.storage.local.remove('tempCapture');
            console.log('Editor: Loaded image from tempCapture storage');
          }
        }

        if (!loadedImageData) {
          setError('No image to edit. Please capture a screenshot first.');
          setIsLoading(false);
          return;
        }

        // Load image to get dimensions BEFORE setting state
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = loadedImageData!;
        });

        console.log('Editor: Image loaded, dimensions:', img.width, 'x', img.height);

        // Set both imageData and dimensions together
        setImageDimensions({ width: img.width, height: img.height });
        setImageData(loadedImageData);
        setIsLoading(false);
      } catch (err) {
        console.error('Editor: Failed to load image:', err);
        setError('Failed to load image');
        setIsLoading(false);
      }
    };

    loadImage();
  }, []);

  // Add annotation
  const addAnnotation = useCallback((annotation: Annotation) => {
    pushAnnotations([...annotations, annotation], 'add');
  }, [annotations, pushAnnotations]);

  // Handle undo
  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  // Handle redo
  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  // Clear all annotations
  const handleClearAll = useCallback(() => {
    if (annotations.length > 0) {
      pushAnnotations([], 'clear');
    }
  }, [annotations.length, pushAnnotations]);

  // Delete selected annotation
  const handleDeleteSelected = useCallback(() => {
    if (selectedAnnotationId) {
      const newAnnotations = annotations.filter(a => a.id !== selectedAnnotationId);
      pushAnnotations(newAnnotations, 'delete');
      setSelectedAnnotationId(null);
    }
  }, [selectedAnnotationId, annotations, pushAnnotations]);

  // Handle tool change
  const handleToolChange = useCallback((tool: ToolType) => {
    setSelectedTool(tool);
    // Clear selection when changing tools (except select)
    if (tool !== 'select') {
      setSelectedAnnotationId(null);
    }
    
    // Handle special tool actions
    if (tool === 'resize') {
      setShowResizePanel(true);
    } else if (tool === 'crop') {
      setIsCropping(true);
    }
    // Note: insert_image is handled directly by the tool when clicking on canvas
    
    // Close panels when switching to other tools
    if (tool !== 'resize') {
      setShowResizePanel(false);
    }
    if (tool !== 'crop') {
      setIsCropping(false);
      setCropSelection(null);
    }
  }, []);

  // Handle tool settings change
  const handleSettingsChange = useCallback((settings: Partial<ToolSettings>) => {
    setToolSettings(prev => ({ ...prev, ...settings }));
  }, []);

  // Handle sticker selection
  const handleStickerSelect = useCallback((sticker: StickerItem) => {
    setSelectedSticker(sticker);
    setSelectedTool('sticker');
  }, []);

  // Handle restart sequence
  const handleRestartSequence = useCallback(() => {
    restartSequence();
  }, []);

  // Handle resize
  const handleResize = useCallback(async (newWidth: number, newHeight: number) => {
    if (!imageData) return;

    try {
      const result = await resizeImage(imageData, {
        width: newWidth,
        height: newHeight,
      });

      setImageData(result.imageData);
      setImageDimensions({ width: result.width, height: result.height });
      setShowResizePanel(false);
      setSelectedTool('select');
    } catch (err) {
      console.error('Failed to resize image:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to resize image';
      setError(errorMessage);
    }
  }, [imageData]);

  // Handle resize cancel
  const handleResizeCancel = useCallback(() => {
    setShowResizePanel(false);
    setSelectedTool('select');
  }, []);

  // Handle crop apply
  const handleCropApply = useCallback(async () => {
    if (!imageData || !cropSelection) return;

    try {
      const result = await cropImage(
        imageData,
        { selection: cropSelection },
        imageDimensions.width,
        imageDimensions.height
      );

      setImageData(result.imageData);
      setImageDimensions({ width: result.width, height: result.height });
      setIsCropping(false);
      setCropSelection(null);
      setSelectedTool('select');
    } catch (err) {
      console.error('Failed to crop image:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to crop image';
      setError(errorMessage);
    }
  }, [imageData, cropSelection, imageDimensions]);

  // Handle crop cancel
  const handleCropCancel = useCallback(() => {
    setIsCropping(false);
    setCropSelection(null);
    setSelectedTool('select');
  }, []);

  // Toggle watermark panel
  const handleToggleWatermarkPanel = useCallback(() => {
    setShowWatermarkPanel(prev => !prev);
    setShowBrowserFramePanel(false);
    setShowPaddingPanel(false);
  }, []);

  // Toggle browser frame panel
  const handleToggleBrowserFramePanel = useCallback(() => {
    setShowBrowserFramePanel(prev => !prev);
    setShowWatermarkPanel(false);
    setShowPaddingPanel(false);
  }, []);

  // Toggle padding panel
  const handleTogglePaddingPanel = useCallback(() => {
    setShowPaddingPanel(prev => !prev);
    setShowWatermarkPanel(false);
    setShowBrowserFramePanel(false);
  }, []);

  // Build export configuration from current state
  const getExportConfig = useCallback((): ExportConfig => {
    return {
      watermark: watermarkConfig,
      browserFrame: browserFrameConfig,
      padding: paddingConfig,
      format: 'image/png',
      quality: 0.92,
    };
  }, [watermarkConfig, browserFrameConfig, paddingConfig]);

  // Export final image with annotations and all effects
  const handleExport = useCallback(async (): Promise<string | null> => {
    if (!imageData) return null;

    try {
      const fabricCanvas = canvasRef.current?.getCanvas();
      const exportConfig = getExportConfig();

      if (fabricCanvas) {
        // Export using Fabric.js canvas (includes all annotations)
        const result = await exportCanvasWithEffects(fabricCanvas, exportConfig);
        return result.dataUrl;
      } else {
        // Fallback: export base image with effects only
        const result = await applyExportEffects(imageData, exportConfig);
        return result.dataUrl;
      }
    } catch (err) {
      console.error('Failed to export image:', err);
      setError('Failed to export image. Please try again.');
      return null;
    }
  }, [imageData, getExportConfig]);

  // Download image with timestamp filename
  const handleDownload = useCallback(async () => {
    const dataUrl = await handleExport();
    if (!dataUrl) return;

    const filename = generateTimestampFilename('screenshot', 'png');
    downloadImage(dataUrl, filename);
  }, [handleExport]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    const dataUrl = await handleExport();
    if (!dataUrl) return;

    try {
      await copyImageToClipboard(dataUrl);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setError('Cannot copy to clipboard. Please try downloading instead.');
    }
  }, [handleExport]);

  // Upload to ImgBB
  const handleUpload = useCallback(async () => {
    const dataUrl = await handleExport();
    if (!dataUrl) return;

    setIsUploading(true);
    setError('');
    setUploadResult(null);

    try {
      const result = await uploadToImgBB(dataUrl);
      
      if (result.success && result.data) {
        setUploadResult({
          url: result.data.data.url,
          deleteUrl: result.data.data.delete_url,
        });
        await navigator.clipboard.writeText(result.data.data.url);
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [handleExport]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        handleRedo();
      }
      // Delete: Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotationId) {
        e.preventDefault();
        handleDeleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleDeleteSelected, selectedAnnotationId]);

  if (isLoading) {
    return (
      <div className="editor editor-loading">
        <div className="loading-spinner"></div>
        <p>Loading image...</p>
      </div>
    );
  }

  if (error && !imageData) {
    return (
      <div className="editor editor-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="editor" ref={containerRef}>
      <Toolbar
        selectedTool={selectedTool}
        toolSettings={toolSettings}
        onToolChange={handleToolChange}
        onSettingsChange={handleSettingsChange}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClearAll={handleClearAll}
        onDeleteSelected={handleDeleteSelected}
        canUndo={canUndo}
        canRedo={canRedo}
        hasSelection={selectedAnnotationId !== null}
        onDownload={handleDownload}
        onCopy={handleCopy}
        onUpload={handleUpload}
        isUploading={isUploading}
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        recentColors={recentColors}
        onColorUsed={addRecentColor}
        onStickerSelect={handleStickerSelect}
        onRestartSequence={handleRestartSequence}
        onToggleWatermark={handleToggleWatermarkPanel}
        onToggleBrowserFrame={handleToggleBrowserFramePanel}
        onTogglePadding={handleTogglePaddingPanel}
        showWatermarkPanel={showWatermarkPanel}
        showBrowserFramePanel={showBrowserFramePanel}
        showPaddingPanel={showPaddingPanel}
      />
      
      {/* Upload result notification */}
      {uploadResult && (
        <div className="upload-result">
          <span className="upload-success">✓ Uploaded! URL copied to clipboard</span>
          <a href={uploadResult.url} target="_blank" rel="noopener noreferrer">
            View Image
          </a>
        </div>
      )}
      
      {/* Error notification */}
      {error && (
        <div className="upload-error">
          <span>⚠ {error}</span>
        </div>
      )}

      <div className="editor-main-content">
        {/* Side Panels */}
        <div className="editor-side-panels">
          {/* Resize Panel */}
          {showResizePanel && (
            <ResizePanel
              currentWidth={imageDimensions.width}
              currentHeight={imageDimensions.height}
              onResize={handleResize}
              onCancel={handleResizeCancel}
            />
          )}

          {/* Watermark Panel */}
          {showWatermarkPanel && (
            <WatermarkPanel
              config={watermarkConfig}
              onChange={setWatermarkConfig}
            />
          )}

          {/* Browser Frame Panel */}
          {showBrowserFramePanel && (
            <BrowserFramePanel
              config={browserFrameConfig}
              onChange={setBrowserFrameConfig}
              pageUrl={typeof window !== 'undefined' ? window.location.href : ''}
            />
          )}

          {/* Padding Panel */}
          {showPaddingPanel && (
            <PaddingPanel
              config={paddingConfig}
              onChange={setPaddingConfig}
              recentColors={recentColors}
              onColorUsed={addRecentColor}
            />
          )}
        </div>

        {/* Canvas Container */}
        <div className="editor-canvas-container">
          {/* Crop overlay */}
          {isCropping && (
            <div className="crop-overlay">
              <div className="crop-instructions">
                Click and drag to select crop area
              </div>
              <div className="crop-actions">
                <button 
                  className="crop-btn crop-btn-cancel"
                  onClick={handleCropCancel}
                >
                  Cancel
                </button>
                <button 
                  className="crop-btn crop-btn-apply"
                  onClick={handleCropApply}
                  disabled={!cropSelection}
                >
                  Apply Crop
                </button>
              </div>
            </div>
          )}
          
          <AnnotationCanvas
            ref={canvasRef}
            imageData={imageData}
            annotations={annotations}
            selectedTool={toSharedToolType(selectedTool)}
            toolSettings={toSharedToolSettings(toolSettings)}
            onAddAnnotation={addAnnotation}
            imageDimensions={imageDimensions}
            zoom={zoom}
          />
        </div>
      </div>
    </div>
  );
};

export default Editor;
