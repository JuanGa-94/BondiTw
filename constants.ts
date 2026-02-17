
import { Route, Announcement, UserRole, User, Ad, DonationMethod, NewsItem } from './types';

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

const ALL_DAYS = ['0', '1', '2', '3', '4', '5', '6'];

export const INITIAL_ROUTES: any[] = [
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
    show_line: true,
    platform: '4', 
    is_special: false, 
    price: 12.50,
    operating_days: ALL_DAYS
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
    show_line: true,
    platform: '12', 
    is_special: true, 
    price: 4.50,
    operating_days: ['1', '2', '3', '4', '5'] // L-V
  }
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a1',
    title: 'Demora en salida',
    content: 'Debido a obras en la Av. Principal, los autobuses de la línea 154 presentan retrasos de 15 minutos.',
    type: 'warning',
    line: 'Línea 154',
    created_at: new Date().toISOString()
  }
];

export const INITIAL_NEWS: NewsItem[] = [
  {
    id: 'n1',
    message: 'Nuevas paradas añadidas en el Corredor Sur para facilitar tus conexiones.',
    created_at: new Date().toISOString()
  },
  {
    id: 'n2',
    message: '¡PróximoBus ya disponible en modo oscuro para ahorrar batería en tus viajes!',
    created_at: new Date().toISOString()
  }
];

export const INITIAL_ADS: Ad[] = [
  {
    id: 'ad1',
    title: 'Café de Estación 2x1',
    description: 'Disfruta del mejor café mientras esperas tu bus.',
    image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80',
    external_url: 'https://google.com',
    start_date: '2023-01-01',
    end_date: '2026-12-31',
    active: true
  },
  {
    id: 'ad2',
    title: 'Seguro de Viaje Pro',
    description: 'Viaja tranquilo con nuestra cobertura total por solo 1€ al día.',
    image_url: 'https://images.unsplash.com/photo-1512413316925-fd4793431999?auto=format&fit=crop&w=800&q=80',
    external_url: 'https://google.com',
    start_date: '2023-01-01',
    end_date: '2026-12-31',
    active: true
  }
];

export const INITIAL_DONATION_METHODS: DonationMethod[] = [
  {
    id: 'd1',
    name: 'Buy Me a Coffee',
    url: 'https://buymeacoffee.com',
    icon: 'coffee',
    description: 'Ayúdanos a mantener los servidores con un cafecito.'
  },
  {
    id: 'd2',
    name: 'Crypto (BTC)',
    url: 'https://blockchain.com',
    icon: 'currency_bitcoin',
    description: 'Aceptamos donaciones en Bitcoin para el futuro del proyecto.'
  }
];
