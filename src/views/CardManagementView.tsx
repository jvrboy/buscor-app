'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CreditCard,
  Loader2,
  Lock,
  Unlock,
  MapPin,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuthStore, useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import GuestBanner from '@/components/GuestBanner';

function formatCurrency(amount: number) {
  return `R${amount.toFixed(2)}`;
}

function formatCardNumber(num: string) {
  if (!num || num.length < 4) return num;
  const groups = [];
  for (let i = 0; i < num.length; i += 4) {
    groups.push(num.slice(i, i + 4));
  }
  return groups.join(' ');
}

const statusColor: Record<string, string> = {
  active: 'bg-[#E8F5E9] text-[#00A651]',
  blocked: 'bg-[#FFEBEE] text-[#D32F2F]',
  expired: 'bg-[#FFF8E1] text-[#F9A825]',
};

export default function CardManagementView() {
  const { card, updateCard, isGuest, logout } = useAuthStore();
  const { goBack, navigate } = useAppStore();
  const [blocking, setBlocking] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const isActive = card?.status === 'active';
  const isBlocked = card?.status === 'blocked';

  const handleToggleBlock = async () => {
    if (!card?.id) return;
    setBlocking(true);
    try {
      const newStatus = isActive ? 'blocked' : 'active';
      const res = await fetch('/api/card/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update card status');
      updateCard({ status: newStatus });
      toast.success(
        newStatus === 'blocked'
          ? 'Card blocked successfully'
          : 'Card unblocked successfully'
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update card';
      toast.error(message);
    } finally {
      setBlocking(false);
      setConfirmBlock(false);
    }
  };

  const handleReplace = async () => {
    if (!card?.id) return;
    setReplacing(true);
    try {
      const res = await fetch('/api/card/replace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to replace card');
      if (data.id) updateCard(data);
      toast.success('Card replacement initiated. Your new card will be ready soon.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to replace card';
      toast.error(message);
    } finally {
      setReplacing(false);
      setConfirmReplace(false);
    }
  };

  const handleReportLost = () => {
    if (!card?.id) return;
    toast.info('Please call our helpline at 0800 BUSCOR to report your card lost or stolen.');
  };

  const options = [
    {
      icon: isBlocked ? ShieldCheck : ShieldCheck,
      label: isBlocked ? 'Unblock Card' : 'Block Card',
      description: isBlocked
        ? 'Re-enable your card for use'
        : 'Temporarily disable your card',
      color: isBlocked ? '#00A651' : '#D32F2F',
      action: () => setConfirmBlock(true),
      disabled: card?.status === 'expired',
    },
    {
      icon: RefreshCw,
      label: 'Replace Card',
      description: 'Get a new card with same balance',
      color: '#004C97',
      action: () => setConfirmReplace(true),
    },
    {
      icon: AlertTriangle,
      label: 'Report Lost/Stolen',
      description: 'Immediately block and report your card',
      color: '#F9A825',
      action: handleReportLost,
    },
    {
      icon: CreditCard,
      label: 'View Card Details',
      description: 'Full card information',
      color: '#6B7280',
      action: () => toast.info('Card details shown above'),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-24">
      <GuestBanner />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-10"
      >
        <button
          onClick={goBack}
          className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#1A1A1A] hover:bg-[#E5E7EB] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-[#1A1A1A]">Card Management</h1>
      </motion.div>

      <div className="px-4 pt-4 max-w-md mx-auto">
        {/* Card Details */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="p-5 overflow-hidden relative">
            <div
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{
                background: isActive
                  ? 'linear-gradient(90deg, #00A651, #00C864)'
                  : 'linear-gradient(90deg, #D32F2F, #FF5252)',
              }}
            />
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">
                  Card Number
                </p>
                <p className="text-base font-mono font-semibold text-[#1A1A1A] mt-0.5">
                  {card?.cardNumber ? formatCardNumber(card.cardNumber) : '---- ---- ---- ----'}
                </p>
              </div>
              <Badge
                variant="secondary"
                className={`text-xs border-0 capitalize ${
                  statusColor[card?.status ?? 'active']
                }`}
              >
                {card?.status ?? 'active'}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-[#6B7280]">Type</p>
                <p className="text-sm font-medium text-[#1A1A1A] capitalize mt-0.5">
                  {card?.type ?? 'Standard'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280]">Balance</p>
                <p className="text-sm font-bold text-[#1A1A1A] mt-0.5">
                  {formatCurrency(card?.balance ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280]">Status</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {isActive ? (
                    <Unlock className="w-3.5 h-3.5 text-[#00A651]" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-[#D32F2F]" />
                  )}
                  <span className="text-sm font-medium text-[#1A1A1A] capitalize">
                    {card?.status ?? 'Active'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Block/Unblock Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <Button
            onClick={() => isGuest ? (logout(), navigate('login'), toast.info('Sign in to manage your card')) : setConfirmBlock(true)}
            disabled={blocking || card?.status === 'expired'}
            className={`w-full h-12 font-semibold rounded-xl transition-all duration-200 ${
              isBlocked
                ? 'bg-[#00A651] hover:bg-[#008F45] text-white'
                : isGuest
                  ? 'bg-[#F9A825] hover:bg-[#E68A00] text-white'
                  : 'bg-[#D32F2F] hover:bg-[#B71C1C] text-white'
            }`}
          >
            {blocking ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : isBlocked ? (
              <ShieldCheck className="w-5 h-5 mr-2" />
            ) : (
              <Lock className="w-5 h-5 mr-2" />
            )}
            {isGuest ? 'SIGN IN TO MANAGE CARD' : isBlocked ? 'UNBLOCK CARD' : 'BLOCK CARD'}
          </Button>
        </motion.div>

        {/* Options List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">Card Options</h2>
          <Card className="divide-y divide-[#F3F4F6]">
            {options.map((opt, idx) => {
              const Icon = opt.icon;
              return (
                <button
                  key={idx}
                  onClick={() => isGuest ? (logout(), navigate('login'), toast.info('Sign in to access card options')) : opt.action()}
                  disabled={opt.disabled}
                  className="w-full flex items-center gap-3 p-4 hover:bg-[#F9FAFB] transition-colors text-left disabled:opacity-50"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${opt.color}15` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: opt.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A]">{opt.label}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">{opt.description}</p>
                  </div>
                </button>
              );
            })}
          </Card>
        </motion.div>

        {/* Activity Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">This Month</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 text-center">
              <MapPin className="w-5 h-5 text-[#004C97] mx-auto mb-2" />
              <p className="text-xl font-bold text-[#1A1A1A]">{isGuest ? '12' : '--'}</p>
              <p className="text-xs text-[#6B7280] mt-0.5">Total Trips</p>
            </Card>
            <Card className="p-4 text-center">
              <Wallet className="w-5 h-5 text-[#00A651] mx-auto mb-2" />
              <p className="text-xl font-bold text-[#1A1A1A]">{isGuest ? 'R49.00' : 'R0.00'}</p>
              <p className="text-xs text-[#6B7280] mt-0.5">Total Spent</p>
            </Card>
          </div>
        </motion.div>
      </div>

      {/* Block Confirmation */}
      <AlertDialog open={confirmBlock} onOpenChange={setConfirmBlock}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isActive ? 'Block Card' : 'Unblock Card'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isActive
                ? 'Are you sure you want to block your card? It will be temporarily disabled and cannot be used for tap-in or purchases.'
                : 'Are you sure you want to unblock your card? It will be re-enabled for use immediately.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleBlock}
              className={isActive ? 'bg-[#D32F2F] hover:bg-[#B71C1C] text-white' : 'bg-[#00A651] hover:bg-[#008F45] text-white'}
            >
              {blocking ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {isActive ? 'Block Card' : 'Unblock Card'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Replace Confirmation */}
      <AlertDialog open={confirmReplace} onOpenChange={setConfirmReplace}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Card</AlertDialogTitle>
            <AlertDialogDescription>
              This will initiate a card replacement. Your current balance will be transferred to
              the new card. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReplace}
              className="bg-[#004C97] hover:bg-[#003D7A] text-white"
            >
              {replacing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Replace Card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}