import { useState } from "react";

export default function Display() {
  return (
    <div className="min-h-screen p-8" dir="rtl" style={{ backgroundColor: '#1F5F25' }}>
      <div className="max-w-7xl mx-auto text-white">
        <h1 className="text-4xl font-bold mb-8">מסך תצוגה</h1>
        <div className="bg-white rounded-xl shadow-lg p-8" style={{ borderColor: '#41B649', borderWidth: '2px', borderStyle: 'solid' }}>
          <p className="text-gray-600">מסך תצוגה - בפיתוח</p>
        </div>
      </div>
    </div>
  );
}