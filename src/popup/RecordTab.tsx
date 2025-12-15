import React, { useState, useEffect } from 'react';
import {
  startRecording as startRecordingMsg,
  stopRecording as stopRecordingMsg,
  pauseRecording as pauseRecordingMsg,
  resumeRecording as resumeRecordingMsg,
  getRecordingStatus,
  downloadVideo,
} from '../services/messaging';

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  recordingType: 'tab' | 'desktop' | 'camera' | null;
}

interface VideoPreview {
  videoDataUrl: string;
  duration: number;
  audioIncluded: boolean;
}

const RecordTab: React.FC = () => {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    recordingType: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<VideoPreview | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Check if there's an active recording on mount
    getRecordingStatus()
      .then((response) => {
        if (response && response.isRecording) {
          setRecordingState({
            isRecording: true,
            isPaused: response.isPaused || false,
            recordingTime: response.recordingTime || 0,
            recordingType: response.recordingType || null,
          });
        }
      })
      .catch((err) => {
        console.error('Failed to get recording status:', err);
      });
  }, []);

  useEffect(() => {
    let interval: number | undefined;
    
    if (recordingState.isRecording && !recordingState.isPaused) {
      interval = window.setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          recordingTime: prev.recordingTime + 1,
        }));
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [recordingState.isRecording, recordingState.isPaused]);


  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async (type: 'tab' | 'desktop' | 'camera') => {
    setError(null);
    setVideoPreview(null);
    
    try {
      const response = await startRecordingMsg(type, true);

      if (response.success) {
        setRecordingState({
          isRecording: true,
          isPaused: false,
          recordingTime: 0,
          recordingType: type,
        });

        // Show warning if audio was not included
        if (response.audioIncluded === false) {
          setError('Recording without audio. Microphone access was denied.');
        }
      } else if (response.error) {
        setError(response.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
    }
  };

  const handleStopRecording = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await stopRecordingMsg();
      
      setRecordingState({
        isRecording: false,
        isPaused: false,
        recordingTime: 0,
        recordingType: null,
      });

      if (response.success && response.videoDataUrl) {
        setVideoPreview({
          videoDataUrl: response.videoDataUrl,
          duration: response.duration || 0,
          audioIncluded: response.audioIncluded ?? true,
        });
      } else if (response.error) {
        setError(response.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePauseResume = async () => {
    try {
      if (recordingState.isPaused) {
        await resumeRecordingMsg();
      } else {
        await pauseRecordingMsg();
      }
      setRecordingState(prev => ({
        ...prev,
        isPaused: !prev.isPaused,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pause/resume recording';
      setError(errorMessage);
    }
  };

  const handleDownload = async (format: 'webm' | 'mp4') => {
    if (!videoPreview) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `recording_${timestamp}.${format}`;

    try {
      await downloadVideo(videoPreview.videoDataUrl, filename);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download video';
      setError(errorMessage);
    }
  };

  const handleNewRecording = () => {
    setVideoPreview(null);
    setError(null);
  };


  // Show video preview after recording
  if (videoPreview) {
    return (
      <div className="record-tab">
        <div className="video-preview">
          <video 
            src={videoPreview.videoDataUrl} 
            controls 
            style={{ width: '100%', maxHeight: '200px', borderRadius: '8px' }}
          />
          <div className="video-info">
            <span>Duration: {formatTime(videoPreview.duration)}</span>
            {!videoPreview.audioIncluded && (
              <span className="no-audio-badge">No Audio</span>
            )}
          </div>
        </div>

        <div className="video-actions">
          <button className="action-button" onClick={() => handleDownload('webm')}>
            📥 Download WebM
          </button>
          <button className="action-button" onClick={() => handleDownload('mp4')}>
            📥 Download MP4
          </button>
        </div>

        <button className="new-recording-button" onClick={handleNewRecording}>
          🎬 New Recording
        </button>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Show processing state
  if (isProcessing) {
    return (
      <div className="record-tab">
        <div className="processing-status">
          <div className="spinner"></div>
          <span>Processing video...</span>
        </div>
      </div>
    );
  }

  // Show recording in progress
  if (recordingState.isRecording) {
    return (
      <div className="record-tab">
        <div className="recording-status">
          <div className="recording-indicator">
            <span className={`recording-dot ${recordingState.isPaused ? 'paused' : ''}`}></span>
            <span className="recording-label">
              {recordingState.isPaused ? 'Paused' : 'Recording'}
            </span>
          </div>
          <div className="recording-time">{formatTime(recordingState.recordingTime)}</div>
          <div className="recording-type">
            {recordingState.recordingType === 'tab' && 'Tab'}
            {recordingState.recordingType === 'desktop' && 'Desktop'}
            {recordingState.recordingType === 'camera' && 'Camera'}
          </div>
        </div>

        <div className="recording-controls">
          <button className="control-button" onClick={handlePauseResume}>
            {recordingState.isPaused ? '▶️ Resume' : '⏸️ Pause'}
          </button>
          <button className="control-button stop" onClick={handleStopRecording}>
            ⏹️ Stop
          </button>
        </div>

        {error && (
          <div className="error-message warning">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Show recording options
  return (
    <div className="record-tab">
      <div className="record-buttons">
        <button
          className="record-button"
          onClick={() => handleStartRecording('tab')}
        >
          <span className="button-icon">🖥️</span>
          <span className="button-text">Record Tab</span>
        </button>
        
        <button
          className="record-button"
          onClick={() => handleStartRecording('desktop')}
        >
          <span className="button-icon">🖵</span>
          <span className="button-text">Record Desktop</span>
        </button>
        
        <button
          className="record-button"
          onClick={() => handleStartRecording('camera')}
        >
          <span className="button-icon">📹</span>
          <span className="button-text">Record Camera</span>
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default RecordTab;
