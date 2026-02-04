import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Calendar, Clock, TrendingUp, Users, Award, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Reports() {
  const [tickets, setTickets] = useState([]);
  const [branches, setBranches] = useState([]);
  const [queues, setQueues] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [dateRange, setDateRange] = useState("7days");
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

  const filterTicketsByDateRange = (tickets) => {
    if (dateRange === "custom" && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      
      return tickets.filter(t => {
        const createdDate = new Date(t.created_date);
        return createdDate >= start && createdDate <= end;
      });
    }
    
    const now = new Date();
    const ranges = {
      "7days": 7,
      "30days": 30,
      "90days": 90,
      "all": 99999
    };
    const days = ranges[dateRange] || 7;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return tickets.filter(t => {
      const createdDate = new Date(t.created_date);
      return createdDate >= cutoff;
    });
  };

  const getFilteredTickets = () => {
    let filtered = filterTicketsByDateRange(tickets);
    
    if (selectedBranch !== "all") {
      filtered = filtered.filter(t => t.branch_id === selectedBranch);
    }
    
    return filtered;
  };

  // Statistics calculations
  const calculateStats = () => {
    const filtered = getFilteredTickets();
    
    const totalTickets = filtered.length;
    const servedTickets = filtered.filter(t => t.state === "served").length;
    const cancelledTickets = filtered.filter(t => t.state === "cancelled").length;
    
    // Average wait time (for served tickets)
    const servedWithTime = filtered.filter(t => 
      t.state === "served" && t.called_at && t.finished_at
    );
    
    const avgWaitTime = servedWithTime.length > 0 
      ? servedWithTime.reduce((sum, t) => {
          const wait = new Date(t.finished_at) - new Date(t.called_at);
          return sum + wait;
        }, 0) / servedWithTime.length / 60000 // convert to minutes
      : 0;

    return {
      totalTickets,
      servedTickets,
      cancelledTickets,
      avgWaitTime: Math.round(avgWaitTime)
    };
  };

  // Tickets by hour
  const getTicketsByHour = () => {
    const filtered = getFilteredTickets();
    const hourCounts = {};
    
    for (let i = 0; i < 24; i++) {
      hourCounts[i] = 0;
    }
    
    filtered.forEach(ticket => {
      const hour = new Date(ticket.created_date).getHours();
      hourCounts[hour]++;
    });
    
    return Object.entries(hourCounts).map(([hour, count]) => ({
      hour: `${hour}:00`,
      tickets: count
    }));
  };

  // Tickets by day (last 7/30/90 days)
  const getTicketsByDay = () => {
    const filtered = getFilteredTickets();
    const dayCounts = {};
    
    filtered.forEach(ticket => {
      const date = new Date(ticket.created_date).toLocaleDateString('he-IL');
      dayCounts[date] = (dayCounts[date] || 0) + 1;
    });
    
    return Object.entries(dayCounts)
      .map(([date, count]) => ({ date, tickets: count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30); // last 30 days max
  };

  // Popular departments
  const getPopularDepartments = () => {
    const filtered = getFilteredTickets();
    const deptCounts = {};
    
    filtered.forEach(ticket => {
      const queue = queues.find(q => q.id === ticket.queue_id);
      if (queue) {
        deptCounts[queue.name] = (deptCounts[queue.name] || 0) + 1;
      }
    });
    
    return Object.entries(deptCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  // Tickets by branch
  const getTicketsByBranch = () => {
    const filtered = tickets.filter(t => {
      const createdDate = new Date(t.created_date);
      const now = new Date();
      const ranges = { "7days": 7, "30days": 30, "90days": 90, "all": 99999 };
      const days = ranges[dateRange] || 7;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      return createdDate >= cutoff;
    });
    
    const branchCounts = {};
    
    filtered.forEach(ticket => {
      const branch = branches.find(b => b.id === ticket.branch_id);
      if (branch) {
        branchCounts[branch.name] = (branchCounts[branch.name] || 0) + 1;
      }
    });
    
    return Object.entries(branchCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  // Ticket sources
  const getTicketSources = () => {
    const filtered = getFilteredTickets();
    const sourceCounts = { kiosk: 0, qr: 0, web: 0 };
    
    filtered.forEach(ticket => {
      if (ticket.source && sourceCounts.hasOwnProperty(ticket.source)) {
        sourceCounts[ticket.source]++;
      }
    });
    
    return Object.entries(sourceCounts).map(([name, value]) => ({ 
      name: name === 'kiosk' ? 'קיוסק' : name === 'qr' ? 'QR' : 'אינטרנט',
      value 
    }));
  };

  // Wait time by department
  const getWaitTimeByDepartment = () => {
    const filtered = getFilteredTickets();
    const deptWaitTimes = {};
    
    filtered.forEach(ticket => {
      if (ticket.state === "served" && ticket.called_at && ticket.finished_at) {
        const queue = queues.find(q => q.id === ticket.queue_id);
        if (queue) {
          const waitTime = (new Date(ticket.finished_at) - new Date(ticket.called_at)) / 60000;
          if (!deptWaitTimes[queue.name]) {
            deptWaitTimes[queue.name] = { total: 0, count: 0 };
          }
          deptWaitTimes[queue.name].total += waitTime;
          deptWaitTimes[queue.name].count++;
        }
      }
    });
    
    return Object.entries(deptWaitTimes).map(([name, data]) => ({
      name,
      avgWaitTime: Math.round(data.total / data.count)
    }));
  };

  // Cancelled/no-show tickets
  const getCancelledTickets = () => {
    const filtered = getFilteredTickets().filter(t => t.state === "cancelled");
    return filtered.map(ticket => {
      const queue = queues.find(q => q.id === ticket.queue_id);
      const branch = branches.find(b => b.id === ticket.branch_id);
      return {
        ...ticket,
        queueName: queue?.name || "לא ידוע",
        branchName: branch?.name || "לא ידוע",
        createdTime: new Date(ticket.created_date).toLocaleString('he-IL')
      };
    });
  };

  // Peak times - concurrent active tickets
  const getPeakTimes = () => {
    const filtered = getFilteredTickets();
    const hourConcurrent = {};
    
    for (let i = 0; i < 24; i++) {
      hourConcurrent[i] = 0;
    }
    
    filtered.forEach(ticket => {
      if (ticket.created_date) {
        const createdHour = new Date(ticket.created_date).getHours();
        hourConcurrent[createdHour]++;
      }
    });
    
    return Object.entries(hourConcurrent)
      .map(([hour, count]) => ({ hour: `${hour}:00`, concurrent: count }))
      .sort((a, b) => b.concurrent - a.concurrent);
  };

  // Employee performance statistics
  const getEmployeePerformance = () => {
    const filtered = getFilteredTickets().filter(t => t.state === "served" && t.served_by);
    const employeeStats = {};
    
    filtered.forEach(ticket => {
      const employeeEmail = ticket.served_by;
      if (!employeeStats[employeeEmail]) {
        employeeStats[employeeEmail] = {
          email: employeeEmail,
          ticketsServed: 0,
          totalServiceTime: 0,
          totalWaitTime: 0,
          ticketsWithTime: 0
        };
      }
      
      employeeStats[employeeEmail].ticketsServed++;
      
      if (ticket.service_time_seconds) {
        employeeStats[employeeEmail].totalServiceTime += ticket.service_time_seconds;
        employeeStats[employeeEmail].ticketsWithTime++;
      }
      
      if (ticket.called_at && ticket.finished_at) {
        const waitTime = (new Date(ticket.finished_at) - new Date(ticket.called_at)) / 1000;
        employeeStats[employeeEmail].totalWaitTime += waitTime;
      }
    });
    
    return Object.values(employeeStats).map(emp => {
      const user = users.find(u => u.email === emp.email);
      return {
        name: user?.full_name || emp.email,
        email: emp.email,
        ticketsServed: emp.ticketsServed,
        avgServiceTime: emp.ticketsWithTime > 0 
          ? Math.round(emp.totalServiceTime / emp.ticketsWithTime / 60) 
          : 0,
        avgWaitTime: emp.ticketsServed > 0
          ? Math.round(emp.totalWaitTime / emp.ticketsServed / 60)
          : 0
      };
    }).sort((a, b) => b.ticketsServed - a.ticketsServed);
  };

  const getEmployeeServiceTimeChart = () => {
    return getEmployeePerformance().slice(0, 10).map(emp => ({
      name: emp.name,
      avgTime: emp.avgServiceTime
    }));
  };

  const getEmployeeTicketsChart = () => {
    return getEmployeePerformance().slice(0, 10).map(emp => ({
      name: emp.name,
      tickets: emp.ticketsServed
    }));
  };

  const COLORS = ['#E52521', '#41B649', '#1F5F25', '#F59E0B', '#8B5CF6'];

  const stats = calculateStats();

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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#1F5F25' }}>
            דוחות וסטטיסטיקות
          </h1>
          <p className="text-gray-600">ניתוח מקיף של נתוני התורים במערכת</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-48 bg-white">
              <SelectValue placeholder="בחר סניף" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסניפים</SelectItem>
              {branches.map(branch => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-48 bg-white">
              <SelectValue placeholder="טווח זמן" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">7 ימים אחרונים</SelectItem>
              <SelectItem value="30days">30 ימים אחרונים</SelectItem>
              <SelectItem value="90days">90 ימים אחרונים</SelectItem>
              <SelectItem value="all">כל הזמן</SelectItem>
              <SelectItem value="custom">טווח מותאם אישית</SelectItem>
            </SelectContent>
          </Select>

          {dateRange === "custom" && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">מתאריך:</label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">עד תאריך:</label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white"
                />
              </div>
              {customStartDate && customEndDate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomStartDate("");
                    setCustomEndDate("");
                    setDateRange("7days");
                  }}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  נקה
                </Button>
              )}
            </>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">סך תורים</CardTitle>
              <Users className="h-4 w-4" style={{ color: '#41B649' }} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#1F5F25' }}>
                {stats.totalTickets}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">תורים שרותו</CardTitle>
              <Award className="h-4 w-4" style={{ color: '#41B649' }} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#1F5F25' }}>
                {stats.servedTickets}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalTickets > 0 ? Math.round((stats.servedTickets / stats.totalTickets) * 100) : 0}% מסך התורים
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">זמן המתנה ממוצע</CardTitle>
              <Clock className="h-4 w-4" style={{ color: '#41B649' }} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#1F5F25' }}>
                {stats.avgWaitTime}
              </div>
              <p className="text-xs text-gray-500 mt-1">דקות</p>
            </CardContent>
          </Card>

          <Card className="bg-white" style={{ borderColor: '#E52521', borderWidth: '2px' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">תורים שבוטלו</CardTitle>
              <TrendingUp className="h-4 w-4" style={{ color: '#E52521' }} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#E52521' }}>
                {stats.cancelledTickets}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalTickets > 0 ? Math.round((stats.cancelledTickets / stats.totalTickets) * 100) : 0}% מסך התורים
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="hourly" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9 mb-6 bg-white">
            <TabsTrigger value="hourly">לפי שעה</TabsTrigger>
            <TabsTrigger value="daily">לפי יום</TabsTrigger>
            <TabsTrigger value="departments">מחלקות</TabsTrigger>
            <TabsTrigger value="branches">סניפים</TabsTrigger>
            <TabsTrigger value="sources">מקורות</TabsTrigger>
            <TabsTrigger value="waittime">זמן המתנה</TabsTrigger>
            <TabsTrigger value="cancelled">ביטולים</TabsTrigger>
            <TabsTrigger value="peak">זמן שיא</TabsTrigger>
            <TabsTrigger value="employees">עובדים</TabsTrigger>
          </TabsList>

          <TabsContent value="hourly">
            <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
              <CardHeader>
                <CardTitle style={{ color: '#1F5F25' }}>פילוח תורים לפי שעה</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getTicketsByHour()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tickets" fill="#41B649" name="תורים" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily">
            <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
              <CardHeader>
                <CardTitle style={{ color: '#1F5F25' }}>פילוח תורים לפי יום</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={getTicketsByDay()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="tickets" stroke="#E52521" strokeWidth={2} name="תורים" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departments">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                <CardHeader>
                  <CardTitle style={{ color: '#1F5F25' }}>מחלקות פופולריות</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={getPopularDepartments()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getPopularDepartments().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                <CardHeader>
                  <CardTitle style={{ color: '#1F5F25' }}>טבלת מחלקות</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {getPopularDepartments().map((dept, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium">{dept.name}</span>
                        </div>
                        <span className="font-bold text-lg" style={{ color: '#1F5F25' }}>
                          {dept.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="branches">
            <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
              <CardHeader>
                <CardTitle style={{ color: '#1F5F25' }}>פילוח תורים לפי סניפים</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getTicketsByBranch()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#E52521" name="תורים" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources">
            <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
              <CardHeader>
                <CardTitle style={{ color: '#1F5F25' }}>מקורות יצירת תורים</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={getTicketSources()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getTicketSources().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="waittime">
            <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
              <CardHeader>
                <CardTitle style={{ color: '#1F5F25' }}>זמן המתנה ממוצע לפי מחלקה</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getWaitTimeByDepartment()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'דקות', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgWaitTime" fill="#F59E0B" name="זמן ממוצע (דקות)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cancelled">
            <Card className="bg-white" style={{ borderColor: '#E52521', borderWidth: '2px' }}>
              <CardHeader>
                <CardTitle style={{ color: '#E52521' }}>תורים שבוטלו / לא הופיעו</CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  סה"כ {getCancelledTickets().length} תורים שבוטלו בטווח הנבחר
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">מספר תור</TableHead>
                        <TableHead className="text-right">סניף</TableHead>
                        <TableHead className="text-right">מחלקה</TableHead>
                        <TableHead className="text-right">תאריך ושעה</TableHead>
                        <TableHead className="text-right">טלפון</TableHead>
                        <TableHead className="text-right">מקור</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getCancelledTickets().length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500">
                            אין תורים שבוטלו בטווח הנבחר
                          </TableCell>
                        </TableRow>
                      ) : (
                        getCancelledTickets().map((ticket) => (
                          <TableRow key={ticket.id}>
                            <TableCell className="font-medium">{ticket.ticket_number}</TableCell>
                            <TableCell>{ticket.branchName}</TableCell>
                            <TableCell>{ticket.queueName}</TableCell>
                            <TableCell className="text-sm">{ticket.createdTime}</TableCell>
                            <TableCell className="text-sm">{ticket.customer_phone || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {ticket.source === 'kiosk' ? 'קיוסק' : ticket.source === 'qr' ? 'QR' : 'אינטרנט'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="peak">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                <CardHeader>
                  <CardTitle style={{ color: '#1F5F25' }}>זמני שיא - תורים לפי שעה</CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    השעות עם הכי הרבה תורים פעילים
                  </p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={getPeakTimes().slice(0, 12)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="concurrent" fill="#E52521" name="תורים פעילים" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                <CardHeader>
                  <CardTitle style={{ color: '#1F5F25' }}>דירוג שעות השיא</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getPeakTimes().slice(0, 10).map((peak, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: index < 3 ? '#E52521' : '#41B649' }}
                          >
                            {index + 1}
                          </div>
                          <span className="font-medium text-lg">{peak.hour}</span>
                        </div>
                        <span className="font-bold text-xl" style={{ color: '#1F5F25' }}>
                          {peak.concurrent} תורים
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="employees">
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">סה"כ עובדים פעילים</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" style={{ color: '#1F5F25' }}>
                      {getEmployeePerformance().length}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">ממוצע תורים לעובד</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" style={{ color: '#1F5F25' }}>
                      {getEmployeePerformance().length > 0
                        ? Math.round(getEmployeePerformance().reduce((sum, e) => sum + e.ticketsServed, 0) / getEmployeePerformance().length)
                        : 0}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">ממוצע זמן שירות</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" style={{ color: '#1F5F25' }}>
                      {getEmployeePerformance().length > 0
                        ? Math.round(getEmployeePerformance().reduce((sum, e) => sum + e.avgServiceTime, 0) / getEmployeePerformance().length)
                        : 0}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">דקות</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                  <CardHeader>
                    <CardTitle style={{ color: '#1F5F25' }}>תורים שטופלו לפי עובד</CardTitle>
                    <p className="text-sm text-gray-600 mt-2">10 העובדים המובילים</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={getEmployeeTicketsChart()} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={120} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="tickets" fill="#41B649" name="תורים שטופלו" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                  <CardHeader>
                    <CardTitle style={{ color: '#1F5F25' }}>זמן שירות ממוצע לעובד</CardTitle>
                    <p className="text-sm text-gray-600 mt-2">בדקות</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={getEmployeeServiceTimeChart()} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={120} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="avgTime" fill="#E52521" name="זמן ממוצע (דקות)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Table */}
              <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                <CardHeader>
                  <CardTitle style={{ color: '#1F5F25' }}>טבלת ביצועים מפורטת</CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    נתוני ביצועים מלאים לכל עובד
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">דירוג</TableHead>
                          <TableHead className="text-right">שם עובד</TableHead>
                          <TableHead className="text-right">תורים שטופלו</TableHead>
                          <TableHead className="text-right">זמן שירות ממוצע</TableHead>
                          <TableHead className="text-right">זמן המתנה ממוצע</TableHead>
                          <TableHead className="text-right">ביצועים</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getEmployeePerformance().length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                              אין נתוני עובדים זמינים לטווח הנבחר
                            </TableCell>
                          </TableRow>
                        ) : (
                          getEmployeePerformance().map((emp, index) => {
                            const allEmployees = getEmployeePerformance();
                            const avgTickets = allEmployees.reduce((sum, e) => sum + e.ticketsServed, 0) / allEmployees.length;
                            const avgServiceTime = allEmployees.reduce((sum, e) => sum + e.avgServiceTime, 0) / allEmployees.length;
                            
                            // Performance rating based on tickets served and service time
                            const ticketsScore = (emp.ticketsServed / avgTickets) * 50;
                            const timeScore = emp.avgServiceTime > 0 
                              ? (avgServiceTime / emp.avgServiceTime) * 50 
                              : 0;
                            const totalScore = Math.min(100, ticketsScore + timeScore);
                            
                            let performanceBadge = { text: "טוב", color: "#41B649" };
                            if (totalScore >= 90) {
                              performanceBadge = { text: "מצוין", color: "#1F5F25" };
                            } else if (totalScore >= 70) {
                              performanceBadge = { text: "טוב מאוד", color: "#41B649" };
                            } else if (totalScore < 50) {
                              performanceBadge = { text: "דורש שיפור", color: "#E52521" };
                            }
                            
                            return (
                              <TableRow key={emp.email}>
                                <TableCell>
                                  <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                    style={{ backgroundColor: index < 3 ? '#E52521' : '#41B649' }}
                                  >
                                    {index + 1}
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">{emp.name}</TableCell>
                                <TableCell>
                                  <span className="text-lg font-bold" style={{ color: '#1F5F25' }}>
                                    {emp.ticketsServed}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="font-medium">{emp.avgServiceTime} דקות</span>
                                </TableCell>
                                <TableCell>
                                  <span className="font-medium">{emp.avgWaitTime} דקות</span>
                                </TableCell>
                                <TableCell>
                                  <Badge style={{ 
                                    backgroundColor: performanceBadge.color + '20',
                                    color: performanceBadge.color,
                                    borderColor: performanceBadge.color,
                                    borderWidth: '1px'
                                  }}>
                                    {performanceBadge.text}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}