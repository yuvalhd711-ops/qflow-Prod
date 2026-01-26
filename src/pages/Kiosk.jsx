import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { Printer, ArrowRight, Home, Smartphone } from "lucide-react";

export default function Kiosk() {
  const [branch, setBranch] = useState(null);
  const [branches, setBranches] = useState([]);
  const [queues, setQueues] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliveryMethod, setDeliveryMethod] = useState(null); // 'print' or 'sms'
  const [smsDialog, setSmsDialog] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [joinClub, setJoinClub] = useState(false);

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

  const handleQueueSelect = (queue) => {
    setSelectedQueue(queue);
    // Don't create ticket yet, wait for delivery method selection
  };

  const handleDeliveryMethod = (method) => {
    setDeliveryMethod(method);
    if (method === 'sms') {
      setSmsDialog(true);
    } else if (method === 'print') {
      createTicket(null);
    }
  };

  const createTicket = async (phone) => {
    try {
      // Get next ticket number
      const nextNumber = (selectedQueue.seq_counter || 0) + 1;

      // Create ticket
      const newTicket = await base44.entities.Ticket.create({
        branch_id: branch.id,
        queue_id: selectedQueue.id,
        ticket_number: nextNumber,
        state: "waiting",
        customer_phone: phone || null,
        join_club: joinClub,
        source: "kiosk",
        two_before_sms_sent: false
      });

      // Update queue counter
      await base44.entities.Queue.update(selectedQueue.id, {
        seq_counter: nextNumber
      });

      // If SMS method, send initial SMS
      if (phone) {
        await base44.functions.invoke('sendSms', {
          phoneNumber: phone,
          queueName: selectedQueue.name,
          ticketSeq: nextNumber
        });
      }

      setTicket(newTicket);
      setSmsDialog(false);

      // Auto reset after 10 seconds
      setTimeout(() => {
        handleReset();
      }, 10000);
    } catch (error) {
      console.error("Error creating ticket:", error);
      alert("שגיאה ביצירת כרטיס");
    }
  };

  const handleSmsSubmit = () => {
    if (!phoneNumber.trim()) {
      alert("נא להזין מספר טלפון");
      return;
    }
    createTicket(phoneNumber);
  };

  const handleReset = () => {
    setSelectedQueue(null);
    setTicket(null);
    setBranch(null);
    setQueues([]);
    setDeliveryMethod(null);
    setSmsDialog(false);
    setPhoneNumber("");
    setJoinClub(false);
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

          {/* Delivery Method Selection */}
          {!ticket && selectedQueue && !deliveryMethod && (
            <motion.div
              key="delivery"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
            >
              <Card className="bg-white shadow-xl mb-6" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                <CardHeader style={{ backgroundColor: '#E6F9EA' }}>
                  <CardTitle className="text-3xl text-center">איך תרצה לקבל את התור?</CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => handleDeliveryMethod('print')}
                        className="w-full h-48 text-2xl font-bold text-white shadow-lg flex flex-col gap-4"
                        style={{ backgroundColor: '#41B649' }}
                      >
                        <Printer className="w-16 h-16" />
                        🎟️ קבל כרטיס מודפס
                      </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => handleDeliveryMethod('sms')}
                        className="w-full h-48 text-2xl font-bold text-white shadow-lg flex flex-col gap-4"
                        style={{ backgroundColor: '#E52521' }}
                      >
                        <Smartphone className="w-16 h-16" />
                        📱 קבל תור ב-SMS
                      </Button>
                    </motion.div>
                  </div>

                  <Button
                    onClick={() => setSelectedQueue(null)}
                    variant="outline"
                    size="lg"
                    className="w-full mt-8 text-xl"
                  >
                    חזור לבחירת מחלקה
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Queue Selection */}
          {!ticket && branch && queues.length > 0 && !selectedQueue && (
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

        {/* SMS Dialog */}
        <Dialog open={smsDialog} onOpenChange={setSmsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl">📱 קבלת תור ב-SMS</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-lg">מספר טלפון נייד</Label>
                <Input
                  type="tel"
                  dir="ltr"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="050-1234567"
                  className="text-xl h-14 mt-2"
                />
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Checkbox
                  id="joinClub"
                  checked={joinClub}
                  onCheckedChange={setJoinClub}
                />
                <Label htmlFor="joinClub" className="text-base cursor-pointer">
                  רוצה להצטרף למועדון לקוחות ולקבל הטבות והנחות
                </Label>
              </div>
            </div>
            <DialogFooter className="gap-3">
              <Button 
                variant="outline" 
                onClick={() => setSmsDialog(false)}
                className="text-lg"
              >
                ביטול
              </Button>
              <Button 
                onClick={handleSmsSubmit}
                style={{ backgroundColor: '#E52521' }}
                className="text-white text-lg"
              >
                שלח לי תור ב-SMS
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}