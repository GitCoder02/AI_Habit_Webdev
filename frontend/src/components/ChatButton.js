// frontend/src/components/ChatButton.js
import React from 'react';
import { FaComments } from 'react-icons/fa';

export default function ChatButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-16 h-16 text-white rounded-full shadow-lg hover:shadow-2xl transition-all transform hover:scale-110 z-40"
      style={{ background: 'linear-gradient(135deg, #31B7BA 0%, #26949E 100%)' }}
      aria-label="Open AI Chat Coach"
    >
      <FaComments className="text-2xl mx-auto" />
    </button>
  );
}