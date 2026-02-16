
import { Route, Announcement, UserRole, User } from './types';

export const MOCK_USER: User = {
  id: 'user-123',
  email: 'viajero@proximobus.es',
  role: UserRole.USER,
  avatar_url: 'https://picsum.photos/seed/user/100/100'
};

export const MOCK_ADMIN: User = {
  id: 'admin-456',
  email: 'admin@proximobus.es',
  role: UserRole.ADMIN,
  avatar_url: 'https://picsum.photos/seed/admin/100/100'
};

export const INITIAL_ROUTES: Route[] = [
  { 
    id: '1', 
    origin: 'Madrid', 
    destination: 'Toledo', 
    departure_time: '14:30', 
    arrival_time: '15:45',
    company: 'ALSA Interurbanos',
    route_name: 'Ruta Imperial',
    payment_methods: ['Efectivo', 'Tarjeta', 'Abono'],
    line: '422', 
    // Fix: Added missing show_line property
    show_line: true,
    platform: '4', 
    is_special: false, 
    price: 12.50 
  },
  { 
    id: '2', 
    origin: 'Madrid', 
    destination: 'Alcobendas', 
    departure_time: '08:30', 
    arrival_time: '09:05',
    company: 'Interbus',
    route_name: 'Corredor Norte',
    payment_methods: ['Tarjeta', 'Abono'],
    line: '154', 
    // Fix: Added missing show_line property
    show_line: true,
    platform: '12', 
    is_special: true, 
    price: 4.50 
  },
  { 
    id: '3', 
    origin: 'Plaza Castilla', 
    destination: 'Sanse', 
    departure_time: '18:15', 
    arrival_time: '18:45',
    company: 'Viaconti',
    route_name: 'Ruta 7 Express',
    payment_methods: ['Efectivo', 'Abono'],
    line: '171', 
    // Fix: Added missing show_line property
    show_line: true,
    platform: '2', 
    is_special: false, 
    price: 3.20 
  },
  { 
    id: '4', 
    origin: 'Terminal Central', 
    destination: 'North Plaza', 
    departure_time: '09:15', 
    arrival_time: '10:00',
    company: 'BusMadrid',
    route_name: 'Línea Circular',
    payment_methods: ['Efectivo', 'Tarjeta'],
    line: '402', 
    // Fix: Added missing show_line property
    show_line: true,
    platform: 'B1', 
    is_special: false, 
    price: 10.00 
  },
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a1',
    title: 'Demora en salida',
    content: 'Debido a obras en la Av. Principal, los autobuses de la línea 154 presentan retrasos de 15 minutos.',
    type: 'warning',
    line: 'Línea 154',
    created_at: new Date().toISOString()
  },
  {
    id: 'a2',
    title: 'Huelga de transportes',
    content: 'Se han convocado servicios mínimos para el día de mañana. Consulte los nuevos horarios provisionales.',
    type: 'warning',
    line: 'General',
    created_at: new Date().toISOString()
  }
];
