import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { Printer, Smartphone } from "lucide-react";
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

  // Print ticket
  const printTicket = (ticket) => {
    const printWindow = window.open('', '_blank', 'width=300,height=400');
    
    const ticketHTML = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>כרטיס תור</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 20px;
            direction: rtl;
          }
          .ticket-number { 
            font-size: 120px; 
            font-weight: bold; 
            margin: 30px 0;
            color: #E52521;
          }
          .queue-name { 
            font-size: 32px; 
            font-weight: bold; 
            margin: 20px 0;
            color: #1F5F25;
          }
          .header { 
            font-size: 28px; 
            font-weight: bold; 
            margin-bottom: 10px;
          }
          .footer { 
            font-size: 18px; 
            margin-top: 30px; 
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">שוק העיר</div>
        <div class="queue-name">${queue.name}</div>
        <div class="ticket-number">${ticket.ticket_number}</div>
        <div class="footer">
          נא להמתין עד לקריאת מספרך<br/>
          תודה שבחרת בשוק העיר!
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(() => window.close(), 1000);
          };
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(ticketHTML);
    printWindow.document.close();
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
          <p className="text-xl text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  // Branch selection
  if (!branch_id) {
    return (
      <div className="min-h-screen p-8" dir="rtl" style={{ backgroundColor: '#E6F9EA' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
                alt="שוק העיר"
                className="h-24 w-auto mx-auto mb-6"
              />
              <h1 className="text-5xl font-bold mb-4" style={{ color: '#1F5F25' }}>
                בחר סניף
              </h1>
              <p className="text-xl text-gray-600">בחר את הסניף שבו אתה נמצא</p>
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
      <div className="min-h-screen p-8" dir="rtl" style={{ backgroundColor: '#E6F9EA' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
              alt="שוק העיר"
              className="h-16 w-auto mx-auto mb-4"
            />
            <h1 className="text-4xl font-bold mb-4" style={{ color: '#1F5F25' }}>
              בחר מחלקה
            </h1>
            <p className="text-xl text-gray-600">בחר את המחלקה שברצונך לקבל בה שירות</p>
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
                    <div className="text-base font-normal">לחץ לקבלת תור</div>
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
              ← חזרה לבחירת סניף
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Ticket creation screen
  if (queue_id && queue) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" 
           dir="rtl" 
           style={{ backgroundColor: '#E6F9EA' }}>
        
        <div className="text-center mb-12">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
            alt="שוק העיר"
            className="h-20 w-auto mx-auto mb-6"
          />
          <h1 className="text-6xl font-bold mb-2" style={{ color: '#1F5F25' }}>
            {queue.name}
          </h1>
          <p className="text-2xl text-gray-700">מחכים לך!</p>
        </div>
        
        <div className="grid gap-6 w-full max-w-2xl">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={handlePrint}
              className="w-full h-48 text-white shadow-2xl"
              style={{ backgroundColor: '#E52521', borderRadius: '1.5rem' }}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="text-7xl">🎟️</div>
                <div className="text-4xl font-bold">קבל כרטיס מודפס</div>
                <div className="text-lg font-normal">
                  לחץ כאן לקבלת כרטיס מודפס עם מספר התור שלך
                </div>
              </div>
            </Button>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={() => setSmsDialog(true)}
              className="w-full h-48 text-white shadow-2xl"
              style={{ backgroundColor: '#41B649', borderRadius: '1.5rem' }}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="text-7xl">📱</div>
                <div className="text-4xl font-bold">קבל תור ב-SMS</div>
                <div className="text-lg font-normal">
                  קבל את מספר התור לנייד והמשך לקניות
                </div>
              </div>
            </Button>
          </motion.div>
        </div>
        
        <Button
          onClick={() => window.location.href = createPageUrl("Kiosk") + `?branch_id=${branch_id}`}
          variant="outline"
          className="mt-8 gap-2"
          style={{ borderColor: '#41B649', color: '#41B649' }}
        >
          ← חזרה למחלקות
        </Button>

        {/* SMS Dialog */}
        <Dialog open={smsDialog} onOpenChange={setSmsDialog}>
          <DialogContent dir="rtl" className="bg-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold" style={{ color: '#1F5F25' }}>
                קבל תור ב-SMS
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">מספר טלפון</label>
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
                  רוצה להצטרף למועדון לקוחות שוק העיר? (הטבות והנחות)
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
                ביטול
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
                    <span>שולח...</span>
                  </div>
                ) : (
                  "שלח לי תור ב-SMS"
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
                כרטיס נוצר בהצלחה!
              </h2>
              <div className="bg-gray-50 rounded-xl p-8 mb-6">
                <p className="text-xl mb-2 text-gray-600">מספר התור שלך:</p>
                <p className="text-9xl font-bold" style={{ color: '#E52521' }}>
                  {currentTicket.ticket_number}
                </p>
              </div>
              <p className="text-lg text-gray-600">
                {currentTicket.customer_phone 
                  ? "נשלח אליך SMS עם פרטי התור" 
                  : "הכרטיס מודפס עבורך"}
              </p>
            </Card>
          </motion.div>
        )}
      </div>
    );
  }

  return null;
}