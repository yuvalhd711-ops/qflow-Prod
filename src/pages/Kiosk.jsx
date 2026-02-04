import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { Printer, Smartphone, Globe } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function Kiosk() {
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState(null);
  const [activeDepartments, setActiveDepartments] = useState([]);
  const [queue, setQueue] = useState(null);
  const [showTicket, setShowTicket] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [smsDialog, setSmsDialog] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [joinClub, setJoinClub] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [language, setLanguage] = useState("he");

  const urlParams = new URLSearchParams(window.location.search);
  const branch_id = urlParams.get('branch_id');
  const queue_id = urlParams.get('queue_id');

  const translations = {
    he: {
      selectBranch: "בחר סניף",
      selectBranchDesc: "בחר את הסניף שבו אתה נמצא",
      selectDepartment: "בחר מחלקה",
      selectDepartmentDesc: "בחר את המחלקה שברצונך לקבל בה שירות",
      clickForTicket: "לחץ לקבלת תור",
      backToBranch: "← חזרה לבחירת סניף",
      backToDepartment: "← חזרה לבחירת מחלקה",
      chooseOption: "בחר אפשרות לקבלת מספר תור",
      getNumber: "קבלת מספר",
      getNumberSMS: "קבלת מספר ב-SMS",
      smsDialogTitle: "קבל תור ב-SMS",
      phoneNumber: "מספר טלפון",
      joinClub: "רוצה להצטרף למועדון לקוחות שוק העיר? (הטבות והנחות)",
      cancel: "ביטול",
      sendSMS: "שלח לי תור ב-SMS",
      sending: "שולח...",
      ticketCreated: "כרטיס נוצר בהצלחה!",
      yourNumber: "מספר התור שלך:",
      smsSent: "נשלח אליך SMS עם פרטי התור",
      ticketPrinted: "הכרטיס מודפס עבורך",
      loading: "טוען..."
    },
    en: {
      selectBranch: "Select Branch",
      selectBranchDesc: "Choose the branch where you are located",
      selectDepartment: "Select Department",
      selectDepartmentDesc: "Choose the department you wish to be served in",
      clickForTicket: "Click to get a ticket",
      backToBranch: "← Back to Branch Selection",
      backToDepartment: "← Back to Department Selection",
      chooseOption: "Choose an option to get your ticket number",
      getNumber: "Get Number",
      getNumberSMS: "Get Number via SMS",
      smsDialogTitle: "Get Ticket via SMS",
      phoneNumber: "Phone Number",
      joinClub: "Would you like to join Shuk Ha'ir loyalty club? (Benefits and discounts)",
      cancel: "Cancel",
      sendSMS: "Send me ticket via SMS",
      sending: "Sending...",
      ticketCreated: "Ticket Created Successfully!",
      yourNumber: "Your ticket number:",
      smsSent: "SMS sent with ticket details",
      ticketPrinted: "Ticket is printing for you",
      loading: "Loading..."
    },
    ar: {
      selectBranch: "اختر الفرع",
      selectBranchDesc: "اختر الفرع الذي أنت فيه",
      selectDepartment: "اختر القسم",
      selectDepartmentDesc: "اختر القسم الذي ترغب في الحصول على الخدمة فيه",
      clickForTicket: "انقر للحصول على تذكرة",
      backToBranch: "→ العودة لاختيار الفرع",
      backToDepartment: "→ العودة لاختيار القسم",
      chooseOption: "اختر خياراً للحصول على رقم التذكرة",
      getNumber: "احصل على رقم",
      getNumberSMS: "احصل على رقم عبر SMS",
      smsDialogTitle: "احصل على تذكرة عبر SMS",
      phoneNumber: "رقم الهاتف",
      joinClub: "هل ترغب في الانضمام إلى نادي عملاء شوك هعير؟ (مزايا وخصومات)",
      cancel: "إلغاء",
      sendSMS: "أرسل لي تذكرة عبر SMS",
      sending: "جاري الإرسال...",
      ticketCreated: "تم إنشاء التذكرة بنجاح!",
      yourNumber: "رقم تذكرتك:",
      smsSent: "تم إرسال SMS مع تفاصيل التذكرة",
      ticketPrinted: "يتم طباعة التذكرة لك",
      loading: "جاري التحميل..."
    },
    th: {
      selectBranch: "เลือกสาขา",
      selectBranchDesc: "เลือกสาขาที่คุณอยู่",
      selectDepartment: "เลือกแผนก",
      selectDepartmentDesc: "เลือกแผนกที่คุณต้องการรับบริการ",
      clickForTicket: "คลิกเพื่อรับบัตรคิว",
      backToBranch: "← กลับไปเลือกสาขา",
      backToDepartment: "← กลับไปเลือกแผนก",
      chooseOption: "เลือกวิธีรับหมายเลขคิวของคุณ",
      getNumber: "รับหมายเลข",
      getNumberSMS: "รับหมายเลขผ่าน SMS",
      smsDialogTitle: "รับบัตรคิวผ่าน SMS",
      phoneNumber: "หมายเลขโทรศัพท์",
      joinClub: "คุณต้องการเข้าร่วมชมรมลูกค้า Shuk Ha'ir หรือไม่? (สิทธิพิเศษและส่วนลด)",
      cancel: "ยกเลิก",
      sendSMS: "ส่งบัตรคิวให้ฉันผ่าน SMS",
      sending: "กำลังส่ง...",
      ticketCreated: "สร้างบัตรคิวสำเร็จ!",
      yourNumber: "หมายเลขคิวของคุณ:",
      smsSent: "ส่ง SMS พร้อมรายละเอียดบัตรคิวแล้ว",
      ticketPrinted: "กำลังพิมพ์บัตรคิวให้คุณ",
      loading: "กำลังโหลด..."
    }
  };

  const t = translations[language];

  const languageNames = {
    he: "עברית",
    en: "English",
    ar: "العربية",
    th: "ไทย"
  };

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
        // Queue not found, go back
        window.location.href = createPageUrl("Kiosk") + (branch_id ? `?branch_id=${branch_id}` : '');
        return;
      }
      
      setQueue(queueData);
    } catch (error) {
      console.error("Error loading queue:", error);
    }
  }, [queue_id, branch_id]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    if (branch_id) {
      loadActiveDepartments(branch_id);
    }
  }, [branch_id, loadActiveDepartments]);

  useEffect(() => {
    if (queue_id) {
      loadQueue();
    }
  }, [queue_id, loadQueue]);

  // Print ticket - thermal printer simulation
  const printTicket = (ticket) => {
    // Remove any existing print iframe
    const existingIframe = document.getElementById('print-iframe');
    if (existingIframe) {
      existingIframe.remove();
    }
    
    const createdTime = new Date().toLocaleTimeString('he-IL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const printContent = `<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="utf-8">
  <title>כרטיס תור</title>
  <style>
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      box-sizing: border-box;
    }
    
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: auto !important;
      overflow: hidden !important;
      direction: rtl;
    }
    
    body {
      font-weight: 700;
    }
    
    @page {
      size: 80mm auto !important;
      margin: 2mm !important;
    }
    
    @media print {
      html, body {
        width: 80mm !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      .container {
        width: 80mm !important;
        max-width: 80mm !important;
        margin: 0;
        padding: 5mm;
      }
    }
    
    .container {
      width: 80mm;
      max-width: 80mm;
      font-family: Arial, sans-serif;
      text-align: center;
      padding: 5mm;
      background: white;
    }
    
    .header { 
      font-size: 18px; 
      font-weight: 900; 
      margin-bottom: 8px;
      color: #000;
    }
    
    .queue-name { 
      font-size: 22px; 
      font-weight: 900; 
      margin: 10px 0;
      color: #000;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      padding: 8px 0;
    }
    
    .ticket-code { 
      font-size: 84px; 
      font-weight: 900; 
      margin: 15px 0;
      color: #000;
      line-height: 1;
    }
    
    .time { 
      font-size: 14px; 
      font-weight: 700;
      color: #000;
      margin: 8px 0;
    }
    
    .footer { 
      font-size: 12px; 
      font-weight: 700;
      margin-top: 10px;
      color: #000;
      line-height: 1.5;
    }
    
    .divider {
      border-top: 1px solid #000;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">שוק העיר</div>
    <div class="queue-name">${queue.name}</div>
    <div class="ticket-code">${String(ticket.ticket_number).padStart(3, '0')}</div>
    <div class="time">שעת הוצאה: ${createdTime}</div>
    <div class="divider"></div>
    <div class="footer">
      נא להמתין עד לקריאת מספרך<br/>
      תודה שבחרת בשוק העיר!
    </div>
  </div>
</body>
</html>`;
    
    // Create new hidden iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = 'none';
    
    document.body.appendChild(iframe);
    
    // Write full HTML document to iframe
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(printContent);
    iframe.contentWindow.document.close();
    
    // Wait for iframe load then print
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.print();
      }, 100);
    };
    
    // Cleanup after print using afterprint event
    iframe.contentWindow.addEventListener('afterprint', () => {
      setTimeout(() => {
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 500);
    });
    
    // Fallback cleanup if afterprint doesn't fire
    setTimeout(() => {
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 5000);
  };

  // Handle print
  const handlePrint = async () => {
    if (!queue_id) return;
    
    // Optimistic locking
    const lockKey = `ticket_creation_${queue_id}`;
    const now = Date.now();
    const existingLock = localStorage.getItem(lockKey);
    
    if (existingLock && (now - parseInt(existingLock)) < 3000) {
      console.log("Creation locked, skipping duplicate");
      return;
    }
    
    localStorage.setItem(lockKey, String(now));
    
    try {
      const currentQueue = await base44.entities.Queue.get(queue_id);
      const newSeq = (currentQueue.seq_counter || 0) + 1;
      
      await base44.entities.Queue.update(queue_id, {
        seq_counter: newSeq
      });
      
      const newTicket = await base44.entities.Ticket.create({
        branch_id: currentBranch.id,
        queue_id: queue_id,
        ticket_number: newSeq,
        state: "waiting",
        source: "kiosk"
      });
      
      setCurrentTicket(newTicket);
      setShowTicket(true);
      
      setTimeout(() => {
        printTicket(newTicket);
      }, 500);
      
      setTimeout(() => {
        setShowTicket(false);
        setCurrentTicket(null);
        localStorage.removeItem(lockKey);
      }, 5000);
      
    } catch (error) {
      console.error("Error creating ticket:", error);
      alert("שגיאה ביצירת כרטיס");
      localStorage.removeItem(lockKey);
    }
  };

  // Handle SMS ticket
  const handleSmsTicket = async () => {
    console.log("[SMS] Button clicked - starting flow");
    
    if (!phoneNumber || !queue_id) {
      alert("נא למלא את כל השדות");
      return;
    }
    
    console.log("[SMS] Validation passed, phone:", phoneNumber);
    
    const lockKey = `ticket_creation_${queue_id}`;
    const now = Date.now();
    const existingLock = localStorage.getItem(lockKey);
    
    if (existingLock && (now - parseInt(existingLock)) < 3000) {
      console.log("[SMS] Blocked by lock");
      return;
    }
    
    setSendingSms(true);
    localStorage.setItem(lockKey, String(now));
    
    try {
      console.log("[SMS] Getting queue...");
      const currentQueue = await base44.entities.Queue.get(queue_id);
      const newSeq = (currentQueue.seq_counter || 0) + 1;
      
      console.log("[SMS] Updating queue counter to:", newSeq);
      await base44.entities.Queue.update(queue_id, {
        seq_counter: newSeq
      });
      
      console.log("[SMS] Creating ticket...");
      const newTicket = await base44.entities.Ticket.create({
        branch_id: currentBranch.id,
        queue_id: queue_id,
        ticket_number: newSeq,
        state: "waiting",
        source: "kiosk",
        customer_phone: phoneNumber,
        join_club: joinClub
      });
      
      console.log("[SMS] Ticket created:", newTicket.id);

      // Try to send SMS, but don't fail if it doesn't work
      try {
        console.log("[SMS] Sending SMS...");
        const smsResult = await base44.functions.invoke('sendSms', {
          phoneNumber: phoneNumber,
          queueName: queue.name,
          ticketSeq: newSeq
        });
        console.log("[SMS] SMS result:", smsResult);
      } catch (smsError) {
        console.warn('[SMS] SMS sending failed, but ticket was created:', smsError);
      }

      console.log("[SMS] Showing success screen");
      setCurrentTicket(newTicket);
      setShowTicket(true);
      setSmsDialog(false);
      setPhoneNumber("");
      setJoinClub(false);

      // Print ticket
      setTimeout(() => {
        printTicket(newTicket);
      }, 500);
      
      setTimeout(() => {
        setShowTicket(false);
        setCurrentTicket(null);
        localStorage.removeItem(lockKey);
      }, 5000);
      
    } catch (error) {
      console.error("[SMS] Error creating SMS ticket:", error);
      alert("שגיאה ביצירת תור: " + error.message);
    } finally {
      setSendingSms(false);
      localStorage.removeItem(lockKey);
    }
  };

  const selectBranch = (branchId) => {
    window.location.href = createPageUrl("Kiosk") + "?branch_id=" + branchId;
  };

  const selectDepartment = (deptName) => {
    const deptQueue = activeDepartments.find(d => d.department === deptName);
    if (!deptQueue) return;
    
    // Find the queue
    base44.entities.Queue.list().then(allQueues => {
      const targetQueue = allQueues.find(q => 
        String(q.branch_id) === String(branch_id) && 
        q.name === deptName && 
        q.is_active
      );
      
      if (targetQueue) {
        window.location.href = createPageUrl("Kiosk") + "?branch_id=" + branch_id + "&queue_id=" + targetQueue.id;
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

  const LanguageSelector = () => {
    const [showDropdown, setShowDropdown] = useState(false);
    
    return (
      <div className="fixed top-6 left-6 z-50">
        <div className="relative">
          <Button
            onClick={() => setShowDropdown(!showDropdown)}
            className="text-white gap-2 shadow-lg"
            style={{ backgroundColor: '#41B649' }}
          >
            <Globe className="h-5 w-5" />
            {languageNames[language]}
          </Button>
          
          {showDropdown && (
            <div className="absolute top-12 left-0 bg-white rounded-lg shadow-xl border-2 overflow-hidden" style={{ borderColor: '#41B649' }}>
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
      </div>
    );
  };

  // Branch selection
  if (!branch_id) {
    return (
      <div className="min-h-screen p-8" dir={language === "he" || language === "ar" ? "rtl" : "ltr"} style={{ backgroundColor: '#E6F9EA' }}>
        <LanguageSelector />
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
                alt="שוק העיר"
                className="h-24 w-auto mx-auto mb-6"
              />
              <h1 className="text-5xl font-bold mb-4" style={{ color: '#1F5F25' }}>
                {t.selectBranch}
              </h1>
              <p className="text-xl text-gray-600">{t.selectBranchDesc}</p>
            </motion.div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            {branches.map((branch, index) => (
              <motion.div
                key={branch.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  onClick={() => selectBranch(branch.id)}
                  className="cursor-pointer hover:shadow-2xl p-6 bg-white transition-shadow"
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
        <LanguageSelector />
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
              alt="שוק העיר"
              className="h-16 w-auto mx-auto mb-4"
            />
            <h1 className="text-4xl font-bold mb-4" style={{ color: '#1F5F25' }}>
              {t.selectDepartment}
            </h1>
            <p className="text-xl text-gray-600">{t.selectDepartmentDesc}</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {activeDepartments.map((dept, index) => (
              <motion.div
                key={dept.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => selectDepartment(dept.department)}
                  className="w-full h-40 text-white shadow-xl"
                  style={{ backgroundColor: '#E52521', borderRadius: '1rem' }}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="text-4xl font-bold">{dept.department}</div>
                    <div className="text-base font-normal">{t.clickForTicket}</div>
                  </div>
                </Button>
              </motion.div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <Button
              onClick={() => window.location.href = createPageUrl("Kiosk")}
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

  // Ticket creation screen
  if (queue_id && queue) {
    return (
      <div className="min-h-screen p-8" 
           dir={language === "he" || language === "ar" ? "rtl" : "ltr"}
           style={{ backgroundColor: '#E6F9EA' }}>
        
        <LanguageSelector />
        
        {/* Back button - top right */}
        <div className="max-w-7xl mx-auto mb-4">
          <Button
            onClick={() => window.location.href = createPageUrl("Kiosk") + `?branch_id=${branch_id}`}
            variant="outline"
            size="sm"
            className="gap-2"
            style={{ borderColor: '#41B649', color: '#41B649' }}
          >
            {t.backToDepartment}
          </Button>
        </div>
        
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 120px)' }}>
          {/* Logo and Title */}
          <div className="text-center mb-16">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
              alt="שוק העיר"
              className="h-24 w-auto mx-auto mb-8"
            />
            <h1 className="text-7xl font-bold mb-4" style={{ color: '#1F5F25' }}>
              {queue.name}
            </h1>
            <p className="text-2xl text-gray-600">{t.chooseOption}</p>
            </div>
          
          {/* Two cards - horizontal layout */}
          <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl px-4">
            {/* Red card - Print ticket */}
            <motion.div 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }}
              className="cursor-pointer"
              onClick={handlePrint}
            >
              <div 
                className="relative h-80 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8"
                style={{ backgroundColor: '#E52521' }}
              >
                {/* Logo circle */}
                <div className="absolute top-8 bg-white rounded-full p-6 shadow-lg">
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
                    alt="שוק העיר"
                    className="h-16 w-auto"
                  />
                </div>
                
                {/* Text */}
                <div className="mt-auto text-center">
                  <h2 className="text-5xl font-bold text-white">
                    {t.getNumber}
                  </h2>
                </div>
              </div>
            </motion.div>
            
            {/* Green card - SMS ticket */}
            <motion.div 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }}
              className="cursor-pointer"
              onClick={() => setSmsDialog(true)}
            >
              <div 
                className="relative h-80 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8"
                style={{ backgroundColor: '#1F5F25' }}
              >
                {/* Logo circle */}
                <div className="absolute top-8 bg-white rounded-full p-6 shadow-lg">
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
                    alt="שוק העיר"
                    className="h-16 w-auto"
                  />
                </div>
                
                {/* Text */}
                <div className="mt-auto text-center">
                  <h2 className="text-5xl font-bold text-white">
                    {t.getNumberSMS}
                  </h2>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* SMS Dialog */}
        <Dialog open={smsDialog} onOpenChange={setSmsDialog}>
          <DialogContent dir={language === "he" || language === "ar" ? "rtl" : "ltr"} className="bg-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold" style={{ color: '#1F5F25' }}>
                {t.smsDialogTitle}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t.phoneNumber}</label>
                <Input
                  type="tel"
                  placeholder="05X-XXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="text-lg bg-white"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="join-club"
                  checked={joinClub}
                  onCheckedChange={setJoinClub}
                  style={{ borderColor: '#41B649' }}
                />
                <label htmlFor="join-club" className="text-sm cursor-pointer">
                  {t.joinClub}
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setSmsDialog(false)}
                disabled={sendingSms}
                style={{ borderColor: '#E52521', color: '#E52521' }}
              >
                {t.cancel}
              </Button>
              <Button
                onClick={handleSmsTicket}
                disabled={sendingSms}
                className="text-white"
                style={{ backgroundColor: '#41B649' }}
              >
                {sendingSms ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{t.sending}</span>
                  </div>
                ) : (
                  t.sendSMS
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Screen */}
        {showTicket && currentTicket && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="fixed inset-0 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999 }}
          >
            <Card className="bg-white p-12 text-center shadow-2xl max-w-lg">
              <div className="text-8xl mb-6">✅</div>
              <h2 className="text-4xl font-bold mb-4" style={{ color: '#1F5F25' }}>
                {t.ticketCreated}
              </h2>
              <div className="bg-gray-50 rounded-xl p-8 mb-6">
                <p className="text-xl mb-2 text-gray-600">{t.yourNumber}</p>
                <p className="text-9xl font-bold" style={{ color: '#E52521' }}>
                  {currentTicket.ticket_number}
                </p>
              </div>
              <p className="text-lg text-gray-600">
                {currentTicket.customer_phone 
                  ? t.smsSent
                  : t.ticketPrinted}
              </p>
            </Card>
          </motion.div>
        )}
      </div>
    );
  }

  return null;
}