'use client';

import { motion } from 'framer-motion';
import { LogIn, X, Eye } from 'lucide-react';
import { useAuthStore, useAppStore } from '@/lib/store';

export default function GuestBanner() {
  const isGuest = useAuthStore((s) => s.isGuest);
  const navigate = useAppStore((s) => s.navigate);
  const logout = useAuthStore((s) => s.logout);

  if (!isGuest) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#F9A825] px-4 py-2.5 flex items-center gap-3 sticky top-0 z-50"
    >
      <Eye className="w-4 h-4 text-white flex-shrink-0" />
      <p className="text-xs text-white font-medium flex-1">
        Browsing as guest — <span className="underline underline-offset-2">some features are limited</span>
      </p>
      <button
        onClick={() => { logout(); navigate('login'); }}
        className="text-xs bg-white text-[#F9A825] font-semibold px-3 py-1 rounded-full hover:bg-white/90 transition-colors flex items-center gap-1"
      >
        <LogIn className="w-3 h-3" />
        Sign In
      </button>
      <button
        onClick={() => { logout(); navigate('login'); }}
        className="text-white/70 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}