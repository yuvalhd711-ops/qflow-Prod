import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const list = await base44.entities.Branch.list();
      setBranches(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
        <h1 className="text-4xl font-bold mb-8" style={{ color: '#111111' }}>ניהול סניפים</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch, index) => (
            <motion.div key={branch.id} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 * index }}>
              <Card className="bg-white hover:shadow-2xl transition-all duration-300 h-full" style={{ borderColor: '#41B649', borderWidth: '2px' }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-xl shadow-md" style={{ backgroundColor: '#41B649' }}>
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold" style={{ color: '#111111' }}>{branch.name}</h2>
                  </div>
                  <p className="text-gray-600">{branch.address}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}