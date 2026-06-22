'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  RefreshCw,
  Nfc,
  CreditCard,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore, useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import GuestBanner from '@/components/GuestBanner';
import type { TapToken, Ticket } from '@/lib/types';

const COUNTDOWN_SECONDS = 90;

export default function TapInView() {
  const { card, isGuest, logout } = useAuthStore();
  const { goBack, navigate } = useAppStore();
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [activeTicketCount, setActiveTicketCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generateCode = useCallback(async () => {
    if (!card?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tap-in/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id }),
      });
      const data: TapToken = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate code');
      setToken(data.token);
      setCountdown(COUNTDOWN_SECONDS);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate code';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [card?.id]);

  const fetchTicketCount = useCallback(async () => {
    if (!card?.id) return;
    try {
      const res = await fetch(`/api/tickets?cardId=${card.id}`);
      if (res.ok) {
        const data = await res.json();
        const tickets: Ticket[] = Array.isArray(data) ? data : data.tickets || [];
        setActiveTicketCount(
          tickets.filter((t) => t.status === 'active').length
        );
      }
    } catch {
      // silent
    }
  }, [card?.id]);

  useEffect(() => {
    if (isGuest) {
      setToken('BUSCOR-GUEST-DEMO-' + Date.now());
      setLoading(false);
      setActiveTicketCount(2);
      return;
    }
    generateCode();
    fetchTicketCount();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (loading || !token) return;

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Auto-refresh when timer hits 0
          if (intervalRef.current) clearInterval(intervalRef.current);
          generateCode();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [token, loading, generateCode]);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const isLow = countdown < 20 && countdown > 0;

  return (
    <div className="min-h-screen bg-[#004C97] flex flex-col pb-24">
      <GuestBanner />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-3 flex items-center gap-3"
      >
        <button
          onClick={goBack}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white">Virtual Tap-In</h1>
          <p className="text-xs text-[#B0C4DE]">Tap to Ride</p>
        </div>
        {activeTicketCount > 0 && (
          <Badge className="ml-auto bg-[#00A651] text-white border-0 text-xs">
            {activeTicketCount} ticket{activeTicketCount > 1 ? 's' : ''} active
          </Badge>
        )}
      </motion.div>

      {/* QR Code Area */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="flex-1 flex flex-col items-center justify-center px-8"
      >
        <div className="relative">
          {/* Pulse rings */}
          {!loading && token && (
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-3xl border-2 border-white/30"
            />
          )}
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0, 0.2] }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.8,
            }}
            className="absolute inset-0 rounded-3xl border-2 border-white/20"
          />

          {/* QR Container */}
          <div className="relative bg-white rounded-3xl p-6 shadow-2xl">
            {loading ? (
              <div className="w-56 h-56 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-[#004C97] animate-spin" />
              </div>
            ) : error ? (
              <div className="w-56 h-56 flex flex-col items-center justify-center text-center">
                <WifiOff className="w-10 h-10 text-[#D32F2F] mb-3" />
                <p className="text-sm text-[#6B7280]">Failed to generate code</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={token}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <QRCodeSVG
                    value={token}
                    size={224}
                    bgColor="#FFFFFF"
                    fgColor="#1A1A1A"
                    level="M"
                    includeMargin={false}
                  />
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Status & Timer */}
        <div className="mt-6 text-center">
          {loading ? (
            <p className="text-[#B0C4DE] text-sm">Generating code...</p>
          ) : error ? null : (
            <>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Wifi className="w-4 h-4 text-[#00A651]" />
                <p className="text-white text-sm font-medium">Code Active</p>
              </div>
              <p
                className={`text-2xl font-bold tabular-nums ${
                  isLow ? 'text-[#FF5252]' : 'text-white'
                }`}
              >
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </p>
              <p className="text-[#B0C4DE] text-xs mt-1">
                Show this code to the bus scanner
              </p>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 w-full max-w-xs space-y-3">
          <Button
            onClick={generateCode}
            disabled={loading}
            variant="outline"
            className="w-full h-11 border-white/30 text-white hover:bg-white/10 rounded-xl"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Generate New Code
          </Button>

          <Button
            onClick={() => { if (isGuest) { logout(); navigate('login'); toast.info('Sign in to use NFC tap'); } else { toast.info('Hold your phone near the reader to tap in'); } }}
            className={`w-full h-12 font-semibold rounded-xl ${isGuest ? 'bg-[#F9A825] hover:bg-[#E68A00]' : 'bg-[#00A651] hover:bg-[#008F45]'} text-white`}
          >
            <Nfc className="w-5 h-5 mr-2" />
            {isGuest ? 'Sign In to Tap' : 'NFC Tap'}
          </Button>

          <button
            onClick={() => navigate('card-management')}
            className="w-full text-center text-[#B0C4DE] hover:text-white text-sm transition-colors py-2"
          >
            <CreditCard className="w-4 h-4 inline mr-1.5" />
            Manage Card
          </button>
        </div>
      </motion.div>
    </div>
  );
}