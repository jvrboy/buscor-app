'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Eye, EyeOff, Bus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore, useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface FormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  pin?: string;
  confirmPin?: string;
}

export default function RegisterView() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    pin: '',
    confirmPin: '',
  });
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const { setAuth } = useAuthStore();
  const { goBack } = useAppStore();

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = () => {
    const newErrors: FormErrors = {};
    if (!form.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!form.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s+\-()]{8,15}$/.test(form.phone)) {
      newErrors.phone = 'Invalid phone number';
    }
    if (!/^\d{4}$/.test(form.pin)) {
      newErrors.pin = 'PIN must be exactly 4 digits';
    }
    if (form.pin !== form.confirmPin) {
      newErrors.confirmPin = 'PINs do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setAuth(data.user, data.card);
      toast.success('Registration successful!');
      useAppStore.getState().navigate('dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) handleRegister();
  };

  const inputClass = 'h-12 text-base';

  return (
    <div className="min-h-screen bg-[#004C97] flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="p-4 flex items-center gap-3"
      >
        <button
          onClick={goBack}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-white">Register</h1>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex-1 flex flex-col items-center px-6 pb-8"
      >
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-3 shadow-lg">
          <Bus className="w-8 h-8 text-[#004C97]" />
        </div>
        <p className="text-[#B0C4DE] text-sm mb-6">Create your Buscor account</p>

        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-sm font-medium text-[#1A1A1A]">
              Full Name
            </Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={form.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              onKeyDown={handleKeyDown}
              className={inputClass}
            />
            {errors.fullName && <p className="text-xs text-[#D32F2F]">{errors.fullName}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-[#1A1A1A]">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              onKeyDown={handleKeyDown}
              className={inputClass}
            />
            {errors.email && <p className="text-xs text-[#D32F2F]">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-sm font-medium text-[#1A1A1A]">
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+27 82 123 4567"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              onKeyDown={handleKeyDown}
              className={inputClass}
            />
            {errors.phone && <p className="text-xs text-[#D32F2F]">{errors.phone}</p>}
          </div>

          {/* PIN */}
          <div className="space-y-1.5">
            <Label htmlFor="pin" className="text-sm font-medium text-[#1A1A1A]">
              Card PIN
            </Label>
            <div className="relative">
              <Input
                id="pin"
                type={showPin ? 'text' : 'password'}
                placeholder="••••"
                value={form.pin}
                onChange={(e) =>
                  updateField('pin', e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                onKeyDown={handleKeyDown}
                className={`${inputClass} tracking-[0.5em] text-center font-mono pr-12`}
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
            {errors.pin && <p className="text-xs text-[#D32F2F]">{errors.pin}</p>}
          </div>

          {/* Confirm PIN */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPin" className="text-sm font-medium text-[#1A1A1A]">
              Confirm PIN
            </Label>
            <div className="relative">
              <Input
                id="confirmPin"
                type={showConfirmPin ? 'text' : 'password'}
                placeholder="••••"
                value={form.confirmPin}
                onChange={(e) =>
                  updateField('confirmPin', e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                onKeyDown={handleKeyDown}
                className={`${inputClass} tracking-[0.5em] text-center font-mono pr-12`}
                maxLength={4}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
                tabIndex={-1}
              >
                {showConfirmPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPin && <p className="text-xs text-[#D32F2F]">{errors.confirmPin}</p>}
          </div>

          <Button
            onClick={handleRegister}
            disabled={loading}
            className="w-full h-12 bg-[#00A651] hover:bg-[#008F45] text-white font-semibold text-base rounded-xl transition-all duration-200 mt-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : null}
            REGISTER
          </Button>
        </div>
      </motion.div>
    </div>
  );
}