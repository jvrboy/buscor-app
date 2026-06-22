'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  LogOut,
  Loader2,
  Pencil,
  Check,
  X,
  Phone,
  Mail,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
import { apiFetch, apiFetchPaginated } from '@/lib/utils';
import { toast } from 'sonner';
import TopUpDialog from '@/components/TopUpDialog';
import GuestBanner from '@/components/GuestBanner';
import type { Transaction } from '@/lib/types';

function formatCurrency(amount: number) {
  return `R${amount.toFixed(2)}`;
}

function formatCardNumber(num: string) {
  if (!num || num.length < 4) return num;
  const last4 = num.slice(-4);
  return `**** **** **** ${last4}`;
}

const statusColor: Record<string, string> = {
  active: 'bg-[#E8F5E9] text-[#00A651]',
  blocked: 'bg-[#FFEBEE] text-[#D32F2F]',
  expired: 'bg-[#FFF8E1] text-[#F9A825]',
};

const txnIconColor: Record<string, string> = {
  top_up: '#00A651',
  purchase: '#D32F2F',
  refund: '#004C97',
};

export default function ProfileView() {
  const { user, card, updateUser, updateCard, logout, isGuest } = useAuthStore();
  const { navigate } = useAppStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [saving, setSaving] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (isGuest) {
        setTransactions([
          { id: 'gt1', type: 'top_up', amount: 200.00, description: 'Wallet top-up via EFT', createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
          { id: 'gt2', type: 'purchase', amount: 12.00, description: 'Single Ride Ticket', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
          { id: 'gt3', type: 'purchase', amount: 100.00, description: 'Multi-Ride Bundle (10 trips)', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
        ]);
        setLoading(false);
        return;
      }
      if (user?.id) {
        try {
          const { items } = await apiFetchPaginated<Transaction>(`/api/transactions?userId=${user.id}`);
          setTransactions(items);
        } catch {
          // silent
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [user?.id]);

  const startEdit = () => {
    setEditForm({
      fullName: user?.fullName ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const saveProfile = async () => {
    if (!editForm.fullName.trim() || !editForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    try {
      const data = await apiFetch<{ id: string; fullName: string; email: string; phone: string }>('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, ...editForm }),
      });
      updateUser(data);
      toast.success('Profile updated successfully');
      setEditing(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('login');
    toast.success('Logged out successfully');
  };

  const handleTopUpSuccess = (amount: number) => {
    toast.success(`R${amount.toFixed(2)} topped up successfully!`);
    setShowTopUp(false);
  };

  const firstName = user?.fullName?.split(' ')[0] || 'User';

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-24">
      <GuestBanner />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10"
      >
        <h1 className="text-lg font-semibold text-[#1A1A1A]">Profile</h1>
      </motion.div>

      <div className="px-4 pt-4 max-w-md mx-auto">
        {/* Guest Sign-In CTA */}
        {isGuest && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5"
          >
            <Card className="p-5 bg-gradient-to-r from-[#004C97] to-[#003D7A] border-0">
              <h3 className="text-white font-semibold text-base mb-1">Ready to get started?</h3>
              <p className="text-white/70 text-sm mb-4">Sign in to manage your card, buy tickets, and track your trips.</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => { logout(); navigate('login'); }}
                  className="flex-1 h-10 bg-white text-[#004C97] hover:bg-white/90 font-semibold rounded-lg text-sm"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => { logout(); navigate('register'); }}
                  variant="outline"
                  className="flex-1 h-10 border-white/30 text-white hover:bg-white/10 rounded-lg text-sm"
                >
                  Register
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* User Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-5"
        >
          <Card className="p-5">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-[#004C97] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                {editing ? (
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="editName" className="text-[10px] text-[#6B7280]">
                        Full Name
                      </Label>
                      <Input
                        id="editName"
                        value={editForm.fullName}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, fullName: e.target.value }))
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="editEmail" className="text-[10px] text-[#6B7280]">
                        Email
                      </Label>
                      <Input
                        id="editEmail"
                        type="email"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, email: e.target.value }))
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="editPhone" className="text-[10px] text-[#6B7280]">
                        Phone
                      </Label>
                      <Input
                        id="editPhone"
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, phone: e.target.value }))
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={saveProfile}
                        disabled={saving}
                        className="h-8 bg-[#00A651] hover:bg-[#008F45] text-white text-xs px-3"
                      >
                        {saving ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <Check className="w-3 h-3 mr-1" />
                        )}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEdit}
                        className="h-8 text-xs px-3"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-base font-semibold text-[#1A1A1A]">
                      {user?.fullName || 'User'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Mail className="w-3.5 h-3.5 text-[#6B7280]" />
                      <p className="text-sm text-[#6B7280] truncate">{user?.email || '--'}</p>
                    </div>
                    {user?.phone && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-[#6B7280]" />
                        <p className="text-sm text-[#6B7280]">{user.phone}</p>
                      </div>
                    )}
                    {!isGuest && (
                    <button
                      onClick={startEdit}
                      className="mt-2 text-xs text-[#004C97] font-medium hover:underline flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit Profile
                    </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Card Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-5"
        >
          <h2 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
            Card Info
          </h2>
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#004C97] flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-mono text-[#1A1A1A]">
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
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] text-[#9CA3AF] uppercase">Type</p>
                <p className="text-xs font-medium text-[#1A1A1A] capitalize mt-0.5">
                  {card?.type || 'standard'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#9CA3AF] uppercase">Balance</p>
                <p className="text-sm font-bold text-[#00A651] mt-0.5">
                  {formatCurrency(card?.balance ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#9CA3AF] uppercase">Status</p>
                <p className="text-xs font-medium text-[#1A1A1A] capitalize mt-0.5">
                  {card?.status ?? 'active'}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Top Up Button */}
        {!isGuest && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-5"
        >
          <Button
            onClick={() => setShowTopUp(true)}
            className="w-full h-12 bg-[#00A651] hover:bg-[#008F45] text-white font-semibold rounded-xl flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Top Up Wallet
          </Button>
        </motion.div>
        )}

        {/* Transaction History */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <h2 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
            Transaction History
          </h2>
          {isGuest && (
            <p className="text-[10px] text-[#9CA3AF] -mt-1 mb-2">Sample transactions shown</p>
          )}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-4 w-14" />
                  </div>
                </Card>
              ))}
            </div>
          ) : transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((txn, idx) => {
                const isCredit = txn.type === 'top_up' || txn.type === 'refund';
                const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
                const color = txnIconColor[txn.type] || '#6B7280';
                return (
                  <motion.div
                    key={txn.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.03 }}
                  >
                    <Card className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${color}15` }}
                        >
                          <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1A1A1A] truncate">
                            {txn.description}
                          </p>
                          <p className="text-xs text-[#9CA3AF]">
                            {format(new Date(txn.createdAt), 'dd MMM yyyy · HH:mm')}
                          </p>
                        </div>
                        <p
                          className={`text-sm font-semibold flex-shrink-0 ${
                            isCredit ? 'text-[#00A651]' : 'text-[#D32F2F]'
                          }`}
                        >
                          {isCredit ? '+' : '-'}
                          {formatCurrency(txn.amount)}
                        </p>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <CreditCard className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
              <p className="text-sm font-medium text-[#6B7280]">No transactions yet</p>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Your transaction history will appear here
              </p>
            </Card>
          )}
        </motion.div>

        {/* Logout / Exit Guest */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={() => setShowLogout(true)}
            variant="outline"
            className={`w-full h-11 font-medium rounded-xl ${isGuest ? 'border-[#F9A825] text-[#F9A825] hover:bg-[#FFF8E1]' : 'border-[#D32F2F] text-[#D32F2F] hover:bg-[#FFEBEE]'}`}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {isGuest ? 'Exit Guest Mode' : 'Logout'}
          </Button>
        </motion.div>
      </div>

      {/* Top Up Dialog */}
      <TopUpDialog open={showTopUp} onOpenChange={setShowTopUp} onSuccess={handleTopUpSuccess} />

      {/* Logout Confirmation */}
      <AlertDialog open={showLogout} onOpenChange={setShowLogout}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isGuest ? 'Exit Guest Mode' : 'Logout'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isGuest
                ? 'Are you sure you want to exit guest mode? You can sign in or continue as a guest again.'
                : 'Are you sure you want to logout? You will need to enter your card number and PIN to log back in.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className={isGuest ? 'bg-[#F9A825] hover:bg-[#E68A00] text-white' : 'bg-[#D32F2F] hover:bg-[#B71C1C] text-white'}
            >
              {isGuest ? 'Exit' : 'Logout'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}