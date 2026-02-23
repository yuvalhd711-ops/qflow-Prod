import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneCall, CheckCircle, XCircle, SkipForward, ArrowRightLeft, RotateCcw, Volume2, Coffee, History, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";

export default function Console() {
  const [user, setUser] = useState(null);
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState(null);
  const [activeDepartments, setActiveDepartments] = useState([]);
  const [queue, setQueue] = useState(null);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [waitingTickets, setWaitingTickets] = useState([]);
  const [historyTickets, setHistoryTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transferDialog, setTransferDialog] = useState(false);
  const [targetDepartmentName, setTargetDepartmentName] = useState("");
  const [onBreak, setOnBreak] = useState(false);
  const [historySearchSeq, setHistorySearchSeq] = useState("");
  const [language, setLanguage] = useState("he");

  const urlParams = new URLSearchParams(window.location.search);
  const branch_id = urlParams.get('branch_id');
  const queue_id = urlParams.get('queue_id');

  const translations = {
    he: {
      selectBranch: "קונסולת עובד - בחר סניף",
      selectDepartment: "קונסולת עובד - בחר מחלקה",
      backToBranch: "← חזרה לבחירת סניף",
      exitToDepartments: "← יציאה למחלקות",
      clearQueue: "🗑️ נקה תורים",
      break: "הפסקה",
      backToWork: "חזור לעבודה",
      currentTicket: "תור נוכחי",
      history: "היסטוריה",
      searchAndPromote: "חיפוש וקידום תור",
      enterTicketNumber: "הזן מספר תור...",
      search: "חפש",
      promoteToTop: "⬆️ קדם לתחילת התור",
      currentCard: "כרטיס נוכחי",
      inService: "בשירות",
      recall: "קריאה חוזרת",
      finishService: "סיים שירות",
      skip: "דלג",
      customerLeft: "לקוח עזב",
      returnToQueue: "החזר לתור",
      transfer: "העבר",
      noCurrentTicket: "אין כרטיס נוכחי",
      callNext: "קרא הבא",
      waiting: "ממתינים",
      noWaitingTickets: "אין כרטיסים ממתינים",
      todayHistory: "היסטוריית תורים להיום",
      searchTicket: "חפש מספר תור...",
      noResults: "אין תוצאות",
      served: "טופל",
      cancelled: "בוטל",
      skipped: "דולג",
      transferDialog: "העברת כרטיס למחלקה אחרת",
      selectTargetDepartment: "בחר מחלקת יעד:",
      selectDepartment: "בחר מחלקה",
      cancel: "ביטול",
      console: "קונסולת עובד",
      loading: "טוען...",
      noTickets: "אין כרטיסים ממתינים",
      confirmClear: "האם אתה בטוח שברצונך למחוק את כל התורים?",
      clearSuccess: "התורים נוקו בהצלחה!",
      clearError: "שגיאה: לא ניתן לנקות תורים"
    },
    en: {
      selectBranch: "Employee Console - Select Branch",
      selectDepartment: "Employee Console - Select Department",
      backToBranch: "← Back to Branch Selection",
      exitToDepartments: "← Exit to Departments",
      clearQueue: "🗑️ Clear Queue",
      break: "Break",
      backToWork: "Back to Work",
      currentTicket: "Current Ticket",
      history: "History",
      searchAndPromote: "Search and Promote Ticket",
      enterTicketNumber: "Enter ticket number...",
      search: "Search",
      promoteToTop: "⬆️ Promote to Top",
      currentCard: "Current Card",
      inService: "In Service",
      recall: "Recall",
      finishService: "Finish Service",
      skip: "Skip",
      customerLeft: "Customer Left",
      returnToQueue: "Return to Queue",
      transfer: "Transfer",
      noCurrentTicket: "No current ticket",
      callNext: "Call Next",
      waiting: "Waiting",
      noWaitingTickets: "No waiting tickets",
      todayHistory: "Today's Ticket History",
      searchTicket: "Search ticket number...",
      noResults: "No results",
      served: "Served",
      cancelled: "Cancelled",
      skipped: "Skipped",
      transferDialog: "Transfer Ticket to Another Department",
      selectTargetDepartment: "Select target department:",
      selectDepartment: "Select department",
      cancel: "Cancel",
      console: "Employee Console",
      loading: "Loading...",
      noTickets: "No waiting tickets",
      confirmClear: "Are you sure you want to delete all tickets?",
      clearSuccess: "Queue cleared successfully!",
      clearError: "Error: Cannot clear queue"
    },
    ar: {
      selectBranch: "وحدة تحكم الموظف - اختر الفرع",
      selectDepartment: "وحدة تحكم الموظف - اختر القسم",
      backToBranch: "→ العودة لاختيار الفرع",
      exitToDepartments: "→ الخروج للأقسام",
      clearQueue: "🗑️ مسح قائمة الانتظار",
      break: "استراحة",
      backToWork: "العودة للعمل",
      currentTicket: "التذكرة الحالية",
      history: "السجل",
      searchAndPromote: "البحث وتقديم التذكرة",
      enterTicketNumber: "أدخل رقم التذكرة...",
      search: "بحث",
      promoteToTop: "⬆️ قدم إلى الأعلى",
      currentCard: "البطاقة الحالية",
      inService: "قيد الخدمة",
      recall: "إعادة الاتصال",
      finishService: "إنهاء الخدمة",
      skip: "تخطي",
      customerLeft: "العميل غادر",
      returnToQueue: "إرجاع لقائمة الانتظار",
      transfer: "نقل",
      noCurrentTicket: "لا توجد تذكرة حالية",
      callNext: "استدعاء التالي",
      waiting: "قائمة الانتظار",
      noWaitingTickets: "لا توجد تذاكر في الانتظار",
      todayHistory: "سجل تذاكر اليوم",
      searchTicket: "البحث عن رقم التذكرة...",
      noResults: "لا توجد نتائج",
      served: "تم الخدمة",
      cancelled: "ملغى",
      skipped: "متخطى",
      transferDialog: "نقل التذكرة إلى قسم آخر",
      selectTargetDepartment: "اختر القسم المستهدف:",
      selectDepartment: "اختر قسم",
      cancel: "إلغاء",
      console: "وحدة تحكم الموظف",
      loading: "جاري التحميل...",
      noTickets: "لا توجد تذاكر في الانتظار",
      confirmClear: "هل أنت متأكد من حذف جميع التذاكر؟",
      clearSuccess: "تم مسح قائمة الانتظار بنجاح!",
      clearError: "خطأ: لا يمكن مسح قائمة الانتظار"
    },
    th: {
      selectBranch: "คอนโซลพนักงาน - เลือกสาขา",
      selectDepartment: "คอนโซลพนักงาน - เลือกแผนก",
      backToBranch: "← กลับไปเลือกสาขา",
      exitToDepartments: "← ออกไปยังแผนก",
      clearQueue: "🗑️ ล้างคิว",
      break: "พักผ่อน",
      backToWork: "กลับมาทำงาน",
      currentTicket: "บัตรคิวปัจจุบัน",
      history: "ประวัติ",
      searchAndPromote: "ค้นหาและเลื่อนบัตรคิว",
      enterTicketNumber: "ใส่หมายเลขบัตรคิว...",
      search: "ค้นหา",
      promoteToTop: "⬆️ เลื่อนไปด้านบน",
      currentCard: "บัตรปัจจุบัน",
      inService: "กำลังให้บริการ",
      recall: "เรียกซ้ำ",
      finishService: "เสร็จสิ้นการบริการ",
      skip: "ข้าม",
      customerLeft: "ลูกค้าออกไป",
      returnToQueue: "ส่งกลับคิว",
      transfer: "โอน",
      noCurrentTicket: "ไม่มีบัตรคิวปัจจุบัน",
      callNext: "เรียกคิวถัดไป",
      waiting: "กำลังรอ",
      noWaitingTickets: "ไม่มีบัตรคิวที่รออยู่",
      todayHistory: "ประวัติบัตรคิววันนี้",
      searchTicket: "ค้นหาหมายเลขบัตรคิว...",
      noResults: "ไม่มีผลลัพธ์",
      served: "ให้บริการแล้ว",
      cancelled: "ยกเลิก",
      skipped: "ข้าม",
      transferDialog: "โอนบัตรคิวไปยังแผนกอื่น",
      selectTargetDepartment: "เลือกแผนกปลายทาง:",
      selectDepartment: "เลือกแผนก",
      cancel: "ยกเลิก",
      console: "คอนโซลพนักงาน",
      loading: "กำลังโหลด...",
      noTickets: "ไม่มีบัตรคิวที่รออยู่",
      confirmClear: "คุณแน่ใจหรือไม่ว่าต้องการลบบัตรคิวทั้งหมด?",
      clearSuccess: "ล้างคิวสำเร็จ!",
      clearError: "ข้อผิดพลาด: ไม่สามารถล้างคิวได้"
    }
  };

  const t = translations[language];

  const languageNames = {
    he: "עברית",
    en: "English",
    ar: "العربية",
    th: "ไทย"
  };

  // Load user
  const loadUser = useCallback(async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.log("User not logged in");
    }
  }, []);

  // Load branches
  const loadBranches = useCallback(async () => {
    try {
      const list = await base44.entities.Branch.list();
      setBranches(list.filter(b => b.is_active));
      
      if (branch_id) {
        const selected = list.find(b => b.id === branch_id);
        setCurrentBranch(selected);
      }
    } catch (error) {
      console.error("Error loading branches:", error);
    } finally {
      setLoading(false);
    }
  }, [branch_id]);

  // Load active departments
  const loadActiveDepartments = useCallback(async (branchId) => {
    try {
      const allDepts = await base44.entities.BranchDepartmentSetting.list();
      const filtered = allDepts.filter(d => 
        String(d.branch_id) === String(branchId) && d.is_active === true
      );
      setActiveDepartments(filtered);
    } catch (error) {
      console.error("Error loading departments:", error);
    }
  }, []);

  // Load queue
  const loadQueue = useCallback(async () => {
    if (!queue_id) return;
    
    try {
      const allQueues = await base44.entities.Queue.list();
      const queueData = allQueues.find(q => q.id === queue_id);
      
      if (!queueData) {
        window.location.href = createPageUrl("Console") + (branch_id ? `?branch_id=${branch_id}` : '');
        return;
      }
      
      setQueue(queueData);
    } catch (error) {
      console.error("Error loading queue:", error);
    }
  }, [queue_id, branch_id]);

  // Load data (tickets)
  const loadData = useCallback(async () => {
    if (!queue_id) return;
    
    try {
      const allTickets = await base44.entities.Ticket.list();
      const queueTickets = allTickets.filter(t => t.queue_id === queue_id);
      
      // Waiting tickets
      const waiting = queueTickets
        .filter(t => t.state === "waiting")
        .sort((a, b) => a.ticket_number - b.ticket_number);
      setWaitingTickets(waiting);
      
      // Current ticket
      const active = queueTickets.find(t => 
        t.state === "called" || t.state === "in_service"
      );
      setCurrentTicket(active || null);
      
      // History - today only
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayHistory = queueTickets.filter(t =>
        (t.state === "served" || t.state === "cancelled" || t.state === "skipped") &&
        new Date(t.created_date) >= today
      ).sort((a, b) => 
        new Date(b.finished_at || b.updated_date) - 
        new Date(a.finished_at || a.updated_date)
      );
      setHistoryTickets(todayHistory);
      
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, [queue_id]);

  useEffect(() => {
    loadUser();
    loadBranches();
  }, [loadUser, loadBranches]);

  useEffect(() => {
    if (branch_id) {
      loadActiveDepartments(branch_id);
    }
  }, [branch_id, loadActiveDepartments]);

  useEffect(() => {
    if (queue_id) {
      loadQueue();
      loadData();
      
      const interval = setInterval(loadData, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [queue_id, loadQueue, loadData]);

  // Broadcast ticket call
  const broadcastTicketCall = (ticket, queueName) => {
    try {
      localStorage.setItem("ticket_call_event", JSON.stringify({
        ts: Date.now(),
        ticketSeq: ticket.ticket_number,
        queueName: queueName
      }));
      setTimeout(() => localStorage.removeItem("ticket_call_event"), 1000);
    } catch (e) {
      console.error("Error broadcasting:", e);
    }
  };

  // Call next
  const callNext = async () => {
    const nextTicket = waitingTickets[0];
    if (!nextTicket) {
      alert(t.noTickets);
      return;
    }
    
    try {
      await base44.entities.Ticket.update(nextTicket.id, {
        state: "in_service",
        called_at: new Date().toISOString()
      });
      
      broadcastTicketCall(nextTicket, queue.name);
      
      base44.functions.invoke('notifyTwoBefore', { queue_id: queue_id }).catch(err => {
        console.warn('notifyTwoBefore failed:', err);
      });
      
      loadData();
    } catch (e) {
      console.error("Error calling next ticket:", e);
    }
  };

  // Recall
  const recall = () => {
    if (!currentTicket) return;
    broadcastTicketCall(currentTicket, queue.name);
  };

  // Finish service
  const finishService = async () => {
    if (!currentTicket) return;
    
    try {
      const finishedAt = new Date();
      const startedAt = new Date(currentTicket.called_at);
      const serviceTime = Math.floor((finishedAt - startedAt) / 1000);
      
      await base44.entities.Ticket.update(currentTicket.id, {
        state: "served",
        finished_at: finishedAt.toISOString(),
        served_by: user?.email || "unknown",
        service_time_seconds: serviceTime
      });
      
      // Update average service time (EMA)
      const currentAvg = queue.avg_service_time_seconds || 180;
      const newAvg = Math.floor((currentAvg * 0.8) + (serviceTime * 0.2));
      await base44.entities.Queue.update(queue_id, { 
        avg_service_time_seconds: newAvg 
      });
      
      await loadData();
      
      // Auto call next if not on break
      if (!onBreak) {
        setTimeout(() => callNext(), 500);
      }
    } catch (e) {
      console.error("Error finishing service:", e);
    }
  };

  // Skip ticket
  const skipTicket = async () => {
    if (!currentTicket) return;
    
    try {
      await base44.entities.Ticket.update(currentTicket.id, {
        state: "skipped"
      });
      await loadData();
    } catch (e) {
      console.error("Error skipping:", e);
    }
  };

  // Customer left
  const customerLeft = async () => {
    if (!currentTicket) return;
    
    try {
      await base44.entities.Ticket.update(currentTicket.id, {
        state: "cancelled"
      });
      await loadData();
    } catch (e) {
      console.error("Error cancelling:", e);
    }
  };

  // Requeue ticket
  const requeueTicket = async () => {
    if (!currentTicket) return;
    
    try {
      await base44.entities.Ticket.update(currentTicket.id, {
        state: "waiting"
      });
      await loadData();
    } catch (e) {
      console.error("Error requeuing:", e);
    }
  };

  // Transfer ticket
  const transferTicket = async () => {
    if (!currentTicket || !targetDepartmentName) return;
    
    const filterBranchId = branch_id || user?.branch_id;
    
    try {
      const allQueues = await base44.entities.Queue.list();
      const targetQueues = allQueues.filter(q =>
        String(q.branch_id) === String(filterBranchId) &&
        q.name === targetDepartmentName &&
        q.is_active === true
      );
      
      if (targetQueues.length === 0) {
        alert(language === "he" ? "המחלקה אינה זמינה" : language === "en" ? "Department not available" : language === "ar" ? "القسم غير متاح" : "แผนกไม่พร้อมใช้งาน");
        return;
      }
      
      const targetQueueEntity = targetQueues[0];
      const newSeq = (targetQueueEntity.seq_counter || 0) + 1;
      
      await base44.entities.Queue.update(targetQueueEntity.id, { 
        seq_counter: newSeq 
      });
      
      await base44.entities.Ticket.update(currentTicket.id, {
        queue_id: targetQueueEntity.id,
        ticket_number: newSeq,
        state: "waiting"
      });
      
      setTransferDialog(false);
      setTargetDepartmentName("");
      loadData();
    } catch (e) {
      console.error("Error transferring:", e);
    }
  };



  // Search history
  const searchHistoryTicket = () => {
    if (!historySearchSeq) return historyTickets;
    return historyTickets.filter(t => 
      String(t.ticket_number).includes(historySearchSeq)
    );
  };

  // Clear all tickets
  const clearAllTickets = async () => {
    if (!confirm(t.confirmClear)) {
      return;
    }
    try {
      await base44.functions.invoke('clearQueue', { queue_id });
      alert(t.clearSuccess);
      await loadData();
    } catch (error) {
      alert(t.clearError);
    }
  };

  const LanguageSelector = () => {
    const [showDropdown, setShowDropdown] = useState(false);
    
    return (
      <div className="relative">
        <Button
          onClick={() => setShowDropdown(!showDropdown)}
          className="text-white gap-2"
          style={{ backgroundColor: '#41B649' }}
        >
          <Globe className="h-5 w-5" />
          {languageNames[language]}
        </Button>
        
        {showDropdown && (
          <div className="absolute top-12 left-0 bg-white rounded-lg shadow-xl border-2 overflow-hidden z-50" style={{ borderColor: '#41B649' }}>
            {Object.entries(languageNames).map(([code, name]) => (
              <button
                key={code}
                onClick={() => {
                  setLanguage(code);
                  setShowDropdown(false);
                }}
                className={`w-full px-6 py-3 text-left hover:bg-gray-50 transition-colors ${
                  language === code ? 'font-bold' : ''
                }`}
                style={language === code ? { backgroundColor: '#E6F9EA', color: '#1F5F25' } : {}}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const selectBranch = (branchId) => {
    window.location.href = createPageUrl("Console") + "?branch_id=" + branchId;
  };

  const selectDepartment = (deptName) => {
    base44.entities.Queue.list().then(allQueues => {
      const targetQueue = allQueues.find(q => 
        String(q.branch_id) === String(branch_id) && 
        q.name === deptName && 
        q.is_active
      );
      
      if (targetQueue) {
        window.location.href = createPageUrl("Console") + "?branch_id=" + branch_id + "&queue_id=" + targetQueue.id;
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#E6F9EA' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 mx-auto mb-4" style={{ borderColor: '#41B649' }}></div>
          <p className="text-xl text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  // Branch selection
  if (!branch_id) {
    return (
      <div className="min-h-screen p-8" dir={language === "he" || language === "ar" ? "rtl" : "ltr"} style={{ backgroundColor: '#E6F9EA' }}>
        <div className="fixed top-6 left-6 z-50">
          <LanguageSelector />
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
              alt="שוק העיר"
              className="h-16 w-auto mx-auto mb-4"
            />
            <h1 className="text-4xl font-bold mb-4" style={{ color: '#1F5F25' }}>
              {t.selectBranch}
            </h1>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            {branches.map((branch, index) => (
              <motion.div
                key={branch.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card 
                  onClick={() => selectBranch(branch.id)}
                  className="cursor-pointer hover:shadow-2xl p-6 bg-white"
                  style={{ borderColor: '#41B649', borderWidth: '2px' }}
                >
                  <h2 className="text-2xl font-bold text-center" style={{ color: '#1F5F25' }}>
                    {branch.name}
                  </h2>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Department selection
  if (branch_id && !queue_id) {
    return (
      <div className="min-h-screen p-8" dir={language === "he" || language === "ar" ? "rtl" : "ltr"} style={{ backgroundColor: '#E6F9EA' }}>
        <div className="fixed top-6 left-6 z-50">
          <LanguageSelector />
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
              alt="שוק העיר"
              className="h-16 w-auto mx-auto mb-4"
            />
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#1F5F25' }}>
              {currentBranch?.name}
            </h1>
            <p className="text-xl text-gray-600">{t.selectDepartment}</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {activeDepartments.map((dept, index) => (
              <motion.div
                key={dept.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <Button
                  onClick={() => selectDepartment(dept.department)}
                  className="w-full h-32 text-white shadow-xl"
                  style={{ backgroundColor: '#E52521', borderRadius: '1rem' }}
                >
                  <div className="text-3xl font-bold">{dept.department}</div>
                </Button>
              </motion.div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <Button
              onClick={() => window.location.href = createPageUrl("Console")}
              variant="outline"
              style={{ borderColor: '#41B649', color: '#41B649' }}
            >
              {t.backToBranch}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Console screen
  return (
    <div className="min-h-screen p-3" dir={language === "he" || language === "ar" ? "rtl" : "ltr"} style={{ backgroundColor: '#E6F9EA' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header - מותאם לטאבלט */}
        <div className="flex justify-between items-center gap-2 mb-3">
          <div className="flex items-center gap-2">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
              alt="שוק העיר"
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#111111' }}>
                {queue?.name}
              </h1>
              <p className="text-xs text-gray-600">{t.console}</p>
            </div>
          </div>
          
          <div className="flex gap-1 flex-wrap">
            <LanguageSelector />
            <Button 
              onClick={() => window.location.href = createPageUrl("Console") + `?branch_id=${branch_id}`}
              variant="outline"
              size="sm"
            >
              {t.exitToDepartments}
            </Button>
            <Button 
              onClick={() => setOnBreak(!onBreak)}
              variant={onBreak ? "default" : "outline"}
              size="sm"
              style={onBreak ? { backgroundColor: '#41B649', color: 'white' } : {}}
            >
              <Coffee className="w-3 h-3 ml-1" />
              {onBreak ? t.backToWork : t.break}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="current" className="text-sm">{t.currentTicket}</TabsTrigger>
            <TabsTrigger value="history" className="text-sm">
              <History className="w-3 h-3 ml-1" />
              {t.history}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="current">
            <div className="grid grid-cols-1 gap-3">
              {/* Current ticket - מותאם לטאבלט */}
              <Card className="bg-white shadow-md" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                <CardHeader className="p-3" style={{ backgroundColor: '#E6F9EA' }}>
                  <CardTitle className="text-base">{t.currentCard}</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  {currentTicket ? (
                    <div className="space-y-3">
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="text-center p-4 rounded-xl"
                        style={{ backgroundColor: '#E6F9EA' }}
                      >
                        <div className="text-4xl font-bold mb-1" style={{ color: '#E52521' }}>
                          {currentTicket.ticket_number}
                        </div>
                        <div className="text-sm font-medium">{t.inService}</div>
                      </motion.div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          onClick={recall} 
                          className="gap-1 text-white text-sm h-9"
                          style={{ backgroundColor: '#E52521' }}
                        >
                          <Volume2 className="w-3 h-3" />
                          {t.recall}
                        </Button>
                        
                        <Button 
                          onClick={finishService} 
                          className="gap-1 text-white text-sm h-9"
                          style={{ backgroundColor: '#41B649' }}
                        >
                          <CheckCircle className="w-3 h-3" />
                          {t.finishService}
                        </Button>
                        
                        <Button 
                          onClick={skipTicket} 
                          className="gap-1 text-white text-sm h-9"
                          style={{ backgroundColor: '#E52521' }}
                        >
                          <SkipForward className="w-3 h-3" />
                          {t.skip}
                        </Button>
                        
                        <Button 
                          onClick={customerLeft} 
                          className="gap-1 text-white text-sm h-9"
                          style={{ backgroundColor: '#E52521' }}
                        >
                          <XCircle className="w-3 h-3" />
                          {t.customerLeft}
                        </Button>
                        
                        <Button 
                          onClick={requeueTicket} 
                          className="gap-1 text-white text-sm h-9"
                          style={{ backgroundColor: '#41B649' }}
                        >
                          <RotateCcw className="w-3 h-3" />
                          {t.returnToQueue}
                        </Button>
                        
                        <Button 
                          onClick={() => setTransferDialog(true)} 
                          className="gap-1 text-white text-sm h-9"
                          style={{ backgroundColor: '#E52521' }}
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          {t.transfer}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-600 text-sm mb-3">{t.noCurrentTicket}</p>
                      <Button 
                        onClick={callNext} 
                        size="default"
                        className="gap-2 text-white"
                        style={{ backgroundColor: '#E52521' }}
                        disabled={waitingTickets.length === 0}
                      >
                        <PhoneCall className="w-4 h-4" />
                        {t.callNext}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Waiting queue - מותאם לטאבלט */}
              <Card className="bg-white shadow-md" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                <CardHeader className="p-3" style={{ backgroundColor: '#E6F9EA' }}>
                  <CardTitle className="text-base">{t.waiting} ({waitingTickets.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {waitingTickets.length === 0 ? (
                      <div className="text-center py-6 text-gray-500 text-sm">
                        {t.noWaitingTickets}
                      </div>
                    ) : (
                      waitingTickets.slice(0, 10).map((ticket, idx) => (
                        <div key={ticket.id} className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: '#41B649' }}
                          >
                            <span className="text-white font-bold text-xs">{idx + 1}</span>
                          </div>
                          <Card className="flex-1 p-2 bg-white border-gray-200">
                            <span className="text-xl font-bold" style={{ color: '#E52521' }}>
                              {ticket.ticket_number}
                            </span>
                          </Card>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="history">
            <Card className="bg-white shadow-md" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
              <CardHeader className="p-3" style={{ backgroundColor: '#E6F9EA' }}>
                <CardTitle className="text-base">{t.todayHistory}</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <Input
                  type="number"
                  placeholder={t.searchTicket}
                  value={historySearchSeq}
                  onChange={(e) => setHistorySearchSeq(e.target.value)}
                  className="mb-3 h-9 text-sm"
                  dir="ltr"
                />
                
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {searchHistoryTicket().length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      {t.noResults}
                    </div>
                  ) : (
                    searchHistoryTicket().map((ticket) => {
                      const statusColors = {
                        served: { bg: '#E6F9EA', text: '#41B649', label: t.served },
                        cancelled: { bg: '#fee2e2', text: '#dc2626', label: t.cancelled },
                        skipped: { bg: '#fef3c7', text: '#d97706', label: t.skipped }
                      };
                      const status = statusColors[ticket.state] || statusColors.served;
                      
                      return (
                        <Card 
                          key={ticket.id} 
                          className="p-3" 
                          style={{ backgroundColor: status.bg }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl font-bold" style={{ color: '#E52521' }}>
                                {ticket.ticket_number}
                              </div>
                              <div>
                                <Badge 
                                  className="text-xs"
                                  style={{ 
                                    backgroundColor: status.bg, 
                                    color: status.text,
                                    borderColor: status.text,
                                    borderWidth: '1px'
                                  }}
                                >
                                  {status.label}
                                </Badge>
                                <p className="text-xs text-gray-600 mt-1">
                                  {ticket.finished_at ? new Date(ticket.finished_at).toLocaleTimeString('he-IL') : '-'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Transfer Dialog */}
        <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
          <DialogContent dir={language === "he" || language === "ar" ? "rtl" : "ltr"} className="bg-white">
            <DialogHeader>
              <DialogTitle>{t.transferDialog}</DialogTitle>
            </DialogHeader>
            
            <div className="py-4">
              <label className="text-sm font-medium mb-2 block">{t.selectTargetDepartment}</label>
              <Select value={targetDepartmentName} onValueChange={setTargetDepartmentName}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectDepartment} />
                </SelectTrigger>
                <SelectContent>
                  {activeDepartments
                    .filter(d => d.department !== queue?.name)
                    .map((dept) => (
                      <SelectItem key={dept.id} value={dept.department}>
                        {dept.department}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setTransferDialog(false);
                  setTargetDepartmentName("");
                }}
              >
                {t.cancel}
              </Button>
              <Button
                onClick={transferTicket}
                className="text-white"
                style={{ backgroundColor: '#41B649' }}
                disabled={!targetDepartmentName}
              >
                {t.transfer}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}