import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Staff, WorkEvent } from '../types';
import { getPositionWeight } from '../utils/constants';

interface WorkerFilterDropdownProps {
  staff: Staff[];
  events: WorkEvent[];
  isAllSelected: boolean;
  selectedNames: string[];
  onToggleAll: () => void;
  onToggleStaff: (name: string) => void;
  className?: string;
}

export const WorkerFilterDropdown: React.FC<WorkerFilterDropdownProps> = ({
  staff,
  events,
  isAllSelected,
  selectedNames,
  onToggleAll,
  onToggleStaff,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Combine staff list and any additional names found in events
  const allWorkers = useMemo(() => {
    const list: { name: string; position: string; department: string }[] = [];
    const seen = new Set<string>();

    // 1. Add registered staff sorted by position weight then name
    const sortedStaff = [...staff].sort((a, b) => {
      const wA = getPositionWeight(a.position);
      const wB = getPositionWeight(b.position);
      if (wA !== wB) return wA - wB;
      return a.name.localeCompare(b.name, 'ko');
    });

    sortedStaff.forEach(s => {
      if (s.name && !seen.has(s.name)) {
        seen.add(s.name);
        list.push({
          name: s.name,
          position: s.position || '-',
          department: s.department || ''
        });
      }
    });

    // 2. Add any other names from events not in staff list
    events.forEach(e => {
      if (e.name && !seen.has(e.name)) {
        seen.add(e.name);
        list.push({
          name: e.name,
          position: e.position || '-',
          department: '-'
        });
      }
    });

    return list;
  }, [staff, events]);

  // Filter workers by search query
  const filteredWorkers = useMemo(() => {
    if (!searchQuery.trim()) return allWorkers;
    const q = searchQuery.trim().toLowerCase();
    return allWorkers.filter(
      w =>
        w.name.toLowerCase().includes(q) ||
        w.position.toLowerCase().includes(q) ||
        w.department.toLowerCase().includes(q)
    );
  }, [allWorkers, searchQuery]);

  // Summary label for button
  const buttonLabel = useMemo(() => {
    if (isAllSelected || selectedNames.length === 0) {
      return '근무자 선택';
    }
    if (selectedNames.length === 1) {
      return `근무자: ${selectedNames[0]}`;
    }
    return `근무자 (${selectedNames.length}명)`;
  }, [isAllSelected, selectedNames]);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`px-3 py-1.5 rounded-md font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 border ${
          !isAllSelected && selectedNames.length > 0
            ? 'bg-blue-50 border-blue-500 text-blue-700 hover:bg-blue-100'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
        }`}
        title="달력에 표시할 근무자 선택"
      >
        <i className="fa-solid fa-user-check text-[11px] text-blue-600"></i>
        <span>{buttonLabel}</span>
        {!isAllSelected && selectedNames.length > 0 && (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
        )}
        <i
          className={`fa-solid fa-chevron-down text-[9px] text-slate-400 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        ></i>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <i className="fa-solid fa-users text-blue-600"></i>
                근무자 선택
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {isAllSelected
                  ? `전체 ${allWorkers.length}명 표시`
                  : `${selectedNames.length}명 / 총 ${allWorkers.length}명`}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                placeholder="이름, 직위, 부서 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>
          </div>

          {/* First Item: 전체 체크박스 (기본 선택) */}
          <div className="p-2 border-b border-slate-200 bg-slate-50/50">
            <label
              className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors select-none ${
                isAllSelected
                  ? 'bg-blue-50 border border-blue-200 text-blue-900 font-bold'
                  : 'hover:bg-slate-100 text-slate-700 font-semibold'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleAll}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                />
                <span className="text-xs">전체 (모든 근무자)</span>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                {allWorkers.length}명
              </span>
            </label>
          </div>

          {/* Individual Worker List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredWorkers.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                검색된 근무자가 없습니다.
              </div>
            ) : (
              filteredWorkers.map(w => {
                const isChecked = !isAllSelected && selectedNames.includes(w.name);
                return (
                  <label
                    key={w.name}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors select-none ${
                      isChecked
                        ? 'bg-blue-50/70 text-blue-900 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleStaff(w.name)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600 shrink-0"
                      />
                      <span className="text-xs truncate font-semibold text-slate-800">
                        {w.name}
                      </span>
                      {w.position && w.position !== '-' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                          {w.position}
                        </span>
                      )}
                    </div>
                    {w.department && w.department !== '-' && (
                      <span className="text-[10px] text-slate-400 truncate max-w-[100px] shrink-0 text-right ml-2">
                        {w.department}
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onToggleAll}
              className="text-[11px] text-blue-600 hover:text-blue-700 font-bold hover:underline"
            >
              전체 선택 초기화
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-semibold transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
