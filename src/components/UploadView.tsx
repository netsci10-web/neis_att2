import React, { useState, useRef } from 'react';
import { Staff, WorkEvent, ParsedCSVRow, ViewMode } from '../types';
import { TYPE_COLORS, normalizePosition, normalizeType, getPositionWeight } from '../utils/constants';
import { formatDate, parseCSVLine, escapeCSV } from '../utils/dateUtils';

interface UploadViewProps {
  staff: Staff[];
  setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
  departments: string[];
  setDepartments: React.Dispatch<React.SetStateAction<string[]>>;
  events: WorkEvent[];
  setEvents: React.Dispatch<React.SetStateAction<WorkEvent[]>>;
  setViewMode: (mode: ViewMode) => void;
  showAlert: (message: React.ReactNode | string, align?: 'center' | 'left', title?: string | null) => void;
  showConfirm: (message: string, onConfirm: () => void) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  staff,
  setStaff,
  departments,
  setDepartments,
  events,
  setEvents,
  setViewMode,
  showAlert,
  showConfirm
}) => {
  const [uploadSubTab, setUploadSubTab] = useState<'daily' | 'period' | 'backup'>('daily');
  const [dailyPreviewData, setDailyPreviewData] = useState<ParsedCSVRow[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const handleClearEvents = () => {
    showConfirm("모든 복무 기록을 완전히 삭제하시겠습니까?\n(인사 설정의 조직도 및 명단은 그대로 유지됩니다.)", () => {
      setEvents([]);
      showAlert("모든 복무 기록이 성공적으로 초기화되었습니다.");
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSyncing(true);
    setSyncMessage('파일 로드 중...');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const rows: string[] = [];
        let row = "";
        let inQuotes = false;
        for (const char of text) {
          if (char === '"') inQuotes = !inQuotes;
          if (char === '\n' && !inQuotes) {
            rows.push(row.trim());
            row = "";
          } else row += char;
        }
        if (row) rows.push(row.trim());
        const lines = rows.filter(l => l.length > 0);
        if (!lines.length) {
          showAlert('파일 내용이 비어있습니다.');
          setIsSyncing(false);
          return;
        }

        const headers = parseCSVLine(lines[0]).map(h => h.replace(/\s/g, ''));

        const isDaily = headers.some(h => h.includes('근무상황'));
        const isPeriod = headers.some(h => h.includes('종별'));

        if ((uploadSubTab === 'daily' && !isDaily) || (uploadSubTab === 'period' && !isPeriod)) {
          showAlert('선택한 탭과 파일 형식이 일치하지 않습니다.');
          setIsSyncing(false);
          return;
        }

        const approvalIdx = headers.findIndex(h => h.includes('승인') || h.includes('결재') || h.includes('상태'));
        const attachIdx = headers.findIndex(h => h.includes('첨부'));

        const parsed: ParsedCSVRow[] = [];

        if (uploadSubTab === 'daily') {
          lines.slice(1).forEach(line => {
            const cur = parseCSVLine(line);
            const obj: Record<string, string> = {};
            headers.forEach((h, idx) => obj[h] = cur[idx] || '');

            const appStatus = approvalIdx !== -1 ? (cur[approvalIdx] || '') : '완결';

            if (obj['성명'] && obj['근무상황'] !== '정상근무' && appStatus.includes('완결')) {
              const name = obj['성명'].trim();
              const existingStaff = staff.find(s => s.name === name);
              const pos = existingStaff ? existingStaff.position : obj['직급/직위/직종'];
              const dept = existingStaff ? existingStaff.department : obj['부서'];

              const attachVal = attachIdx !== -1 ? (cur[attachIdx] || '') : '';
              const hasAttachment = String(attachVal).includes('확인');

              parsed.push({
                name,
                status: obj['근무상황'],
                period: obj['기간'],
                reason: obj['사유'] || '-',
                department: dept,
                position: pos,
                hasAttachment
              });
            }
          });
        } else {
          const nIdx = headers.findIndex(h => h.includes('성명'));
          const pIdx = headers.findIndex(h => h.includes('기간'));
          const tIdx = headers.findIndex(h => h.includes('종별'));
          const rIdx = headers.findIndex(h => h.includes('사유'));
          const dIdx = headers.findIndex(h => h.includes('부서명'));
          const posIdx = headers.findIndex(h => h.includes('직급'));

          lines.slice(1).forEach(line => {
            const cur = parseCSVLine(line);
            const rawN = cur[nIdx] || '';
            const name = rawN.split(/[\r\n(]/)[0].trim();
            const status = cur[tIdx] || '';
            const appStatus = approvalIdx !== -1 ? (cur[approvalIdx] || '') : '완결';

            if (name && status && !status.includes('정상') && appStatus.includes('완결')) {
              const existingStaff = staff.find(s => s.name === name);
              const pos = existingStaff ? existingStaff.position : (cur[posIdx] || '-');
              const dept = existingStaff ? existingStaff.department : (cur[dIdx] || departments[0] || '-');

              const attachVal = attachIdx !== -1 ? (cur[attachIdx] || '') : '';
              const hasAttachment = String(attachVal).includes('확인');

              parsed.push({
                name,
                status,
                period: cur[pIdx],
                reason: cur[rIdx] || '-',
                department: dept,
                position: pos,
                hasAttachment
              });
            }
          });
        }

        setDailyPreviewData(parsed);
        setSyncMessage(`데이터 ${parsed.length}건 준비됨`);
      } catch (e) {
        setSyncMessage('분석 에러');
      } finally {
        setIsSyncing(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleApplyUpdates = () => {
    const existingNames = new Set(staff.map(s => s.name));
    const newOnes: Staff[] = [];
    let updatedDepts = [...departments];

    dailyPreviewData.forEach(p => {
      if (!existingNames.has(p.name)) {
        let targetDept = (p.department && String(p.department).trim() !== '' && p.department !== '-')
          ? String(p.department).trim()
          : updatedDepts[0];

        if (!updatedDepts.includes(targetDept)) {
          updatedDepts.push(targetDept);
        }

        newOnes.push({
          id: (Date.now() + Math.random()).toString(36),
          name: p.name,
          position: normalizePosition(p.position),
          department: targetDept
        });
        existingNames.add(p.name);
      }
    });

    const apply = () => {
      if (updatedDepts.length > departments.length) {
        setDepartments(updatedDepts);
      }

      const robustParse = (str: string) => {
        const m = String(str || '').match(/\d+/g);
        if (m && m.length >= 3) {
          return new Date(Number(m[0]), Number(m[1]) - 1, Number(m[2]), Number(m[3] || 0), Number(m[4] || 0));
        }
        return null;
      };

      const parseRange = (ps: string) => {
        if (!ps) return { start: new Date(), end: new Date() };
        const parts = String(ps).split('~').map(s => s.trim());
        const s = robustParse(parts[0]);
        const e = parts[1] ? robustParse(parts[1]) : s;
        return { start: s || new Date(), end: e || new Date() };
      };

      const newEvents: WorkEvent[] = dailyPreviewData.map((p, i) => {
        const { start, end } = parseRange(p.period);
        const currentStaff = staff.find(s => s.name === p.name) || newOnes.find(s => s.name === p.name);
        const pos = currentStaff ? currentStaff.position : normalizePosition(p.position);

        return {
          id: Date.now() + i + Math.random(),
          name: String(p.name),
          position: String(pos),
          originalStatus: String(p.status),
          type: String(normalizeType(p.status)),
          start,
          end,
          details: String(p.reason),
          hasAttachment: !!p.hasAttachment
        };
      });

      setEvents(prev => {
        let updated = [...prev];
        newEvents.forEach(ne => {
          updated = updated.filter(ex => !(ex.name === ne.name && formatDate(ex.start) === formatDate(ne.start) && ex.type === ne.type));
        });
        return [...updated, ...newEvents];
      });

      setDailyPreviewData([]);
      setSyncMessage('');
      setViewMode('calendar');
    };

    if (newOnes.length > 0) {
      showConfirm(`신규 근무자 ${newOnes.length}명을 명단에 추가하고 복무를 반영하시겠습니까?`, () => {
        const updatedStaff = [...staff, ...newOnes];
        updatedStaff.sort((a, b) => {
          const wA = getPositionWeight(a.position), wB = getPositionWeight(b.position);
          if (wA !== wB) return wA - wB;
          return String(a.name).localeCompare(String(b.name), 'ko');
        });
        setStaff(updatedStaff);
        apply();
      });
    } else {
      apply();
    }
  };

  const handleExportBackup = async () => {
    let csvContent = "\uFEFF";
    csvContent += "Type,V1,V2,V3,V4,V5,V6,V7,V8\n";
    departments.forEach(d => { csvContent += `DEPT,${escapeCSV(d)}\n`; });
    staff.forEach(s => { csvContent += `STAFF,${escapeCSV(s.id)},${escapeCSV(s.department)},${escapeCSV(s.position)},${escapeCSV(s.name)}\n`; });
    
    const safeIso = (d: any) => (d instanceof Date && !isNaN(d.getTime())) ? d.toISOString() : '';
    events.forEach(e => {
      csvContent += `EVENT,${escapeCSV(e.id)},${escapeCSV(e.name)},${escapeCSV(e.title || '')},${escapeCSV(safeIso(e.start))},${escapeCSV(safeIso(e.end))},${escapeCSV(e.type)},${escapeCSV(e.originalStatus || '')},${escapeCSV(e.details || '')},${e.hasAttachment ? 'Y' : 'N'}\n`;
    });

    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + String(now.getSeconds()).padStart(2, '0');
    const defaultFilename = `WorkSync_Backup_${formatDate(now)}_${timeStr}.csv`;

    try {
      if ((window as any).showSaveFilePicker) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: defaultFilename,
          types: [{
            description: 'CSV File',
            accept: { 'text/csv': ['.csv'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
        await writable.close();
        showAlert('지정한 위치에 안전하게 백업되었습니다.');
        return;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.warn('저장 창 열기 실패, 기본 다운로드 방식으로 전환합니다.', err);
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", defaultFilename);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert('앱 전체 데이터가 브라우저의 기본 폴더에 다운로드 되었습니다.');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const rows: string[] = [];
        let row = "";
        let inQuotes = false;
        for (const char of text) {
          if (char === '"') inQuotes = !inQuotes;
          if (char === '\n' && !inQuotes) {
            rows.push(row.trim());
            row = "";
          } else row += char;
        }
        if (row) rows.push(row.trim());

        const newDepts: string[] = [];
        const newStaff: Staff[] = [];
        const newEvents: WorkEvent[] = [];

        rows.forEach(r => {
          if (!r) return;
          const cols = parseCSVLine(r);
          if (cols[0] === 'DEPT') {
            newDepts.push(cols[1]);
          } else if (cols[0] === 'STAFF') {
            newStaff.push({ id: cols[1], department: cols[2], position: normalizePosition(cols[3]), name: cols[4] });
          } else if (cols[0] === 'EVENT') {
            newEvents.push({
              id: cols[1],
              name: cols[2],
              title: cols[3],
              start: cols[4] ? new Date(cols[4]) : new Date(),
              end: cols[5] ? new Date(cols[5]) : new Date(),
              type: cols[6],
              originalStatus: cols[7],
              details: cols[8],
              hasAttachment: cols[9] === 'Y'
            });
          }
        });

        if (newDepts.length > 0 || newStaff.length > 0 || newEvents.length > 0) {
          showConfirm(`백업 파일에서 데이터를 발견했습니다.\n부서: ${newDepts.length}건, 근무자: ${newStaff.length}명, 복무: ${newEvents.length}건\n\n현재 데이터를 모두 지우고 이 데이터로 복원하시겠습니까?`, () => {
            setDepartments(newDepts.length > 0 ? newDepts : ['마산중앙초등학교']);
            newStaff.sort((a, b) => {
              const wA = getPositionWeight(a.position), wB = getPositionWeight(b.position);
              if (wA !== wB) return wA - wB;
              return String(a.name).localeCompare(String(b.name), 'ko');
            });
            setStaff(newStaff);
            setEvents(newEvents);
            showAlert('데이터 복원이 완료되었습니다.');
          });
        } else {
          showAlert('백업 파일에서 유효한 데이터를 찾을 수 없습니다.');
        }
      } catch (err) {
        showAlert('파일 형식이 올바르지 않거나 손상되었습니다.');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <div className="bg-white rounded-lg shadow-2xs border border-slate-200 overflow-hidden">
      {/* Upload View Top Bar */}
      <div className="bg-slate-50 p-4 sm:p-5 border-b border-slate-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center text-lg shadow-2xs">
            <i className="fa-solid fa-file-arrow-up"></i>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">복무 파일 관리</h3>
            <p className="text-xs text-slate-500">결재 완결된 나이스 복무를 분석해 반영합니다.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2.5 w-full xl:w-auto items-center">
          <div className="flex bg-slate-200/60 p-1 rounded-md shrink-0 w-max">
            <button
              onClick={() => { setUploadSubTab('daily'); setDailyPreviewData([]); setSyncMessage(''); }}
              className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded transition-all ${
                uploadSubTab === 'daily' ? 'bg-white shadow-2xs text-blue-600' : 'text-slate-600'
              }`}
            >
              일일 현황
            </button>
            <button
              onClick={() => { setUploadSubTab('period'); setDailyPreviewData([]); setSyncMessage(''); }}
              className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded transition-all ${
                uploadSubTab === 'period' ? 'bg-white shadow-2xs text-blue-600' : 'text-slate-600'
              }`}
            >
              기간별 현황
            </button>
            <button
              onClick={() => { setUploadSubTab('backup'); setDailyPreviewData([]); setSyncMessage(''); }}
              className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded transition-all ${
                uploadSubTab === 'backup' ? 'bg-white shadow-2xs text-blue-600' : 'text-slate-600'
              }`}
            >
              백업/복원
            </button>
          </div>

          <button
            onClick={handleClearEvents}
            className="shrink-0 px-3 py-1.5 bg-white text-red-600 rounded-md font-bold hover:bg-red-50 transition-all text-xs border border-slate-200 flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <i className="fa-solid fa-trash-can text-[10px]"></i>기록 초기화
          </button>
        </div>
      </div>

      {/* Main Upload Zone */}
      {uploadSubTab !== 'backup' ? (
        <div className={`flex flex-col items-center justify-center bg-blue-50/20 border-slate-200 border-dashed m-3 sm:m-4 rounded-lg border-2 ${
          dailyPreviewData.length > 0 ? 'py-3 px-4' : 'py-6 sm:py-8 px-4'
        }`}>
          <p className="text-sm font-bold text-slate-800 mb-1 text-center">
            {uploadSubTab === 'daily' ? '[일일근무상황조회] CSV 파일' : '[기간별복무조회] CSV 파일'}
          </p>

          <div className="text-xs font-medium text-slate-600 mb-3 text-center px-3 py-1.5 bg-white rounded border border-blue-100 shadow-2xs max-w-2xl">
            {uploadSubTab === 'daily' ? (
              <p><i className="fa-solid fa-circle-info mr-1 text-blue-500"></i>나이스 &gt; 기본 메뉴 &gt; 복무 &gt; 일일근무상황조회 (일자 - 조회 - 엑셀내려받기: 부서일일근무상황목록.CSV)</p>
            ) : (
              <p><i className="fa-solid fa-circle-info mr-1 text-blue-500"></i>나이스 &gt; 교감 &gt; 근무상황관리 &gt; 근무상황관리 (기간 - 결재상태 완결 - 조회 - 엑셀내려받기: 근무상황목록.CSV)</p>
            )}
          </div>

          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isSyncing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md font-bold shadow-2xs transition-all active:scale-95 text-xs flex items-center"
            >
              <i className="fa-solid fa-file-arrow-up mr-2"></i>CSV 파일 선택
            </button>
            {syncMessage && (
              <span className="text-xs text-blue-700 font-bold bg-blue-100 px-3 py-1.5 rounded-md border border-blue-200 flex items-center gap-1.5">
                <i className="fa-solid fa-circle-check text-emerald-600"></i>{String(syncMessage)}
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Backup & Restore Zone */
        <div className="p-4 sm:p-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 bg-indigo-50/40 p-6 rounded-lg border border-indigo-100 text-center flex flex-col items-center justify-center">
            <i className="fa-solid fa-cloud-arrow-down text-2xl text-indigo-500 mb-2"></i>
            <h4 className="text-sm font-bold text-slate-800 mb-1">데이터 백업</h4>
            <p className="text-slate-500 mb-4 font-medium text-xs">앱에 저장된 모든 정보를 CSV 파일로 백업합니다.</p>
            <button
              onClick={handleExportBackup}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md font-bold hover:bg-indigo-700 transition-all text-xs w-full max-w-[180px]"
            >
              <i className="fa-solid fa-download mr-1.5"></i>다운로드
            </button>
          </div>

          <div className="flex-1 bg-emerald-50/40 p-6 rounded-lg border border-emerald-100 text-center flex flex-col items-center justify-center">
            <i className="fa-solid fa-cloud-arrow-up text-2xl text-emerald-500 mb-2"></i>
            <h4 className="text-sm font-bold text-slate-800 mb-1">데이터 복원</h4>
            <p className="text-slate-500 mb-4 font-medium text-xs">백업 CSV 파일로 데이터 복원 (기존 데이터 교체)</p>
            <input
              type="file"
              accept=".csv"
              ref={backupFileInputRef}
              className="hidden"
              onChange={handleImportBackup}
            />
            <button
              onClick={() => backupFileInputRef.current?.click()}
              className="bg-emerald-600 text-white px-4 py-2 rounded-md font-bold hover:bg-emerald-700 transition-all text-xs w-full max-w-[180px]"
            >
              <i className="fa-solid fa-upload mr-1.5"></i>파일 선택
            </button>
          </div>
        </div>
      )}

      {/* Preview Table */}
      {uploadSubTab !== 'backup' && dailyPreviewData.length > 0 && (
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/40">
          <div className="flex flex-row justify-between items-center mb-3 gap-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>미리보기 ({dailyPreviewData.length}건)</span>
            </h4>
            <button
              onClick={handleApplyUpdates}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-md font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5 text-xs animate-bounce"
            >
              <i className="fa-solid fa-circle-check"></i>최종 반영
            </button>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-md bg-white hide-scrollbar max-h-[500px] overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2 text-center whitespace-nowrap">성명</th>
                  <th className="px-4 py-2 text-center whitespace-nowrap">종류</th>
                  <th className="px-4 py-2 text-center whitespace-nowrap">기간</th>
                  <th className="px-4 py-2 text-left whitespace-nowrap">사유 또는 용무</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium text-center text-slate-700">
                {dailyPreviewData.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-900 text-xs font-bold whitespace-nowrap">{String(d.name)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${TYPE_COLORS[normalizeType(d.status)] || 'bg-slate-50'}`}>
                        {String(d.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap text-xs">{String(d.period)}</td>
                    <td className="px-4 py-2 text-left max-w-[250px] truncate text-slate-600 font-medium text-xs">{String(d.reason)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
