import React from 'react';

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
      <div className="space-y-4 text-center">
        <div className="inline-flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-whatsapp-green border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="text-gray-600 text-lg font-medium">Chargement...</div>
      </div>
    </div>
  );
}