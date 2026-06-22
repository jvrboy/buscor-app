'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Wallet,
  Ticket,
  Package,
  CalendarDays,
  Loader2,
  Check,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
import type { Ticket as TicketType } from '@/lib/types';

interface TicketOption {
  id: string;
  type: 'single' | 'multi_ride' | 'weekly';
  name: string;
  price: number;
  trips: string;
  description: string;
  icon: React.ElementType;
  color: string;
  badge?: string;
}

const ticketOptions: TicketOption[] = [
  {
    id: 'single',
    type: 'single',
    name: 'Single Ride',
    price: 12.0,
    trips: '1 trip',
    description: 'Perfect for occasional riders',
    icon: Ticket,
    color: '#00A651',
  },
  {
    id: 'multi',
    type: 'multi_ride',
    name: 'Multi-Ride Bundle',
    price: 100.0,
    trips: '10 trips',
    description: 'Best value for daily commuters',
    icon: Package,
    color: '#004C97',
    badge: 'Save R20',
  },
  {
    id: 'weekly',
    type: 'weekly',
    name: 'Weekly Pass',
    price: 200.0,
    trips: 'Unlimited',
    description: 'Unlimited rides for 7 days',
    icon: CalendarDays,
    color: '#F9A825',
    badge: 'Popular',
  },
];

function formatCurrency(amount: number) {
  return `R${amount.toFixed(2)}`;
}

export default function BuyTicketsView() {
  const { card, updateCard } = useAuthStore();
  const { goBack } = useAppStore();
  const [activeTickets, setActiveTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [confirmOption, setConfirmOption] = useState<TicketOption | null>(null);

  const balance = card?.balance ?? 0;

  const fetchTickets = async () => {
    if (!card?.id) return;
    try {
      const res = await fetch(`/api/tickets?cardId=${card.id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveTickets(Array.isArray(data) ? data : data.tickets || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [card?.id]);

  const handleBuy = async (option: TicketOption) => {
    if (!confirmOption) return;
    if (!card?.id) {
      toast.error('No card linked');
      return;
    }
    if (balance < option.price) {
      toast.error('Insufficient balance. Please top up first.');
      return;
    }
    setPurchasing(option.id);
    try {
      const res = await fetch('/api/tickets/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, type: option.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Purchase failed');
      toast.success(`${option.name} purchased successfully!`);
      // Refresh card balance from dashboard
      const cardRes = await fetch(`/api/card?cardId=${card.id}`);
      if (cardRes.ok) {
        const cardData = await cardRes.json();
        updateCard(cardData);
      }
      setActiveTickets((prev) => [data, ...prev]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Purchase failed';
      toast.error(message);
    } finally {
      setPurchasing(null);
      setConfirmOption(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-24">
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
        <h1 className="text-lg font-semibold text-[#1A1A1A]">Buy Tickets</h1>
      </motion.div>

      <div className="px-4 pt-4 max-w-md mx-auto">
        {/* Balance */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 mb-5 p-3 bg-white rounded-xl"
        >
          <Wallet className="w-5 h-5 text-[#00A651]" />
          <span className="text-sm text-[#6B7280]">Current Balance:</span>
          <span className="text-sm font-bold text-[#1A1A1A] ml-auto">
            {formatCurrency(balance)}
          </span>
        </motion.div>

        {/* Ticket Options */}
        <div className="space-y-3 mb-8">
          {ticketOptions.map((option, idx) => {
            const Icon = option.icon;
            const isPurchasing = purchasing === option.id;
            const canAfford = balance >= option.price;
            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + idx * 0.08 }}
              >
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: option.color }}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-[#1A1A1A]">
                          {option.name}
                        </h3>
                        {option.badge && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 bg-[#E8F5E9] text-[#00A651] border-0 font-semibold"
                          >
                            <Sparkles className="w-3 h-3 mr-0.5" />
                            {option.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        {option.trips} · {formatCurrency(option.price)}
                      </p>
                      <p className="text-xs text-[#9CA3AF] mt-1">{option.description}</p>
                    </div>
                    <Button
                      size="sm"
                      disabled={!canAfford || isPurchasing}
                      onClick={() => setConfirmOption(option)}
                      className="bg-[#00A651] hover:bg-[#008F45] text-white font-medium rounded-lg h-9 px-4 flex-shrink-0"
                    >
                      {isPurchasing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Buy'
                      )}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Active Tickets */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">Active Tickets</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : activeTickets.filter((t) => t.status === 'active').length > 0 ? (
            <div className="space-y-2">
              {activeTickets
                .filter((t) => t.status === 'active')
                .map((ticket) => (
                  <Card key={ticket.id} className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#E8F5E9] flex items-center justify-center">
                      <Check className="w-5 h-5 text-[#00A651]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] capitalize">
                        {ticket.type === 'multi_ride'
                          ? 'Multi-Ride Bundle'
                          : ticket.type === 'single'
                            ? 'Single Ride'
                            : 'Weekly Pass'}
                      </p>
                      <p className="text-xs text-[#6B7280]">
                        {ticket.type === 'weekly'
                          ? 'Unlimited'
                          : `${ticket.tripsRemaining} trips remaining`}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-[#E8F5E9] text-[#00A651] text-xs border-0"
                    >
                      Active
                    </Badge>
                  </Card>
                ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <Ticket className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
              <p className="text-sm text-[#6B7280]">No active tickets</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Purchase a ticket above to get started</p>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmOption && (
          <AlertDialog open onOpenChange={(open) => !open && setConfirmOption(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to purchase{' '}
                  <span className="font-semibold text-[#1A1A1A]">
                    {confirmOption.name}
                  </span>{' '}
                  for{' '}
                  <span className="font-semibold text-[#1A1A1A]">
                    {formatCurrency(confirmOption.price)}
                  </span>
                  . This will be deducted from your card balance.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleBuy(confirmOption)}
                  className="bg-[#00A651] hover:bg-[#008F45] text-white"
                >
                  Confirm Purchase
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </AnimatePresence>
    </div>
  );
}