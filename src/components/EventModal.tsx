import React, { useState } from 'react';
import { WorkEvent } from '../types';
import { WORK_TYPES } from '../utils/constants';
import { needsAttachment } from '../utils/dateUtils';
import { callGeminiApi } from '../services/aiService';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventData: {
    id: string | number | null;
    name: string;
    type: string;
    date: string;
    startTime: string;
    endTime: string;
    details: string;
    hasAttachment: boolean;
    originalStatus: string;
  };
  setEventData: React.Dispatch<React.SetStateAction<{
    id: string | number | null;
    name: string;
    type: string;
    date: string;
    startTime: string;
    endTime: string;
    details: string;
    hasAttachment: boolean;
    originalStatus: string;
  }>>;
  onSubmit: (e: React.FormEvent) => void;
  showAlert: (message: string, align?: 'center' | 'left', title?: string | null) => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  eventData,
  setEventData,
  onSubmit,
  showAlert
}) => {
  const [isAiLoading, setIsAiLoading] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEventData(prev => ({ ...prev, [name]: value }));
  };

  const polishReasonWithAi = async () => {
    if (!eventData.details.trim()) {
      return showAlert("사유를 먼저 입력해 주세요.");
    }
    setIsAiLoading(true);
    try {
      const res = await callGeminiApi(
        `'${eventData.details}' 사유를 나이스 행정용어로 다듬어줘. 결과만 짧게 한 줄로 출력해.`,
        "Formal Korean terms expert for school administration."
      );
      setEventData(prev => ({ ...prev, details: res.replace(/['"]/g, "").trim() }));
    } catch (e: any) {
      showAlert(`AI 교정 실패:\n${e.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-medium bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
        <form onSubmit={onSubmit}>
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-xl flex items-center">
              <i className="fa-solid fa-pen-to-square text-blue-600 mr-3"></i>
              <span>{eventData.id ? '수동 복무 수정' : '수동 복무 등록'}</span>
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 transition-colors p-1"
            >
              <i className="fa-solid fa-xmark text-2xl"></i>
            </button>
          </div>

          <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[70vh] hide-scrollbar font-medium">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 ml-1">성명</label>
              <input
                type="text"
                name="name"
                value={eventData.name}
                onChange={handleInputChange}
                placeholder="이름을 입력하세요"
                required
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-base font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-1">복무 종류</label>
                <select
                  name="type"
                  value={eventData.type}
                  onChange={handleInputChange}
                  className="w-full border border-slate-300 rounded-xl px-3 py-3 text-base font-bold focus:border-blue-500 outline-none bg-white"
                >
                  {WORK_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-1">해당 날짜</label>
                <input
                  type="date"
                  name="date"
                  value={eventData.date}
                  onChange={handleInputChange}
                  className="w-full border border-slate-300 rounded-xl px-3 py-3 text-base font-bold focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-1">시작 시간</label>
                <input
                  type="time"
                  name="startTime"
                  value={eventData.startTime}
                  onChange={handleInputChange}
                  className="w-full border border-slate-300 rounded-xl px-3 py-3 text-base font-bold focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-1">종료 시간</label>
                <input
                  type="time"
                  name="endTime"
                  value={eventData.endTime}
                  onChange={handleInputChange}
                  className="w-full border border-slate-300 rounded-xl px-3 py-3 text-base font-bold focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-slate-500">구체적 사유 및 용무</label>
                <button
                  type="button"
                  onClick={polishReasonWithAi}
                  disabled={isAiLoading}
                  className="text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 border border-indigo-100"
                >
                  {isAiLoading ? (
                    <i className="fa-solid fa-spinner animate-spin"></i>
                  ) : (
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                  )}
                  <span>AI 교정</span>
                </button>
              </div>
              <textarea
                rows={2}
                name="details"
                value={eventData.details}
                onChange={handleInputChange}
                placeholder="사유 또는 용무를 입력하세요"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-base font-bold focus:border-blue-500 outline-none bg-white resize-none"
              />
            </div>

            {needsAttachment(eventData.type, eventData.originalStatus, eventData.details) && (
              <div className="space-y-2 animate-in fade-in">
                <div className="flex items-center gap-3 ml-1 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <input
                    type="checkbox"
                    id="hasAttachment"
                    checked={eventData.hasAttachment}
                    onChange={e => setEventData(prev => ({ ...prev, hasAttachment: e.target.checked }))}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="hasAttachment" className="text-sm font-bold text-slate-700 cursor-pointer">
                    이 복무는 증빙서류 제출이 완료되었습니다.
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-white transition-custom text-sm"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all text-sm active:scale-95"
            >
              {eventData.id ? '수정하기' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
