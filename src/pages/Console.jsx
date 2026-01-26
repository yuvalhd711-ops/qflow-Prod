import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneCall, CheckCircle, XCircle, SkipForward, ArrowRightLeft, RotateCcw, Volume2, Coffee, History, Search } from "lucide-react";
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
  const [searchSeq, setSearchSeq] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const [foundTicket, setFoundTicket] = useState(null);
  const [historySearchSeq, setHistorySearchSeq] = useState("");

  const urlParams = new URLSearchParams(window.location.search);
  const branch_id = urlParams.get('branch_id');
  const queue_id = urlParams.get('queue_id');

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
      alert("אין כרטיסים ממתינים");
      return;
    }
    
    try {
      await base44.entities.Ticket.update(nextTicket.id, {
        state: "in_service",
        called_at: new Date().toISOString()
      });
      
      broadcastTicketCall(nextTicket, queue.name);
      
      base44.functions.invoke('notifyTwoBefore', { queueId: queue_id }).catch(err => {
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
        finished_at: finishedAt.toISOString()
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
        alert("המחלקה אינה זמינה");
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

  // Search ticket
  const searchTicket = async () => {
    if (!searchSeq || !queue_id) return;
    
    const allTickets = await base44.entities.Ticket.filter({ queue_id });
    const ticket = allTickets.find(t => String(t.ticket_number) === String(searchSeq));
    
    if (ticket) {
      setFoundTicket(ticket);
      const statusText = {
        waiting: "ממתין",
        called: "נקרא",
        in_service: "בשירות",
        served: "טופל",
        skipped: "דולג",
        cancelled: "בוטל"
      }[ticket.state];
      
      setSearchMessage(`✓ תור ${ticket.ticket_number} נמצא (${statusText})`);
    } else {
      setSearchMessage(`✗ תור ${searchSeq} לא נמצא`);
      setFoundTicket(null);
    }
  };

  // Promote ticket
  const promoteTicket = async () => {
    if (!foundTicket || foundTicket.state !== "waiting") return;
    
    const allWaitingTickets = await base44.entities.Ticket.filter({ 
      queue_id, 
      state: "waiting" 
    });
    
    const currentMinSeq = Math.min(...allWaitingTickets.map(t => t.ticket_number));
    
    await base44.entities.Ticket.update(foundTicket.id, {
      ticket_number: currentMinSeq - 1
    });
    
    setSearchSeq("");
    setSearchMessage("");
    setFoundTicket(null);
    loadData();
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
    if (!confirm("האם אתה בטוח שברצונך למחוק את כל התורים?")) {
      return;
    }
    try {
      await base44.functions.invoke('clearQueue', { queue_id });
      alert("התורים נוקו בהצלחה!");
      await loadData();
    } catch (error) {
      alert("שגיאה: " + (error.message || "לא ניתן לנקות תורים"));
    }
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
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
              alt="שוק העיר"
              className="h-16 w-auto mx-auto mb-4"
            />
            <h1 className="text-4xl font-bold mb-4" style={{ color: '#1F5F25' }}>
              קונסולת עובד - בחר סניף
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
      <div className="min-h-screen p-8" dir="rtl" style={{ backgroundColor: '#E6F9EA' }}>
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
            <p className="text-xl text-gray-600">קונסולת עובד - בחר מחלקה</p>
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
              ← חזרה לבחירת סניף
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Console screen
  return (
    <div className="min-h-screen p-6" dir="rtl" style={{ backgroundColor: '#E6F9EA' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex-1 text-center">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
              alt="שוק העיר"
              className="h-12 w-auto mx-auto mb-2"
            />
            <h1 className="text-3xl font-bold" style={{ color: '#111111' }}>
              {queue?.name}
            </h1>
            <p className="text-gray-600">קונסולת עובד</p>
          </div>
          
          <div className="flex gap-2 flex-wrap justify-center">
            <Button 
              onClick={() => window.location.href = createPageUrl("Console") + `?branch_id=${branch_id}`}
              variant="outline"
            >
              ← יציאה למחלקות
            </Button>
            <Button 
              onClick={clearAllTickets} 
              variant="outline" 
              style={{ borderColor: '#E52521', color: '#E52521' }}
            >
              🗑️ נקה תורים
            </Button>
            <Button 
              onClick={() => setOnBreak(!onBreak)}
              variant={onBreak ? "default" : "outline"}
              style={onBreak ? { backgroundColor: '#41B649', color: 'white' } : {}}
            >
              <Coffee className="w-4 h-4 ml-2" />
              {onBreak ? "חזור לעבודה" : "הפסקה"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto mb-6">
            <TabsTrigger value="current">תור נוכחי</TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 ml-2" />
              היסטוריה
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="current">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Search and promote */}
              <Card className="bg-white shadow-md" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                <CardHeader style={{ backgroundColor: '#E6F9EA' }}>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    חיפוש וקידום תור
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="הזן מספר תור..."
                      value={searchSeq}
                      onChange={(e) => setSearchSeq(e.target.value)}
                      className="flex-1 text-lg"
                      dir="ltr"
                    />
                    <Button 
                      onClick={searchTicket} 
                      className="gap-2 text-white"
                      style={{ backgroundColor: '#41B649' }}
                    >
                      חפש
                    </Button>
                  </div>
                  
                  {searchMessage && (
                    <div className={`p-3 rounded-lg mt-3 ${
                      searchMessage.includes('✓') 
                        ? 'bg-green-50 text-green-800' 
                        : 'bg-red-50 text-red-800'
                    }`}>
                      {searchMessage}
                    </div>
                  )}
                  
                  {foundTicket && foundTicket.state === "waiting" && (
                    <Button 
                      onClick={promoteTicket} 
                      className="w-full mt-3 text-white"
                      style={{ backgroundColor: '#E52521' }}
                    >
                      ⬆️ קדם לתחילת התור
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Current ticket */}
              <Card className="bg-white shadow-md" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                <CardHeader style={{ backgroundColor: '#E6F9EA' }}>
                  <CardTitle>כרטיס נוכחי</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {currentTicket ? (
                    <div className="space-y-6">
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="text-center p-8 rounded-xl"
                        style={{ backgroundColor: '#E6F9EA' }}
                      >
                        <div className="text-6xl font-bold mb-2" style={{ color: '#E52521' }}>
                          {currentTicket.ticket_number}
                        </div>
                        <div className="text-lg font-medium">בשירות</div>
                      </motion.div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          onClick={recall} 
                          className="gap-2 text-white"
                          style={{ backgroundColor: '#E52521' }}
                        >
                          <Volume2 className="w-4 h-4" />
                          קריאה חוזרת
                        </Button>
                        
                        <Button 
                          onClick={finishService} 
                          className="gap-2 text-white"
                          style={{ backgroundColor: '#41B649' }}
                        >
                          <CheckCircle className="w-4 h-4" />
                          סיים שירות
                        </Button>
                        
                        <Button 
                          onClick={skipTicket} 
                          className="gap-2 text-white"
                          style={{ backgroundColor: '#E52521' }}
                        >
                          <SkipForward className="w-4 h-4" />
                          דלג
                        </Button>
                        
                        <Button 
                          onClick={customerLeft} 
                          className="gap-2 text-white"
                          style={{ backgroundColor: '#E52521' }}
                        >
                          <XCircle className="w-4 h-4" />
                          לקוח עזב
                        </Button>
                        
                        <Button 
                          onClick={requeueTicket} 
                          className="gap-2 text-white"
                          style={{ backgroundColor: '#41B649' }}
                        >
                          <RotateCcw className="w-4 h-4" />
                          החזר לתור
                        </Button>
                        
                        <Button 
                          onClick={() => setTransferDialog(true)} 
                          className="gap-2 text-white"
                          style={{ backgroundColor: '#E52521' }}
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                          העבר
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-600 mb-6">אין כרטיס נוכחי</p>
                      <Button 
                        onClick={callNext} 
                        size="lg" 
                        className="gap-2 text-white"
                        style={{ backgroundColor: '#E52521' }}
                        disabled={waitingTickets.length === 0}
                      >
                        <PhoneCall className="w-5 h-5" />
                        קרא הבא
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Waiting queue */}
              <Card className="bg-white shadow-md" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                <CardHeader style={{ backgroundColor: '#E6F9EA' }}>
                  <CardTitle>ממתינים ({waitingTickets.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {waitingTickets.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        אין כרטיסים ממתינים
                      </div>
                    ) : (
                      waitingTickets.slice(0, 10).map((ticket, idx) => (
                        <div key={ticket.id} className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: '#41B649' }}
                          >
                            <span className="text-white font-bold text-sm">{idx + 1}</span>
                          </div>
                          <Card className="flex-1 p-4 bg-white border-gray-200">
                            <span className="text-2xl font-bold" style={{ color: '#E52521' }}>
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
            <Card className="bg-white shadow-md max-w-3xl mx-auto" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
              <CardHeader style={{ backgroundColor: '#E6F9EA' }}>
                <CardTitle>היסטוריית תורים להיום</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <Input
                  type="number"
                  placeholder="חפש מספר תור..."
                  value={historySearchSeq}
                  onChange={(e) => setHistorySearchSeq(e.target.value)}
                  className="mb-4"
                  dir="ltr"
                />
                
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {searchHistoryTicket().length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      אין תוצאות
                    </div>
                  ) : (
                    searchHistoryTicket().map((ticket) => {
                      const statusColors = {
                        served: { bg: '#E6F9EA', text: '#41B649', label: 'טופל' },
                        cancelled: { bg: '#fee2e2', text: '#dc2626', label: 'בוטל' },
                        skipped: { bg: '#fef3c7', text: '#d97706', label: 'דולג' }
                      };
                      const status = statusColors[ticket.state] || statusColors.served;
                      
                      return (
                        <Card 
                          key={ticket.id} 
                          className="p-4" 
                          style={{ backgroundColor: status.bg }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="text-3xl font-bold" style={{ color: '#E52521' }}>
                                {ticket.ticket_number}
                              </div>
                              <div>
                                <Badge 
                                  style={{ 
                                    backgroundColor: status.bg, 
                                    color: status.text,
                                    borderColor: status.text,
                                    borderWidth: '1px'
                                  }}
                                >
                                  {status.label}
                                </Badge>
                                <p className="text-sm text-gray-600 mt-1">
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
          <DialogContent dir="rtl" className="bg-white">
            <DialogHeader>
              <DialogTitle>העברת כרטיס למחלקה אחרת</DialogTitle>
            </DialogHeader>
            
            <div className="py-4">
              <label className="text-sm font-medium mb-2 block">בחר מחלקת יעד:</label>
              <Select value={targetDepartmentName} onValueChange={setTargetDepartmentName}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר מחלקה" />
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
                ביטול
              </Button>
              <Button
                onClick={transferTicket}
                className="text-white"
                style={{ backgroundColor: '#41B649' }}
                disabled={!targetDepartmentName}
              >
                העבר
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}