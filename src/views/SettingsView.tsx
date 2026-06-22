'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Nfc,
  Bell,
  Fingerprint,
  Shield,
  Trash2,
  Info,
  ChevronRight,
  Moon,
  Globe,
  CreditCard,
  AlertTriangle,
  RefreshCcw,
  LogOut,
  Smartphone,
  Wifi,
  HardDrive,
  FileText,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Bus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useAuthStore, useAppStore, useSettingsStore } from '@/lib/store';
import { apiFetch } from '@/lib/utils';
import { toast } from 'sonner';
import GuestBanner from '@/components/GuestBanner';
import type { NfcTag } from '@/lib/types';

function SettingRow({
  icon: Icon,
  iconColor,
  label,
  description,
  children,
  onClick,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  description?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3.5 text-left"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${iconColor}15` }}
      >
        <Icon className="w-4.5 h-4.5" style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1A1A1A]">{label}</p>
        {description && (
          <p className="text-xs text-[#9CA3AF] mt-0.5">{description}</p>
        )}
      </div>
      {children || <ChevronRight className="w-4 h-4 text-[#D1D5DB] flex-shrink-0" />}
    </button>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mt-5 mb-1 px-1">
      {title}
    </h3>
  );
}

export default function SettingsView() {
  const { user, card, isGuest, logout } = useAuthStore();
  const { navigate } = useAppStore();
  const { settings, updateSettings, resetSettings } = useSettingsStore();

  const [showLogout, setShowLogout] = useState(false);
  const [showClearData, setShowClearData] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [nfcTags, setNfcTags] = useState<NfcTag[]>([]);
  const [loadingNfc, setLoadingNfc] = useState(false);
  const [nfcAvailable, setNfcAvailable] = useState(false);

  const checkNfc = async () => {
    try {
      if ('NDEFReader' in window) {
        setNfcAvailable(true);
      } else {
        // Try Capacitor NFC plugin
        const { Nfc } = await import('@nicepkg/capacitor-nfc' as any).catch(() => null) || 
                         await import('@capacitor-community/nfc' as any).catch(() => null);
        if (Nfc) {
          setNfcAvailable(true);
        }
      }
    } catch {
      setNfcAvailable(false);
    }
  };

  const fetchNfcTags = async () => {
    if (isGuest || !user?.id) {
      toast.info('Sign in to manage NFC tags');
      return;
    }
    setLoadingNfc(true);
    try {
      const data = await apiFetch<NfcTag[]>(`/api/nfc?userId=${user.id}`);
      setNfcTags(data);
    } catch {
      setNfcTags([]);
    } finally {
      setLoadingNfc(false);
    }
  };

  const clearAppData = async () => {
    setClearingData(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      resetSettings();
      toast.success('App data cleared. Reloading...');
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      toast.error('Failed to clear data');
    } finally {
      setClearingData(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('login');
    toast.success('Logged out successfully');
  };

  const handleLinkNfc = async () => {
    if (isGuest) {
      toast.info('Sign in to link NFC tags');
      return;
    }
    if (!nfcAvailable) {
      toast.error('NFC is not available on this device');
      return;
    }
    toast.info('Hold your NFC card near the device to link it...');
    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      ndef.onreading = async (event: any) => {
        const tagId = event.serialNumber;
        try {
          await apiFetch('/api/nfc/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tagId, cardId: card?.id, userId: user?.id }),
          });
          toast.success('NFC card linked successfully!');
          fetchNfcTags();
        } catch (err: any) {
          toast.error(err?.message || 'Failed to link NFC card');
        }
      };
    } catch (err: any) {
      toast.error(err?.message || 'NFC scan failed');
    }
  };

  const handleUnlinkTag = async (tagId: string) => {
    try {
      await apiFetch('/api/nfc/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId, userId: user?.id }),
      });
      toast.success('NFC tag unlinked');
      setNfcTags((prev) => prev.filter((t) => t.tagId !== tagId));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to unlink tag');
    }
  };

  const appVersion = '1.0.0';
  const buildNumber = '6';

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-24">
      <GuestBanner />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10"
      >
        <h1 className="text-lg font-semibold text-[#1A1A1A]">Settings</h1>
        <Badge variant="secondary" className="text-xs bg-[#E8F5E9] text-[#00A651] border-0">
          v{appVersion}
        </Badge>
      </motion.div>

      <div className="px-4 pt-3 max-w-md mx-auto pb-4">

        {/* ─── NFC Section ─── */}
        <SectionHeader title="NFC & Tap" />

        <Card className="px-4 pt-1 pb-2 mb-2">
          <SettingRow
            icon={Nfc}
            iconColor="#004C97"
            label="NFC Enabled"
            description="Use NFC to tap in on buses"
          >
            <Switch
              checked={settings.nfcEnabled}
              onCheckedChange={(v) => updateSettings({ nfcEnabled: v })}
            />
          </SettingRow>
          <Separator className="bg-[#F3F4F6]" />
          <SettingRow
            icon={Wifi}
            iconColor="#00A651"
            label="Auto-Tap Mode"
            description="Automatically tap when NFC reader is detected"
          >
            <Switch
              checked={settings.nfcAutoTap}
              disabled={!settings.nfcEnabled}
              onCheckedChange={(v) => updateSettings({ nfcAutoTap: v })}
            />
          </SettingRow>
          <Separator className="bg-[#F3F4F6]" />
          <button
            onClick={fetchNfcTags}
            className="w-full flex items-center gap-3 py-3.5 text-left"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#F9A82515]">
              <CreditCard className="w-4.5 h-4.5 text-[#F9A825]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1A1A1A]">Linked NFC Tags</p>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                {loadingNfc ? 'Loading...' : `${nfcTags.length} tag${nfcTags.length !== 1 ? 's' : ''} linked`}
              </p>
            </div>
            {loadingNfc && <Loader2 className="w-4 h-4 text-[#9CA3AF] animate-spin" />}
          </button>
          {nfcTags.length > 0 && (
            <div className="ml-12 mb-2 space-y-1.5">
              {nfcTags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between bg-[#F9FAFB] rounded-lg px-3 py-2">
                  <div>
                    <p className="text-xs font-mono text-[#1A1A1A]">{tag.tagId.slice(0, 16)}...</p>
                    <p className="text-[10px] text-[#9CA3AF]">
                      {tag.scanCount} scans · Linked {new Date(tag.linkedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnlinkTag(tag.tagId)}
                    className="h-7 text-[10px] text-[#D32F2F] hover:bg-[#FFEBEE] px-2"
                  >
                    Unlink
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Separator className="bg-[#F3F4F6]" />
          <button
            onClick={handleLinkNfc}
            className="w-full flex items-center gap-3 py-3.5 text-left"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#00A65115]">
              <Smartphone className="w-4.5 h-4.5 text-[#00A651]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#004C97]">Link New NFC Card</p>
              <p className="text-xs text-[#9CA3AF] mt-0.5">Hold your NFC card near the device</p>
            </div>
            <ExternalLink className="w-4 h-4 text-[#004C97]" />
          </button>
        </Card>

        {/* ─── Notifications ─── */}
        <SectionHeader title="Notifications" />

        <Card className="px-4 pt-1 pb-2 mb-2">
          <SettingRow
            icon={Bell}
            iconColor="#00A651"
            label="Push Notifications"
            description="Receive trip and balance alerts"
          >
            <Switch
              checked={settings.notificationsEnabled}
              onCheckedChange={(v) => updateSettings({ notificationsEnabled: v })}
            />
          </SettingRow>
          <Separator className="bg-[#F3F4F6]" />
          <SettingRow
            icon={AlertTriangle}
            iconColor="#F9A825"
            label="Low Balance Alert"
            description={`Alert when below R${settings.lowBalanceThreshold}`}
          >
            <Switch
              checked={settings.lowBalanceAlert}
              disabled={!settings.notificationsEnabled}
              onCheckedChange={(v) => updateSettings({ lowBalanceAlert: v })}
            />
          </SettingRow>
          <Separator className="bg-[#F3F4F6]" />
          <SettingRow
            icon={Bus}
            iconColor="#004C97"
            label="Trip Alerts"
            description="Get notified after each trip"
          >
            <Switch
              checked={settings.tripAlerts}
              disabled={!settings.notificationsEnabled}
              onCheckedChange={(v) => updateSettings({ tripAlerts: v })}
            />
          </SettingRow>
        </Card>

        {/* ─── Security ─── */}
        <SectionHeader title="Security & Privacy" />

        <Card className="px-4 pt-1 pb-2 mb-2">
          <SettingRow
            icon={Fingerprint}
            iconColor="#6B7280"
            label="Biometric Login"
            description="Use fingerprint or face ID"
          >
            <Switch
              checked={settings.biometricLogin}
              onCheckedChange={(v) => updateSettings({ biometricLogin: v })}
            />
          </SettingRow>
          <Separator className="bg-[#F3F4F6]" />
          <SettingRow
            icon={Shield}
            iconColor="#004C97"
            label="Security Settings"
            description="PIN, 2FA, session management"
            onClick={() => toast.info('Security settings coming soon')}
          />
          <Separator className="bg-[#F3F4F6]" />
          <SettingRow
            icon={FileText}
            iconColor="#00A651"
            label="Privacy Policy"
            description="Data handling and privacy"
            onClick={() => toast.info('Privacy policy page coming soon')}
          />
        </Card>

        {/* ─── Auto Top-Up ─── */}
        <SectionHeader title="Wallet" />

        <Card className="px-4 pt-1 pb-2 mb-2">
          <SettingRow
            icon={CreditCard}
            iconColor="#00A651"
            label="Auto Top-Up"
            description="Automatically top up when balance is low"
          >
            <Switch
              checked={settings.autoTopUp}
              onCheckedChange={(v) => updateSettings({ autoTopUp: v })}
            />
          </SettingRow>
          {settings.autoTopUp && (
            <>
              <Separator className="bg-[#F3F4F6]" />
              <div className="flex items-center gap-3 py-3.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#004C9715]">
                  <span className="text-xs font-bold text-[#004C97]">R</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1A1A1A]">Top-Up Amount</p>
                </div>
                <Select
                  value={String(settings.autoTopUpAmount)}
                  onValueChange={(v) => updateSettings({ autoTopUpAmount: Number(v) })}
                >
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">R25</SelectItem>
                    <SelectItem value="50">R50</SelectItem>
                    <SelectItem value="100">R100</SelectItem>
                    <SelectItem value="200">R200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator className="bg-[#F3F4F6]" />
              <div className="flex items-center gap-3 py-3.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#F9A82515]">
                  <AlertTriangle className="w-4 h-4 text-[#F9A825]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1A1A1A]">Low Balance Threshold</p>
                </div>
                <Select
                  value={String(settings.lowBalanceThreshold)}
                  onValueChange={(v) => updateSettings({ lowBalanceThreshold: Number(v) })}
                >
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">R10</SelectItem>
                    <SelectItem value="20">R20</SelectItem>
                    <SelectItem value="50">R50</SelectItem>
                    <SelectItem value="100">R100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </Card>

        {/* ─── Preferences ─── */}
        <SectionHeader title="Preferences" />

        <Card className="px-4 pt-1 pb-2 mb-2">
          <SettingRow
            icon={Moon}
            iconColor="#6B7280"
            label="Appearance"
            description="Theme and display"
          >
            <Select
              value={settings.darkMode}
              onValueChange={(v) => updateSettings({ darkMode: v as 'system' | 'light' | 'dark' })}
            >
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <Separator className="bg-[#F3F4F6]" />
          <SettingRow
            icon={Globe}
            iconColor="#004C97"
            label="Language"
            description="App display language"
          >
            <Select
              value={settings.language}
              onValueChange={(v) => updateSettings({ language: v })}
            >
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="af">Afrikaans</SelectItem>
                <SelectItem value="zu">Zulu</SelectItem>
                <SelectItem value="xh">Xhosa</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </Card>

        {/* ─── Data & Storage ─── */}
        <SectionHeader title="Data & Storage" />

        <Card className="px-4 pt-1 pb-2 mb-2">
          <SettingRow
            icon={HardDrive}
            iconColor="#6B7280"
            label="Storage Used"
            description="Cache, preferences, offline data"
            onClick={() => {
              const size = new Blob(Object.values(localStorage)).size;
              toast.info(`Local storage: ${(size / 1024).toFixed(1)} KB`);
            }}
          />
          <Separator className="bg-[#F3F4F6]" />
          <button
            onClick={() => setShowClearData(true)}
            className="w-full flex items-center gap-3 py-3.5 text-left"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#D32F2F15]">
              <Trash2 className="w-4.5 h-4.5 text-[#D32F2F]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#D32F2F]">Clear App Data</p>
              <p className="text-xs text-[#9CA3AF] mt-0.5">Remove cache and local data</p>
            </div>
          </button>
          <Separator className="bg-[#F3F4F6]" />
          <button
            onClick={resetSettings}
            className="w-full flex items-center gap-3 py-3.5 text-left"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#F9A82515]">
              <RefreshCcw className="w-4.5 h-4.5 text-[#F9A825]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#1A1A1A]">Reset Settings</p>
              <p className="text-xs text-[#9CA3AF] mt-0.5">Restore default settings</p>
            </div>
          </button>
        </Card>

        {/* ─── About ─── */}
        <SectionHeader title="About" />

        <Card className="px-4 pt-1 pb-2 mb-6">
          <SettingRow
            icon={Info}
            iconColor="#004C97"
            label="App Version"
            description={`Build ${buildNumber} · Capacitor 7`}
          >
            <Badge variant="secondary" className="text-[10px] border-0 bg-[#E3F2FD] text-[#004C97]">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Up to date
            </Badge>
          </SettingRow>
          <Separator className="bg-[#F3F4F6]" />
          <SettingRow
            icon={FileText}
            iconColor="#6B7280"
            label="Terms of Service"
            onClick={() => toast.info('Terms of service page coming soon')}
          />
          <Separator className="bg-[#F3F4F6]" />
          <SettingRow
            icon={Shield}
            iconColor="#00A651"
            label="Open Source Licenses"
            onClick={() => toast.info('License information coming soon')}
          />
        </Card>

        {/* ─── Logout / Exit ─── */}
        <Card className="p-4 mb-6 bg-white">
          <Button
            onClick={() => setShowLogout(true)}
            variant="outline"
            className={`w-full h-11 font-medium rounded-xl ${isGuest ? 'border-[#F9A825] text-[#F9A825] hover:bg-[#FFF8E1]' : 'border-[#D32F2F] text-[#D32F2F] hover:bg-[#FFEBEE]'}`}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {isGuest ? 'Exit Guest Mode' : 'Logout'}
          </Button>
        </Card>
      </div>

      {/* Clear Data Dialog */}
      <AlertDialog open={showClearData} onOpenChange={setShowClearData}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear App Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all cached data, preferences, and offline content.
              You will be signed out and need to log in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={clearAppData}
              disabled={clearingData}
              className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white"
            >
              {clearingData && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Clear Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout Dialog */}
      <AlertDialog open={showLogout} onOpenChange={setShowLogout}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isGuest ? 'Exit Guest Mode' : 'Logout'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isGuest
                ? 'Are you sure you want to exit guest mode?'
                : 'Are you sure you want to logout? You will need your card number and PIN to log back in.'}
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