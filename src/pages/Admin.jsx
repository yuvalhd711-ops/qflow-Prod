import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Building2, Phone, Wrench } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEPARTMENT_TYPES = ["קצבייה", "מעדנייה", "דגים"];

export default function Admin() {
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [branchSettings, setBranchSettings] = useState({});
  const [contacts, setContacts] = useState([]);
  
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  
  const [branchForm, setBranchForm] = useState({
    name: "",
    address: "",
    is_active: true
  });

  const [contactForm, setContactForm] = useState({
    branch_id: "",
    contact_name: "",
    phone_number: "",
    is_active: true
  });

  const [runningBackfill, setRunningBackfill] = useState(false);
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);
  const [testingSms, setTestingSms] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [showSmsTestDialog, setShowSmsTestDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [branchesData, settingsData, contactsData] = await Promise.all([
        base44.entities.Branch.list(),
        base44.entities.BranchDepartmentSetting.list(),
        base44.entities.BranchContact.list()
      ]);

      setBranches(branchesData);
      setContacts(contactsData);

      // Organize settings by branch
      const settingsByBranch = {};
      settingsData.forEach(setting => {
        if (!settingsByBranch[setting.branch_id]) {
          settingsByBranch[setting.branch_id] = {};
        }
        settingsByBranch[setting.branch_id][setting.department] = setting;
      });
      setBranchSettings(settingsByBranch);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const createBranch = async () => {
    if (!branchForm.name.trim()) {
      alert("יש להזין שם סניף");
      return;
    }

    try {
      // Check if branch with same name exists
      const existing = branches.find(b => b.name.toLowerCase() === branchForm.name.toLowerCase());
      
      if (existing) {
        // Update existing
        await base44.entities.Branch.update(existing.id, branchForm);
      } else {
        // Create new
        await base44.entities.Branch.create(branchForm);
      }

      setShowBranchDialog(false);
      setBranchForm({ name: "", address: "", is_active: true });
      await loadData();
      alert("סניף נשמר בהצלחה");
    } catch (error) {
      console.error("Error creating branch:", error);
      alert("שגיאה בשמירת סניף");
    }
  };

  const deleteBranch = async (branch) => {
    if (!confirm(`האם למחוק את סניף ${branch.name}?`)) {
      return;
    }

    try {
      // Delete related entities
      const [queues, settings, branchContacts] = await Promise.all([
        base44.entities.Queue.filter({ branch_id: branch.id }),
        base44.entities.BranchDepartmentSetting.filter({ branch_id: branch.id }),
        base44.entities.BranchContact.filter({ branch_id: branch.id })
      ]);

      await Promise.all([
        ...queues.map(q => base44.entities.Queue.delete(q.id)),
        ...settings.map(s => base44.entities.BranchDepartmentSetting.delete(s.id)),
        ...branchContacts.map(c => base44.entities.BranchContact.delete(c.id)),
        base44.entities.Branch.delete(branch.id)
      ]);

      await loadData();
      alert("סניף נמחק בהצלחה");
    } catch (error) {
      console.error("Error deleting branch:", error);
      alert("שגיאה במחיקת סניף");
    }
  };

  const toggleDepartment = (branchId, department, currentValue) => {
    setBranchSettings(prev => ({
      ...prev,
      [branchId]: {
        ...prev[branchId],
        [department]: {
          ...(prev[branchId]?.[department] || {}),
          branch_id: branchId,
          department: department,
          is_active: !currentValue
        }
      }
    }));
  };

  const saveBranchSettings = async (branchId) => {
    try {
      const settings = branchSettings[branchId] || {};
      
      for (const department of DEPARTMENT_TYPES) {
        const setting = settings[department];
        if (setting) {
          if (setting.id) {
            // Update existing
            await base44.entities.BranchDepartmentSetting.update(setting.id, {
              is_active: setting.is_active
            });
          } else {
            // Create new
            await base44.entities.BranchDepartmentSetting.create({
              branch_id: branchId,
              department: department,
              is_active: setting.is_active
            });
          }

          // Create or update queue
          const existingQueues = await base44.entities.Queue.filter({
            branch_id: branchId,
            name: department
          });

          if (existingQueues.length === 0 && setting.is_active) {
            await base44.entities.Queue.create({
              branch_id: branchId,
              name: department,
              seq_counter: 0,
              avg_service_time_seconds: 180,
              is_active: true
            });
          } else if (existingQueues.length > 0) {
            await base44.entities.Queue.update(existingQueues[0].id, {
              is_active: setting.is_active
            });
          }
        }
      }

      await loadData();
      alert("הגדרות נשמרו בהצלחה");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("שגיאה בשמירת הגדרות");
    }
  };

  const createContact = async () => {
    if (!contactForm.branch_id || !contactForm.contact_name.trim() || !contactForm.phone_number.trim()) {
      alert("יש למלא את כל השדות");
      return;
    }

    try {
      await base44.entities.BranchContact.create(contactForm);
      setShowContactDialog(false);
      setContactForm({ branch_id: "", contact_name: "", phone_number: "", is_active: true });
      await loadData();
      alert("איש קשר נוסף בהצלחה");
    } catch (error) {
      console.error("Error creating contact:", error);
      alert("שגיאה בהוספת איש קשר");
    }
  };

  const deleteContact = async (contact) => {
    if (!confirm(`האם למחוק את ${contact.contact_name}?`)) {
      return;
    }

    try {
      await base44.entities.BranchContact.delete(contact.id);
      await loadData();
      alert("איש קשר נמחק בהצלחה");
    } catch (error) {
      console.error("Error deleting contact:", error);
      alert("שגיאה במחיקת איש קשר");
    }
  };

  const runBackfill = async () => {
    if (!confirm("האם להריץ תיקון תורים? פעולה זו תיצור הגדרות ותורים חסרים.")) {
      return;
    }

    setRunningBackfill(true);
    try {
      const allBranches = await base44.entities.Branch.list();
      
      for (const branch of allBranches) {
        for (const dept of DEPARTMENT_TYPES) {
          // Check if setting exists
          const existingSettings = await base44.entities.BranchDepartmentSetting.filter({
            branch_id: branch.id,
            department: dept
          });

          if (existingSettings.length === 0) {
            // Create setting
            await base44.entities.BranchDepartmentSetting.create({
              branch_id: branch.id,
              department: dept,
              is_active: true
            });
          }

          // Check if queue exists
          const existingQueues = await base44.entities.Queue.filter({
            branch_id: branch.id,
            name: dept
          });

          if (existingQueues.length === 0) {
            // Create queue
            await base44.entities.Queue.create({
              branch_id: branch.id,
              name: dept,
              seq_counter: 0,
              avg_service_time_seconds: 180,
              is_active: true
            });
          }
        }
      }

      await loadData();
      alert("תיקון תורים הושלם בהצלחה");
    } catch (error) {
      console.error("Error running backfill:", error);
      alert("שגיאה בתיקון תורים");
    } finally {
      setRunningBackfill(false);
    }
  };

  const cleanDuplicates = async () => {
    if (!confirm("האם לנקות סניפים כפולים? פעולה זו תמזג סניפים עם אותו שם.")) {
      return;
    }

    setCleaningDuplicates(true);
    try {
      const allBranches = await base44.entities.Branch.list();
      const branchMap = {};

      // Group by name (case insensitive)
      allBranches.forEach(branch => {
        const key = branch.name.toLowerCase().trim();
        if (!branchMap[key]) {
          branchMap[key] = [];
        }
        branchMap[key].push(branch);
      });

      // Process duplicates
      for (const [name, duplicates] of Object.entries(branchMap)) {
        if (duplicates.length > 1) {
          // Keep the first one, merge others into it
          const [primary, ...toMerge] = duplicates.sort((a, b) => 
            new Date(a.created_date) - new Date(b.created_date)
          );

          for (const duplicate of toMerge) {
            // Move all related entities to primary
            const [queues, settings, branchContacts] = await Promise.all([
              base44.entities.Queue.filter({ branch_id: duplicate.id }),
              base44.entities.BranchDepartmentSetting.filter({ branch_id: duplicate.id }),
              base44.entities.BranchContact.filter({ branch_id: duplicate.id })
            ]);

            await Promise.all([
              ...queues.map(q => base44.entities.Queue.update(q.id, { branch_id: primary.id })),
              ...settings.map(s => base44.entities.BranchDepartmentSetting.update(s.id, { branch_id: primary.id })),
              ...branchContacts.map(c => base44.entities.BranchContact.update(c.id, { branch_id: primary.id }))
            ]);

            // Delete duplicate
            await base44.entities.Branch.delete(duplicate.id);
          }
        }
      }

      await loadData();
      alert("ניקוי כפילויות הושלם בהצלחה");
    } catch (error) {
      console.error("Error cleaning duplicates:", error);
      alert("שגיאה בניקוי כפילויות");
    } finally {
      setCleaningDuplicates(false);
    }
  };

  const testSms = async () => {
    if (!testPhone.trim()) {
      alert("יש להזין מספר טלפון");
      return;
    }

    setTestingSms(true);
    try {
      const response = await base44.functions.invoke('sendSms', {
        phoneNumber: testPhone,
        queueName: "בדיקה",
        ticketSeq: 999,
        messageOverride: "בדיקת SMS מ-QFLOW - שוק העיר"
      });

      console.log("Test SMS Response:", response);
      const result = response.data;
      
      if (result.ok) {
        alert("✅ SMS נשלח בהצלחה!\n\n" + JSON.stringify(result, null, 2));
      } else {
        alert("❌ שגיאה בשליחת SMS:\n\n" + (result.error || JSON.stringify(result, null, 2)));
      }
    } catch (error) {
      console.error("Test SMS error:", error);
      alert("❌ שגיאה:\n\n" + String(error));
    } finally {
      setTestingSms(false);
      setShowSmsTestDialog(false);
      setTestPhone("");
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
            <h1 className="text-4xl font-bold" style={{ color: '#111111' }}>ניהול מערכת</h1>
            <p className="text-gray-700">ניהול סניפים, מחלקות ואנשי קשר</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowSmsTestDialog(true)}
              className="text-white"
              style={{ backgroundColor: '#E52521' }}
            >
              📱 בדיקת SMS
            </Button>
            <Button
              onClick={runBackfill}
              disabled={runningBackfill}
              className="text-white"
              style={{ backgroundColor: '#41B649' }}
            >
              <Wrench className="w-4 h-4 ml-2" />
              {runningBackfill ? "מתקן..." : "🔧 תקן תורים"}
            </Button>
            <Button
              onClick={cleanDuplicates}
              disabled={cleaningDuplicates}
              className="text-white"
              style={{ backgroundColor: '#E52521' }}
            >
              <Trash2 className="w-4 h-4 ml-2" />
              {cleaningDuplicates ? "מנקה..." : "🧹 נקה כפילויות"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="branches" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="branches" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-900">
              <Building2 className="w-4 h-4 ml-2" />
              סניפים ומחלקות
            </TabsTrigger>
            <TabsTrigger value="contacts" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-900">
              <Phone className="w-4 h-4 ml-2" />
              התראות SMS
            </TabsTrigger>
            <TabsTrigger value="ips" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-900">
              <Shield className="w-4 h-4 ml-2" />
              🔒 הלבנת IP
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branches">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => setShowBranchDialog(true)}
                className="text-white"
                style={{ backgroundColor: '#E52521' }}
              >
                <Plus className="w-4 h-4 ml-2" />
                סניף חדש
              </Button>
            </div>

            <div className="space-y-4">
              {branches.map((branch) => (
                <Card key={branch.id} className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                  <CardHeader style={{ backgroundColor: '#E6F9EA', borderBottom: '1px solid #41B649' }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-2xl">{branch.name}</CardTitle>
                        {branch.address && <p className="text-gray-600 mt-1">{branch.address}</p>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBranch(branch)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <h3 className="font-bold mb-4 text-lg">מחלקות:</h3>
                    <div className="space-y-3">
                      {DEPARTMENT_TYPES.map((dept) => {
                        const isActive = branchSettings[branch.id]?.[dept]?.is_active ?? false;
                        return (
                          <div key={dept} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium">{dept}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-600">
                                {isActive ? "פעיל" : "כבוי"}
                              </span>
                              <Switch
                                checked={isActive}
                                onCheckedChange={() => toggleDepartment(branch.id, dept, isActive)}
                                style={isActive ? { backgroundColor: '#41B649' } : {}}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Button
                      onClick={() => saveBranchSettings(branch.id)}
                      className="w-full mt-4 text-white"
                      style={{ backgroundColor: '#41B649' }}
                    >
                      שמור שינויים
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="contacts">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => setShowContactDialog(true)}
                className="text-white"
                style={{ backgroundColor: '#E52521' }}
              >
                <Plus className="w-4 h-4 ml-2" />
                איש קשר חדש
              </Button>
            </div>

            <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
              <CardContent className="p-6">
                {contacts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Phone className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>אין אנשי קשר מוגדרים</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>סניף</TableHead>
                        <TableHead>שם</TableHead>
                        <TableHead>טלפון</TableHead>
                        <TableHead>סטטוס</TableHead>
                        <TableHead>פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact) => {
                        const branch = branches.find(b => b.id === contact.branch_id);
                        return (
                          <TableRow key={contact.id}>
                            <TableCell>{branch?.name || "-"}</TableCell>
                            <TableCell>{contact.contact_name}</TableCell>
                            <TableCell className="font-mono">{contact.phone_number}</TableCell>
                            <TableCell>
                              <Badge variant={contact.is_active ? "default" : "secondary"} style={contact.is_active ? { backgroundColor: '#41B649' } : {}}>
                                {contact.is_active ? "פעיל" : "לא פעיל"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteContact(contact)}
                                style={{ backgroundColor: '#E52521' }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ips">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => setShowIpDialog(true)}
                className="text-white"
                style={{ backgroundColor: '#E52521' }}
              >
                <Plus className="w-4 h-4 ml-2" />
                כתובת IP חדשה
              </Button>
            </div>

            <Card className="bg-white" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
              <CardContent className="p-6">
                {allowedIPs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>אין כתובות IP מוגדרות</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>כתובת IP</TableHead>
                        <TableHead>תיאור</TableHead>
                        <TableHead>סטטוס</TableHead>
                        <TableHead>פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allowedIPs.map((ip) => (
                        <TableRow key={ip.id}>
                          <TableCell className="font-mono font-bold">{ip.ip_address}</TableCell>
                          <TableCell>{ip.description || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={ip.is_active}
                                onCheckedChange={() => toggleIPStatus(ip)}
                              />
                              <Badge variant={ip.is_active ? "default" : "secondary"} style={ip.is_active ? { backgroundColor: '#41B649' } : {}}>
                                {ip.is_active ? "פעיל" : "לא פעיל"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteIP(ip)}
                              style={{ backgroundColor: '#E52521' }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Branch Dialog */}
        <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>סניף חדש</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>שם הסניף</Label>
                <Input
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  placeholder="לדוגמה: תל אביב מרכז"
                />
              </div>
              <div>
                <Label>כתובת</Label>
                <Input
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  placeholder="לדוגמה: רחוב הרצל 123"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={branchForm.is_active}
                  onCheckedChange={(checked) => setBranchForm({ ...branchForm, is_active: checked })}
                />
                <Label>סניף פעיל</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBranchDialog(false)}>
                ביטול
              </Button>
              <Button onClick={createBranch} style={{ backgroundColor: '#41B649' }} className="text-white">
                צור סניף
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Contact Dialog */}
        <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>איש קשר חדש</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>סניף</Label>
                <Select
                  value={contactForm.branch_id}
                  onValueChange={(value) => setContactForm({ ...contactForm, branch_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סניף" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>שם איש הקשר</Label>
                <Input
                  value={contactForm.contact_name}
                  onChange={(e) => setContactForm({ ...contactForm, contact_name: e.target.value })}
                  placeholder="לדוגמה: משה כהן"
                />
              </div>
              <div>
                <Label>מספר טלפון</Label>
                <Input
                  value={contactForm.phone_number}
                  onChange={(e) => setContactForm({ ...contactForm, phone_number: e.target.value })}
                  placeholder="לדוגמה: 050-1234567"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={contactForm.is_active}
                  onCheckedChange={(checked) => setContactForm({ ...contactForm, is_active: checked })}
                />
                <Label>איש קשר פעיל</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowContactDialog(false)}>
                ביטול
              </Button>
              <Button onClick={createContact} style={{ backgroundColor: '#41B649' }} className="text-white">
                צור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* IP Dialog */}
        <Dialog open={showIpDialog} onOpenChange={setShowIpDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>כתובת IP חדשה</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>כתובת IP</Label>
                <Input
                  value={ipForm.ip_address}
                  onChange={(e) => setIpForm({ ...ipForm, ip_address: e.target.value })}
                  placeholder="לדוגמה: 192.168.1.100"
                  dir="ltr"
                />
              </div>
              <div>
                <Label>תיאור (אופציונלי)</Label>
                <Input
                  value={ipForm.description}
                  onChange={(e) => setIpForm({ ...ipForm, description: e.target.value })}
                  placeholder="לדוגמה: משרד ראשי"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={ipForm.is_active}
                  onCheckedChange={(checked) => setIpForm({ ...ipForm, is_active: checked })}
                />
                <Label>כתובת פעילה</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowIpDialog(false)}>
                ביטול
              </Button>
              <Button onClick={createIP} style={{ backgroundColor: '#41B649' }} className="text-white">
                הוסף
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* SMS Test Dialog */}
        <Dialog open={showSmsTestDialog} onOpenChange={setShowSmsTestDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>בדיקת שליחת SMS</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>מספר טלפון לבדיקה</Label>
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  dir="ltr"
                />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">⚠️ הודעת הבדיקה:</p>
                <p className="text-gray-700">בדיקת SMS מ-QFLOW - שוק העיר</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSmsTestDialog(false)}>
                ביטול
              </Button>
              <Button 
                onClick={testSms} 
                disabled={testingSms}
                style={{ backgroundColor: '#E52521' }} 
                className="text-white"
              >
                {testingSms ? "שולח..." : "📱 שלח SMS"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}