import React, { useState } from 'react';
import { ViewMode } from '../types';

interface HeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onOpenCreateModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ viewMode, setViewMode, onOpenCreateModal }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: ViewMode; icon: string; label: string }[] = [
    { id: 'calendar', icon: 'fa-calendar-days', label: '근무 달력' },
    { id: 'list', icon: 'fa-list-check', label: '전체 목록' },
    { id: 'organization', icon: 'fa-sitemap', label: '기관 복무 현황' },
    { id: 'management', icon: 'fa-clipboard-user', label: '연간 복무 관리' },
    { id: 'upload', icon: 'fa-file-arrow-up', label: '복무 파일 관리' },
    { id: 'settings', icon: 'fa-sliders', label: '인사 설정' }
  ];

  const handleNavClick = (id: ViewMode) => {
    setViewMode(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Sidebar Navigation for Desktop */}
      <aside className="hidden lg:flex w-60 bg-slate-900 text-slate-300 flex-col border-r border-slate-800 shrink-0 min-h-screen sticky top-0 h-screen overflow-y-auto">
        <div className="p-5 flex items-center justify-between border-b border-slate-800">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => handleNavClick('calendar')}
          >
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-sm shadow">
              K
            </div>
            <div>
              <h1 className="font-bold text-white text-base tracking-tight leading-none">
                WorkSync
              </h1>
              <p className="text-[10px] text-slate-400 font-medium mt-1">기관 복무관리 시스템</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => {
            const isActive = viewMode === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors text-sm font-medium ${
                  isActive 
                    ? 'bg-slate-800 text-white font-bold shadow-sm' 
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <i className={`fa-solid ${item.icon} w-4 text-center text-xs ${isActive ? 'text-blue-400' : 'text-slate-500'}`}></i>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 mt-auto">
          <button
            onClick={onOpenCreateModal}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow transition-all active:scale-95 mb-3"
          >
            <i className="fa-solid fa-plus"></i>
            <span>복무 신청</span>
          </button>
          
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/50">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">System Status</p>
            <p className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              NEIS 연동 정상 가동 중
            </p>
          </div>
        </div>
      </aside>

      {/* Top Bar for Mobile & Tablet */}
      <div className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-40 border-b border-slate-800">
        <div className="flex items-center gap-3" onClick={() => handleNavClick('calendar')}>
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-sm">
            K
          </div>
          <span className="font-bold text-base tracking-tight">WorkSync Pro</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCreateModal}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-md font-bold text-xs flex items-center gap-1"
          >
            <i className="fa-solid fa-plus text-[10px]"></i>
            <span>신청</span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white"
          >
            <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'} text-xl`}></i>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[65px] bg-slate-900/95 text-slate-300 z-50 p-4 flex flex-col space-y-2 border-b border-slate-800 animate-in slide-in-from-top-4 duration-200">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium ${
                viewMode === item.id ? 'bg-slate-800 text-white font-bold' : 'hover:bg-slate-800/50'
              }`}
            >
              <i className={`fa-solid ${item.icon} w-5 text-center ${viewMode === item.id ? 'text-blue-400' : 'text-slate-500'}`}></i>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
};

