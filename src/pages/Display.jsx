import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2 } from "lucide-react";

export default function Display() {
  const [branch, setBranch] = useState(null);
  const [calledTickets, setCalledTickets] = useState([]);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const branchId = urlParams.get('branch_id');

      if (!branchId) {
        setLoading(false);
        return;
      }

      const [branchesData, ticketsData, queuesData] = await Promise.all([
        base44.entities.Branch.list(),
        base44.entities.Ticket.list(),
        base44.entities.Queue.list()
      ]);

      const selectedBranch = branchesData.find(b => b.id === branchId);
      if (selectedBranch) {
        setBranch(selectedBranch);

        // Get tickets that were called in the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentTickets = ticketsData
          .filter(t => 
            t.branch_id === branchId && 
            (t.state === "called" || t.state === "in_service") &&
            t.called_at &&
            new Date(t.called_at) > fiveMinutesAgo
          )
          .sort((a, b) => new Date(b.called_at) - new Date(a.called_at))
          .slice(0, 10);

        // Get queue names
        const ticketsWithQueue = recentTickets.map(ticket => {
          const queue = queuesData.find(q => q.id === ticket.queue_id);
          return {
            ...ticket,
            queueName: queue?.name || ""
          };
        });

        setCalledTickets(ticketsWithQueue);

        // Set most recent as current
        if (ticketsWithQueue.length > 0 && ticketsWithQueue[0].state === "called") {
          setCurrentTicket(ticketsWithQueue[0]);
        } else {
          setCurrentTicket(null);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1F5F25' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-xl text-white">טוען...</p>
        </div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1F5F25' }}>
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">מסך תצוגה</h1>
          <p className="text-xl">נא לציין מזהה סניף ב-URL</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" dir="rtl" style={{ backgroundColor: '#1F5F25' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
            alt="שוק העיר"
            className="h-24 w-auto mx-auto mb-6 brightness-0 invert"
          />
          <h1 className="text-5xl font-bold text-white mb-2">{branch.name}</h1>
          <p className="text-2xl text-white/80">מערכת תורים דיגיטלית</p>
        </div>

        {/* Current Ticket - Large Display */}
        <AnimatePresence mode="wait">
          {currentTicket ? (
            <motion.div
              key={currentTicket.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl p-16 mb-12 text-center"
            >
              <div className="flex items-center justify-center gap-4 mb-8">
                <Volume2 className="w-16 h-16 text-red-600 animate-pulse" />
                <h2 className="text-4xl font-bold" style={{ color: '#E52521' }}>
                  כעת מוזמן:
                </h2>
              </div>
              
              <div className="mb-8">
                <div className="text-[12rem] font-bold leading-none mb-4" style={{ color: '#E52521' }}>
                  {currentTicket.ticket_number}
                </div>
                <div className="text-5xl font-bold" style={{ color: '#41B649' }}>
                  {currentTicket.queueName}
                </div>
              </div>

              <div className="text-3xl text-gray-600">
                נא להגיע לעמדת השירות
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl p-16 mb-12 text-center"
            >
              <div className="text-5xl font-bold mb-6" style={{ color: '#41B649' }}>
                אין קריאות חדשות
              </div>
              <p className="text-3xl text-gray-600">
                נא להמתין לקריאת המספר שלך
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Tickets List */}
        {calledTickets.length > 0 && (
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h3 className="text-3xl font-bold mb-6 text-center" style={{ color: '#111111' }}>
              מספרים שנקראו לאחרונה
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {calledTickets.slice(0, 10).map((ticket, index) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-6 rounded-xl text-center ${
                    ticket.state === "in_service" 
                      ? "bg-green-100 border-2 border-green-500" 
                      : "bg-gray-100"
                  }`}
                >
                  <div className="text-4xl font-bold mb-2" style={{ color: '#E52521' }}>
                    {ticket.ticket_number}
                  </div>
                  <div className="text-lg font-medium" style={{ color: '#41B649' }}>
                    {ticket.queueName}
                  </div>
                  {ticket.state === "in_service" && (
                    <div className="text-sm text-green-700 mt-2 font-bold">
                      בשירות
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}