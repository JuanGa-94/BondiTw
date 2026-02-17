
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, supabaseClient } from './services/supabase';
import { User, Route, Schedule, Announcement, UserRole, Company, PaymentMethod, Ad, DonationMethod, NewsItem } from './types';
import Layout from './components/Layout';
import CountdownTimer from './components/CountdownTimer';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const FULL_DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const ALL_DAYS_CODES = ['0', '1', '2', '3', '4', '5', '6', 'H'];

interface ExtendedSchedule extends Schedule {
  route: Route;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [donationMethods, setDonationMethods] = useState<DonationMethod[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [activeSelection, setActiveSelection] = useState<{ route: Route, schedule: Schedule } | null>(null);
  const [searchQuery, setSearchQuery] = useState({ origin: '', destination: '' });

  // Auth view state
  const [authView, setAuthView] = useState<'landing' | 'login' | 'register'>('landing');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // View states
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  // Consult day state (defaults to today's index)
  const [selectedDayIndex, setSelectedDayIndex] = useState<string>(new Date().getDay().toString());

  // --- Admin Flow States ---
  const [adminStep, setAdminStep] = useState<1 | 2>(1);
  const [newRouteData, setNewRouteData] = useState<Omit<Route, 'id'> | null>(null);
  const [newSchedules, setNewSchedules] = useState<Omit<Schedule, 'id' | 'route_id'>[]>([]);
  const [tempSchedule, setTempSchedule] = useState({ dep: '', arr: '', days: [] as string[] });

  // Modal for details
  const [pendingSchedule, setPendingSchedule] = useState<ExtendedSchedule | null>(null);

  // States for Editing/Adding (Advertisements, Donations, Routes)
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [editingDonation, setEditingDonation] = useState<DonationMethod | null>(null);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);

  // Currency Formatter
  const formatCurrency = useCallback((amount: number) => {
    const parts = amount.toFixed(2).split('.');
    // Use dot as thousands separator
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    // Combine with comma as decimal separator
    return `$ ${parts.join(',')}`;
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') { root.classList.add('dark'); root.classList.remove('light'); }
    else { root.classList.add('light'); root.classList.remove('dark'); }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Auth State Listener
  useEffect(() => {
    const syncUser = async () => {
      const u = await supabase.getCurrentUser();
      setUser(u);
    };

    syncUser();

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Ensure profile exists
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!profile) {
          // If this is the very first user, make them ADMIN
          const { count } = await supabaseClient
            .from('profiles')
            .select('*', { count: 'exact', head: true });

          const role = (count === 0) ? 'ADMIN' : 'USER';

          const { error } = await supabaseClient.from('profiles').insert([
            {
              id: session.user.id,
              email: session.user.email!,
              role: role,
              avatar_url: `https://picsum.photos/seed/${session.user.id}/100/100`
            }
          ]);
          if (error) console.error('Error creating profile:', error);
        }

        const u = await supabase.getCurrentUser();
        setUser(u);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const loadData = useCallback(async () => {
    const [r, s, c, p, a, d, n] = await Promise.all([
      supabase.getRoutes(),
      supabase.getSchedules(),
      supabase.getCompanies(),
      supabase.getPaymentMethods(),
      supabase.getAds(),
      supabase.getDonationMethods(),
      supabase.getNews()
    ]);
    setRoutes(r);
    setSchedules(s);
    setCompanies(c);
    setPaymentMethods(p);
    setAds(a);
    setDonationMethods(d);
    setNews(n);

    if (user) {
      const selection = await supabase.getActiveSelection(user.id);
      if (selection) {
        const route = r.find(x => x.id === selection.routeId);
        const schedule = s.find(x => x.id === selection.scheduleId);
        if (route && schedule) setActiveSelection({ route, schedule });
      }
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const searchDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      days.push({
        label: i === 0 ? 'Hoy' : DAY_NAMES[d.getDay()],
        index: d.getDay().toString(),
        full: FULL_DAY_NAMES[d.getDay()]
      });
    }
    days.push({ label: 'Feriado', index: 'H', full: 'Días Feriados' });
    return days;
  }, []);

  const uniqueOrigins = useMemo(() => Array.from(new Set(routes.map(r => r.origin))).sort(), [routes]);

  const availableDestinations = useMemo(() => {
    if (!searchQuery.origin) return [];
    return Array.from(new Set(routes.filter(r => r.origin === searchQuery.origin).map(r => r.destination))).sort();
  }, [routes, searchQuery.origin]);

  const filteredSchedules = useMemo(() => {
    const results: ExtendedSchedule[] = [];
    schedules.forEach(s => {
      const route = routes.find(r => r.id === s.route_id);
      if (route) {
        const matchOrigin = searchQuery.origin ? route.origin === searchQuery.origin : true;
        const matchDest = searchQuery.destination ? route.destination === searchQuery.destination : true;
        const matchDay = s.operating_days.includes(selectedDayIndex);
        if (matchOrigin && matchDest && matchDay) {
          results.push({ ...s, route });
        }
      }
    });
    return results.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
  }, [routes, schedules, searchQuery, selectedDayIndex]);

  const activeAds = useMemo(() => {
    const now = new Date();
    return ads.filter(ad => ad.active && new Date(ad.start_date) <= now && new Date(ad.end_date) >= now);
  }, [ads]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;

    try {
      if (authView === 'login') {
        const u = await supabase.loginWithPassword(authEmail, authPassword);
        if (u) setUser(u);
      } else {
        await supabase.registerWithPassword(authEmail, authPassword);
        alert('Confirma tu correo para completar el registro.');
        setAuthView('login');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.logout();
    setUser(null);
    setActiveSelection(null);
    setSelectedAd(null);
    setActiveTab('home');
    setSearchQuery({ origin: '', destination: '' });
    setAuthView('landing');
    setAuthEmail('');
    setAuthPassword('');
  };

  const handleConfirmSelection = async () => {
    if (!user || !pendingSchedule) return;
    await supabase.setActiveSelection(user.id, pendingSchedule.route.id, pendingSchedule.id);
    setActiveSelection({ route: pendingSchedule.route, schedule: pendingSchedule });
    setPendingSchedule(null);
    setActiveTab('home');
  };

  const handleCancelSelection = async () => {
    if (!user) return;
    await supabase.clearSelection(user.id);
    setActiveSelection(null);
  };

  const handleBoardedBus = async () => {
    if (!user) return;
    await supabase.clearSelection(user.id);
    setActiveSelection(null);
    alert('¡Excelente viaje! El seguimiento ha finalizado.');
  };

  const startRouteStep2 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const routeData: Omit<Route, 'id'> = {
      origin: fd.get('origin') as string,
      destination: fd.get('destination') as string,
      company: fd.get('company') as string,
      route_name: fd.get('route_name') as string,
      line: fd.get('line') as string,
      show_line: fd.get('show_line') === 'on',
      price: parseFloat(fd.get('price') as string),
      payment_methods: fd.getAll('payments') as string[],
      is_special: fd.get('is_special') === 'on',
      special_reason: fd.get('special_reason') as string || ''
    };
    setNewRouteData(routeData);
    setAdminStep(2);
  };

  const addScheduleToDraft = () => {
    if (!tempSchedule.dep || !tempSchedule.arr || tempSchedule.days.length === 0) return;
    setNewSchedules([...newSchedules, {
      departure_time: tempSchedule.dep,
      arrival_time: tempSchedule.arr,
      operating_days: tempSchedule.days
    }]);
    setTempSchedule({ dep: '', arr: '', days: [] });
  };

  const finalizeRoute = async () => {
    if (!newRouteData || newSchedules.length === 0) return;
    const route = await supabase.addRoute(newRouteData);
    for (const s of newSchedules) {
      await supabase.addSchedule({ ...s, route_id: route.id });
    }
    setAdminStep(1);
    setNewRouteData(null);
    setNewSchedules([]);
    loadData();
  };

  const handleAddAd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await supabase.addAd({
      title: fd.get('title') as string,
      description: fd.get('description') as string,
      image_url: fd.get('image_url') as string,
      external_url: fd.get('external_url') as string,
      start_date: fd.get('start_date') as string,
      end_date: fd.get('end_date') as string,
      active: true
    });
    loadData();
    e.currentTarget.reset();
  };

  const handleAddNews = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const msg = fd.get('message') as string;
    if (!msg) return;
    await supabase.addNews(msg);
    loadData();
    e.currentTarget.reset();
  };

  const handleAddDonationMethod = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await supabase.addDonationMethod({
      name: fd.get('name') as string,
      url: fd.get('url') as string,
      icon: fd.get('icon') as string,
      description: fd.get('description') as string
    });
    loadData();
    e.currentTarget.reset();
  };

  const handleAddCompanyAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;
    if (!name) return;
    await supabase.addCompany(name);
    loadData();
    e.currentTarget.reset();
  };

  const handleAddPaymentMethodAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;
    if (!name) return;
    await supabase.addPaymentMethod(name);
    loadData();
    e.currentTarget.reset();
  };

  const handleUpdateRoute = async (id: string, data: Partial<Route>) => {
    await supabase.updateRoute(id, data);
    setEditingRoute(null);
    loadData();
  };

  const handleUpdateSchedule = async (id: string, data: Partial<Schedule>) => {
    await supabase.updateSchedule(id, data);
    setEditingSchedule(null);
    loadData();
  };

  const handleDeleteScheduleAdmin = async (id: string) => {
    if (confirm('¿Eliminar este horario?')) {
      await supabase.deleteSchedule(id);
      loadData();
    }
  };

  const handlePresetDays = (type: 'lv' | 'fs' | 'all', setter: (days: string[]) => void) => {
    if (type === 'lv') setter(['1', '2', '3', '4', '5']);
    if (type === 'fs') setter(['0', '6']);
    if (type === 'all') setter(['0', '1', '2', '3', '4', '5', '6', 'H']);
  };

  const DayPicker = ({ selectedDays, onChange }: { selectedDays: string[], onChange: (days: string[]) => void }) => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ALL_DAYS_CODES.map(day => (
          <button
            key={day}
            type="button"
            onClick={() => {
              const newDays = selectedDays.includes(day)
                ? selectedDays.filter(d => d !== day)
                : [...selectedDays, day];
              onChange(newDays);
            }}
            className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all border ${selectedDays.includes(day)
              ? 'bg-primary border-primary text-white'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary'
              }`}
          >
            {day === 'H' ? 'FER' : DAY_NAMES[parseInt(day)]}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => handlePresetDays('lv', onChange)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black hover:bg-slate-200 transition-all">LUN A VIE</button>
        <button type="button" onClick={() => handlePresetDays('fs', onChange)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black hover:bg-slate-200 transition-all">FIN DE SEM</button>
        <button type="button" onClick={() => handlePresetDays('all', onChange)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black hover:bg-slate-200 transition-all">TODOS</button>
      </div>
    </div>
  );

  if (selectedAd && user) {
    return (
      <Layout user={user} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme}>
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in zoom-in-95 duration-500">
          <button onClick={() => setSelectedAd(null)} className="flex items-center gap-2 text-primary font-bold hover:translate-x-[-4px] transition-all">
            <span className="material-symbols-outlined">arrow_back</span>
            Volver a Inicio
          </button>

          <div className="bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 transition-colors">
            <img src={selectedAd.image_url} className="w-full h-[400px] object-cover" alt={selectedAd.title} />
            <div className="p-10 space-y-8">
              <div className="space-y-2">
                <h1 className="text-4xl font-black dark:text-white transition-colors">{selectedAd.title}</h1>
                <p className="text-primary font-bold uppercase tracking-widest text-xs">Promoción Exclusiva PróximoBus</p>
              </div>

              <div className="prose dark:prose-invert max-w-none text-slate-500 dark:text-slate-400 space-y-4 font-medium leading-relaxed transition-colors">
                <p>{selectedAd.description}</p>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
              </div>

              <div className="pt-6">
                <a
                  href={selectedAd.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-10 py-5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                  VISITAR SITIO WEB
                  <span className="material-symbols-outlined">open_in_new</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background-light dark:bg-background-dark transition-colors">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-10 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-500 transition-colors">
          <div className="flex flex-col items-center mb-10">
            <div className="bg-primary p-4 rounded-2xl text-white mb-6 shadow-xl shadow-primary/30">
              <span className="material-symbols-outlined text-4xl">directions_bus</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight dark:text-white mb-2 transition-colors">PróximoBus</h1>
            <p className="text-slate-400 font-medium transition-colors">Gestiona tus trayectos interurbanos</p>
          </div>

          {authView === 'landing' ? (
            <div className="flex flex-col gap-3">
              <button onClick={() => setAuthView('login')} className="w-full py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">Iniciar Sesión</button>
              <button onClick={() => setAuthView('register')} className="w-full py-4 bg-white dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all">Crear Cuenta</button>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                    placeholder="ejemplo@email.com"
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white font-bold transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Contraseña</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white font-bold transition-colors"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button type="submit" className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                  {authView === 'login' ? 'INICIAR SESIÓN' : 'REGISTRARSE'}
                </button>
                <button type="button" onClick={() => setAuthView('landing')} className="w-full py-2 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors">Volver</button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <Layout user={user} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme}>

      {/* Modal Selection Detail */}
      {pendingSchedule && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-500 transition-colors">
            <div className="p-8 space-y-8">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined text-lg">business</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">{pendingSchedule.route.company}</span>
                  </div>
                  <h3 className="text-2xl font-black dark:text-white transition-colors">{pendingSchedule.route.route_name}</h3>
                </div>
                <button onClick={() => setPendingSchedule(null)} className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"><span className="material-symbols-outlined">close</span></button>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 transition-colors">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors">Salida</p>
                  <p className="text-2xl font-black text-primary">{pendingSchedule.departure_time}</p>
                </div>
                <span className="material-symbols-outlined text-primary/30">east</span>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors">Arribo</p>
                  <p className="text-2xl font-black text-primary/60">{pendingSchedule.arrival_time}</p>
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl transition-colors">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors">Tarifa</p>
                  <p className="text-xl font-black dark:text-white transition-colors">{formatCurrency(pendingSchedule.route.price)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors">Métodos</p>
                  <div className="flex gap-1">
                    {pendingSchedule.route.payment_methods.slice(0, 2).map(m => (
                      <span key={m} className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-bold rounded-full uppercase">{m}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setPendingSchedule(null)} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all">Cancelar</button>
                <button onClick={handleConfirmSelection} className="flex-[2] py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">check_circle</span>
                  CONFIRMAR VIAJE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HOME TAB */}
      {activeTab === 'home' && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

          {/* Active Countdown - Always at the top if present */}
          {activeSelection && (
            <div className="space-y-6 animate-in slide-in-from-top-6 duration-700">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest w-fit">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Próxima Salida Rastreada
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-8 transition-colors">
                <div className="flex justify-between items-center mb-10">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors">Ruta</p>
                    <h3 className="text-2xl font-black dark:text-white transition-colors">{activeSelection.route.origin} → {activeSelection.route.destination}</h3>
                    <p className="text-slate-500 font-medium transition-colors">{activeSelection.route.company} • {activeSelection.route.route_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors">Salida</p>
                    <p className="text-3xl font-black text-primary tabular-nums">{activeSelection.schedule.departure_time}</p>
                  </div>
                </div>

                <CountdownTimer departureTime={activeSelection.schedule.departure_time} />

                <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button onClick={handleCancelSelection} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">cancel</span>
                    CANCELAR SEGUIMIENTO
                  </button>
                  <button onClick={handleBoardedBus} className="py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined">directions_bus</span>
                    YA TOMÉ EL AUTOBÚS
                  </button>
                </div>
              </div>
            </div>
          )}

          <section className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight dark:text-white transition-colors">Planifica tu próximo viaje</h1>
            <p className="text-slate-500 text-lg font-medium transition-colors">Consulta horarios y rutas interurbanas en tiempo real.</p>
          </section>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl shadow-primary/5 border border-slate-100 dark:border-slate-800 transition-colors">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-end gap-6">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider px-1 transition-colors">Origen</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary z-10 pointer-events-none">location_on</span>
                  <select
                    className="w-full pl-12 pr-10 py-5 rounded-2xl border-none bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white appearance-none cursor-pointer font-bold transition-colors"
                    value={searchQuery.origin}
                    onChange={(e) => setSearchQuery({ origin: e.target.value, destination: '' })}
                  >
                    <option value="">Selecciona origen</option>
                    {uniqueOrigins.map(origin => (<option key={origin} value={origin}>{origin}</option>))}
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors">expand_more</span>
                </div>
              </div>
              <div className="flex justify-center pb-2">
                <div className="bg-slate-100 dark:bg-slate-800 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm text-slate-400">
                  <span className="material-symbols-outlined rotate-90 md:rotate-0">swap_horiz</span>
                </div>
              </div>
              <div className="space-y-3">
                <label className={`text-xs font-black uppercase tracking-wider px-1 transition-colors ${!searchQuery.origin ? 'text-slate-300' : 'text-slate-500'}`}>Destino</label>
                <div className="relative">
                  <span className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none transition-colors ${!searchQuery.origin ? 'text-slate-300' : 'text-primary'}`}>flag</span>
                  <select
                    disabled={!searchQuery.origin}
                    className={`w-full pl-12 pr-10 py-5 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none transition-all appearance-none font-bold transition-colors ${!searchQuery.origin ? 'bg-slate-50/50 dark:bg-slate-900/50 text-slate-300 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800 dark:text-white cursor-pointer'}`}
                    value={searchQuery.destination}
                    onChange={(e) => setSearchQuery({ ...searchQuery, destination: e.target.value })}
                  >
                    <option value="">Selecciona destino</option>
                    {availableDestinations.map(dest => (<option key={dest} value={dest}>{dest}</option>))}
                  </select>
                  <span className={`material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${!searchQuery.origin ? 'text-slate-200' : 'text-slate-400'}`}>expand_more</span>
                </div>
              </div>
            </div>
            <div className="mt-8">
              <button
                onClick={() => setActiveTab('search')}
                disabled={!searchQuery.origin || !searchQuery.destination}
                className="w-full bg-primary text-white font-black py-5 rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-50 disabled:shadow-none hover:scale-[1.02] active:scale-98"
              >
                <span className="material-symbols-outlined">search</span>
                BUSCAR HORARIOS DISPONIBLES
              </button>
            </div>
          </div>

          {/* Novedades Section */}
          {news.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <span className="material-symbols-outlined text-primary text-xl">notifications_active</span>
                <h3 className="text-sm font-black dark:text-white uppercase tracking-widest transition-colors">Novedades</h3>
              </div>
              <div className="flex flex-col gap-3">
                {news.map(n => (
                  <div key={n.id} className="bg-alert-yellow/40 dark:bg-yellow-900/20 border-l-4 border-primary p-4 rounded-r-2xl shadow-sm transition-colors">
                    <p className="text-sm font-semibold dark:text-slate-200 transition-colors">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Publicidad Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-black dark:text-white transition-colors">Promociones para tu viaje</h3>
              <span className="material-symbols-outlined text-primary">campaign</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeAds.map(ad => (
                <div
                  key={ad.id}
                  onClick={() => setSelectedAd(ad)}
                  className="group bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-lg hover:shadow-2xl transition-all cursor-pointer transition-colors"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img src={ad.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={ad.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-4 left-6">
                      <p className="text-white font-black text-xl">{ad.title}</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium line-clamp-2 transition-colors">{ad.description}</p>
                    <div className="mt-4 flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                      Saber más
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEARCH TAB */}
      {activeTab === 'search' && (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-black dark:text-white transition-colors">
              {!searchQuery.origin ? '1. Ciudad de Origen' : !searchQuery.destination ? '2. Ciudad de Destino' : '3. Horarios Disponibles'}
            </h2>
            <div className="flex items-center gap-2">
              <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${searchQuery.origin ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-800'}`}></div>
              <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${searchQuery.destination ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-800'}`}></div>
              <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${searchQuery.origin && searchQuery.destination ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-800'}`}></div>
            </div>
          </div>

          {!searchQuery.origin && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniqueOrigins.map(city => (
                <button key={city} onClick={() => setSearchQuery({ origin: city, destination: '' })} className="flex items-center gap-6 p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all group text-left transition-colors">
                  <div className="size-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary text-slate-400 group-hover:text-white transition-all">
                    <span className="material-symbols-outlined text-3xl">location_city</span>
                  </div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 transition-colors">Disponible</p><p className="text-xl font-black dark:text-white group-hover:text-primary transition-colors">{city}</p></div>
                </button>
              ))}
            </div>
          )}

          {searchQuery.origin && !searchQuery.destination && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableDestinations.map(city => (
                <button key={city} onClick={() => setSearchQuery({ ...searchQuery, destination: city })} className="flex items-center gap-6 p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all group text-left transition-colors">
                  <div className="size-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary text-slate-400 group-hover:text-white transition-all">
                    <span className="material-symbols-outlined text-3xl">flag</span>
                  </div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 transition-colors">Hacia</p><p className="text-xl font-black dark:text-white group-hover:text-primary transition-colors">{city}</p></div>
                </button>
              ))}
            </div>
          )}

          {searchQuery.origin && searchQuery.destination && (
            <div className="space-y-8">
              <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 flex items-center justify-between transition-colors">
                <h3 className="text-2xl font-black dark:text-white transition-colors">{searchQuery.origin} → {searchQuery.destination}</h3>
                <button onClick={() => setSearchQuery({ origin: '', destination: '' })} className="px-6 py-3 bg-white dark:bg-slate-800 rounded-xl font-bold text-xs shadow-sm transition-colors">EDITAR</button>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                {searchDays.map(d => (
                  <button key={d.index} onClick={() => setSelectedDayIndex(d.index)} className={`shrink-0 px-8 py-4 rounded-full text-xs font-black border transition-all ${selectedDayIndex === d.index ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-100 text-slate-500'}`}>{d.label}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-4">
                {filteredSchedules.map(item => (
                  <div key={item.id} onClick={() => setPendingSchedule(item)} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:shadow-2xl transition-all cursor-pointer transition-colors">
                    <div className="flex items-center gap-8">
                      <div className="text-5xl font-black text-primary tabular-nums">{item.departure_time}</div>
                      <div>
                        <p className="text-xl font-black dark:text-white transition-colors">{item.route.route_name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase transition-colors">{item.route.company}</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-4xl text-slate-200 group-hover:text-primary transition-all">chevron_right</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TIPS / DONATIONS TAB */}
      {activeTab === 'tips' && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          <div className="flex flex-col gap-2 max-w-2xl">
            <h2 className="text-3xl font-black dark:text-white transition-colors">Colaboraciones y Tips</h2>
            <p className="text-slate-500 text-lg font-medium transition-colors">PróximoBus es un proyecto gratuito e independiente. Tu ayuda nos permite seguir mejorando el servicio para todos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl space-y-8 flex flex-col items-center text-center transition-colors">
              <div className="bg-primary/10 size-24 rounded-full flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-5xl">volunteer_activism</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black dark:text-white transition-colors">Apoya el proyecto</h3>
                <p className="text-slate-500 font-medium transition-colors">Mantener la infraestructura de tiempo real y el panel de administración tiene costes. Cualquier aporte es bienvenido.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest px-2 transition-colors">Canales de Colaboración</h4>
              {donationMethods.map(method => (
                <a
                  key={method.id}
                  href={method.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-6 p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:border-primary/30 hover:shadow-xl transition-all transition-colors"
                >
                  <div className="size-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <span className="material-symbols-outlined text-3xl">{method.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-black dark:text-white transition-colors">{method.name}</p>
                    <p className="text-xs text-slate-500 font-medium line-clamp-1 transition-colors">{method.description}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-200 group-hover:text-primary transition-all">arrow_outward</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADMIN TAB */}
      {activeTab === 'admin' && (
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-black dark:text-white transition-colors">Panel de Control</h2>
            <p className="text-slate-500 font-medium transition-colors">Gestión estratégica del ecosistema PróximoBus.</p>
          </div>

          {/* 1. News (Novedades) Management */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden p-10 space-y-8 transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black dark:text-white transition-colors">Novedades para Usuarios</h3>
              <span className="material-symbols-outlined text-primary text-3xl">notifications</span>
            </div>

            <form onSubmit={handleAddNews} className="space-y-4 bg-slate-50 dark:bg-slate-800/30 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 transition-colors">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1 transition-colors">Nuevo Mensaje</label>
                <input name="message" required placeholder="Ej: Nueva funcionalidad de seguimiento lanzada..." className="w-full p-4 rounded-xl border-none outline-none dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary transition-all transition-colors" />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="px-10 py-4 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">PUBLICAR NOVEDAD</button>
              </div>
            </form>

            <div className="space-y-3">
              {news.map(n => (
                <div key={n.id} className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors">
                  <p className="text-sm font-medium dark:text-white line-clamp-2 transition-colors">{n.message}</p>
                  <button onClick={() => { if (confirm('¿Eliminar novedad?')) supabase.deleteNews(n.id).then(loadData); }} className="size-8 rounded-full text-slate-300 hover:text-red-500 transition-all shrink-0"><span className="material-symbols-outlined">delete</span></button>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Route Configurator */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden transition-colors">
            <div className="p-10 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between transition-colors">
              <div>
                <h3 className="text-2xl font-black dark:text-white transition-colors">Configurador de Rutas</h3>
                <p className="text-sm text-slate-400 mt-1 font-medium transition-colors">Paso {adminStep} de 2: {adminStep === 1 ? 'Definición de Ruta' : 'Planificación de Horarios'}</p>
              </div>
              <div className="flex gap-2">
                <div className={`h-2 w-12 rounded-full transition-all duration-500 ${adminStep === 1 ? 'bg-primary' : 'bg-primary/20'}`}></div>
                <div className={`h-2 w-12 rounded-full transition-all duration-500 ${adminStep === 2 ? 'bg-primary' : 'bg-primary/20'}`}></div>
              </div>
            </div>

            {adminStep === 1 ? (
              <form onSubmit={startRouteStep2} className="p-10 space-y-10 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1 transition-colors">Empresa Operadora</label>
                    <select name="company" required className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white appearance-none cursor-pointer transition-colors">
                      {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1 transition-colors">Nombre del Servicio</label>
                    <input name="route_name" required placeholder="Ej: Corredor Express Norte" className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white transition-colors" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1 transition-colors">Ciudad Origen</label>
                    <input name="origin" required placeholder="Punto de inicio" className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white transition-colors" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1 transition-colors">Ciudad Destino</label>
                    <input name="destination" required placeholder="Punto final" className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white transition-colors" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1 transition-colors">Precio Unitario ($)</label>
                    <input name="price" type="number" step="0.01" required placeholder="0,00" className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white transition-colors" />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1 transition-colors">Métodos de Pago Autorizados</label>
                  <div className="flex flex-wrap gap-4">
                    {paymentMethods.map(pm => (
                      <label key={pm.id} className="flex items-center gap-3 cursor-pointer bg-slate-50 dark:bg-slate-800 px-6 py-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all group transition-colors">
                        <input type="checkbox" name="payments" value={pm.name} defaultChecked className="size-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer" />
                        <span className="text-sm font-bold dark:text-white group-hover:text-primary transition-colors">{pm.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <button type="submit" className="px-12 py-5 bg-primary text-white font-black rounded-2xl shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                    SIGUIENTE CONFIGURACIÓN
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-10 space-y-10 animate-in slide-in-from-right-10 duration-500">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6 transition-colors">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Resumen de Ruta</p>
                    <h4 className="text-2xl font-black dark:text-white transition-colors">{newRouteData?.origin} <span className="text-primary">→</span> {newRouteData?.destination}</h4>
                  </div>
                  <button onClick={() => setAdminStep(1)} className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-500 hover:text-primary transition-all flex items-center gap-2 transition-colors">
                    <span className="material-symbols-outlined text-sm">edit</span>
                    MODIFICAR DATOS
                  </button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/30 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-8 transition-colors">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1 transition-colors">Hora Salida</label>
                      <input type="time" value={tempSchedule.dep} onChange={e => setTempSchedule({ ...tempSchedule, dep: e.target.value })} className="w-full p-4 rounded-xl border-none outline-none dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary transition-all transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1 transition-colors">Hora Llegada</label>
                      <input type="time" value={tempSchedule.arr} onChange={e => setTempSchedule({ ...tempSchedule, arr: e.target.value })} className="w-full p-4 rounded-xl border-none outline-none dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary transition-all transition-colors" />
                    </div>
                    <div className="lg:col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Días de Operación</label>
                      <DayPicker selectedDays={tempSchedule.days} onChange={(days) => setTempSchedule({ ...tempSchedule, days })} />
                    </div>
                    <div className="lg:col-span-2 flex items-center justify-end h-[52px]">
                      <button
                        type="button"
                        onClick={addScheduleToDraft}
                        className="w-full lg:w-auto px-8 h-full bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/10"
                      >
                        <span className="material-symbols-outlined text-xl">add_box</span>
                        AÑADIR HORA
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <button onClick={() => { setAdminStep(1); setNewSchedules([]); }} className="px-8 py-4 font-bold text-slate-400 transition-colors">Cancelar</button>
                  <button onClick={finalizeRoute} disabled={newSchedules.length === 0} className="px-10 py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 disabled:opacity-50">GUARDAR RUTA Y HORARIOS</button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Active Inventory View */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden transition-colors">
            <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between transition-colors">
              <h3 className="text-2xl font-black dark:text-white transition-colors">Inventario de Rutas</h3>
              <span className="px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest">{routes.length} Rutas Activas</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 transition-colors">
                    <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Trayecto / Recorrido</th>
                    <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Empresa</th>
                    <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Frecuencias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {routes.map(r => {
                    const routeSchedules = schedules.filter(s => s.route_id === r.id);
                    const isExpanded = editingRouteId === r.id;

                    return (
                      <React.Fragment key={r.id}>
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                          <td className="px-10 py-6">
                            <p className="font-black text-lg dark:text-white transition-colors">{r.origin} → {r.destination}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors">{r.route_name}</p>
                          </td>
                          <td className="px-10 py-6">
                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md text-[10px] font-black uppercase transition-colors">{r.company}</span>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingRoute(r)}
                                className="size-10 rounded-full text-slate-300 hover:text-primary hover:bg-primary/10 transition-all inline-flex items-center justify-center"
                              >
                                <span className="material-symbols-outlined">edit</span>
                              </button>
                              <button
                                onClick={() => setEditingRouteId(isExpanded ? null : r.id)}
                                className={`size-10 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-primary text-white' : 'text-slate-300 hover:text-primary hover:bg-primary/10'}`}
                              >
                                <span className="material-symbols-outlined">schedule</span>
                              </button>
                              <button
                                onClick={() => { if (confirm('¿Estás seguro de eliminar esta ruta y todos sus horarios?')) supabase.deleteRoute(r.id).then(loadData); }}
                                className="size-10 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all inline-flex items-center justify-center"
                              >
                                <span className="material-symbols-outlined">delete_sweep</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={3} className="px-10 py-8 bg-slate-50/50 dark:bg-slate-800/20 transition-colors">
                              <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-black uppercase text-primary tracking-widest">Gestión de Horarios para esta ruta</p>
                                  <button
                                    onClick={() => setEditingSchedule({ id: '', route_id: r.id, departure_time: '00:00', arrival_time: '00:00', operating_days: ['1', '2', '3', '4', '5'] })}
                                    className="px-4 py-2 bg-primary/10 text-primary text-[10px] font-black rounded-lg hover:bg-primary hover:text-white transition-all flex items-center gap-2"
                                  >
                                    <span className="material-symbols-outlined text-sm">add</span> AÑADIR NUEVA FRECUENCIA
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {routeSchedules.map(s => (
                                    <div key={s.id} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group transition-colors">
                                      <div className="flex items-center gap-6">
                                        <div className="text-2xl font-black text-primary tabular-nums">{s.departure_time}</div>
                                      </div>
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingSchedule(s)} className="p-2 text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined text-sm">edit</span></button>
                                        <button onClick={() => handleDeleteScheduleAdmin(s.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-sm">delete</span></button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Payment Methods Admin */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden p-10 space-y-8 transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black dark:text-white transition-colors">Gestión de Métodos de Pago</h3>
              <span className="material-symbols-outlined text-primary text-3xl">payments</span>
            </div>

            <form onSubmit={handleAddPaymentMethodAdmin} className="space-y-4 bg-slate-50 dark:bg-slate-800/30 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 transition-colors">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1 transition-colors">Nuevo Método de Pago</label>
                <input name="name" required placeholder="Ej: Google Pay" className="w-full p-4 rounded-xl border-none outline-none dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary transition-all transition-colors" />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="px-10 py-4 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">AÑADIR MÉTODO</button>
              </div>
            </form>

            <div className="flex flex-wrap gap-2">
              {paymentMethods.map(pm => (
                <div key={pm.id} className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 transition-colors">
                  <span className="text-sm font-bold dark:text-white transition-colors">{pm.name}</span>
                  <button onClick={() => { if (confirm('¿Eliminar método?')) supabase.deletePaymentMethod(pm.id).then(loadData); }} className="size-6 rounded-full text-slate-300 hover:text-red-500 transition-all transition-colors"><span className="material-symbols-outlined text-sm">close</span></button>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Company Management */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden p-10 space-y-8 transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black dark:text-white transition-colors">Gestión de Empresas Operadoras</h3>
              <span className="material-symbols-outlined text-primary text-3xl">corporate_fare</span>
            </div>

            <form onSubmit={handleAddCompanyAdmin} className="space-y-4 bg-slate-50 dark:bg-slate-800/30 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 transition-colors">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1 transition-colors">Nombre de la Empresa</label>
                <input name="name" required placeholder="Ej: ALSA Interurbanos" className="w-full p-4 rounded-xl border-none outline-none dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary transition-all transition-colors" />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="px-10 py-4 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">AÑADIR EMPRESA</button>
              </div>
            </form>

            <div className="flex flex-wrap gap-2">
              {companies.map(c => (
                <div key={c.id} className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 transition-colors">
                  <span className="text-sm font-bold dark:text-white transition-colors">{c.name}</span>
                  <button onClick={() => { if (confirm('¿Eliminar empresa?')) supabase.deleteCompany(c.id).then(loadData); }} className="size-6 rounded-full text-slate-300 hover:text-red-500 transition-all transition-colors"><span className="material-symbols-outlined text-sm">close</span></button>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Ad Management */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden p-10 space-y-8 transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black dark:text-white transition-colors">Gestión de Publicidad</h3>
              <span className="material-symbols-outlined text-primary text-3xl">campaign</span>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const data = {
                  title: fd.get('title') as string,
                  description: fd.get('description') as string,
                  image_url: fd.get('image_url') as string,
                  external_url: fd.get('external_url') as string,
                  start_date: fd.get('start_date') as string,
                  end_date: fd.get('end_date') as string,
                  active: true
                };
                if (editingAd) {
                  await supabase.updateAd(editingAd.id, data);
                  setEditingAd(null);
                } else {
                  await supabase.addAd(data);
                }
                loadData();
                e.currentTarget.reset();
              }}
              key={editingAd?.id || 'new-ad'}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/30 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 transition-colors"
            >
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Título de la Campaña</label>
                <input name="title" required defaultValue={editingAd?.title} placeholder="Ej: Oferta Café Estación" className="w-full p-4 rounded-xl border-none outline-none dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary transition-all" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Descripción</label>
                <textarea name="description" required defaultValue={editingAd?.description} placeholder="Detalles de la promoción..." className="w-full p-4 rounded-xl border-none outline-none dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary transition-all min-h-[100px]" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">URL de la Imagen</label>
                <input name="image_url" required defaultValue={editingAd?.image_url} placeholder="https://..." className="w-full p-4 rounded-xl border-none outline-none dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Link Externo</label>
                <input name="external_url" required defaultValue={editingAd?.external_url} placeholder="https://..." className="w-full p-4 rounded-xl border-none outline-none dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1 transition-colors">Fecha Inicio</label>
                <input name="start_date" type="date" required defaultValue={editingAd?.start_date?.split('T')[0]} className="w-full p-4 rounded-xl border-none outline-none dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1 transition-colors">Fecha Fin</label>
                <input name="end_date" type="date" required defaultValue={editingAd?.end_date?.split('T')[0]} className="w-full p-4 rounded-xl border-none outline-none dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary transition-all" />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3">
                {editingAd && <button type="button" onClick={() => setEditingAd(null)} className="px-6 py-4 font-bold text-slate-400">CANCELAR</button>}
                <button type="submit" className="px-10 py-4 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                  {editingAd ? 'GUARDAR CAMBIOS' : 'PUBLICAR CAMPAÑA'}
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ads.map(ad => (
                <div key={ad.id} className="p-5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <img src={ad.image_url} className="size-12 rounded-lg object-cover" alt="" />
                    <div>
                      <p className="font-bold dark:text-white text-sm">{ad.title}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black">{ad.active ? 'Activa' : 'Inactiva'}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingAd(ad)} className="p-2 text-slate-300 hover:text-primary transition-colors"><span className="material-symbols-outlined text-sm">edit</span></button>
                    <button onClick={() => { if (confirm('¿Eliminar anuncio?')) supabase.deleteAd(ad.id).then(loadData); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-sm">delete</span></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 7. Donation Methods Config */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden p-10 space-y-8 transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black dark:text-white transition-colors">Formas de Colaboración</h3>
              <span className="material-symbols-outlined text-primary text-3xl">volunteer_activism</span>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const data = {
                  name: fd.get('name') as string,
                  url: fd.get('url') as string,
                  icon: fd.get('icon') as string,
                  description: fd.get('description') as string
                };
                if (editingDonation) {
                  await supabase.updateDonationMethod(editingDonation.id, data);
                  setEditingDonation(null);
                } else {
                  await supabase.addDonationMethod(data);
                }
                loadData();
                e.currentTarget.reset();
              }}
              key={editingDonation?.id || 'new-donation'}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/30 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 transition-colors"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Nombre del Método</label>
                <input name="name" required defaultValue={editingDonation?.name} placeholder="Ej: PayPal" className="w-full p-4 rounded-xl border-none outline-none dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Icono Material</label>
                <input name="icon" required defaultValue={editingDonation?.icon} placeholder="Ej: volunteer_activism" className="w-full p-4 rounded-xl border-none outline-none dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary transition-all" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">URL de destino</label>
                <input name="url" required defaultValue={editingDonation?.url} placeholder="https://..." className="w-full p-4 rounded-xl border-none outline-none dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary transition-all" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Breve descripción</label>
                <input name="description" required defaultValue={editingDonation?.description} placeholder="Para qué se usará el aporte..." className="w-full p-4 rounded-xl border-none outline-none dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary transition-all" />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3">
                {editingDonation && <button type="button" onClick={() => setEditingDonation(null)} className="px-6 py-4 font-bold text-slate-400">CANCELAR</button>}
                <button type="submit" className="px-10 py-4 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                  {editingDonation ? 'GUARDAR CAMBIOS' : 'AÑADIR MÉTODO'}
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {donationMethods.map(method => (
                <div key={method.id} className="p-5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary">{method.icon}</span>
                    <p className="font-bold dark:text-white text-sm">{method.name}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingDonation(method)} className="p-2 text-slate-300 hover:text-primary transition-colors"><span className="material-symbols-outlined text-sm">edit</span></button>
                    <button onClick={() => { if (confirm('¿Eliminar método?')) supabase.deleteDonationMethod(method.id).then(loadData); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-sm">delete</span></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {editingRoute && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 space-y-10 animate-in zoom-in duration-300 transition-colors">
            <div>
              <h3 className="text-2xl font-black dark:text-white transition-colors">Editar Ruta</h3>
              <p className="text-xs text-slate-400 font-medium">Modifica los detalles principales de la ruta.</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                handleUpdateRoute(editingRoute.id, {
                  origin: fd.get('origin') as string,
                  destination: fd.get('destination') as string,
                  company: fd.get('company') as string,
                  route_name: fd.get('route_name') as string,
                  price: parseFloat(fd.get('price') as string),
                  payment_methods: fd.getAll('payments') as string[]
                });
              }}
              className="space-y-10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Empresa</label>
                  <select name="company" defaultValue={editingRoute.company} required className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white appearance-none cursor-pointer">
                    {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Nombre Servicio</label>
                  <input name="route_name" defaultValue={editingRoute.route_name} required className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Origen</label>
                  <input name="origin" defaultValue={editingRoute.origin} required className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Destino</label>
                  <input name="destination" defaultValue={editingRoute.destination} required className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Precio ($)</label>
                  <input name="price" type="number" step="0.01" defaultValue={editingRoute.price} required className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white" />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Pagos Autorizados</label>
                <div className="flex flex-wrap gap-4">
                  {paymentMethods.map(pm => (
                    <label key={pm.id} className="flex items-center gap-3 cursor-pointer bg-slate-50 dark:bg-slate-800 px-6 py-4 rounded-2xl hover:bg-slate-100 transition-all border border-transparent hover:border-primary/20">
                      <input type="checkbox" name="payments" value={pm.name} defaultChecked={editingRoute.payment_methods.includes(pm.name)} className="size-5 rounded text-primary focus:ring-primary" />
                      <span className="text-sm font-bold dark:text-white">{pm.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setEditingRoute(null)} className="flex-1 py-5 font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all">Cancelar</button>
                <button type="submit" className="flex-[2] py-5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">GUARDAR CAMBIOS EN RUTA</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingSchedule && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 space-y-8 animate-in zoom-in duration-300 transition-colors">
            <div>
              <h3 className="text-2xl font-black dark:text-white transition-colors">
                {editingSchedule.id ? 'Editar Frecuencia' : 'Nueva Frecuencia'}
              </h3>
              <p className="text-xs text-slate-400 font-medium">Configura el horario y los días de operación.</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Hora Salida</label>
                <input
                  type="time"
                  value={editingSchedule.departure_time}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, departure_time: e.target.value })}
                  className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Hora Arribo</label>
                <input
                  type="time"
                  value={editingSchedule.arrival_time}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, arrival_time: e.target.value })}
                  className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Días de Operación</label>
              <DayPicker
                selectedDays={editingSchedule.operating_days}
                onChange={(days) => setEditingSchedule({ ...editingSchedule, operating_days: days })}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setEditingSchedule(null)}
                className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (editingSchedule.id) {
                    await handleUpdateSchedule(editingSchedule.id, editingSchedule);
                  } else {
                    await supabase.addSchedule(editingSchedule);
                    loadData();
                    setEditingSchedule(null);
                  }
                }}
                className="flex-[2] py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all"
              >
                {editingSchedule.id ? 'GUARDAR CAMBIOS' : 'CREAR FRECUENCIA'}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout >
  );
};

export default App;
