import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useBdsSubscription } from "@/components/utils/bdsSync";

export default function Display() {
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState(null);
  const [activeDepartments, setActiveDepartments] = useState([]);
  const [deptData, setDeptData] = useState({});
  const [loading, setLoading] = useState(true);
  const [promptAudio, setPromptAudio] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Get URL params
  const urlParams = new URLSearchParams(window.location.search);
  const branch_id = urlParams.get('branch_id');
  const enableAnnouncements = urlParams.get('announce') === 'true';

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
        
        newDeptData[queue.name] = {
          queueId: queue.id,
          queueName: queue.name,
          current: current || null,
          upcoming: upcoming
        };
      }
      
      setDeptData(newDeptData);
    } catch (error) {
      console.error("Error loading queue data:", error);
    }
  }, []);

  // Hebrew speech synthesis
  const speakHebrew = useCallback((text) => {
    if (!audioEnabled || !enableAnnouncements) return;
    
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
  }, [audioEnabled, enableAnnouncements]);

  // Listen to ticket call events from localStorage
  useEffect(() => {
    if (!enableAnnouncements) return;
    
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

  // Initial load
  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

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
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
            alt="שוק העיר"
            className="h-20 w-auto mx-auto mb-4"
          />
          <h1 className="text-5xl font-bold mb-2" style={{ color: '#1F5F25' }}>
            {currentBranch?.name}
          </h1>
          <p className="text-xl text-gray-700">מסך תצוגת תורים</p>
          {enableAnnouncements && (
            <div className="flex items-center justify-center gap-2 mt-2">
              {audioEnabled ? (
                <>
                  <Volume2 className="w-5 h-5" style={{ color: '#41B649' }} />
                  <span className="text-sm" style={{ color: '#41B649' }}>הקראות קוליות מופעלות</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-500">הקראות קוליות כבויות</span>
                </>
              )}
            </div>
          )}
        </motion.div>

        {/* Department Cards */}
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
            <div className="grid lg:grid-cols-3 gap-6">
              {Object.entries(deptData).map(([deptName, data], index) => (
                <motion.div
                  key={deptName}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className="bg-white shadow-2xl" 
                    style={{ borderColor: '#41B649', borderWidth: '3px' }}
                  >
                    {/* Department Header */}
                    <CardHeader style={{ backgroundColor: '#E6F9EA', borderBottom: '2px solid #41B649' }}>
                      <CardTitle className="text-3xl font-bold text-center" style={{ color: '#1F5F25' }}>
                        {deptName}
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="p-6">
                      {/* Current Ticket */}
                      {data.current ? (
                        <motion.div
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="mb-6 p-8 rounded-2xl text-center"
                          style={{ backgroundColor: '#E52521' }}
                        >
                          <p className="text-white text-2xl mb-2 font-semibold">תור נוכחי</p>
                          <p className="text-white text-8xl font-bold">
                            {data.current.ticket_number}
                          </p>
                        </motion.div>
                      ) : (
                        <div className="mb-6 p-8 rounded-2xl text-center bg-gray-100">
                          <p className="text-gray-500 text-2xl">אין תור נוכחי</p>
                        </div>
                      )}
                      
                      {/* Upcoming Tickets */}
                      <div>
                        <h3 className="text-xl font-semibold mb-3 text-center" style={{ color: '#1F5F25' }}>
                          תורים ממתינים
                        </h3>
                        {data.upcoming.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-gray-500">אין תורים ממתינים</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {data.upcoming.map((ticket, idx) => (
                              <motion.div
                                key={ticket.id}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex items-center gap-3 p-4 rounded-lg"
                                style={{ backgroundColor: '#E6F9EA' }}
                              >
                                <div 
                                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: '#41B649' }}
                                >
                                  <span className="text-white font-bold">{idx + 1}</span>
                                </div>
                                <span className="text-3xl font-bold" style={{ color: '#1F5F25' }}>
                                  {ticket.ticket_number}
                                </span>
                              </motion.div>
                            ))}
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