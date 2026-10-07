import { useState, useEffect, useCallback } from 'react';
import { QueueState } from './types';
import {
  loadQueueState,
  saveQueueState,
  getSyncChannel,
  broadcastAnnouncement,
} from './utils/storage';
import { AdminPanel } from './components/AdminPanel';
import { MainDisplay } from './components/MainDisplay';
import { announcePlate } from './utils/audio';

export default function App() {
  const [queueState, setQueueState] = useState<QueueState>(() => loadQueueState());

  // Determine initial view from URL param: ?view=display or default to settings
  const [currentView, setCurrentView] = useState<'settings' | 'display'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'display') {
        return 'display';
      }
    }
    return 'settings';
  });

  // State update wrapper with persistence and broadcast
  const handleUpdateState = useCallback((newState: QueueState) => {
    setQueueState(newState);
    saveQueueState(newState);
  }, []);

  // Sync across tabs/windows using BroadcastChannel and localStorage events
  useEffect(() => {
    const channel = getSyncChannel();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'STATE_UPDATE' && event.data.payload) {
        setQueueState(event.data.payload);
      } else if (event.data?.type === 'CALL_ANNOUNCEMENT' && event.data.payload) {
        const { plate, service } = event.data.payload;
        announcePlate(plate, service, queueState.enableVoice, queueState.enableChime);
      }
    };

    if (channel) {
      channel.addEventListener('message', handleMessage);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mgn_queue_state_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setQueueState(parsed);
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (channel) {
        channel.removeEventListener('message', handleMessage);
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [queueState.enableVoice, queueState.enableChime]);

  // Handle URL history state for clean back/forward navigation between views
  const navigateToView = (view: 'settings' | 'display') => {
    setCurrentView(view);
    const url = new URL(window.location.href);
    if (view === 'display') {
      url.searchParams.set('view', 'display');
    } else {
      url.searchParams.delete('view');
    }
    window.history.pushState({}, '', url.toString());
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setCurrentView(params.get('view') === 'display' ? 'display' : 'settings');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (currentView === 'display') {
    return (
      <MainDisplay
        queueState={queueState}
        onOpenSettings={() => navigateToView('settings')}
        onToggleVoice={() => {
          const updated = { ...queueState, enableVoice: !queueState.enableVoice };
          handleUpdateState(updated);
        }}
      />
    );
  }

  return (
    <AdminPanel
      queueState={queueState}
      onUpdateState={(updated) => {
        handleUpdateState(updated);
        // If an announcement was triggered
        if (updated.lastCalledAt && updated.currentServing) {
          broadcastAnnouncement(
            updated.currentServing.plateNumber,
            updated.currentServing.service
          );
        }
      }}
      onViewDisplay={() => navigateToView('display')}
    />
  );
}
