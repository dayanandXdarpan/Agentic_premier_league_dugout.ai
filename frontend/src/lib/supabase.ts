import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Supabase client for real-time chat (Public + Private rooms).
 * If credentials are not set, chat works in LOCAL-ONLY mock mode.
 */
export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

export const isSupabaseConfigured = (): boolean => {
  return !!supabase;
};

// Generate a random 4-digit room code
export const generateRoomCode = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Chat message type
export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: string;
  room?: string;        // null = public chat, string = private room code
  isAI?: boolean;       // true = AI Banter Agent message
  avatar?: string;      // emoji avatar
}

// Random cricket fan names for demo
const FAN_NAMES = [
  'CricketFanatic99', 'SixHitter_King', 'BowlerBoss', 'IPLAddict',
  'RunMachine007', 'ViratFanClub', 'DhoniFever', 'WicketWizard',
  'BoundaryKing', 'SpinMaster42', 'PaceAttack11', 'CaptainCool',
];

const FAN_AVATARS = ['🏏', '🔥', '⚡', '🎯', '💪', '🏆', '🎭', '🦁', '🐯', '🦅', '👑', '🌟'];

export const getRandomFanName = (): string =>
  FAN_NAMES[Math.floor(Math.random() * FAN_NAMES.length)];

export const getRandomAvatar = (): string =>
  FAN_AVATARS[Math.floor(Math.random() * FAN_AVATARS.length)];

// Generate a demo user identity (persisted in session)
let _demoUser: { name: string; avatar: string } | null = null;
export const getDemoUser = () => {
  if (!_demoUser) {
    const stored = sessionStorage.getItem('dugout_user');
    if (stored) {
      _demoUser = JSON.parse(stored);
    } else {
      _demoUser = { name: getRandomFanName(), avatar: getRandomAvatar() };
      sessionStorage.setItem('dugout_user', JSON.stringify(_demoUser));
    }
  }
  return _demoUser!;
};
