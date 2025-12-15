/**
 * AnnotationCanvas Component - Fabric.js Based Canvas
 * 
 * Refactored to use Fabric.js for canvas manipulation including:
 * - Object selection, resize, rotate
 * - Layer system (base image, annotations, preview)
 * - Zoom and pan support
 * 
 * Requirements: 2.1, 2.2
 * - Drawing rectangles and ellipses with configurable stroke color and width
 */

import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as fabric from 'fabric';
import type { 
  ToolType as EditorToolType, 
  ToolSettings as EditorToolSettings, 
  Point, 
  Annotation as EditorAnnotation,
  ShapeAnnotation,
  PathAnnotation,
  ArrowAnnotation,
  TextAnnotation,
} from './types/editor';

// Support both old and new annotation formats for backward compatibility
type ToolType = EditorToolType | 'arrow';

// Legacy tool settings format (from ../types)
interface LegacyToolSettings {
  color: string;
  strokeWidth: number;
  fontSize?: number;
  text?: string;
}

// Combined tool settings type
type ToolSettings = EditorToolSettings | LegacyToolSettings;

// Legacy annotation format (from ../types)
interface LegacyAnnotation {
  id: string;
  type: ToolType;
  points: Point[];
  style: {
    color: string;
    strokeWidth: number;
    fontSize?: number;
    text?: string;
  };
}

// Combined annotation type
type Annotation = EditorAnnotation | LegacyAnnotation;

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

// ============================================================================
// Types
// ============================================================================

export interface AnnotationCanvasProps {
  /** Base64 image data to display */
  imageData: string;
  /** List of annotations to render */
  annotations: Annotation[];
  /** Currently selected tool */
  selectedTool: ToolType;
  /** Current tool settings (color, stroke width, etc.) */
  toolSettings: ToolSettings;
  /** Callback when a new annotation is added */
  onAddAnnotation: (annotation: Annotation) => void;
  /** Callback when an annotation is selected */
  onSelectAnnotation?: (annotationId: string | null) => void;
  /** Callback when an annotation is modified */
  onModifyAnnotation?: (annotation: Annotation) => void;
  /** Image dimensions */
  imageDimensions: { width: number; height: number };
  /** Current zoom level (1.0 = 100%) */
  zoom?: number;
  /** Pan offset */
  panOffset?: { x: number; y: number };
}

export interface AnnotationCanvasRef {
  /** Get the Fabric.js canvas instance */
  getCanvas: () => fabric.Canvas | null;
  /** Export canvas as data URL */
  toDataURL: (format?: string, quality?: number) => string | null;
  /** Clear all annotations */
  clearAnnotations: () => void;
  /** Delete selected annotation */
  deleteSelected: () => void;
  /** Select an annotation by ID */
  selectAnnotation: (id: string) => void;
  /** Deselect all */
  deselectAll: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ANNOTATION_LAYER_NAME = 'annotation';
const BASE_IMAGE_LAYER_NAME = 'baseImage';

// Helper to get layer name from fabric object
function getLayerName(obj: fabric.FabricObject): string | undefined {
  return (obj as ExtendedFabricObject).layerName;
}

// Helper to set layer name on fabric object
function setLayerName(obj: fabric.FabricObject, name: string): void {
  (obj as ExtendedFabricObject).layerName = name;
}

// Helper to get annotation ID from fabric object
function getAnnotationId(obj: fabric.FabricObject): string | undefined {
  return (obj as ExtendedFabricObject).annotationId;
}

// Helper to set annotation ID on fabric object
function setAnnotationId(obj: fabric.FabricObject, id: string): void {
  (obj as ExtendedFabricObject).annotationId = id;
}

// ============================================================================
// Component
// ============================================================================

const AnnotationCanvas = forwardRef<AnnotationCanvasRef, AnnotationCanvasProps>((props, ref) => {
  const {
    imageData,
    annotations,
    selectedTool,
    toolSettings,
    onAddAnnotation,
    onSelectAnnotation,
    onModifyAnnotation,
    imageDimensions,
    zoom = 1,
    panOffset = { x: 0, y: 0 },
  } = props;

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const baseImageRef = useRef<fabric.FabricImage | null>(null);

  // State
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [previewObject, setPreviewObject] = useState<fabric.FabricObject | null>(null);
  const [textInput, setTextInput] = useState<{ visible: boolean; position: Point; value: string }>({
    visible: false,
    position: { x: 0, y: 0 },
    value: '',
  });
  const [canvasReady, setCanvasReady] = useState(false);

  // ============================================================================
  // Initialize Fabric.js Canvas
  // ============================================================================

  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    // Create Fabric.js canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      selection: selectedTool === 'select',
      preserveObjectStacking: true,
      renderOnAddRemove: true,
      stopContextMenu: true,
      fireRightClick: true,
    });

    fabricCanvasRef.current = canvas;
    setCanvasReady(true);

    // Cleanup on unmount
    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
      setCanvasReady(false);
    };
  }, []);

  // ============================================================================
  // Load Base Image
  // ============================================================================

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !imageData || !canvasReady) return;

    // Remove existing base image
    if (baseImageRef.current) {
      canvas.remove(baseImageRef.current);
      baseImageRef.current = null;
    }

    // Load new image
    const loadImage = async () => {
      try {
        const img = await fabric.FabricImage.fromURL(imageData, {
          crossOrigin: 'anonymous',
        });

        // Set canvas dimensions to match image
        canvas.setDimensions({
          width: img.width || imageDimensions.width,
          height: img.height || imageDimensions.height,
        });

        // Configure base image
        img.set({
          selectable: false,
          evented: false,
          name: BASE_IMAGE_LAYER_NAME,
          // Lock the base image
          lockMovementX: true,
          lockMovementY: true,
          lockRotation: true,
          lockScalingX: true,
          lockScalingY: true,
          hasControls: false,
          hasBorders: false,
        });

        // Add to canvas at the bottom
        canvas.add(img);
        canvas.sendObjectToBack(img);
        baseImageRef.current = img;

        canvas.renderAll();
      } catch (error) {
        console.error('Failed to load base image:', error);
      }
    };

    loadImage();
  }, [imageData, canvasReady, imageDimensions]);

  // ============================================================================
  // Handle Zoom
  // ============================================================================

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !canvasReady) return;

    canvas.setZoom(zoom);
    
    // Update canvas viewport dimensions
    const vpt = canvas.viewportTransform;
    if (vpt) {
      vpt[4] = panOffset.x;
      vpt[5] = panOffset.y;
      canvas.setViewportTransform(vpt);
    }

    canvas.renderAll();
  }, [zoom, panOffset, canvasReady]);

  // ============================================================================
  // Handle Tool Selection Mode
  // ============================================================================

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !canvasReady) return;

    const isSelectMode = selectedTool === 'select';
    
    canvas.selection = isSelectMode;
    canvas.defaultCursor = isSelectMode ? 'default' : 'crosshair';

    // Update all annotation objects
    canvas.getObjects().forEach(obj => {
      if (getLayerName(obj) === ANNOTATION_LAYER_NAME) {
        obj.set({
          selectable: isSelectMode,
          evented: isSelectMode,
        });
      }
    });

    canvas.renderAll();
  }, [selectedTool, canvasReady]);

  // ============================================================================
  // Sync Annotations from Props
  // ============================================================================

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !canvasReady) return;

    // Get current annotation IDs on canvas
    const canvasAnnotationIds = new Set(
      canvas.getObjects()
        .filter(obj => getLayerName(obj) === ANNOTATION_LAYER_NAME)
        .map(obj => getAnnotationId(obj))
        .filter(Boolean)
    );

    // Get annotation IDs from props
    const propsAnnotationIds = new Set(annotations.map(a => a.id));

    // Remove annotations that are no longer in props
    canvas.getObjects().forEach(obj => {
      const annotationId = getAnnotationId(obj);
      if (getLayerName(obj) === ANNOTATION_LAYER_NAME && annotationId && !propsAnnotationIds.has(annotationId)) {
        canvas.remove(obj);
      }
    });

    // Add new annotations from props
    annotations.forEach(annotation => {
      if (!canvasAnnotationIds.has(annotation.id)) {
        const fabricObj = createFabricObject(annotation, toolSettings);
        if (fabricObj) {
          setAnnotationId(fabricObj, annotation.id);
          setLayerName(fabricObj, ANNOTATION_LAYER_NAME);
          canvas.add(fabricObj);
        }
      }
    });

    canvas.renderAll();
  }, [annotations, canvasReady, toolSettings]);

  // ============================================================================
  // Mouse Event Handlers
  // ============================================================================

  const getCanvasPoint = useCallback((e: fabric.TPointerEventInfo<fabric.TPointerEvent>): Point => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const pointer = canvas.getViewportPoint(e.e);
    return { x: pointer.x, y: pointer.y };
  }, []);

  // Handle mouse down
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !canvasReady) return;

    const handleMouseDown = (e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
      if (selectedTool === 'select') return;

      const point = getCanvasPoint(e);

      if (selectedTool === 'text') {
        setTextInput({
          visible: true,
          position: point,
          value: '',
        });
        return;
      }

      setIsDrawing(true);
      setStartPoint(point);

      // Create preview object
      const preview = createPreviewObject(selectedTool, point, toolSettings);
      if (preview) {
        preview.set({
          selectable: false,
          evented: false,
          strokeDashArray: [5, 5],
        });
        canvas.add(preview);
        setPreviewObject(preview);
      }
    };

    canvas.on('mouse:down', handleMouseDown);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
    };
  }, [selectedTool, toolSettings, canvasReady, getCanvasPoint]);

  // Handle mouse move
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !canvasReady) return;

    const handleMouseMove = (e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
      if (!isDrawing || !startPoint || !previewObject) return;

      const currentPoint = getCanvasPoint(e);
      updatePreviewObject(previewObject, startPoint, currentPoint, selectedTool);
      canvas.renderAll();
    };

    canvas.on('mouse:move', handleMouseMove);

    return () => {
      canvas.off('mouse:move', handleMouseMove);
    };
  }, [isDrawing, startPoint, previewObject, selectedTool, canvasReady, getCanvasPoint]);

  // Handle mouse up
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !canvasReady) return;

    const handleMouseUp = (e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
      if (!isDrawing || !startPoint) {
        setIsDrawing(false);
        return;
      }

      const endPoint = getCanvasPoint(e);

      // Remove preview object
      if (previewObject) {
        canvas.remove(previewObject);
        setPreviewObject(null);
      }

      // Create annotation if there's meaningful size
      const width = Math.abs(endPoint.x - startPoint.x);
      const height = Math.abs(endPoint.y - startPoint.y);

      if (width > 5 || height > 5) {
        const annotation = createAnnotationFromPoints(
          selectedTool,
          startPoint,
          endPoint,
          toolSettings
        );

        if (annotation) {
          onAddAnnotation(annotation);
        }
      }

      setIsDrawing(false);
      setStartPoint(null);
    };

    canvas.on('mouse:up', handleMouseUp);

    return () => {
      canvas.off('mouse:up', handleMouseUp);
    };
  }, [isDrawing, startPoint, previewObject, selectedTool, toolSettings, canvasReady, getCanvasPoint, onAddAnnotation]);

  // Handle object selection
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !canvasReady || !onSelectAnnotation) return;

    const handleSelection = (e: fabric.TEvent<fabric.TPointerEvent> & { selected?: fabric.FabricObject[] }) => {
      const selected = e.selected?.[0];
      if (selected) {
        const annotationId = (selected as fabric.FabricObject & { annotationId?: string }).annotationId;
        if (annotationId) {
          onSelectAnnotation(annotationId);
        }
      }
    };

    const handleDeselection = () => {
      onSelectAnnotation(null);
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleDeselection);

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared', handleDeselection);
    };
  }, [canvasReady, onSelectAnnotation]);

  // Handle object modification
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !canvasReady || !onModifyAnnotation) return;

    const handleModified = (e: fabric.ModifiedEvent<fabric.TPointerEvent>) => {
      const target = e.target;
      if (!target) return;

      const annotationId = (target as fabric.FabricObject & { annotationId?: string }).annotationId;
      if (!annotationId) return;

      const annotation = annotations.find(a => a.id === annotationId);
      if (annotation) {
        const updatedAnnotation = updateAnnotationFromFabricObject(annotation, target);
        onModifyAnnotation(updatedAnnotation);
      }
    };

    canvas.on('object:modified', handleModified);

    return () => {
      canvas.off('object:modified', handleModified);
    };
  }, [canvasReady, onModifyAnnotation, annotations]);

  // ============================================================================
  // Text Input Handlers
  // ============================================================================

  const handleTextSubmit = useCallback(() => {
    if (!textInput.value.trim()) {
      setTextInput({ visible: false, position: { x: 0, y: 0 }, value: '' });
      return;
    }

    const annotation: Annotation = {
      id: crypto.randomUUID(),
      type: 'text',
      style: {
        color: toolSettings.color,
        strokeWidth: toolSettings.strokeWidth,
        opacity: toolSettings.opacity,
      },
      transform: {
        x: textInput.position.x,
        y: textInput.position.y,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
      locked: false,
      text: textInput.value,
      fontFamily: toolSettings.fontFamily,
      fontSize: toolSettings.fontSize,
      backgroundColor: toolSettings.backgroundColor,
      hasShadow: toolSettings.hasShadow,
    } as Annotation;

    onAddAnnotation(annotation);
    setTextInput({ visible: false, position: { x: 0, y: 0 }, value: '' });
  }, [textInput, toolSettings, onAddAnnotation]);

  const handleTextKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTextSubmit();
    } else if (e.key === 'Escape') {
      setTextInput({ visible: false, position: { x: 0, y: 0 }, value: '' });
    }
  }, [handleTextSubmit]);

  // ============================================================================
  // Imperative Handle (Ref Methods)
  // ============================================================================

  useImperativeHandle(ref, () => ({
    getCanvas: () => fabricCanvasRef.current,

    toDataURL: (format = 'png', quality = 1) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return null;

      // Deselect all before export
      canvas.discardActiveObject();
      canvas.renderAll();

      return canvas.toDataURL({
        format: format as 'png' | 'jpeg',
        quality,
        multiplier: 1 / zoom, // Export at original size
      });
    },

    clearAnnotations: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const objectsToRemove = canvas.getObjects().filter(
        obj => obj.name === ANNOTATION_LAYER_NAME
      );
      objectsToRemove.forEach(obj => canvas.remove(obj));
      canvas.renderAll();
    },

    deleteSelected: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const activeObject = canvas.getActiveObject();
      if (activeObject && activeObject.name === ANNOTATION_LAYER_NAME) {
        canvas.remove(activeObject);
        canvas.discardActiveObject();
        canvas.renderAll();
      }
    },

    selectAnnotation: (id: string) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const obj = canvas.getObjects().find(
        o => (o as fabric.FabricObject & { annotationId?: string }).annotationId === id
      );
      if (obj) {
        canvas.setActiveObject(obj);
        canvas.renderAll();
      }
    },

    deselectAll: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      canvas.discardActiveObject();
      canvas.renderAll();
    },
  }), [zoom]);

  // ============================================================================
  // Render
  // ============================================================================

  const canvasStyle: React.CSSProperties = {
    width: imageDimensions.width * zoom,
    height: imageDimensions.height * zoom,
  };

  return (
    <div className="annotation-canvas-container" ref={containerRef}>
      <div className="canvas-wrapper" style={canvasStyle}>
        <canvas
          ref={canvasRef}
          width={imageDimensions.width}
          height={imageDimensions.height}
        />
        {textInput.visible && (
          <input
            type="text"
            className="text-input"
            style={{
              left: textInput.position.x * zoom,
              top: textInput.position.y * zoom,
              color: toolSettings.color,
              fontSize: toolSettings.fontSize * zoom,
              fontFamily: toolSettings.fontFamily,
            }}
            value={textInput.value}
            onChange={(e) => setTextInput(prev => ({ ...prev, value: e.target.value }))}
            onKeyDown={handleTextKeyDown}
            onBlur={handleTextSubmit}
            autoFocus
          />
        )}
      </div>
    </div>
  );
});

AnnotationCanvas.displayName = 'AnnotationCanvas';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if annotation is in legacy format
 */
function isLegacyAnnotation(annotation: Annotation): annotation is LegacyAnnotation {
  return 'points' in annotation && Array.isArray((annotation as LegacyAnnotation).points);
}

/**
 * Create a Fabric.js object from an annotation
 */
function createFabricObject(
  annotation: Annotation,
  _toolSettings: ToolSettings
): fabric.FabricObject | null {
  // Handle legacy annotation format
  if (isLegacyAnnotation(annotation)) {
    return createFabricObjectFromLegacy(annotation);
  }

  const { style, transform } = annotation;

  const commonOptions: Partial<fabric.FabricObjectProps> = {
    left: transform.x,
    top: transform.y,
    scaleX: transform.scaleX,
    scaleY: transform.scaleY,
    angle: transform.rotation,
    stroke: style.color,
    strokeWidth: style.strokeWidth,
    opacity: style.opacity,
    fill: (style as { fill?: string }).fill || 'transparent',
    selectable: true,
    evented: true,
  };

  switch (annotation.type) {
    case 'rectangle': {
      const rectAnnotation = annotation as ShapeAnnotation;
      return new fabric.Rect({
        ...commonOptions,
        width: rectAnnotation.width,
        height: rectAnnotation.height,
      });
    }

    case 'ellipse': {
      const ellipseAnnotation = annotation as ShapeAnnotation;
      return new fabric.Ellipse({
        ...commonOptions,
        rx: ellipseAnnotation.width / 2,
        ry: ellipseAnnotation.height / 2,
      });
    }

    case 'text': {
      const textAnnotation = annotation as TextAnnotation;
      return new fabric.IText(textAnnotation.text, {
        ...commonOptions,
        fill: style.color,
        fontFamily: textAnnotation.fontFamily,
        fontSize: textAnnotation.fontSize,
        backgroundColor: textAnnotation.backgroundColor,
        shadow: textAnnotation.hasShadow
          ? new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 4, offsetX: 2, offsetY: 2 })
          : undefined,
      });
    }

    case 'curve':
    case 'highlight': {
      const pathAnnotation = annotation as PathAnnotation;
      if (pathAnnotation.points.length < 2) return null;

      const pathData = pointsToPathData(pathAnnotation.points);
      return new fabric.Path(pathData, {
        ...commonOptions,
        fill: 'transparent',
        opacity: annotation.type === 'highlight' ? 0.5 : style.opacity,
      });
    }

    case 'big_head_arrow':
    case 'line_arrow':
    case 'bezier_arrow':
    case 'line': {
      const arrowAnnotation = annotation as ArrowAnnotation;
      return createArrowObject(arrowAnnotation, commonOptions);
    }

    default:
      return null;
  }
}

/**
 * Create a Fabric.js object from a legacy annotation format
 */
function createFabricObjectFromLegacy(annotation: LegacyAnnotation): fabric.FabricObject | null {
  const { style, points, type } = annotation;

  if (points.length < 1) return null;

  const commonOptions: Partial<fabric.FabricObjectProps> = {
    stroke: style.color,
    strokeWidth: style.strokeWidth,
    fill: 'transparent',
    selectable: true,
    evented: true,
  };

  switch (type) {
    case 'rectangle': {
      if (points.length < 2) return null;
      const [start, end] = points;
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);
      return new fabric.Rect({
        ...commonOptions,
        left: Math.min(start.x, end.x),
        top: Math.min(start.y, end.y),
        width,
        height,
      });
    }

    case 'arrow': {
      if (points.length < 2) return null;
      const [start, end] = points;
      
      // Create line
      const line = new fabric.Line(
        [start.x, start.y, end.x, end.y],
        { ...commonOptions }
      );

      // Calculate arrowhead
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headLength = 15;

      const arrowHead = new fabric.Triangle({
        left: end.x,
        top: end.y,
        width: headLength,
        height: headLength * 1.5,
        fill: style.color,
        angle: (angle * 180) / Math.PI + 90,
        originX: 'center',
        originY: 'bottom',
      });

      return new fabric.Group([line, arrowHead], {
        left: Math.min(start.x, end.x),
        top: Math.min(start.y, end.y),
        selectable: true,
        evented: true,
      });
    }

    case 'text': {
      const [position] = points;
      return new fabric.IText(style.text || '', {
        ...commonOptions,
        left: position.x,
        top: position.y,
        fill: style.color,
        fontSize: style.fontSize || 16,
        fontFamily: 'Arial',
      });
    }

    case 'blur': {
      // Blur is handled differently - just draw a rectangle indicator
      if (points.length < 2) return null;
      const [start, end] = points;
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);
      return new fabric.Rect({
        ...commonOptions,
        left: Math.min(start.x, end.x),
        top: Math.min(start.y, end.y),
        width,
        height,
        fill: 'rgba(128, 128, 128, 0.3)',
        stroke: 'rgba(128, 128, 128, 0.5)',
      });
    }

    default:
      return null;
  }
}

/**
 * Create a preview object while drawing
 */
function createPreviewObject(
  tool: ToolType,
  startPoint: Point,
  toolSettings: ToolSettings
): fabric.FabricObject | null {
  const commonOptions: Partial<fabric.FabricObjectProps> = {
    left: startPoint.x,
    top: startPoint.y,
    stroke: toolSettings.color,
    strokeWidth: toolSettings.strokeWidth,
    fill: 'transparent',
    opacity: tool === 'highlight' ? 0.5 : toolSettings.opacity,
  };

  switch (tool) {
    case 'rectangle':
      return new fabric.Rect({
        ...commonOptions,
        width: 0,
        height: 0,
      });

    case 'ellipse':
      return new fabric.Ellipse({
        ...commonOptions,
        rx: 0,
        ry: 0,
      });

    case 'big_head_arrow':
    case 'line_arrow':
    case 'line':
      return new fabric.Line([startPoint.x, startPoint.y, startPoint.x, startPoint.y], {
        ...commonOptions,
      });

    default:
      return null;
  }
}

/**
 * Update preview object during drawing
 */
function updatePreviewObject(
  obj: fabric.FabricObject,
  startPoint: Point,
  currentPoint: Point,
  tool: ToolType
): void {
  const width = currentPoint.x - startPoint.x;
  const height = currentPoint.y - startPoint.y;

  switch (tool) {
    case 'rectangle':
      obj.set({
        left: width < 0 ? currentPoint.x : startPoint.x,
        top: height < 0 ? currentPoint.y : startPoint.y,
        width: Math.abs(width),
        height: Math.abs(height),
      });
      break;

    case 'ellipse':
      obj.set({
        left: width < 0 ? currentPoint.x : startPoint.x,
        top: height < 0 ? currentPoint.y : startPoint.y,
        rx: Math.abs(width) / 2,
        ry: Math.abs(height) / 2,
      });
      break;

    case 'big_head_arrow':
    case 'line_arrow':
    case 'line':
      (obj as fabric.Line).set({
        x2: currentPoint.x,
        y2: currentPoint.y,
      });
      break;
  }

  obj.setCoords();
}

/**
 * Create an annotation from start and end points
 */
function createAnnotationFromPoints(
  tool: ToolType,
  startPoint: Point,
  endPoint: Point,
  toolSettings: ToolSettings
): Annotation | null {
  const id = crypto.randomUUID();
  const width = Math.abs(endPoint.x - startPoint.x);
  const height = Math.abs(endPoint.y - startPoint.y);
  const left = Math.min(startPoint.x, endPoint.x);
  const top = Math.min(startPoint.y, endPoint.y);

  const baseAnnotation = {
    id,
    style: {
      color: toolSettings.color,
      strokeWidth: toolSettings.strokeWidth,
      opacity: tool === 'highlight' ? 0.5 : toolSettings.opacity,
    },
    transform: {
      x: left,
      y: top,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    },
    locked: false,
  };

  switch (tool) {
    case 'rectangle':
      return {
        ...baseAnnotation,
        type: 'rectangle',
        width,
        height,
      } as import('./types/editor').ShapeAnnotation;

    case 'ellipse':
      return {
        ...baseAnnotation,
        type: 'ellipse',
        width,
        height,
      } as import('./types/editor').ShapeAnnotation;

    case 'big_head_arrow':
    case 'line_arrow':
    case 'line':
      return {
        ...baseAnnotation,
        type: tool,
        transform: {
          ...baseAnnotation.transform,
          x: startPoint.x,
          y: startPoint.y,
        },
        startPoint,
        endPoint,
      } as import('./types/editor').ArrowAnnotation;

    case 'highlight':
      return {
        ...baseAnnotation,
        type: 'highlight',
        points: [startPoint, endPoint],
      } as import('./types/editor').PathAnnotation;

    default:
      return null;
  }
}

/**
 * Update annotation from modified Fabric.js object
 */
function updateAnnotationFromFabricObject(
  annotation: Annotation,
  obj: fabric.FabricObject
): Annotation {
  return {
    ...annotation,
    transform: {
      x: obj.left || 0,
      y: obj.top || 0,
      scaleX: obj.scaleX || 1,
      scaleY: obj.scaleY || 1,
      rotation: obj.angle || 0,
    },
  };
}

/**
 * Convert points array to SVG path data
 */
function pointsToPathData(points: Point[]): string {
  if (points.length === 0) return '';

  let pathData = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathData += ` L ${points[i].x} ${points[i].y}`;
  }
  return pathData;
}

/**
 * Create arrow object with arrowhead
 */
function createArrowObject(
  annotation: import('./types/editor').ArrowAnnotation,
  commonOptions: Partial<fabric.FabricObjectProps>
): fabric.Group {
  const { startPoint, endPoint, type } = annotation;

  // Create line
  const line = new fabric.Line(
    [startPoint.x, startPoint.y, endPoint.x, endPoint.y],
    {
      ...commonOptions,
      fill: 'transparent',
    }
  );

  // Calculate arrowhead
  const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
  const headLength = type === 'big_head_arrow' ? 20 : 12;

  // Create arrowhead
  const arrowHead = new fabric.Triangle({
    left: endPoint.x,
    top: endPoint.y,
    width: headLength,
    height: headLength * 1.5,
    fill: commonOptions.stroke,
    angle: (angle * 180) / Math.PI + 90,
    originX: 'center',
    originY: 'bottom',
  });

  // Group line and arrowhead
  const group = new fabric.Group([line, arrowHead], {
    ...commonOptions,
    left: Math.min(startPoint.x, endPoint.x),
    top: Math.min(startPoint.y, endPoint.y),
  });

  return group;
}

export default AnnotationCanvas;
