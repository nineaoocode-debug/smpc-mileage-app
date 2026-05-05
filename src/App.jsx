import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, CheckCircle, AlertCircle, 
  Car, Clock, User, LogOut, FileText, Settings, Play, Square, MapPin,
  TrendingUp, Calendar, Plus, Trash2, KeyRound, Edit, RefreshCw, Download, FileSpreadsheet, Printer,
  ChevronLeft, ChevronRight, Filter, Search, X, ChevronUp, ChevronDown, ChevronsUpDown
} from 'lucide-react';

// --- Configuration ---
// 🚨 นำลิงก์ Web App URL ใหม่มาใส่ตรงนี้
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxjCLNFSGEboCoavjF7rT6gY4_h0OKT4tJkgGQqXXx-3AAK4W4otZ6ijlG1Re4ttZf-/exec"; 

const INITIAL_USERS_DATA = [
  { id: 'u1', username: 'admin', password: 'password', name: 'ผู้ดูแลระบบ', role: 'admin' },
  { id: 'u2', username: 'boonyapoo', password: '1234', name: 'นาย บุญยภู สู้ทุกทิศ (แชมป์)', role: 'employee' }
];

const INITIAL_VEHICLES_DATA = [
  { id: 'v1', plate: '7ขธ-4987 กทม.', type: 'รถจักรยานยนต์ (Honda Wave)', mileage: 0, maxMileage: 100000 }
];

const AppHeader = ({ title, subtitle, showBack, currentUser, onBack, onLogout }) => {
  const [isLogoutExpanded, setIsLogoutExpanded] = useState(false);
  return (
    <div className="bg-blue-600 text-white p-4 shadow-md flex items-center justify-center relative sticky top-0 z-20 min-h-[72px]">
      {showBack && (
        <button onClick={onBack} className="absolute left-3 p-2 bg-blue-700/50 rounded-full hover:bg-blue-700 transition-colors no-print">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}
      <div className="text-center px-14">
        <h1 className="text-xl font-extrabold leading-tight tracking-wide">{title}</h1>
        {subtitle && <p className="text-sm font-medium text-blue-200 mt-1">{subtitle}</p>}
      </div>
      {currentUser && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex justify-end no-print">
          <button onClick={() => isLogoutExpanded ? onLogout() : setIsLogoutExpanded(true)} onBlur={() => setTimeout(() => setIsLogoutExpanded(false), 200)} className={`flex items-center justify-center bg-red-600 text-white rounded-full shadow-md transition-all duration-300 ease-in-out overflow-hidden ${isLogoutExpanded ? 'w-[100px] h-9 px-3' : 'w-9 h-9'}`}>
            <div className="flex items-center justify-center min-w-[max-content]">
              <LogOut size={16} className={isLogoutExpanded ? 'mr-1.5' : ''} />
              <span className={`text-xs font-bold transition-opacity duration-200 ${isLogoutExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>Log out</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('login'); 
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  
  const [appUsers, setAppUsers] = useState(() => { 
      const saved = localStorage.getItem('smpc_users'); 
      try { return saved ? JSON.parse(saved) : INITIAL_USERS_DATA; } catch(e) { localStorage.removeItem('smpc_users'); return INITIAL_USERS_DATA; }
  });
  const [vehicles, setVehicles] = useState(() => { 
      const saved = localStorage.getItem('smpc_vehicles'); 
      try { return saved ? JSON.parse(saved) : INITIAL_VEHICLES_DATA; } catch(e) { localStorage.removeItem('smpc_vehicles'); return INITIAL_VEHICLES_DATA; }
  });
  const [logs, setLogs] = useState(() => { 
      const saved = localStorage.getItem('smpc_logs'); 
      if (saved) {
          try { 
              let parsed = JSON.parse(saved);
              return parsed.map(l => { if (l.photoBase64) { const { photoBase64, ...rest } = l; return rest; } return l; });
          } catch (e) { localStorage.removeItem('smpc_logs'); return []; }
      }
      return []; 
  });
  
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [settingsTab, setSettingsTab] = useState('users'); 

  const [formType, setFormType] = useState('start');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [mileage, setMileage] = useState('');
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [photoBase64, setPhotoBase64] = useState(''); 
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRollover, setIsRollover] = useState(false); // ✅ ฟีเจอร์ไมล์ตีกลับ
  
  const [dashboardDate, setDashboardDate] = useState(new Date());

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterVehicleType, setFilterVehicleType] = useState('');
  const [filterVehiclePlate, setFilterVehiclePlate] = useState('');
  
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });

  const [editUserObj, setEditUserObj] = useState(null);
  const [editVehicleObj, setEditVehicleObj] = useState(null);
  const [editLogObj, setEditLogObj] = useState(null);
  const [globalMessage, setGlobalMessage] = useState(null); 

  const userLogs = currentUser ? logs.filter(l => l.userId === currentUser.id || l.userName === currentUser.name).sort((a, b) => b.timestamp - a.timestamp) : [];
  const latestLog = userLogs.length > 0 ? userLogs[0] : null;
  const isCurrentlyOut = latestLog && latestLog.type === 'start';

  // Silent Sync ตอนเปิดแอป
  useEffect(() => {
    const silentSync = async () => {
       if (GAS_WEB_APP_URL && GAS_WEB_APP_URL !== "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE") {
           try {
               const response = await fetch(`${GAS_WEB_APP_URL}?t=${new Date().getTime()}`);
               const text = await response.text();
               const result = JSON.parse(text);
               if (result && result.status === 'success') {
                   if (result.users && result.users.length > 0) {
                       setAppUsers(result.users.map(u => ({ id: u.id || generateId(), name: u['ชื่อ-สกุล'] || u.name, username: u.Username || u.username, password: u.Password || u.password, role: u['สิทธิ์'] || u.role })));
                   }
                   if (result.vehicles && result.vehicles.length > 0) {
                       // ✅ ดึงลิมิตหน้าปัดมาด้วย
                       setVehicles(result.vehicles.map(v => ({ id: v.id || generateId(), plate: v['ทะเบียนรถ'] || v.plate, type: v['ประเภท'] || v.type, mileage: Number(v['เลขไมล์ล่าสุด'] || v.mileage || 0), maxMileage: Number(v['ลิมิตหน้าปัด'] || v.maxMileage || 100000) })));
                   }
               }
           } catch (e) { console.log('Silent sync failed', e); }
       }
    };
    silentSync();
  }, []);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap'; link.rel = 'stylesheet'; document.head.appendChild(link);
    const style = document.createElement('style');
    style.innerHTML = `* { font-family: 'Kanit', sans-serif !important; } .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } @media print { .no-print { display: none !important; } body { background-color: white !important; } .print-shadow-none { shadow: none !important; border: none !important; } }`;
    document.head.appendChild(style);
    return () => { if (document.head.contains(link)) document.head.removeChild(link); if (document.head.contains(style)) document.head.removeChild(style); };
  }, []);

  const safeSetLocalStorage = (key, value) => { try { localStorage.setItem(key, value); } catch (e) { if (e.name === 'QuotaExceededError') alert('พื้นที่ความจำเต็ม!'); } };
  useEffect(() => { safeSetLocalStorage('smpc_users', JSON.stringify(appUsers)); }, [appUsers]);
  useEffect(() => { safeSetLocalStorage('smpc_vehicles', JSON.stringify(vehicles)); }, [vehicles]);
  useEffect(() => { safeSetLocalStorage('smpc_logs', JSON.stringify(logs)); }, [logs]);

  useEffect(() => {
    try {
      const savedSession = localStorage.getItem('smpc_session');
      if (savedSession) {
        const sessionData = JSON.parse(savedSession);
        const matchedUser = appUsers.find(u => u.username === sessionData.username);
        if (matchedUser) { setCurrentUser(matchedUser); setCurrentScreen(matchedUser.role === 'admin' ? 'admin' : 'dashboard'); }
      }
    } catch (e) {}
    setIsBootstrapping(false);
  }, []); 

  const formatDateToThai = (dateObj) => {
    const d = dateObj.getDate(); const m = dateObj.getMonth() + 1; let y = dateObj.getFullYear();
    if (y < 2500) y += 543;
    const h = String(dateObj.getHours()).padStart(2, '0'); const min = String(dateObj.getMinutes()).padStart(2, '0'); const sec = String(dateObj.getSeconds()).padStart(2, '0');
    return `${d}/${m}/${y} ${h}:${min}:${sec}`;
  };

  const parseDateToTimestamp = (rawDate) => {
    if (!rawDate) return Date.now();
    if (typeof rawDate === 'number') return rawDate;
    let dateStr = String(rawDate).trim();
    if (dateStr.includes('T')) { const t = new Date(dateStr).getTime(); return isNaN(t) ? Date.now() : t; }
    if (dateStr.includes('/')) {
      try {
        const parts = dateStr.split(' '); const datePart = parts[0]; const timePart = parts[1] || "00:00:00";
        const dateSplit = datePart.split('/');
        if (dateSplit.length >= 3) {
          const day = parseInt(dateSplit[0], 10); const month = parseInt(dateSplit[1], 10) - 1; let year = parseInt(dateSplit[2], 10);
          if (year > 2500) year -= 543;
          const timeSplit = timePart.split(':'); const h = parseInt(timeSplit[0] || 0, 10); const m = parseInt(timeSplit[1] || 0, 10); const s = parseInt(timeSplit[2] || 0, 10);
          const finalTime = new Date(year, month, day, h, m, s).getTime(); return isNaN(finalTime) ? Date.now() : finalTime;
        }
      } catch(e) {}
    }
    const fallback = new Date(dateStr).getTime(); return isNaN(fallback) ? Date.now() : fallback;
  };

  const checkWorkPeriod = () => {
    const now = new Date(); const day = now.getDay(); const hour = now.getHours();
    if (day >= 1 && day <= 5 && hour >= 8 && hour < 17) return 'เวลาปกติ'; return 'นอกเวลาปกติ';
  };

  const generateDocNo = () => `DOC-${new Date().getFullYear().toString().slice(2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

  const handleLogin = async () => {
    if (isLoggingIn) return; 
    setLoginError('');
    
    const cleanUser = loginUsername.trim();
    const cleanPass = loginPassword.trim();

    if (!cleanUser || !cleanPass) { setLoginError('กรุณากรอก Username และ Password'); return; }

    setIsLoggingIn(true);
    let matchedUser = appUsers.find(u => u.username === cleanUser && u.password === cleanPass);

    if (matchedUser) {
      setCurrentUser(matchedUser); setCurrentScreen(matchedUser.role === 'admin' ? 'admin' : 'dashboard');
      safeSetLocalStorage('smpc_session', JSON.stringify({ username: matchedUser.username, loggedAt: new Date().getTime() }));
      setIsLoggingIn(false);
    } else {
      if (GAS_WEB_APP_URL && GAS_WEB_APP_URL !== "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE") {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); 
          
          const response = await fetch(`${GAS_WEB_APP_URL}?t=${new Date().getTime()}`, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          const text = await response.text();
          const result = JSON.parse(text);
          
          if (result && result.status === 'success' && result.users) {
            const fetchedUsers = result.users.map(u => ({ id: u.id || generateId(), name: u['ชื่อ-สกุล'] || u.name, username: u.Username || u.username, password: u.Password || u.password, role: u['สิทธิ์'] || u.role }));
            setAppUsers(fetchedUsers);
            
            if (result.vehicles) {
              setVehicles(result.vehicles.map(v => ({ id: v.id || generateId(), plate: v['ทะเบียนรถ'] || v.plate, type: v['ประเภท'] || v.type, mileage: Number(v['เลขไมล์ล่าสุด'] || v.mileage || 0), maxMileage: Number(v['ลิมิตหน้าปัด'] || v.maxMileage || 100000) })));
            }

            matchedUser = fetchedUsers.find(u => u.username === cleanUser && u.password === cleanPass);
            if (matchedUser) {
              setCurrentUser(matchedUser); setCurrentScreen(matchedUser.role === 'admin' ? 'admin' : 'dashboard');
              safeSetLocalStorage('smpc_session', JSON.stringify({ username: matchedUser.username, loggedAt: new Date().getTime() }));
            } else {
              setLoginError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
            }
          } else {
            setLoginError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
          }
        } catch (e) {
          if (e.name === 'AbortError') {
             setLoginError('เซิร์ฟเวอร์ตอบสนองช้าเกินไป (ลองใหม่อีกครั้ง)');
          } else {
             setLoginError('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาเช็คอินเทอร์เน็ต');
          }
        }
      } else {
        setLoginError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => { localStorage.removeItem('smpc_session'); setCurrentUser(null); setCurrentScreen('login'); setLoginUsername(''); setLoginPassword(''); resetForm(); };
  const resetForm = () => { setSelectedVehicle(''); setMileage(''); setPhotoUploaded(false); setPhotoBase64(''); setGlobalMessage(null); setIsRollover(false); };

  const handleOpenForm = (type) => {
    setFormType(type); resetForm();
    if (type === 'end' && latestLog) setSelectedVehicle(latestLog.vehicleId);
    setCurrentScreen('form');
  };

  const syncSettingsToCloud = async (usersToSync, vehiclesToSync) => {
    if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE") return;
    try {
        await fetch(GAS_WEB_APP_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sync_settings', users: usersToSync, vehicles: vehiclesToSync }) });
    } catch (e) { console.error("Cloud Sync Error:", e); }
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(`${GAS_WEB_APP_URL}?t=${new Date().getTime()}`);
      const text = await response.text();
      if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
        setGlobalMessage({ text: 'ดึงข้อมูลไม่สำเร็จ! (ติดสิทธิ์การเข้าถึง)\nกรุณาตั้งค่า "ผู้มีสิทธิ์เข้าถึง" เป็น "ทุกคน (Anyone)"', type: 'info' }); setIsSyncing(false); return;
      }

      const result = JSON.parse(text);
      if (result && result.status === 'success') {
        const logsData = result.logs || result.data || []; 
        if (logsData.length > 0) {
            const formattedLogs = logsData.map(item => {
                const rawDate = item['วัน-เวลา'] || item.dateString || item['วันที่'] || '';
                const timestamp = parseDateToTimestamp(rawDate);
                const finalDateString = formatDateToThai(new Date(timestamp));
                const rawType = item['ประเภท'] || item.type || '';
                const type = (rawType.includes('เข้างาน') || rawType.includes('ออกเดินทาง') || rawType === 'start') ? 'start' : 'end';
                return {
                    id: item.id || generateId(),
                    docNo: item['เลขที่เอกสาร'] || item['รหัสเอกสาร'] || item.docNo || '',
                    userId: item.userId || item['พนักงาน'] || 'unknown',
                    userName: item['พนักงาน'] || item.userName || item['ชื่อ-สกุล'] || 'ไม่ระบุ',
                    type: type,
                    vehiclePlate: item['ทะเบียนรถ'] || item.vehiclePlate || '',
                    mileage: Number(item['เลขไมล์'] || item['เลขไมค์'] || item.mileage || 0),
                    workPeriod: item['ช่วงเวลา'] || item['สถานะเวลา'] || item.workPeriod || 'เวลาปกติ',
                    photoUrl: item['ลิงก์รูปภาพ'] || item.photoUrl || item.photoBase64 || '', 
                    timestamp: timestamp,
                    dateString: finalDateString,
                };
            });
            setLogs(formattedLogs.sort((a, b) => b.timestamp - a.timestamp));
        }
        
        if (result.vehicles && result.vehicles.length > 0) {
            const fetchedVehicles = result.vehicles.map(v => ({ id: v.id || generateId(), plate: v['ทะเบียนรถ'] || v.plate, type: v['ประเภท'] || v.type, mileage: Number(v['เลขไมล์ล่าสุด'] || v.mileage || 0), maxMileage: Number(v['ลิมิตหน้าปัด'] || v.maxMileage || 100000) }));
            setVehicles(fetchedVehicles);
        }
        if (result.users && result.users.length > 0) {
            const fetchedUsers = result.users.map(u => ({ id: u.id || generateId(), name: u['ชื่อ-สกุล'] || u.name, username: u.Username || u.username, password: u.Password || u.password, role: u['สิทธิ์'] || u.role }));
            setAppUsers(fetchedUsers);
        }

        setGlobalMessage({ text: 'ซิงค์ข้อมูลจาก Google Sheet สำเร็จแล้ว!', type: 'info' });
        setDashboardDate(new Date()); 
      } else {
         setGlobalMessage({ text: 'ไม่พบข้อมูลในระบบ', type: 'info' });
      }
    } catch (error) { setGlobalMessage({ text: `เกิดข้อผิดพลาดในการเชื่อมต่อ (CORS Error)`, type: 'info' }); }
    setIsSyncing(false);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas'); const MAX_WIDTH = 1024; const MAX_HEIGHT = 1024;
          let width = img.width; let height = img.height;
          if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
          else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
          canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
          setPhotoBase64(canvas.toDataURL('image/jpeg', 0.7)); setPhotoUploaded(true);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitLog = async () => {
    if (!selectedVehicle) { setGlobalMessage({text: 'กรุณาเลือกยานพาหนะ', type: 'info'}); return; }
    if (!mileage || isNaN(mileage) || Number(mileage) < 0) { setGlobalMessage({text: 'กรุณาระบุเลขไมล์ให้ถูกต้อง', type: 'info'}); return; }
    
    // ✅ แก้ไข: อนุญาตให้เลขไมล์น้อยกว่าตอนเช้าได้ ถ้าผู้ใช้ติ๊ก "ไมล์ตีกลับเป็น 0"
    if (formType === 'end' && latestLog && !isRollover && Number(mileage) <= (latestLog.mileage || 0)) { 
      setGlobalMessage({text: `เลขไมล์ตอนเลิกงานต้องเพิ่มขึ้น\n(ถ้าหน้าปัดตีกลับเป็น 0 ให้ติ๊กเลือกตัวเลือกด้านล่าง)`, type: 'info'}); 
      return; 
    }
    
    if (!photoUploaded || !photoBase64) { setGlobalMessage({text: 'กรุณาแนบรูปหน้าปัดเป็นหลักฐาน', type: 'info'}); return; }

    setIsUploading(true);
    try {
      const docNo = generateDocNo(); const now = new Date();
      // ส่ง isRollover ไปด้วยเพื่อบันทึกหมายเหตุ
      const localPayload = { id: generateId(), docNo, userId: currentUser.id, userName: currentUser.name, type: formType, vehicleId: selectedVehicle, vehiclePlate: vehicles.find(v => v.id === selectedVehicle)?.plate || 'N/A', mileage: Number(mileage), workPeriod: checkWorkPeriod(), timestamp: now.getTime(), dateString: formatDateToThai(now), photoUrl: '', photoBase64: null, isRollover: isRollover };
      
      setLogs([localPayload, ...logs].sort((a, b) => b.timestamp - a.timestamp));
      setVehicles(vehicles.map(v => v.id === selectedVehicle ? { ...v, mileage: Number(mileage) } : v));

      if (GAS_WEB_APP_URL && GAS_WEB_APP_URL !== "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE") {
        try { await fetch(GAS_WEB_APP_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...localPayload, photoBase64 }) }); } catch (e) { }
      }
      setIsUploading(false);
      setGlobalMessage({ text: `บันทึกข้อมูลเรียบร้อยแล้ว\nเลขที่เอกสาร: ${docNo}`, type: 'info', onConfirm: () => { resetForm(); setCurrentScreen('dashboard'); } });
    } catch (error) { setIsUploading(false); setGlobalMessage({text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่', type: 'info'}); }
  };

  const handleAddUser = (e) => {
    e.preventDefault(); const form = e.target; const name = form.emp_name.value; const username = form.emp_username.value; const password = form.emp_password.value; const role = form.emp_role.value;
    if(name && username && password) {
      if(appUsers.some(u => u.username === username)) { setGlobalMessage({ text: 'Username นี้มีอยู่ในระบบแล้ว', type: 'info' }); return; }
      const newUsers = [...appUsers, { id: generateId(), name, username, password, role }];
      setAppUsers(newUsers); syncSettingsToCloud(newUsers, vehicles);
      form.reset(); setGlobalMessage({ text: 'เพิ่มพนักงานเข้าสู่ระบบสำเร็จ', type: 'info' });
    }
  };

  const handleUpdateUser = (e) => {
    e.preventDefault(); const form = e.target;
    const newUsers = appUsers.map(u => u.id === editUserObj.id ? { ...u, name: form.edit_emp_name.value, username: form.edit_emp_username.value, password: form.edit_emp_password.value, role: form.edit_emp_role.value } : u);
    setAppUsers(newUsers); syncSettingsToCloud(newUsers, vehicles);
    setEditUserObj(null); setGlobalMessage({ text: 'อัปเดตข้อมูลผู้ใช้งานสำเร็จ', type: 'info' });
  };

  const handleDeleteUser = (id) => {
    setGlobalMessage({ text: 'คุณแน่ใจหรือไม่ที่จะลบพนักงานคนนี้ออกจากระบบ?', type: 'confirm', onConfirm: () => { const newUsers = appUsers.filter(u => u.id !== id); setAppUsers(newUsers); syncSettingsToCloud(newUsers, vehicles); } });
  };

  const handleAddVehicle = (e) => {
    e.preventDefault(); const form = e.target; const plate = form.plate.value; const type = form.type.value; const maxMileage = Number(form.maxMileage.value) || 100000;
    if(plate && type) {
      const newVehicles = [...vehicles, { id: generateId(), plate, type, mileage: 0, maxMileage }];
      setVehicles(newVehicles); syncSettingsToCloud(appUsers, newVehicles);
      form.reset(); setGlobalMessage({ text: 'เพิ่มยานพาหนะสำเร็จ', type: 'info' });
    }
  };

  const handleUpdateVehicle = (e) => {
    e.preventDefault(); const form = e.target;
    const newVehicles = vehicles.map(v => v.id === editVehicleObj.id ? { ...v, plate: form.edit_plate.value, type: form.edit_type.value, mileage: Number(form.edit_vehicle_mileage.value), maxMileage: Number(form.edit_maxMileage.value) } : v);
    setVehicles(newVehicles); syncSettingsToCloud(appUsers, newVehicles);
    setEditVehicleObj(null); setGlobalMessage({ text: 'อัปเดตข้อมูลยานพาหนะสำเร็จ', type: 'info' });
  };

  const handleDeleteVehicle = (id) => {
    setGlobalMessage({ text: 'คุณแน่ใจหรือไม่ที่จะลบยานพาหนะคันนี้?', type: 'confirm', onConfirm: () => { const newVehicles = vehicles.filter(v => v.id !== id); setVehicles(newVehicles); syncSettingsToCloud(appUsers, newVehicles); } });
  };

  const handleUpdateLogMileage = async (e) => {
    e.preventDefault(); const newMileage = Number(e.target.edit_log_mileage.value); if (isNaN(newMileage)) return;
    try {
      setLogs(logs.map(l => l.id === editLogObj.id ? { ...l, mileage: newMileage } : l));
      if (GAS_WEB_APP_URL && GAS_WEB_APP_URL !== "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE") {
        try { await fetch(GAS_WEB_APP_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_log', docNo: editLogObj.docNo, mileage: newMileage }) }); } catch (e) { }
      }
      setEditLogObj(null); setGlobalMessage({ text: 'อัปเดตเลขไมล์สำเร็จ\n(ระบบส่งข้อมูลไปอัปเดตใน Google Sheet แล้ว)', type: 'info' });
    } catch (err) { setGlobalMessage({ text: 'เกิดข้อผิดพลาดในการอัปเดตเลขไมล์', type: 'info' }); }
  };

  const ModalOverlay = () => {
    if (!globalMessage) return null;
    return (
      <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-[100] p-4 backdrop-blur-sm no-print">
         <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-xs text-center border-t-8 border-blue-600">
            {globalMessage.type === 'confirm' ? <AlertCircle size={48} className="mx-auto text-orange-500 mb-4" /> : <CheckCircle size={48} className="mx-auto text-blue-600 mb-4" />}
            <p className="font-bold text-gray-800 mb-6 whitespace-pre-line text-lg">{globalMessage.text}</p>
            <div className="flex gap-3">
              {globalMessage.type === 'confirm' && <button onClick={() => setGlobalMessage(null)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200">ยกเลิก</button>}
              <button onClick={() => { if(globalMessage.onConfirm) globalMessage.onConfirm(); setGlobalMessage(null); }} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md">ตกลง</button>
            </div>
         </div>
      </div>
    );
  };

  const renderScreen = () => {
    if (currentScreen === 'login') {
      if (isBootstrapping) return <div className="h-screen bg-gray-100 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div></div>;
      return (
        <div className="h-screen overflow-y-auto no-scrollbar bg-gray-100 flex flex-col items-center justify-center p-4 relative">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden border border-gray-100 my-auto">
            <div className="p-8 pb-6 text-center bg-blue-900">
              <img src="/logo.png" alt="SMPC Logo" className="h-28 mx-auto mb-4 object-contain drop-shadow-md" onError={(e) => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=SMPC&background=1e3a8a&color=fff&size=150&rounded=true&bold=true"; }} />
              <h1 className="text-3xl font-extrabold text-white mb-1 leading-tight tracking-wide">ระบบบันทึกระยะทาง</h1>
              <h2 className="text-xl font-bold text-blue-200">SMPC Mileage Program</h2>
            </div>
            <div className="p-8 pt-6 bg-gradient-to-b from-blue-800 via-blue-600 to-blue-400 flex-1">
              <div className="space-y-4">
                <p className="text-lg font-extrabold text-center text-white border-b-2 border-white/30 pb-2 drop-shadow-sm flex items-center justify-center gap-2"><KeyRound size={20} />เข้าสู่ระบบ</p>
                <p className="text-sm text-blue-100 font-medium leading-relaxed text-center">* ชื่อผู้ใช้งานเป็นภาษาอังกฤษเท่านั้น</p>
                <div className="space-y-4 mt-4">
                  <input type="text" placeholder="ชื่อผู้ใช้งาน (Username)" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" className="w-full px-5 py-4 rounded-xl border-none outline-none font-bold text-blue-900 focus:ring-4 focus:ring-blue-300 shadow-inner" />
                  <input type="password" placeholder="รหัสผ่าน (Password)" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} autoCapitalize="none" autoCorrect="off" className="w-full px-5 py-4 rounded-xl border-none outline-none font-bold text-blue-900 focus:ring-4 focus:ring-blue-300 shadow-inner" />
                </div>
                {loginError && <div className="flex items-center justify-center gap-1 mt-2 text-red-200 bg-red-900/40 p-3 rounded-lg"><AlertCircle size={16} /><p className="text-sm font-bold">{loginError}</p></div>}
                <button onClick={handleLogin} disabled={isLoggingIn} className={`w-full mt-6 py-4 rounded-xl font-extrabold text-xl text-white border-b-4 shadow-lg transition-all flex items-center justify-center gap-2 ${isLoggingIn ? 'bg-blue-400 border-blue-500 cursor-not-allowed translate-y-1 border-b-0' : 'bg-blue-900 border-black/30 hover:bg-blue-800 active:translate-y-1 active:border-b-0'}`}>
                  {isLoggingIn ? <><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>กำลังตรวจสอบ...</> : 'เข้าสู่ระบบ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (currentScreen === 'dashboard') {
      const trips = []; let tempStart = null;
      [...userLogs].reverse().forEach(log => {
        if (log.type === 'start') tempStart = log;
        else if (log.type === 'end' && tempStart) { trips.push({ start: tempStart, end: log, distance: (log.mileage || 0) - (tempStart.mileage || 0), dateString: (log.dateString || '').split(' ')[0] }); tempStart = null; }
      });

      const todayStr = formatDateToThai(new Date()).split(' ')[0];
      const todayTrips = trips.filter(t => t.dateString === todayStr);
      // คำนวณระยะทางวันนี้ใหม่ แบบเผื่อมีไมล์ตีกลับ (ถึงแม้ user ธรรมดาจะไม่ได้โชว์แบบ Admin แต่ถ้าอยากให้เป๊ะ ก็ควรดึง logic มา)
      let todayDistance = 0;
      todayTrips.forEach(t => {
         let dist = 0;
         if (t.end.mileage < t.start.mileage) {
             const v = vehicles.find(v => v.plate === t.start.vehiclePlate);
             const maxM = v ? (v.maxMileage || 100000) : 100000;
             dist = (maxM - t.start.mileage) + t.end.mileage;
         } else {
             dist = t.end.mileage - t.start.mileage;
         }
         todayDistance += dist;
      });
      
      let totalDistanceAllTime = 0;
      trips.forEach(t => {
         let dist = 0;
         if (t.end.mileage < t.start.mileage) {
             const v = vehicles.find(v => v.plate === t.start.vehiclePlate);
             const maxM = v ? (v.maxMileage || 100000) : 100000;
             dist = (maxM - t.start.mileage) + t.end.mileage;
         } else {
             dist = t.end.mileage - t.start.mileage;
         }
         totalDistanceAllTime += dist;
      });

      return (
        <div className="h-screen overflow-y-auto no-scrollbar bg-gray-50 max-w-md mx-auto shadow-xl relative pb-20">
          <AppHeader title="ระบบบันทึกระยะทาง" subtitle="SMPC Mileage Program" currentUser={currentUser} onLogout={handleLogout} />
          <div className="p-5">
            <div className="bg-white rounded-3xl shadow-md border-2 border-blue-100 p-6 mb-6 flex items-center gap-5">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-inner"><User size={32} /></div>
              <div className="flex-1">
                <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">{currentUser.name}</h2>
                <p className="text-base text-gray-500 flex items-center gap-2 mt-1"><Clock size={16} /> สถานะ: {isCurrentlyOut ? <span className="text-orange-500 font-bold">เข้างานแล้ว</span> : <span className="text-green-500 font-bold">เลิกงานแล้ว</span>}</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-lg p-5 mb-6 text-white flex items-center justify-between">
              <div><p className="text-blue-100 text-sm font-medium mb-1">ระยะทางที่วิ่งรวมวันนี้</p><div className="flex items-baseline gap-2"><span className="text-5xl font-extrabold text-yellow-300">{todayDistance.toLocaleString()}</span><span className="text-blue-200">กม.</span></div></div>
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center"><TrendingUp size={28} className="text-white" /></div>
            </div>

            <div className="space-y-5">
              <button onClick={() => handleOpenForm('start')} disabled={isCurrentlyOut} className={`w-full py-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-200 ${isCurrentlyOut ? 'bg-gray-100 border-b-4 border-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-green-500 border-b-4 border-green-700 text-white shadow-xl hover:bg-green-600 active:border-b-0 active:translate-y-1'}`}>
                <Play size={40} /><span className="font-extrabold text-2xl tracking-wide">บันทึก "เลขไมล์เข้างาน"</span>
              </button>
              <button onClick={() => handleOpenForm('end')} disabled={!isCurrentlyOut} className={`w-full py-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-200 ${!isCurrentlyOut ? 'bg-gray-100 border-b-4 border-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-orange-500 border-b-4 border-orange-700 text-white shadow-xl hover:bg-orange-600 active:border-b-0 active:translate-y-1'}`}>
                <Square size={40} /><span className="font-extrabold text-2xl tracking-wide">บันทึก "เลขไมล์เลิกงาน"</span>
              </button>
            </div>

            <div className="mt-8 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4 bg-blue-100 p-3 rounded-xl border border-blue-200"><Calendar size={20} className="text-blue-800" /><h3 className="font-bold text-blue-900">ภาพรวมการเดินทางของคุณ</h3></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center p-3 bg-blue-50 rounded-xl"><span className="text-2xl font-bold text-blue-700">{trips.length}</span><span className="text-xs text-blue-600 font-medium">ทริปทั้งหมด</span></div>
                <div className="flex flex-col items-center justify-center p-3 bg-green-50 rounded-xl"><span className="text-2xl font-bold text-green-700">{totalDistanceAllTime.toLocaleString()}</span><span className="text-xs text-green-600 font-medium">กม. รวมทั้งหมด</span></div>
              </div>
            </div>
            
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4 bg-blue-100 p-3 rounded-xl border border-blue-200"><Clock size={20} className="text-blue-800" /><h3 className="font-bold text-blue-900">ประวัติล่าสุดของคุณ</h3></div>
              <div className="space-y-3">
                {userLogs.slice(0, 3).map((log, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 text-sm">
                    <div className="flex justify-between items-center mb-2"><span className={`font-bold px-2 py-1 rounded text-xs ${log.type === 'start' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{log.type === 'start' ? 'เข้างาน' : 'เลิกงาน'}</span><span className="text-gray-500">{log.docNo}</span></div>
                    <p className="text-gray-800">เวลา: {log.dateString}</p><p className="text-gray-600">ทะเบียน: {log.vehiclePlate} | ไมล์: {(log.mileage || 0).toLocaleString()}</p>
                  </div>
                ))}
                {userLogs.length === 0 && <p className="text-gray-400 text-center py-4">ยังไม่มีประวัติการเดินทาง</p>}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (currentScreen === 'form') {
      const isStart = formType === 'start'; const currentTimePeriod = checkWorkPeriod(); const isOT = currentTimePeriod !== 'เวลาปกติ';
      return (
        <div className="h-screen overflow-y-auto no-scrollbar bg-gray-50 max-w-md mx-auto shadow-xl pb-20">
          <AppHeader title={isStart ? 'บันทึกเลขไมล์เข้างาน' : 'บันทึกเลขไมล์เลิกงาน'} showBack={true} currentUser={currentUser} onBack={() => setCurrentScreen('dashboard')} onLogout={handleLogout} />
          <div className="p-5 space-y-5">
            <div className={`p-4 rounded-xl flex items-center gap-3 ${isOT ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 'bg-blue-50 text-blue-800 border border-blue-100'}`}>
              <Clock size={24} /><div><p className="font-bold text-sm">เวลาบันทึกอัตโนมัติ: {new Date().toLocaleTimeString('th-TH')}</p><p className="text-xs">สถานะช่วงเวลา: <strong>{currentTimePeriod}</strong></p></div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">เลือกยานพาหนะ</label>
                <select value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)} disabled={!isStart} className={`w-full border border-gray-300 rounded-xl p-3 outline-none ${!isStart ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-50 focus:ring-2 focus:ring-blue-500'}`}>
                  <option value="">-- เลือกทะเบียนรถ --</option>{vehicles.map(v => (<option key={v.id} value={v.id}>{v.plate} ({v.type})</option>))}
                </select>
                {!isStart && <p className="text-xs text-orange-600 mt-1">* ระบบล็อกทะเบียนรถให้ตรงกับตอนเข้างานอัตโนมัติ</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">เลขหน้าปัดไมล์ (กม.)</label>
                <input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="เช่น 12500" className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none text-lg" />
                {/* ✅ ฟีเจอร์ไมล์ตีกลับเป็น 0 */}
                {!isStart && (
                  <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 border border-red-100 rounded-xl transition-all">
                    <input type="checkbox" id="rollover" checked={isRollover} onChange={e => setIsRollover(e.target.checked)} className="w-5 h-5 accent-red-600 rounded cursor-pointer" />
                    <label htmlFor="rollover" className="text-sm font-bold text-red-700 cursor-pointer select-none">ไมล์หน้าปัดตีกลับเป็น 0 (Odometer Rollover)</label>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">รูปถ่ายหน้าปัดรถยนต์/มอเตอร์ไซค์</label>
                {!photoUploaded ? (
                  <label className="w-full h-32 border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer">
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} onClick={(e) => { e.target.value = null }} className="sr-only" /><Camera size={32} /><span className="font-semibold text-sm">แตะเพื่อเปิดกล้อง / แนบรูปภาพ</span>
                  </label>
                ) : (
                  <div className="w-full p-4 bg-green-50 border border-green-200 rounded-xl flex flex-col items-center justify-center text-green-700 gap-3">
                    <div className="flex items-center gap-2 w-full justify-between"><div className="flex items-center gap-2"><CheckCircle size={20} /><span className="font-semibold text-sm">อัปโหลดรูปสำเร็จ</span></div>
                      <label className="text-xs underline font-bold text-blue-600 cursor-pointer m-0 p-0">ถ่ายใหม่<input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} onClick={(e) => { e.target.value = null }} className="sr-only" /></label>
                    </div>
                    {photoBase64 && <img src={photoBase64} alt="Preview" className="w-full h-32 object-cover rounded-lg shadow-sm border border-green-300" />}
                  </div>
                )}
              </div>
            </div>
            <button onClick={handleSubmitLog} disabled={isUploading} className={`w-full py-5 rounded-2xl font-extrabold text-white text-xl tracking-wide transition-all duration-200 mt-4 flex items-center justify-center gap-2 ${isUploading ? 'bg-gray-400 cursor-not-allowed shadow-none border-b-0 translate-y-1' : isStart ? 'bg-green-600 border-b-4 border-green-800 shadow-xl hover:bg-green-700 active:border-b-0 active:translate-y-1' : 'bg-orange-600 border-b-4 border-orange-800 shadow-xl hover:bg-orange-700 active:border-b-0 active:translate-y-1'}`}>
              {isUploading ? <><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>กำลังส่งข้อมูล...</> : (isStart ? 'ยืนยันเลขไมล์เข้างาน' : 'ยืนยันเลขไมล์เลิกงาน')}
            </button>
          </div>
        </div>
      );
    }

    if (currentScreen === 'admin') {
      const changeDashboardDate = (days) => { const newDate = new Date(dashboardDate); newDate.setDate(newDate.getDate() + days); setDashboardDate(newDate); };
      const targetDateStr = formatDateToThai(dashboardDate).split(' ')[0];
      const isTodayStr = formatDateToThai(new Date()).split(' ')[0];
      const isToday = targetDateStr === isTodayStr;
      
      const activeEmployees = appUsers.filter(u => u.role === 'employee').map(emp => { 
        const empLogs = logs.filter(l => l.userId === emp.id || l.userName === emp.name).sort((a,b) => b.timestamp - a.timestamp); 
        return { ...emp, isOut: empLogs[0] && empLogs[0].type === 'start' }; 
      });
      const currentlyOutCount = activeEmployees.filter(e => e.isOut).length;

      const userStats = {};
      let totalDistanceTargetDay = 0;
      
      [...logs].sort((a, b) => a.timestamp - b.timestamp).forEach(log => {
        if (log.dateString.split(' ')[0] !== targetDateStr) return; 
        
        const uid = log.userName; 
        if (!userStats[uid]) { 
            userStats[uid] = { userName: log.userName, distance: 0, startMileage: null, endMileage: null, breakdown: {}, tempStart: null }; 
        }
        
        if (log.type === 'start') {
            userStats[uid].startMileage = userStats[uid].startMileage !== null ? Math.min(userStats[uid].startMileage, log.mileage) : log.mileage;
            userStats[uid].tempStart = log;
        } else if (log.type === 'end') {
            userStats[uid].endMileage = userStats[uid].endMileage !== null ? Math.max(userStats[uid].endMileage, log.mileage) : log.mileage;
            if (userStats[uid].tempStart) {
                // ✅ แก้ไขสูตรคำนวณ: ถ้ารถไมล์ตีกลับเป็น 0 (เลขตอนเย็น น้อยกว่า ตอนเช้า)
                let startMil = userStats[uid].tempStart.mileage;
                let endMil = log.mileage;
                let dist = 0;

                if (endMil < startMil) {
                    // ดึงลิมิตหน้าปัดของรถคันนั้นมาลบ ถ้าหาไม่เจอให้เหมาเป็น 1 แสน
                    const v = vehicles.find(v => v.plate === log.vehiclePlate);
                    const maxM = v ? (v.maxMileage || 100000) : 100000;
                    dist = (maxM - startMil) + endMil;
                } else {
                    dist = endMil - startMil;
                }

                if (dist > 0) {
                    userStats[uid].distance += dist;
                    totalDistanceTargetDay += dist;
                    const vTypeRaw = vehicles.find(v => v.plate === log.vehiclePlate)?.type || '';
                    let vType = 'รถยนต์'; if (vTypeRaw.includes('จักรยาน') || vTypeRaw.includes('มอเตอร์ไซค์')) vType = 'มอเตอร์ไซค์'; else if (vTypeRaw.includes('บรรทุก')) vType = 'รถบรรทุก';
                    userStats[uid].breakdown[vType] = (userStats[uid].breakdown[vType] || 0) + dist;
                }
                userStats[uid].tempStart = null;
            }
        }
      });
      const userStatsArray = Object.values(userStats).sort((a, b) => b.distance - a.distance);
      
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
      let conicGradientStr = totalDistanceTargetDay > 0 ? userStatsArray.map((stat, idx) => { const percent = (stat.distance / totalDistanceTargetDay) * 100; const start = arguments[2] || 0; arguments[2] = start + percent; return `${colors[idx % colors.length]} ${start}% ${arguments[2]}%`; }).join(', ') : '#e5e7eb 0% 100%';

      return (
        <div className="h-screen overflow-y-auto no-scrollbar bg-gray-50 max-w-4xl mx-auto shadow-xl pb-20">
          <AppHeader title="ส่วนจัดการ" subtitle="(ผู้ตรวจสอบ)" currentUser={currentUser} onLogout={handleLogout} />
          <div className="p-6">
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button onClick={() => setCurrentScreen('reports')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 transition-colors"><div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><FileText size={24} /></div><span className="font-bold text-xs text-gray-800 text-center">รายงาน</span></button>
              <button onClick={() => setCurrentScreen('settings')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center gap-2 hover:bg-purple-50 transition-colors"><div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center"><Settings size={24} /></div><span className="font-bold text-xs text-gray-800 text-center">ตั้งค่าระบบ</span></button>
              <button onClick={handleSyncData} disabled={isSyncing} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center gap-2 hover:bg-green-50 transition-colors"><div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">{isSyncing ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div> : <RefreshCw size={24} />}</div><span className="font-bold text-xs text-gray-800 text-center">ดึงข้อมูลล่าสุด</span></button>
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3"><TrendingUp size={28} className="text-blue-600"/> สถิติการเดินทาง</h2>
              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl shadow-sm self-start">
                <button onClick={() => changeDashboardDate(-1)} className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-l-xl transition-colors"><ChevronLeft size={22} /></button>
                <div className="px-4 font-bold text-blue-900 min-w-[120px] text-center text-sm">{isToday ? `วันนี้ (${targetDateStr})` : targetDateStr}</div>
                <button onClick={() => changeDashboardDate(1)} disabled={isToday} className={`p-2.5 transition-colors rounded-r-xl ${isToday ? 'text-gray-200 cursor-not-allowed' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`}><ChevronRight size={22} /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-5 rounded-2xl shadow-md text-white flex flex-col justify-center items-center text-center"><span className="text-sm font-medium text-blue-100 mb-1">ระยะทางรวมที่เลือก</span><div className="flex items-baseline gap-2"><span className="text-6xl font-extrabold text-yellow-400 drop-shadow-md">{totalDistanceTargetDay.toLocaleString()}</span><span className="text-lg font-bold text-yellow-200">กม.</span></div></div>
              <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm flex flex-col justify-center items-center text-center"><span className="text-sm font-bold text-gray-500 mb-1">พนักงานกำลังเดินทาง</span><div className="flex items-baseline gap-1 text-orange-500"><span className="text-6xl font-extrabold">{currentlyOutCount}</span><span className="text-lg font-bold">คน</span></div></div>
            </div>
            {totalDistanceTargetDay > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6 flex flex-col items-center gap-8">
                <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full flex-shrink-0 shadow-inner" style={{ background: `conic-gradient(${conicGradientStr})`}}><div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center shadow-sm"><Car size={36} className="text-gray-400" /></div></div>
                <div className="w-full flex flex-col gap-3">
                   {userStatsArray.map((stat, idx) => (
                     <div key={idx} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${idx % 2 === 0 ? 'bg-gray-50 border-gray-100' : 'bg-gray-100 border-gray-200'}`}>
                        <div className="flex items-center gap-3 truncate"><span className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: colors[idx % colors.length] }}></span><span className="font-extrabold text-xl md:text-2xl text-gray-800 truncate">{stat.userName.split(' ')[1] || stat.userName}</span></div>
                        <span className="font-extrabold text-xl md:text-2xl text-gray-900">{stat.distance} <span className="text-sm md:text-base text-gray-500 font-medium">กม.</span></span>
                     </div>
                   ))}
                </div>
              </div>
            )}
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-5 mt-8 flex items-center gap-3"><User size={28} className="text-blue-600"/> สรุประยะทางรายบุคคล ({isToday ? 'วันนี้' : targetDateStr})</h2>
            <div className="space-y-4">
              {userStatsArray.length === 0 ? (<div className="bg-gray-50 border border-gray-200 p-8 rounded-2xl text-center text-gray-400 font-medium flex flex-col items-center gap-2"><Calendar size={32} className="text-gray-300" />ไม่มีข้อมูลการเดินทางในวันที่เลือก</div>) : (
                userStatsArray.map((stat, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-3xl shadow-md border-2 border-blue-50 flex flex-col gap-4 transition-all hover:shadow-lg">
                    <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-inner flex-shrink-0"><User size={24} /></div>
                      <div className="flex-1"><h3 className="font-extrabold text-gray-800 text-lg leading-tight">{stat.userName}</h3></div>
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-2 rounded-full text-xl font-extrabold shadow-md whitespace-nowrap border border-orange-400">{stat.distance} <span className="text-sm font-medium">กม.</span></div>
                    </div>
                    {Object.keys(stat.breakdown).length > 0 && (
                        <div className="flex flex-col gap-2">{Object.entries(stat.breakdown).map(([type, dist]) => (<div key={type} className="flex justify-between items-center text-sm text-gray-700 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100"><span className="flex items-center gap-2 font-bold">{type === 'มอเตอร์ไซค์' ? '🏍️' : (type === 'รถบรรทุก' ? '🚚' : '🚗')} {type}</span><span className="font-extrabold text-blue-700 text-xl">{dist} <span className="text-sm text-gray-500 font-medium">กม.</span></span></div>))}</div>
                    )}
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-2xl border border-blue-100">
                         <span className="text-sm text-blue-600 font-bold mb-1">ไมล์แรกเข้างาน</span>
                         <span className="text-3xl md:text-4xl font-extrabold text-blue-800 font-mono tracking-tight">{stat.startMileage !== null ? stat.startMileage.toLocaleString() : '-'}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-4 bg-orange-50 rounded-2xl border border-orange-100">
                         <span className="text-sm text-orange-600 font-bold mb-1">ไมล์เลิกงานล่าสุด</span>
                         <span className="text-3xl md:text-4xl font-extrabold text-orange-800 font-mono tracking-tight">{stat.endMileage !== null ? stat.endMileage.toLocaleString() : '-'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      );
    }

    if (currentScreen === 'reports') {
      let filteredLogs = [...logs];
      if (filterStartDate) { const startTimestamp = new Date(filterStartDate).setHours(0, 0, 0, 0); filteredLogs = filteredLogs.filter(log => log.timestamp >= startTimestamp); }
      if (filterEndDate) { const endTimestamp = new Date(filterEndDate).setHours(23, 59, 59, 999); filteredLogs = filteredLogs.filter(log => log.timestamp <= endTimestamp); }
      if (filterName) { const searchName = filterName.toLowerCase(); filteredLogs = filteredLogs.filter(log => log.userName.toLowerCase().includes(searchName)); }
      if (filterVehiclePlate) { filteredLogs = filteredLogs.filter(log => log.vehiclePlate === filterVehiclePlate); }
      if (filterVehicleType) {
        filteredLogs = filteredLogs.filter(log => {
          const vRawType = vehicles.find(v => v.plate === log.vehiclePlate)?.type || ''; let normalizedType = 'รถยนต์';
          if (vRawType.includes('จักรยาน') || vRawType.includes('มอเตอร์ไซค์')) normalizedType = 'รถจักรยานยนต์'; else if (vRawType.includes('บรรทุก')) normalizedType = 'รถบรรทุก';
          return normalizedType === filterVehicleType;
        });
      }

      // ✅ ระบบคัดกรอง Sorting 
      const sortedReportLogs = filteredLogs.sort((a, b) => {
         let valA = a[sortConfig.key]; let valB = b[sortConfig.key];
         if (typeof valA === 'string') valA = valA.toLowerCase(); if (typeof valB === 'string') valB = valB.toLowerCase();
         if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
         if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
         return 0;
      });

      const handleSort = (key) => {
         let direction = 'asc';
         if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
         setSortConfig({ key, direction });
      };

      const SortIcon = ({ columnKey }) => {
         if (sortConfig.key !== columnKey) return <ChevronsUpDown size={14} className="inline ml-1 text-gray-400" />;
         return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="inline ml-1 text-blue-600" /> : <ChevronDown size={14} className="inline ml-1 text-blue-600" />;
      };

      const uniquePlates = [...new Set(vehicles.map(v => v.plate))];
      const clearFilters = () => { setFilterStartDate(''); setFilterEndDate(''); setFilterName(''); setFilterVehicleType(''); setFilterVehiclePlate(''); };

      const handleExportCSV = () => { /* Code unchanged */ };
      const handleExportPDF = () => { window.print(); };
      const handleExportImage = () => { /* Code unchanged */ };

      return (
        <div className="h-screen overflow-y-auto no-scrollbar bg-gray-50 max-w-5xl mx-auto shadow-xl pb-20 relative">
          <AppHeader title="รายงานบันทึกการเดินทาง" showBack={true} currentUser={currentUser} onBack={() => setCurrentScreen('admin')} onLogout={handleLogout} />
          <div className="p-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4 no-print space-y-3">
              <div className="flex items-center gap-2 text-blue-800 font-bold border-b border-gray-100 pb-2"><Filter size={18} /> คัดกรองข้อมูล</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                <div><label className="block text-xs font-semibold text-gray-500 mb-1">ตั้งแต่วันที่</label><input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="block text-xs font-semibold text-gray-500 mb-1">ถึงวันที่</label><input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="block text-xs font-semibold text-gray-500 mb-1">ชื่อพนักงาน</label><div className="relative"><Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" /><input type="text" placeholder="พิมพ์ชื่อค้นหา..." value={filterName} onChange={e => setFilterName(e.target.value)} className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div></div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">ประเภทรถ</label>
                  <select value={filterVehicleType} onChange={e => setFilterVehicleType(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"><option value="">ทั้งหมด</option><option value="รถยนต์">รถยนต์</option><option value="รถจักรยานยนต์">รถจักรยานยนต์</option><option value="รถบรรทุก">รถบรรทุก</option></select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">ทะเบียนรถ</label>
                  <select value={filterVehiclePlate} onChange={e => setFilterVehiclePlate(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"><option value="">ทั้งหมด</option>{uniquePlates.map(plate => <option key={plate} value={plate}>{plate}</option>)}</select>
                </div>
                <div className="flex items-end"><button onClick={clearFilters} className="w-full bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-1 transition-colors border border-gray-200 hover:border-red-200"><X size={16} /> ล้างตัวกรอง</button></div>
              </div>
            </div>

            {/* แถบปุ่ม Export Tools */}
            <div className="flex flex-wrap gap-2 mb-4 no-print">
              <button onClick={handleExportCSV} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-sm flex-1 md:flex-none transition-colors"><FileSpreadsheet size={18} /> Export CSV</button>
              <button onClick={handleExportPDF} className="bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-700 shadow-sm flex-1 md:flex-none transition-colors"><Printer size={18} /> Save PDF</button>
              <button onClick={handleExportImage} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-sm flex-1 md:flex-none transition-colors"><Download size={18} /> Save Image</button>
            </div>

            <div id="report-table-container" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto p-1 print-shadow-none">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                  {/* ✅ ส่วนหัวที่สามารถคลิกเพื่อ Sort ได้ */}
                  <tr>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('docNo')}>เลขที่เอกสาร <SortIcon columnKey="docNo"/></th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('timestamp')}>วัน-เวลา <SortIcon columnKey="timestamp"/></th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('userName')}>พนักงาน <SortIcon columnKey="userName"/></th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('type')}>ประเภท <SortIcon columnKey="type"/></th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('vehiclePlate')}>ทะเบียนรถ <SortIcon columnKey="vehiclePlate"/></th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('mileage')}>เลขไมล์ <SortIcon columnKey="mileage"/></th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('workPeriod')}>ช่วงเวลา <SortIcon columnKey="workPeriod"/></th>
                    <th className="px-4 py-3 text-center no-print">หลักฐาน</th>
                    <th className="px-4 py-3 text-center no-print">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedReportLogs.length === 0 ? (
                    <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-500">ไม่พบข้อมูล หรือ หัวคอลัมน์ใน Sheet ผิดพลาด (ตรวจสอบหัวคอลัมน์ใน Sheet อีกครั้ง)</td></tr>
                  ) : (
                    sortedReportLogs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{log.docNo}</td><td className="px-4 py-3 text-gray-600">{log.dateString}</td>
                        <td className="px-4 py-3 font-bold text-blue-900">{log.userName}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${log.type === 'start' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{log.type === 'start' ? 'เข้างาน' : 'เลิกงาน'}</span></td>
                        <td className="px-4 py-3">{log.vehiclePlate}</td><td className="px-4 py-3 font-mono font-bold text-blue-700">{(log.mileage || 0).toLocaleString()}</td>
                        <td className="px-4 py-3"><span className={log.workPeriod === 'นอกเวลาปกติ' ? 'text-red-600 font-bold' : 'text-green-600'}>{log.workPeriod}</span></td>
                        <td className="px-4 py-3 text-center no-print">
                          {log.photoUrl && log.photoUrl !== 'ไม่มีรูปภาพ' && log.photoUrl !== 'simulated_google_photo_url' ? (
                             log.photoUrl.startsWith('data:image') ? 
                               <a href={log.photoUrl} download={`evidence_${log.docNo}.jpg`} className="text-orange-500 hover:text-orange-700" title="คลิกเพื่อเซฟรูปลงเครื่อง"><MapPin size={18} className="inline" /></a> :
                               <a href={log.photoUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800" title="คลิกเพื่อดูรูป"><MapPin size={18} className="inline" /></a>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-3 text-center no-print"><button onClick={() => setEditLogObj(log)} className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 rounded-md transition-colors" title="แก้ไขเลขไมล์"><Edit size={18} className="inline" /></button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit Log Modal */}
          {editLogObj && (
            <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-[100] p-4 backdrop-blur-sm no-print">
              <form onSubmit={handleUpdateLogMileage} className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm border-t-8 border-blue-600">
                <h3 className="font-bold text-gray-800 text-xl mb-4 flex items-center gap-2"><Edit size={20} className="text-blue-600"/> แก้ไขเลขไมล์</h3>
                <div className="mb-4"><label className="block text-sm font-semibold text-gray-700 mb-1">เลขไมล์ใหม่สำหรับ {editLogObj.docNo}</label><input name="edit_log_mileage" type="number" defaultValue={editLogObj.mileage} required className="w-full border-2 border-gray-200 p-3 rounded-xl bg-gray-50 focus:border-blue-400 outline-none text-lg font-bold text-blue-800" /></div>
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setEditLogObj(null)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200">ยกเลิก</button>
                  <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md">บันทึก</button>
                </div>
              </form>
            </div>
          )}
        </div>
      );
    }

    if (currentScreen === 'settings') {
      return (
        <div className="h-screen overflow-y-auto no-scrollbar bg-gray-50 max-w-4xl mx-auto shadow-xl pb-20 relative">
          <AppHeader title="ตั้งค่าระบบ" showBack={true} currentUser={currentUser} onBack={() => setCurrentScreen('admin')} onLogout={handleLogout} />
          <div className="p-4 space-y-6">
            <div className="flex bg-gray-200 p-1 rounded-xl">
              <button onClick={() => setSettingsTab('users')} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-colors ${settingsTab === 'users' ? 'bg-white text-blue-700 shadow' : 'text-gray-500'}`}>จัดการพนักงาน</button>
              <button onClick={() => setSettingsTab('vehicles')} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-colors ${settingsTab === 'vehicles' ? 'bg-white text-blue-700 shadow' : 'text-gray-500'}`}>จัดการยานพาหนะ</button>
            </div>

            {settingsTab === 'users' && (
              <div className="space-y-6">
                <form onSubmit={handleAddUser} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                  <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2"><User size={18} className="text-blue-600"/> เพิ่มพนักงานใหม่</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input name="emp_name" required placeholder="ชื่อ-นามสกุล (แสดงผล)" className="border-2 border-gray-200 p-3 rounded-xl bg-gray-50 focus:border-blue-400 outline-none" />
                    <input name="emp_username" required placeholder="Username (สำหรับ Login)" className="border-2 border-gray-200 p-3 rounded-xl bg-gray-50 focus:border-blue-400 outline-none" />
                    <input name="emp_password" required placeholder="Password (สำหรับ Login)" className="border-2 border-gray-200 p-3 rounded-xl bg-gray-50 focus:border-blue-400 outline-none" />
                    <select name="emp_role" className="border-2 border-gray-200 p-3 rounded-xl bg-gray-50 focus:border-blue-400 outline-none font-bold text-gray-700"><option value="employee">พนักงานขับรถ (Employee)</option><option value="admin">ผู้ตรวจสอบ (Admin)</option></select>
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors flex justify-center items-center gap-2"><Plus size={20}/> เพิ่มเข้าสู่ระบบ</button>
                </form>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 bg-gray-100 font-bold text-gray-700">รายชื่อผู้ใช้งานทั้งหมด ({appUsers.length})</div>
                  {appUsers.map(u => (
                    <div key={u.id} className="p-4 border-b border-gray-100 flex justify-between items-center hover:bg-gray-50 transition-colors">
                      <div><p className="font-bold text-gray-800 text-lg">{u.name}</p><p className="text-sm text-gray-500 mt-1"><span className="bg-gray-200 px-2 py-1 rounded text-xs mr-2 font-mono">{u.username}</span><span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.role === 'admin' ? 'Admin' : 'Employee'}</span></p></div>
                      <div className="flex items-center gap-1"><button onClick={() => setEditUserObj(u)} className="text-blue-500 p-2 hover:bg-blue-50 rounded-full transition-colors"><Edit size={20} /></button>{u.username !== 'admin' && (<button onClick={() => handleDeleteUser(u.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={20} /></button>)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {settingsTab === 'vehicles' && (
              <div className="space-y-6">
                <form onSubmit={handleAddVehicle} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                  <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2"><Car size={18} className="text-blue-600"/> เพิ่มยานพาหนะ</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input name="plate" required placeholder="ป้ายทะเบียนรถ (เช่น กท-1234 กทม)" className="border-2 border-gray-200 p-3 rounded-xl bg-gray-50 focus:border-blue-400 outline-none" />
                    <select name="type" className="border-2 border-gray-200 p-3 rounded-xl bg-gray-50 focus:border-blue-400 outline-none font-bold text-gray-700"><option value="รถยนต์">รถยนต์</option><option value="รถจักรยานยนต์">รถจักรยานยนต์</option><option value="รถบรรทุก">รถบรรทุก</option></select>
                    {/* ✅ เพิ่มช่องกรอกลิมิตหน้าปัด */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">ลิมิตหน้าปัดรถ (สำหรับคำนวณไมล์ตีกลับ)</label>
                      <input name="maxMileage" type="number" defaultValue="100000" required placeholder="เช่น 100000 หรือ 1000000" className="w-full border-2 border-gray-200 p-3 rounded-xl bg-gray-50 focus:border-blue-400 outline-none" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors flex justify-center items-center gap-2"><Plus size={20}/> เพิ่มยานพาหนะ</button>
                </form>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 bg-gray-100 font-bold text-gray-700">รถทั้งหมดในระบบ ({vehicles.length})</div>
                  {vehicles.map(v => {
                    const vLogs = logs.filter(l => l.vehiclePlate === v.plate);
                    const latestMileageNum = vLogs.length > 0 ? vLogs[0].mileage : v.mileage;
                    return (
                      <div key={v.id} className="p-4 border-b border-gray-100 flex justify-between items-center hover:bg-gray-50 transition-colors">
                        <div><p className="font-bold text-gray-800 text-lg">{v.plate}</p><p className="text-sm text-gray-500 mt-1 flex items-center gap-2 flex-wrap"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">{v.type}</span><span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs font-medium border border-gray-200">ไมล์ล่าสุด: {latestMileageNum ? latestMileageNum.toLocaleString() : '0'}</span><span className="bg-orange-50 text-orange-600 px-2 py-1 rounded text-xs font-medium border border-orange-200">ลิมิต: {(v.maxMileage || 100000).toLocaleString()}</span></p></div>
                        <div className="flex items-center gap-1"><button onClick={() => setEditVehicleObj(v)} className="text-blue-500 p-2 hover:bg-blue-50 rounded-full transition-colors"><Edit size={20} /></button><button onClick={() => handleDeleteVehicle(v.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={20} /></button></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Edit User Modal */}
          {editUserObj && (
            <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-[100] p-4 backdrop-blur-sm no-print">
              <form onSubmit={handleUpdateUser} className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm border-t-8 border-blue-600">
                <h3 className="font-bold text-gray-800 text-xl mb-4 flex items-center gap-2"><Edit size={20} className="text-blue-600"/> แก้ไขข้อมูลผู้ใช้งาน</h3>
                <div className="space-y-3">
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">ชื่อ-นามสกุล</label><input name="edit_emp_name" defaultValue={editUserObj.name} required className="w-full border-2 border-gray-200 p-2 rounded-xl bg-gray-50 focus:border-blue-400 outline-none" /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">Username</label><input name="edit_emp_username" defaultValue={editUserObj.username} required className="w-full border-2 border-gray-200 p-2 rounded-xl bg-gray-50 focus:border-blue-400 outline-none" /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">Password</label><input name="edit_emp_password" defaultValue={editUserObj.password} required className="w-full border-2 border-gray-200 p-2 rounded-xl bg-gray-50 focus:border-blue-400 outline-none" /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">สิทธิ์การใช้งาน</label><select name="edit_emp_role" defaultValue={editUserObj.role} className="w-full border-2 border-gray-200 p-2 rounded-xl bg-gray-50 focus:border-blue-400 outline-none font-bold text-gray-700"><option value="employee">พนักงานขับรถ (Employee)</option><option value="admin">ผู้ตรวจสอบ (Admin)</option></select></div>
                </div>
                <div className="flex gap-3 mt-6"><button type="button" onClick={() => setEditUserObj(null)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200">ยกเลิก</button><button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md">บันทึก</button></div>
              </form>
            </div>
          )}

          {/* Edit Vehicle Modal */}
          {editVehicleObj && (
            <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-[100] p-4 backdrop-blur-sm no-print">
              <form onSubmit={handleUpdateVehicle} className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm border-t-8 border-blue-600">
                <h3 className="font-bold text-gray-800 text-xl mb-4 flex items-center gap-2"><Edit size={20} className="text-blue-600"/> แก้ไขยานพาหนะ</h3>
                <div className="space-y-3">
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">ป้ายทะเบียน</label><input name="edit_plate" defaultValue={editVehicleObj.plate} required className="w-full border-2 border-gray-200 p-2 rounded-xl bg-gray-50 focus:border-blue-400 outline-none" /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">ประเภทรถ</label><select name="edit_type" defaultValue={editVehicleObj.type} className="w-full border-2 border-gray-200 p-2 rounded-xl bg-gray-50 focus:border-blue-400 outline-none font-bold text-gray-700"><option value="รถยนต์">รถยนต์</option><option value="รถจักรยานยนต์">รถจักรยานยนต์</option><option value="รถบรรทุก">รถบรรทุก</option></select></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">เลขไมล์ล่าสุด (กม.)</label><input name="edit_vehicle_mileage" type="number" defaultValue={editVehicleObj.mileage || (logs.filter(l => l.vehiclePlate === editVehicleObj.plate)[0]?.mileage) || ''} required className="w-full border-2 border-gray-200 p-2 rounded-xl bg-gray-50 focus:border-blue-400 outline-none font-bold text-blue-700" /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">ลิมิตหน้าปัด</label><input name="edit_maxMileage" type="number" defaultValue={editVehicleObj.maxMileage || 100000} required className="w-full border-2 border-gray-200 p-2 rounded-xl bg-gray-50 focus:border-blue-400 outline-none" /></div>
                </div>
                <div className="flex gap-3 mt-6"><button type="button" onClick={() => setEditVehicleObj(null)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200">ยกเลิก</button><button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md">บันทึก</button></div>
              </form>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return <div className="relative overflow-hidden bg-gray-900">{renderScreen()}<ModalOverlay /></div>;
}