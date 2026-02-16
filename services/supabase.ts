
import { Route, Announcement, ActiveSelection, User, Company, PaymentMethod } from '../types';
import { INITIAL_ROUTES, INITIAL_ANNOUNCEMENTS, MOCK_USER, MOCK_ADMIN } from '../constants';

// Simulated database storage
class MockSupabase {
  private routes: Route[] = [...INITIAL_ROUTES];
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

  async getRoutes() {
    return this.routes;
  }

  async addRoute(route: Omit<Route, 'id'>) {
    const newRoute = { ...route, id: Math.random().toString(36).substr(2, 9) };
    this.routes.push(newRoute as Route);
    return newRoute;
  }

  async deleteRoute(id: string) {
    this.routes = this.routes.filter(r => r.id !== id);
  }

  async getAnnouncements() {
    return this.announcements;
  }

  async addAnnouncement(ann: Omit<Announcement, 'id' | 'created_at'>) {
    const newAnn = { ...ann, id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
    this.announcements.push(newAnn);
    return newAnn;
  }

  // Companies Management
  async getCompanies() {
    return this.companies;
  }
  async addCompany(name: string) {
    const newCompany = { id: Math.random().toString(36).substr(2, 5), name };
    this.companies.push(newCompany);
    return newCompany;
  }
  async deleteCompany(id: string) {
    this.companies = this.companies.filter(c => c.id !== id);
  }

  // Payment Methods Management
  async getPaymentMethods() {
    return this.paymentMethods;
  }
  async addPaymentMethod(name: string) {
    const newPM = { id: Math.random().toString(36).substr(2, 5), name };
    this.paymentMethods.push(newPM);
    return newPM;
  }
  async deletePaymentMethod(id: string) {
    this.paymentMethods = this.paymentMethods.filter(p => p.id !== id);
  }

  async setActiveSelection(userId: string, routeId: string) {
    const existing = this.selections.findIndex(s => s.userId === userId);
    if (existing >= 0) {
      this.selections[existing] = { userId, routeId, selectedAt: new Date().toISOString() };
    } else {
      this.selections.push({ userId, routeId, selectedAt: new Date().toISOString() });
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

  async getCurrentUser() {
    return this.currentUser;
  }

  async logout() {
    this.currentUser = null;
  }
}

export const supabase = new MockSupabase();
