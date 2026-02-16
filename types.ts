
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
}

export interface Company {
  id: string;
  name: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
}

export interface Route {
  id: string;
  origin: string;
  destination: string;
  departure_time: string; // HH:mm format
  arrival_time: string;   // HH:mm format
  company: string;
  line: string;
  show_line: boolean;
  route_name: string;     // Updated terminology: e.g., "Ruta 4 / Recorrido A"
  payment_methods: string[]; // e.g., ["Efectivo", "Tarjeta", "Abono"]
  platform?: string;
  is_special: boolean;
  special_reason?: string; // Reason for "Servicio Especial"
  price: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'warning' | 'info';
  line?: string;
  created_at: string;
}

export interface ActiveSelection {
  userId: string;
  routeId: string;
  selectedAt: string;
}
