import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Calendar, Clock, TrendingUp, Users, Award } from "lucide-react";

export default function Reports() {
  const [tickets, setTickets] = useState([]);
  const [branches, setBranches] = useState([]);
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [dateRange, setDateRange] = useState("7days");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ticketsData, branchesData, queuesData] = await Promise.all([
        base44.entities.Ticket.list(),
        base44.entities.Branch.list(),
        base44.entities.Queue.list()
      ]);

      setTickets(ticketsData);
      setBranches(branchesData);
      setQueues(queuesData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterTicketsByDateRange = (tickets) => {
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
        <div className="flex gap-4 mb-6">
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
            </SelectContent>
          </Select>
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
          <TabsList className="grid w-full grid-cols-5 mb-6 bg-white">
            <TabsTrigger value="hourly">לפי שעה</TabsTrigger>
            <TabsTrigger value="daily">לפי יום</TabsTrigger>
            <TabsTrigger value="departments">מחלקות</TabsTrigger>
            <TabsTrigger value="branches">סניפים</TabsTrigger>
            <TabsTrigger value="sources">מקורות</TabsTrigger>
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
        </Tabs>
      </div>
    </div>
  );
}