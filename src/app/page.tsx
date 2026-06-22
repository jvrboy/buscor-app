'use client';

import { useEffect, useRef } from 'react';
import { useAppStore, useAuthStore } from '@/lib/store';
import LoginView from '@/views/LoginView';
import RegisterView from '@/views/RegisterView';
import DashboardView from '@/views/DashboardView';
import BuyTicketsView from '@/views/BuyTicketsView';
import TapInView from '@/views/TapInView';
import CardManagementView from '@/views/CardManagementView';
import TripHistoryView from '@/views/TripHistoryView';
import ProfileView from '@/views/ProfileView';
import BottomNav from '@/components/BottomNav';

const viewComponents: Record<string, React.ComponentType> = {
  login: LoginView,
  register: RegisterView,
  dashboard: DashboardView,
  'buy-tickets': BuyTicketsView,
  'tap-in': TapInView,
  'card-management': CardManagementView,
  'trip-history': TripHistoryView,
  profile: ProfileView,
};

export default function Home() {
  const currentView = useAppStore((s) => s.currentView);
  const navigate = useAppStore((s) => s.navigate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const initialRedirect = useRef(false);

  // Redirect to dashboard if authenticated/guest but on login/register
  useEffect(() => {
    if (isAuthenticated && (currentView === 'login' || currentView === 'register') && !initialRedirect.current) {
      initialRedirect.current = true;
      navigate('dashboard');
    }
  }, [isAuthenticated, currentView, navigate]);

  const effectiveView =
    !isAuthenticated && currentView !== 'login' && currentView !== 'register'
      ? 'login'
      : currentView;

  const ViewComponent = viewComponents[effectiveView] || LoginView;
  const showNav = isAuthenticated && effectiveView !== 'login' && effectiveView !== 'register';

  return (
    <div className="min-h-screen max-w-md mx-auto relative overflow-x-hidden bg-white">
      <ViewComponent />
      {showNav && <BottomNav />}
    </div>
  );
}