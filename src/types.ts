import { ReactNode } from 'react';

export interface Staff {
  id: string;
  department: string;
  position: string;
  name: string;
}

export interface WorkEvent {
  id: string | number;
  name: string;
  position?: string;
  title?: string;
  start: Date;
  end: Date;
  type: string; // e.g. '연가', '병가', '공가', '특별휴가', '41조', '조퇴', '외출', '출장', '기타'
  originalStatus?: string; // e.g. '연가', '병가', '모성보호시간', '가족돌봄휴가(무급)', '41조연수'
  details?: string;
  hasAttachment?: boolean;
  tripType?: string;
  tripPlace?: string;
  tripDuration?: string;
}

export interface ParsedCSVRow {
  name: string;
  status: string;
  period: string;
  reason: string;
  department?: string;
  position?: string;
  hasAttachment?: boolean;
  tripType?: string;
  tripPlace?: string;
  tripDuration?: string;
}

export interface FilterState {
  name: string;
  type: string;
  start: string;
  end: string;
}

export interface GlobalAlertState {
  isOpen: boolean;
  message: ReactNode | string;
  align?: 'center' | 'left';
  title?: string | null;
}

export interface GlobalConfirmState {
  isOpen: boolean;
  message: string;
  onConfirm?: (() => void) | null;
}

export type ViewMode = 'calendar' | 'list' | 'organization' | 'management' | 'vacation' | 'upload' | 'settings';

export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  browserNotification: boolean;
  workTypeAlerts: {
    enabled: boolean;
    types: Record<string, boolean>;
  };
  missingDocumentAlert: {
    enabled: boolean;
    alertOnUpload: boolean;
    alertOnCreate: boolean;
  };
}
