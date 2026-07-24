import React, { useState } from 'react';
import { Staff } from '../types';
import { normalizePosition, getPositionWeight } from '../utils/constants';

interface SettingsViewProps {
  departments: string[];
  setDepartments: React.Dispatch<React.SetStateAction<string[]>>;
  staff: Staff[];
  setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
  showAlert: (message: React.ReactNode | string, align?: 'center' | 'left', title?: string | null) => void;
  showConfirm: (message: string, onConfirm: () => void) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  departments,
  setDepartments,
  staff,
  setStaff,
  showAlert,
  showConfirm
}) => {
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [newDept, setNewDept] = useState('');
  const [newStaff, setNewStaff] = useState({ name: '', position: '', department: departments[0] || '' });
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editStaffData, setEditStaffData] = useState({ name: '', position: '' });
  const [deptFilters, setDeptFilters] = useState<Record<string, { name: string; position: string }>>({});

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', geminiKey.trim());
    showAlert('Gemini API 키가 성공적으로 저장되었습니다.');
  };

  const handleAddDept = () => {
    const trimmed = newDept.trim();
    if (trimmed && !departments.includes(trimmed)) {
      setDepartments(prev => [...prev, trimmed]);
      setNewDept('');
    }
  };

  const handleDeleteDept = (dept: string) => {
    showConfirm(`부서 '${dept}'를 삭제하시겠습니까? 소속 인원도 함께 삭제됩니다.`, () => {
      setDepartments(prev => prev.filter(d => d !== dept));
      setStaff(prev => prev.filter(s => s.department !== dept));
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
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Gemini API Key Box */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-lg font-bold text-indigo-700 flex items-center gap-2">
            <i className="fa-solid fa-key text-xl"></i>
            <span>Gemini AI API 설정</span>
          </h4>
          <button
            onClick={() => showAlert(
              `✨ Gemini API 가이드\n\n1. Google AI Studio 접속 (ai.studio)\n2. 'Get API key' 클릭\n3. 생성된 키를 여기에 입력하면 맞춤 API 키가 우선 사용됩니다.\n(입력하지 않아도 서버 기본 키가 사용됩니다.)`
            )}
            className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-custom flex items-center gap-1.5"
          >
            <i className="fa-solid fa-circle-info"></i>
            <span>가이드 보기</span>
          </button>
        </div>
        <div className="flex gap-3">
          <input
            type="password"
            value={geminiKey}
            onChange={e => setGeminiKey(e.target.value)}
            placeholder="커스텀 Gemini API Key (선택사항)"
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
          />
          <button
            onClick={handleSaveApiKey}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-custom shadow-md shadow-indigo-100 text-sm"
          >
            <span>저장</span>
          </button>
        </div>
      </div>

      {/* Staff & Department Organization */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/30 gap-4">
          <h3 className="text-2xl font-bold text-slate-800">조직 및 인원 설정</h3>
          <div className="flex gap-3">
            <button
              onClick={() => showConfirm("전체 인원 및 부서 설정을 초기화할까요?", () => {
                setDepartments(['마산중앙초등학교']);
                setStaff([]);
              })}
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
                                onClick={() => setStaff(staff.filter(i => i.id !== s.id))}
                                className="text-slate-400 hover:text-red-500 p-2 transition-custom"
                                title="삭제"
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
    </div>
  );
};
