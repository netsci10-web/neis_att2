export const WORK_TYPES = [
  '연가',
  '병가',
  '공가',
  '특별휴가',
  '41조',
  '조퇴',
  '외출',
  '출장',
  '기타'
];

export const TYPE_COLORS: Record<string, string> = {
  '연가': 'bg-blue-50 text-blue-600 border-blue-100',
  '병가': 'bg-red-50 text-red-600 border-red-100',
  '공가': 'bg-purple-50 text-purple-600 border-purple-100',
  '특별휴가': 'bg-pink-50 text-pink-600 border-pink-100',
  '41조': 'bg-teal-50 text-teal-600 border-teal-100',
  '출장': 'bg-emerald-50 text-emerald-600 border-emerald-100',
  '조퇴': 'bg-amber-50 text-amber-600 border-amber-100',
  '외출': 'bg-orange-50 text-orange-600 border-orange-100',
  '정상근무': 'bg-slate-50 text-slate-400 border-slate-100'
};

export const CALENDAR_COLORS: Record<string, string> = {
  '연가': 'bg-blue-500',
  '병가': 'bg-red-500',
  '공가': 'bg-purple-500',
  '특별휴가': 'bg-pink-500',
  '41조': 'bg-teal-500',
  '출장': 'bg-emerald-500',
  '조퇴': 'bg-amber-500',
  '외출': 'bg-orange-500',
  '기타': 'bg-slate-400'
};

export const DEFAULT_DEPARTMENTS = ['마산중앙초등학교'];

export const DEFAULT_STAFF = [
  { id: '1', department: '마산중앙초등학교', position: '교장', name: '김관용' },
  { id: '2', department: '마산중앙초등학교', position: '교감', name: '박선영' },
  { id: '3', department: '마산중앙초등학교', position: '교사', name: '이민호' },
  { id: '4', department: '마산중앙초등학교', position: '교사', name: '정수진' },
  { id: '5', department: '마산중앙초등학교', position: '특수교사', name: '최현우' },
  { id: '6', department: '마산중앙초등학교', position: '행정실장', name: '강동원' },
  { id: '7', department: '마산중앙초등학교', position: '주무관', name: '조아라' }
];

export const normalizePosition = (pos?: string): string => {
  if (!pos) return '-';
  const p = String(pos).trim();
  return p
    .replace(/초등학교장/g, '교장')
    .replace(/초등학교교감/g, '교감')
    .replace(/초등학교교사/g, '교사')
    .replace(/특수학교교사/g, '특수교사');
};

export const getPositionWeight = (position?: string): number => {
  if (!position) return 99;
  const p = position.trim();

  if (p.includes('교장')) return 1;
  if (p.includes('교감')) return 2;
  if (p.includes('실무원') || p.includes('상담사') || p.includes('공무직') || p.includes('조리사') || p.includes('조리원')) return 8;
  if (p.includes('특수교사') || p.includes('보건교사') || p.includes('영양교사') || p.includes('사서교사') || p.includes('상담교사')) return 4;
  if (p.includes('교사')) return 3;
  if (p.includes('행정실장')) return 5;
  if (p.includes('지방교육행정주사') || p.includes('주무관')) return 6;
  if (/\d+급/.test(p)) return 7;

  return 10;
};

export const getTypeWeight = (type?: string): number => {
  switch (type) {
    case '연가': return 1;
    case '병가': return 2;
    case '공가': return 3;
    case '특별휴가': return 4;
    case '41조': return 5;
    case '출장': return 6;
    case '기타': return 7;
    case '조퇴': return 8;
    case '외출': return 9;
    default: return 99;
  }
};

export const normalizeType = (status?: string): string => {
  if (!status) return '기타';
  const s = String(status).replace(/\s/g, '');
  if (s.includes('41조')) return '41조';
  if (s.includes('특별휴가') || s.includes('경조사') || s.includes('출산') || s.includes('난임') || s.includes('보건휴가') || s.includes('모성보호') || s.includes('육아시간') || s.includes('장기재직') || s.includes('수업휴가') || s.includes('재해구호') || s.includes('포상') || s.includes('가족돌봄') || s.includes('임신검진') || s.includes('교육활동')) return '특별휴가';
  if (s.includes('연가') || s.includes('휴가')) return '연가';
  if (s.includes('병가') || s.includes('병조퇴')) return '병가';
  if (s.includes('출장')) return '출장';
  if (s.includes('조퇴')) return '조퇴';
  if (s.includes('외출')) return '외출';
  if (s.includes('공가')) return '공가';
  if (s.includes('정상')) return '정상근무';
  return '기타';
};

export const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: true,
  soundEnabled: true,
  browserNotification: false,
  workTypeAlerts: {
    enabled: true,
    types: {
      '연가': true,
      '출장': true,
      '병가': true,
      '공가': false,
      '특별휴가': false,
      '41조': false,
      '조퇴': false,
      '외출': false
    }
  },
  missingDocumentAlert: {
    enabled: true,
    alertOnUpload: true,
    alertOnCreate: true
  }
};

export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Audio might not be permitted before user gesture
  }
};

export const sendBrowserNotification = (title: string, options?: NotificationOptions) => {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        badge: '/favicon.ico',
        ...options
      });
    } catch (e) {
      console.error('Browser notification error:', e);
    }
  }
};
