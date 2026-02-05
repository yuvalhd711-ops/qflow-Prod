import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Clock, Users, Award, Download, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import moment from "moment";

export default function Reports() {
  const [tickets, setTickets] = useState([]);
  const [branches, setBranches] = useState([]);
  const [queues, setQueues] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Smart defaults: today + all queues
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedQueue, setSelectedQueue] = useState("all");
  const [dateRange, setDateRange] = useState("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ticketsData, branchesData, queuesData, usersData] = await Promise.all([
        base44.entities.Ticket.list(),
        base44.entities.Branch.list(),
        base44.entities.Queue.list(),
        base44.entities.User.list()
      ]);

      setTickets(ticketsData);
      setBranches(branchesData);
      setQueues(queuesData);
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter tickets by all criteria
  const getFilteredTickets = () => {
    let filtered = tickets;
    
    // Date range filter
    const now = new Date();
    if (dateRange === "custom" && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => {
        const d = new Date(t.created_date);
        return d >= start && d <= end;
      });
    } else if (dateRange === "today") {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      filtered = filtered.filter(t => new Date(t.created_date) >= todayStart);
    } else if (dateRange === "yesterday") {
      const yesterdayStart = new Date(now);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      yesterdayStart.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterdayStart);
      yesterdayEnd.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => {
        const d = new Date(t.created_date);
        return d >= yesterdayStart && d <= yesterdayEnd;
      });
    } else if (dateRange === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(t => new Date(t.created_date) >= weekAgo);
    } else if (dateRange === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(t => new Date(t.created_date) >= monthAgo);
    }
    
    // Branch filter
    if (selectedBranch !== "all") {
      filtered = filtered.filter(t => t.branch_id === selectedBranch);
    }
    
    // Queue filter
    if (selectedQueue !== "all") {
      filtered = filtered.filter(t => t.queue_id === selectedQueue);
    }
    
    return filtered;
  };

  // Calculate KPIs for executive summary
  const calculateKPIs = () => {
    const filtered = getFilteredTickets();
    const served = filtered.filter(t => t.state === "served");
    const servedWithTime = served.filter(t => t.called_at && t.finished_at);
    
    const avgWaitTime = servedWithTime.length > 0 
      ? servedWithTime.reduce((sum, t) => {
          const wait = (new Date(t.finished_at) - new Date(t.called_at)) / 60000;
          return sum + wait;
        }, 0) / servedWithTime.length
      : 0;
    
    const servedPercent = filtered.length > 0 
      ? (served.length / filtered.length) * 100 
      : 0;
    
    // Current load (tickets waiting right now)
    const currentWaiting = tickets.filter(t => t.state === "waiting").length;
    let loadLevel = "נמוך";
    let loadColor = "#41B649";
    if (currentWaiting > 20) {
      loadLevel = "גבוה";
      loadColor = "#E52521";
    } else if (currentWaiting > 10) {
      loadLevel = "בינוני";
      loadColor = "#F59E0B";
    }
    
    return {
      servedToday: served.length,
      avgWaitTime: Math.round(avgWaitTime),
      servedPercent: Math.round(servedPercent),
      currentLoad: { level: loadLevel, count: currentWaiting, color: loadColor }
    };
  };

  // Top 5 employees by tickets served
  const getTopEmployees = () => {
    const filtered = getFilteredTickets().filter(t => t.state === "served" && t.served_by);
    const employeeStats = {};
    
    filtered.forEach(ticket => {
      const email = ticket.served_by;
      if (!employeeStats[email]) {
        employeeStats[email] = { email, ticketsServed: 0, totalServiceTime: 0, count: 0 };
      }
      employeeStats[email].ticketsServed++;
      if (ticket.service_time_seconds) {
        employeeStats[email].totalServiceTime += ticket.service_time_seconds;
        employeeStats[email].count++;
      }
    });
    
    return Object.values(employeeStats)
      .map(emp => {
        const user = users.find(u => u.email === emp.email);
        return {
          name: user?.full_name || emp.email,
          ticketsServed: emp.ticketsServed,
          avgServiceTime: emp.count > 0 ? Math.round(emp.totalServiceTime / emp.count / 60) : 0
        };
      })
      .sort((a, b) => b.ticketsServed - a.ticketsServed)
      .slice(0, 5);
  };

  // Wait times by hour (heatmap data)
  const getWaitTimesByHour = () => {
    const filtered = getFilteredTickets().filter(t => 
      t.state === "served" && t.called_at && t.finished_at
    );
    
    const hourData = {};
    for (let i = 8; i <= 20; i++) {
      hourData[i] = { hour: `${i}:00`, totalWait: 0, count: 0 };
    }
    
    filtered.forEach(ticket => {
      const hour = new Date(ticket.called_at).getHours();
      if (hourData[hour]) {
        const waitTime = (new Date(ticket.finished_at) - new Date(ticket.called_at)) / 60000;
        hourData[hour].totalWait += waitTime;
        hourData[hour].count++;
      }
    });
    
    return Object.values(hourData)
      .map(h => ({
        hour: h.hour,
        avgWait: h.count > 0 ? Math.round(h.totalWait / h.count) : 0
      }))
      .filter(h => h.avgWait > 0);
  };

  const kpis = calculateKPIs();
  const filteredTickets = getFilteredTickets();
  const hasData = filteredTickets.length > 0;

  // Get available queues based on selected branch
  const availableQueues = selectedBranch === "all" 
    ? queues 
    : queues.filter(q => q.branch_id === selectedBranch && q.is_active);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#E6F9EA' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 mx-auto mb-4" style={{ borderColor: '#41B649' }}></div>
          <p className="text-xl text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" dir="rtl" style={{ backgroundColor: '#E6F9EA' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#1F5F25' }}>
              📊 דוחות וסטטיסטיקות
            </h1>
            <p className="text-gray-600">ניתוח מקיף ותובנות על פעילות התורים</p>
          </div>
          <Button 
            disabled 
            variant="outline" 
            className="gap-2"
            style={{ borderColor: '#41B649', color: '#41B649' }}
          >
            <Download className="h-4 w-4" />
            ייצוא דוח
          </Button>
        </div>

        {/* Guided Filters */}
        <Card className="bg-white shadow-md" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
          <CardHeader style={{ backgroundColor: '#E6F9EA' }}>
            <CardTitle className="text-lg" style={{ color: '#1F5F25' }}>🔍 פילטרים</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Step 1: Date Range */}
              <div>
                <label className="text-sm font-semibold mb-2 block" style={{ color: '#1F5F25' }}>
                  שלב 1: טווח זמן
                </label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">היום</SelectItem>
                    <SelectItem value="yesterday">אתמול</SelectItem>
                    <SelectItem value="week">שבוע אחרון</SelectItem>
                    <SelectItem value="month">חודש אחרון</SelectItem>
                    <SelectItem value="custom">מותאם אישית</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: Branch */}
              <div>
                <label className="text-sm font-semibold mb-2 block" style={{ color: '#1F5F25' }}>
                  שלב 2: סניף
                </label>
                <Select value={selectedBranch} onValueChange={(val) => {
                  setSelectedBranch(val);
                  setSelectedQueue("all");
                }}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסניפים</SelectItem>
                    {branches.filter(b => b.is_active).map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 3: Queue (optional) */}
              <div>
                <label className="text-sm font-semibold mb-2 block text-gray-500">
                  שלב 3: תור (אופציונלי)
                </label>
                <Select 
                  value={selectedQueue} 
                  onValueChange={setSelectedQueue}
                  disabled={availableQueues.length === 0}
                >
                  <SelectTrigger className={`bg-white ${availableQueues.length === 0 ? 'opacity-50' : ''}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל התורים</SelectItem>
                    {availableQueues.map(queue => (
                      <SelectItem key={queue.id} value={queue.id}>
                        {queue.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom Date Range Inputs */}
            {dateRange === "custom" && (
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">מתאריך:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-white"
                    style={{ borderColor: '#41B649' }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">עד תאריך:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-white"
                    style={{ borderColor: '#41B649' }}
                  />
                </div>
              </div>
            )}

            {/* Clear Custom Dates */}
            {dateRange === "custom" && customStartDate && customEndDate && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomStartDate("");
                    setCustomEndDate("");
                    setDateRange("today");
                  }}
                  className="gap-2"
                  style={{ borderColor: '#E52521', color: '#E52521' }}
                >
                  <X className="h-4 w-4" />
                  נקה טווח מותאם
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Executive Summary */}
        <Card className="bg-gradient-to-br from-white to-gray-50 shadow-xl" style={{ borderColor: '#41B649', borderWidth: '3px' }}>
          <CardHeader style={{ backgroundColor: '#E6F9EA', borderBottom: '2px solid #41B649' }}>
            <CardTitle className="text-2xl font-bold" style={{ color: '#1F5F25' }}>
              📊 סיכום פעילות – {
                dateRange === "today" ? "היום" : 
                dateRange === "yesterday" ? "אתמול" : 
                dateRange === "week" ? "שבוע אחרון" : 
                dateRange === "month" ? "חודש אחרון" :
                dateRange === "custom" && customStartDate && customEndDate ? 
                  `${moment(customStartDate).format('DD/MM/YY')} - ${moment(customEndDate).format('DD/MM/YY')}` :
                  "טווח מותאם"
              }
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!hasData ? (
              <div className="text-center py-12">
                <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-xl font-semibold text-gray-600 mb-2">אין נתונים בטווח שנבחר</p>
                <p className="text-gray-500">נסה לבחור תור פעיל או טווח זמן אחר</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-4 gap-6">
                {/* KPI 1: Customers Served */}
                <div className="text-center p-6 rounded-xl shadow-md" style={{ backgroundColor: '#E6F9EA' }}>
                  <Users className="h-10 w-10 mx-auto mb-3" style={{ color: '#41B649' }} />
                  <div className="text-5xl font-black mb-2" style={{ color: '#1F5F25' }}>
                    {kpis.servedToday}
                  </div>
                  <div className="text-sm font-semibold text-gray-700">לקוחות שטופלו</div>
                </div>

                {/* KPI 2: Average Wait Time */}
                <div className="text-center p-6 rounded-xl shadow-md" style={{ backgroundColor: '#E6F9EA' }}>
                  <Clock className="h-10 w-10 mx-auto mb-3" style={{ color: kpis.avgWaitTime > 10 ? '#F59E0B' : '#41B649' }} />
                  <div className="text-5xl font-black mb-2" style={{ color: kpis.avgWaitTime > 10 ? '#F59E0B' : '#1F5F25' }}>
                    {kpis.avgWaitTime}
                  </div>
                  <div className="text-sm font-semibold text-gray-700">דקות המתנה ממוצע</div>
                </div>

                {/* KPI 3: Served Percentage */}
                <div className="text-center p-6 rounded-xl shadow-md" style={{ backgroundColor: '#E6F9EA' }}>
                  <Award className="h-10 w-10 mx-auto mb-3" style={{ color: kpis.servedPercent >= 80 ? '#41B649' : '#F59E0B' }} />
                  <div className="text-5xl font-black mb-2" style={{ color: kpis.servedPercent >= 80 ? '#1F5F25' : '#F59E0B' }}>
                    {kpis.servedPercent}%
                  </div>
                  <div className="text-sm font-semibold text-gray-700">אחוז תורים שטופלו</div>
                </div>

                {/* KPI 4: Current Load */}
                <div className="text-center p-6 rounded-xl shadow-md" style={{ backgroundColor: '#E6F9EA' }}>
                  {kpis.currentLoad.level === "נמוך" && <TrendingDown className="h-10 w-10 mx-auto mb-3" style={{ color: kpis.currentLoad.color }} />}
                  {kpis.currentLoad.level === "בינוני" && <TrendingUp className="h-10 w-10 mx-auto mb-3" style={{ color: kpis.currentLoad.color }} />}
                  {kpis.currentLoad.level === "גבוה" && <TrendingUp className="h-10 w-10 mx-auto mb-3" style={{ color: kpis.currentLoad.color }} />}
                  <div className="text-5xl font-black mb-2" style={{ color: kpis.currentLoad.color }}>
                    {kpis.currentLoad.level}
                  </div>
                  <div className="text-sm font-semibold text-gray-700">עומס נוכחי ({kpis.currentLoad.count} ממתינים)</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content - Only show if there's data */}
        {!hasData ? (
          <Card className="bg-white shadow-md" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: '#1F5F25' }}>
                אין נתונים להצגה
              </h3>
              <p className="text-gray-600 text-lg mb-6">
                לא נמצאו תורים בטווח הזמן והפילטרים שנבחרו
              </p>
              <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-sm text-gray-700 font-medium mb-2">💡 טיפים:</p>
                <ul className="text-sm text-gray-600 space-y-1 text-right">
                  <li>• נסה לבחור טווח זמן אחר (שבוע / חודש)</li>
                  <li>• בדוק שיש תורים פעילים בסניף שנבחר</li>
                  <li>• נסה לבחור "כל הסניפים"</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Top 5 Employees Chart */}
            {getTopEmployees().length > 0 && (
              <Card className="bg-white shadow-md" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                <CardHeader style={{ backgroundColor: '#E6F9EA' }}>
                  <CardTitle className="text-xl font-bold" style={{ color: '#1F5F25' }}>
                    🏆 Top 5 עובדים - תורים שטופלו
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">העובדים המובילים בטיפול בלקוחות</p>
                </CardHeader>
                <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={getTopEmployees()} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '2px solid #41B649',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="ticketsServed" fill="#41B649" name="תורים שטופלו" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Wait Times by Hour */}
            {getWaitTimesByHour().length > 0 && (
              <Card className="bg-white shadow-md" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                <CardHeader style={{ backgroundColor: '#E6F9EA' }}>
                  <CardTitle className="text-xl font-bold" style={{ color: '#1F5F25' }}>
                    ⏱️ זמני המתנה לפי שעות
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">זמן שירות ממוצע בכל שעה (דקות)</p>
                </CardHeader>
                <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={getWaitTimesByHour()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="hour" />
                      <YAxis label={{ value: 'דקות', angle: -90, position: 'insideLeft' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '2px solid #41B649',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar 
                        dataKey="avgWait" 
                        fill="#F59E0B" 
                        name="זמן ממוצע" 
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Detailed Employee Table */}
            {getTopEmployees().length > 0 && (
              <Card className="bg-white shadow-md" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                <CardHeader style={{ backgroundColor: '#E6F9EA' }}>
                  <CardTitle className="text-xl font-bold" style={{ color: '#1F5F25' }}>
                    👥 ביצועי עובדים מפורט
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right font-bold">דירוג</TableHead>
                        <TableHead className="text-right font-bold">שם עובד</TableHead>
                        <TableHead className="text-right font-bold">תורים שטופלו</TableHead>
                        <TableHead className="text-right font-bold">זמן שירות ממוצע</TableHead>
                        <TableHead className="text-right font-bold">ביצועים</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getTopEmployees().map((emp, index) => {
                        const allEmps = getTopEmployees();
                        const avgTickets = allEmps.reduce((s, e) => s + e.ticketsServed, 0) / allEmps.length;
                        const performanceRatio = emp.ticketsServed / avgTickets;
                        
                        let badge = { text: "בממוצע", color: "#6B7280" };
                        if (performanceRatio >= 1.2) {
                          badge = { text: "מעולה", color: "#41B649" };
                        } else if (performanceRatio >= 1.0) {
                          badge = { text: "טוב", color: "#41B649" };
                        } else if (performanceRatio < 0.8) {
                          badge = { text: "דורש תשומת לב", color: "#E52521" };
                        }
                        
                        return (
                          <TableRow key={emp.name}>
                            <TableCell>
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                style={{ backgroundColor: index === 0 ? '#E52521' : index === 1 ? '#F59E0B' : '#41B649' }}
                              >
                                {index + 1}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold text-lg">{emp.name}</TableCell>
                            <TableCell>
                              <span className="text-2xl font-bold" style={{ color: '#1F5F25' }}>
                                {emp.ticketsServed}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium text-lg">
                              {emp.avgServiceTime} דקות
                            </TableCell>
                            <TableCell>
                              <Badge 
                                style={{ 
                                  backgroundColor: badge.color + '20',
                                  color: badge.color,
                                  borderColor: badge.color,
                                  borderWidth: '2px',
                                  fontSize: '0.875rem',
                                  padding: '0.5rem 1rem'
                                }}
                              >
                                {badge.text}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}