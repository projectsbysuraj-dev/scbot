export interface UserProfile {
  id: string;
  telegramId: string;
  name: string;
  username: string;
  balance: number;
  spins: number;
  friendsJoined: number;
  spinsEarned: number;
  createdAt: number;
  photoUrl?: string;
  isVerified?: boolean;
  deviceVerified?: boolean;
  deviceVerifiedAt?: number;
  deviceBlocked?: boolean;
  deviceBlockedAt?: number;
  claimedWelcomeSpin?: boolean;
  referredBy?: string;
  referralRewardGiven?: boolean;
  referralCompletedAt?: number;
}

export type WithdrawalMethod = 'upi' | 'bank';
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected';

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  method: WithdrawalMethod;
  upiId?: string;
  accountHolder?: string;
  accountNumber?: string;
  bankName?: string;
  ifsc?: string;
  status: WithdrawalStatus;
  rejectReason?: string;
  utr?: string;
  processedAt?: number;
  createdAt: number;
  updatedAt?: number;
}

export type TransactionType = 'spin_win' | 'referral_bonus' | 'welcome_bonus' | 'withdrawal' | 'withdrawal_refund' | 'admin_adjustment';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'rejected';
  createdAt: number;
}

export interface AdminCredentials {
  email: string;
  password: string;
  updatedAt?: number;
}

export interface AppSettings {
  botUsername: string;
  telegramChannelUrl: string;
  appTitle: string;
  spinWinAmount: number;
  minWithdrawalLimit: number;
  adminPin: string;
  adminEmail?: string;
  adminPassword?: string;
  autoWithdrawal?: boolean; // When true, withdrawals are automatically processed & approved instantly
  firebaseConfig?: {
    apiKey?: string;
    databaseURL?: string;
    projectId?: string;
  };
}

export type ThemePreset = 'sky-blue' | 'sapphire' | 'purple' | 'emerald' | 'gold-sunset' | 'cyber-red' | 'custom';

export interface ThemeSettings {
  preset: ThemePreset;
  primaryColor: string;
  glowColor: string;
  bgGradientStart: string;
  bgGradientEnd: string;
}

export interface SpinSegment {
  value: number;
  label: string;
  color: string;
  textColor: string;
}
