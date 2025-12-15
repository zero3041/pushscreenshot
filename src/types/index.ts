// Shared types for PushScreenshot extension

export interface Settings {
    imgbbApiKey: string;
    autoUpload: boolean;
    autoCopyLink: boolean;
    imageFormat: 'png' | 'jpeg';
    imageQuality: number;
    videoFormat: 'webm' | 'mp4';
    shortcuts: {
        captureVisible: string;
        captureFullPage: string;
        captureArea: string;
        startRecording: string;
    };
}

export interface HistoryItem {
    id: string;
    type: 'screenshot' | 'video';
    thumbnailUrl: string;
    uploadedUrl?: string;
    deleteUrl?: string;
    viewerUrl?: string;
    localPath?: string;
    createdAt: number;
    size: number;
    dimensions?: {
        width: number;
        height: number;
    };
    duration?: number;
}

export interface AreaRect {
    x: number;
    y: number;
    width: number;
    height: number;
    devicePixelRatio: number;
}

export interface CaptureResult {
    success: boolean;
    imageDataUrl?: string;
    error?: string;
}

export interface UploadResult {
    success: boolean;
    data?: ImgBBResponse;
    error?: string;
}

export interface ImgBBResponse {
    data: {
        id: string;
        title: string;
        url_viewer: string;
        url: string;
        display_url: string;
        width: number;
        height: number;
        size: number;
        time: number;
        expiration: number;
        image: {
            filename: string;
            name: string;
            mime: string;
            extension: string;
            url: string;
        };
        thumb: {
            filename: string;
            name: string;
            mime: string;
            extension: string;
            url: string;
        };
        delete_url: string;
    };
    success: boolean;
    status: number;
}

export type MessageType =
    | { action: 'captureVisible' }
    | { action: 'captureFullPage' }
    | { action: 'captureArea'; area: AreaRect }
    | { action: 'startRecording'; type: 'tab' | 'desktop' | 'camera'; audio: boolean }
    | { action: 'stopRecording' }
    | { action: 'uploadToImgBB'; imageData: string }
    | { action: 'getHistory' }
    | { action: 'clearHistory' }
    | { action: 'downloadImage'; imageData: string; filename?: string; saveAs?: boolean }
    | { action: 'copyImageToClipboard'; imageData: string };

// Editor types
export type ToolType = 'select' | 'rectangle' | 'arrow' | 'text' | 'blur';

export interface Point {
    x: number;
    y: number;
}

export interface AnnotationStyle {
    color: string;
    strokeWidth: number;
    fontSize?: number;
    text?: string;
    pixelSize?: number; // For blur tool - configurable pixel size (4-32)
}

export interface Annotation {
    id: string;
    type: ToolType;
    points: Point[];
    style: AnnotationStyle;
}

export interface ToolSettings {
    color: string;
    strokeWidth: number;
    fontSize: number;
}

export interface EditorState {
    imageData: string;
    annotations: Annotation[];
    selectedTool: ToolType;
    toolSettings: ToolSettings;
}
