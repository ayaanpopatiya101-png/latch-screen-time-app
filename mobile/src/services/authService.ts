import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserAccount } from '@/types';

const KEY = 'latch:user';

/**
 * Prototype auth: account stored locally. Replace with Supabase / Auth0 / your
 * own server in production. The shape of UserAccount matches what production
 * auth providers return so swapping in real auth is a contained change.
 */
export const authService = {
  async load(): Promise<UserAccount | null> {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserAccount;
    } catch {
      return null;
    }
  },
  async signUp(email: string, displayName: string): Promise<UserAccount> {
    const user: UserAccount = {
      id: `local-${Date.now()}`,
      email: email.trim().toLowerCase(),
      displayName: displayName.trim(),
      createdAt: Date.now(),
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(user));
    return user;
  },
  async signOut() {
    await AsyncStorage.removeItem(KEY);
  },
};
