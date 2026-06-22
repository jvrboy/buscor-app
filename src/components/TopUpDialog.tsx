'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Wallet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/store';
import { apiFetch } from '@/lib/utils';
import { toast } from 'sonner';
import type { Card } from '@/lib/types';

interface TopUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (amount: number) => void;
}

const presetAmounts = [50, 100, 200, 500];

function formatCurrency(amount: number) {
  return `R${amount.toFixed(2)}`;
}

export default function TopUpDialog({ open, onOpenChange, onSuccess }: TopUpDialogProps) {
  const { user, card, updateCard } = useAuthStore();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(100);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const finalAmount = customAmount ? parseFloat(customAmount) || 0 : selectedAmount || 0;

  const handleTopUp = async () => {
    if (finalAmount <= 0) {
      toast.error('Please select or enter an amount');
      return;
    }
    if (!user?.id || !card?.id) {
      toast.error('No card linked');
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<Card>('/api/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, cardId: card.id, amount: finalAmount }),
      });
      updateCard(data);
      toast.success(`R${finalAmount.toFixed(2)} added to your card!`);
      onSuccess(finalAmount);
      // Reset
      setSelectedAmount(100);
      setCustomAmount('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Top up failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setSelectedAmount(100);
      setCustomAmount('');
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#00A651]" />
            Top Up Wallet
          </DialogTitle>
          <DialogDescription>
            Choose a preset amount or enter a custom amount to add to your Buscor card.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Preset Amounts */}
          <div>
            <Label className="text-sm font-medium text-[#1A1A1A] mb-2 block">
              Quick Top Up
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {presetAmounts.map((amount) => {
                const isSelected = selectedAmount === amount && !customAmount;
                return (
                  <motion.button
                    key={amount}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setSelectedAmount(amount);
                      setCustomAmount('');
                    }}
                    className={`h-12 rounded-xl text-base font-semibold transition-all duration-200 border-2 ${
                      isSelected
                        ? 'border-[#00A651] bg-[#E8F5E9] text-[#00A651]'
                        : 'border-[#E5E7EB] bg-white text-[#1A1A1A] hover:border-[#D1D5DB]'
                    }`}
                  >
                    {formatCurrency(amount)}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <Label htmlFor="customAmount" className="text-sm font-medium text-[#1A1A1A] mb-1.5 block">
              Custom Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[#6B7280]">
                R
              </span>
              <Input
                id="customAmount"
                type="number"
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  if (e.target.value) setSelectedAmount(null);
                }}
                className="h-12 pl-8 text-base font-medium"
                min={0}
                step={0.01}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-[#F9FAFB] rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm text-[#6B7280]">Amount to add</span>
            <span className="text-lg font-bold text-[#00A651]">
              {formatCurrency(finalAmount)}
            </span>
          </div>

          {/* Button */}
          <Button
            onClick={handleTopUp}
            disabled={loading || finalAmount <= 0}
            className="w-full h-12 bg-[#00A651] hover:bg-[#008F45] text-white font-semibold text-base rounded-xl"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : null}
            Top Up {formatCurrency(finalAmount)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}