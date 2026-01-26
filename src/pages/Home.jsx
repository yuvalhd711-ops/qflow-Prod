import React from 'react';
import { Upload } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-slate-200/60 rounded-2xl flex items-center justify-center">
          <Upload className="w-10 h-10 text-slate-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
            האפליקציה מוכנה
          </h1>
          <p className="text-slate-500 text-sm">
            העלה את קובץ ה-ZIP כדי להמשיך
          </p>
        </div>
      </div>
    </div>
  );
}