'use client';

import { useState, useEffect } from 'react';

const COOKIE_CONSENT_KEY = '***';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consented = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consented) {
      // Show after a short delay
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#1B365D] text-white p-4 z-[999] shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <p className="text-sm text-white/80">
          We use essential cookies for authentication. No tracking cookies are used.
        </p>
        <button
          onClick={accept}
          className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#1B365D] font-semibold px-4 py-1.5 rounded-md text-sm whitespace-nowrap transition-all"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
