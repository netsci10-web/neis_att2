import React, { useState, useRef } from 'react';
import { WorkEvent, FilterState } from '../types';
import { WORK_TYPES, TYPE_COLORS } from '../utils/constants';
import { formatDate, formatTime, getDurationMins, formatDur, getDurationString, needsAttachment } from '../utils/dateUtils';
import { callGeminiApi } from '../services/aiService';

interface ListViewProps {
  events: WorkEvent[];
  appliedFilter: FilterState;
  setAppliedFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  onEditEvent: (event: WorkEvent) => void;
  onDeleteEvent: (id: string | number) => void;
  onToggleAttachment: (id: string | number) => void;
  showAlert: (message: React.ReactNode | string, align?: 'center' | 'left', title?: string | null) => void;
  showConfirm: (message: string, onConfirm: () => void) => void;
}

export const ListView: React.FC<ListViewProps> = ({
  events,
  appliedFilter,
  setAppliedFilter,
  onEditEvent,
  onDeleteEvent,
  onToggleAttachment,
  showAlert,
  showConfirm
}) => {
  const [aiReport, setAiReport] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const filteredEvents = events.filter(e => {
    const searchName = (appliedFilter.name || '').trim();
    const matchN = String(e.name || '').includes(searchName);
    const matchT = appliedFilter.type === '전체' || e.type === appliedFilter.type;
    const eventStart = formatDate(e.start);
    const eventEnd = formatDate(e.end);
    const matchD = (!appliedFilter.start || eventEnd >= appliedFilter.start) && (!appliedFilter.end || eventStart <= appliedFilter.end);
    return matchN && matchT && matchD;
  }).sort((a, b) => b.start.getTime() - a.start.getTime());

  const handleSearch = () => {
    const searchType = (document.getElementById('searchType') as HTMLSelectElement)?.value || '전체';
    const searchStart = (document.getElementById('searchStart') as HTMLInputElement)?.value || '';
    const searchEnd = (document.getElementById('searchEnd') as HTMLInputElement)?.value || '';
    
    setAppliedFilter({
      name: nameInputRef.current?.value || '',
      type: searchType,
      start: searchStart,
      end: searchEnd
    });
  };

  const handleResetSearch = () => {
    if (nameInputRef.current) nameInputRef.current.value = '';
    const searchTypeEl = document.getElementById('searchType') as HTMLSelectElement;
    const searchStartEl = document.getElementById('searchStart') as HTMLInputElement;
    const searchEndEl = document.getElementById('searchEnd') as HTMLInputElement;
    if (searchTypeEl) searchTypeEl.value = '전체';
    if (searchStartEl) searchStartEl.value = '';
    if (searchEndEl) searchEndEl.value = '';

    setAppliedFilter({ name: '', type: '전체', start: '', end: '' });
  };

  const generateAiReportFromList = async () => {
    if (!filteredEvents.length) return showAlert("요약할 복무 데이터가 없습니다.");
    setIsAiLoading(true);
    const dataStr = filteredEvents.map(e => `${e.name}: ${e.originalStatus || e.type} (${formatDate(e.start)}) - 사유: ${e.details || '-'}`).join('\n');
    try {
      const res = await callGeminiApi(
        `${dataStr}\n\n위 복무 목록을 바탕으로 학교/기관 행정 부재 현황 요약 리포트를 격식있고 간결하게 작성해줘.`,
        "School Admin Reporting Bot"
      );
      setAiReport(res);
    } catch (e: any) {
      showAlert(`AI 리포트 생성 실패:\n${e.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const renderSummary = () => {
    if (!appliedFilter.name || filteredEvents.length === 0) return null;

    const grouped: Record<string, Record<string, { total: number; subTypes: Record<string, number> }>> = {};
    filteredEvents.forEach(e => {
      if (!grouped[e.name]) grouped[e.name] = {};
      const mins = getDurationMins(e.start, e.end);
      const mainType = e.type;
      const subType = e.originalStatus || e.type;

      if (!grouped[e.name][mainType]) {
        grouped[e.name][mainType] = { total: 0, subTypes: {} };
      }
      grouped[e.name][mainType].total += mins;
      if (!grouped[e.name][mainType].subTypes[subType]) {
        grouped[e.name][mainType].subTypes[subType] = 0;
      }
      grouped[e.name][mainType].subTypes[subType] += mins;
    });

    const sortedNames = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'ko'));

    return (
      <div className="p-6 md:p-8 border-t-2 border-slate-100 bg-slate-50/30 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-xl shadow-inner">
            <i className="fa-solid fa-calculator"></i>
          </div>
          <h4 className="text-xl font-bold text-slate-800">
            <span>검색된 인원 복무 합계</span>
          </h4>
        </div>
        <div className="space-y-6">
          {sortedNames.map(name => (
            <div key={name} className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm animate-in fade-in">
              <h5 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">
                <span>{name}</span>님의 합계
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Object.entries(grouped[name]).map(([type, data]) => (
                  <div key={type} className="flex flex-col bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold border-2 ${TYPE_COLORS[type] || 'bg-slate-50'}`}>
                        {type}
                      </span>
                      <span className="font-bold text-slate-800 text-base">{formatDur(data.total)}</span>
                    </div>
                    {(Object.keys(data.subTypes).length > 1 || Object.keys(data.subTypes)[0] !== type) && (
                      <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col gap-1.5">
                        {Object.entries(data.subTypes).map(([subType, subVal]) => (
                          <div key={subType} className="flex justify-between items-center text-[13px]">
                            <span className="text-slate-500 font-bold before:content-['└'] before:mr-1.5 before:text-slate-300">
                              {subType}
                            </span>
                            <span className="text-slate-600 font-bold">{formatDur(subVal)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Search Filter Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-lg shadow-2xs border border-slate-200 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[150px] space-y-1">
          <label className="text-xs font-bold text-slate-600 ml-0.5"><span>성명</span></label>
          <input
            type="text"
            ref={nameInputRef}
            defaultValue={appliedFilter.name}
            placeholder="성명 검색"
            className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
          />
        </div>

        <div className="w-full sm:w-36 space-y-1">
          <label className="text-xs font-bold text-slate-600 ml-0.5"><span>종류</span></label>
          <select
            id="searchType"
            defaultValue={appliedFilter.type}
            className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
          >
            <option value="전체">전체 보기</option>
            {WORK_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-2 flex-1 min-w-[260px]">
          <div className="flex-1 w-full space-y-1">
            <label className="text-xs font-bold text-slate-600 ml-0.5"><span>시작일</span></label>
            <input
              type="date"
              id="searchStart"
              defaultValue={appliedFilter.start}
              className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
            />
          </div>
          <div className="mb-2 hidden sm:block text-slate-300 font-medium">~</div>
          <div className="flex-1 w-full space-y-1">
            <label className="text-xs font-bold text-slate-600 ml-0.5 opacity-0"><span>종료일</span></label>
            <input
              type="date"
              id="searchEnd"
              defaultValue={appliedFilter.end}
              className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
            />
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleSearch}
            className="flex-1 sm:flex-none px-4 py-1.5 bg-blue-600 text-white rounded-md font-bold hover:bg-blue-700 transition-all shadow-2xs active:scale-95 flex items-center justify-center gap-1.5 text-xs"
          >
            <i className="fa-solid fa-magnifying-glass text-[10px]"></i>
            <span>조회</span>
          </button>
          <button
            onClick={handleResetSearch}
            className="px-3 py-1.5 text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 text-xs font-medium"
            title="초기화"
          >
            <i className="fa-solid fa-rotate-left"></i>
          </button>
        </div>
      </div>

      {/* AI Report Card */}
      {aiReport && (
        <div className="bg-indigo-50/80 border border-indigo-200 rounded-lg p-4 relative group shadow-2xs">
          <div className="flex items-center gap-2 mb-2 font-bold text-xs text-indigo-900">
            <i className="fa-solid fa-brain"></i>
            <span>✨ AI 복무 요약 리포트</span>
          </div>
          <p className="text-xs text-indigo-800 leading-relaxed whitespace-pre-wrap font-medium">{aiReport}</p>
          <button
            onClick={() => setAiReport("")}
            className="absolute top-3 right-3 text-indigo-400 hover:text-indigo-700 p-1"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white rounded-lg shadow-2xs border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-800">
            <span>복무 기록 내역 ({filteredEvents.length}건)</span>
          </h3>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              onClick={() => window.print()}
              className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50 flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95"
              title="목록 인쇄"
            >
              <i className="fa-solid fa-print text-slate-500"></i>
              <span>인쇄</span>
            </button>
            <button
              onClick={generateAiReportFromList}
              disabled={isAiLoading}
              className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-2xs transition-all"
            >
              {isAiLoading ? (
                <i className="fa-solid fa-spinner animate-spin"></i>
              ) : (
                <i className="fa-solid fa-wand-magic-sparkles"></i>
              )}
              <span>AI 요약</span>
            </button>
            <span className="text-[11px] text-slate-400 font-medium">최신순 정렬</span>
          </div>
        </div>

        <div className="overflow-x-auto hide-scrollbar">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 whitespace-nowrap"><span>종류</span></th>
                <th className="px-4 py-2.5 whitespace-nowrap"><span>세부근무상황</span></th>
                <th className="px-4 py-2.5 whitespace-nowrap"><span>성명</span></th>
                <th className="px-4 py-2.5 whitespace-nowrap"><span>기간</span></th>
                <th className="px-4 py-2.5 whitespace-nowrap"><span>일수/시간</span></th>
                <th className="px-4 py-2.5 text-left whitespace-nowrap"><span>사유 또는 용무</span></th>
                <th className="px-4 py-2.5 whitespace-nowrap"><span>증빙서류</span></th>
                <th className="px-4 py-2.5 whitespace-nowrap"><span>관리</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-center text-xs font-medium text-slate-700">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <span>조회된 기록이 없습니다. 상단에서 조회를 눌러주세요.</span>
                  </td>
                </tr>
              ) : (
                filteredEvents.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${TYPE_COLORS[e.type] || 'bg-slate-50'}`}>
                        <span>{String(e.type)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap font-medium">
                      <span>{e.originalStatus || e.type}</span>
                    </td>
                    <td className="px-4 py-2.5 font-bold text-slate-900 text-sm whitespace-nowrap">
                      <span>{String(e.name)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {formatDate(e.start)} {formatTime(e.start)} ~ {formatDate(e.end)} {formatTime(e.end)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap font-semibold">
                      <span>{getDurationString(e.start, e.end)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-left max-w-[200px] truncate text-slate-600">
                      <span>{String(e.details || '-')}</span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {needsAttachment(e.type, e.originalStatus, e.details) ? (
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onToggleAttachment(e.id);
                          }}
                          className={`px-2.5 py-0.5 rounded border text-[10px] font-bold shadow-2xs transition-all active:scale-95 ${
                            e.hasAttachment 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                          }`}
                        >
                          {e.hasAttachment ? '제출' : '미제출'}
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onEditEvent(e)}
                          className="text-slate-400 hover:text-blue-600 p-1 transition-colors"
                          title="수정"
                        >
                          <i className="fa-solid fa-pen text-xs"></i>
                        </button>
                        <button
                          onClick={() => showConfirm(`해당 기록을 삭제할까요?`, () => onDeleteEvent(e.id))}
                          className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                          title="삭제"
                        >
                          <i className="fa-solid fa-trash-can text-xs"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {renderSummary()}
      </div>
    </div>
  );
};
