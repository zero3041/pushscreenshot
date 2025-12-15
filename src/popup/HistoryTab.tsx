import React, { useState, useEffect } from 'react';
import type { HistoryItem } from '../types';
import { storage } from '../services/storage';

const HistoryTab: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const items = await storage.get('history');
      setHistory(items || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopyUrl = async (item: HistoryItem) => {
    const url = item.uploadedUrl || item.thumbnailUrl;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleDelete = async (itemId: string) => {
    const updatedHistory = history.filter(item => item.id !== itemId);
    setHistory(updatedHistory);
    await storage.set('history', updatedHistory);
  };

  if (loading) {
    return (
      <div className="history-tab">
        <div className="loading">Loading history...</div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="history-tab">
        <div className="empty-history">
          <span className="empty-icon">📭</span>
          <p>No uploads yet</p>
          <p className="empty-hint">Captured screenshots will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-tab">
      <div className="history-list">
        {history.map((item) => (
          <div key={item.id} className="history-item" onClick={() => handleCopyUrl(item)}>
            <img 
              src={item.thumbnailUrl} 
              alt="Screenshot thumbnail" 
              className="history-thumbnail"
            />
            <div className="history-info">
              <div className="history-date">{formatDate(item.createdAt)}</div>
              {item.uploadedUrl && (
                <div className="history-url" title={item.uploadedUrl}>
                  {item.uploadedUrl.substring(0, 30)}...
                </div>
              )}
              {item.deleteUrl && (
                <div className="history-delete-url" title="Delete URL available">
                  🗑️ Delete URL
                </div>
              )}
            </div>
            <div className="history-actions">
              {copiedId === item.id ? (
                <span className="copied-badge">Copied!</span>
              ) : (
                <button 
                  className="action-button copy"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyUrl(item);
                  }}
                  title="Copy URL"
                >
                  📋
                </button>
              )}
              <button 
                className="action-button delete"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id);
                }}
                title="Delete from history"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryTab;
