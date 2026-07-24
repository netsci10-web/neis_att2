export const formatDate = (date: Date): string => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const formatTime = (date: Date): string => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const clampDate = (date: Date, year: number): Date => {
  const isMidnight = date.getHours() === 0 && date.getMinutes() === 0;
  const startOfYearMidnight = new Date(year, 0, 1, 0, 0, 0);
  const startOfYearWork = new Date(year, 0, 1, 9, 0, 0);
  const endOfYearMidnight = new Date(year, 11, 31, 0, 0, 0);
  const endOfYearWork = new Date(year, 11, 31, 17, 0, 0);

  if (date < startOfYearMidnight) return isMidnight ? startOfYearMidnight : startOfYearWork;
  if (date > new Date(year, 11, 31, 23, 59, 59)) return isMidnight ? endOfYearMidnight : endOfYearWork;

  return date;
};

export const getMonthsDays = (totalDays: number): string => {
  const m = Math.floor(totalDays / 30);
  const d = totalDays % 30;
  if (m > 0 && d === 0) return `${m}개월`;
  if (m > 0) return `${m}개월 ${d}일`;
  return `${d}일`;
};

export const getDurationMins = (start: Date, end: Date): number => {
  if (!(start instanceof Date) || !(end instanceof Date) || isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const ms = end.getTime() - start.getTime();
  if (ms < 0) return 0;

  const startIsMidnight = start.getHours() === 0 && start.getMinutes() === 0;
  const endIsMidnight = end.getHours() === 0 && end.getMinutes() === 0;

  if (startIsMidnight && endIsMidnight) {
    return (Math.round(ms / 86400000) + 1) * 480;
  }

  if (formatDate(start) === formatDate(end)) {
    return Math.floor(ms / 60000);
  }

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const daysSpanned = Math.round((endDay.getTime() - startDay.getTime()) / 86400000) + 1;

  let totalMins = 0;
  for (let i = 0; i < daysSpanned; i++) {
    if (i === 0) {
      const endOfFirstDay = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 17, 0);
      const diff = endOfFirstDay.getTime() - start.getTime();
      totalMins += diff > 0 ? Math.floor(diff / 60000) : 0;
    } else if (i === daysSpanned - 1) {
      const startOfLastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 9, 0);
      const diff = end.getTime() - startOfLastDay.getTime();
      totalMins += diff > 0 ? Math.floor(diff / 60000) : 0;
    } else {
      totalMins += 480;
    }
  }
  return totalMins;
};

export const formatDur = (totalMins: number): string => {
  if (!totalMins || totalMins <= 0) return "0일 0시간 0분";
  const d = Math.floor(totalMins / 480);
  const h = Math.floor((totalMins % 480) / 60);
  const m = totalMins % 60;
  return `${d}일 ${h}시간 ${m}분`;
};

export const getDurationString = (start: Date, end: Date): string => {
  return formatDur(getDurationMins(start, end));
};

export const needsAttachment = (type: string, originalStatus = '', details = ''): boolean => {
  if (type === '공가') return true;
  if (type === '특별휴가') {
    const combined = String(originalStatus) + ' ' + String(details);
    return combined.includes('가족돌봄') || combined.includes('경조사');
  }
  return false;
};

export const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else current += char;
  }
  result.push(current.trim());
  return result;
};

export const escapeCSV = (str: any): string => {
  if (str == null) return '""';
  const s = String(str).replace(/"/g, '""');
  return `"${s}"`;
};
