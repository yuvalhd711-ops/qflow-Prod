import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Clock } from "lucide-react";
import { useBdsSubscription } from "@/components/utils/bdsSync";
import moment from "moment";

export default function Display() {
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState(null);
  const [activeDepartments, setActiveDepartments] = useState([]);
  const [deptData, setDeptData] = useState({});
  const [loading, setLoading] = useState(true);
  const [promptAudio, setPromptAudio] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [currentTime, setCurrentTime] = useState(moment().format('HH:mm:ss'));
  const [currentDate, setCurrentDate] = useState(moment().format('DD/MM/YYYY'));
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  const marketingMessages = [
    { title: "ברוכים הבאים לשוק העיר!", text: "איכות ושירות ללא פשרות" },
    { title: "🛒 מבצעים חמים!", text: "עקבו אחר המבצעים שלנו בכל סניף" },
    { title: "🥩 קצביית פרימיום", text: "בשר טרי מהמשובחים בשוק" },
    { title: "🐟 מעדניית דגים", text: "דגים טריים מדי יום" },
    { title: "💚 הצטרפו למועדון הלקוחות", text: "הטבות ומבצעים בלעדיים" }
  ];

  // Get URL params
  const urlParams = new URLSearchParams(window.location.search);
  const branch_id = urlParams.get('branch_id');
  const enableAnnouncements = true; // Always enabled for all branches

  // Load branches
  const loadBranches = useCallback(async () => {
    try {
      const list = await base44.entities.Branch.list();
      setBranches(list);
      
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

  // Load active departments for branch
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

  // Load queue data for all departments
  const loadQueueData = useCallback(async (branchId) => {
    try {
      const allQueues = await base44.entities.Queue.list();
      const branchQueues = allQueues.filter(q => 
        String(q.branch_id) === String(branchId) && q.is_active
      );

      const allTickets = await base44.entities.Ticket.list();
      
      const newDeptData = {};
      for (const queue of branchQueues) {
        const queueTickets = allTickets.filter(t => t.queue_id === queue.id);
        
        // Get current ticket (called or in_service)
        const current = queueTickets
          .filter(t => t.state === "called" || t.state === "in_service")
          .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))[0];
        
        // Get next 3 waiting tickets
        const upcoming = queueTickets
          .filter(t => t.state === "waiting")
          .sort((a, b) => a.ticket_number - b.ticket_number)
          .slice(0, 3);
        
        // Calculate estimated wait time
        const avgServiceTime = queue.avg_service_time_seconds || 180; // Default 3 minutes
        
        newDeptData[queue.name] = {
          queueId: queue.id,
          queueName: queue.name,
          current: current || null,
          upcoming: upcoming,
          avgServiceTime: avgServiceTime
        };
      }
      
      setDeptData(newDeptData);
    } catch (error) {
      console.error("Error loading queue data:", error);
    }
  }, []);

  // Hebrew speech synthesis
  const speakHebrew = useCallback((text) => {
    if (!audioEnabled) return;
    
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'he-IL';
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Speech error:', error);
    }
  }, [audioEnabled]);

  // Listen to ticket call events from localStorage
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'ticket_call_event' && e.newValue) {
        try {
          const event = JSON.parse(e.newValue);
          const text = `תור מספר ${event.ticketSeq} במחלקת ${event.queueName}`;
          speakHebrew(text);
        } catch (error) {
          console.error('Error parsing call event:', error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [enableAnnouncements, speakHebrew]);

  // Auto-announce when current ticket changes
  useEffect(() => {
    if (!audioEnabled || !enableAnnouncements) return;
    
    // Track previous tickets to detect changes
    const previousTickets = {};
    
    Object.entries(deptData).forEach(([deptName, data]) => {
      if (data.current) {
        const currentTicketNumber = data.current.ticket_number;
        const prevTicketNumber = previousTickets[deptName];
        
        // Only announce if ticket changed (not on initial load)
        if (prevTicketNumber !== undefined && prevTicketNumber !== currentTicketNumber) {
          const text = `תור מספר ${String(currentTicketNumber).padStart(3, '0')} במחלקת ${deptName}`;
          speakHebrew(text);
        }
        
        previousTickets[deptName] = currentTicketNumber;
      }
    });
  }, [deptData, audioEnabled, enableAnnouncements, speakHebrew]);

  // Initial load
  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  // Update time and date every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(moment().format('HH:mm:ss'));
      setCurrentDate(moment().format('DD/MM/YYYY'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Rotate marketing messages every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % marketingMessages.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [marketingMessages.length]);

  // Polling and real-time updates
  useEffect(() => {
    if (!branch_id) return;

    loadActiveDepartments(branch_id);
    loadQueueData(branch_id);
    
    const interval = setInterval(() => {
      loadActiveDepartments(branch_id);
      loadQueueData(branch_id);
    }, 10000); // Every 10 seconds
    
    return () => clearInterval(interval);
  }, [branch_id, loadActiveDepartments, loadQueueData]);

  // Real-time BDS subscription
  useBdsSubscription(({ scope, branchId }) => {
    if (scope === "all" || String(branchId) === String(branch_id)) {
      (async () => {
        await loadActiveDepartments(branch_id);
        await loadQueueData(branch_id);
      })();
    }
  });

  // Show audio prompt on first interaction
  useEffect(() => {
    if (enableAnnouncements && !audioEnabled && branch_id) {
      const timer = setTimeout(() => setPromptAudio(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [enableAnnouncements, audioEnabled, branch_id]);

  const handleBranchSelect = (branchId) => {
    window.location.href = window.location.pathname + "?branch_id=" + branchId;
  };

  const handleEnableAudio = () => {
    setAudioEnabled(true);
    setPromptAudio(false);
    speakHebrew("מערכת הקראות קולית הופעלה");
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

  // Branch selection screen
  if (!branch_id) {
    return (
      <div className="min-h-screen p-6" dir="rtl" style={{ backgroundColor: '#E6F9EA' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
                alt="שוק העיר"
                className="h-32 w-auto mx-auto mb-6"
              />
              <h1 className="text-6xl font-bold mb-4" style={{ color: '#1F5F25' }}>
                מסך תצוגה
              </h1>
              <p className="text-2xl text-gray-600">בחר את הסניף שברצונך להציג</p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {branches.filter(b => b.is_active).map((branch, index) => (
              <motion.div
                key={branch.id}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Card 
                  className="bg-white shadow-xl cursor-pointer hover:shadow-2xl transition-shadow"
                  style={{ borderColor: '#41B649', borderWidth: '3px' }}
                  onClick={() => handleBranchSelect(branch.id)}
                >
                  <CardContent className="p-8 text-center">
                    <h2 className="text-3xl font-bold" style={{ color: '#1F5F25' }}>
                      {branch.name}
                    </h2>
                    {branch.address && (
                      <p className="text-gray-600 mt-2">{branch.address}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Display screen with departments
  return (
    <div className="min-h-screen p-6" dir="rtl" style={{ backgroundColor: '#E6F9EA' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            {/* Digital Clock - Left Side */}
            <div className="flex-1 text-right">
              <div className="inline-flex flex-col items-end bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: '#41B649', borderWidth: '3px', borderStyle: 'solid' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-6 h-6" style={{ color: '#41B649' }} />
                </div>
                <div className="font-mono text-5xl font-bold tracking-wider" style={{ color: '#E52521' }}>
                  {currentTime}
                </div>
                <div className="text-xl font-semibold mt-1" style={{ color: '#1F5F25' }}>
                  {currentDate}
                </div>
              </div>
            </div>

            {/* Center Logo and Title */}
            <div className="flex-1 text-center">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
                alt="שוק העיר"
                className="h-32 w-auto mx-auto mb-4"
              />
              <h1 className="text-7xl font-black mb-3" style={{ color: '#1F5F25', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }}>
                שוק העיר
              </h1>
              <h2 className="text-5xl font-bold mb-2" style={{ color: '#E52521' }}>
                {currentBranch?.name}
              </h2>
              <p className="text-3xl font-semibold" style={{ color: '#41B649' }}>מסך תצוגת תורים</p>
            </div>

            {/* Audio Status - Right Side */}
            <div className="flex-1 text-left">
              {enableAnnouncements && (
                <div className="inline-flex flex-col items-start bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: '#41B649', borderWidth: '3px', borderStyle: 'solid' }}>
                  {audioEnabled ? (
                    <>
                      <Volume2 className="w-8 h-8 mb-2" style={{ color: '#41B649' }} />
                      <span className="text-lg font-semibold" style={{ color: '#41B649' }}>הקראות קוליות</span>
                      <span className="text-sm font-medium" style={{ color: '#41B649' }}>מופעלות</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-8 h-8 mb-2 text-gray-500" />
                      <span className="text-lg font-semibold text-gray-500">הקראות קוליות</span>
                      <span className="text-sm font-medium text-gray-500">כבויות</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid: Marketing Panel + Department Cards */}
        <div className="grid grid-cols-12 gap-6">
          {/* Marketing Panel - Left Side */}
          <div className="col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentMessageIndex}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.8 }}
                className="sticky top-6"
              >
                <Card 
                  className="bg-gradient-to-br from-white to-gray-50 shadow-2xl" 
                  style={{ borderColor: '#41B649', borderWidth: '4px' }}
                >
                  <CardContent className="p-8 text-center">
                    <div className="mb-6">
                      <div className="text-6xl mb-4">
                        {currentMessageIndex === 0 ? '🌟' : 
                         currentMessageIndex === 1 ? '🛒' :
                         currentMessageIndex === 2 ? '🥩' :
                         currentMessageIndex === 3 ? '🐟' : '💚'}
                      </div>
                      <h3 className="text-4xl font-black mb-6" style={{ color: '#1F5F25' }}>
                        {marketingMessages[currentMessageIndex].title}
                      </h3>
                      <p className="text-2xl font-semibold text-gray-700 leading-relaxed">
                        {marketingMessages[currentMessageIndex].text}
                      </p>
                    </div>
                    
                    {/* Progress Dots */}
                    <div className="flex justify-center gap-2 mt-8">
                      {marketingMessages.map((_, idx) => (
                        <div
                          key={idx}
                          className="w-3 h-3 rounded-full transition-all duration-300"
                          style={{ 
                            backgroundColor: idx === currentMessageIndex ? '#41B649' : '#D1D5DB'
                          }}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Info Card */}
                <Card 
                  className="bg-white shadow-xl mt-6" 
                  style={{ borderColor: '#E52521', borderWidth: '3px' }}
                >
                  <CardContent className="p-6 text-center">
                    <p className="text-xl font-bold mb-2" style={{ color: '#E52521' }}>
                      שעות פתיחה
                    </p>
                    <p className="text-lg text-gray-700">
                      ראשון - חמישי: 8:00 - 22:00
                    </p>
                    <p className="text-lg text-gray-700">
                      שישי - שבת: 8:00 - 15:00
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Department Cards - Right Side */}
          <div className="col-span-9">
            <AnimatePresence mode="wait">
              {Object.keys(deptData).length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-20"
                >
                  <p className="text-3xl text-gray-500">אין מחלקות פעילות כרגע</p>
                </motion.div>
              ) : (
                <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {Object.entries(deptData).map(([deptName, data], index) => (
                <motion.div
                  key={deptName}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.15 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card 
                    className="bg-white shadow-2xl hover:shadow-3xl transition-shadow" 
                    style={{ borderColor: '#41B649', borderWidth: '4px' }}
                  >
                    {/* Department Header */}
                    <CardHeader style={{ backgroundColor: '#E6F9EA', borderBottom: '3px solid #41B649' }}>
                      <CardTitle className="text-5xl font-black text-center py-4" style={{ color: '#1F5F25', textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>
                        {deptName}
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="p-8">
                      {/* Current Ticket */}
                      {data.current ? (
                        <motion.div
                          animate={{ 
                            scale: [1, 1.03, 1],
                            boxShadow: [
                              '0 10px 30px rgba(229, 37, 33, 0.3)',
                              '0 15px 40px rgba(229, 37, 33, 0.5)',
                              '0 10px 30px rgba(229, 37, 33, 0.3)'
                            ]
                          }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                          className="mb-6 p-8 rounded-3xl text-center relative overflow-hidden"
                          style={{ backgroundColor: '#E52521' }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent" />
                          <p className="text-white text-3xl mb-3 font-bold tracking-wide">תור נוכחי</p>
                          <p className="text-white text-8xl font-black leading-none relative z-10" style={{ textShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
                            {String(data.current.ticket_number).padStart(3, '0')}
                          </p>
                        </motion.div>
                      ) : (
                        <div className="mb-6 p-8 rounded-3xl text-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <p className="text-gray-500 text-2xl font-semibold">אין תור נוכחי</p>
                        </div>
                      )}
                      
                      {/* Upcoming Tickets */}
                      <div>
                        <h3 className="text-2xl font-bold mb-3 text-center" style={{ color: '#1F5F25' }}>
                          תורים ממתינים
                        </h3>
                        {data.upcoming.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-gray-500 text-lg">אין תורים ממתינים</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {data.upcoming.map((ticket, idx) => {
                              const estimatedWaitMinutes = Math.ceil((idx + 1) * data.avgServiceTime / 60);
                              return (
                                <motion.div
                                  key={ticket.id}
                                  initial={{ x: -30, opacity: 0 }}
                                  animate={{ x: 0, opacity: 1 }}
                                  transition={{ delay: 0.3 + idx * 0.15, type: "spring" }}
                                  className="flex items-center justify-between gap-3 p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow"
                                  style={{ backgroundColor: '#E6F9EA' }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div 
                                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
                                      style={{ backgroundColor: '#41B649' }}
                                    >
                                      <span className="text-white font-black text-base">{idx + 1}</span>
                                    </div>
                                    <span className="text-4xl font-extrabold" style={{ color: '#1F5F25' }}>
                                      {String(ticket.ticket_number).padStart(3, '0')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg" style={{ backgroundColor: 'white' }}>
                                    <Clock className="w-4 h-4" style={{ color: '#41B649' }} />
                                    <span className="text-sm font-bold" style={{ color: '#1F5F25' }}>
                                      ~{estimatedWaitMinutes} דק׳
                                    </span>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Audio Prompt */}
        {promptAudio && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-4 left-4 bg-white p-4 rounded-lg shadow-xl z-50"
            style={{ borderColor: '#41B649', borderWidth: '2px', borderStyle: 'solid' }}
          >
            <p className="mb-3 font-medium">האם להפעיל הקראות קוליות?</p>
            <div className="flex gap-2">
              <Button 
                onClick={handleEnableAudio}
                className="text-white"
                style={{ backgroundColor: '#41B649' }}
              >
                <Volume2 className="w-4 h-4 ml-2" />
                כן
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setPromptAudio(false)}
              >
                לא
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}