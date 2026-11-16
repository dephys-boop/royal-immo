import { isSupabaseConfigured, supabase } from '../lib/supabase';

export const favoriteService = {
  async fetchUserFavorites(userId: string): Promise<string[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data, error } = await supabase
      .from('favorites')
      .select('property_id')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return (data || []).map((row: { property_id: string }) => row.property_id);
  },

  async addFavorite(userId: string, propertyId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: userId, property_id: propertyId });
    if (error && !error.message.includes('duplicate')) {
      throw new Error(error.message);
    }
  },

  async removeFavorite(userId: string, propertyId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', propertyId);
    if (error) throw new Error(error.message);
  },
};
