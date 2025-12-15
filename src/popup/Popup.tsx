import React, { useState } from 'react';
import CaptureTab from './CaptureTab';
import RecordTab from './RecordTab';
import HistoryTab from './HistoryTab';

type TabType = 'capture' | 'record' | 'history';

const Popup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('capture');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'capture':
        return <CaptureTab />;
      case 'record':
        return <RecordTab />;
      case 'history':
        return <HistoryTab />;
      default:
        return <CaptureTab />;
    }
  };

  return (
    <div className="popup">
      <header className="popup-header">
        <h1>PushScreenshot</h1>
      </header>
      
      <nav className="popup-tabs">
        <button
          className={`tab-button ${activeTab === 'capture' ? 'active' : ''}`}
          onClick={() => setActiveTab('capture')}
        >
          Capture
        </button>
        <button
          className={`tab-button ${activeTab === 'record' ? 'active' : ''}`}
          onClick={() => setActiveTab('record')}
        >
          Record
        </button>
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </nav>

      <main className="popup-content">
        {renderTabContent()}
      </main>
    </div>
  );
};

export default Popup;
