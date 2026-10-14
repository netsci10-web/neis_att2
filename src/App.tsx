import React, { Component, useState, useEffect, useCallback, ReactNode } from 'react';
import { ViewMode, Staff, WorkEvent, FilterState, GlobalAlertState, GlobalConfirmState } from './types';
import { DEFAULT_DEPARTMENTS, DEFAULT_STAFF, TYPE_COLORS } from './utils/constants';
import { formatDate, formatTime, getDurationString, needsAttachment } from './utils/dateUtils';
import { Header } from './components/Header';
import { CalendarView } from './components/CalendarView';
import { ListView } from './components/ListView';
import { OrganizationView } from './components/OrganizationView';
import { ManagementView } from './components/ManagementView';
import { VacationView } from './components/VacationView';
import { UploadView } from './components/UploadView';
import { SettingsView } from './components/SettingsView';
import { EventModal } from './components/EventModal';
import { AlertConfirmModal } from './components/AlertConfirmModal';
import { WorkerFilterDropdown } from './components/WorkerFilterDropdown';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white p-4">
          <div className="max-w-lg w-full p-10 text-center border border-slate-200 rounded-[2.5rem] shadow-2xl">
            <i className="fa-solid fa-triangle-exclamation text-6xl text-red-500 mb-8"></i>
            <h2 className="text-3xl font-semibold text-slate-900 mb-4">데이터 로드 오류</h2>
            <p className="text-slate-500 mb-10 leading-relaxed text-lg font-medium">
              설정 충돌이 발생했습니다. 초기화 후 다시 시도해 주세요.
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold hover:bg-slate-800 transition-custom text-xl shadow-xl active:scale-95"
            >
              설정 및 데이터 초기화
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [mngYear, setMngYear] = useState<number>(new Date().getFullYear());

  // LocalStorage state
  const [departments, setDepartments] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('work_schedule_departments');
      return saved ? JSON.parse(saved) : DEFAULT_DEPARTMENTS;
    } catch (e) {
      return DEFAULT_DEPARTMENTS;
    }
  });

  const [staff, setStaff] = useState<Staff[]>(() => {
    try {
      const saved = localStorage.getItem('work_schedule_staff');
      return saved ? JSON.parse(saved) : DEFAULT_STAFF;
    } catch (e) {
      return DEFAULT_STAFF;
    }
  });

  const [events, setEvents] = useState<WorkEvent[]>(() => {
    try {
      const saved = localStorage.getItem('work_schedule_events');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return parsed.map((e: any) => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
        hasAttachment: !!e.hasAttachment
      })).filter((e: WorkEvent) => !isNaN(e.start.getTime()));
    } catch (err) {
      return [];
    }
  });

  // Search filter state for list view
  const [appliedFilter, setAppliedFilter] = useState<FilterState>({
    name: '',
    type: '전체',
    start: '',
    end: ''
  });

  // Organization view date & filter
  const [orgSelectedDate, setOrgSelectedDate] = useState<string>(formatDate(new Date()));
  const [orgFilterStatus, setOrgFilterStatus] = useState<string>('전체');
  const [orgSelectedDepts, setOrgSelectedDepts] = useState<string[]>(departments);

  // Calendar worker filter state
  const [isAllStaffSelected, setIsAllStaffSelected] = useState<boolean>(true);
  const [selectedStaffNames, setSelectedStaffNames] = useState<string[]>([]);

  const handleToggleAllStaff = useCallback(() => {
    setIsAllStaffSelected(true);
    setSelectedStaffNames([]);
  }, []);

  const handleToggleStaff = useCallback((name: string) => {
    setIsAllStaffSelected(prevAll => {
      if (prevAll) {
        // When clicking a staff while 'All' is active: uncheck 'All' and select only this staff
        setSelectedStaffNames([name]);
        return false;
      }
      // When already in specific staff mode: toggle this staff
      setSelectedStaffNames(prevList => {
        const next = prevList.includes(name)
          ? prevList.filter(n => n !== name)
          : [...prevList, name];
        // If unchecking the last staff member, revert to 'All'
        if (next.length === 0) {
          setIsAllStaffSelected(true);
          return [];
        }
        return next;
      });
      return false;
    });
  }, []);

  // Global modals
  const [globalAlert, setGlobalAlert] = useState<GlobalAlertState>({
    isOpen: false,
    message: '',
    align: 'center',
    title: null
  });

  const [globalConfirm, setGlobalConfirm] = useState<GlobalConfirmState>({
    isOpen: false,
    message: '',
    onConfirm: null
  });

  // Event modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    id: null as string | number | null,
    name: '',
    type: '연가',
    date: formatDate(new Date()),
    startTime: '09:00',
    endTime: '17:00',
    details: '',
    hasAttachment: false,
    originalStatus: ''
  });

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('work_schedule_departments', JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem('work_schedule_staff', JSON.stringify(staff));
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('work_schedule_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    if (isModalOpen || globalAlert.isOpen || globalConfirm.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, globalAlert.isOpen, globalConfirm.isOpen]);

  useEffect(() => {
    setOrgSelectedDepts(prev => {
      const valid = prev.filter(d => departments.includes(d));
      const newlyAdded = departments.filter(d => !prev.includes(d));
      return [...valid, ...newlyAdded];
    });
  }, [departments]);

  const showAlert = (message: React.ReactNode | string, align: 'center' | 'left' = 'center', title: string | null = null) => {
    setGlobalAlert({ isOpen: true, message, align, title });
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setGlobalConfirm({ isOpen: true, message: String(message), onConfirm });
  };

  const toggleAttachment = (id: string | number) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, hasAttachment: !e.hasAttachment } : e));
  };

  const handleSelectEvent = useCallback((event: WorkEvent) => {
    const durationStr = getDurationString(event.start, event.end);
    const currentStaff = staff.find(s => s.name === event.name);
    const position = currentStaff ? currentStaff.position : (event.position || '-');
    const isSameDay = formatDate(event.start) === formatDate(event.end);
    const isTrip = event.type === '출장' || (event.originalStatus && event.originalStatus.includes('출장'));

    // Extract trip details from event fields or details string (for backwards compatibility)
    let tripType = event.tripType || '';
    let tripPlace = event.tripPlace || '';
    let tripDuration = event.tripDuration || '';
    let cleanDetails = event.details || '';

    if (isTrip && cleanDetails.includes('[')) {
      const match = cleanDetails.match(/^(.*?)\[(.*?)\]$/);
      if (match) {
        const mainPart = match[1].trim();
        const infoPart = match[2];
        infoPart.split('|').forEach(p => {
          const s = p.trim();
          if (s.startsWith('종류:')) tripType = tripType || s.replace('종류:', '').trim();
          if (s.startsWith('출장지:')) tripPlace = tripPlace || s.replace('출장지:', '').trim();
          if (s.startsWith('기간:')) tripDuration = tripDuration || s.replace('기간:', '').trim();
        });
        cleanDetails = mainPart || cleanDetails;
      }
    }

    // Integrate period into 일수/기간
    const displayDuration = tripDuration || durationStr;

    const detailNode = (
      <div className="flex flex-col w-full text-center px-1">
        <div className="flex flex-row items-center justify-center border-b border-slate-200 pb-5 mb-5 gap-3 w-full">
          <span className="text-[13px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 tracking-tight">
            {position}
          </span>
          <span className="text-[22px] font-black text-slate-800 tracking-tight">{event.name}</span>
        </div>

        <div className="flex flex-col space-y-4 text-left w-full">
          <div className="flex items-center gap-4">
            <span className="w-20 shrink-0 text-sm font-bold text-slate-400 text-center">근무상황</span>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-[17px] font-bold shadow-sm ${TYPE_COLORS[event.type] || 'bg-slate-50 text-slate-600'}`}>
              {event.originalStatus || event.type}
            </span>
          </div>

          <div className="flex items-center gap-4 bg-blue-50/80 p-4 rounded-xl border border-blue-200 shadow-inner">
            <span className="w-16 shrink-0 text-sm font-black text-blue-500 text-center">일시</span>
            <div className="tracking-tight flex flex-col gap-1">
              {isSameDay ? (
                <>
                  <span className="text-[17px] font-black text-blue-800">{formatDate(event.start)}</span>
                  <span className="text-[15px] font-bold text-blue-600">{formatTime(event.start)} ~ {formatTime(event.end)}</span>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[17px] font-black text-blue-800">{formatDate(event.start)}</span>
                    <span className="text-[15px] font-bold text-blue-600">{formatTime(event.start)}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[15px] font-bold text-blue-600">~</span>
                    <span className="text-[17px] font-black text-blue-800">{formatDate(event.end)}</span>
                    <span className="text-[15px] font-bold text-blue-600">{formatTime(event.end)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="w-20 shrink-0 text-sm font-bold text-slate-400 text-center">일수/기간</span>
            <span className="text-[15px] font-bold text-slate-700">{displayDuration}</span>
          </div>

          <div className="flex items-start gap-4">
            <span className="w-20 shrink-0 text-sm font-bold text-slate-400 mt-0.5 text-center">사유/용무</span>
            <span className="text-[15px] font-bold text-slate-700 break-all leading-snug">{cleanDetails || '-'}</span>
          </div>

          {isTrip && (
            <>
              <div className="flex items-center gap-4">
                <span className="w-20 shrink-0 text-sm font-bold text-slate-400 text-center">출장종류</span>
                <span className="text-[15px] font-bold text-slate-700">{tripType || '출장'}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-20 shrink-0 text-sm font-bold text-slate-400 text-center">출장지</span>
                <span className="text-[15px] font-bold text-slate-700">{tripPlace || '-'}</span>
              </div>
            </>
          )}

          {needsAttachment(event.type, event.originalStatus, event.details) && (
            <div className="flex items-center gap-4">
              <span className="w-20 shrink-0 text-sm font-bold text-slate-400 text-center">증빙서류</span>
              <span className={event.hasAttachment ? 'text-[15px] text-emerald-600 font-bold' : 'text-[15px] text-red-500 font-bold'}>
                {event.hasAttachment ? '제출 확인됨' : '미제출 상태'}
              </span>
            </div>
          )}
        </div>
      </div>
    );

    showAlert(detailNode, 'center', '근무상황 상세조회');
  }, [staff]);

  const handleSubmitEvent = (e: React.FormEvent) => {
    e.preventDefault();

    const createSafeDate = (dStr: string, tStr: string) => {
      try {
        const ds = dStr || formatDate(new Date());
        const ts = tStr || '00:00';
        const [y, m, d] = ds.split('-').map(Number);
        const [hr, min] = ts.split(':').map(Number);
        const parsedDate = new Date(y, m - 1, d, hr, min);
        return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
      } catch (err) {
        return new Date();
      }
    };

    const startDateTime = createSafeDate(newEvent.date, newEvent.startTime);
    const endDateTime = createSafeDate(newEvent.date, newEvent.endTime);
    const displayName = String(newEvent.name || '본인').trim();

    const existingStaff = staff.find(s => s.name === displayName);
    const pos = existingStaff ? existingStaff.position : '-';

    const newEventObj: WorkEvent = {
      id: newEvent.id || Date.now() + Math.random(),
      name: displayName,
      position: String(pos),
      title: `[${displayName}] ${newEvent.type}`,
      start: startDateTime,
      end: endDateTime,
      type: newEvent.type,
      originalStatus: newEvent.originalStatus || newEvent.type,
      details: newEvent.details || '',
      hasAttachment: !!newEvent.hasAttachment
    };

    setEvents(prev => {
      if (newEvent.id) {
        return prev.map(ex => ex.id === newEvent.id ? newEventObj : ex);
      } else {
        const filtered = prev.filter(ex => !(ex.name === newEventObj.name && formatDate(ex.start) === formatDate(newEventObj.start) && ex.type === newEventObj.type));
        return [...filtered, newEventObj];
      }
    });

    setIsModalOpen(false);
    setNewEvent({
      id: null,
      name: '',
      date: formatDate(new Date()),
      startTime: '09:00',
      endTime: '17:00',
      type: '연가',
      details: '',
      hasAttachment: false,
      originalStatus: ''
    });
  };

  const handleDeleteEvent = (id: string | number) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const handleOpenCreateModal = () => {
    setNewEvent({
      id: null,
      name: '',
      type: '연가',
      date: formatDate(new Date()),
      startTime: '09:00',
      endTime: '17:00',
      details: '',
      hasAttachment: false,
      originalStatus: ''
    });
    setIsModalOpen(true);
  };

  const handleEditEventFromList = (e: WorkEvent) => {
    setNewEvent({
      id: e.id,
      name: e.name,
      type: e.type,
      originalStatus: e.originalStatus || e.type,
      date: formatDate(e.start),
      startTime: formatTime(e.start),
      endTime: formatTime(e.end),
      details: e.details || '',
      hasAttachment: !!e.hasAttachment
    });
    setIsModalOpen(true);
  };

  // Today stats computation
  const todayStr = formatDate(new Date());
  const todayEvents = events.filter(e => formatDate(e.start) <= todayStr && formatDate(e.end) >= todayStr);
  const totalStaffCount = staff.length;
  const leaveCount = todayEvents.filter(e => ['연가', '병가', '특별휴가', '조퇴', '외출', '결근'].includes(e.type)).length;
  const dutyCount = todayEvents.filter(e => ['출장', '연수', '공가'].includes(e.type)).length;
  const presentCount = Math.max(0, totalStaffCount - todayEvents.length);

  const viewTitles: Record<ViewMode, string> = {
    calendar: '종합 상황실 (근무 달력)',
    list: '전체 복무 목록',
    organization: '기관 복무 현황',
    management: '연간 복무 통계/관리',
    vacation: '방학중 복무 현황 (Matrix)',
    upload: '복무 파일 관리 (CSV)',
    settings: '인사 및 조직 설정'
  };

  const formattedToday = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  });

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-900 font-sans">
        <Header
          viewMode={viewMode}
          setViewMode={setViewMode}
          onOpenCreateModal={handleOpenCreateModal}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* High Density Top Header Bar */}
          <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
            <div className="flex items-center gap-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
                {viewTitles[viewMode]}
              </h2>
              <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2.5 py-1 rounded border border-slate-200">
                {formattedToday}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {viewMode === 'calendar' && (
                <WorkerFilterDropdown
                  staff={staff}
                  events={events}
                  isAllSelected={isAllStaffSelected}
                  selectedNames={selectedStaffNames}
                  onToggleAll={handleToggleAllStaff}
                  onToggleStaff={handleToggleStaff}
                />
              )}
              <button
                onClick={handleOpenCreateModal}
                className="hidden sm:flex bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-md text-xs font-bold shadow-xs transition-all active:scale-95 items-center gap-1.5"
              >
                <i className="fa-solid fa-plus text-[10px]"></i>
                <span>신청</span>
              </button>
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                  나
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-800 leading-tight">나이스 담당자</p>
                  <p className="text-[10px] text-slate-500 font-medium">교무행정</p>
                </div>
              </div>
            </div>
          </header>

          {/* Main Dashboard Area */}
          <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-5">
            {/* High Density KPI Summary Stats Row */}
            {['calendar', 'list', 'organization', 'management'].includes(viewMode) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-3 sm:p-3.5 border border-slate-200 rounded-lg shadow-2xs flex flex-col justify-between">
                  <p className="text-xs font-bold text-slate-500 mb-0.5">전체 인원</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">
                    {totalStaffCount} <span className="text-xs font-normal text-slate-400">명</span>
                  </p>
                </div>

                <div className="bg-white p-3 sm:p-3.5 border border-slate-200 rounded-lg shadow-2xs flex flex-col justify-between">
                  <p className="text-xs font-bold text-slate-500 mb-0.5">현재 출근</p>
                  <p className="text-xl font-black text-blue-600 tracking-tight">
                    {presentCount} <span className="text-xs font-normal text-slate-400">명</span>
                  </p>
                </div>

                <div className="bg-white p-3 sm:p-3.5 border border-slate-200 rounded-lg shadow-2xs flex flex-col justify-between">
                  <p className="text-xs font-bold text-slate-500 mb-0.5">휴가/부재</p>
                  <p className="text-xl font-black text-orange-500 tracking-tight">
                    {leaveCount} <span className="text-xs font-normal text-slate-400">명</span>
                  </p>
                </div>

                <div className="bg-white p-3 sm:p-3.5 border border-slate-200 rounded-lg shadow-2xs flex flex-col justify-between">
                  <p className="text-xs font-bold text-slate-500 mb-0.5">출장/공가</p>
                  <p className="text-xl font-black text-emerald-600 tracking-tight">
                    {dutyCount} <span className="text-xs font-normal text-slate-400">명</span>
                  </p>
                </div>
              </div>
            )}

            {/* Active View Viewport */}
            <div>
              {viewMode === 'calendar' && (
                <CalendarView
                  currentMonth={currentMonth}
                  setCurrentMonth={setCurrentMonth}
                  events={events}
                  staff={staff}
                  isAllStaffSelected={isAllStaffSelected}
                  selectedStaffNames={selectedStaffNames}
                  onToggleAllStaff={handleToggleAllStaff}
                  onToggleStaff={handleToggleStaff}
                  onOpenCreateModal={handleOpenCreateModal}
                  onSelectEvent={handleSelectEvent}
                  onSelectDate={(dateStr) => {
                    setNewEvent(prev => ({ ...prev, date: dateStr }));
                    setIsModalOpen(true);
                  }}
                  setViewMode={setViewMode}
                  setOrgSelectedDate={setOrgSelectedDate}
                  setOrgFilterStatus={setOrgFilterStatus}
                />
              )}

              {viewMode === 'list' && (
                <ListView
                  events={events}
                  appliedFilter={appliedFilter}
                  setAppliedFilter={setAppliedFilter}
                  onEditEvent={handleEditEventFromList}
                  onDeleteEvent={handleDeleteEvent}
                  onToggleAttachment={toggleAttachment}
                  showAlert={showAlert}
                  showConfirm={showConfirm}
                />
              )}

              {viewMode === 'organization' && (
                <OrganizationView
                  staff={staff}
                  events={events}
                  departments={departments}
                  orgSelectedDate={orgSelectedDate}
                  setOrgSelectedDate={setOrgSelectedDate}
                  orgFilterStatus={orgFilterStatus}
                  setOrgFilterStatus={setOrgFilterStatus}
                  orgSelectedDepts={orgSelectedDepts}
                  setOrgSelectedDepts={setOrgSelectedDepts}
                />
              )}

              {viewMode === 'management' && (
                <ManagementView
                  events={events}
                  staff={staff}
                  departments={departments}
                  mngYear={mngYear}
                  setMngYear={setMngYear}
                  onSelectEvent={handleSelectEvent}
                  onToggleAttachment={toggleAttachment}
                  showAlert={showAlert}
                />
              )}

              {viewMode === 'vacation' && (
                <VacationView
                  staff={staff}
                  events={events}
                  departments={departments}
                  onSelectEvent={handleSelectEvent}
                  onSelectDateStaff={(dateStr, staffName) => {
                    setNewEvent(prev => ({
                      ...prev,
                      name: staffName,
                      date: dateStr,
                      type: '41조'
                    }));
                    setIsModalOpen(true);
                  }}
                />
              )}

              {viewMode === 'upload' && (
                <UploadView
                  staff={staff}
                  setStaff={setStaff}
                  departments={departments}
                  setDepartments={setDepartments}
                  events={events}
                  setEvents={setEvents}
                  setViewMode={setViewMode}
                  showAlert={showAlert}
                  showConfirm={showConfirm}
                />
              )}

              {viewMode === 'settings' && (
                <SettingsView
                  departments={departments}
                  setDepartments={setDepartments}
                  staff={staff}
                  setStaff={setStaff}
                  showAlert={showAlert}
                  showConfirm={showConfirm}
                />
              )}
            </div>
          </main>
        </div>

        <EventModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          eventData={newEvent}
          setEventData={setNewEvent}
          onSubmit={handleSubmitEvent}
          showAlert={showAlert}
        />

        <AlertConfirmModal
          alertState={globalAlert}
          onCloseAlert={() => setGlobalAlert({ isOpen: false, message: '', align: 'center', title: null })}
          confirmState={globalConfirm}
          onCloseConfirm={() => setGlobalConfirm({ isOpen: false, message: '', onConfirm: null })}
        />
      </div>
    </ErrorBoundary>
  );
}
