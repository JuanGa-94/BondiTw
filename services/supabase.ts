
import { Route, Schedule, Announcement, ActiveSelection, User, Company, PaymentMethod, Ad, DonationMethod, NewsItem, UserRole } from '../types';
import { INITIAL_ROUTES, INITIAL_ANNOUNCEMENTS, MOCK_USER, MOCK_ADMIN, INITIAL_ADS, INITIAL_DONATION_METHODS, INITIAL_NEWS } from '../constants';

class MockSupabase {
  private routes: Route[] = [];
  private schedules: Schedule[] = [];
  private ads: Ad[] = [...INITIAL_ADS];
  private news: NewsItem[] = [...INITIAL_NEWS];
  private donationMethods: DonationMethod[] = [...INITIAL_DONATION_METHODS];
  private announcements: Announcement[] = [...INITIAL_ANNOUNCEMENTS];
  private companies: Company[] = [
    { id: 'c1', name: 'ALSA Interurbanos' },
    { id: 'c2', name: 'Interbus' },
    { id: 'c3', name: 'Viaconti' },
    { id: 'c4', name: 'BusMadrid' }
  ];
  private paymentMethods: PaymentMethod[] = [
    { id: 'p1', name: 'Efectivo' },
    { id: 'p2', name: 'Tarjeta' },
    { id: 'p3', name: 'Abono' },
    { id: 'p4', name: 'App Móvil' }
  ];
  private selections: ActiveSelection[] = [];
  private currentUser: User | null = null;

  constructor() {
    INITIAL_ROUTES.forEach(ir => {
      const { departure_time, arrival_time, operating_days, platform, ...routeData } = ir as any;
      const routeId = routeData.id;
      this.routes.push(routeData as Route);
      this.schedules.push({
        id: Math.random().toString(36).substr(2, 9),
        route_id: routeId,
        departure_time,
        arrival_time,
        operating_days,
        platform
      });
    });
  }

  async getRoutes() { return this.routes; }
  async getSchedules() { return this.schedules; }
  async getAds() { return this.ads; }
  async getNews() { return this.news; }
  async getDonationMethods() { return this.donationMethods; }

  async addRoute(route: Omit<Route, 'id'>) {
    const newRoute = { ...route, id: Math.random().toString(36).substr(2, 9) };
    this.routes.push(newRoute as Route);
    return newRoute;
  }

  async addSchedule(schedule: Omit<Schedule, 'id'>) {
    const newSchedule = { ...schedule, id: Math.random().toString(36).substr(2, 9) };
    this.schedules.push(newSchedule as Schedule);
    return newSchedule;
  }

  async updateSchedule(id: string, data: Partial<Schedule>) {
    const index = this.schedules.findIndex(s => s.id === id);
    if (index !== -1) {
      this.schedules[index] = { ...this.schedules[index], ...data };
    }
  }

  async deleteSchedule(id: string) {
    this.schedules = this.schedules.filter(s => s.id !== id);
  }

  async addAd(ad: Omit<Ad, 'id'>) {
    const newAd = { ...ad, id: Math.random().toString(36).substr(2, 9) };
    this.ads.push(newAd as Ad);
    return newAd;
  }

  async deleteAd(id: string) {
    this.ads = this.ads.filter(a => a.id !== id);
  }

  async addNews(message: string) {
    const newNews = { id: Math.random().toString(36).substr(2, 9), message, created_at: new Date().toISOString() };
    this.news.unshift(newNews);
    return newNews;
  }

  async deleteNews(id: string) {
    this.news = this.news.filter(n => n.id !== id);
  }

  async addDonationMethod(method: Omit<DonationMethod, 'id'>) {
    const newDM = { ...method, id: Math.random().toString(36).substr(2, 9) };
    this.donationMethods.push(newDM);
    return newDM;
  }

  async deleteDonationMethod(id: string) {
    this.donationMethods = this.donationMethods.filter(d => d.id !== id);
  }

  async deleteRoute(id: string) {
    this.routes = this.routes.filter(r => r.id !== id);
    this.schedules = this.schedules.filter(s => s.route_id !== id);
  }

  async getAnnouncements() { return this.announcements; }
  async getCompanies() { return this.companies; }
  async addCompany(name: string) {
    const newCompany = { id: Math.random().toString(36).substr(2, 5), name };
    this.companies.push(newCompany);
    return newCompany;
  }

  async getPaymentMethods() { return this.paymentMethods; }
  async addPaymentMethod(name: string) {
    const newPM = { id: Math.random().toString(36).substr(2, 5), name };
    this.paymentMethods.push(newPM);
    return newPM;
  }

  async deletePaymentMethod(id: string) {
    this.paymentMethods = this.paymentMethods.filter(pm => pm.id !== id);
  }

  async setActiveSelection(userId: string, routeId: string, scheduleId: string) {
    const existing = this.selections.findIndex(s => s.userId === userId);
    const data = { userId, routeId, scheduleId, selectedAt: new Date().toISOString() };
    if (existing >= 0) {
      this.selections[existing] = data;
    } else {
      this.selections.push(data);
    }
  }

  async getActiveSelection(userId: string) {
    return this.selections.find(s => s.userId === userId) || null;
  }

  async clearSelection(userId: string) {
    this.selections = this.selections.filter(s => s.userId !== userId);
  }

  async login(isAdmin: boolean) {
    this.currentUser = isAdmin ? MOCK_ADMIN : MOCK_USER;
    return this.currentUser;
  }

  async register(email: string) {
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      role: UserRole.USER,
      avatar_url: `https://picsum.photos/seed/${Math.random()}/100/100`
    };
    this.currentUser = newUser;
    return newUser;
  }

  async logout() { this.currentUser = null; }
}

export const supabase = new MockSupabase();
