import { useState } from "react";

export default function Console() {
  return (
    <div className="min-h-screen p-8" dir="rtl" style={{ backgroundColor: '#E6F9EA' }}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8" style={{ color: '#111111' }}>קונסולת עובד</h1>
        <div className="bg-white rounded-xl shadow-lg p-8" style={{ borderColor: '#41B649', borderWidth: '2px', borderStyle: 'solid' }}>
          <p className="text-gray-600">קונסולת עובד - בפיתוח</p>
        </div>
      </div>
    </div>
  );
}