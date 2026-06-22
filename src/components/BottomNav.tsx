'use client';

import { motion } from 'framer-motion';
import { LayoutDashboard, Ticket, QrCode, User, Settings } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { AppView } from '@/lib/types';

interface NavItem {
  view: AppView;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { view: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { view: 'buy-tickets', label: 'Tickets', icon: Ticket },
  { view: 'tap-in', label: 'Tap-In', icon: QrCode },
  { view: 'profile', label: 'Profile', icon: User },
  { view: 'settings', label: 'Settings', icon: Settings },
];

export default function BottomNav() {
  const { currentView, navigate } = useAppStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E5E7EB] safe-area-pb">
      <nav className="flex items-center justify-around h-16 max-w-md mx-auto px-1">
        {navItems.map((item) => {
          const active = currentView === item.view;
          const Icon = item.icon;
          return (
            <button
              key={item.view}
              onClick={() => navigate(item.view)}
              className="relative flex flex-col items-center justify-center flex-1 h-full gap-0.5"
            >
              {active && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-px left-3 right-3 h-0.5 bg-[#00A651] rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                className={`w-[18px] h-[18px] transition-colors duration-200 ${
                  active ? 'text-[#00A651]' : 'text-[#9CA3AF]'
                }`}
              />
              <span
                className={`text-[9px] font-medium transition-colors duration-200 ${
                  active ? 'text-[#00A651]' : 'text-[#9CA3AF]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}