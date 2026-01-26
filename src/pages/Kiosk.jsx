import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Printer, ArrowRight, Home } from "lucide-react";

export default function Kiosk() {
  const [branch, setBranch] = useState(null);
  const [branches, setBranches] = useState([]);
  const [queues, setQueues] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Check if branch_id is in URL
      const urlParams = new URLSearchParams(window.location.search);
      const branchId = urlParams.get('branch_id');

      const [branchesData, queuesData] = await Promise.all([
        base44.entities.Branch.list(),
        base44.entities.Queue.list()
      ]);

      setBranches(branchesData.filter(b => b.is_active));

      if (branchId) {
        const selectedBranch = branchesData.find(b => b.id === branchId);
        if (selectedBranch) {
          setBranch(selectedBranch);
          const branchQueues = queuesData.filter(q => 
            q.branch_id === branchId && q.is_active
          );
          setQueues(branchQueues);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBranchSelect = async (selectedBranch) => {
    setBranch(selectedBranch);
    const queuesData = await base44.entities.Queue.list();
    const branchQueues = queuesData.filter(q => 
      q.branch_id === selectedBranch.id && q.is_active
    );
    setQueues(branchQueues);
  };

  const handleQueueSelect = async (queue) => {
    setSelectedQueue(queue);
    try {
      // Get next ticket number
      const nextNumber = (queue.seq_counter || 0) + 1;

      // Create ticket
      const newTicket = await base44.entities.Ticket.create({
        branch_id: branch.id,
        queue_id: queue.id,
        ticket_number: nextNumber,
        state: "waiting"
      });

      // Update queue counter
      await base44.entities.Queue.update(queue.id, {
        seq_counter: nextNumber
      });

      setTicket(newTicket);

      // Auto reset after 10 seconds
      setTimeout(() => {
        handleReset();
      }, 10000);
    } catch (error) {
      console.error("Error creating ticket:", error);
      alert("שגיאה ביצירת כרטיס");
    }
  };

  const handleReset = () => {
    setSelectedQueue(null);
    setTicket(null);
    setBranch(null);
    setQueues([]);
  };

  const handlePrint = () => {
    window.print();
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

  return (
    <div className="min-h-screen p-4 md:p-8" dir="rtl" style={{ backgroundColor: '#E6F9EA' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
            alt="שוק העיר"
            className="h-20 md:h-28 w-auto mx-auto mb-4"
          />
          <h1 className="text-3xl md:text-5xl font-bold" style={{ color: '#111111' }}>
            קיוסק - קבלת מספר
          </h1>
          {branch && !ticket && (
            <p className="text-lg md:text-xl text-gray-700 mt-2">{branch.name}</p>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* Ticket Display */}
          {ticket && (
            <motion.div
              key="ticket"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center"
            >
              <Card className="bg-white shadow-2xl" style={{ borderColor: '#41B649', borderWidth: '3px' }}>
                <CardContent className="p-12">
                  <div className="mb-8">
                    <p className="text-2xl text-gray-600 mb-4">המספר שלך:</p>
                    <div className="text-9xl font-bold mb-4" style={{ color: '#E52521' }}>
                      {ticket.ticket_number}
                    </div>
                    <p className="text-3xl font-bold" style={{ color: '#41B649' }}>
                      {selectedQueue.name}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xl text-gray-600">
                      זמן המתנה משוער: {Math.round(selectedQueue.avg_service_time_seconds / 60)} דקות
                    </p>
                    
                    <div className="flex gap-4 justify-center">
                      <Button
                        onClick={handlePrint}
                        size="lg"
                        className="text-white text-xl px-8 py-6"
                        style={{ backgroundColor: '#41B649' }}
                      >
                        <Printer className="w-6 h-6 ml-3" />
                        הדפס כרטיס
                      </Button>
                      <Button
                        onClick={handleReset}
                        size="lg"
                        variant="outline"
                        className="text-xl px-8 py-6"
                      >
                        <Home className="w-6 h-6 ml-3" />
                        חזרה להתחלה
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <p className="text-gray-600 mt-6 text-lg">
                המערכת תחזור למסך הבית בעוד 10 שניות...
              </p>
            </motion.div>
          )}

          {/* Queue Selection */}
          {!ticket && branch && queues.length > 0 && (
            <motion.div
              key="queues"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
            >
              <Card className="bg-white shadow-xl mb-6" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                <CardHeader style={{ backgroundColor: '#E6F9EA' }}>
                  <CardTitle className="text-3xl text-center">בחר מחלקה</CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {queues.map((queue) => (
                      <motion.div
                        key={queue.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          onClick={() => handleQueueSelect(queue)}
                          className="w-full h-32 text-2xl font-bold text-white shadow-lg"
                          style={{ backgroundColor: '#E52521' }}
                        >
                          {queue.name}
                          <ArrowRight className="w-8 h-8 mr-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>

                  <Button
                    onClick={() => setBranch(null)}
                    variant="outline"
                    size="lg"
                    className="w-full mt-8 text-xl"
                  >
                    חזור לבחירת סניף
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Branch Selection */}
          {!ticket && !branch && (
            <motion.div
              key="branches"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
            >
              <Card className="bg-white shadow-xl" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                <CardHeader style={{ backgroundColor: '#E6F9EA' }}>
                  <CardTitle className="text-3xl text-center">בחר סניף</CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {branches.map((b) => (
                      <motion.div
                        key={b.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          onClick={() => handleBranchSelect(b)}
                          className="w-full h-24 text-xl font-bold text-white shadow-lg"
                          style={{ backgroundColor: '#41B649' }}
                        >
                          {b.name}
                          <ArrowRight className="w-6 h-6 mr-3" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}