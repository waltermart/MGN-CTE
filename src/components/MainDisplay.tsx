import React, { useState, useEffect } from 'react';
import { Settings, Maximize2, Minimize2, ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { QueueState } from '../types';
import { Logo } from './Logo';

interface MainDisplayProps {
  queueState: QueueState;
  onOpenSettings: () => void;
  onToggleVoice?: () => void;
}

export const MainDisplay: React.FC<MainDisplayProps> = ({
  queueState,
  onOpenSettings,
  onToggleVoice,
}) => {
  // Live Clock & Date matching Image 3: e.g. "05:30:24 AM", "Wednesday, October 7, 2026"
  const [currentTime, setCurrentTime] = useState({
    time: '',
    date: '',
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isPulseActive, setIsPulseActive] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format: hh:mm:ss A
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      // Format: Wednesday, October 7, 2026
      const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

      setCurrentTime({
        time: timeStr,
        date: dateStr,
      });
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Visual pulse / attention flash on Now Serving when a new call is triggered
  useEffect(() => {
    if (queueState.lastCalledAt) {
      setIsPulseActive(true);
      const timeout = setTimeout(() => setIsPulseActive(false), 2400);
      return () => clearTimeout(timeout);
    }
  }, [queueState.lastCalledAt, queueState.currentServing?.plateNumber]);

  // Listen to fullscreen changes across all browsers
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      setIsFullscreen(Boolean(document.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const docEl = document.documentElement as any;
    const doc = document as any;
    if (!document.fullscreenElement && !doc.webkitFullscreenElement) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
    }
  };

  // Next client in queue (first waiting item)
  const nextItem = queueState.waitingQueue.length > 0 ? queueState.waitingQueue[0] : null;

  // Split services offered into two balanced columns (like Image 3)
  const services = queueState.services;
  const col1Services: string[] = [];
  const col2Services: string[] = [];

  // If items follow 1., 2., 3., 4. numbering, odds go to col1 (1, 3, 5, 7, 9, 11), evens to col2 (2, 4, 6, 8, 10)
  // as explicitly rendered in Image 3:
  // Col 1: 1, 3, 5, 7, 9, 11
  // Col 2: 2, 4, 6, 8, 10
  services.forEach((service, index) => {
    // Check if the service string starts with a number like "1.", "2."
    const match = service.match(/^(\d+)\./);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num % 2 === 1) {
        col1Services.push(service);
      } else {
        col2Services.push(service);
      }
    } else {
      // Fallback: alternate indices
      if (index % 2 === 0) {
        col1Services.push(service);
      } else {
        col2Services.push(service);
      }
    }
  });

  // Announcement items for infinite marquee ticker
  const marqueeItems = queueState.announcements.length > 0
    ? queueState.announcements
    : ['Welcome to MGN - CERTIFIED TRANSPORT EXPERTS.', 'Please wait for your plate number to be called.'];

  // Formatter to insert line break on 3 or more words for clear visibility
  const renderServiceLabel = (service: string) => {
    const match = service.match(/^(\d+\.\s*)(.*)$/);
    const prefix = match ? match[1] : '';
    const text = match ? match[2] : service;

    const words = text.trim().split(/\s+/);
    if (words.length >= 3) {
      // Split into 2 lines on 3 or more words
      const splitIdx = Math.ceil(words.length / 2);
      const line1 = words.slice(0, splitIdx).join(' ');
      const line2 = words.slice(splitIdx).join(' ');
      return (
        <span className="inline-block leading-tight">
          <span>{prefix}{line1}</span>
          <br />
          <span>{line2}</span>
        </span>
      );
    }

    return <span className="inline-block leading-tight">{service}</span>;
  };

  return (
    <div
      className={`relative h-screen h-[100dvh] max-h-screen max-h-[100dvh] w-screen max-w-full bg-[#03171d] text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans ${
        isFullscreen ? 'is-fullscreen' : ''
      }`}
    >
      {/* Background Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-radial from-[#082a32]/40 via-transparent to-transparent pointer-events-none" />

      {/* Top Header Bar - Fluid responsive height */}
      <header className="relative z-20 shrink-0 px-2.5 sm:px-5 md:px-8 py-1.5 sm:py-2.5 flex items-center justify-between border-b border-[#0f343e]/70 bg-[#03171d]/95 backdrop-blur-xs gap-2">
        {/* Left: Brand Identity */}
        <div className="min-w-0 flex-1">
          <Logo size="md" theme="dark" showSubtitle={true} customLogoUrl={queueState.customLogoUrl} />
        </div>

        {/* Right: Digital Clock & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 shrink-0">
          <div className="text-right flex flex-col items-end">
            <div className="text-[clamp(1rem,2.1vw,2.4rem)] font-mono font-bold tracking-tight text-[#22d3ee] drop-shadow-[0_0_12px_rgba(34,211,238,0.4)] leading-none">
              {currentTime.time || '05:30:24 AM'}
            </div>
            <div className="text-[clamp(0.55rem,0.85vw,0.9rem)] font-semibold text-teal-200/90 leading-tight mt-0.5 sm:mt-1 tracking-wide">
              {currentTime.date || 'Wednesday, October 7, 2026'}
            </div>
          </div>

          {/* Direct Fullscreen Button for Quick Access on any Browser */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="p-1 sm:p-2 text-teal-300/70 hover:text-teal-200 hover:bg-[#082c35] rounded-lg transition-colors cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5" />
            )}
          </button>

          {/* Quick Menu / Gear Icon */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              title="Display Options"
              className="p-1 sm:p-2 text-teal-300/70 hover:text-teal-200 hover:bg-[#082c35] rounded-lg transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5" />
            </button>

            {/* Gear dropdown options */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 sm:w-52 bg-[#062027] border border-[#134954] rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-teal-100 hover:bg-[#0c333c] rounded-lg transition-colors text-left font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-emerald-400" />
                  <span>Open Settings Panel</span>
                </button>

                <button
                  onClick={() => {
                    toggleFullscreen();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-teal-100 hover:bg-[#0c333c] rounded-lg transition-colors text-left cursor-pointer"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4 text-teal-300" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-teal-300" />
                  )}
                  <span>{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</span>
                </button>

                {onToggleVoice && (
                  <button
                    onClick={() => {
                      onToggleVoice();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-teal-100 hover:bg-[#0c333c] rounded-lg transition-colors text-left cursor-pointer"
                  >
                    {queueState.enableVoice ? (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-slate-400" />
                    )}
                    <span>Voice Callout: {queueState.enableVoice ? 'ON' : 'OFF'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area: Retains 2 Equal Columns on ALL screens, zero vertical scrolling */}
      <main className="relative z-10 flex-1 min-h-0 w-full max-w-[2400px] mx-auto px-2 sm:px-4 md:px-8 py-1 sm:py-2 md:py-3 grid grid-cols-2 gap-0 items-stretch overflow-hidden">
        {/* Left Column (50% width): NEXT and NOW SERVING with center horizontal line and vertical divider on right */}
        <div className="w-full h-full min-h-0 flex flex-col justify-between gap-1 sm:gap-2 overflow-hidden pr-2 sm:pr-4 md:pr-6 lg:pr-8 border-r border-teal-500/40 sm:border-r-2 sm:border-teal-500/50">
          {/* 1. NEXT Section - Compact proportional height */}
          <div className="shrink-0 space-y-0.5 sm:space-y-1">
            {/* Header increased by 20% */}
            <h2 className="text-center text-[clamp(0.85rem,min(1.8vw,2.5vh),1.85rem)] font-black tracking-[0.2em] sm:tracking-[0.35em] text-[#f59e0b] uppercase drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">
              N E X T
            </h2>

            {/* Compact Golden Card with Plate Number increased by 30% */}
            <div className="relative rounded-lg sm:rounded-xl border border-[#d97706]/50 bg-radial from-[#1e1b0c]/80 via-[#101918]/90 to-[#07191d] py-1 sm:py-1.5 md:py-2 px-2 sm:px-4 text-center shadow-[0_0_20px_rgba(245,158,11,0.06)]">
              {nextItem ? (
                <>
                  <div className="text-[clamp(1.4rem,min(5.2vw,7.6vh),5.5rem)] font-black text-[#fbbf24] tracking-wider drop-shadow-[0_0_16px_rgba(251,191,36,0.35)] leading-tight truncate">
                    {nextItem.plateNumber}
                  </div>
                  <div className="text-[clamp(0.6rem,min(1.05vw,1.5vh),1.05rem)] font-semibold tracking-wide text-amber-200/90 truncate leading-tight">
                    #{nextItem.ticketNumber} · {nextItem.service}
                  </div>
                </>
              ) : (
                <div className="py-1 text-slate-500 font-semibold text-[clamp(0.7rem,min(1.2vw,1.5vh),1.1rem)]">
                  -- NO CLIENT IN QUEUE --
                </div>
              )}
            </div>
          </div>

          {/* Horizontal Line in the center between sections */}
          <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-teal-400/80 to-transparent my-0.5 sm:my-1.5 shrink-0 shadow-[0_0_12px_rgba(45,212,191,0.5)]" />

          {/* 2. NOW SERVING Section - Auto expands to fill available height cleanly */}
          <div className="flex-1 min-h-0 flex flex-col justify-center space-y-0.5 sm:space-y-1 overflow-hidden">
            {/* Header */}
            <h2 className="text-center text-[clamp(1.05rem,min(2.4vw,3.2vh),2.25rem)] font-black tracking-[0.2em] sm:tracking-[0.4em] text-[#10b981] uppercase drop-shadow-[0_0_14px_rgba(16,185,129,0.45)] shrink-0">
              N O W &nbsp; S E R V I N G
            </h2>

            {/* Glowing Emerald / Teal Card fitting within viewport */}
            <div
              className={`relative rounded-xl sm:rounded-2xl md:rounded-3xl border-2 md:border-[3px] border-[#059669]/80 bg-radial from-[#033433]/95 via-[#042426]/95 to-[#03171d] p-1.5 sm:p-3 md:p-5 text-center shadow-[0_0_55px_rgba(16,185,129,0.25)] flex flex-col items-center justify-center flex-1 min-h-0 w-full transition-all duration-300 overflow-hidden ${
                isPulseActive ? 'ring-4 ring-emerald-400 scale-[1.01] shadow-[0_0_75px_rgba(16,185,129,0.6)]' : ''
              }`}
            >
              {queueState.currentServing ? (
                <>
                  <div
                    className={`font-bold tracking-[0.2em] sm:tracking-[0.28em] text-[#34d399] uppercase select-none leading-none drop-shadow-[0_0_8px_rgba(52,211,153,0.4)] ${
                      isFullscreen
                        ? 'text-[clamp(1.49rem,min(3.15vw,4.2vh),3.15rem)] mb-1.5 sm:mb-2.5'
                        : 'text-[clamp(1.14rem,min(2.1vw,2.8vh),2.1rem)] mb-1 sm:mb-1.5'
                    }`}
                  >
                    PLATE NUMBER
                  </div>
                  <div
                    className={`font-black text-white tracking-tight drop-shadow-[0_0_50px_rgba(255,255,255,0.7)] leading-none select-text max-w-full text-center truncate ${
                      isFullscreen
                        ? 'text-[clamp(2.38rem,min(11.9vw,17.3vh),14.6rem)]'
                        : 'text-[clamp(2.2rem,min(11vw,16vh),13.5rem)]'
                    }`}
                  >
                    {queueState.currentServing.plateNumber}
                  </div>
                  <div
                    className={`font-bold tracking-wide text-emerald-300 drop-shadow-xs truncate max-w-full leading-tight ${
                      isFullscreen
                        ? 'mt-1.5 sm:mt-3 text-[clamp(1.05rem,min(2vw,3vh),2.25rem)]'
                        : 'mt-1 sm:mt-2 text-[clamp(0.7rem,min(1.3vw,2vh),1.5rem)]'
                    }`}
                  >
                    #{queueState.currentServing.ticketNumber} · {queueState.currentServing.service}
                  </div>
                </>
              ) : (
                <div
                  className={`text-slate-500 font-black tracking-wide ${
                    isFullscreen
                      ? 'text-[clamp(1.65rem,min(3.8vw,4.8vh),3.75rem)]'
                      : 'text-[clamp(1.1rem,min(2.5vw,3.2vh),2.5rem)]'
                  }`}
                >
                  WAITING FOR NEXT CLIENT
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (50% width): SERVICES OFFERED */}
        <div className="w-full h-full min-h-0 flex flex-col justify-center py-0.5 sm:py-1 md:py-2 pl-2 sm:pl-4 md:pl-6 lg:pl-8 overflow-hidden">
          {/* Centered heading: character spacing reduced, bold, font size increased by 50% */}
          <h2 className="shrink-0 text-center text-[clamp(1.25rem,min(3.8vw,6.8vh),5.5rem)] font-black tracking-normal text-[#10b981] uppercase drop-shadow-[0_0_20px_rgba(16,185,129,0.5)] leading-tight mb-1 sm:mb-2">
            <span className="inline-block">SERVICES</span>{' '}
            <span className="inline-block">OFFERED</span>
          </h2>

          {/* 2-Column Services Grid: Placed tightly under heading */}
          <div className="min-h-0 grid grid-cols-2 gap-x-2 sm:gap-x-4 md:gap-x-6 xl:gap-x-8 content-center overflow-hidden mt-0.5 sm:mt-1.5">
            {/* Column 1 */}
            <div
              className={
                isFullscreen
                  ? 'space-y-[clamp(0.2rem,1.2vh,1.15rem)]'
                  : 'space-y-[clamp(0.15rem,0.8vh,0.75rem)]'
              }
            >
              {col1Services.map((service, idx) => (
                <div key={`col1-${idx}`} className="flex items-start gap-1 sm:gap-2 md:gap-2.5">
                  <span
                    className={`text-[#10b981] font-black shrink-0 leading-none mt-0.5 ${
                      isFullscreen
                        ? 'text-[clamp(1.4rem,min(3.3vw,4.5vh),3.75rem)]'
                        : 'text-[clamp(0.95rem,min(2.2vw,3vh),2.5rem)]'
                    }`}
                  >
                    ✓
                  </span>
                  <span
                    className={`text-slate-100 tracking-wide font-bold leading-tight break-words ${
                      isFullscreen
                        ? 'text-[clamp(1.02rem,min(2.1vw,3.3vh),2.92rem)]'
                        : 'text-[clamp(0.68rem,min(1.4vw,2.2vh),1.95rem)]'
                    }`}
                  >
                    {renderServiceLabel(service)}
                  </span>
                </div>
              ))}
            </div>

            {/* Column 2 */}
            <div
              className={
                isFullscreen
                  ? 'space-y-[clamp(0.2rem,1.2vh,1.15rem)]'
                  : 'space-y-[clamp(0.15rem,0.8vh,0.75rem)]'
              }
            >
              {col2Services.map((service, idx) => (
                <div key={`col2-${idx}`} className="flex items-start gap-1 sm:gap-2 md:gap-2.5">
                  <span
                    className={`text-[#10b981] font-black shrink-0 leading-none mt-0.5 ${
                      isFullscreen
                        ? 'text-[clamp(1.4rem,min(3.3vw,4.5vh),3.75rem)]'
                        : 'text-[clamp(0.95rem,min(2.2vw,3vh),2.5rem)]'
                    }`}
                  >
                    ✓
                  </span>
                  <span
                    className={`text-slate-100 tracking-wide font-bold leading-tight break-words ${
                      isFullscreen
                        ? 'text-[clamp(1.02rem,min(2.1vw,3.3vh),2.92rem)]'
                        : 'text-[clamp(0.68rem,min(1.4vw,2.2vh),1.95rem)]'
                    }`}
                  >
                    {renderServiceLabel(service)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Announcement Bar / Continuous Marquee Ticker */}
      <footer className="relative z-20 shrink-0 bg-[#021014] border-t border-[#0b2931] py-1 sm:py-2 px-2 sm:px-4 overflow-hidden shadow-2xl">
        <div className="flex items-center overflow-hidden">
          {/* Seamless CSS Marquee */}
          <div className="animate-marquee whitespace-nowrap text-[clamp(0.65rem,1.4vh,1.05rem)] font-semibold tracking-wide">
            {/* Render 4 duplicates to ensure an uninterrupted smooth continuous loop */}
            {[0, 1, 2, 3].map((loopIdx) => (
              <span key={loopIdx} className="inline-flex items-center">
                {marqueeItems.map((item, itemIdx) => (
                  <span key={`${loopIdx}-${itemIdx}`} className="inline-flex items-center mx-2.5 sm:mx-4 md:mx-5">
                    <span className="text-[#22d3ee] mr-1 sm:mr-2 text-xs sm:text-sm md:text-base">★</span>
                    <span className="text-white drop-shadow-xs">{item}</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};
