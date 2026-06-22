export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
}

export interface Card {
  id: string;
  cardNumber: string;
  userId: string;
  balance: number;
  status: 'active' | 'blocked' | 'expired';
  type: 'standard' | 'premium' | 'student';
}

export interface Ticket {
  id: string;
  type: 'single' | 'multi_ride';
  tripsRemaining: number;
  price: number;
  status: 'active' | 'used' | 'expired';
  cardId: string;
  createdAt: string;
}

export interface Trip {
  id: string;
  cardId: string;
  route?: string;
  fromStop?: string;
  toStop?: string;
  fare: number;
  timestamp: string;
}

export interface Transaction {
  id: string;
  type: 'top_up' | 'purchase' | 'refund';
  amount: number;
  description: string;
  createdAt: string;
}

export interface TapToken {
  id: string;
  token: string;
  cardId: string;
  expiresAt: string;
}

export interface DashboardData {
  card: Card;
  recentTrips: Trip[];
  activeTickets: Ticket[];
  totalSpent: number;
  totalTrips: number;
}

export interface NfcTag {
  id: string;
  tagId: string;
  cardId: string;
  userId: string;
  linkedAt: string;
  lastScannedAt?: string;
  scanCount: number;
}

export interface NfcScanResult {
  success: boolean;
  trip?: Trip;
  balance?: number;
  message: string;
}

export interface AppSettings {
  nfcEnabled: boolean;
  nfcAutoTap: boolean;
  notificationsEnabled: boolean;
  lowBalanceAlert: boolean;
  tripAlerts: boolean;
  biometricLogin: boolean;
  darkMode: 'system' | 'light' | 'dark';
  language: string;
  currency: string;
  autoTopUp: boolean;
  autoTopUpAmount: number;
  lowBalanceThreshold: number;
}

export type AppView =
  | 'login'
  | 'register'
  | 'dashboard'
  | 'buy-tickets'
  | 'tap-in'
  | 'card-management'
  | 'trip-history'
  | 'profile'
  | 'settings';