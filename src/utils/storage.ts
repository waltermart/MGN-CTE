import { QueueItem, QueueState } from '../types';

const STORAGE_KEY = 'mgn_queue_state_v1';
const CHANNEL_NAME = 'mgn_queue_sync_channel';

export const DEFAULT_SERVICES = [
  '1. Private Emission Testing Center',
  '2. Driving School',
  '3. Medical Clinic',
  '4. Vehicle Insurance',
  '5. Practical Driving Course',
  '6. Theoretical Driving Course',
  '7. Student Permit',
  "8. New & Renewal of Driver's Lisence",
  '9. Renewal of Motor and Car Vehicle',
  '10. Motorcycle/Private Car Insurance',
  '11. Truck Insurance.',
];

export const DEFAULT_ANNOUNCEMENTS = [
  'Welcome to MGN - CERTIFIED TRANSPORT EXPERTS.',
  'Please wait for your plate number to be called.',
];

const INITIAL_SERVED: QueueItem[] = [
  { id: 'served-1', ticketNumber: 101, plateNumber: 'NCA 8821', service: '1. Private Emission Testing Center', createdAt: '08:00 AM', status: 'served', servedAt: '08:15 AM' },
  { id: 'served-2', ticketNumber: 102, plateNumber: 'CBD 4519', service: '2. Driving School', createdAt: '08:10 AM', status: 'served', servedAt: '08:25 AM' },
  { id: 'served-3', ticketNumber: 103, plateNumber: 'XAZ 912', service: '4. Vehicle Insurance', createdAt: '08:15 AM', status: 'served', servedAt: '08:35 AM' },
  { id: 'served-4', ticketNumber: 104, plateNumber: 'WQX 703', service: '3. Medical Clinic', createdAt: '08:20 AM', status: 'served', servedAt: '08:42 AM' },
  { id: 'served-5', ticketNumber: 105, plateNumber: 'NBO 2110', service: '5. Practical Driving Course', createdAt: '08:30 AM', status: 'served', servedAt: '08:50 AM' },
  { id: 'served-6', ticketNumber: 106, plateNumber: 'RKL 554', service: '7. Student Permit', createdAt: '08:40 AM', status: 'served', servedAt: '09:05 AM' },
  { id: 'served-7', ticketNumber: 107, plateNumber: 'UUE 301', service: '1. Private Emission Testing Center', createdAt: '08:45 AM', status: 'served', servedAt: '09:18 AM' },
  { id: 'served-8', ticketNumber: 108, plateNumber: 'TMA 982', service: '9. Renewal of Motor and Car Vehicle', createdAt: '08:55 AM', status: 'served', servedAt: '09:30 AM' },
  { id: 'served-9', ticketNumber: 109, plateNumber: 'PLK 7761', service: '2. Driving School', createdAt: '09:05 AM', status: 'served', servedAt: '09:40 AM' },
];

export const INITIAL_STATE: QueueState = {
  currentServing: {
    id: 'seed-curr',
    ticketNumber: 7,
    plateNumber: 'JJJ 222',
    service: '5. Practical Driving Course',
    createdAt: '09:15 AM',
    status: 'serving',
  },
  waitingQueue: [
    {
      id: 'seed-1',
      ticketNumber: 1,
      plateNumber: 'AAS 212',
      service: '6. Theoretical Driving Course',
      createdAt: '09:20 AM',
      status: 'waiting',
    },
    {
      id: 'seed-2',
      ticketNumber: 2,
      plateNumber: 'TES 1234',
      service: '2. Driving School',
      createdAt: '09:22 AM',
      status: 'waiting',
    },
    {
      id: 'seed-3',
      ticketNumber: 3,
      plateNumber: 'KDR 234',
      service: '1. Private Emission Testing Center',
      createdAt: '09:25 AM',
      status: 'waiting',
    },
    {
      id: 'seed-4',
      ticketNumber: 4,
      plateNumber: 'KGL 234',
      service: '3. Medical Clinic',
      createdAt: '09:28 AM',
      status: 'waiting',
    },
  ],
  servedHistory: INITIAL_SERVED,
  announcements: DEFAULT_ANNOUNCEMENTS,
  services: DEFAULT_SERVICES,
  enableChime: true,
  enableVoice: true,
  layoutMode: 'standard',
};

export const DEFAULT_LOGO_KEY = 'mgn_default_logo_v1';

export function getDefaultLogo(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(DEFAULT_LOGO_KEY);
  } catch {
    return null;
  }
}

export function saveDefaultLogo(logoUrl: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (logoUrl) {
      localStorage.setItem(DEFAULT_LOGO_KEY, logoUrl);
    } else {
      localStorage.removeItem(DEFAULT_LOGO_KEY);
    }
  } catch (e) {
    console.error('Failed to save default logo', e);
  }
}

export function loadQueueState(): QueueState {
  const defaultLogo = getDefaultLogo();
  if (typeof window === 'undefined') {
    return { ...INITIAL_STATE, customLogoUrl: defaultLogo };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...INITIAL_STATE,
        customLogoUrl: defaultLogo,
      };
    }
    const parsed = JSON.parse(raw);
    const activeLogo = parsed.customLogoUrl !== undefined && parsed.customLogoUrl !== null
      ? parsed.customLogoUrl
      : defaultLogo;

    // Sync current active logo as the default logo
    if (activeLogo && !defaultLogo) {
      saveDefaultLogo(activeLogo);
    }

    return {
      ...INITIAL_STATE,
      ...parsed,
      customLogoUrl: activeLogo,
    };
  } catch (e) {
    console.error('Failed to load queue state from localStorage', e);
    return {
      ...INITIAL_STATE,
      customLogoUrl: defaultLogo,
    };
  }
}

export function saveQueueState(state: QueueState): void {
  if (typeof window === 'undefined') return;
  try {
    // If state has an active logo, make it the default logo
    if (state.customLogoUrl) {
      saveDefaultLogo(state.customLogoUrl);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    broadcastQueueState(state);
  } catch (e) {
    console.error('Failed to save queue state', e);
  }
}

// BroadcastChannel for instant cross-tab/multi-window synchronization
let broadcastChannel: BroadcastChannel | null = null;

export function getSyncChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null;
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
  return broadcastChannel;
}

export function broadcastQueueState(state: QueueState): void {
  const channel = getSyncChannel();
  if (channel) {
    channel.postMessage({ type: 'STATE_UPDATE', payload: state });
  }
}

export function broadcastAnnouncement(plate: string, service?: string): void {
  const channel = getSyncChannel();
  if (channel) {
    channel.postMessage({ type: 'CALL_ANNOUNCEMENT', payload: { plate, service } });
  }
}
