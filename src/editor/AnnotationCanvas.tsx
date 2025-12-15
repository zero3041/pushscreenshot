/**
 * AnnotationCanvas Component - Fabric.js Based Canvas
 * Simplified version with minimal useEffect usage
 */

import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as fabric from 'fabric';
import type { ToolType, ToolSettings, Point, Annotation } from '../types';
import type { ToolSettings as EditorToolSettings } from './types/editor';

// Extended Fabric object with custom properties
interface ExtendedFabricObject extends fabric.FabricObject {
  annotationId?: string;
  layerName?: string;
}

// Helper to check if tool settings has a property
function getToolSettingValue<K extends keyof EditorToolSettings>(
  settings: ToolSettings,
  key: K,
  defaultValue: EditorToolSettings[K]
): EditorToolSettings[K] {
  if (key in settings) {
    return (settings as EditorToolSettings)[key];
  }
  return defaultValue;
}

export interface AnnotationCanvasProps {
  imageData: string;
  annotations: Annotation[];
  selectedTool: ToolType;
  toolSettings: ToolSettings;
  onAddAnnotation: (annotation: Annotation) => void;
  onSelectAnnotation?: (annotationId: string | null) => void;
  onModifyAnnotation?: (annotation: Annotation) => void;
  imageDimensions: { width: number; height: number };
  zoom?: number;
  panOffset?: { x: number; y: number };
}

export interface AnnotationCanvasRef {
  getCanvas: () => fabric.Canvas | null;
  toDataURL: (format?: string, quality?: number) => string | null;
  clearAnnotations: () => void;
  deleteSelected: () => void;
  selectAnnotation: (id: string) => void;
  deselectAll: () => void;
}

const ANNOTATION_LAYER = 'annotation';


const AnnotationCanvas = forwardRef<AnnotationCanvasRef, AnnotationCanvasProps>((props, ref) => {
  const {
    imageData,
    annotations,
    selectedTool,
    toolSettings,
    onAddAnnotation,
    imageDimensions,
    zoom = 1,
  } = props;

  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const baseImageRef = useRef<fabric.FabricImage | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [previewObj, setPreviewObj] = useState<fabric.FabricObject | null>(null);
  const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, value: '' });

  // Initialize canvas once
  useEffect(() => {
    if (!canvasElRef.current || fabricRef.current) return;

    const canvas = new fabric.Canvas(canvasElRef.current, {
      selection: true,
      preserveObjectStacking: true,
      renderOnAddRemove: true,
    });
    fabricRef.current = canvas;
    setIsReady(true);

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  // Load base image when imageData changes
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !imageData || !isReady) return;

    // Remove old base image
    if (baseImageRef.current) {
      canvas.remove(baseImageRef.current);
      baseImageRef.current = null;
    }

    // Load image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.width || imageDimensions.width || 800;
      const h = img.height || imageDimensions.height || 600;
      
      canvas.setDimensions({ width: w, height: h });

      fabric.FabricImage.fromURL(imageData, { crossOrigin: 'anonymous' })
        .then((fabricImg) => {
          fabricImg.set({
            left: 0,
            top: 0,
            selectable: false,
            evented: false,
            lockMovementX: true,
            lockMovementY: true,
          });
          canvas.add(fabricImg);
          canvas.sendObjectToBack(fabricImg);
          baseImageRef.current = fabricImg;
          canvas.renderAll();
        })
        .catch((err) => console.error('Failed to load fabric image:', err));
    };
    img.onerror = () => console.error('Failed to load HTML image');
    img.src = imageData;
  }, [imageData, isReady, imageDimensions]);

  // Update zoom
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !isReady) return;
    canvas.setZoom(zoom);
    canvas.renderAll();
  }, [zoom, isReady]);

  // Update tool mode
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !isReady) return;
    
    const isSelect = selectedTool === 'select';
    canvas.selection = isSelect;
    canvas.defaultCursor = isSelect ? 'default' : 'crosshair';
    
    canvas.getObjects().forEach((obj) => {
      const ext = obj as ExtendedFabricObject;
      if (ext.layerName === ANNOTATION_LAYER) {
        obj.set({ selectable: isSelect, evented: isSelect });
      }
    });
    canvas.renderAll();
  }, [selectedTool, isReady]);

  // Sync annotations from props
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !isReady) return;

    const canvasIds = new Set<string>();
    canvas.getObjects().forEach((obj) => {
      const ext = obj as ExtendedFabricObject;
      if (ext.layerName === ANNOTATION_LAYER && ext.annotationId) {
        canvasIds.add(ext.annotationId);
      }
    });

    const propsIds = new Set(annotations.map((a) => a.id));

    // Remove deleted
    canvas.getObjects().forEach((obj) => {
      const ext = obj as ExtendedFabricObject;
      if (ext.layerName === ANNOTATION_LAYER && ext.annotationId && !propsIds.has(ext.annotationId)) {
        canvas.remove(obj);
      }
    });

    // Add new
    annotations.forEach((ann) => {
      if (!canvasIds.has(ann.id)) {
        const fabricObj = createFabricObject(ann);
        if (fabricObj) {
          (fabricObj as ExtendedFabricObject).annotationId = ann.id;
          (fabricObj as ExtendedFabricObject).layerName = ANNOTATION_LAYER;
          canvas.add(fabricObj);
        }
      }
    });

    canvas.renderAll();
  }, [annotations, isReady]);


  // Mouse handlers
  const handleMouseDown = useCallback((e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
    const canvas = fabricRef.current;
    if (!canvas || selectedTool === 'select') return;

    const pointer = canvas.getViewportPoint(e.e);
    const point: Point = { x: pointer.x, y: pointer.y };

    if (selectedTool === 'text') {
      setTextInput({ visible: true, x: point.x, y: point.y, value: '' });
      return;
    }

    setIsDrawing(true);
    setStartPoint(point);

    const preview = createPreview(selectedTool, point, toolSettings);
    if (preview) {
      preview.set({ selectable: false, evented: false, strokeDashArray: [5, 5] });
      canvas.add(preview);
      setPreviewObj(preview);
    }
  }, [selectedTool, toolSettings]);

  const handleMouseMove = useCallback((e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
    const canvas = fabricRef.current;
    if (!canvas || !isDrawing || !startPoint || !previewObj) return;

    const pointer = canvas.getViewportPoint(e.e);
    updatePreview(previewObj, startPoint, { x: pointer.x, y: pointer.y }, selectedTool);
    canvas.renderAll();
  }, [isDrawing, startPoint, previewObj, selectedTool]);

  const handleMouseUp = useCallback((e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
    const canvas = fabricRef.current;
    if (!canvas || !isDrawing || !startPoint) {
      setIsDrawing(false);
      return;
    }

    const pointer = canvas.getViewportPoint(e.e);
    const endPoint: Point = { x: pointer.x, y: pointer.y };

    if (previewObj) {
      canvas.remove(previewObj);
      setPreviewObj(null);
    }

    const w = Math.abs(endPoint.x - startPoint.x);
    const h = Math.abs(endPoint.y - startPoint.y);

    if (w > 5 || h > 5) {
      const ann = createAnnotation(selectedTool, startPoint, endPoint, toolSettings);
      if (ann) onAddAnnotation(ann);
    }

    setIsDrawing(false);
    setStartPoint(null);
  }, [isDrawing, startPoint, previewObj, selectedTool, toolSettings, onAddAnnotation]);

  // Attach mouse events
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !isReady) return;

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
    };
  }, [isReady, handleMouseDown, handleMouseMove, handleMouseUp]);

  // Text input handlers
  const submitText = useCallback(() => {
    if (!textInput.value.trim()) {
      setTextInput({ visible: false, x: 0, y: 0, value: '' });
      return;
    }
    const ann: Annotation = {
      id: crypto.randomUUID(),
      type: 'text',
      points: [{ x: textInput.x, y: textInput.y }],
      style: {
        color: toolSettings.color,
        strokeWidth: toolSettings.strokeWidth,
        fontSize: toolSettings.fontSize || 16,
        text: textInput.value,
      },
    };
    onAddAnnotation(ann);
    setTextInput({ visible: false, x: 0, y: 0, value: '' });
  }, [textInput, toolSettings, onAddAnnotation]);

  // Imperative handle
  useImperativeHandle(ref, () => ({
    getCanvas: () => fabricRef.current,
    toDataURL: (format = 'png', quality = 1) => {
      const canvas = fabricRef.current;
      if (!canvas) return null;
      canvas.discardActiveObject();
      canvas.renderAll();
      return canvas.toDataURL({ format: format as 'png' | 'jpeg', quality, multiplier: 1 / zoom });
    },
    clearAnnotations: () => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const toRemove = canvas.getObjects().filter((o) => (o as ExtendedFabricObject).layerName === ANNOTATION_LAYER);
      toRemove.forEach((o) => canvas.remove(o));
      canvas.renderAll();
    },
    deleteSelected: () => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      if (active && (active as ExtendedFabricObject).layerName === ANNOTATION_LAYER) {
        canvas.remove(active);
        canvas.discardActiveObject();
        canvas.renderAll();
      }
    },
    selectAnnotation: (id: string) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const obj = canvas.getObjects().find((o) => (o as ExtendedFabricObject).annotationId === id);
      if (obj) {
        canvas.setActiveObject(obj);
        canvas.renderAll();
      }
    },
    deselectAll: () => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      canvas.discardActiveObject();
      canvas.renderAll();
    },
  }), [zoom]);

  const style: React.CSSProperties = {
    width: imageDimensions.width * zoom,
    height: imageDimensions.height * zoom,
  };

  return (
    <div className="annotation-canvas-container">
      <div className="canvas-wrapper" style={style}>
        <canvas ref={canvasElRef} width={imageDimensions.width} height={imageDimensions.height} />
        {textInput.visible && (
          <input
            type="text"
            className="text-input"
            style={{
              left: textInput.x * zoom,
              top: textInput.y * zoom,
              color: toolSettings.color,
              fontSize: getToolSettingValue(toolSettings, 'fontSize', 16) * zoom,
              fontFamily: getToolSettingValue(toolSettings, 'fontFamily', 'Arial'),
            }}
            value={textInput.value}
            onChange={(e) => setTextInput((p) => ({ ...p, value: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') submitText(); else if (e.key === 'Escape') setTextInput({ visible: false, x: 0, y: 0, value: '' }); }}
            onBlur={submitText}
            autoFocus
          />
        )}
      </div>
    </div>
  );
});

AnnotationCanvas.displayName = 'AnnotationCanvas';


// Helper functions
function createFabricObject(ann: Annotation): fabric.FabricObject | null {
  const { style, points, type } = ann;
  if (points.length < 1) return null;

  const opts: Partial<fabric.FabricObjectProps> = {
    stroke: style.color,
    strokeWidth: style.strokeWidth,
    fill: 'transparent',
    selectable: true,
    evented: true,
  };

  switch (type) {
    case 'rectangle': {
      if (points.length < 2) return null;
      const [s, e] = points;
      return new fabric.Rect({
        ...opts,
        left: Math.min(s.x, e.x),
        top: Math.min(s.y, e.y),
        width: Math.abs(e.x - s.x),
        height: Math.abs(e.y - s.y),
      });
    }
    case 'arrow': {
      if (points.length < 2) return null;
      const [s, e] = points;
      const line = new fabric.Line([s.x, s.y, e.x, e.y], opts);
      const angle = Math.atan2(e.y - s.y, e.x - s.x);
      const head = new fabric.Triangle({
        left: e.x,
        top: e.y,
        width: 15,
        height: 22,
        fill: style.color,
        angle: (angle * 180) / Math.PI + 90,
        originX: 'center',
        originY: 'bottom',
      });
      return new fabric.Group([line, head], { selectable: true, evented: true });
    }
    case 'text': {
      const [p] = points;
      return new fabric.IText(style.text || '', {
        ...opts,
        left: p.x,
        top: p.y,
        fill: style.color,
        fontSize: style.fontSize || 16,
        fontFamily: 'Arial',
      });
    }
    case 'blur': {
      if (points.length < 2) return null;
      const [s, e] = points;
      return new fabric.Rect({
        ...opts,
        left: Math.min(s.x, e.x),
        top: Math.min(s.y, e.y),
        width: Math.abs(e.x - s.x),
        height: Math.abs(e.y - s.y),
        fill: 'rgba(128,128,128,0.3)',
        stroke: 'rgba(128,128,128,0.5)',
      });
    }
    default:
      return null;
  }
}

function createPreview(tool: ToolType, start: Point, settings: ToolSettings): fabric.FabricObject | null {
  const opts: Partial<fabric.FabricObjectProps> = {
    left: start.x,
    top: start.y,
    stroke: settings.color,
    strokeWidth: settings.strokeWidth,
    fill: 'transparent',
  };

  switch (tool) {
    case 'rectangle':
      return new fabric.Rect({ ...opts, width: 0, height: 0 });
    case 'arrow':
      return new fabric.Line([start.x, start.y, start.x, start.y], opts);
    case 'blur':
      return new fabric.Rect({ ...opts, width: 0, height: 0, fill: 'rgba(128,128,128,0.3)', stroke: 'rgba(128,128,128,0.5)' });
    default:
      return null;
  }
}

function updatePreview(obj: fabric.FabricObject, start: Point, current: Point, tool: ToolType): void {
  const w = current.x - start.x;
  const h = current.y - start.y;

  if (tool === 'rectangle' || tool === 'blur') {
    obj.set({
      left: w < 0 ? current.x : start.x,
      top: h < 0 ? current.y : start.y,
      width: Math.abs(w),
      height: Math.abs(h),
    });
  } else if (tool === 'arrow') {
    (obj as fabric.Line).set({ x2: current.x, y2: current.y });
  }
  obj.setCoords();
}

function createAnnotation(tool: ToolType, start: Point, end: Point, settings: ToolSettings): Annotation | null {
  const id = crypto.randomUUID();
  const base = { color: settings.color, strokeWidth: settings.strokeWidth };

  switch (tool) {
    case 'rectangle':
      return { id, type: 'rectangle', points: [start, end], style: base };
    case 'arrow':
      return { id, type: 'arrow', points: [start, end], style: base };
    case 'blur':
      return { id, type: 'blur', points: [start, end], style: { ...base, pixelSize: 10 } };
    default:
      return null;
  }
}

export default AnnotationCanvas;
