import React, { useState, useRef } from 'react';
import {
  Check,
  ArrowRight,
  Plus,
  ArrowRightLeft,
  Trash2,
  Tv,
  Megaphone,
  ListChecks,
  Volume2,
  VolumeX,
  RotateCcw,
  History,
  ExternalLink,
  Image as ImageIcon,
  Upload,
  X,
} from 'lucide-react';
import { QueueItem, QueueState, DisplayLayoutMode } from '../types';
import { Logo } from './Logo';
import { announcePlate } from '../utils/audio';
import { saveDefaultLogo, getDefaultLogo } from '../utils/storage';

interface AdminPanelProps {
  queueState: QueueState;
  onUpdateState: (newState: QueueState) => void;
  onViewDisplay: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  queueState,
  onUpdateState,
  onViewDisplay,
}) => {
  // Input form state (cleared on load)
  const [newPlate, setNewPlate] = useState('');
  const [selectedService, setSelectedService] = useState(
    queueState.services[0] || '1. Private Emission Testing Center'
  );

  // Textarea edit states for Announcements & Services
  const [announcementsText, setAnnouncementsText] = useState(
    queueState.announcements.join('\n')
  );
  const [servicesText, setServicesText] = useState(
    queueState.services.join('\n')
  );

  // Logo replacement states
  const [pendingLogoUrl, setPendingLogoUrl] = useState<string | null>(null);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Status banners / toasts
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const showToast = (msg: string) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // 1. Add to Queue handler
  const handleAddToQueue = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPlate = newPlate.trim().toUpperCase();
    if (!cleanPlate) return;

    // Calculate next ticket number
    const maxTicket = Math.max(
      0,
      queueState.currentServing?.ticketNumber || 0,
      ...queueState.waitingQueue.map((item) => item.ticketNumber),
      ...queueState.servedHistory.map((item) => item.ticketNumber)
    );
    const nextTicketNumber = maxTicket + 1;

    const newItem: QueueItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ticketNumber: nextTicketNumber,
      plateNumber: cleanPlate,
      service: selectedService,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'waiting',
    };

    const updatedQueue = [...queueState.waitingQueue, newItem];
    onUpdateState({
      ...queueState,
      waitingQueue: updatedQueue,
    });

    setNewPlate('');
    showToast(`Added plate ${cleanPlate} to waiting queue (#${nextTicketNumber})`);
  };

  // 2. Serve specific client manually (Annotation: "Any client can be selected manually")
  const handleServeItem = (itemToServe: QueueItem) => {
    // Current serving moves to served history if exists
    let updatedHistory = [...queueState.servedHistory];
    if (queueState.currentServing) {
      updatedHistory.unshift({
        ...queueState.currentServing,
        status: 'served',
        servedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }

    const updatedWaiting = queueState.waitingQueue.filter(
      (item) => item.id !== itemToServe.id
    );

    const newServing: QueueItem = {
      ...itemToServe,
      status: 'serving',
    };

    onUpdateState({
      ...queueState,
      currentServing: newServing,
      waitingQueue: updatedWaiting,
      servedHistory: updatedHistory,
      lastCalledAt: Date.now(),
    });

    announcePlate(
      newServing.plateNumber,
      newServing.service,
      queueState.enableVoice,
      queueState.enableChime
    );
  };

  // 3. Call Next in Queue
  const handleCallNext = () => {
    if (queueState.waitingQueue.length === 0) {
      if (queueState.currentServing) {
        // Re-announce current client
        announcePlate(
          queueState.currentServing.plateNumber,
          queueState.currentServing.service,
          queueState.enableVoice,
          queueState.enableChime
        );
        showToast(`Re-announcing plate ${queueState.currentServing.plateNumber}`);
      } else {
        showToast('No clients currently waiting in queue.');
      }
      return;
    }

    const nextItem = queueState.waitingQueue[0];
    handleServeItem(nextItem);
  };

  // 4. Current Client Done
  const handleCurrentDone = () => {
    if (!queueState.currentServing) return;

    const completedItem: QueueItem = {
      ...queueState.currentServing,
      status: 'served',
      servedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    onUpdateState({
      ...queueState,
      currentServing: null,
      servedHistory: [completedItem, ...queueState.servedHistory],
    });

    showToast(`Marked plate ${completedItem.plateNumber} as done`);
  };

  // 5. Transfer item (transfers to any selected service from the services list)
  const [transferModalItem, setTransferModalItem] = useState<QueueItem | null>(null);
  const [transferTargetService, setTransferTargetService] = useState<string>('');

  const openTransferModal = (item: QueueItem) => {
    setTransferModalItem(item);
    const currentIdx = queueState.services.indexOf(item.service);
    const fallback =
      queueState.services[(currentIdx + 1) % queueState.services.length] ||
      queueState.services[0] ||
      item.service;
    setTransferTargetService(fallback);
  };

  const handleTransfer = (itemToTransfer: QueueItem, newService: string) => {
    if (!newService) return;

    let updatedWaiting = [...queueState.waitingQueue];
    let updatedServing = queueState.currentServing;

    if (queueState.currentServing && queueState.currentServing.id === itemToTransfer.id) {
      updatedServing = {
        ...queueState.currentServing,
        service: newService,
      };
    } else {
      updatedWaiting = queueState.waitingQueue.map((item) => {
        if (item.id === itemToTransfer.id) {
          return {
            ...item,
            service: newService,
            status: 'waiting' as const,
          };
        }
        return item;
      });
    }

    onUpdateState({
      ...queueState,
      waitingQueue: updatedWaiting,
      currentServing: updatedServing,
    });

    showToast(`Transferred ${itemToTransfer.plateNumber} to "${newService}"`);
    setTransferModalItem(null);
  };

  // 6. Delete item from queue
  const handleDelete = (itemId: string, plateNumber: string) => {
    const updated = queueState.waitingQueue.filter((i) => i.id !== itemId);
    onUpdateState({
      ...queueState,
      waitingQueue: updated,
    });
    showToast(`Removed ${plateNumber} from queue`);
  };

  // 7. Save Announcements
  const handleSaveAnnouncements = () => {
    const lines = announcementsText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    onUpdateState({
      ...queueState,
      announcements: lines.length > 0 ? lines : ['Welcome to MGN - CERTIFIED TRANSPORT EXPERTS.'],
    });
    showToast('Announcements updated successfully!');
  };

  // 8. Save Services
  const handleSaveServices = () => {
    const lines = servicesText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const validLines = lines.length > 0 ? lines : queueState.services;
    onUpdateState({
      ...queueState,
      services: validLines,
    });
    if (!validLines.includes(selectedService)) {
      setSelectedService(validLines[0]);
    }
    showToast('Services offered list updated successfully!');
  };

  // 9. Re-announce currently serving client
  const handleRepeatCall = () => {
    if (!queueState.currentServing) return;
    announcePlate(
      queueState.currentServing.plateNumber,
      queueState.currentServing.service,
      queueState.enableVoice,
      queueState.enableChime
    );
    onUpdateState({
      ...queueState,
      lastCalledAt: Date.now(),
    });
    showToast(`Announcing plate ${queueState.currentServing.plateNumber}...`);
  };

  // 10. Logo handling: browse, auto-optimize image, and save
  const handleLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    setIsProcessingLogo(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;

      // Create an image to optimize dimensions for fast loading & safe storage
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 400;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimized = canvas.toDataURL('image/png');
            setPendingLogoUrl(optimized);
          } else {
            setPendingLogoUrl(dataUrl);
          }
          setIsProcessingLogo(false);
          showToast('New logo loaded! Click "Save Logo" to apply.');
        } catch {
          setPendingLogoUrl(dataUrl);
          setIsProcessingLogo(false);
          showToast('New logo loaded! Click "Save Logo" to apply.');
        }
      };
      img.onerror = () => {
        setIsProcessingLogo(false);
        showToast('Failed to process image file.');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setIsProcessingLogo(false);
      showToast('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLogo = () => {
    if (!pendingLogoUrl) {
      showToast('Please browse and select an image first.');
      return;
    }
    saveDefaultLogo(pendingLogoUrl);
    onUpdateState({
      ...queueState,
      customLogoUrl: pendingLogoUrl,
    });
    setPendingLogoUrl(null);
    showToast('Logo saved as the default logo successfully!');
  };

  const handleResetLogo = () => {
    saveDefaultLogo(null);
    onUpdateState({
      ...queueState,
      customLogoUrl: null,
    });
    setPendingLogoUrl(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
    showToast('Reset to original MGN emblem seal.');
  };

  const openDisplayPopout = () => {
    window.open(`${window.location.origin}?view=display`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800 flex flex-col font-sans overflow-x-hidden overflow-y-auto">
      {/* Toast Notification */}
      {saveMessage && (
        <div className="fixed top-4 right-4 z-50 bg-neutral-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 border border-neutral-700 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 sticky top-0 z-40 flex items-center justify-between shadow-xs gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
          <Logo size="md" theme="light" customLogoUrl={queueState.customLogoUrl} />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Quick Sound/Voice Toggles */}
          <button
            onClick={() =>
              onUpdateState({
                ...queueState,
                enableVoice: !queueState.enableVoice,
              })
            }
            title={queueState.enableVoice ? 'Speech Voice Enabled' : 'Speech Voice Muted'}
            className={`p-1.5 sm:p-2 rounded-lg border transition-colors ${
              queueState.enableVoice
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
            }`}
          >
            {queueState.enableVoice ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* View History Button */}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="View served clients history"
          >
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />
            <span className="hidden md:inline">History</span>
            <span className="text-[11px] font-bold text-slate-700">({queueState.servedHistory.length})</span>
          </button>

          {/* View Display Action Button */}
          <div className="flex items-center gap-1">
            <button
              onClick={onViewDisplay}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-all active:scale-95"
            >
              <Tv className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />
              <span className="hidden sm:inline">View Display</span>
              <span className="sm:hidden">Display</span>
            </button>
            <button
              onClick={openDisplayPopout}
              title="Open Display in new window for TV"
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 md:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {/* Upper Row: Left Column (Add, Now Serving, Stats, Layout) + Right Column (Waiting Queue) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* Left Column (Approx 5 cols on large screen) */}
          <div className="lg:col-span-5 space-y-5 sm:space-y-6">
            {/* 1. Add to Queue Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3.5 sm:space-y-4">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Add to Queue
              </h2>

              <form onSubmit={handleAddToQueue} className="space-y-3.5 sm:space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Plate Number
                  </label>
                  <input
                    type="text"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                    placeholder="e.g. TEST 1342 or ABC 1234"
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm font-semibold tracking-wider text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all placeholder:text-slate-400 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Service
                  </label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base sm:text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all appearance-none cursor-pointer"
                  >
                    {queueState.services.map((service, index) => (
                      <option key={index} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs transition-colors cursor-pointer active:scale-[0.99] min-h-[42px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Queue</span>
                </button>
              </form>
            </div>

            {/* 2. Now Serving Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3.5 sm:space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Now Serving
                </h2>
                {queueState.currentServing && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openTransferModal(queueState.currentServing!)}
                      title="Transfer currently serving client to another service"
                      className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors text-xs flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Transfer</span>
                    </button>
                    <button
                      onClick={handleRepeatCall}
                      title="Repeat Announcement"
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors text-xs flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Repeat</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Highlighted current client box */}
              <div className="border-2 border-red-500 rounded-xl p-4 sm:p-6 text-center bg-red-50/20 shadow-xs">
                {queueState.currentServing ? (
                  <>
                    <div className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight break-words max-w-full leading-tight">
                      {queueState.currentServing.plateNumber}
                    </div>
                    <div className="mt-2 text-xs sm:text-sm font-semibold text-slate-600 truncate max-w-full">
                      #{queueState.currentServing.ticketNumber} · {queueState.currentServing.service}
                    </div>
                  </>
                ) : (
                  <div className="py-5 sm:py-6 text-slate-400 text-xs sm:text-sm font-semibold">
                    No client currently being served
                  </div>
                )}
              </div>

              {/* Action Buttons: [ Done ] and [ Call Next ] */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <button
                  onClick={handleCurrentDone}
                  disabled={!queueState.currentServing}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-colors cursor-pointer min-h-[42px]"
                >
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Done</span>
                </button>

                <button
                  onClick={handleCallNext}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs transition-colors cursor-pointer min-h-[42px]"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Call Next</span>
                </button>
              </div>
            </div>

            {/* 3. Metric Stats Grid (Waiting, Served) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 text-center shadow-xs">
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 tabular-nums">
                  {queueState.waitingQueue.length}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">
                  Waiting
                </div>
              </div>

              <div
                onClick={() => setShowHistoryModal(true)}
                className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 text-center shadow-xs cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                  {queueState.servedHistory.length}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">
                  Served
                </div>
              </div>
            </div>

            {/* 4. Display Layout Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Tv className="w-4 h-4 text-emerald-600" />
                <span>Display Layout</span>
              </div>
              <p className="text-xs text-slate-500">
                Choose how the queue display is arranged.
              </p>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-1">
                {(
                  [
                    { id: 'standard', label: 'Standard' },
                    { id: 'focused', label: 'Now Focus' },
                    { id: 'queue_list', label: 'Queue List' },
                  ] as { id: DisplayLayoutMode; label: string }[]
                ).map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() =>
                      onUpdateState({
                        ...queueState,
                        layoutMode: layout.id,
                      })
                    }
                    className={`py-2 px-1 sm:px-2 text-[11px] sm:text-xs font-semibold rounded-lg border text-center transition-all truncate ${
                      queueState.layoutMode === layout.id
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {layout.label}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">Sound Chime</span>
                <button
                  onClick={() =>
                    onUpdateState({
                      ...queueState,
                      enableChime: !queueState.enableChime,
                    })
                  }
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                    queueState.enableChime
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {queueState.enableChime ? 'Active' : 'Off'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Waiting Queue (7 cols on lg) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-6 h-full flex flex-col">
              <div className="flex flex-col xs:flex-row xs:items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 gap-1 xs:gap-0">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Waiting Queue · {queueState.waitingQueue.length}
                </h2>
                {queueState.waitingQueue.length > 0 && (
                  <span className="text-xs text-slate-400 font-medium">
                    Select any client manually to serve
                  </span>
                )}
              </div>

              {/* Queue List Items */}
              <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[480px] sm:max-h-[580px] lg:max-h-[640px] py-1">
                {queueState.waitingQueue.length === 0 ? (
                  <div className="py-12 sm:py-16 text-center text-slate-400">
                    <p className="font-semibold text-base">Queue is clear</p>
                    <p className="text-xs mt-1 text-slate-400">
                      Add a plate number on the left to start queuing clients.
                    </p>
                  </div>
                ) : (
                  queueState.waitingQueue.map((item, index) => (
                    <div
                      key={item.id}
                      className="py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 hover:bg-slate-50/80 px-2 sm:px-3 rounded-lg transition-colors group"
                    >
                      {/* Left: Number circle badge + Plate + Service */}
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs sm:text-sm flex items-center justify-center shrink-0">
                          {index + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate">
                            {item.plateNumber}
                          </div>
                          <div className="text-[11px] sm:text-xs text-slate-500 truncate max-w-[200px] xs:max-w-[260px] sm:max-w-[320px]">
                            {item.service}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleServeItem(item)}
                          className="inline-flex items-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-2.5 sm:px-3.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs transition-colors cursor-pointer active:scale-95 min-h-[34px]"
                          title="Serve this client out of order"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span>Serve</span>
                        </button>

                        <button
                          onClick={() => openTransferModal(item)}
                          className="inline-flex items-center gap-1 py-1.5 sm:py-2 px-2 sm:px-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 rounded-lg transition-colors cursor-pointer active:scale-95 min-h-[34px]"
                          title="Transfer to another service in the list"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
                          <span>Transfer</span>
                        </button>

                        <button
                          onClick={() => handleDelete(item.id, item.plateNumber)}
                          className="p-1.5 sm:p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center"
                          title="Remove from queue"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lower Row: Logo Management + Announcements + Services Offered */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 pt-2">
          {/* Card 1: Company Logo (browse & save) */}
          <div
            id="logo-management-card"
            className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col justify-between space-y-3.5 sm:space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Company Logo
                  </h3>
                </div>
                {pendingLogoUrl ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                    Unsaved Preview
                  </span>
                ) : queueState.customLogoUrl ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                    Custom Logo
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded-full">
                    Default MGN Seal
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Replace with your custom business logo. Browse an image file and save to apply across all screens.
              </p>

              {/* Live Preview on both Light & Dark Theme */}
              <div className="pt-2">
                <div className="text-[11px] font-semibold text-slate-600 mb-1.5">
                  Logo Appearance Preview
                </div>
                <div className="grid grid-cols-2 gap-2 p-2 sm:p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  {/* Light background (Settings Panel) */}
                  <div className="flex flex-col items-center justify-center p-2 bg-white rounded-md border border-slate-200 shadow-2xs">
                    <div className="text-[10px] font-medium text-slate-400 mb-1">
                      Settings Header
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-slate-200 flex items-center justify-center overflow-hidden bg-white shadow-xs p-1">
                      {pendingLogoUrl ? (
                        <img
                          src={pendingLogoUrl}
                          alt="Pending Logo"
                          className="w-full h-full object-contain"
                        />
                      ) : queueState.customLogoUrl ? (
                        <img
                          src={queueState.customLogoUrl}
                          alt="Current Logo"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Logo size="sm" theme="light" showSubtitle={false} />
                      )}
                    </div>
                  </div>

                  {/* Dark background (TV Display) */}
                  <div className="flex flex-col items-center justify-center p-2 bg-[#03171d] rounded-md border border-[#0f343e] shadow-2xs">
                    <div className="text-[10px] font-medium text-teal-400/80 mb-1">
                      TV Display
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-teal-500/40 flex items-center justify-center overflow-hidden bg-white shadow-xs p-1">
                      {pendingLogoUrl ? (
                        <img
                          src={pendingLogoUrl}
                          alt="Pending Logo"
                          className="w-full h-full object-contain"
                        />
                      ) : queueState.customLogoUrl ? (
                        <img
                          src={queueState.customLogoUrl}
                          alt="Current Logo"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Logo size="sm" theme="dark" showSubtitle={false} />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleLogoFile(file);
                  }
                }}
              />

              {/* Drag & Drop / Click Dropzone */}
              <div
                onClick={() => logoInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingLogo(true);
                }}
                onDragLeave={() => setIsDraggingLogo(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingLogo(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    handleLogoFile(file);
                  }
                }}
                className={`mt-2 border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all ${
                  isDraggingLogo
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex flex-col items-center justify-center gap-1">
                  <Upload className={`w-5 h-5 ${isDraggingLogo ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div className="text-xs font-semibold text-slate-700">
                    {isProcessingLogo ? 'Processing image...' : 'Click to Browse Logo File'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Supports PNG, JPG, SVG, WebP
                  </div>
                </div>
              </div>
            </div>

            {/* Logo Action Buttons */}
            <div className="pt-2 space-y-2">
              {pendingLogoUrl ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveLogo}
                    disabled={isProcessingLogo}
                    className="flex-1 py-2.5 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 min-h-[40px]"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save as Default Logo</span>
                  </button>
                  <button
                    onClick={() => {
                      setPendingLogoUrl(null);
                      if (logoInputRef.current) logoInputRef.current.value = '';
                    }}
                    className="py-2.5 px-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 min-h-[40px]"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 min-h-[40px]"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Browse Logo</span>
                  </button>
                  {queueState.customLogoUrl && (
                    <button
                      onClick={() => {
                        saveDefaultLogo(queueState.customLogoUrl || null);
                        showToast('Current logo is confirmed as the default logo!');
                      }}
                      className="w-full py-2 px-3 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px]"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Current Logo is Default</span>
                    </button>
                  )}
                </div>
              )}

              {queueState.customLogoUrl && (
                <button
                  onClick={handleResetLogo}
                  className="w-full py-2 px-3 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to MGN Seal</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Announcements */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Announcements
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                One announcement per line. They scroll continuously at the bottom of the display.
              </p>
            </div>

            {/* Zero space between textarea and save button */}
            <div className="flex flex-col pt-1">
              <textarea
                value={announcementsText}
                onChange={(e) => setAnnouncementsText(e.target.value)}
                rows={4}
                className="w-full p-3 text-sm sm:text-xs font-normal text-slate-800 border border-slate-300 rounded-t-lg rounded-b-none border-b-0 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all leading-relaxed resize-y font-mono block"
                placeholder="Welcome to MGN - CERTIFIED TRANSPORT EXPERTS.&#10;Please wait for your plate number to be called."
              />
              <button
                onClick={handleSaveAnnouncements}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-t-none rounded-b-lg shadow-xs transition-colors cursor-pointer block min-h-[40px]"
              >
                Save Announcements
              </button>
            </div>
          </div>

          {/* Card 3: Services Offered (Spans 2 columns on tablet md for balanced grid) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col justify-between space-y-3 md:col-span-2 lg:col-span-1">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Services Offered
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                One service per line. These appear on the display and in the service dropdown.
              </p>
            </div>

            {/* Zero space between textarea and save button */}
            <div className="flex flex-col pt-1">
              <textarea
                value={servicesText}
                onChange={(e) => setServicesText(e.target.value)}
                rows={4}
                className="w-full p-3 text-sm sm:text-xs font-normal text-slate-800 border border-slate-300 rounded-t-lg rounded-b-none border-b-0 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all leading-relaxed resize-y font-mono block"
                placeholder="1. Private Emission Testing Center&#10;2. Driving School..."
              />
              <button
                onClick={handleSaveServices}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-t-none rounded-b-lg shadow-xs transition-colors cursor-pointer block min-h-[40px]"
              >
                Save Services
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-xl border border-slate-200 space-y-3.5 sm:space-y-4 max-h-[85vh] sm:max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-700" />
                <span>Served Clients History ({queueState.servedHistory.length})</span>
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs min-h-0 pr-1">
              {queueState.servedHistory.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No served clients yet today.</p>
              ) : (
                queueState.servedHistory.map((item, idx) => (
                  <div key={item.id || idx} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-slate-900 text-sm">{item.plateNumber}</span>
                        <span className="text-slate-400 text-xs">#{item.ticketNumber}</span>
                      </div>
                      <div className="text-slate-500 truncate text-[11px] sm:text-xs">{item.service}</div>
                    </div>
                    <div className="text-right text-slate-400 font-mono shrink-0 text-[11px] sm:text-xs">
                      {item.servedAt || item.createdAt}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 shrink-0">
              <button
                onClick={() => {
                  onUpdateState({ ...queueState, servedHistory: [] });
                  showToast('History cleared.');
                }}
                className="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
              >
                Clear History
              </button>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Service Modal */}
      {transferModalItem && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setTransferModalItem(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-3.5 sm:space-y-4 max-h-[85vh] sm:max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">Transfer Client Service</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Select any service from the list to transfer this client.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTransferModalItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Client Info */}
            <div className="bg-slate-50 rounded-xl p-3 sm:p-3.5 border border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
              <div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                  Plate Number
                </span>
                <div className="flex items-baseline gap-1.5 sm:gap-2">
                  <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {transferModalItem.plateNumber}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    #{transferModalItem.ticketNumber}
                  </span>
                </div>
              </div>
              <div className="text-right max-w-[150px] xs:max-w-[200px] sm:max-w-[240px]">
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                  Current Service
                </span>
                <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-md inline-block truncate max-w-full">
                  {transferModalItem.service}
                </span>
              </div>
            </div>

            {/* Service Selection */}
            <div className="space-y-2 flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select New Service
                </label>
                <span className="text-[11px] text-slate-400">
                  {queueState.services.length} services available
                </span>
              </div>

              {/* Quick Select Dropdown */}
              <select
                value={transferTargetService}
                onChange={(e) => setTransferTargetService(e.target.value)}
                className="w-full px-3 py-2 text-base sm:text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:border-transparent cursor-pointer shrink-0"
              >
                {queueState.services.map((svc, idx) => (
                  <option key={idx} value={svc}>
                    {svc} {svc === transferModalItem.service ? '(Current)' : ''}
                  </option>
                ))}
              </select>

              {/* Clickable Services List with 1-click Transfer */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-48 sm:max-h-56 mt-1">
                {queueState.services.map((svc, idx) => {
                  const isCurrent = svc === transferModalItem.service;
                  const isSelected = svc === transferTargetService;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setTransferTargetService(svc);
                        handleTransfer(transferModalItem, svc);
                      }}
                      className={`w-full text-left p-2.5 sm:p-3 text-xs flex items-center justify-between transition-colors group cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/80 font-bold text-emerald-950'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isSelected ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        <span className="truncate">{svc}</span>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        {isCurrent && (
                          <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            Current
                          </span>
                        )}
                        <span className="text-emerald-700 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-[11px]">
                          Transfer <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setTransferModalItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleTransfer(transferModalItem, transferTargetService)}
                disabled={!transferTargetService}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 rounded-lg shadow-xs transition-colors cursor-pointer active:scale-95"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Confirm Transfer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
