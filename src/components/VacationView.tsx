import React, { useState, useEffect, useMemo } from 'react';
import { Staff, WorkEvent } from '../types';
import { getPositionWeight, normalizePosition } from '../utils/constants';
import { formatDate } from '../utils/dateUtils';

interface VacationViewProps {
  staff: Staff[];
  events: WorkEvent[];
  departments: string[];
  onSelectEvent?: (event: WorkEvent) => void;
  onSelectDateStaff?: (dateStr: string, staffName: string) => void;
}

// Color badges for matrix cells matching reference spreadsheet
const STATUS_CELL_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  '근무': { bg: 'bg-slate-100', text: 'text-slate-800 font-bold', border: 'border-slate-300' },
  '정상근무': { bg: 'bg-slate-100', text: 'text-slate-800 font-bold', border: 'border-slate-300' },
  '41조': { bg: 'bg-amber-100/90', text: 'text-amber-950 font-bold', border: 'border-amber-300' },
  '41조국외': { bg: 'bg-purple-100/90', text: 'text-purple-950 font-bold', border: 'border-purple-300' },
  '연수': { bg: 'bg-emerald-100/90', text: 'text-emerald-950 font-bold', border: 'border-emerald-300' },
  '연가': { bg: 'bg-orange-100/90', text: 'text-orange-950 font-bold', border: 'border-orange-300' },
  '출장': { bg: 'bg-blue-100/90', text: 'text-blue-950 font-bold', border: 'border-blue-300' },
  '출장/근무': { bg: 'bg-blue-50', text: 'text-blue-900 font-bold', border: 'border-blue-300' },
  '출장/41조': { bg: 'bg-amber-50 text-blue-900', text: 'text-blue-900 font-bold', border: 'border-amber-300' },
  '병가': { bg: 'bg-red-100/90', text: 'text-red-950 font-bold', border: 'border-red-300' },
  '공가': { bg: 'bg-indigo-100/90', text: 'text-indigo-950 font-bold', border: 'border-indigo-300' },
  '기타휴가': { bg: 'bg-teal-100/90', text: 'text-teal-950 font-bold', border: 'border-teal-300' },
  '가족돌봄휴가': { bg: 'bg-pink-100/90', text: 'text-pink-950 font-bold', border: 'border-pink-300' },
  '임시공휴일': { bg: 'bg-rose-100/90', text: 'text-rose-950 font-bold', border: 'border-rose-300' },
  '특별휴가': { bg: 'bg-pink-100/90', text: 'text-pink-950 font-bold', border: 'border-pink-300' },
};

const normalizeVacationStatus = (raw: string): string => {
  if (!raw) return '';
  const s = raw.replace(/\s+/g, '');
  if ((s.includes('41조') || s.includes('교육공무원법') || s.includes('제41조')) && (s.includes('국외') || s.includes('해외'))) {
    return '41조국외';
  }
  if (s.includes('41조') || s.includes('교육공무원법') || s.includes('제41조')) {
    return '41조';
  }
  if (s.includes('정상근무') || s.includes('출근') || s === '근무') {
    return '근무';
  }
  if (s.includes('출장') && (s.includes('41조') || s.includes('교육공무원법'))) {
    return '출장/41조';
  }
  if (s.includes('출장') && s.includes('근무')) {
    return '출장/근무';
  }
  if (s.includes('출장')) {
    return '출장';
  }
  if (s.includes('연가')) {
    return '연가';
  }
  if (s.includes('연수')) {
    return '연수';
  }
  if (s.includes('병가')) {
    return '병가';
  }
  if (s.includes('공가')) {
    return '공가';
  }
  if (s.includes('가족돌봄')) {
    return '가족돌봄휴가';
  }
  if (s.includes('임시공휴일')) {
    return '임시공휴일';
  }
  if (s.includes('특별휴가')) {
    return '특별휴가';
  }
  if (s.includes('기타휴가')) {
    return '기타휴가';
  }
  return raw;
};

export const VacationView: React.FC<VacationViewProps> = ({
  staff,
  events,
  departments,
  onSelectEvent,
  onSelectDateStaff,
}) => {
  const currentYear = new Date().getFullYear();

  // Load persisted vacation date range from localStorage
  const [startDate, setStartDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('vacation_start_date');
      if (saved) return saved;
    } catch (e) {}
    return `${currentYear}-07-20`;
  });

  const [endDate, setEndDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('vacation_end_date');
      if (saved) return saved;
    } catch (e) {}
    return `${currentYear}-08-21`;
  });

  // Default weekday status for teachers when no explicit event is logged. Default is '근무'
  const [defaultWeekdayStatus, setDefaultWeekdayStatus] = useState<'근무' | '41조' | '없음'>(() => {
    try {
      const saved = localStorage.getItem('vacation_default_status');
      if (saved === '근무' || saved === '41조' || saved === '없음') return saved;
    } catch (e) {}
    return '근무';
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      if (startDate) localStorage.setItem('vacation_start_date', startDate);
    } catch (e) {}
  }, [startDate]);

  useEffect(() => {
    try {
      if (endDate) localStorage.setItem('vacation_end_date', endDate);
    } catch (e) {}
  }, [endDate]);

  useEffect(() => {
    try {
      if (defaultWeekdayStatus) localStorage.setItem('vacation_default_status', defaultWeekdayStatus);
    } catch (e) {}
  }, [defaultWeekdayStatus]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('전체');

  // Selected cell modal
  const [selectedCell, setSelectedCell] = useState<{
    staffName: string;
    position: string;
    dateStr: string;
    events: WorkEvent[];
  } | null>(null);

  // Quick Preset Handlers
  const handlePresetSummer = () => {
    setStartDate(`${currentYear}-07-20`);
    setEndDate(`${currentYear}-08-21`);
  };

  const handlePresetWinter = () => {
    setStartDate(`${currentYear + 1}-01-02`);
    setEndDate(`${currentYear + 1}-02-28`);
  };

  // Generate array of Date objects between startDate and endDate
  const dateList = useMemo(() => {
    const list: Date[] = [];
    if (!startDate || !endDate) return list;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return list;

    const curr = new Date(start);
    let count = 0;
    while (curr <= end && count < 100) {
      list.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
      count++;
    }
    return list;
  }, [startDate, endDate]);

  // Group dates by Month for top header row
  const monthGroups = useMemo(() => {
    const groups: { monthStr: string; count: number }[] = [];
    dateList.forEach(d => {
      const mStr = `${d.getMonth() + 1}월`;
      if (groups.length === 0 || groups[groups.length - 1].monthStr !== mStr) {
        groups.push({ monthStr: mStr, count: 1 });
      } else {
        groups[groups.length - 1].count++;
      }
    });
    return groups;
  }, [dateList]);

  // Filtered and sorted staff
  const filteredStaff = useMemo(() => {
    return staff
      .filter(s => {
        const matchesDept = selectedDept === '전체' || s.department === selectedDept;
        const matchesName = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            s.position.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesDept && matchesName;
      })
      .sort((a, b) => {
        const weightA = getPositionWeight(a.position);
        const weightB = getPositionWeight(b.position);
        if (weightA !== weightB) return weightA - weightB;
        return a.name.localeCompare(b.name, 'ko');
      });
  }, [staff, selectedDept, searchTerm]);

  // Helper to determine status on a specific date for a specific staff member
  const getStaffStatusOnDate = (staffMember: Staff, dateObj: Date) => {
    const dateStr = formatDate(dateObj);
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

    // Filter events matching this staff member and date
    const matchedEvents = events.filter(e => {
      if (e.name !== staffMember.name) return false;
      const startStr = formatDate(e.start);
      const endStr = formatDate(e.end);
      return dateStr >= startStr && dateStr <= endStr;
    });

    if (matchedEvents.length > 0) {
      const primary = matchedEvents[0];
      const rawStatus = primary.originalStatus || primary.type || '';
      let statusText = normalizeVacationStatus(rawStatus);
      return {
        statusText,
        events: matchedEvents,
        isExplicit: true,
        isWeekend
      };
    }

    // No explicit event logged
    if (isWeekend) {
      return {
        statusText: '',
        events: [],
        isExplicit: false,
        isWeekend: true
      };
    }

    // Weekday default
    const isAdministrative = staffMember.position.includes('행정') ||
                             staffMember.position.includes('주무관') ||
                             staffMember.position.includes('실무원') ||
                             staffMember.position.includes('공무직') ||
                             staffMember.position.includes('조리');

    const defaultText = isAdministrative ? '근무' : (defaultWeekdayStatus === '없음' ? '' : defaultWeekdayStatus);

    return {
      statusText: defaultText,
      events: [],
      isExplicit: false,
      isWeekend: false
    };
  };

  // Helper for status badge styling
  const getStatusBadgeClass = (status: string, isWeekend: boolean) => {
    if (!status) {
      return isWeekend ? 'bg-slate-100/50 text-slate-300' : 'text-slate-300';
    }

    // Direct style match
    for (const key of Object.keys(STATUS_CELL_STYLES)) {
      if (status === key || status.includes(key)) {
        const style = STATUS_CELL_STYLES[key];
        return `${style.bg} ${style.text} border ${style.border}`;
      }
    }

    if (status.includes('41조')) return STATUS_CELL_STYLES['41조'].bg + ' ' + STATUS_CELL_STYLES['41조'].text + ' border ' + STATUS_CELL_STYLES['41조'].border;
    if (status.includes('연가')) return STATUS_CELL_STYLES['연가'].bg + ' ' + STATUS_CELL_STYLES['연가'].text + ' border ' + STATUS_CELL_STYLES['연가'].border;
    if (status.includes('연수')) return STATUS_CELL_STYLES['연수'].bg + ' ' + STATUS_CELL_STYLES['연수'].text + ' border ' + STATUS_CELL_STYLES['연수'].border;
    if (status.includes('출장')) return STATUS_CELL_STYLES['출장'].bg + ' ' + STATUS_CELL_STYLES['출장'].text + ' border ' + STATUS_CELL_STYLES['출장'].border;
    if (status.includes('병가')) return STATUS_CELL_STYLES['병가'].bg + ' ' + STATUS_CELL_STYLES['병가'].text + ' border ' + STATUS_CELL_STYLES['병가'].border;
    if (status.includes('공가')) return STATUS_CELL_STYLES['공가'].bg + ' ' + STATUS_CELL_STYLES['공가'].text + ' border ' + STATUS_CELL_STYLES['공가'].border;

    return 'bg-slate-100 text-slate-800 border border-slate-300';
  };

  // Export Matrix to CSV
  const handleExportCSV = () => {
    if (dateList.length === 0) return;

    let csvContent = '\uFEFF'; // UTF-8 BOM
    
    // Header Row 1: Month
    const headerRow1 = ['순', '직급', '성명'];
    monthGroups.forEach(mg => {
      headerRow1.push(mg.monthStr);
      for (let i = 1; i < mg.count; i++) headerRow1.push('');
    });
    csvContent += headerRow1.join(',') + '\n';

    // Header Row 2: Date & Day
    const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
    const headerRow2 = ['', '', ''];
    dateList.forEach(d => {
      headerRow2.push(`${d.getDate()}(${daysOfWeek[d.getDay()]})`);
    });
    csvContent += headerRow2.join(',') + '\n';

    // Staff rows
    filteredStaff.forEach((s, idx) => {
      const row = [(idx + 1).toString(), `"${s.position}"`, `"${s.name}"`];
      dateList.forEach(d => {
        const res = getStaffStatusOnDate(s, d);
        row.push(`"${res.statusText || ''}"`);
      });
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `방학중_복무현황_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="space-y-5">
      {/* Top Banner & Control Panel */}
      <div className="bg-white p-4 sm:p-5 rounded-lg shadow-2xs border border-slate-200 flex flex-col gap-4">
        {/* Header Title & Preset Toolbar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center text-lg border border-amber-200 shadow-2xs shrink-0">
              <i className="fa-solid fa-umbrella-beach"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                방학 중 복무 현황 종합 Matrix
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold border border-amber-200">
                  교직원 복무 파악
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                방학 기간 동안 모든 교직원의 일자별 복무 상태를 한눈에 종합 파악합니다. (설정값 저장됨)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
            <button
              onClick={handlePresetSummer}
              className="px-3 py-1.5 rounded-md border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold transition-all shadow-2xs"
            >
              <i className="fa-solid fa-sun mr-1 text-amber-600"></i>여름방학 (7.20~8.21)
            </button>
            <button
              onClick={handlePresetWinter}
              className="px-3 py-1.5 rounded-md border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 text-xs font-bold transition-all shadow-2xs"
            >
              <i className="fa-solid fa-snowflake mr-1 text-blue-600"></i>겨울방학 (1.02~2.28)
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
            >
              <i className="fa-solid fa-file-excel text-emerald-600"></i>엑셀 저장
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
            >
              <i className="fa-solid fa-print text-slate-600"></i>인쇄
            </button>
          </div>
        </div>

        {/* Clean Controls Layout without overlapping */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Vacation Date Range Box */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
            <span className="font-bold text-slate-700 shrink-0 flex items-center gap-1">
              <i className="fa-regular fa-calendar text-blue-600"></i>방학 기간:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 font-semibold text-slate-800 bg-white outline-none focus:border-blue-500 shadow-2xs w-32"
            />
            <span className="text-slate-400 font-bold">~</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 font-semibold text-slate-800 bg-white outline-none focus:border-blue-500 shadow-2xs w-32"
            />
          </div>

          {/* Unrecorded Weekday Default Status Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
            <span className="font-bold text-slate-700 shrink-0">미등록 평일 기본값:</span>
            <select
              value={defaultWeekdayStatus}
              onChange={e => setDefaultWeekdayStatus(e.target.value as any)}
              className="border border-slate-300 rounded px-2 py-1 font-bold text-slate-800 bg-white outline-none focus:border-blue-500 shadow-2xs"
            >
              <option value="근무">근무 (정상 근무)</option>
              <option value="41조">41조 (교육공무원법 제41조 연수)</option>
              <option value="없음">빈칸 (미기재)</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 flex-1 min-w-[200px]">
            <span className="font-bold text-slate-700 shrink-0">검색:</span>
            <input
              type="text"
              placeholder="이름 또는 직급..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1 font-medium text-slate-800 bg-white outline-none focus:border-blue-500 shadow-2xs w-full"
            />
          </div>

          {/* Department Filter */}
          {departments.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
              <span className="font-bold text-slate-700 shrink-0">부서:</span>
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 font-bold text-slate-800 bg-white outline-none focus:border-blue-500 shadow-2xs"
              >
                <option value="전체">전체 부서</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Legend Row */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-[11px] font-bold">
          <span className="text-slate-400 mr-1 text-[10px] uppercase font-bold tracking-wider">범례:</span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">근무</span>
          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300">41조</span>
          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 border border-emerald-300">연수</span>
          <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-950 border border-orange-300">연가</span>
          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-950 border border-blue-300">출장</span>
          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-950 border border-purple-300">41조국외</span>
          <span className="px-2 py-0.5 rounded bg-red-100 text-red-950 border border-red-300">병가</span>
          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-950 border border-indigo-300">공가</span>
          <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-950 border border-teal-300">기타휴가</span>
          <span className="px-2 py-0.5 rounded bg-pink-100 text-pink-950 border border-pink-300">가족돌봄휴가</span>
        </div>
      </div>

      {/* Vacation Matrix Grid Container */}
      <div className="bg-white rounded-lg shadow-2xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] hide-scrollbar">
          <table className="min-w-full border-collapse text-xs text-center table-fixed">
            <thead>
              {/* Header Row 1: Corner Headers (rowSpan=2) + Month Headers */}
              <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300 text-[11px] sticky top-0 z-20 h-[32px]">
                {/* Fixed Corner Header 1: 순 */}
                <th
                  rowSpan={2}
                  className="w-[36px] min-w-[36px] max-w-[36px] sticky top-0 left-[0px] z-40 bg-slate-200 border-r border-b border-slate-300 font-bold text-center align-middle px-1"
                >
                  순
                </th>
                {/* Fixed Corner Header 2: 직급 */}
                <th
                  rowSpan={2}
                  className="w-[64px] min-w-[64px] max-w-[64px] sticky top-0 left-[36px] z-40 bg-slate-200 border-r border-b border-slate-300 font-bold text-center align-middle px-1"
                >
                  직급
                </th>
                {/* Fixed Corner Header 3: 성명 */}
                <th
                  rowSpan={2}
                  className="w-[80px] min-w-[80px] max-w-[80px] sticky top-0 left-[100px] z-40 bg-slate-200 border-r border-b border-slate-300 font-bold text-left align-middle px-2"
                >
                  성명
                </th>

                {/* Month Group Headers */}
                {monthGroups.map((mg, idx) => (
                  <th
                    key={idx}
                    colSpan={mg.count}
                    className="px-2 py-1 border-r border-slate-300 bg-slate-200/90 text-slate-900 font-black tracking-wide text-center align-middle"
                  >
                    {mg.monthStr}
                  </th>
                ))}
              </tr>

              {/* Header Row 2: Date Number & Day of Week */}
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px] sticky top-[32px] z-20 h-[36px]">
                {dateList.map((d, idx) => {
                  const dayNum = d.getDate();
                  const dayOfWeek = daysOfWeek[d.getDay()];
                  const isSun = d.getDay() === 0;
                  const isSat = d.getDay() === 6;

                  return (
                    <th
                      key={idx}
                      className={`w-[38px] min-w-[38px] max-w-[38px] border-r border-slate-300 text-center align-middle ${
                        isSun
                          ? 'bg-red-50 text-red-600'
                          : isSat
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="leading-tight">{dayNum}</div>
                      <div className="text-[10px] font-semibold opacity-80 leading-tight">{dayOfWeek}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Matrix Data Rows */}
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={dateList.length + 3} className="py-12 text-center text-slate-400">
                    조건에 맞는 교직원이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((s, sIdx) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors h-[34px]">
                    {/* Sticky Col 1: 순 */}
                    <td className="w-[36px] min-w-[36px] max-w-[36px] sticky left-[0px] z-10 bg-slate-50 border-r border-slate-200 text-slate-500 font-medium text-[11px] text-center align-middle">
                      {sIdx + 1}
                    </td>

                    {/* Sticky Col 2: 직급 */}
                    <td className="w-[64px] min-w-[64px] max-w-[64px] sticky left-[36px] z-10 bg-slate-50 border-r border-slate-200 text-slate-700 font-medium text-[11px] truncate px-1 text-center align-middle">
                      {normalizePosition(s.position)}
                    </td>

                    {/* Sticky Col 3: 성명 */}
                    <td className="w-[80px] min-w-[80px] max-w-[80px] sticky left-[100px] z-10 bg-white border-r border-slate-200 text-slate-900 font-bold text-xs truncate px-2 text-left align-middle">
                      {s.name}
                    </td>

                    {/* Date Status Cells */}
                    {dateList.map((d, dIdx) => {
                      const dateStr = formatDate(d);
                      const res = getStaffStatusOnDate(s, d);
                      const isSun = d.getDay() === 0;
                      const isSat = d.getDay() === 6;
                      const isWeekend = isSun || isSat;

                      const badgeClass = getStatusBadgeClass(res.statusText, isWeekend);

                      return (
                        <td
                          key={dIdx}
                          onClick={() => {
                            if (res.events.length > 0 && onSelectEvent) {
                              onSelectEvent(res.events[0]);
                            } else if (onSelectDateStaff) {
                              onSelectDateStaff(dateStr, s.name);
                            } else {
                              setSelectedCell({
                                staffName: s.name,
                                position: s.position,
                                dateStr,
                                events: res.events
                              });
                            }
                          }}
                          className={`w-[38px] min-w-[38px] max-w-[38px] p-0.5 border-r border-slate-200 text-center align-middle cursor-pointer transition-all hover:ring-2 hover:ring-blue-400 hover:z-10 ${
                            isWeekend ? 'bg-slate-100/60' : ''
                          }`}
                          title={`${s.name} (${dateStr}): ${res.statusText || '휴무'}`}
                        >
                          {res.statusText ? (
                            <span
                              className={`inline-block w-full py-0.5 text-[10px] leading-snug rounded-xs font-bold truncate ${badgeClass}`}
                            >
                              {res.statusText}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[10px]">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Cell Modal */}
      {selectedCell && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">
                복무 상세 정보 ({selectedCell.staffName} / {selectedCell.dateStr})
              </h4>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {selectedCell.events.length > 0 ? (
              <div className="space-y-2">
                {selectedCell.events.map(e => (
                  <div key={e.id} className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{e.originalStatus || e.type}</span>
                      <span className="text-blue-600">{formatDate(e.start)}</span>
                    </div>
                    {e.details && <p className="text-slate-600 font-medium">{e.details}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">
                해당 일자에 등록된 별도 신청 내역이 없습니다.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  const dateStr = selectedCell.dateStr;
                  setSelectedCell(null);
                  if (onSelectDateStaff) onSelectDateStaff(dateStr, selectedCell.staffName);
                }}
                className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-blue-700"
              >
                새 복무 등록
              </button>
              <button
                onClick={() => setSelectedCell(null)}
                className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded hover:bg-slate-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
