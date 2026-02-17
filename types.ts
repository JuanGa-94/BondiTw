
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
  company: string;
  line: string;
  show_line: boolean;
  route_name: string;     
  payment_methods: string[]; 
  is_special: boolean;
  special_reason?: string; 
  price: number;
}

export interface Schedule {
  id: string;
  route_id: string;
  departure_time: string; // HH:mm
  arrival_time: string;   // HH:mm
  operating_days: string[]; // ['0'..'6', 'H'] 0=Sun, H=Holiday
  platform?: string;
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  image_url: string;
  external_url: string;
  start_date: string;
  end_date: string;
  active: boolean;
}

export interface DonationMethod {
  id: string;
  name: string;
  url: string;
  icon: string;
  description: string;
}

export interface NewsItem {
  id: string;
  message: string;
  created_at: string;
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
  scheduleId: string;
  selectedAt: string;
}
