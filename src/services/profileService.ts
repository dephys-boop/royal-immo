import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import { storageService } from './storageService';

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Profile | null) || null;
  },

  async updateProfile(userId: string, updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'whatsapp' | 'city' | 'avatar_url'>>): Promise<Profile | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Profile | null) || null;
  },

  async uploadProfilePhoto(userId: string, rawFile: File): Promise<string> {
    const asset = await storageService.uploadAvatar(rawFile);
    await this.updateProfile(userId, { avatar_url: asset.public_url });
    return asset.public_url;
  },

  async removeProfilePhoto(userId: string, currentAvatarUrl?: string | null): Promise<void> {
    if (currentAvatarUrl) {
      try {
        await storageService.deletePhoto('avatars', currentAvatarUrl);
      } catch {
        // Ignore if previous URL was external or already removed
      }
    }
    await this.updateProfile(userId, { avatar_url: null });
  },
};
