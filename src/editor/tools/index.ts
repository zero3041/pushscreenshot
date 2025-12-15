/**
 * Tool Registry System
 * 
 * Re-exports from helpers and registry, plus imports tools for registration.
 */

// Re-export types and helpers
export * from './registry';
export * from './helpers';

// Import tools to trigger self-registration (but don't re-export to avoid circular deps)
import './RectangleTool';
import './EllipseTool';
import './CurveTool';
import './HighlightTool';
import './BigHeadArrowTool';
import './LineArrowTool';
import './BezierArrowTool';
import './LineTool';
import './TextTool';
import './CalloutTool';
import './BlurTool';
import './ImageTool';

// These need explicit exports for external use
export { sequenceTool, sequenceCounter, restartSequence, getCurrentSequenceNumber } from './SequenceTool';
export { stickerTool, setSelectedSticker, getSelectedSticker } from './StickerTool';
export {
    imageTool,
    setSelectedImage,
    getSelectedImage,
    clearSelectedImage,
    openImagePicker,
    loadImageFromFile,
    calculateFitDimensions,
} from './ImageTool';
export {
    blurTool,
    getBlurPixelSize,
    setBlurPixelSize,
    applyPixelation,
    applyBlurAnnotation,
    DEFAULT_BLUR_PIXEL_SIZE,
    MIN_BLUR_PIXEL_SIZE,
    MAX_BLUR_PIXEL_SIZE,
    BLUR_PIXEL_SIZES,
} from './BlurTool';
export {
    resizeImage,
    calculateResizeDimensions,
    calculateProportionalHeight,
    calculateProportionalWidth,
    clampResizeDimension,
    validateResizeDimensions,
    getAspectRatio,
    aspectRatiosEqual,
    MIN_RESIZE_DIMENSION,
    MAX_RESIZE_DIMENSION,
} from './ResizeTool';
export type { ResizeConfig, ResizeResult } from './ResizeTool';
export {
    cropImage,
    validateCropSelection,
    normalizeCropSelection,
    clampCropSelection,
    roundCropSelection,
    calculateCropSelection,
    hasMinimumCropSize,
    formatCropDimensions,
    MIN_CROP_DIMENSION,
} from './CropTool';
export type { CropSelection, CropConfig, CropResult } from './CropTool';

// Re-export tool instances for direct access
export { rectangleTool } from './RectangleTool';
export { ellipseTool } from './EllipseTool';
export { curveTool } from './CurveTool';
export { highlightTool } from './HighlightTool';
export { bigHeadArrowTool } from './BigHeadArrowTool';
export { lineArrowTool } from './LineArrowTool';
export { bezierArrowTool } from './BezierArrowTool';
export { lineTool } from './LineTool';
export { textTool } from './TextTool';
export { calloutTool } from './CalloutTool';
