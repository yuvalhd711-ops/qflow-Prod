import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Shield } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function Admin() {
  const [loading, setLoading] = useState(true);
  const [allowedIPs, setAllowedIPs] = useState([]);
  const [showIpDialog, setShowIpDialog] = useState(false);
  const [ipForm, setIpForm] = useState({
    ip_address: "",
    description: "",
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const ipsData = await base44.entities.AllowedIP.list();
      setAllowedIPs(ipsData);
    } catch (error) {
      console.error("Error loading IPs:", error);
    } finally {
      setLoading(false);
    }
  };

  const createIP = async () => {
    if (!ipForm.ip_address.trim()) {
      alert("יש להזין כתובת IP");
      return;
    }

    try {
      await base44.entities.AllowedIP.create(ipForm);
      setShowIpDialog(false);
      setIpForm({ ip_address: "", description: "", is_active: true });
      await loadData();
      alert("כתובת IP נוספה בהצלחה");
    } catch (error) {
      console.error("Error creating IP:", error);
      alert("שגיאה בהוספת כתובת IP");
    }
  };

  const toggleIPStatus = async (ip) => {
    try {
      await base44.entities.AllowedIP.update(ip.id, {
        is_active: !ip.is_active
      });
      await loadData();
    } catch (error) {
      console.error("Error updating IP:", error);
      alert("שגיאה בעדכון הסטטוס");
    }
  };

  const deleteIP = async (ip) => {
    if (!confirm(`האם למחוק את כתובת ה-IP ${ip.ip_address}?`)) {
      return;
    }

    try {
      await base44.entities.AllowedIP.delete(ip.id);
      await loadData();
      alert("כתובת IP נמחקה בהצלחה");
    } catch (error) {
      console.error("Error deleting IP:", error);
      alert("שגיאה במחיקת כתובת IP");
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
        <h1 className="text-4xl font-bold mb-8" style={{ color: '#111111' }}>ניהול מערכת</h1>

        <Card className="bg-white shadow-lg mb-6" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: '#41B649' }} />
              <span>ניהול IP מורשים</span>
            </CardTitle>
            <Button
              onClick={() => setShowIpDialog(true)}
              className="text-white"
              style={{ backgroundColor: '#41B649' }}
            >
              <Plus className="w-4 h-4 ml-2" />
              הוסף IP חדש
            </Button>
          </CardHeader>
          <CardContent>
            {allowedIPs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>אין כתובות IP מורשות במערכת</p>
                <p className="text-sm mt-2">הוסף כתובת IP כדי לאפשר גישה למערכת</p>
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

        <Dialog open={showIpDialog} onOpenChange={setShowIpDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>הוסף כתובת IP מורשית</DialogTitle>
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
      </div>
    </div>
  );
}