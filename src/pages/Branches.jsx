import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Clock, CheckCircle, Users, Smartphone, Tv, Monitor, Copy, Check, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useBdsSubscription } from "@/components/utils/bdsSync";

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(null);

  useEffect(() => {
    loadBranches();
  }, []);

  useBdsSubscription(() => {
    loadBranches();
  });

  const loadBranches = async () => {
    try {
      const [branchList, queues, tickets] = await Promise.all([
        base44.entities.Branch.list(),
        base44.entities.Queue.list(),
        base44.entities.Ticket.list()
      ]);

      setBranches(branchList);

      // Calculate stats for each branch
      const branchStats = {};
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const branch of branchList) {
        const branchQueues = queues.filter(q => q.branch_id === branch.id && q.is_active);
        const branchTickets = tickets.filter(t => t.branch_id === branch.id);

        const activeTickets = branchTickets.filter(t =>
          t.state === "waiting" || t.state === "called" || t.state === "in_service"
        ).length;

        const servedToday = branchTickets.filter(t =>
          t.state === "served" && t.finished_at && new Date(t.finished_at) >= today
        ).length;

        // Calculate average service time
        const avgServiceTime = branchQueues.length > 0
          ? Math.round(branchQueues.reduce((sum, q) => sum + (q.avg_service_time_seconds || 180), 0) / branchQueues.length / 60)
          : 0;

        branchStats[branch.id] = {
          activeQueues: branchQueues.length,
          waiting: activeTickets,
          servedToday: servedToday,
          avgTime: avgServiceTime
        };
      }

      setStats(branchStats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (url, linkType) => {
    navigator.clipboard.writeText(window.location.origin + url);
    setCopiedLink(linkType);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const totalActiveBranches = branches.filter(b => b.is_active).length;
  const totalWaiting = Object.values(stats).reduce((sum, s) => sum + (s.waiting || 0), 0);
  const totalServed = Object.values(stats).reduce((sum, s) => sum + (s.servedToday || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#E6F9EA' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 mx-auto mb-4" style={{ borderColor: '#41B649' }}></div>
          <p className="text-xl text-gray-600">טוען נתוני סניפים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" dir="rtl" style={{ backgroundColor: '#E6F9EA' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dbe1252279022b9e191013/8866f21c5_SHuk_LOGO_HAYIR.png"
              alt="שוק העיר"
              className="h-24 w-auto mx-auto mb-6"
            />
            <h1 className="text-5xl md:text-6xl font-bold mb-4" style={{ color: '#111111' }}>
              מרכז שליטה - כל הסניפים
            </h1>
            <p className="text-xl text-gray-700">
              סקירה מלאה על כל {branches.length} הסניפים של שוק העיר
            </p>
          </motion.div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl shadow-md" style={{ backgroundColor: '#41B649' }}>
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">סניפים פעילים</p>
                    <p className="text-3xl font-bold" style={{ color: '#111111' }}>{totalActiveBranches}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl shadow-md" style={{ backgroundColor: '#41B649' }}>
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">סה״כ ממתינים</p>
                    <p className="text-3xl font-bold" style={{ color: '#111111' }}>{totalWaiting}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl shadow-md" style={{ backgroundColor: '#41B649' }}>
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">טופלו היום</p>
                    <p className="text-3xl font-bold" style={{ color: '#111111' }}>{totalServed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Branch Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {branches.map((branch, index) => {
            const branchStat = stats[branch.id] || { activeQueues: 0, waiting: 0, servedToday: 0, avgTime: 0 };
            const isActive = branch.is_active && branchStat.activeQueues > 0;

            return (
              <motion.div
                key={branch.id}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.05 * index }}
              >
                <Card
                  className="bg-white hover:shadow-2xl transition-all duration-300 h-full"
                  style={{
                    borderColor: isActive ? '#41B649' : '#d1d5db',
                    borderWidth: '2px'
                  }}
                >
                  <CardHeader
                    style={{
                      backgroundColor: isActive ? '#E6F9EA' : '#f9fafb',
                      borderBottom: `1px solid ${isActive ? '#41B649' : '#e5e7eb'}`
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-2xl">{branch.name}</CardTitle>
                      <Badge
                        variant={branch.is_active ? "default" : "secondary"}
                        style={branch.is_active ? { backgroundColor: '#41B649' } : {}}
                      >
                        {branch.is_active ? "פעיל" : (
                          <>
                            <AlertCircle className="w-3 h-3 ml-1" />
                            לא פעיל
                          </>
                        )}
                      </Badge>
                    </div>
                    {branch.address && (
                      <p className="text-gray-600 text-sm mt-1">{branch.address}</p>
                    )}
                  </CardHeader>

                  <CardContent className="p-6">
                    {isActive ? (
                      <>
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="p-4 rounded-lg" style={{ backgroundColor: '#E6F9EA' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="w-4 h-4" style={{ color: '#41B649' }} />
                              <span className="text-xs text-gray-600">ממתינים</span>
                            </div>
                            <p className="text-2xl font-bold" style={{ color: '#111111' }}>
                              {branchStat.waiting}
                            </p>
                          </div>

                          <div className="p-4 rounded-lg" style={{ backgroundColor: '#E6F9EA' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="w-4 h-4" style={{ color: '#41B649' }} />
                              <span className="text-xs text-gray-600">טופלו היום</span>
                            </div>
                            <p className="text-2xl font-bold" style={{ color: '#111111' }}>
                              {branchStat.servedToday}
                            </p>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-2 mb-6 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">תורים פעילים:</span>
                            <span className="font-bold">{branchStat.activeQueues}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">זמן ממוצע:</span>
                            <span className="font-bold">{branchStat.avgTime} דקות</span>
                          </div>
                        </div>

                        {/* Quick Links */}
                        <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: '#E6F9EA' }}>
                          <h4 className="font-bold mb-3 text-sm">קישורים מהירים:</h4>
                          <div className="space-y-2">
                            {[
                              { label: "קיוסק", page: "Kiosk", icon: Smartphone, key: `kiosk-${branch.id}` },
                              { label: "מסך תצוגה", page: "Display", icon: Tv, key: `display-${branch.id}` },
                              { label: "קונסולת עובד", page: "Console", icon: Monitor, key: `console-${branch.id}` }
                            ].map(({ label, page, icon: Icon, key }) => {
                              const url = createPageUrl(page) + "?branch_id=" + branch.id;
                              return (
                                <div key={key} className="flex items-center justify-between text-xs bg-white p-2 rounded">
                                  <div className="flex items-center gap-2">
                                    <Icon className="w-3 h-3" style={{ color: '#41B649' }} />
                                    <span className="font-medium">{label}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyLink(url, key)}
                                    className="h-6 px-2"
                                  >
                                    {copiedLink === key ? (
                                      <>
                                        <Check className="w-3 h-3 ml-1" style={{ color: '#41B649' }} />
                                        הועתק
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3 ml-1" />
                                        העתק
                                      </>
                                    )}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Direct Buttons */}
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            size="sm"
                            onClick={() => window.open(createPageUrl("Kiosk") + "?branch_id=" + branch.id, '_blank')}
                            className="text-white text-xs"
                            style={{ backgroundColor: '#E52521' }}
                          >
                            <Smartphone className="w-3 h-3 ml-1" />
                            קיוסק
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => window.open(createPageUrl("Display") + "?branch_id=" + branch.id, '_blank')}
                            className="text-white text-xs"
                            style={{ backgroundColor: '#E52521' }}
                          >
                            <Tv className="w-3 h-3 ml-1" />
                            תצוגה
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => window.open(createPageUrl("Console") + "?branch_id=" + branch.id, '_blank')}
                            className="text-white text-xs"
                            style={{ backgroundColor: '#E52521' }}
                          >
                            <Monitor className="w-3 h-3 ml-1" />
                            קונסולה
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-500 mb-4">אין תורים פעילים בסניף זה</p>
                        <Button
                          size="sm"
                          onClick={() => window.location.href = createPageUrl("Admin")}
                          className="text-white"
                          style={{ backgroundColor: '#E52521' }}
                        >
                          הגדר תורים
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}