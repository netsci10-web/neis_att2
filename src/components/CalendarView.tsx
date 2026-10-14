import React from 'react';
import { WorkEvent, ViewMode, Staff } from '../types';
import { CALENDAR_COLORS, getTypeWeight } from '../utils/constants';
import { formatDate } from '../utils/dateUtils';
import { WorkerFilterDropdown } from './WorkerFilterDropdown';

interface CalendarViewProps {
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  events: WorkEvent[];
  staff: Staff[];
  isAllStaffSelected: boolean;
  selectedStaffNames: string[];
  onToggleAllStaff: () => void;
  onToggleStaff: (name: string) => void;
  onOpenCreateModal: () => void;
  onSelectEvent: (event: WorkEvent) => void;
  onSelectDate: (dateStr: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setOrgSelectedDate: (dateStr: string) => void;
  setOrgFilterStatus: (status: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentMonth,
  setCurrentMonth,
  events,
  staff,
  isAllStaffSelected,
  selectedStaffNames,
  onToggleAllStaff,
  onToggleStaff,
  onOpenCreateModal,
  onSelectEvent,
  onSelectDate,
  setViewMode,
  setOrgSelectedDate,
  setOrgFilterStatus
}) => {
  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDay = (y: number, m: number) => new Date(y, m, 1).getDay();

  const days: React.ReactNode[] = [];
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Filter events based on selected staff
  const displayedEvents = isAllStaffSelected
    ? events
    : events.filter(e => selectedStaffNames.includes(e.name));

  // Empty slots for start of month
  for (let i = 0; i < firstDay(year, month); i++) {
    days.push(
      <div key={`e-${i}`} className="min-h-[110px] bg-slate-50/40 border border-slate-100"></div>
    );
  }

  // Days of month
  for (let d = 1; d <= daysInMonth(year, month); d++) {
    const dateStr = formatDate(new Date(year, month, d));
    const dayEvents = displayedEvents.filter(e => formatDate(e.start) <= dateStr && formatDate(e.end) >= dateStr);
    
    const sorted = [...dayEvents].sort((a, b) => {
      const wA = getTypeWeight(a.type);
      const wB = getTypeWeight(b.type);
      if (wA !== wB) return wA - wB;
      return String(a.name).localeCompare(String(b.name), 'ko');
    });

    const isToday = formatDate(new Date()) === dateStr;

    days.push(
      <div
        key={d}
        className={`calendar-day min-h-[110px] bg-white border p-2 hover:bg-blue-50/30 transition-colors cursor-pointer ${
          isToday ? 'border-blue-500 bg-blue-50/20' : 'border-slate-100'
        }`}
        onClick={() => onSelectDate(dateStr)}
      >
        <div
          onClick={(ev) => {
            ev.stopPropagation();
            setOrgSelectedDate(dateStr);
            setOrgFilterStatus('전체');
            setViewMode('organization');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`w-7 h-7 flex items-center justify-center rounded font-bold text-xs mb-1.5 transition-all cursor-pointer ${
            isToday ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
          }`}
          title={`${dateStr} 기관현황 확인`}
        >
          <span>{d}</span>
        </div>

        <div className="flex flex-col gap-1 overflow-hidden">
          {sorted.map(e => (
            <div
              key={e.id}
              onClick={(ev) => {
                ev.stopPropagation();
                onSelectEvent(e);
              }}
              className={`text-[11px] px-1.5 py-0.5 rounded text-white truncate font-semibold shadow-2xs hover:opacity-90 transition-opacity ${
                CALENDAR_COLORS[e.type] || 'bg-slate-500'
              }`}
            >
              <span>{String(e.name)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-2xs border border-slate-200 overflow-hidden">
      {/* Calendar Header */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>{year}년</span> <span>{month + 1}월</span>
        </h2>
        
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
              className="p-1.5 w-8 h-8 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors"
              title="이전 달"
            >
              <i className="fa-solid fa-chevron-left text-xs"></i>
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1.5 border border-slate-200 rounded-md font-bold hover:bg-slate-50 text-xs text-slate-700 transition-colors"
            >
              <span>오늘</span>
            </button>
            <button
              onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
              className="p-1.5 w-8 h-8 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors"
              title="다음 달"
            >
              <i className="fa-solid fa-chevron-right text-xs"></i>
            </button>
          </div>

          <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

          {/* 신청 아이콘 & 근무자 선택 */}
          <button
            onClick={onOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
            title="근무 신청"
          >
            <i className="fa-solid fa-plus text-[10px]"></i>
            <span>신청</span>
          </button>

          <WorkerFilterDropdown
            staff={staff}
            events={events}
            isAllSelected={isAllStaffSelected}
            selectedNames={selectedStaffNames}
            onToggleAll={onToggleAllStaff}
            onToggleStaff={onToggleStaff}
          />
        </div>
      </div>

      {/* Active Filter Notification Bar */}
      {!isAllStaffSelected && (
        <div className="bg-blue-50/70 border-b border-blue-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold flex items-center gap-1.5 text-blue-700">
              <i className="fa-solid fa-filter text-blue-600"></i>
              선택된 근무자 표시 중:
            </span>
            <span className="font-semibold bg-white border border-blue-200 px-2 py-0.5 rounded text-blue-900">
              {selectedStaffNames.join(', ')} ({selectedStaffNames.length}명)
            </span>
          </div>
          <button
            onClick={onToggleAllStaff}
            className="text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <i className="fa-solid fa-rotate-left text-[10px]"></i>
            전체 근무자 보기
          </button>
        </div>
      )}

      {/* Legend & Day Headers */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-2 bg-slate-50 flex flex-wrap gap-x-4 gap-y-1.5 border-b border-slate-200 text-xs">
          {Object.entries(CALENDAR_COLORS).map(([label, colorClass]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-xs ${colorClass}`}></div>
              <span className="text-[11px] font-medium text-slate-600">
                <span>{label}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 bg-slate-100/70 text-center py-2 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
            <div key={d} className={d === 'SUN' ? 'text-red-500' : d === 'SAT' ? 'text-blue-500' : ''}>
              <span>{d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7">{days}</div>
    </div>
  );
};

