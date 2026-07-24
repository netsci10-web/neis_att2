import React from 'react';
import { GlobalAlertState, GlobalConfirmState } from '../types';

interface AlertConfirmModalProps {
  alertState: GlobalAlertState;
  onCloseAlert: () => void;
  confirmState: GlobalConfirmState;
  onCloseConfirm: () => void;
}

export const AlertConfirmModal: React.FC<AlertConfirmModalProps> = ({
  alertState,
  onCloseAlert,
  confirmState,
  onCloseConfirm
}) => {
  return (
    <>
      {/* Alert Modal */}
      {alertState.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 font-medium bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center animate-in zoom-in-95 duration-300 relative border border-slate-200">
            {alertState.title ? (
              <div className="flex flex-col items-center mb-6">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 border border-indigo-100">
                  <i className="fa-solid fa-file-lines text-2xl"></i>
                </div>
                <h3 className="text-xl font-bold text-slate-800">{alertState.title}</h3>
              </div>
            ) : (
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-100">
                <i className="fa-solid fa-circle-info text-2xl"></i>
              </div>
            )}
            
            <div className={`bg-slate-50/80 p-5 rounded-2xl border border-slate-100 mb-8 font-medium text-[15px] text-slate-700 leading-relaxed tracking-tight max-h-[60vh] overflow-y-auto hide-scrollbar ${
              alertState.align === 'left' ? 'text-left' : 'text-center'
            }`}>
              {typeof alertState.message === 'string' ? (
                <div className="whitespace-pre-wrap">{alertState.message}</div>
              ) : (
                alertState.message
              )}
            </div>

            <button
              onClick={onCloseAlert}
              className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-slate-800 transition-all text-base active:scale-95 tracking-wide"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 font-medium bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-95 duration-300 relative border border-slate-200">
            <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-100">
              <i className="fa-solid fa-circle-question text-3xl"></i>
            </div>
            
            <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100 mb-8 font-bold text-base text-slate-800 leading-relaxed whitespace-pre-wrap">
              {String(confirmState.message)}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCloseConfirm}
                className="flex-1 bg-white border border-slate-300 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all text-sm active:scale-95"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (confirmState.onConfirm) confirmState.onConfirm();
                  onCloseConfirm();
                }}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all text-sm active:scale-95"
              >
                진행
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
