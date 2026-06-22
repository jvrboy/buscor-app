'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow, startOfMonth, startOfWeek, subWeeks, isAfter } from 'date-fns';
import {
  ArrowLeft,
  MapPin,
  Wallet,
  Route,
  ArrowRight,
  Loader2,
  Calendar,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuthStore, useAppStore } from '@/lib/store';
import { apiFetchPaginated } from '@/lib/utils';
import GuestBanner from '@/components/GuestBanner';
import type { Trip } from '@/lib/types';

function formatCurrency(amount: number) {
  return `R${amount.toFixed(2)}`;
}

function formatTripDate(timestamp: string) {
  const d = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return formatDistanceToNow(d, { addSuffix: true });
  return format(d, 'dd MMM yyyy');
}

type DateFilter = 'week' | 'month' | 'all';

function filterTrips(trips: Trip[], filter: DateFilter): Trip[] {
  if (filter === 'all') return trips;
  const now = new Date();
  const cutoff =
    filter === 'week'
      ? subWeeks(now, 1)
      : startOfMonth(now);
  return trips.filter((t) => isAfter(new Date(t.timestamp), cutoff));
}

export default function TripHistoryView() {
  const { card, isGuest } = useAuthStore();
  const { goBack } = useAppStore();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');

  useEffect(() => {
    if (isGuest) {
      setTrips([
        { id: 'g1', cardId: 'guest', route: 'Route 101 - Sandton to CBD', fromStop: 'Sandton City', toStop: 'Park Station', fare: 12.0, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
        { id: 'g2', cardId: 'guest', route: 'Route 202 - Midrand Express', fromStop: 'Midrand', toStop: 'Marlboro', fare: 15.0, timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'g3', cardId: 'guest', route: 'Route 101 - Sandton to CBD', fromStop: 'Park Station', toStop: 'Sandton City', fare: 12.0, timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'g4', cardId: 'guest', route: 'Route 303 - Soweto Link', fromStop: 'Bara', toStop: 'Vilakazi', fare: 10.0, timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
      ]);
      setLoading(false);
      return;
    }
    if (!card?.id) return;
    const fetchTrips = async () => {
      try {
        const { items } = await apiFetchPaginated<Trip>(`/api/trips?cardId=${card.id}`);
        setTrips(items);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, [card?.id]);

  const filteredTrips = filterTrips(trips, dateFilter);

  // Summary calculations
  const totalTrips = filteredTrips.length;
  const totalSpent = filteredTrips.reduce((sum, t) => sum + t.fare, 0);

  // Most used route
  const routeCounts: Record<string, number> = {};
  filteredTrips.forEach((t) => {
    const route = t.route || 'Unknown';
    routeCounts[route] = (routeCounts[route] || 0) + 1;
  });
  const mostUsedRoute =
    Object.entries(routeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '--';

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
        <h1 className="text-lg font-semibold text-[#1A1A1A]">Trip History</h1>
      </motion.div>

      <div className="px-4 pt-4 max-w-md mx-auto">
        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-5"
        >
          <Card className="p-3 text-center">
            <MapPin className="w-4 h-4 text-[#004C97] mx-auto mb-1.5" />
            <p className="text-lg font-bold text-[#1A1A1A]">
              {loading ? <Skeleton className="h-6 w-8 mx-auto" /> : totalTrips}
            </p>
            <p className="text-[10px] text-[#6B7280] font-medium">Total Trips</p>
          </Card>
          <Card className="p-3 text-center">
            <Wallet className="w-4 h-4 text-[#00A651] mx-auto mb-1.5" />
            <p className="text-lg font-bold text-[#1A1A1A]">
              {loading ? (
                <Skeleton className="h-6 w-14 mx-auto" />
              ) : (
                formatCurrency(totalSpent)
              )}
            </p>
            <p className="text-[10px] text-[#6B7280] font-medium">Total Spent</p>
          </Card>
          <Card className="p-3 text-center">
            <Route className="w-4 h-4 text-[#F9A825] mx-auto mb-1.5" />
            <p className="text-xs font-bold text-[#1A1A1A] leading-tight mt-1">
              {loading ? <Skeleton className="h-4 w-16 mx-auto" /> : mostUsedRoute}
            </p>
            <p className="text-[10px] text-[#6B7280] font-medium mt-1">Most Used</p>
          </Card>
        </motion.div>

        {/* Date Filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-4"
        >
          <Tabs value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <TabsList className="w-full bg-[#E5E7EB] h-10 p-1">
              <TabsTrigger
                value="week"
                className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-medium h-8 rounded-md"
              >
                This Week
              </TabsTrigger>
              <TabsTrigger
                value="month"
                className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-medium h-8 rounded-md"
              >
                This Month
              </TabsTrigger>
              <TabsTrigger
                value="all"
                className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-medium h-8 rounded-md"
              >
                All Time
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Trip List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredTrips.length > 0 ? (
            <div className="space-y-2">
              {filteredTrips.map((trip, idx) => (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Card className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-7 h-7 rounded-lg bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-3.5 h-3.5 text-[#00A651]" />
                          </div>
                          <p className="text-sm font-medium text-[#1A1A1A] truncate">
                            {trip.route || 'Unknown Route'}
                          </p>
                        </div>
                        <p className="text-xs text-[#6B7280] ml-9">
                          {trip.fromStop || 'Unknown'}{' '}
                          <ArrowRight className="w-3 h-3 inline mx-0.5 text-[#9CA3AF]" />{' '}
                          {trip.toStop || 'Unknown'}
                        </p>
                        <p className="text-[11px] text-[#9CA3AF] mt-1 ml-9">
                          {formatTripDate(trip.timestamp)} ·{' '}
                          {format(new Date(trip.timestamp), 'HH:mm')}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-[#1A1A1A] flex-shrink-0 ml-3">
                        {formatCurrency(trip.fare)}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Calendar className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
              <p className="text-sm font-medium text-[#6B7280]">No trips found</p>
              <p className="text-xs text-[#9CA3AF] mt-1">
                {dateFilter === 'all'
                  ? 'Your trip history will appear here after your first ride'
                  : 'No trips in this time period'}
              </p>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}