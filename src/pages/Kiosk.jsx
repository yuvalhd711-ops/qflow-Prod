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

const translations = {
  he: {
    selectBranch: "בחר סניף",
    selectBranchDesc: "בחר את הסניף שבו אתה נמצא",
    selectDepartment: "בחר מחלקה",
    selectDepartmentDesc: "בחר את המחלקה שברצונך לקבל בה שירות",
    backToBranch: "חזרה לבחירת סניף",
    backToDepartment: "חזרה לבחירת מחלקה",
    getNumber: "קבלת מספר",
    getSMS: "קבלת מספר ב-SMS",
    selectOption: "בחר אפשרות לקבלת מספר תור",
    getSMSTitle: "קבל תור ב-SMS",
    phoneNumber: "מספר טלפון",
    joinClub: "רוצה להצטרף למועדון לקוחות שוק העיר? (הטבות והנחות)",
    cancel: "ביטול",
    sendSMS: "שלח לי תור ב-SMS",
    sending: "שולח...",
    ticketCreated: "כרטיס נוצר בהצלחה!",
    yourNumber: "מספר התור שלך:",
    smsSent: "נשלח אליך SMS עם פרטי התור",
    ticketPrinted: "הכרטיס מודפס עבורך",
    loading: "טוען...",
    clickToGetQueue: "לחץ לקבלת תור"
  },
  en: {
    selectBranch: "Select Branch",
    selectBranchDesc: "Select the branch where you are located",
    selectDepartment: "Select Department",
    selectDepartmentDesc: "Select the department you wish to receive service in",
    backToBranch: "Back to Branch Selection",
    backToDepartment: "Back to Department Selection",
    getNumber: "Get Number",
    getSMS: "Get Number via SMS",
    selectOption: "Select an option to receive a queue number",
    getSMSTitle: "Get Queue via SMS",
    phoneNumber: "Phone Number",
    joinClub: "Want to join Shuk Ha'ir customer club? (Benefits and discounts)",
    cancel: "Cancel",
    sendSMS: "Send me queue via SMS",
    sending: "Sending...",
    ticketCreated: "Ticket Created Successfully!",
    yourNumber: "Your queue number:",
    smsSent: "SMS with queue details has been sent to you",
    ticketPrinted: "Your ticket is being printed",
    loading: "Loading...",
    clickToGetQueue: "Click to get queue"
  }
};

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

  const t = translations[language];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#E6F9EA' }}>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 mx-auto mb-4" style={{ borderColor: '#41B649' }}></div>
          <p className="text-xl text-gray-600">{t.loading}</p>
        </motion.div>
      </div>
    );
  }

  // Branch selection
  if (!branch_id) {
    return (
      <div className="min-h-screen p-8" dir={language === 'he' ? 'rtl' : 'ltr'} style={{ backgroundColor: '#E6F9EA' }}>
        <div className="max-w-4xl mx-auto">
          {/* Language Selector */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex justify-end mb-4"
          >
            <Button
              onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}
              variant="outline"
              className="gap-2 bg-white"
              style={{ borderColor: '#41B649' }}
            >
              <Globe className="w-4 h-4" />
              {language === 'he' ? 'English' : 'עברית'}
            </Button>
          </motion.div>

          <div className="text-center mb-12">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
                alt="שוק העיר"
                className="h-24 w-auto mx-auto mb-6"
                initial={{ rotate: -10 }}
                animate={{ rotate: 0 }}
                transition={{ type: "spring", stiffness: 100 }}
              />
              <motion.h1 
                className="text-5xl font-bold mb-4" 
                style={{ color: '#1F5F25' }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {t.selectBranch}
              </motion.h1>
              <motion.p 
                className="text-xl text-gray-600"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {t.selectBranchDesc}
              </motion.p>
            </motion.div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            {branches.map((branch, index) => (
              <motion.div
                key={branch.id}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 + index * 0.1, type: "spring" }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Card 
                  onClick={() => selectBranch(branch.id)}
                  className="cursor-pointer hover:shadow-2xl p-6 bg-white transition-all duration-300"
                  style={{ borderColor: '#41B649', borderWidth: '2px' }}
                >
                  <motion.h2 
                    className="text-2xl font-bold text-center" 
                    style={{ color: '#1F5F25' }}
                    whileHover={{ scale: 1.1 }}
                  >
                    {branch.name}
                  </motion.h2>
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
      <div className="min-h-screen p-8" dir={language === 'he' ? 'rtl' : 'ltr'} style={{ backgroundColor: '#E6F9EA' }}>
        <div className="max-w-4xl mx-auto">
          {/* Language Selector */}
          <motion.div 
            initial={{ x: language === 'he' ? 20 : -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex justify-end mb-4"
          >
            <Button
              onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}
              variant="outline"
              className="gap-2 bg-white"
              style={{ borderColor: '#41B649' }}
            >
              <Globe className="w-4 h-4" />
              {language === 'he' ? 'English' : 'עברית'}
            </Button>
          </motion.div>

          <div className="text-center mb-12">
            <motion.img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
              alt="שוק העיר"
              className="h-16 w-auto mx-auto mb-4"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring" }}
            />
            <motion.h1 
              className="text-4xl font-bold mb-4" 
              style={{ color: '#1F5F25' }}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {t.selectDepartment}
            </motion.h1>
            <motion.p 
              className="text-xl text-gray-600"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {t.selectDepartmentDesc}
            </motion.p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {activeDepartments.map((dept, index) => (
              <motion.div
                key={dept.id}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 + index * 0.15, type: "spring", stiffness: 200 }}
                whileHover={{ scale: 1.08, rotate: 1 }}
                whileTap={{ scale: 0.92 }}
              >
                <Button
                  onClick={() => selectDepartment(dept.department)}
                  className="w-full h-40 text-white shadow-xl transition-all duration-300"
                  style={{ backgroundColor: '#E52521', borderRadius: '1rem' }}
                >
                  <div className="flex flex-col items-center gap-3">
                    <motion.div 
                      className="text-4xl font-bold"
                      whileHover={{ scale: 1.2 }}
                    >
                      {dept.department}
                    </motion.div>
                    <div className="text-base font-normal">{t.clickToGetQueue}</div>
                  </div>
                </Button>
              </motion.div>
            ))}
          </div>
          
          <motion.div 
            className="text-center mt-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={() => window.location.href = createPageUrl("Kiosk")}
              variant="outline"
              style={{ borderColor: '#41B649', color: '#41B649' }}
            >
              {language === 'he' ? '← ' : ''}{t.backToBranch}{language === 'en' ? ' ←' : ''}
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Ticket creation screen
  if (queue_id && queue) {
    return (
      <div className="min-h-screen p-8" 
           dir={language === 'he' ? 'rtl' : 'ltr'}
           style={{ backgroundColor: '#E6F9EA' }}>
        
        {/* Language and Back buttons */}
        <div className="max-w-7xl mx-auto mb-4 flex justify-between items-center">
          <motion.div
            initial={{ x: language === 'he' ? -20 : 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <Button
              onClick={() => window.location.href = createPageUrl("Kiosk") + `?branch_id=${branch_id}`}
              variant="outline"
              size="sm"
              className="gap-2"
              style={{ borderColor: '#41B649', color: '#41B649' }}
            >
              {language === 'he' ? '← ' : ''}{t.backToDepartment}{language === 'en' ? ' ←' : ''}
            </Button>
          </motion.div>
          
          <motion.div
            initial={{ x: language === 'he' ? 20 : -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <Button
              onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}
              variant="outline"
              size="sm"
              className="gap-2 bg-white"
              style={{ borderColor: '#41B649' }}
            >
              <Globe className="w-4 h-4" />
              {language === 'he' ? 'English' : 'עברית'}
            </Button>
          </motion.div>
        </div>
        
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 120px)' }}>
          {/* Logo and Title */}
          <motion.div 
            className="text-center mb-16"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
              alt="שוק העיר"
              className="h-24 w-auto mx-auto mb-8"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            />
            <motion.h1 
              className="text-7xl font-bold mb-4" 
              style={{ color: '#1F5F25' }}
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              {queue.name}
            </motion.h1>
            <motion.p 
              className="text-2xl text-gray-600"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {t.selectOption}
            </motion.p>
          </motion.div>
          
          {/* Two cards - horizontal layout */}
          <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl px-4">
            {/* Red card - Print ticket */}
            <motion.div 
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
              whileHover={{ scale: 1.05, boxShadow: "0 25px 50px -12px rgba(229, 37, 33, 0.5)" }} 
              whileTap={{ scale: 0.95 }}
              className="cursor-pointer"
              onClick={handlePrint}
            >
              <div 
                className="relative h-80 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 transition-all duration-300"
                style={{ backgroundColor: '#E52521' }}
              >
                {/* Logo circle */}
                <motion.div 
                  className="absolute top-8 bg-white rounded-full p-6 shadow-lg"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
                    alt="שוק העיר"
                    className="h-16 w-auto"
                  />
                </motion.div>
                
                {/* Text */}
                <motion.div 
                  className="mt-auto text-center"
                  whileHover={{ scale: 1.1 }}
                >
                  <h2 className="text-5xl font-bold text-white">
                    {t.getNumber}
                  </h2>
                </motion.div>
              </div>
            </motion.div>
            
            {/* Green card - SMS ticket */}
            <motion.div 
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
              whileHover={{ scale: 1.05, boxShadow: "0 25px 50px -12px rgba(31, 95, 37, 0.5)" }} 
              whileTap={{ scale: 0.95 }}
              className="cursor-pointer"
              onClick={() => setSmsDialog(true)}
            >
              <div 
                className="relative h-80 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 transition-all duration-300"
                style={{ backgroundColor: '#1F5F25' }}
              >
                {/* Logo circle */}
                <motion.div 
                  className="absolute top-8 bg-white rounded-full p-6 shadow-lg"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
                    alt="שוק העיר"
                    className="h-16 w-auto"
                  />
                </motion.div>
                
                {/* Text */}
                <motion.div 
                  className="mt-auto text-center"
                  whileHover={{ scale: 1.1 }}
                >
                  <h2 className="text-5xl font-bold text-white">
                    {t.getSMS}
                  </h2>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* SMS Dialog */}
        <AnimatePresence>
          {smsDialog && (
            <Dialog open={smsDialog} onOpenChange={setSmsDialog}>
              <DialogContent dir={language === 'he' ? 'rtl' : 'ltr'} className="bg-white max-w-md">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                >
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold" style={{ color: '#1F5F25' }}>
                      {t.getSMSTitle}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <label className="text-sm font-medium mb-2 block">{t.phoneNumber}</label>
                      <Input
                        type="tel"
                        placeholder="05X-XXXXXXX"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="text-lg bg-white"
                        dir="ltr"
                      />
                    </motion.div>

                    <motion.div 
                      className="flex items-center space-x-2 space-x-reverse"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Checkbox
                        id="join-club"
                        checked={joinClub}
                        onCheckedChange={setJoinClub}
                        style={{ borderColor: '#41B649' }}
                      />
                      <label htmlFor="join-club" className="text-sm cursor-pointer">
                        {t.joinClub}
                      </label>
                    </motion.div>
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
                </motion.div>
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>

        {/* Success Screen */}
        <AnimatePresence>
          {showTicket && currentTicket && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999 }}
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <Card className="bg-white p-12 text-center shadow-2xl max-w-lg">
                  <motion.div 
                    className="text-8xl mb-6"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                  >
                    ✅
                  </motion.div>
                  <motion.h2 
                    className="text-4xl font-bold mb-4" 
                    style={{ color: '#1F5F25' }}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {t.ticketCreated}
                  </motion.h2>
                  <motion.div 
                    className="bg-gray-50 rounded-xl p-8 mb-6"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <p className="text-xl mb-2 text-gray-600">{t.yourNumber}</p>
                    <motion.p 
                      className="text-9xl font-bold" 
                      style={{ color: '#E52521' }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
                    >
                      {currentTicket.ticket_number}
                    </motion.p>
                  </motion.div>
                  <motion.p 
                    className="text-lg text-gray-600"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {currentTicket.customer_phone 
                      ? t.smsSent
                      : t.ticketPrinted}
                  </motion.p>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return null;
}