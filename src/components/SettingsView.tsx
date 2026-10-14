import React, { useState } from 'react';
import { Staff, WorkEvent, NotificationSettings } from '../types';
import { normalizePosition, getPositionWeight, DEFAULT_NOTIFICATION_SETTINGS, playNotificationSound, sendBrowserNotification } from '../utils/constants';

interface SettingsViewProps {
  departments: string[];
  setDepartments: React.Dispatch<React.SetStateAction<string[]>>;
  staff: Staff[];
  setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
  events: WorkEvent[];
  setEvents: React.Dispatch<React.SetStateAction<WorkEvent[]>>;
  showAlert: (message: React.ReactNode | string, align?: 'center' | 'left', title?: string | null) => void;
  showConfirm: (message: string, onConfirm: () => void) => void;
  notificationSettings?: NotificationSettings;
  setNotificationSettings?: React.Dispatch<React.SetStateAction<NotificationSettings>>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  departments,
  setDepartments,
  staff,
  setStaff,
  events,
  setEvents,
  showAlert,
  showConfirm,
  notificationSettings: propsNotifSettings,
  setNotificationSettings: propsSetNotifSettings
}) => {
  const [newDept, setNewDept] = useState('');
  const [newStaff, setNewStaff] = useState({ name: '', position: '', department: departments[0] || '' });
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editStaffData, setEditStaffData] = useState({ name: '', position: '' });
  const [deptFilters, setDeptFilters] = useState<Record<string, { name: string; position: string }>>({});

  const [activeTab, setActiveTab] = useState<'notifications' | 'organization'>(() => {
    try {
      const savedTab = localStorage.getItem('worksync_settings_tab');
      if (savedTab === 'organization' || savedTab === 'notifications') {
        return savedTab;
      }
    } catch (e) {
      // ignore
    }
    return 'notifications';
  });

  const handleSelectTab = (tab: 'notifications' | 'organization') => {
    setActiveTab(tab);
    try {
      localStorage.setItem('worksync_settings_tab', tab);
    } catch (e) {
      // ignore
    }
  };

  // Local notification settings state (synced with props or localStorage)
  const [localNotif, setLocalNotif] = useState<NotificationSettings>(() => {
    if (propsNotifSettings) return propsNotifSettings;
    try {
      const saved = localStorage.getItem('work_schedule_notification_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return DEFAULT_NOTIFICATION_SETTINGS;
  });

  const activeNotif = propsNotifSettings || localNotif;
  const updateNotif = (updater: (prev: NotificationSettings) => NotificationSettings) => {
    const updated = updater(activeNotif);
    if (propsSetNotifSettings) {
      propsSetNotifSettings(updated);
    } else {
      setLocalNotif(updated);
      localStorage.setItem('work_schedule_notification_settings', JSON.stringify(updated));
    }
  };

  const handleToggleMaster = () => {
    updateNotif(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const handleToggleSound = () => {
    updateNotif(prev => {
      const next = !prev.soundEnabled;
      if (next) playNotificationSound();
      return { ...prev, soundEnabled: next };
    });
  };

  const handleToggleBrowserNotif = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showAlert('이 브라우저는 웹 브라우저 알림 기능을 지원하지 않습니다.');
      return;
    }

    if (Notification.permission === 'granted') {
      updateNotif(prev => ({ ...prev, browserNotification: !prev.browserNotification }));
      return;
    }

    if (Notification.permission === 'denied') {
      showAlert('브라우저 설정에서 알림 권한이 차단되어 있습니다. 주소창 좌측의 자물쇠/설정 아이콘을 눌러 알림 권한을 허용해 주세요.');
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        updateNotif(prev => ({ ...prev, browserNotification: true }));
        sendBrowserNotification('WorkSync 알림', { body: '브라우저 알림이 성공적으로 활성화되었습니다.' });
      } else {
        updateNotif(prev => ({ ...prev, browserNotification: false }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleWorkTypeMaster = () => {
    updateNotif(prev => ({
      ...prev,
      workTypeAlerts: {
        ...prev.workTypeAlerts,
        enabled: !prev.workTypeAlerts.enabled
      }
    }));
  };

  const handleToggleSingleType = (typeKey: string) => {
    updateNotif(prev => ({
      ...prev,
      workTypeAlerts: {
        ...prev.workTypeAlerts,
        types: {
          ...prev.workTypeAlerts.types,
          [typeKey]: !prev.workTypeAlerts.types[typeKey]
        }
      }
    }));
  };

  const handleSetAllTypes = (state: boolean) => {
    updateNotif(prev => {
      const newTypes = { ...prev.workTypeAlerts.types };
      Object.keys(newTypes).forEach(k => { newTypes[k] = state; });
      return {
        ...prev,
        workTypeAlerts: {
          ...prev.workTypeAlerts,
          types: newTypes
        }
      };
    });
  };

  const handleSetOnlyAnnualAndTrip = () => {
    updateNotif(prev => {
      const newTypes = { ...prev.workTypeAlerts.types };
      Object.keys(newTypes).forEach(k => { newTypes[k] = false; });
      newTypes['연가'] = true;
      newTypes['출장'] = true;
      return {
        ...prev,
        workTypeAlerts: {
          ...prev.workTypeAlerts,
          types: newTypes
        }
      };
    });
    showAlert('알림 대상이 [연가, 출장]으로 설정되었습니다.');
  };

  const handleToggleMissingDocMaster = () => {
    updateNotif(prev => ({
      ...prev,
      missingDocumentAlert: {
        ...prev.missingDocumentAlert,
        enabled: !prev.missingDocumentAlert.enabled
      }
    }));
  };

  const handleToggleMissingDocSub = (key: 'alertOnUpload' | 'alertOnCreate') => {
    updateNotif(prev => ({
      ...prev,
      missingDocumentAlert: {
        ...prev.missingDocumentAlert,
        [key]: !prev.missingDocumentAlert[key]
      }
    }));
  };

  const handleTestAlert = (type: '연가' | '출장' | '증빙누락') => {
    if (activeNotif.soundEnabled) {
      playNotificationSound();
    }

    if (type === '연가') {
      if (activeNotif.browserNotification) {
        sendBrowserNotification('[WorkSync 알림] 연가 등록', { body: '이민호 교사님의 연가(2026-10-15)가 등록되었습니다.' });
      }
      showAlert(
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-base">
            <i className="fa-solid fa-bell text-lg"></i>
            <span>[테스트] 연가 등록 알림</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            <strong>이민호</strong> (교사)님의 <strong>연가</strong> 일정이 시스템에 등록되었습니다.
          </p>
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs text-blue-800 flex justify-between items-center">
            <span>기간: 2026-10-15 09:00 ~ 17:00 (1일)</span>
            <span className="font-bold bg-blue-600 text-white px-2 py-0.5 rounded text-[10px]">연가</span>
          </div>
        </div>,
        'left',
        '알림 시뮬레이션'
      );
    } else if (type === '출장') {
      if (activeNotif.browserNotification) {
        sendBrowserNotification('[WorkSync 알림] 출장 등록', { body: '강동원 행정실장님의 관내출장이 등록되었습니다.' });
      }
      showAlert(
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-base">
            <i className="fa-solid fa-plane-departure text-lg"></i>
            <span>[테스트] 출장 등록 알림</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            <strong>강동원</strong> (행정실장)님의 <strong>관내출장</strong> 일정이 시스템에 등록되었습니다.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-800 space-y-1">
            <div className="flex justify-between">
              <span className="font-bold">출장지: 교육지원청 대회의실</span>
              <span className="font-bold bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px]">출장</span>
            </div>
            <div>용무: 2026년 학교회계 예산편성 실무자 협의회</div>
          </div>
        </div>,
        'left',
        '알림 시뮬레이션'
      );
    } else {
      if (activeNotif.browserNotification) {
        sendBrowserNotification('[WorkSync 경고] 증빙 서류 누락', { body: '박선영 교감님의 공가 신청에 증빙서류(첨부파일)가 누락되었습니다.' });
      }
      showAlert(
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
            <i className="fa-solid fa-triangle-exclamation text-lg"></i>
            <span>[테스트] 증빙 서류 누락 알림</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            <strong>박선영</strong> (교감)님의 <strong>공가</strong> 신청 건에 <span className="text-rose-600 font-bold">증빙서류(첨부파일)</span>가 등록되지 않았습니다.
          </p>
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 leading-relaxed">
            ⚠️ <strong>필수 제출 안내:</strong> 공가 및 가족돌봄/경조사 특별휴가는 사후 증빙 서류 첨부가 필수입니다. [연간 복무 관리]에서 서류 제출 여부를 체크해 주세요.
          </div>
        </div>,
        'left',
        '증빙서류 누락 경고'
      );
    }
  };


  const handleAddDept = () => {
    const trimmed = newDept.trim();
    if (trimmed && !departments.includes(trimmed)) {
      setDepartments(prev => [...prev, trimmed]);
      setNewDept('');
    }
  };

  const handleDeleteDept = (dept: string) => {
    const deptStaff = staff.filter(s => s.department === dept);
    const deptStaffNames = deptStaff.map(s => s.name);
    const relatedEvents = events.filter(e => deptStaffNames.includes(e.name));
    const tripCount = relatedEvents.filter(e => e.type === '출장').length;
    const leaveCount = relatedEvents.filter(e => e.type !== '출장').length;
    const totalCount = relatedEvents.length;

    let msg = `[조직(부서) 및 관련 내역 삭제 고지]\n\n'${dept}' 부서를 삭제하시겠습니까?\n\n`;
    if (deptStaff.length > 0) {
      const staffPreview = deptStaffNames.slice(0, 4).join(', ') + (deptStaffNames.length > 4 ? ` 외 ${deptStaffNames.length - 4}명` : '');
      msg += `⚠️ 고지: 삭제 시 해당 부서 소속 인원(${deptStaff.length}명)과 관련된 모든 복무 및 출장 내역도 함께 영구 삭제됩니다.\n\n` +
             `• 소속 인원: ${deptStaff.length}명 (${staffPreview})\n` +
             `• 관련 복무(연가/병가/공가 등): ${leaveCount}건\n` +
             `• 관련 출장: ${tripCount}건\n` +
             `(총 ${totalCount}건의 관련 복무·출장 기록 영구 삭제)\n\n` +
             `삭제를 계속 진행하시려면 [진행] 버튼을 눌러주세요.`;
    } else {
      msg += `(소속된 인원이 없습니다.)\n\n삭제를 계속 진행하시려면 [진행] 버튼을 눌러주세요.`;
    }

    showConfirm(msg, () => {
      setDepartments(prev => prev.filter(d => d !== dept));
      setStaff(prev => prev.filter(s => s.department !== dept));
      if (deptStaffNames.length > 0) {
        setEvents(prev => prev.filter(e => !deptStaffNames.includes(e.name)));
      }
      if (totalCount > 0) {
        showAlert(`'${dept}' 부서 및 소속 인원(${deptStaff.length}명), 관련 복무·출장 내역(${totalCount}건)이 모두 삭제되었습니다.`);
      } else {
        showAlert(`'${dept}' 부서가 삭제되었습니다.`);
      }
    });
  };

  const handleDeleteStaff = (s: Staff) => {
    const relatedEvents = events.filter(e => e.name === s.name);
    const tripCount = relatedEvents.filter(e => e.type === '출장').length;
    const leaveCount = relatedEvents.filter(e => e.type !== '출장').length;
    const totalCount = relatedEvents.length;

    let msg = `[근무자 및 관련 내역 삭제 고지]\n\n'${s.name}'(${s.position || '직위 미지정'}) 님을 삭제하시겠습니까?\n\n`;
    if (totalCount > 0) {
      msg += `⚠️ 고지: 삭제 시 해당 근무자와 관련된 모든 복무 및 출장 데이터도 함께 영구 삭제됩니다.\n\n` +
             `• 소속 부서: ${s.department}\n` +
             `• 관련 복무 내역(연가/병가/공가 등): ${leaveCount}건\n` +
             `• 관련 출장 내역: ${tripCount}건\n` +
             `(총 ${totalCount}건의 복무·출장 기록 영구 삭제)\n\n` +
             `삭제를 계속 진행하시려면 [진행] 버튼을 눌러주세요.`;
    } else {
      msg += `(해당 근무자의 등록된 복무 및 출장 내역이 없습니다.)\n\n삭제를 계속 진행하시려면 [진행] 버튼을 눌러주세요.`;
    }

    showConfirm(msg, () => {
      setStaff(prev => prev.filter(item => item.id !== s.id));
      if (totalCount > 0) {
        setEvents(prev => prev.filter(e => e.name !== s.name));
        showAlert(`'${s.name}' 님과 관련 복무·출장 내역(총 ${totalCount}건)이 삭제되었습니다.`);
      } else {
        showAlert(`'${s.name}' 님이 삭제되었습니다.`);
      }
    });
  };

  const handleResetAllOrg = () => {
    const totalEvents = events.length;
    const msg = `[전체 조직 및 데이터 초기화 고지]\n\n전체 인원, 부서 설정 및 등록된 모든 복무·출장 내역을 초기화하시겠습니까?\n\n⚠️ 고지: 등록된 인원(${staff.length}명) 및 모든 복무·출장 내역(${totalEvents}건)이 영구 삭제됩니다.\n\n삭제를 계속 진행하시려면 [진행] 버튼을 눌러주세요.`;
    showConfirm(msg, () => {
      setDepartments(['마산중앙초등학교']);
      setStaff([]);
      setEvents([]);
      showAlert('전체 인원, 부서 및 복무·출장 데이터가 초기화되었습니다.');
    });
  };

  const handleAddStaff = (dept: string, e: React.FormEvent) => {
    e.preventDefault();
    if (newStaff.name.trim()) {
      const newMember: Staff = {
        id: Date.now().toString() + Math.random(),
        department: dept,
        position: normalizePosition(newStaff.position),
        name: newStaff.name.trim()
      };
      setStaff(prev => [...prev, newMember]);
      setNewStaff({ name: '', position: '', department: dept });
    }
  };

  const handleSortStaffByName = (dept: string) => {
    setStaff(prev => {
      const deptStaff = prev.filter(s => s.department === dept).sort((a, b) => String(a.name).localeCompare(String(b.name), 'ko'));
      const otherStaff = prev.filter(s => s.department !== dept);
      return [...deptStaff, ...otherStaff];
    });
    showAlert(`${dept} 부서 인원 이름순 정렬이 완료되었습니다.`);
  };

  const handleSortStaffByPosition = (dept: string) => {
    setStaff(prev => {
      const deptStaff = prev.filter(s => s.department === dept).sort((a, b) => {
        const wA = getPositionWeight(a.position), wB = getPositionWeight(b.position);
        if (wA !== wB) return wA - wB;
        return String(a.name).localeCompare(String(b.name), 'ko');
      });
      const otherStaff = prev.filter(s => s.department !== dept);
      return [...deptStaff, ...otherStaff];
    });
    showAlert(`${dept} 부서 인원 직위순 정렬이 완료되었습니다.`);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Settings Sub-navigation Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => handleSelectTab('notifications')}
          className={`flex-1 py-3 px-5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all ${
            activeTab === 'notifications'
              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <i className="fa-solid fa-bell"></i>
          <span>복무 및 증빙서류 알림 설정</span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ml-1 ${
            activeTab === 'notifications'
              ? activeNotif.enabled ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-200'
              : activeNotif.enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
          }`}>
            {activeNotif.enabled ? '알림 작동 중' : '알림 꺼짐'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('organization')}
          className={`flex-1 py-3 px-5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all ${
            activeTab === 'organization'
              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <i className="fa-solid fa-users-gear"></i>
          <span>조직 및 인원 설정</span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ml-1 ${
            activeTab === 'organization'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            {staff.length}명 ({departments.length}개 부서)
          </span>
        </button>
      </div>

      {/* Tab 1: Notification Settings Section */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
        {/* Section Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/50 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-xl shrink-0">
              <i className="fa-solid fa-bell"></i>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl md:text-2xl font-bold text-slate-800">복무 및 증빙서류 알림 설정</h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  activeNotif.enabled 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {activeNotif.enabled ? '알림 작동 중' : '알림 꺼짐'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                특정 복무(연가, 출장 등) 등록 및 필수 증빙 서류 누락 시 알림을 받을 수 있는 토글 스위치를 설정합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-700">전체 알림 사용</span>
            <button
              type="button"
              role="switch"
              aria-checked={activeNotif.enabled}
              onClick={handleToggleMaster}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                activeNotif.enabled ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  activeNotif.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className={`p-6 md:p-8 space-y-8 transition-opacity duration-200 ${activeNotif.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          {/* 1. Specific Work Type Alerts */}
          <div className="border border-slate-200 rounded-[2rem] p-6 bg-slate-50/30 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200/80 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  <i className="fa-solid fa-calendar-check"></i>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">특정 복무 등록 알림</h4>
                  <p className="text-xs text-slate-500">지정한 복무(연가, 출장 등)가 등록될 때 알림을 수신합니다.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSetOnlyAnnualAndTrip}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold border border-blue-200 transition-colors flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-star text-amber-500 text-[10px]"></i>
                  <span>연가·출장만 선택</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllTypes(true)}
                  className="px-2.5 py-1.5 bg-white text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium border border-slate-200 transition-colors"
                >
                  전체 선택
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllTypes(false)}
                  className="px-2.5 py-1.5 bg-white text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium border border-slate-200 transition-colors"
                >
                  전체 해제
                </button>
                <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block"></div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">기능 활성화</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={activeNotif.workTypeAlerts.enabled}
                    onClick={handleToggleWorkTypeMaster}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      activeNotif.workTypeAlerts.enabled ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        activeNotif.workTypeAlerts.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Work Type Toggles Grid */}
            <div className={`mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 transition-opacity ${activeNotif.workTypeAlerts.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              {[
                { key: '연가', label: '연가', icon: 'fa-solid fa-calendar-day', desc: '개인 연가·반일연가 등록', color: 'blue' },
                { key: '출장', label: '출장', icon: 'fa-solid fa-plane-departure', desc: '관내·관외 출장 등록', color: 'emerald' },
                { key: '병가', label: '병가', icon: 'fa-solid fa-heart-pulse', desc: '일반·공무상 병가 등록', color: 'red' },
                { key: '공가', label: '공가', icon: 'fa-solid fa-building-columns', desc: '투표·검진·훈련 등 공가', color: 'purple' },
                { key: '특별휴가', label: '특별휴가', icon: 'fa-solid fa-gift', desc: '경조사·가족돌봄·모성보호', color: 'pink' },
                { key: '41조', label: '41조 연수', icon: 'fa-solid fa-book-open', desc: '교육공무원법 41조 연수', color: 'teal' },
                { key: '조퇴', label: '조퇴', icon: 'fa-solid fa-person-walking-arrow-right', desc: '근무시간 중 조퇴', color: 'amber' },
                { key: '외출', label: '외출', icon: 'fa-solid fa-door-open', desc: '근무시간 중 외출', color: 'orange' },
              ].map(item => {
                const isChecked = !!activeNotif.workTypeAlerts.types[item.key];
                return (
                  <div
                    key={item.key}
                    onClick={() => handleToggleSingleType(item.key)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isChecked 
                        ? 'bg-white border-blue-300 shadow-xs ring-1 ring-blue-100' 
                        : 'bg-white/60 border-slate-200 hover:border-slate-300 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                        isChecked ? 'bg-blue-50 text-blue-600 font-bold' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <i className={item.icon}></i>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-slate-800">{item.label}</span>
                          {(item.key === '연가' || item.key === '출장') && (
                            <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded font-bold border border-amber-200">
                              주요
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{item.desc}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isChecked}
                      onClick={(e) => { e.stopPropagation(); handleToggleSingleType(item.key); }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isChecked ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isChecked ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Missing Supporting Document Alert */}
          <div className="border border-slate-200 rounded-[2rem] p-6 bg-slate-50/30 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/80 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm">
                  <i className="fa-solid fa-file-circle-exclamation"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-800 text-base">증빙 서류 누락 알림</h4>
                    <span className="text-[11px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200">
                      필수 서류 관리
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    공가, 가족돌봄/경조사 특별휴가 등 증빙이 필수인 복무에서 서류가 미제출된 경우 알림을 발송합니다.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">누락 알림 수신</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={activeNotif.missingDocumentAlert.enabled}
                  onClick={handleToggleMissingDocMaster}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    activeNotif.missingDocumentAlert.enabled ? 'bg-rose-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      activeNotif.missingDocumentAlert.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Sub-options for missing document alert */}
            <div className={`mt-5 space-y-3 transition-opacity ${activeNotif.missingDocumentAlert.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div 
                onClick={() => handleToggleMissingDocSub('alertOnCreate')}
                className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-pen-to-square"></i>
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-800 block">복무 직접 신청 시 증빙 미첨부 확인 알림</span>
                    <span className="text-xs text-slate-400">신청 모달에서 증빙이 필요한 복무를 서류 없이 등록할 때 주의 팝업을 표시합니다.</span>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={activeNotif.missingDocumentAlert.alertOnCreate}
                  onClick={(e) => { e.stopPropagation(); handleToggleMissingDocSub('alertOnCreate'); }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    activeNotif.missingDocumentAlert.alertOnCreate ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      activeNotif.missingDocumentAlert.alertOnCreate ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div 
                onClick={() => handleToggleMissingDocSub('alertOnUpload')}
                className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-file-arrow-up"></i>
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-800 block">CSV 복무 파일 업로드 시 누락 건 일괄 안내</span>
                    <span className="text-xs text-slate-400">나이스 CSV 복무 파일 적용 완료 시 증빙서류 미제출 건수와 대상자 명단을 요약 안내합니다.</span>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={activeNotif.missingDocumentAlert.alertOnUpload}
                  onClick={(e) => { e.stopPropagation(); handleToggleMissingDocSub('alertOnUpload'); }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    activeNotif.missingDocumentAlert.alertOnUpload ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      activeNotif.missingDocumentAlert.alertOnUpload ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-800 flex items-center gap-2">
                <i className="fa-solid fa-circle-info text-blue-500"></i>
                <span>증빙 서류 대상 복무: <strong>공가</strong> 전체, <strong>특별휴가(가족돌봄, 경조사)</strong>, <strong>병가</strong></span>
              </div>
            </div>
          </div>

          {/* 3. Delivery Method & Test Simulation */}
          <div className="border border-slate-200 rounded-[2rem] p-6 bg-slate-50/30 shadow-xs">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200/80">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">
                <i className="fa-solid fa-sliders"></i>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-base">알림 수신 방식 및 즉시 테스트</h4>
                <p className="text-xs text-slate-500">소리, 브라우저 팝업 설정 및 실제 알림 동작을 미리 테스트합니다.</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Sound toggle */}
              <div 
                onClick={handleToggleSound}
                className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-volume-high"></i>
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-800 block">알림 사운드 효과</span>
                    <span className="text-xs text-slate-400">알림 발생 시 부드러운 차임벨 사운드를 재생합니다.</span>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={activeNotif.soundEnabled}
                  onClick={(e) => { e.stopPropagation(); handleToggleSound(); }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    activeNotif.soundEnabled ? 'bg-teal-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      activeNotif.soundEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Browser Push toggle */}
              <div 
                onClick={handleToggleBrowserNotif}
                className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-desktop"></i>
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-800 block">웹 브라우저 데스크톱 알림</span>
                    <span className="text-xs text-slate-400">다른 탭 작업 중에도 브라우저 푸시 알림을 수신합니다.</span>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={activeNotif.browserNotification}
                  onClick={(e) => { e.stopPropagation(); handleToggleBrowserNotif(); }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    activeNotif.browserNotification ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      activeNotif.browserNotification ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Test Simulation Buttons */}
            <div className="mt-5 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <i className="fa-solid fa-vial-circle-check text-indigo-500"></i>
                알림 동작 테스트 (시뮬레이션):
              </span>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleTestAlert('연가')}
                  className="px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold border border-blue-200 transition-custom flex items-center gap-1.5 shadow-2xs"
                >
                  <i className="fa-solid fa-bell text-[11px]"></i>
                  <span>연가 알림 테스트</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestAlert('출장')}
                  className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold border border-emerald-200 transition-custom flex items-center gap-1.5 shadow-2xs"
                >
                  <i className="fa-solid fa-plane-departure text-[11px]"></i>
                  <span>출장 알림 테스트</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestAlert('증빙누락')}
                  className="px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold border border-rose-200 transition-custom flex items-center gap-1.5 shadow-2xs"
                >
                  <i className="fa-solid fa-triangle-exclamation text-[11px]"></i>
                  <span>증빙누락 경고 테스트</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* Tab 2: Staff & Department Organization */}
      {activeTab === 'organization' && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
        <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/30 gap-4">
          <h3 className="text-2xl font-bold text-slate-800">조직 및 인원 설정</h3>
          <div className="flex gap-2 items-center flex-wrap">
            <button
              onClick={() => window.print()}
              className="px-5 py-2 bg-white text-slate-700 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 transition-custom shadow-2xs flex items-center gap-1.5"
              title="조직 및 인원 설정 인쇄"
            >
              <i className="fa-solid fa-print text-slate-500"></i>
              <span>인쇄</span>
            </button>
            <button
              onClick={handleResetAllOrg}
              className="px-5 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100 hover:bg-red-100 transition-custom"
            >
              <span>전체 초기화</span>
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-10">
          {/* Add Department Input */}
          <div className="flex gap-3">
            <input
              type="text"
              value={newDept}
              onChange={e => setNewDept(e.target.value)}
              placeholder="새 부서 명칭 입력 (예: 교무실, 행정실)"
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
            <button
              onClick={handleAddDept}
              className="bg-slate-800 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-slate-700 transition-custom shadow-md text-sm"
            >
              <span>부서 추가</span>
            </button>
          </div>

          {/* Department Cards */}
          {departments.map(dept => {
            const currentFilter = deptFilters[dept] || { name: '', position: '모두' };
            const uniquePositions = Array.from(new Set(staff.filter(s => s.department === dept).map(s => s.position)))
              .sort((a: string, b: string) => getPositionWeight(a) - getPositionWeight(b) || a.localeCompare(b, 'ko'));
            const deptPositions = ['모두', ...uniquePositions];

            return (
              <div key={dept} className="border border-slate-200 rounded-[2rem] overflow-hidden mb-6 shadow-sm">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <span className="font-bold text-slate-800 text-lg">{dept}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleSortStaffByName(dept)}
                      className="px-3 py-1.5 bg-white text-slate-600 rounded-lg text-xs font-semibold border border-slate-200 hover:bg-slate-100 transition-custom"
                    >
                      이름순
                    </button>
                    <button
                      onClick={() => handleSortStaffByPosition(dept)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-custom"
                    >
                      직위순
                    </button>
                    <button
                      onClick={() => handleDeleteDept(dept)}
                      className="text-slate-400 hover:text-red-500 p-1.5 ml-1 transition-colors"
                      title="부서 삭제"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>

                {/* Form to add staff member */}
                <div className="p-5 bg-white border-b border-slate-100">
                  <form onSubmit={e => handleAddStaff(dept, e)} className="flex flex-col md:flex-row gap-4">
                    <input
                      type="text"
                      value={newStaff.department === dept ? newStaff.position : ''}
                      onChange={e => setNewStaff({ ...newStaff, position: e.target.value, department: dept })}
                      placeholder="직위 (교사 등)"
                      className="w-full sm:w-32 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={newStaff.department === dept ? newStaff.name : ''}
                      onChange={e => setNewStaff({ ...newStaff, name: e.target.value, department: dept })}
                      placeholder="성명 입력"
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 shadow-md transition-custom text-sm"
                    >
                      <span>추가</span>
                    </button>
                  </form>
                </div>

                {/* Sub-filters within department */}
                <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row gap-2 items-center">
                  <select
                    value={currentFilter.position}
                    onChange={e => setDeptFilters(prev => ({
                      ...prev,
                      [dept]: { ...(prev[dept] || { name: '', position: '모두' }), position: e.target.value }
                    }))}
                    className="w-full sm:w-32 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white font-medium"
                  >
                    {deptPositions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input
                    type="text"
                    value={currentFilter.name}
                    onChange={e => setDeptFilters(prev => ({
                      ...prev,
                      [dept]: { ...(prev[dept] || { name: '', position: '모두' }), name: e.target.value }
                    }))}
                    placeholder="이름 검색"
                    className="flex-1 w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none font-medium"
                  />
                </div>

                {/* Staff List */}
                <ul className="divide-y divide-slate-50 text-sm font-medium">
                  {staff
                    .filter(s => s.department === dept)
                    .filter(s => !currentFilter.position || currentFilter.position === '모두' || s.position === currentFilter.position)
                    .filter(s => s.name.includes(currentFilter.name))
                    .map((s, idx, arr) => (
                      <li key={s.id} className="px-6 py-3.5 flex justify-between items-center bg-white hover:bg-slate-50/50 transition-custom">
                        {editingStaffId === s.id ? (
                          <div className="flex flex-1 gap-2 items-center">
                            <input
                              type="text"
                              value={editStaffData.position}
                              onChange={e => setEditStaffData({ ...editStaffData, position: e.target.value })}
                              className="w-24 border border-slate-200 rounded-lg px-2 py-1 text-xs"
                            />
                            <input
                              type="text"
                              value={editStaffData.name}
                              onChange={e => setEditStaffData({ ...editStaffData, name: e.target.value })}
                              className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs"
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setStaff(staff.map(i => i.id === s.id ? { ...i, name: editStaffData.name.trim(), position: normalizePosition(editStaffData.position) } : i));
                                  setEditingStaffId(null);
                                }}
                                className="bg-emerald-600 text-white px-3 py-1 rounded-lg font-bold transition-custom text-xs"
                              >
                                저장
                              </button>
                              <button
                                onClick={() => setEditingStaffId(null)}
                                className="bg-slate-200 text-slate-600 px-3 py-1 rounded-lg font-bold transition-custom text-xs"
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-4">
                              <span className="w-20 text-center text-[10px] font-bold text-slate-500 bg-slate-100 py-1 rounded-md border border-slate-200 truncate px-1">
                                {String(s.position)}
                              </span>
                              <span className="text-base font-bold text-slate-800">{String(s.name)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="flex border border-slate-200 rounded-lg overflow-hidden mr-2">
                                <button
                                  onClick={() => {
                                    const i = staff.findIndex(item => item.id === s.id);
                                    if (i > 0) {
                                      const n = [...staff];
                                      [n[i], n[i - 1]] = [n[i - 1], n[i]];
                                      setStaff(n);
                                    }
                                  }}
                                  disabled={idx === 0}
                                  className="px-2.5 py-1 hover:bg-slate-100 disabled:opacity-20 text-slate-400"
                                >
                                  <i className="fa-solid fa-chevron-up text-[10px]"></i>
                                </button>
                                <button
                                  onClick={() => {
                                    const i = staff.findIndex(item => item.id === s.id);
                                    if (i < staff.length - 1) {
                                      const n = [...staff];
                                      [n[i], n[i + 1]] = [n[i + 1], n[i]];
                                      setStaff(n);
                                    }
                                  }}
                                  disabled={idx === arr.length - 1}
                                  className="px-2.5 py-1 border-l border-slate-200 hover:bg-slate-100 disabled:opacity-20 text-slate-400"
                                >
                                  <i className="fa-solid fa-chevron-down text-[10px]"></i>
                                </button>
                              </div>
                              <button
                                onClick={() => {
                                  setEditingStaffId(s.id);
                                  setEditStaffData({ name: s.name, position: s.position });
                                }}
                                className="text-slate-400 hover:text-blue-500 p-2 transition-custom"
                                title="수정"
                              >
                                <i className="fa-solid fa-pen text-sm"></i>
                              </button>
                              <button
                                onClick={() => handleDeleteStaff(s)}
                                className="text-slate-400 hover:text-red-500 p-2 transition-custom"
                                title="삭제 (관련 복무·출장 포함)"
                              >
                                <i className="fa-solid fa-trash-can text-sm"></i>
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    )}
    </div>
  );
};
