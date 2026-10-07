export interface QueueItem {
  id: string;
  ticketNumber: number;
  plateNumber: string;
  service: string;
  createdAt: string;
  status: 'waiting' | 'serving' | 'served' | 'skipped';
  servedAt?: string;
}

export type DisplayLayoutMode = 'standard' | 'focused' | 'queue_list';

export interface QueueState {
  currentServing: QueueItem | null;
  waitingQueue: QueueItem[];
  servedHistory: QueueItem[];
  announcements: string[];
  services: string[];
  enableChime: boolean;
  enableVoice: boolean;
  layoutMode: DisplayLayoutMode;
  lastCalledAt?: number;
  customLogoUrl?: string | null;
}
