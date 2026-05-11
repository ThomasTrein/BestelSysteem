'use client';

import { useEffect } from 'react';

export default function AccentColorProvider() {
  useEffect(() => {
    const color = localStorage.getItem('ksa_accent_color') || '#16a34a';
    document.documentElement.style.setProperty('--accent', color);
  }, []);
  return null;
}
