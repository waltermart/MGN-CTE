import React, { useState, useRef } from 'react';
import {
  Check,
  ArrowRight,
  Plus,
  SkipForward,
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
  // Input form state
  const [newPlate, setNewPlate] = useState('TEST 1342');
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

  // 5. Skip item (moves to end of queue)
  const handleSkip = (itemToSkip: QueueItem) => {
    const remaining = queueState.waitingQueue.filter((i) => i.id !== itemToSkip.id);
    const updated = [...remaining, { ...itemToSkip, status: 'skipped' as const }];
    onUpdateState({
      ...queueState,
      waitingQueue: updated,
    });
    showToast(`Moved ${itemToSkip.plateNumber} to end of queue`);
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Toast Notification */}
      {saveMessage && (
        <div className="fixed top-4 right-4 z-50 bg-neutral-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 border border-neutral-700 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar matching Image 1 */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-6 md:px-8 py-3 sticky top-0 z-40 flex items-center justify-between shadow-xs gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
            {queueState.enableVoice ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {/* View History Button */}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden md:inline">History</span> ({queueState.servedHistory.length})
          </button>

          {/* View Display Action Button matching Image 1: [ 🖥 View Display ] */}
          <div className="flex items-center gap-1">
            <button
              onClick={onViewDisplay}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-all active:scale-95"
            >
              <Tv className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />
              <span className="hidden xs:inline">View Display</span>
              <span className="xs:hidden">Display</span>
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
          {/* Left Column (Approx 4 cols on large screen) */}
          <div className="lg:col-span-5 space-y-6">
            {/* 1. Add to Queue Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Add to Queue
              </h2>

              <form onSubmit={handleAddToQueue} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Plate Number
                  </label>
                  <input
                    type="text"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                    placeholder="e.g. TEST 1342 or ABC 1234"
                    className="w-full px-3.5 py-2.5 text-sm font-semibold tracking-wider text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all placeholder:text-slate-400 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Service
                  </label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all appearance-none cursor-pointer"
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
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs transition-colors cursor-pointer active:scale-[0.99]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Queue</span>
                </button>
              </form>
            </div>

            {/* 2. Now Serving Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Now Serving
                </h2>
                {queueState.currentServing && (
                  <button
                    onClick={handleRepeatCall}
                    title="Repeat Announcement"
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors text-xs flex items-center gap-1 font-medium"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Repeat</span>
                  </button>
                )}
              </div>

              {/* Highlighted current client box matching Image 1 */}
              <div className="border-2 border-red-500 rounded-xl p-6 text-center bg-red-50/20 shadow-xs">
                {queueState.currentServing ? (
                  <>
                    <div className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight">
                      {queueState.currentServing.plateNumber}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-600">
                      #{queueState.currentServing.ticketNumber} · {queueState.currentServing.service}
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-slate-400 text-sm font-semibold">
                    No client currently being served
                  </div>
                )}
              </div>

              {/* Action Buttons: [ Done ] and [ Call Next ] */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCurrentDone}
                  disabled={!queueState.currentServing}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Done</span>
                </button>

                <button
                  onClick={handleCallNext}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Call Next</span>
                </button>
              </div>
            </div>

            {/* 3. Metric Stats Grid (Waiting: 4, Served: 9) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-xs">
                <div className="text-3xl font-black text-emerald-600 tabular-nums">
                  {queueState.waitingQueue.length}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">
                  Waiting
                </div>
              </div>

              <div
                onClick={() => setShowHistoryModal(true)}
                className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-xs cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div className="text-3xl font-black text-slate-900 tabular-nums">
                  {queueState.servedHistory.length}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">
                  Served
                </div>
              </div>
            </div>

            {/* 4. Display Layout Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Tv className="w-4 h-4 text-emerald-600" />
                <span>Display Layout</span>
              </div>
              <p className="text-xs text-slate-500">
                Choose how the queue display is arranged.
              </p>

              <div className="grid grid-cols-3 gap-2 pt-1">
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
                    className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
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

          {/* Right Column: Waiting Queue (7 cols) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 h-full flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Waiting Queue · {queueState.waitingQueue.length}
                </h2>
                {queueState.waitingQueue.length > 0 && (
                  <span className="text-xs text-slate-400 font-medium">
                    Select any client manually to serve
                  </span>
                )}
              </div>

              {/* Queue List Items matching Image 1 */}
              <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[620px] py-1">
                {queueState.waitingQueue.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <p className="font-semibold text-base">Queue is clear</p>
                    <p className="text-xs mt-1 text-slate-400">
                      Add a plate number on the left to start queuing clients.
                    </p>
                  </div>
                ) : (
                  queueState.waitingQueue.map((item, index) => (
                    <div
                      key={item.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 hover:bg-slate-50/80 px-2 rounded-lg transition-colors group"
                    >
                      {/* Left: Number circle badge + Plate + Service */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Circle badge matching screenshot: light green circle with dark green number */}
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs sm:text-sm flex items-center justify-center shrink-0">
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                            {item.plateNumber}
                          </div>
                          <div className="text-[11px] sm:text-xs text-slate-500 truncate max-w-[180px] xs:max-w-[220px] sm:max-w-[280px]">
                            {item.service}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions matching screenshot: [ -> Serve ] [ |> Skip ] [ Trash ] */}
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleServeItem(item)}
                          className="inline-flex items-center gap-1 sm:gap-1.5 py-1.5 px-3 sm:px-3.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs transition-colors cursor-pointer active:scale-95"
                          title="Serve this client out of order"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span>Serve</span>
                        </button>

                        <button
                          onClick={() => handleSkip(item)}
                          className="inline-flex items-center gap-1 py-1.5 px-2 sm:px-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                          title="Skip to bottom of queue"
                        >
                          <SkipForward className="w-3.5 h-3.5 text-slate-500" />
                          <span>Skip</span>
                        </button>

                        <button
                          onClick={() => handleDelete(item.id, item.plateNumber)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* Card 1: Company Logo matching User Request (browse & save) */}
          <div
            id="logo-management-card"
            className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4"
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
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  {/* Light background (Settings Panel) */}
                  <div className="flex flex-col items-center justify-center p-2 bg-white rounded-md border border-slate-200 shadow-2xs">
                    <div className="text-[10px] font-medium text-slate-400 mb-1">
                      Settings Header
                    </div>
                    <div className="w-14 h-14 rounded-full border border-slate-200 flex items-center justify-center overflow-hidden bg-white shadow-xs p-1">
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
                    <div className="w-14 h-14 rounded-full border border-teal-500/40 flex items-center justify-center overflow-hidden bg-white shadow-xs p-1">
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
                    className="flex-1 py-2.5 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save as Default Logo</span>
                  </button>
                  <button
                    onClick={() => {
                      setPendingLogoUrl(null);
                      if (logoInputRef.current) logoInputRef.current.value = '';
                    }}
                    className="py-2.5 px-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
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
                      className="w-full py-2 px-3 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
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
                  className="w-full py-2 px-3 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to MGN Seal</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Announcements matching Image 2 (Zero space between textbox and save button) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-3">
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
                className="w-full p-3 text-xs font-normal text-slate-800 border border-slate-300 rounded-t-lg rounded-b-none border-b-0 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all leading-relaxed resize-y font-mono block"
                placeholder="Welcome to MGN - CERTIFIED TRANSPORT EXPERTS.&#10;Please wait for your plate number to be called."
              />
              <button
                onClick={handleSaveAnnouncements}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-t-none rounded-b-lg shadow-xs transition-colors cursor-pointer block"
              >
                Save Announcements
              </button>
            </div>
          </div>

          {/* Card 3: Services Offered matching Image 2 (Zero space between textbox and save button) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-3">
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
                className="w-full p-3 text-xs font-normal text-slate-800 border border-slate-300 rounded-t-lg rounded-b-none border-b-0 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all leading-relaxed resize-y font-mono block"
                placeholder="1. Private Emission Testing Center&#10;2. Driving School..."
              />
              <button
                onClick={handleSaveServices}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-t-none rounded-b-lg shadow-xs transition-colors cursor-pointer block"
              >
                Save Services
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-700" />
                <span>Served Clients History ({queueState.servedHistory.length})</span>
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
              {queueState.servedHistory.length === 0 ? (
                <p className="text-slate-400 text-center py-6">No served clients yet today.</p>
              ) : (
                queueState.servedHistory.map((item, idx) => (
                  <div key={item.id || idx} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{item.plateNumber}</span>
                      <span className="text-slate-400 ml-2">#{item.ticketNumber}</span>
                      <div className="text-slate-500">{item.service}</div>
                    </div>
                    <div className="text-right text-slate-400 font-mono">
                      {item.servedAt || item.createdAt}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  onUpdateState({ ...queueState, servedHistory: [] });
                  showToast('History cleared.');
                }}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Clear History
              </button>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-neutral-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
