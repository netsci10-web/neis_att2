import React, { useMemo } from 'react';
import { Staff, WorkEvent } from '../types';
import { TYPE_COLORS, getPositionWeight } from '../utils/constants';
import { formatDate, formatTime } from '../utils/dateUtils';

interface OrganizationViewProps {
  staff: Staff[];
  events: WorkEvent[];
  departments: string[];
  orgSelectedDate: string;
  setOrgSelectedDate: (dateStr: string) => void;
  orgFilterStatus: string;
  setOrgFilterStatus: (status: string) => void;
  orgSelectedDepts: string[];
  setOrgSelectedDepts: React.Dispatch<React.SetStateAction<string[]>>;
}

export const OrganizationView: React.FC<OrganizationViewProps> = ({
  staff,
  events,
  departments,
  orgSelectedDate,
  setOrgSelectedDate,
  orgFilterStatus,
  setOrgFilterStatus,
  orgSelectedDepts,
  setOrgSelectedDepts
}) => {
  const orgFilteredRecords = useMemo(() => {
    const isEventOnDate = (e: WorkEvent, d: string) => d >= formatDate(e.start) && d <= formatDate(e.end);
    
    const staffMap = new Map<string, Staff>();
    events.forEach(e => {
      if (!staffMap.has(e.name)) {
        staffMap.set(e.name, { id: e.name, name: e.name, department: departments[0] || '기타', position: e.position || '-' });
      }
    });
    staff.forEach(s => staffMap.set(s.name, s));

    const combined = Array.from(staffMap.values())
      .sort((a, b) => {
        const wA = getPositionWeight(a.position);
        const wB = getPositionWeight(b.position);
        if (wA !== wB) return wA - wB;
        return String(a.name).localeCompare(String(b.name), 'ko');
      });

    const records = combined.map(s => {
      const active = events.find(e => e.name === s.name && isEventOnDate(e, orgSelectedDate));
      return active ? {
        ...s,
        status: active.originalStatus || active.type,
        period: `${formatTime(active.start)}~${formatTime(active.end)}`,
        reason: active.details || '-'
      } : {
        ...s,
        status: '정상근무',
        period: '-',
        reason: '-'
      };
    });

    return records.filter(r => {
      const rDept = r.department || departments[0];
      if (departments.length > 1 && orgSelectedDepts.length > 0 && !orgSelectedDepts.includes(rDept)) {
        return false;
      }

      if (orgFilterStatus === '전체') return true;
      if (orgFilterStatus === '정상근무') return r.status === '정상근무';
      if (orgFilterStatus === '부재중') return r.status !== '정상근무';
      return r.status.includes(orgFilterStatus);
    });
  }, [staff, events, departments, orgSelectedDate, orgFilterStatus, orgSelectedDepts]);

  return (
    <div className="space-y-5">
      <div className="bg-white p-4 sm:p-5 rounded-lg shadow-2xs border border-slate-200 flex flex-col gap-4">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="flex items-center gap-3 w-full xl:w-auto">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-lg border border-blue-100">
              <i className="fa-solid fa-sitemap"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">기관 복무 현황</h3>
              <p className="text-xs text-slate-500">조회 일자의 실시간 근무 상태입니다.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-start xl:justify-end">
            <input
              type="date"
              value={orgSelectedDate}
              onChange={e => setOrgSelectedDate(e.target.value)}
              className="border border-slate-200 rounded-md px-3 py-1.5 text-xs font-semibold focus:border-blue-500 outline-none transition-colors shadow-2xs"
            />
            <button
              onClick={() => setOrgFilterStatus('전체')}
              className={`px-3 py-1.5 rounded-md border transition-all text-xs font-bold ${
                orgFilterStatus === '전체'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setOrgFilterStatus('정상근무')}
              className={`px-3 py-1.5 rounded-md border transition-all text-xs font-bold ${
                orgFilterStatus === '정상근무'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              정상근무
            </button>
            <button
              onClick={() => setOrgFilterStatus('부재중')}
              className={`px-3 py-1.5 rounded-md border transition-all text-xs font-bold ${
                orgFilterStatus === '부재중'
                  ? 'bg-orange-500 text-white border-orange-500 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              부재중
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
              title="기관 복무 현황 인쇄"
            >
              <i className="fa-solid fa-print text-slate-500 text-xs"></i>
              <span>인쇄</span>
            </button>
          </div>
        </div>

        {departments.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 text-xs">
            <span className="font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
              부서 필터
            </span>
            {departments.map(dept => (
              <label key={dept} className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={orgSelectedDepts.includes(dept)}
                  onChange={(e) => {
                    if (e.target.checked) setOrgSelectedDepts(prev => [...prev, dept]);
                    else setOrgSelectedDepts(prev => prev.filter(d => d !== dept));
                  }}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="font-bold text-slate-700">{dept}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-2xs border border-slate-200 overflow-hidden overflow-x-auto hide-scrollbar">
        <table className="min-w-full divide-y divide-slate-200 text-xs">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2.5 text-center whitespace-nowrap">소속 및 직위</th>
              <th className="px-4 py-2.5 text-left whitespace-nowrap">성명</th>
              <th className="px-4 py-2.5 text-center whitespace-nowrap">상태</th>
              <th className="px-4 py-2.5 text-center whitespace-nowrap">기간</th>
              <th className="px-4 py-2.5 text-left whitespace-nowrap">비고</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
            {orgFilteredRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                  조건에 맞는 인원이 없습니다.
                </td>
              </tr>
            ) : (
              orgFilteredRecords.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-2.5 whitespace-nowrap text-center">
                    <span className="text-slate-500 font-medium">{r.department || departments[0]}</span>
                    <span className="ml-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 tracking-tight">
                      {String(r.position)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-left">
                    <span className="font-bold text-slate-900 text-sm">{String(r.name)}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${TYPE_COLORS[r.status] || 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                      {String(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-slate-500 whitespace-nowrap">{String(r.period)}</td>
                  <td className="px-4 py-2.5 text-slate-600 max-w-[280px] truncate text-left">{String(r.reason)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
