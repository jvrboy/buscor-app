'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bus, Eye, EyeOff, Loader2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore, useAppStore } from '@/lib/store';
import { toast } from 'sonner';

export default function LoginView() {
  const [cardNumber, setCardNumber] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ cardNumber?: string; pin?: string }>({});
  const { setAuth, setGuest } = useAuthStore();
  const { navigate } = useAppStore();

  const validate = () => {
    const newErrors: { cardNumber?: string; pin?: string } = {};
    if (!/^\d{16}$/.test(cardNumber)) {
      newErrors.cardNumber = 'Card number must be exactly 16 digits';
    }
    if (!/^\d{4}$/.test(pin)) {
      newErrors.pin = 'PIN must be exactly 4 digits';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardNumber, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setAuth(data.user, data.card);
      toast.success('Welcome back!');
      navigate('dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    setCardNumber(val);
    if (errors.cardNumber) setErrors((prev) => ({ ...prev, cardNumber: undefined }));
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(val);
    if (errors.pin) setErrors((prev) => ({ ...prev, pin: undefined }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) handleLogin();
  };

  return (
    <div className="min-h-screen bg-[#004C97] flex flex-col items-center justify-center px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-sm flex flex-col items-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg"
        >
          <Bus className="w-10 h-10 text-[#004C97]" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-3xl font-bold text-white tracking-tight"
        >
          Buscor
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-[#B0C4DE] text-sm mt-1 mb-8"
        >
          Your Smart Bus Card
        </motion.p>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="w-full bg-white rounded-2xl p-6 shadow-xl space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="cardNumber" className="text-sm font-medium text-[#1A1A1A]">
              Card Number
            </Label>
            <Input
              id="cardNumber"
              placeholder="0000 0000 0000 0000"
              value={cardNumber.replace(/(.{4})/g, '$1 ').trim()}
              onChange={handleCardNumberChange}
              onKeyDown={handleKeyDown}
              className="h-12 text-base tracking-wider font-mono"
              maxLength={19}
            />
            {errors.cardNumber && (
              <p className="text-xs text-[#D32F2F]">{errors.cardNumber}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pin" className="text-sm font-medium text-[#1A1A1A]">
              PIN
            </Label>
            <div className="relative">
              <Input
                id="pin"
                type={showPin ? 'text' : 'password'}
                placeholder="••••"
                value={pin}
                onChange={handlePinChange}
                onKeyDown={handleKeyDown}
                className="h-12 text-base tracking-[0.5em] text-center font-mono pr-12"
                maxLength={4}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
                tabIndex={-1}
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.pin && (
              <p className="text-xs text-[#D32F2F]">{errors.pin}</p>
            )}
          </div>

          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-12 bg-[#00A651] hover:bg-[#008F45] text-white font-semibold text-base rounded-xl transition-all duration-200"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : null}
            LOGIN
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-6 flex flex-col items-center gap-4 w-full"
        >
          <button
            onClick={() => navigate('register')}
            className="text-[#B0C4DE] hover:text-white text-sm transition-colors underline underline-offset-4"
          >
            Register Your Card
          </button>

          <div className="w-full h-px bg-white/20" />

          <Button
            onClick={() => { setGuest(); toast.success('Welcome, Guest! Explore the app freely.'); navigate('dashboard'); }}
            variant="outline"
            className="w-full h-12 border-white/30 text-white hover:bg-white/10 font-medium text-sm rounded-xl gap-2"
          >
            <UserCheck className="w-4 h-4" />
            Continue as Guest
          </Button>
          <p className="text-[#8BA8C7] text-xs text-center -mt-2">
            Try the app before signing in. Sign in anytime to save your data.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}