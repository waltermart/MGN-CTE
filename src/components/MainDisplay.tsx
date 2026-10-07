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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
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
    <div className="relative h-screen h-[100dvh] max-h-screen max-h-[100dvh] w-screen max-w-full bg-[#03171d] text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Background Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-radial from-[#082a32]/40 via-transparent to-transparent pointer-events-none" />

      {/* Top Header Bar matching Image 3 - Fixed height */}
      <header className="relative z-20 shrink-0 px-3 sm:px-6 md:px-10 py-2 sm:py-3 flex items-center justify-between border-b border-[#0f343e]/70 bg-[#03171d]/95 backdrop-blur-xs gap-2">
        {/* Left: Brand Identity */}
        <Logo size="md" theme="dark" showSubtitle={true} customLogoUrl={queueState.customLogoUrl} />

        {/* Right: Digital Clock & Settings Action */}
        <div className="flex items-center gap-2.5 sm:gap-5 shrink-0">
          <div className="text-right flex flex-col items-end">
            <div className="text-base sm:text-2xl md:text-3xl font-mono font-bold tracking-tight text-[#22d3ee] drop-shadow-[0_0_12px_rgba(34,211,238,0.4)] leading-none">
              {currentTime.time || '05:30:24 AM'}
            </div>
            <div className="text-[10px] sm:text-xs md:text-sm font-semibold text-teal-200/90 leading-tight mt-1 sm:mt-1.5 tracking-wide">
              {currentTime.date || 'Wednesday, October 7, 2026'}
            </div>
          </div>

          {/* Quick Menu / Gear Icon matching top right in Image 3 */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              title="Display Options"
              className="p-1.5 sm:p-2 text-teal-300/60 hover:text-teal-200 hover:bg-[#082c35] rounded-lg transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Gear dropdown options */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 sm:w-52 bg-[#062027] border border-[#134954] rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-teal-100 hover:bg-[#0c333c] rounded-lg transition-colors text-left font-semibold"
                >
                  <ArrowLeft className="w-4 h-4 text-emerald-400" />
                  <span>Open Settings Panel</span>
                </button>

                <button
                  onClick={() => {
                    toggleFullscreen();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-teal-100 hover:bg-[#0c333c] rounded-lg transition-colors text-left"
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
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-teal-100 hover:bg-[#0c333c] rounded-lg transition-colors text-left"
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

      {/* Main Content Area: Equal 50/50 Column Widths, zero scrolling */}
      <main className="relative z-10 flex-1 min-h-0 w-full max-w-[1850px] mx-auto px-3 sm:px-6 md:px-10 py-1.5 sm:py-2 md:py-3.5 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-0 items-stretch overflow-hidden">
        {/* Left Column (Equal 50% width): NEXT and NOW SERVING with center horizontal line and vertical divider on right */}
        <div className="w-full h-full min-h-0 flex flex-col justify-between gap-1 sm:gap-2 overflow-hidden md:pr-6 lg:pr-10 md:border-r-2 md:border-teal-500/50">
          {/* 1. NEXT Section - Compact height */}
          <div className="shrink-0 space-y-0.5 sm:space-y-1">
            {/* Header increased by 20% */}
            <h2 className="text-center text-[clamp(1.2rem,2.8vh,2.0rem)] font-black tracking-[0.35em] text-[#f59e0b] uppercase drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">
              N E X T
            </h2>

            {/* Compact Golden Card with Plate Number increased by 30% */}
            <div className="relative rounded-xl border border-[#d97706]/50 bg-radial from-[#1e1b0c]/80 via-[#101918]/90 to-[#07191d] py-1 sm:py-2 px-3 sm:px-5 text-center shadow-[0_0_20px_rgba(245,158,11,0.06)]">
              {nextItem ? (
                <>
                  <div className="text-[clamp(3.4rem,9.4vh,7.15rem)] font-black text-[#fbbf24] tracking-wider drop-shadow-[0_0_16px_rgba(251,191,36,0.35)] leading-tight truncate">
                    {nextItem.plateNumber}
                  </div>
                  <div className="text-[clamp(0.75rem,1.6vh,1.1rem)] font-semibold tracking-wide text-amber-200/90 truncate leading-tight">
                    #{nextItem.ticketNumber} · {nextItem.service}
                  </div>
                </>
              ) : (
                <div className="py-2 text-slate-500 font-semibold text-[clamp(0.85rem,1.7vh,1.2rem)]">
                  -- NO CLIENT IN QUEUE --
                </div>
              )}
            </div>
          </div>

          {/* Horizontal Line in the center between sections */}
          <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-teal-400/80 to-transparent my-1 sm:my-2 shrink-0 shadow-[0_0_12px_rgba(45,212,191,0.5)]" />

          {/* 2. NOW SERVING Section - Auto expands to fill available height cleanly */}
          <div className="flex-1 min-h-0 flex flex-col justify-center space-y-0.5 sm:space-y-1.5 overflow-hidden">
            {/* Header increased to 150% */}
            <h2 className="text-center text-[clamp(1.3rem,3vh,2.2rem)] font-black tracking-[0.3em] sm:tracking-[0.4em] text-[#10b981] uppercase drop-shadow-[0_0_14px_rgba(16,185,129,0.45)] shrink-0">
              N O W &nbsp; S E R V I N G
            </h2>

            {/* Glowing Emerald / Teal Card fitting within viewport */}
            <div
              className={`relative rounded-2xl sm:rounded-3xl border-2 md:border-[3px] border-[#059669]/80 bg-radial from-[#033433]/95 via-[#042426]/95 to-[#03171d] p-2 sm:p-4 md:p-6 text-center shadow-[0_0_55px_rgba(16,185,129,0.25)] flex flex-col items-center justify-center flex-1 min-h-0 w-full transition-all duration-300 overflow-hidden ${
                isPulseActive ? 'ring-4 ring-emerald-400 scale-[1.01] shadow-[0_0_75px_rgba(16,185,129,0.6)]' : ''
              }`}
            >
              {queueState.currentServing ? (
                <>
                  <div className="text-[clamp(4.5rem,22vh,18rem)] font-black text-white tracking-tight drop-shadow-[0_0_50px_rgba(255,255,255,0.7)] leading-none select-text max-w-full text-center truncate">
                    {queueState.currentServing.plateNumber}
                  </div>
                  <div className="mt-1 sm:mt-2 text-[clamp(0.85rem,2.2vh,1.75rem)] font-bold tracking-wide text-emerald-300 drop-shadow-xs truncate max-w-full leading-tight">
                    #{queueState.currentServing.ticketNumber} · {queueState.currentServing.service}
                  </div>
                </>
              ) : (
                <div className="text-slate-500 font-black text-[clamp(1.5rem,3.5vh,3rem)] tracking-wide">
                  WAITING FOR NEXT CLIENT
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Equal 50% width): SERVICES OFFERED */}
        <div className="w-full h-full min-h-0 flex flex-col justify-center py-1 sm:py-2 md:pl-6 lg:pl-10 overflow-hidden">
          {/* Centered heading: character spacing reduced, bold, font size increased by 50% */}
          <h2 className="shrink-0 text-center text-[clamp(2.6rem,7.4vh,6.25rem)] font-black tracking-normal text-[#10b981] uppercase drop-shadow-[0_0_20px_rgba(16,185,129,0.5)] leading-tight mb-1 sm:mb-2">
            <span className="inline-block">SERVICES</span>{' '}
            <span className="inline-block">OFFERED</span>
          </h2>

          {/* 2-Column Services Grid: Placed tightly under heading, font decreased by 20%, 3+ words break into 2 lines */}
          <div className="min-h-0 grid grid-cols-2 gap-x-4 sm:gap-x-6 xl:gap-x-10 content-center overflow-hidden mt-1 sm:mt-2">
            {/* Column 1 */}
            <div className="space-y-[clamp(0.2rem,0.9vh,0.85rem)]">
              {col1Services.map((service, idx) => (
                <div key={`col1-${idx}`} className="flex items-start gap-1.5 sm:gap-2.5">
                  <span className="text-[#10b981] font-black text-[clamp(1.7rem,4.3vh,3.1rem)] shrink-0 leading-none mt-0.5">
                    ✓
                  </span>
                  <span className="text-slate-100 tracking-wide text-[clamp(1.4rem,3.6vh,2.75rem)] font-bold leading-tight break-words">
                    {renderServiceLabel(service)}
                  </span>
                </div>
              ))}
            </div>

            {/* Column 2 */}
            <div className="space-y-[clamp(0.2rem,0.9vh,0.85rem)]">
              {col2Services.map((service, idx) => (
                <div key={`col2-${idx}`} className="flex items-start gap-1.5 sm:gap-2.5">
                  <span className="text-[#10b981] font-black text-[clamp(1.7rem,4.3vh,3.1rem)] shrink-0 leading-none mt-0.5">
                    ✓
                  </span>
                  <span className="text-slate-100 tracking-wide text-[clamp(1.4rem,3.6vh,2.75rem)] font-bold leading-tight break-words">
                    {renderServiceLabel(service)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Announcement Bar / Continuous Marquee Ticker - Fixed height */}
      <footer className="relative z-20 shrink-0 bg-[#021014] border-t border-[#0b2931] py-1.5 sm:py-2.5 px-3 sm:px-4 overflow-hidden shadow-2xl">
        <div className="flex items-center overflow-hidden">
          {/* Seamless CSS Marquee */}
          <div className="animate-marquee whitespace-nowrap text-[clamp(0.7rem,1.6vh,1.05rem)] font-semibold tracking-wide">
            {/* Render 4 duplicates to ensure an uninterrupted smooth continuous loop */}
            {[0, 1, 2, 3].map((loopIdx) => (
              <span key={loopIdx} className="inline-flex items-center">
                {marqueeItems.map((item, itemIdx) => (
                  <span key={`${loopIdx}-${itemIdx}`} className="inline-flex items-center mx-3 sm:mx-5">
                    <span className="text-[#22d3ee] mr-1.5 sm:mr-2 text-sm sm:text-base">★</span>
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
