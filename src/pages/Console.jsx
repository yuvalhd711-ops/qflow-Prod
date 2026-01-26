import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PhoneCall, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Console() {
  const [branch, setBranch] = useState(null);
  const [branches, setBranches] = useState([]);
  const [queue, setQueue] = useState(null);
  const [queues, setQueues] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const branchId = urlParams.get('branch_id');

      const [branchesData, queuesData, ticketsData] = await Promise.all([
        base44.entities.Branch.list(),
        base44.entities.Queue.list(),
        base44.entities.Ticket.list()
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

          if (queue) {
            const queueTickets = ticketsData.filter(t => 
              t.queue_id === queue.id && t.state !== "served" && t.state !== "cancelled"
            ).sort((a, b) => a.ticket_number - b.ticket_number);
            setTickets(queueTickets);
          }
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBranchChange = async (branchId) => {
    const selectedBranch = branches.find(b => b.id === branchId);
    setBranch(selectedBranch);
    setQueue(null);
    setTickets([]);

    const queuesData = await base44.entities.Queue.list();
    const branchQueues = queuesData.filter(q => 
      q.branch_id === branchId && q.is_active
    );
    setQueues(branchQueues);
  };

  const handleQueueChange = async (queueId) => {
    const selectedQueue = queues.find(q => q.id === queueId);
    setQueue(selectedQueue);

    const ticketsData = await base44.entities.Ticket.list();
    const queueTickets = ticketsData.filter(t => 
      t.queue_id === queueId && t.state !== "served" && t.state !== "cancelled"
    ).sort((a, b) => a.ticket_number - b.ticket_number);
    setTickets(queueTickets);
  };

  const callTicket = async (ticket) => {
    try {
      await base44.entities.Ticket.update(ticket.id, {
        state: "called",
        called_at: new Date().toISOString()
      });

      // Broadcast event for display screen audio
      try {
        localStorage.setItem('ticket_call_event', JSON.stringify({
          ticketSeq: ticket.ticket_number,
          queueName: queue.name,
          timestamp: Date.now()
        }));
        // Clear after 1 second to allow re-triggering
        setTimeout(() => localStorage.removeItem('ticket_call_event'), 1000);
      } catch (e) {
        console.error('Error broadcasting call event:', e);
      }

      // Trigger SMS notification for 2 tickets before
      if (queue) {
        await base44.functions.invoke('notifyTwoBefore', {
          queueId: queue.id
        });
      }

      await loadData();
    } catch (error) {
      console.error("Error calling ticket:", error);
      alert("שגיאה בקריאת כרטיס");
    }
  };

  const startService = async (ticket) => {
    try {
      await base44.entities.Ticket.update(ticket.id, {
        state: "in_service"
      });
      await loadData();
    } catch (error) {
      console.error("Error starting service:", error);
      alert("שגיאה בהתחלת שירות");
    }
  };

  const finishService = async (ticket) => {
    try {
      await base44.entities.Ticket.update(ticket.id, {
        state: "served",
        finished_at: new Date().toISOString()
      });
      await loadData();
    } catch (error) {
      console.error("Error finishing service:", error);
      alert("שגיאה בסיום שירות");
    }
  };

  const cancelTicket = async (ticket) => {
    if (!confirm(`האם לבטל כרטיס מספר ${ticket.ticket_number}?`)) {
      return;
    }

    try {
      await base44.entities.Ticket.update(ticket.id, {
        state: "cancelled"
      });
      await loadData();
    } catch (error) {
      console.error("Error cancelling ticket:", error);
      alert("שגיאה בביטול כרטיס");
    }
  };

  const getStateColor = (state) => {
    switch (state) {
      case "waiting": return "bg-yellow-500";
      case "called": return "bg-blue-500";
      case "in_service": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getStateText = (state) => {
    switch (state) {
      case "waiting": return "ממתין";
      case "called": return "נקרא";
      case "in_service": return "בשירות";
      default: return state;
    }
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
    <div className="min-h-screen p-8" dir="rtl" style={{ backgroundColor: '#E6F9EA' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
              alt="שוק העיר"
              className="h-14 w-auto mb-4"
            />
            <h1 className="text-4xl font-bold" style={{ color: '#111111' }}>קונסולת עובד</h1>
            {branch && <p className="text-xl text-gray-700">{branch.name}</p>}
            {queue && <p className="text-lg text-gray-600">{queue.name}</p>}
          </div>
        </div>

        {/* Selection Controls */}
        <Card className="bg-white shadow-xl mb-6" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
          <CardHeader style={{ backgroundColor: '#E6F9EA' }}>
            <CardTitle>בחירת סניף ומחלקה</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">סניף</label>
                <Select value={branch?.id || ""} onValueChange={handleBranchChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סניף" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">מחלקה</label>
                <Select 
                  value={queue?.id || ""} 
                  onValueChange={handleQueueChange}
                  disabled={!branch}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מחלקה" />
                  </SelectTrigger>
                  <SelectContent>
                    {queues.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Queue Status */}
        {queue && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8" style={{ color: '#41B649' }} />
                  <div>
                    <p className="text-sm text-gray-600">ממתינים בתור</p>
                    <p className="text-3xl font-bold">{tickets.filter(t => t.state === "waiting").length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <PhoneCall className="w-8 h-8" style={{ color: '#E52521' }} />
                  <div>
                    <p className="text-sm text-gray-600">נקראו</p>
                    <p className="text-3xl font-bold">{tickets.filter(t => t.state === "called").length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-8 h-8" style={{ color: '#41B649' }} />
                  <div>
                    <p className="text-sm text-gray-600">בשירות</p>
                    <p className="text-3xl font-bold">{tickets.filter(t => t.state === "in_service").length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tickets Table */}
        {queue && (
          <Card className="bg-white shadow-xl" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
            <CardHeader style={{ backgroundColor: '#E6F9EA' }}>
              <CardTitle>תור ממתין</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {tickets.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-xl">אין כרטיסים ממתינים</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right text-xl">מספר</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">זמן יצירה</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <motion.tr
                        key={ticket.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={ticket.state === "called" ? "bg-blue-50" : ""}
                      >
                        <TableCell className="text-3xl font-bold" style={{ color: '#E52521' }}>
                          {ticket.ticket_number}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStateColor(ticket.state)} text-white`}>
                            {getStateText(ticket.state)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(ticket.created_date).toLocaleTimeString('he-IL')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {ticket.state === "waiting" && (
                              <Button
                                onClick={() => callTicket(ticket)}
                                size="sm"
                                className="text-white"
                                style={{ backgroundColor: '#E52521' }}
                              >
                                <PhoneCall className="w-4 h-4 ml-1" />
                                קרא
                              </Button>
                            )}
                            {ticket.state === "called" && (
                              <Button
                                onClick={() => startService(ticket)}
                                size="sm"
                                className="text-white"
                                style={{ backgroundColor: '#41B649' }}
                              >
                                התחל שירות
                              </Button>
                            )}
                            {ticket.state === "in_service" && (
                              <Button
                                onClick={() => finishService(ticket)}
                                size="sm"
                                className="text-white"
                                style={{ backgroundColor: '#41B649' }}
                              >
                                <CheckCircle className="w-4 h-4 ml-1" />
                                סיים
                              </Button>
                            )}
                            <Button
                              onClick={() => cancelTicket(ticket)}
                              size="sm"
                              variant="destructive"
                            >
                              <XCircle className="w-4 h-4 ml-1" />
                              בטל
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}