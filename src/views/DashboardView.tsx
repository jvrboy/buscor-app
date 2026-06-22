'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Ticket,
  QrCode,
  CreditCard,
  History,
  Plus,
  MapPin,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuthStore, useAppStore } from '@/lib/store';
import type { DashboardData, Trip } from '@/lib/types';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getFirstName(name: string) {
  return name.split(' ')[0] || 'User';
}

function formatCardNumber(num: string) {
  const last4 = num.slice(-4);
  return `**** **** **** ${last4}`;
}

function formatCurrency(amount: number) {
  return `R${amount.toFixed(2)}`;
}

function QuickAction({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white shadow-sm border border-[#F3F4F6] hover:shadow-md transition-shadow"
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: color }}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-xs font-medium text-[#1A1A1A] text-center leading-tight">
        {label}
      </span>
    </motion.button>
  );
}

function TripRow({ trip }: { trip: Trip }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1A1A1A] truncate">
          {trip.route || 'Unknown Route'}
        </p>
        <p className="text-xs text-[#6B7280] mt-0.5">
          {trip.fromStop} <ArrowRight className="w-3 h-3 inline mx-1" /> {trip.toStop}
        </p>
      </div>
      <div className="text-right flex-shrink-0 ml-3">
        <p className="text-sm font-semibold text-[#1A1A1A]">{formatCurrency(trip.fare)}</p>
        <p className="text-xs text-[#6B7280]">
          {formatDistanceToNow(new Date(trip.timestamp), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export default function DashboardView() {
  const { user, card, updateCard } = useAuthStore();
  const { navigate } = useAppStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!card?.id) return;
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`/api/dashboard?cardId=${card.id}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
          if (json.card) updateCard(json.card);
        }
      } catch {
        // Silently fail - use store data
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [card?.id, updateCard]);

  const recentTrips = data?.recentTrips || [];
  const displayName = user?.fullName ? getFirstName(user.fullName) : 'User';
  const balance = data?.card?.balance ?? card?.balance ?? 0;
  const cardNum = data?.card?.cardNumber ?? card?.cardNumber ?? '0000000000000000';
  const cardType = data?.card?.type ?? card?.type ?? 'standard';

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-24">
      <div className="px-4 pt-6 max-w-md mx-auto">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between mb-5"
        >
          <div>
            <p className="text-sm text-[#6B7280]">{getGreeting()},</p>
            <h1 className="text-xl font-bold text-[#1A1A1A]">{displayName}</h1>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#004C97] flex items-center justify-center text-white font-semibold text-base">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </motion.div>

        {/* Card Balance Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl p-5 mb-6"
          style={{
            background: 'linear-gradient(135deg, #00A651 0%, #007A3D 100%)',
          }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/80 text-xs font-medium tracking-wide uppercase">
                Card Balance
              </span>
              <Badge
                variant="secondary"
                className="bg-white/20 text-white text-xs border-0 capitalize"
              >
                {cardType}
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {loading ? (
                <Skeleton className="h-10 w-36 bg-white/20" />
              ) : (
                formatCurrency(balance)
              )}
            </p>
            <p className="text-white/70 text-sm font-mono tracking-wider">
              {loading ? (
                <Skeleton className="h-4 w-48 bg-white/20 mt-1" />
              ) : (
                formatCardNumber(cardNum)
              )}
            </p>
          </div>
        </motion.div>

        {/* Top Up Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-6"
        >
          <Button
            onClick={() => navigate('profile')}
            className="w-full h-12 bg-[#004C97] hover:bg-[#003D7A] text-white font-semibold rounded-xl flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Top Up
          </Button>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="grid grid-cols-2 gap-3 mb-6"
        >
          <QuickAction
            icon={Ticket}
            label="Buy Tickets"
            color="#00A651"
            onClick={() => navigate('buy-tickets')}
          />
          <QuickAction
            icon={QrCode}
            label="Tap to Ride"
            color="#004C97"
            onClick={() => navigate('tap-in')}
          />
          <QuickAction
            icon={CreditCard}
            label="Card Management"
            color="#F9A825"
            onClick={() => navigate('card-management')}
          />
          <QuickAction
            icon={History}
            label="Trip History"
            color="#6B7280"
            onClick={() => navigate('trip-history')}
          />
        </motion.div>

        {/* Recent Trips */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#1A1A1A]">Recent Trips</h2>
            <button
              onClick={() => navigate('trip-history')}
              className="text-xs text-[#004C97] font-medium hover:underline"
            >
              View All
            </button>
          </div>
          <Card className="p-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : recentTrips.length > 0 ? (
              <>
                {recentTrips.slice(0, 3).map((trip, idx) => (
                  <div key={trip.id}>
                    <TripRow trip={trip} />
                    {idx < recentTrips.length - 1 && idx < 2 && (
                      <Separator className="bg-[#F3F4F6]" />
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <MapPin className="w-8 h-8 text-[#D1D5DB] mb-2" />
                <p className="text-sm text-[#6B7280]">No trips yet</p>
                <p className="text-xs text-[#9CA3AF] mt-1">Your recent trips will appear here</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}