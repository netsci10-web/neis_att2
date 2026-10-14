import React, { useMemo } from 'react';
import { Staff, WorkEvent } from '../types';
import { TYPE_COLORS } from '../utils/constants';
import { formatDate, formatTime, clampDate, getDurationMins, getMonthsDays, formatDur, getDurationString, needsAttachment } from '../utils/dateUtils';

interface ManagementViewProps {
  events: WorkEvent[];
  staff: Staff[];
  departments: string[];
  mngYear: number;
  setMngYear: (year: number) => void;
  onSelectEvent: (event: WorkEvent) => void;
  onToggleAttachment: (id: string | number) => void;
  showAlert: (message: React.ReactNode | string, align?: 'center' | 'left', title?: string | null) => void;
}

export const ManagementView: React.FC<ManagementViewProps> = ({
  events,
  staff,
  departments,
  mngYear,
  setMngYear,
  onSelectEvent,
  onToggleAttachment,
  showAlert
}) => {
  const getStaffInfo = (name: string) => {
    return staff.find(s => s.name === name) || { department: departments[0] || '-', position: '-' };
  };

  const mngStatsData = useMemo(() => {
    const yearEvents = events.filter(e => {
      if (!(e.start instanceof Date) || !(e.end instanceof Date) || isNaN(e.start.getTime()) || isNaN(e.end.getTime())) return false;
      return e.start.getFullYear() === mngYear || e.end.getFullYear() === mngYear;
    });

    // Missing proof documents
    const missingDocs = yearEvents.filter(e => needsAttachment(e.type, e.originalStatus, e.details) && !e.hasAttachment)
      .sort((a, b) => b.start.getTime() - a.start.getTime());

    // Childcare & Maternity Leave
    const childcareEvents = yearEvents.filter(e => e.originalStatus && (e.originalStatus.includes('육아시간') || e.originalStatus.includes('모성보호')));
    const childcareStats: Record<string, { totalMins: number; types: Set<string>; events: (WorkEvent & { clampedMins: number })[]; usedDates: Set<string> }> = {};
    
    childcareEvents.forEach(e => {
      if (!childcareStats[e.name]) {
        childcareStats[e.name] = { totalMins: 0, types: new Set(), events: [], usedDates: new Set() };
      }
      const start = clampDate(e.start, mngYear);
      const end = clampDate(e.end, mngYear);
      if (start > end) return;
      const mins = getDurationMins(start, end);
      childcareStats[e.name].totalMins += mins;
      childcareStats[e.name].types.add(e.originalStatus || e.type);
      childcareStats[e.name].events.push({ ...e, start, end, clampedMins: mins });

      let curD = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endD = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (curD <= endD) {
        childcareStats[e.name].usedDates.add(formatDate(curD));
        curD.setDate(curD.getDate() + 1);
      }
    });

    // Sick leave stats
    const sickLeaveEvents = yearEvents.filter(e => e.type === '병가');
    const sickLeaveStats: Record<string, { totalMins: number; events: (WorkEvent & { clampedMins: number })[] }> = {};
    sickLeaveEvents.forEach(e => {
      if (!sickLeaveStats[e.name]) {
        sickLeaveStats[e.name] = { totalMins: 0, events: [] };
      }
      const start = clampDate(e.start, mngYear);
      const end = clampDate(e.end, mngYear);
      if (start > end) return;
      const mins = getDurationMins(start, end);
      sickLeaveStats[e.name].totalMins += mins;
      sickLeaveStats[e.name].events.push({ ...e, start, end, clampedMins: mins });
    });

    // Long-term leaves
    const longTermLeaves = yearEvents.filter(e => e.originalStatus && e.originalStatus.includes('장기재직'))
      .sort((a, b) => b.start.getTime() - a.start.getTime());

    return { missingDocs, childcareStats, sickLeaveStats, longTermLeaves };
  }, [events, mngYear]);

  const handleShowDetails = (name: string, typeStr: string, eventsList: (WorkEvent & { clampedMins: number })[]) => {
    const sorted = [...eventsList].sort((a, b) => b.start.getTime() - a.start.getTime());

    const detailNode = (
      <div className="space-y-3">
        {sorted.map(e => {
          const dateStr = formatDate(e.start) === formatDate(e.end)
            ? `${formatDate(e.start)} ${formatTime(e.start)}~${formatTime(e.end)}`
            : `${formatDate(e.start)} ${formatTime(e.start)} ~ ${formatDate(e.end)} ${formatTime(e.end)}`;
          const durStr = formatDur(e.clampedMins);
          return (
            <div key={e.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
              <div className="font-bold text-slate-800 text-[15px]">{dateStr}</div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md border text-[12px] font-bold ${TYPE_COLORS[e.type] || 'bg-slate-50'}`}>
                  {e.originalStatus || e.type}
                </span>
                <span className="text-blue-600 font-bold text-sm">[{durStr}]</span>
              </div>
              <div className="text-sm text-slate-600 break-all leading-snug">사유: {e.details || '-'}</div>
            </div>
          );
        })}
      </div>
    );

    if (sorted.length === 0) {
      showAlert("상세 내역이 없습니다.", 'center', `${name} - ${typeStr} 상세내역`);
    } else {
      showAlert(detailNode, 'left', `${name} - ${typeStr} 상세내역`);
    }
  };

  const { missingDocs, childcareStats, sickLeaveStats, longTermLeaves } = mngStatsData;

  return (
    <div className="space-y-5">
      {/* Top Header Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-lg shadow-2xs border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-lg border border-blue-100">
            <i className="fa-solid fa-clipboard-user"></i>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">연간 복무 관리</h3>
            <p className="text-xs text-slate-500">1월 1일 기준 연도별 사용 현황입니다. 이름을 클릭하면 상세 내역을 볼 수 있습니다.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-md border border-slate-200">
            <label className="text-xs font-bold text-slate-600 px-1">연도 선택</label>
            <select
              value={mngYear}
              onChange={e => setMngYear(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
            >
              {[...Array(10)].map((_, i) => {
                const y = new Date().getFullYear() - 5 + i;
                return <option key={y} value={y}>{y}년</option>;
              })}
            </select>
          </div>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
            title="연간 복무 관리 인쇄"
          >
            <i className="fa-solid fa-print text-slate-500 text-xs"></i>
            <span>인쇄</span>
          </button>
        </div>
      </div>

      {/* Grid: Childcare Leave & Sick Leave */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Childcare / Maternity Leave */}
        <div className="bg-white rounded-lg shadow-2xs border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-200 bg-pink-50/50 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-pink-100 text-pink-600 rounded flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-baby"></i>
            </div>
            <h4 className="text-sm font-bold text-slate-900">육아시간 및 모성보호시간</h4>
          </div>
          <div className="p-1 flex-1 overflow-x-auto hide-scrollbar">
            <table className="min-w-full divide-y divide-slate-100 text-xs text-center">
              <thead className="text-[11px] font-bold text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="py-2.5 px-3">소속 및 직위</th>
                  <th className="py-2.5 px-3">성명</th>
                  <th className="py-2.5 px-3">사용 종류</th>
                  <th className="py-2.5 px-3">누계 (1.1 이후) / 사용일수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {Object.keys(childcareStats).length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-slate-400">데이터가 없습니다.</td></tr>
                ) : (
                  Object.keys(childcareStats).sort((a, b) => a.localeCompare(b, 'ko')).map(name => {
                    const info = getStaffInfo(name);
                    const stat = childcareStats[name];
                    return (
                      <tr key={name} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {info.department} <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{info.position}</span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-sm">
                          <button
                            onClick={() => handleShowDetails(name, '육아 및 모성보호', stat.events)}
                            className="text-blue-600 hover:text-blue-800 hover:underline transition-all active:scale-95"
                          >
                            {name}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-pink-50 text-pink-600 border border-pink-200 rounded text-[10px] font-bold">
                            {Array.from(stat.types).join(', ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span>{formatDur(stat.totalMins)}</span>
                            <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 font-bold">
                              ({getMonthsDays(stat.usedDates.size)})
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sick Leave Stats */}
        <div className="bg-white rounded-lg shadow-2xs border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-200 bg-red-50/50 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-100 text-red-600 rounded flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-notes-medical"></i>
            </div>
            <h4 className="text-sm font-bold text-slate-900">개인별 병가 사용 현황</h4>
          </div>
          <div className="p-1 flex-1 overflow-x-auto hide-scrollbar">
            <table className="min-w-full divide-y divide-slate-100 text-xs text-center">
              <thead className="text-[11px] font-bold text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="py-2.5 px-3">소속 및 직위</th>
                  <th className="py-2.5 px-3">성명</th>
                  <th className="py-2.5 px-3">사용 누계 (1.1 이후)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {Object.keys(sickLeaveStats).length === 0 ? (
                  <tr><td colSpan={3} className="py-8 text-slate-400">데이터가 없습니다.</td></tr>
                ) : (
                  Object.keys(sickLeaveStats).sort((a, b) => a.localeCompare(b, 'ko')).map(name => {
                    const info = getStaffInfo(name);
                    const stat = sickLeaveStats[name];
                    const isExceeded = stat.totalMins > 2880;

                    return (
                      <tr
                        key={name}
                        className={`transition-colors ${
                          isExceeded ? 'bg-red-50/80 font-bold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className={`py-2.5 px-3 whitespace-nowrap ${isExceeded ? 'text-red-700' : 'text-slate-500'}`}>
                          {info.department} <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isExceeded ? 'bg-red-100 border-red-300 text-red-800' : 'bg-slate-100 border-slate-200'}`}>
                            {info.position}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-sm">
                          <button
                            onClick={() => handleShowDetails(name, '병가', stat.events)}
                            className={`hover:underline transition-all ${isExceeded ? 'text-red-700' : 'text-blue-600 hover:text-blue-800'}`}
                          >
                            {name}
                          </button>
                        </td>
                        <td className={`py-2.5 px-3 font-bold whitespace-nowrap ${isExceeded ? 'text-red-600' : 'text-slate-800'}`}>
                          {formatDur(stat.totalMins)}
                          {isExceeded && (
                            <span className="ml-1.5 text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold">
                              6일 초과
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Missing Proof Documents Table */}
      <div className="bg-white rounded-lg shadow-2xs border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-3.5 border-b border-slate-200 bg-amber-50/50 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded flex items-center justify-center text-sm font-bold">
            <i className="fa-solid fa-file-circle-exclamation"></i>
          </div>
          <h4 className="text-sm font-bold text-slate-900">
            증빙서류 미제출 현황 <span className="text-xs font-normal text-slate-500 ml-2">(가족돌봄휴가, 경조사휴가, 공가 대상)</span>
          </h4>
        </div>
        <div className="p-1 overflow-x-auto hide-scrollbar">
          <table className="min-w-full divide-y divide-slate-100 text-xs text-center">
            <thead className="text-[11px] font-bold text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="py-2.5 px-3">소속 및 직위</th>
                <th className="py-2.5 px-3">성명</th>
                <th className="py-2.5 px-3">상세 근무상황</th>
                <th className="py-2.5 px-3">사용 기간</th>
                <th className="py-2.5 px-3 text-left">사유 또는 용무</th>
                <th className="py-2.5 px-3">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {missingDocs.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-slate-400">증빙서류 미제출 건이 없습니다.</td></tr>
              ) : (
                missingDocs.map(e => {
                  const info = getStaffInfo(e.name);
                  return (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {info.department} <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{info.position}</span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 text-sm">
                        <button onClick={() => onSelectEvent(e)} className="text-blue-600 hover:text-blue-800 hover:underline">
                          {e.name}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${TYPE_COLORS[e.type]}`}>
                          {e.originalStatus || e.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {formatDate(e.start)} ~ {formatDate(e.end)} <span className="text-slate-400">({getDurationString(e.start, e.end)})</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-left max-w-[200px] truncate">{e.details || '-'}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <button
                          onClick={() => onToggleAttachment(e.id)}
                          className="bg-amber-100 text-amber-800 hover:bg-amber-200 px-2.5 py-1 rounded font-bold text-[11px] transition-all border border-amber-200"
                        >
                          <i className="fa-solid fa-check mr-1"></i>제출 확인
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Long-term Service Leave Table */}
      <div className="bg-white rounded-lg shadow-2xs border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-3.5 border-b border-slate-200 bg-teal-50/50 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-teal-100 text-teal-600 rounded flex items-center justify-center text-sm font-bold">
            <i className="fa-solid fa-plane-departure"></i>
          </div>
          <h4 className="text-sm font-bold text-slate-900">
            장기재직휴가 사용 현황 <span className="text-xs font-normal text-slate-500 ml-2">(조회 연도 기준)</span>
          </h4>
        </div>
        <div className="p-1 overflow-x-auto hide-scrollbar">
          <table className="min-w-full divide-y divide-slate-100 text-xs text-center">
            <thead className="text-[11px] font-bold text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="py-2.5 px-3">소속 및 직위</th>
                <th className="py-2.5 px-3">성명</th>
                <th className="py-2.5 px-3">상세 근무상황</th>
                <th className="py-2.5 px-3">사용 기간</th>
                <th className="py-2.5 px-3 text-left">사유 또는 용무</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {longTermLeaves.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-slate-400">장기재직휴가 사용 내역이 없습니다.</td></tr>
              ) : (
                longTermLeaves.map(e => {
                  const info = getStaffInfo(e.name);
                  return (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {info.department} <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{info.position}</span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 text-sm">
                        <button onClick={() => onSelectEvent(e)} className="text-blue-600 hover:text-blue-800 hover:underline">
                          {e.name}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${TYPE_COLORS[e.type]}`}>
                          {e.originalStatus || e.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap text-center">
                        {formatDate(e.start)} ~ {formatDate(e.end)} <span className="text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 ml-1">({getDurationString(e.start, e.end)})</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-left max-w-[200px] truncate">{e.details || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
