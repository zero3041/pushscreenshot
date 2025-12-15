/**
 * Editor Types and Interfaces
 * Based on design document for Advanced Editor Tools
 */

// ============================================================================
// Tool Types
// ============================================================================

export type ToolType =
    | 'select'
    | 'resize'
    | 'crop'
    // Shapes
    | 'rectangle'
    | 'ellipse'
    | 'curve' // freehand
    | 'highlight'
    // Arrows & Lines
    | 'big_head_arrow'
    | 'line_arrow'
    | 'bezier_arrow'
    | 'line'
    // Text
    | 'text'
    | 'callout'
    // Other
    | 'blur'
    | 'list' // sequence markers
    | 'sticker'
    | 'insert_image';

export interface ToolConfig {
    type: ToolType;
    label: string;
    icon: string;
    hasSubMenu: boolean;
    subMenuTools?: ToolType[];
}

// ============================================================================
// Geometry Types
// ============================================================================

export interface Point {
    x: number;
    y: number;
}

export interface Transform {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
}


// ============================================================================
// Style Types
// ============================================================================

export interface AnnotationStyle {
    color: string;
    strokeWidth: number;
    opacity: number;
    fill?: string;
}

export interface TextStyle {
    fontFamily: string;
    fontSize: number;
    color: string;
    backgroundColor: string;
    hasShadow: boolean;
}

// ============================================================================
// Annotation Types
// ============================================================================

export interface BaseAnnotation {
    id: string;
    type: ToolType;
    style: AnnotationStyle;
    transform: Transform;
    locked: boolean;
}

export interface ShapeAnnotation extends BaseAnnotation {
    type: 'rectangle' | 'ellipse';
    width: number;
    height: number;
}

export interface PathAnnotation extends BaseAnnotation {
    type: 'curve' | 'highlight';
    points: Point[];
}

export interface ArrowAnnotation extends BaseAnnotation {
    type: 'big_head_arrow' | 'line_arrow' | 'bezier_arrow' | 'line';
    startPoint: Point;
    endPoint: Point;
    controlPoints?: Point[]; // for bezier
}

export interface TextAnnotation extends BaseAnnotation {
    type: 'text';
    text: string;
    fontFamily: string;
    fontSize: number;
    backgroundColor: string;
    hasShadow: boolean;
}

export interface CalloutAnnotation extends BaseAnnotation {
    type: 'callout';
    text: string;
    fontFamily: string;
    fontSize: number;
    pointerDirection: 'top' | 'bottom' | 'left' | 'right';
    boxWidth: number;
    boxHeight: number;
}

export interface SequenceMarkerAnnotation extends BaseAnnotation {
    type: 'list';
    number: number;
    radius: number;
}

export interface StickerAnnotation extends BaseAnnotation {
    type: 'sticker';
    stickerType: string;
    width: number;
    height: number;
}

export interface ImageAnnotation extends BaseAnnotation {
    type: 'insert_image';
    imageData: string;
    width: number;
    height: number;
}

export interface BlurAnnotation extends BaseAnnotation {
    type: 'blur';
    width: number;
    height: number;
    pixelSize: number;
}

export type Annotation =
    | ShapeAnnotation
    | PathAnnotation
    | ArrowAnnotation
    | TextAnnotation
    | CalloutAnnotation
    | SequenceMarkerAnnotation
    | StickerAnnotation
    | ImageAnnotation
    | BlurAnnotation;


// ============================================================================
// Configuration Types
// ============================================================================

export interface WatermarkConfig {
    enabled: boolean;
    imageData: string;
    position: 'top_left' | 'top_right' | 'center' | 'bottom_left' | 'bottom_right';
    size: number; // 20-200 (percentage)
    opacity: number; // 0-100
}

export interface BrowserFrameConfig {
    enabled: boolean;
    style: 'mac' | 'windows' | 'url_top' | 'url_bottom';
    includeUrl: boolean;
    includeDate: boolean;
    url?: string;
}

export interface PaddingConfig {
    enabled: boolean;
    color: string;
    size: number; // 0-200 pixels
}

// ============================================================================
// Tool Settings
// ============================================================================

export interface ToolSettings {
    color: string;
    strokeWidth: number;
    fontSize: number;
    fontFamily: string;
    backgroundColor: string;
    hasShadow: boolean;
    opacity: number;
}

// ============================================================================
// Editor State
// ============================================================================

export interface EditorState {
    // Image
    originalImage: string;
    currentImage: string;
    imageDimensions: { width: number; height: number };

    // Annotations
    annotations: Annotation[];
    selectedAnnotationId: string | null;

    // Tool
    selectedTool: ToolType;
    toolSettings: ToolSettings;

    // History
    history: HistoryEntry[];
    historyIndex: number;

    // View
    zoom: number;
    panOffset: { x: number; y: number };

    // Features
    watermark: WatermarkConfig | null;
    browserFrame: BrowserFrameConfig | null;
    padding: PaddingConfig | null;

    // Sequence
    sequenceCounter: number;

    // Recent colors
    recentColors: string[];
}

// ============================================================================
// History Types
// ============================================================================

export type HistoryActionType = 'add' | 'remove' | 'modify' | 'clear' | 'resize' | 'crop';

export interface HistoryEntry {
    type: HistoryActionType;
    timestamp: number;
    data: unknown;
    undo: () => void;
    redo: () => void;
}


// ============================================================================
// Constants
// ============================================================================

/** 40 preset colors for the color picker */
export const PRESET_COLORS: string[] = [
    // Row 1 - Bright colors
    'rgba(255, 0, 0, 1)',      // Red
    'rgba(255, 92, 0, 1)',     // Orange
    'rgba(250, 255, 0, 1)',    // Yellow
    'rgba(36, 255, 0, 1)',     // Green
    'rgba(0, 255, 240, 1)',    // Cyan
    'rgba(0, 163, 255, 1)',    // Blue
    'rgba(144, 75, 255, 1)',   // Purple
    'rgba(255, 0, 229, 1)',    // Magenta
    // Row 2 - Light colors
    'rgba(255, 128, 128, 1)',  // Light Red
    'rgba(255, 173, 128, 1)',  // Light Orange
    'rgba(255, 255, 128, 1)',  // Light Yellow
    'rgba(128, 255, 128, 1)',  // Light Green
    'rgba(128, 255, 255, 1)',  // Light Cyan
    'rgba(128, 191, 255, 1)',  // Light Blue
    'rgba(191, 128, 255, 1)',  // Light Purple
    'rgba(255, 128, 242, 1)',  // Light Magenta
    // Row 3 - Dark colors
    'rgba(128, 0, 0, 1)',      // Dark Red
    'rgba(128, 64, 0, 1)',     // Dark Orange
    'rgba(128, 128, 0, 1)',    // Dark Yellow
    'rgba(0, 128, 0, 1)',      // Dark Green
    'rgba(0, 128, 128, 1)',    // Dark Cyan
    'rgba(0, 64, 128, 1)',     // Dark Blue
    'rgba(64, 0, 128, 1)',     // Dark Purple
    'rgba(128, 0, 128, 1)',    // Dark Magenta
    // Row 4 - Grayscale
    'rgba(255, 255, 255, 1)',  // White
    'rgba(224, 224, 224, 1)',  // Light Gray 1
    'rgba(192, 192, 192, 1)',  // Light Gray 2
    'rgba(160, 160, 160, 1)',  // Gray 1
    'rgba(128, 128, 128, 1)',  // Gray 2
    'rgba(96, 96, 96, 1)',     // Dark Gray 1
    'rgba(64, 64, 64, 1)',     // Dark Gray 2
    'rgba(0, 0, 0, 1)',        // Black
    // Row 5 - Additional colors
    'rgba(255, 192, 203, 1)',  // Pink
    'rgba(255, 218, 185, 1)',  // Peach
    'rgba(240, 230, 140, 1)',  // Khaki
    'rgba(144, 238, 144, 1)',  // Light Green 2
    'rgba(175, 238, 238, 1)',  // Pale Turquoise
    'rgba(173, 216, 230, 1)',  // Light Blue 2
    'rgba(221, 160, 221, 1)',  // Plum
    'rgba(255, 182, 193, 1)',  // Light Pink
];

/** Available font families */
export const FONT_FAMILIES: string[] = [
    'Times New Roman',
    'Arial',
    'Craft Girls',
    'OpenSans',
    'Roboto',
    'Montserrat',
    'Limelight',
    'Lobster',
    'Anton',
    'Chewy',
    'Frijole',
    'Spirax',
    'Dancing Script',
    'Changa One',
    'Griffy',
];

/** Stroke width options */
export const STROKE_WIDTHS = {
    default: [2, 4, 6, 8, 16] as const,
    highlight: [6, 8, 16, 32, 48] as const,
};

/** Font size constraints */
export const FONT_SIZE_CONSTRAINTS = {
    min: 8,
    max: 144,
    step: 2,
    defaultSizes: [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96, 144] as const,
} as const;

/** Default tool settings */
export const DEFAULT_TOOL_SETTINGS: ToolSettings = {
    color: 'rgba(255, 0, 0, 1)',
    strokeWidth: 4,
    fontSize: 16,
    fontFamily: 'Arial',
    backgroundColor: 'transparent',
    hasShadow: false,
    opacity: 1,
};

/** Zoom constraints */
export const ZOOM_CONSTRAINTS = {
    min: 0.25,  // 25%
    max: 4.0,   // 400%
    step: 0.25, // 25% step
} as const;

/** Watermark constraints */
export const WATERMARK_CONSTRAINTS = {
    minSize: 20,
    maxSize: 200,
    minOpacity: 0,
    maxOpacity: 100,
} as const;

/** Padding constraints */
export const PADDING_CONSTRAINTS = {
    minSize: 0,
    maxSize: 200,
} as const;

/** Maximum recent colors to store */
export const MAX_RECENT_COLORS = 5;
