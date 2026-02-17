
import { createClient } from '@supabase/supabase-js';
import { Route, Schedule, Announcement, ActiveSelection, User, Company, PaymentMethod, Ad, DonationMethod, NewsItem, UserRole } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

class SupabaseService {
  async getRoutes(): Promise<Route[]> {
    const { data, error } = await supabaseClient
      .from('routes')
      .select('*');
    if (error) throw error;
    return data || [];
  }

  async getSchedules(): Promise<Schedule[]> {
    const { data, error } = await supabaseClient
      .from('schedules')
      .select('*');
    if (error) throw error;
    return data || [];
  }

  async getAds(): Promise<Ad[]> {
    const { data, error } = await supabaseClient
      .from('ads')
      .select('*')
      .eq('active', true);
    if (error) throw error;
    return data || [];
  }

  async getNews(): Promise<NewsItem[]> {
    const { data, error } = await supabaseClient
      .from('news')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getDonationMethods(): Promise<DonationMethod[]> {
    const { data, error } = await supabaseClient
      .from('donation_methods')
      .select('*');
    if (error) throw error;
    return data || [];
  }

  async addRoute(route: Omit<Route, 'id'>) {
    const { data, error } = await supabaseClient
      .from('routes')
      .insert([route])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateRoute(id: string, data: Partial<Route>) {
    const { error } = await supabaseClient
      .from('routes')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  }

  async addSchedule(schedule: Omit<Schedule, 'id'>) {
    const { data, error } = await supabaseClient
      .from('schedules')
      .insert([schedule])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateSchedule(id: string, data: Partial<Schedule>) {
    const { error } = await supabaseClient
      .from('schedules')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  }

  async deleteSchedule(id: string) {
    const { error } = await supabaseClient
      .from('schedules')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async addAd(ad: Omit<Ad, 'id'>) {
    const { data, error } = await supabaseClient
      .from('ads')
      .insert([ad])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateAd(id: string, data: Partial<Ad>) {
    const { error } = await supabaseClient
      .from('ads')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  }

  async deleteAd(id: string) {
    const { error } = await supabaseClient
      .from('ads')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async addNews(message: string) {
    const { data, error } = await supabaseClient
      .from('news')
      .insert([{ message }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteNews(id: string) {
    const { error } = await supabaseClient
      .from('news')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async addDonationMethod(method: Omit<DonationMethod, 'id'>) {
    const { data, error } = await supabaseClient
      .from('donation_methods')
      .insert([method])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateDonationMethod(id: string, data: Partial<DonationMethod>) {
    const { error } = await supabaseClient
      .from('donation_methods')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  }

  async deleteDonationMethod(id: string) {
    const { error } = await supabaseClient
      .from('donation_methods')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async deleteRoute(id: string) {
    const { error } = await supabaseClient
      .from('routes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async getCompanies(): Promise<Company[]> {
    const { data, error } = await supabaseClient
      .from('companies')
      .select('*');
    if (error) throw error;
    return data || [];
  }

  async addCompany(name: string) {
    const { data, error } = await supabaseClient
      .from('companies')
      .insert([{ name }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteCompany(id: string) {
    const { error } = await supabaseClient
      .from('companies')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const { data, error } = await supabaseClient
      .from('payment_methods')
      .select('*');
    if (error) throw error;
    return data || [];
  }

  async addPaymentMethod(name: string) {
    const { data, error } = await supabaseClient
      .from('payment_methods')
      .insert([{ name }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deletePaymentMethod(id: string) {
    const { error } = await supabaseClient
      .from('payment_methods')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async setActiveSelection(user_id: string, route_id: string, schedule_id: string) {
    const { error } = await supabaseClient
      .from('active_selections')
      .upsert({ user_id, route_id, schedule_id, selected_at: new Date().toISOString() });
    if (error) throw error;
  }

  async getActiveSelection(user_id: string): Promise<ActiveSelection | null> {
    const { data, error } = await supabaseClient
      .from('active_selections')
      .select('*')
      .eq('user_id', user_id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;

    if (data) {
      return {
        userId: data.user_id,
        routeId: data.route_id,
        scheduleId: data.schedule_id,
        selectedAt: data.selected_at
      };
    }
    return null;
  }

  async clearSelection(user_id: string) {
    const { error } = await supabaseClient
      .from('active_selections')
      .delete()
      .eq('user_id', user_id);
    if (error) throw error;
  }

  // --- Auth Methods ---

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      return {
        id: user.id,
        email: user.email!,
        role: profile.role,
        avatar_url: profile.avatar_url
      };
    }
    return null;
  }

  async loginWithPassword(email: string, password: string): Promise<User | null> {
    const { data: { user }, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (!user) return null;

    return this.getCurrentUser();
  }

  async registerWithPassword(email: string, password: string): Promise<User | null> {
    const { data: { user }, error } = await supabaseClient.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    if (!user) return null;

    // The profile will be created by the database trigger if configured, 
    // or we might need to handle it in App.tsx after session confirm.
    return this.getCurrentUser();
  }

  async logout() {
    await supabaseClient.auth.signOut();
  }
}

export const supabase = new SupabaseService();

