import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Annotation, ToolType, ToolSettings, Point } from '../types';
import Toolbar from './Toolbar';
import AnnotationCanvas from './AnnotationCanvas';
import { uploadToImgBB } from '../services/messaging';

const defaultToolSettings: ToolSettings = {
  color: '#ff0000',
  strokeWidth: 3,
  fontSize: 16,
};

const Editor: React.FC = () => {
  const [imageData, setImageData] = useState<string>('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolType>('select');
  const [toolSettings, setToolSettings] = useState<ToolSettings>(defaultToolSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ url: string; deleteUrl: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load image from URL params or storage
  useEffect(() => {
    const loadImage = async () => {
      try {
        // Check URL params first
        const urlParams = new URLSearchParams(window.location.search);
        const imageUrl = urlParams.get('image');
        
        if (imageUrl) {
          // Image passed via URL param (base64 data URL)
          setImageData(decodeURIComponent(imageUrl));
          setIsLoading(false);
          return;
        }

        // Check for image in chrome.storage.local
        if (typeof chrome !== 'undefined' && chrome.storage) {
          // Try editorImage first (from popup capture)
          const result = await chrome.storage.local.get(['editorImage', 'tempCapture']);
          
          if (result.editorImage && typeof result.editorImage === 'string') {
            setImageData(result.editorImage);
            // Clear the stored image after loading
            await chrome.storage.local.remove('editorImage');
            setIsLoading(false);
            return;
          }
          
          // Fallback to tempCapture (from keyboard shortcuts)
          if (result.tempCapture && typeof result.tempCapture === 'string') {
            setImageData(result.tempCapture);
            // Clear the stored image after loading
            await chrome.storage.local.remove('tempCapture');
            setIsLoading(false);
            return;
          }
        }

        setError('No image to edit. Please capture a screenshot first.');
        setIsLoading(false);
      } catch {
        setError('Failed to load image');
        setIsLoading(false);
      }
    };

    loadImage();
  }, []);

  // Calculate image dimensions when image loads
  useEffect(() => {
    if (!imageData) return;

    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
    };
    img.src = imageData;
  }, [imageData]);

  // Add annotation
  const addAnnotation = useCallback((annotation: Annotation) => {
    setAnnotations(prev => [...prev, annotation]);
  }, []);

  // Undo last annotation
  const handleUndo = useCallback(() => {
    setAnnotations(prev => prev.slice(0, -1));
  }, []);

  // Clear all annotations
  const handleClearAll = useCallback(() => {
    setAnnotations([]);
  }, []);

  // Handle tool change
  const handleToolChange = useCallback((tool: ToolType) => {
    setSelectedTool(tool);
  }, []);

  // Handle tool settings change
  const handleSettingsChange = useCallback((settings: Partial<ToolSettings>) => {
    setToolSettings(prev => ({ ...prev, ...settings }));
  }, []);

  // Export final image with annotations
  const handleExport = useCallback(async () => {
    if (!imageData) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = imageData;
    
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
    });

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Draw annotations on the canvas
    drawAnnotationsToContext(ctx, annotations, img.width, img.height);

    return canvas.toDataURL('image/png');
  }, [imageData, annotations]);

  // Download image
  const handleDownload = useCallback(async () => {
    const dataUrl = await handleExport();
    if (!dataUrl) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `screenshot_${timestamp}.png`;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  }, [handleExport]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    const dataUrl = await handleExport();
    if (!dataUrl) return;

    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
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
        // Auto-copy URL to clipboard
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

  if (isLoading) {
    return (
      <div className="editor editor-loading">
        <div className="loading-spinner"></div>
        <p>Loading image...</p>
      </div>
    );
  }

  if (error) {
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
        onClearAll={handleClearAll}
        onDownload={handleDownload}
        onCopy={handleCopy}
        onUpload={handleUpload}
        canUndo={annotations.length > 0}
        isUploading={isUploading}
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
      
      <div className="editor-canvas-container">
        <AnnotationCanvas
          imageData={imageData}
          annotations={annotations}
          selectedTool={selectedTool}
          toolSettings={toolSettings}
          onAddAnnotation={addAnnotation}
          imageDimensions={imageDimensions}
        />
      </div>
    </div>
  );
};

// Helper function to draw annotations to a canvas context
function drawAnnotationsToContext(
  ctx: CanvasRenderingContext2D,
  annotations: Annotation[],
  _canvasWidth: number,
  _canvasHeight: number
) {
  annotations.forEach(annotation => {
    ctx.strokeStyle = annotation.style.color;
    ctx.fillStyle = annotation.style.color;
    ctx.lineWidth = annotation.style.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (annotation.type) {
      case 'rectangle':
        drawRectangle(ctx, annotation.points);
        break;
      case 'arrow':
        drawArrow(ctx, annotation.points);
        break;
      case 'text':
        drawText(ctx, annotation);
        break;
      case 'blur':
        drawBlur(ctx, annotation.points);
        break;
    }
  });
}

function drawRectangle(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (points.length < 2) return;
  const [start, end] = points;
  const width = end.x - start.x;
  const height = end.y - start.y;
  ctx.strokeRect(start.x, start.y, width, height);
}

function drawArrow(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (points.length < 2) return;
  const [start, end] = points;
  
  // Draw line
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  // Draw arrowhead
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLength = 15;
  
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 6),
    end.y - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 6),
    end.y - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

function drawText(ctx: CanvasRenderingContext2D, annotation: Annotation) {
  if (annotation.points.length < 1 || !annotation.style.text) return;
  const [position] = annotation.points;
  ctx.font = `${annotation.style.fontSize || 16}px sans-serif`;
  ctx.fillText(annotation.style.text, position.x, position.y);
}

function drawBlur(
  ctx: CanvasRenderingContext2D,
  points: Point[]
) {
  if (points.length < 2) return;
  const [start, end] = points;
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  if (width <= 0 || height <= 0) return;

  // Get the image data for the selected area
  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;

  // Apply pixelation blur effect
  const pixelSize = 10;
  for (let py = 0; py < height; py += pixelSize) {
    for (let px = 0; px < width; px += pixelSize) {
      // Get average color for this block
      let r = 0, g = 0, b = 0, count = 0;
      
      for (let dy = 0; dy < pixelSize && py + dy < height; dy++) {
        for (let dx = 0; dx < pixelSize && px + dx < width; dx++) {
          const i = ((py + dy) * width + (px + dx)) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
      }
      
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);

      // Set all pixels in this block to the average color
      for (let dy = 0; dy < pixelSize && py + dy < height; dy++) {
        for (let dx = 0; dx < pixelSize && px + dx < width; dx++) {
          const i = ((py + dy) * width + (px + dx)) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
      }
    }
  }

  ctx.putImageData(imageData, x, y);
}

export default Editor;
