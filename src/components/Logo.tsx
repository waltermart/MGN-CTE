import React from 'react';
import { getDefaultLogo } from '../utils/storage';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  theme?: 'light' | 'dark';
  showSubtitle?: boolean;
  customLogoUrl?: string | null;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  theme = 'light',
  showSubtitle = true,
  customLogoUrl,
}) => {
  const isDark = theme === 'dark';
  const [imgError, setImgError] = React.useState(false);

  // Active logo: check passed prop, then fallback to stored default logo
  const activeLogoUrl = customLogoUrl !== undefined && customLogoUrl !== null
    ? customLogoUrl
    : (typeof window !== 'undefined' ? getDefaultLogo() : null);

  // Reset img error if activeLogoUrl changes
  React.useEffect(() => {
    setImgError(false);
  }, [activeLogoUrl]);

  const badgeDimensions =
    size === 'sm'
      ? 'w-10 h-10 sm:w-12 sm:h-12'
      : size === 'lg'
      ? 'w-14 h-14 sm:w-18 sm:h-18 md:w-22 md:h-22'
      : 'w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16';

  const titleSize =
    size === 'sm'
      ? 'text-xs sm:text-sm'
      : size === 'lg'
      ? 'text-xs sm:text-base md:text-lg lg:text-xl'
      : 'text-xs sm:text-sm md:text-base';

  const subSize =
    size === 'sm'
      ? 'text-[8px] sm:text-[9px]'
      : size === 'lg'
      ? 'text-[9px] sm:text-[10px] md:text-xs'
      : 'text-[9px] sm:text-[10px] md:text-xs';

  const hasCustomLogo = Boolean(activeLogoUrl && !imgError);

  return (
    <div className="flex items-center gap-2.5 sm:gap-4 select-none min-w-0">
      {/* Official MGN-CTE Logo / Custom Uploaded Logo */}
      <div className={`relative ${badgeDimensions} shrink-0 rounded-full shadow-md overflow-hidden bg-white`}>
        {hasCustomLogo ? (
          <img
            src={activeLogoUrl!}
            alt="Custom Company Logo"
            className="w-full h-full object-contain p-0.5"
            onError={() => setImgError(true)}
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 500 500"
            className="w-full h-full block"
            aria-label="MGN Certified Transport Experts Logo"
          >
          {/* White Circular Canvas */}
          <circle cx="250" cy="250" r="248" fill="#ffffff" />

          {/* Heavy Outer Black Ring */}
          <circle cx="250" cy="250" r="236" fill="none" stroke="#000000" strokeWidth="24" />

          {/* Thin Inner Concentric Black Ring */}
          <circle cx="250" cy="250" r="190" fill="none" stroke="#000000" strokeWidth="4.5" />

          {/* Circular Text Path Top: CERTIFIED TRANSPORT EXPERTS */}
          <path id="svgTopTextArc" d="M 80,250 A 170,170 0 1,1 420,250" fill="none" />
          <text fontFamily="Arial, Helvetica, sans-serif" fontSize="24.5" fontWeight="900" fill="#000000" letterSpacing="4">
            <textPath href="#svgTopTextArc" startOffset="50%" textAnchor="middle">
              CERTIFIED TRANSPORT EXPERTS
            </textPath>
          </text>

          {/* Left Vertical MGN Stacked Text */}
          <text x="59" y="218" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="20" fill="#000000" textAnchor="middle">M</text>
          <text x="59" y="243" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="20" fill="#000000" textAnchor="middle">G</text>
          <text x="59" y="268" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="20" fill="#000000" textAnchor="middle">N</text>

          {/* Circular Text Path Bottom: LTO ACCREDITED */}
          <path id="svgBottomTextArc" d="M 100,270 A 170,170 0 0,0 400,270" fill="none" />
          <text fontFamily="Arial, Helvetica, sans-serif" fontSize="27" fontWeight="900" fill="#000000" letterSpacing="6">
            <textPath href="#svgBottomTextArc" startOffset="50%" textAnchor="middle">
              LTO ACCREDITED
            </textPath>
          </text>

          {/* Inner Arc Accent Segments near bottom */}
          <path d="M 64,295 A 190,190 0 0,0 114,395" fill="none" stroke="#000000" strokeWidth="4.5" />
          <path d="M 436,295 A 190,190 0 0,1 386,395" fill="none" stroke="#000000" strokeWidth="4.5" />

          {/* Center Graphic: The Aerodynamic Red & Black Sports Car */}
          <g transform="translate(115, 150)">
            {/* Black Roofline Arch */}
            <path d="M 64,36 C 85,10, 150,0, 205,36 C 180,24, 110,18, 64,36 Z" fill="#000000" />
            
            {/* Roof Ventilation Louvers / White Sunroof Slats */}
            <line x1="82" y1="28" x2="89" y2="20" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
            <line x1="100" y1="23" x2="108" y2="15" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
            <line x1="120" y1="19" x2="128" y2="12" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
            <line x1="141" y1="18" x2="149" y2="11" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
            <line x1="162" y1="19" x2="169" y2="13" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
            <line x1="181" y1="23" x2="187" y2="17" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
            <line x1="198" y1="29" x2="203" y2="24" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />

            {/* Dynamic Red Body Swooshes */}
            {/* Top red swoosh */}
            <path d="M 32,44 C 70,30, 160,26, 235,74 C 205,52, 130,42, 32,44 Z" fill="#e11d24" />
            {/* Middle flame body sweep */}
            <path d="M 46,55 C 75,52, 115,53, 142,65 C 160,54, 195,58, 238,82 C 220,70, 175,64, 145,74 C 115,62, 75,60, 46,55 Z" fill="#e11d24" />
            {/* Lower red streaks */}
            <path d="M 65,65 C 105,70, 145,86, 170,95 C 150,88, 110,75, 65,65 Z" fill="#e11d24" />
            <path d="M 148,82 C 175,85, 208,98, 232,104 C 220,94, 185,86, 148,82 Z" fill="#e11d24" />

            {/* Black Lower Body & Fenders */}
            <path d="M 15,62 C 25,58, 38,62, 42,72 C 38,82, 28,88, 18,92 L 15,82 C 22,80, 28,76, 28,70 C 26,65, 18,65, 15,62 Z" fill="#000000" />
            <path d="M 32,60 C 45,56, 52,65, 52,78 C 35,74, 25,82, 18,95 C 15,92, 20,85, 30,80 C 45,72, 40,64, 32,60 Z" fill="#000000" />

            {/* Black Lower Rocker Skirt */}
            <path d="M 65,95 C 80,82, 110,85, 145,95 C 175,102, 195,104, 208,110 L 202,114 C 185,110, 160,105, 130,102 C 100,98, 75,98, 65,95 Z" fill="#000000" />
            
            {/* Front Bumper & Nose Swoop */}
            <path d="M 235,74 C 248,88, 252,102, 240,118 C 248,112, 254,102, 252,90 C 250,82, 244,78, 235,74 Z" fill="#000000" />

            {/* REAR WHEEL (Left) - Detailed 8-Spoke White Star Mag Rim */}
            <g transform="translate(43, 90)">
              <circle cx="0" cy="0" r="23" fill="#000000" />
              <circle cx="0" cy="0" r="19" fill="#111111" />
              <circle cx="0" cy="0" r="15" fill="none" stroke="#ffffff" strokeWidth="2" />
              <line x1="0" y1="-14" x2="0" y2="14" stroke="#ffffff" strokeWidth="2.5" />
              <line x1="-14" y1="0" x2="14" y2="0" stroke="#ffffff" strokeWidth="2.5" />
              <line x1="-10" y1="-10" x2="10" y2="10" stroke="#ffffff" strokeWidth="2.5" />
              <line x1="-10" y1="10" x2="10" y2="-10" stroke="#ffffff" strokeWidth="2.5" />
              <circle cx="0" cy="0" r="4.5" fill="#000000" stroke="#ffffff" strokeWidth="1.2" />
            </g>

            {/* FRONT WHEEL (Right) - Detailed 8-Spoke White Star Mag Rim */}
            <g transform="translate(202, 90)">
              <circle cx="0" cy="0" r="23" fill="#000000" />
              <circle cx="0" cy="0" r="19" fill="#111111" />
              <circle cx="0" cy="0" r="15" fill="none" stroke="#ffffff" strokeWidth="2" />
              <line x1="0" y1="-14" x2="0" y2="14" stroke="#ffffff" strokeWidth="2.5" />
              <line x1="-14" y1="0" x2="14" y2="0" stroke="#ffffff" strokeWidth="2.5" />
              <line x1="-10" y1="-10" x2="10" y2="10" stroke="#ffffff" strokeWidth="2.5" />
              <line x1="-10" y1="10" x2="10" y2="-10" stroke="#ffffff" strokeWidth="2.5" />
              <circle cx="0" cy="0" r="4.5" fill="#000000" stroke="#ffffff" strokeWidth="1.2" />
            </g>
          </g>

          {/* MGN-CTE Text Below Car */}
          <text x="250" y="300" textAnchor="middle" fontFamily="Arial Black, Impact, sans-serif" fontWeight="900" fontSize="34" fill="#000000" letterSpacing="2">
            MGN-CTE
          </text>

          {/* CASTILLEJOS, ZAMBALES Text Below MGN-CTE */}
          <text x="250" y="318" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontStyle="italic" fontWeight="700" fontSize="14.5" fill="#000000" letterSpacing="4.5">
            CASTILLEJOS, ZAMBALES
          </text>
        </svg>
        )}
      </div>

      {/* Brand Title and Location Text */}
      <div className="flex flex-col min-w-0">
        <h1
          className={`font-black tracking-tight leading-tight truncate ${titleSize} ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          MGN - CERTIFIED TRANSPORT EXPERTS
        </h1>
        {showSubtitle && (
          <p
            className={`font-semibold tracking-wider uppercase leading-tight truncate ${subSize} ${
              isDark ? 'text-teal-300/80' : 'text-slate-500'
            }`}
          >
            BRGY. SAN AGUSTIN, CASTILLEJOS, ZAMBALES
          </p>
        )}
      </div>
    </div>
  );
};
