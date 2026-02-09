// Types for resource download management

export interface GlobalDownloadEntry {
  interval?: NodeJS.Timeout | null;
  timeout?: NodeJS.Timeout | null;
  retryTimeout?: NodeJS.Timeout | null;
  service?: string;
  name?: string;
  identifier?: string;
  isFetching?: boolean;
  status?: any;
}

export interface ResourceData {
  service: string;
  name: string;
  identifier: string;
  fileName?: string;
  mimeType?: string;
  key?: string;
}

export interface PeerDetail {
  address?: string;
  lastSeen?: number;
  [key: string]: any;
}

export interface ResourceStatus {
  status: 'READY' | 'DOWNLOADED' | 'DOWNLOADING' | 'BUILDING' | 'REFETCHING' | 'FAILED_TO_DOWNLOAD' | 'SEARCHING' | 'MISSING_DATA';
  percentLoaded?: number;
  localChunkCount?: number;
  totalChunkCount?: number;
  estimatedTimeRemaining?: number;
  numberOfPeers?: number;
  peers?: PeerDetail[];
  path?: string;
  filename?: string;
  [key: string]: any;
}
