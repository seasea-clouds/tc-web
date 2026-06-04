'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'compli-cookie-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const choice = localStorage.getItem(STORAGE_KEY);
    if (!choice) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const choose = (choice: 'accepted' | 'rejected') => {
    localStorage.setItem(STORAGE_KEY, choice);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-[999] p-4">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          🍪 This site uses essential authentication cookies. No tracking or advertising cookies are used.{' '}
          <a href="/en/privacy" className="text-gold hover:underline whitespace-nowrap">
            Privacy Policy
          </a>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => choose('rejected')}
            className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium px-4 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors"
          >
            Reject Non-Essential
          </button>
          <button
            onClick={() => choose('accepted')}
            className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#1B365D] font-semibold px-4 py-1.5 rounded-md text-sm whitespace-nowrap transition-all"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
