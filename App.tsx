
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './services/supabase';
import { User, Route, Announcement, UserRole, ActiveSelection, Company, PaymentMethod } from './types';
import Layout from './components/Layout';
import CountdownTimer from './components/CountdownTimer';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [activeSelection, setActiveSelection] = useState<Route | null>(null);
  const [searchQuery, setSearchQuery] = useState({ origin: '', destination: '' });
  const [isLoginView, setIsLoginView] = useState(true);
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  // Admin form specific states
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [showLineField, setShowLineField] = useState(true);
  const [isSpecialService, setIsSpecialService] = useState(false);

  // Modal state
  const [pendingRoute, setPendingRoute] = useState<Route | null>(null);

  // Theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Load Data
  const loadData = useCallback(async () => {
    const [r, a, c, p] = await Promise.all([
      supabase.getRoutes(),
      supabase.getAnnouncements(),
      supabase.getCompanies(),
      supabase.getPaymentMethods()
    ]);
    setRoutes(r);
    setAnnouncements(a);
    setCompanies(c);
    setPaymentMethods(p);
    
    if (user) {
      const selection = await supabase.getActiveSelection(user.id);
      if (selection) {
        const route = r.find(x => x.id === selection.routeId);
        if (route) setActiveSelection(route);
      }
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived data for selection flow
  const uniqueOrigins = useMemo(() => {
    const origins = routes.map(r => r.origin);
    return Array.from(new Set(origins)).sort();
  }, [routes]);

  const availableDestinations = useMemo(() => {
    if (!searchQuery.origin) return [];
    const destinations = routes
      .filter(r => r.origin === searchQuery.origin)
      .map(r => r.destination);
    return Array.from(new Set(destinations)).sort();
  }, [routes, searchQuery.origin]);

  const filteredRoutes = useMemo(() => {
    return routes.filter(r => {
      const matchOrigin = searchQuery.origin ? r.origin === searchQuery.origin : true;
      const matchDest = searchQuery.destination ? r.destination === searchQuery.destination : true;
      return matchOrigin && matchDest;
    });
  }, [routes, searchQuery]);

  const handleLogin = async (isAdmin: boolean) => {
    const loggedUser = await supabase.login(isAdmin);
    setUser(loggedUser);
    loadData();
  };

  const handleLogout = async () => {
    await supabase.logout();
    setUser(null);
    setActiveSelection(null);
    setActiveTab('home');
    setSearchQuery({ origin: '', destination: '' });
  };

  const handleOpenRouteDetails = (route: Route) => {
    setPendingRoute(route);
  };

  const handleConfirmSelection = async () => {
    if (!user || !pendingRoute) return;
    await supabase.setActiveSelection(user.id, pendingRoute.id);
    setActiveSelection(pendingRoute);
    setPendingRoute(null);
    setActiveTab('home');
  };

  const handleCancelSelection = async () => {
    if (!user) return;
    await supabase.clearSelection(user.id);
    setActiveSelection(null);
  };

  const handleAddRoute = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newRoute = {
      origin: formData.get('origin') as string,
      destination: formData.get('destination') as string,
      line: formData.get('line') as string || '',
      show_line: showLineField,
      departure_time: formData.get('time') as string,
      arrival_time: formData.get('arrival_time') as string,
      company: formData.get('company') as string,
      route_name: formData.get('route_name') as string,
      payment_methods: selectedPayments,
      is_special: isSpecialService,
      special_reason: isSpecialService ? formData.get('special_reason') as string : '',
      price: parseFloat(formData.get('price') as string || '0')
    };
    await supabase.addRoute(newRoute);
    loadData();
    e.currentTarget.reset();
    setSelectedPayments([]);
    setIsSpecialService(false);
  };

  const handleDeleteRoute = async (id: string) => {
    await supabase.deleteRoute(id);
    loadData();
  };

  const handleAddCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = new FormData(e.currentTarget).get('name') as string;
    await supabase.addCompany(name);
    loadData();
    e.currentTarget.reset();
  };

  const handleAddPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = new FormData(e.currentTarget).get('name') as string;
    await supabase.addPaymentMethod(name);
    loadData();
    e.currentTarget.reset();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background-light dark:bg-background-dark bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background-light to-background-light dark:via-background-dark dark:to-background-dark">
        {/* Floating theme toggle for login view */}
        <button 
          onClick={toggleTheme}
          className="fixed top-6 right-6 size-12 rounded-full bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center text-primary transition-all hover:scale-110 active:scale-95"
        >
          <span className="material-symbols-outlined">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
        </button>

        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 p-8 md:p-10">
          <div className="flex flex-col items-center mb-10">
            <div className="bg-primary p-4 rounded-2xl text-white mb-6 shadow-xl shadow-primary/30">
              <span className="material-symbols-outlined text-4xl">directions_bus</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight dark:text-white mb-2">PróximoBus</h1>
            <p className="text-slate-400 font-medium">Gestiona tus trayectos interurbanos</p>
          </div>

          <div className="flex border-b border-slate-100 dark:border-slate-800 mb-8">
            <button onClick={() => setIsLoginView(true)} className={`flex-1 pb-4 text-sm font-bold transition-all ${isLoginView ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}>Iniciar Sesión</button>
            <button onClick={() => setIsLoginView(false)} className={`flex-1 pb-4 text-sm font-bold transition-all ${!isLoginView ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}>Registro</button>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <button onClick={() => handleLogin(false)} className="w-full flex items-center justify-center gap-3 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">Acceder como Usuario <span className="material-symbols-outlined">chevron_right</span></button>
              <button onClick={() => handleLogin(true)} className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold rounded-2xl hover:opacity-90 transition-all shadow-lg">Acceder como Administrador <span className="material-symbols-outlined">admin_panel_settings</span></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout user={user} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme}>
      {pendingRoute && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full md:slide-in-from-bottom-4 duration-500">
            <div className="p-8 space-y-8">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined text-lg">business</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">{pendingRoute.company}</span>
                  </div>
                  <h3 className="text-2xl font-black dark:text-white">{pendingRoute.route_name}</h3>
                  {pendingRoute.is_special && pendingRoute.special_reason && (
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 italic">★ {pendingRoute.special_reason}</p>
                  )}
                </div>
                <button onClick={() => setPendingRoute(null)} className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"><span className="material-symbols-outlined">close</span></button>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Salida</p>
                  <p className="text-2xl font-black text-primary">{pendingRoute.departure_time}</p>
                  <p className="text-sm font-bold dark:text-white truncate">{pendingRoute.origin}</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-primary/30">east</span>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Arribo</p>
                  <p className="text-2xl font-black text-primary/60">{pendingRoute.arrival_time}</p>
                  <p className="text-sm font-bold dark:text-white truncate">{pendingRoute.destination}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Métodos de Pago</p>
                  <div className="flex flex-wrap gap-2">
                    {pendingRoute.payment_methods.map(method => (
                      <span key={method} className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-tight">{method}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Precio Final</p>
                  <p className="text-3xl font-black dark:text-white">{pendingRoute.price.toFixed(2)}€</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setPendingRoute(null)} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all">Volver</button>
                <button onClick={handleConfirmSelection} className="flex-[2] py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"><span className="material-symbols-outlined">add_circle</span> SELECCIONAR</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'home' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeSelection ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest w-fit">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Seguimiento en Vivo Activo
              </div>
              <h2 className="text-4xl font-black tracking-tight dark:text-white">Tu viaje comienza pronto</h2>
              
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ruta Actual</p>
                    <h3 className="text-2xl font-bold dark:text-white flex items-center gap-3">
                      {activeSelection.origin} <span className="material-symbols-outlined text-primary">arrow_forward</span> {activeSelection.destination}
                    </h3>
                    <p className="text-slate-500 font-medium">{activeSelection.route_name} {activeSelection.show_line && `• Línea ${activeSelection.line}`} • Andén {activeSelection.platform || 'General'}</p>
                    {activeSelection.is_special && activeSelection.special_reason && (
                      <p className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg w-fit mt-2">{activeSelection.special_reason}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Programado</p>
                    <p className="text-3xl font-black text-primary">{activeSelection.departure_time}</p>
                  </div>
                </div>
                <CountdownTimer route={activeSelection} />
                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="flex items-center justify-center gap-2 h-14 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"><span className="material-symbols-outlined">check_circle</span> ESTOY A BORDO</button>
                  <button onClick={handleCancelSelection} className="flex items-center justify-center gap-2 h-14 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 transition-all"><span className="material-symbols-outlined">cancel</span> CANCELAR SEGUIMIENTO</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-10">
              <section className="space-y-2"><h1 className="text-4xl font-black tracking-tight dark:text-white">Planifica tu viaje</h1><p className="text-slate-500 text-lg font-medium">Consulta horarios y rutas interurbanas en tiempo real.</p></section>
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-800 transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-end gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Origen</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary z-10 pointer-events-none">location_on</span>
                      <select className="w-full pl-12 pr-10 py-4 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white appearance-none cursor-pointer" value={searchQuery.origin} onChange={(e) => setSearchQuery({ origin: e.target.value, destination: '' })}>
                        <option value="">Selecciona origen</option>
                        {uniqueOrigins.map(origin => (<option key={origin} value={origin}>{origin}</option>))}
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                    </div>
                  </div>
                  <div className="flex justify-center pb-2"><div className="bg-slate-100 dark:bg-slate-800 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm text-slate-400"><span className="material-symbols-outlined rotate-90 md:rotate-0">swap_horiz</span></div></div>
                  <div className="space-y-2">
                    <label className={`text-xs font-bold uppercase tracking-wider px-1 transition-colors ${!searchQuery.origin ? 'text-slate-300' : 'text-slate-500'}`}>Destino</label>
                    <div className="relative">
                      <span className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none transition-colors ${!searchQuery.origin ? 'text-slate-300' : 'text-primary'}`}>flag</span>
                      <select disabled={!searchQuery.origin} className={`w-full pl-12 pr-10 py-4 rounded-2xl border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all appearance-none ${!searchQuery.origin ? 'bg-slate-50/50 dark:bg-slate-900/50 text-slate-300 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800/50 dark:text-white cursor-pointer'}`} value={searchQuery.destination} onChange={(e) => setSearchQuery({...searchQuery, destination: e.target.value})}>
                        <option value="">Selecciona destino</option>
                        {availableDestinations.map(dest => (<option key={dest} value={dest}>{dest}</option>))}
                      </select>
                      <span className={`material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${!searchQuery.origin ? 'text-slate-200' : 'text-slate-400'}`}>expand_more</span>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex flex-col md:flex-row gap-4"><button onClick={() => setActiveTab('search')} className="flex-1 bg-primary text-white font-bold py-4 rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none"><span className="material-symbols-outlined">search</span> IR A BUSCAR HORARIOS</button></div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'search' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex flex-col gap-2"><h2 className="text-3xl font-black tracking-tight dark:text-white">Buscar Viaje</h2><div className="flex items-center gap-4 py-2"><div className={`flex items-center gap-2 ${searchQuery.origin ? 'text-primary' : 'text-slate-400'}`}><span className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${searchQuery.origin ? 'border-primary bg-primary text-white' : 'border-slate-300'}`}>1</span><span className="text-xs font-black uppercase tracking-widest">Origen</span></div><div className="h-0.5 w-8 bg-slate-200"></div><div className={`flex items-center gap-2 ${searchQuery.destination ? 'text-primary' : 'text-slate-400'}`}><span className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${searchQuery.destination ? 'border-primary bg-primary text-white' : 'border-slate-300'}`}>2</span><span className="text-xs font-black uppercase tracking-widest">Destino</span></div><div className="h-0.5 w-8 bg-slate-200"></div><div className={`flex items-center gap-2 ${searchQuery.origin && searchQuery.destination ? 'text-primary' : 'text-slate-400'}`}><span className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${searchQuery.origin && searchQuery.destination ? 'border-primary bg-primary text-white' : 'border-slate-300'}`}>3</span><span className="text-xs font-black uppercase tracking-widest">Horarios</span></div></div></div>
          {!searchQuery.origin ? (
            <div className="space-y-6">
              <h3 className="text-xl font-black dark:text-white">Selecciona Ciudad de Origen</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {uniqueOrigins.map(city => (
                  <button key={city} onClick={() => setSearchQuery({ origin: city, destination: '' })} className="flex flex-col items-center justify-center gap-3 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-primary hover:text-primary transition-all shadow-sm hover:shadow-xl group">
                    <div className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary/10 transition-colors"><span className="material-symbols-outlined">location_city</span></div>
                    <span className="font-bold text-sm text-center dark:text-white group-hover:text-primary transition-colors">{city}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : !searchQuery.destination ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between"><h3 className="text-xl font-black dark:text-white">Selecciona tu Destino</h3><button onClick={() => setSearchQuery({ origin: '', destination: '' })} className="text-xs font-bold text-slate-400 hover:text-primary transition-colors flex items-center gap-1"><span className="material-symbols-outlined text-sm">arrow_back</span> Cambiar Origen ({searchQuery.origin})</button></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {availableDestinations.map(city => (
                  <button key={city} onClick={() => setSearchQuery({ ...searchQuery, destination: city })} className="flex flex-col items-center justify-center gap-3 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-primary hover:text-primary transition-all shadow-sm hover:shadow-xl group">
                    <div className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary/10 transition-colors"><span className="material-symbols-outlined">flag</span></div>
                    <span className="font-bold text-sm text-center dark:text-white group-hover:text-primary transition-colors">{city}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex items-center justify-between bg-primary/5 dark:bg-primary/10 p-6 rounded-3xl border border-primary/10 transition-colors"><div className="flex items-center gap-4"><div className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center"><span className="material-symbols-outlined">directions_bus</span></div><div><p className="text-[10px] font-black uppercase tracking-widest text-primary">Ruta seleccionada</p><h4 className="font-black dark:text-white text-lg leading-none">{searchQuery.origin} <span className="text-primary mx-1">→</span> {searchQuery.destination}</h4></div></div><button onClick={() => setSearchQuery({ origin: '', destination: '' })} className="px-5 py-2.5 bg-white dark:bg-slate-800 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"><span className="material-symbols-outlined text-sm">edit</span> NUEVA BÚSQUEDA</button></div>
              <div className="grid grid-cols-1 gap-4">
                {filteredRoutes.length > 0 ? filteredRoutes.map(route => (
                  <div key={route.id} className={`group bg-white dark:bg-slate-900 p-6 rounded-3xl border ${route.is_special ? 'border-primary shadow-lg shadow-primary/5' : 'border-slate-100 dark:border-slate-800'} flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-xl transition-all cursor-pointer`} onClick={() => handleOpenRouteDetails(route)}>
                    <div className="flex items-center gap-6 w-full">
                      <div className={`size-16 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${route.is_special ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}><span className="material-symbols-outlined text-4xl">directions_bus</span></div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3"><span className="text-2xl font-black text-primary">{route.departure_time}</span>{route.is_special && <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Especial</span>}</div>
                        <p className="font-bold dark:text-white truncate max-w-[200px] sm:max-w-none">{route.route_name} {route.show_line && `• Línea ${route.line}`}</p>
                        {route.is_special && route.special_reason && <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 truncate max-w-[200px] sm:max-w-none">{route.special_reason}</p>}
                      </div>
                    </div>
                  </div>
                )) : null}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'admin' && user.role === UserRole.ADMIN && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          <div className="flex flex-col gap-2"><h2 className="text-3xl font-black tracking-tight dark:text-white">Panel de Administración</h2><p className="text-slate-500 font-medium">Configuración de flota, pagos y trayectos.</p></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden"><div className="p-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between"><h3 className="font-black dark:text-white">Empresas</h3><span className="material-symbols-outlined text-primary">business</span></div><div className="p-6 space-y-4"><form onSubmit={handleAddCompany} className="flex gap-2"><input name="name" required placeholder="Nombre de empresa..." className="flex-1 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none text-sm dark:text-white" /><button className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm">Añadir</button></form></div></div>
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden"><div className="p-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between"><h3 className="font-black dark:text-white">Métodos de Pago</h3><span className="material-symbols-outlined text-primary">payments</span></div><div className="p-6 space-y-4"><form onSubmit={handleAddPayment} className="flex gap-2"><input name="name" required placeholder="Nombre de método..." className="flex-1 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none text-sm dark:text-white" /><button className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm">Añadir</button></form></div></div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between"><div><h3 className="text-xl font-black dark:text-white">Nueva Ruta</h3><p className="text-slate-400 text-xs mt-1">Configura un nuevo trayecto en el sistema.</p></div><div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><span className="material-symbols-outlined">add_road</span></div></div>
            <form onSubmit={handleAddRoute} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-primary px-1">Empresa</label><select name="company" required className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white appearance-none"><option value="">Selecciona Empresa</option>{companies.map(c => (<option key={c.id} value={c.name}>{c.name}</option>))}</select></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-primary px-1">Ruta / Recorrido</label><input name="route_name" required placeholder="Ej: Corredor Norte Express" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white" /></div>
                <div className="space-y-2"><div className="flex items-center justify-between px-1"><label className="text-[10px] font-black uppercase tracking-widest text-primary">Línea</label><div className="flex items-center gap-2"><input type="checkbox" checked={showLineField} onChange={(e) => setShowLineField(e.target.checked)} className="size-3 rounded border-slate-200 text-primary" id="showLine" /><label htmlFor="showLine" className="text-[8px] font-bold text-slate-400">Mostrar</label></div></div><input name="line" disabled={!showLineField} placeholder="Ej: 422" className={`w-full px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white ${showLineField ? 'bg-slate-50 dark:bg-slate-800' : 'bg-slate-200 dark:bg-slate-900 opacity-50 cursor-not-allowed'}`} /></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-primary px-1">Ciudad Origen</label><input name="origin" required placeholder="Madrid" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-primary px-1">Ciudad Destino</label><input name="destination" required placeholder="Toledo" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-primary px-1">Precio (€)</label><input name="price" type="number" step="0.01" required placeholder="0.00" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-primary px-1">Salida</label><input name="time" type="time" required className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-primary px-1">Llegada Estimada</label><input name="arrival_time" type="time" required className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white" /></div>
                
                {/* Special Service Logic */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 pt-6">
                    <input type="checkbox" name="is_special" checked={isSpecialService} onChange={(e) => setIsSpecialService(e.target.checked)} id="special_adm" className="w-5 h-5 rounded border-slate-200 text-primary focus:ring-primary" />
                    <label htmlFor="special_adm" className="text-sm font-bold text-slate-600 dark:text-slate-300">Servicio Especial</label>
                  </div>
                  {isSpecialService && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <label className="text-[10px] font-black uppercase tracking-widest text-amber-600 px-1">Motivo o Evento</label>
                      <input name="special_reason" required={isSpecialService} placeholder="Ej: Evento Deportivo, Feriado..." className="w-full px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 outline-none transition-all dark:text-white text-sm" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary px-1">Métodos de Pago Aceptados</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {paymentMethods.map(pm => (
                    <button key={pm.id} type="button" onClick={() => setSelectedPayments(prev => prev.includes(pm.name) ? prev.filter(x => x !== pm.name) : [...prev, pm.name])} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-sm font-bold ${selectedPayments.includes(pm.name) ? 'bg-primary/10 border-primary text-primary' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-100'}`}><span className="material-symbols-outlined text-sm">{selectedPayments.includes(pm.name) ? 'check_circle' : 'circle'}</span>{pm.name}</button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-4"><button type="submit" className="px-12 py-5 bg-primary text-white font-black rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center gap-3"><span className="material-symbols-outlined">save</span> CREAR RUTA</button></div>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden transition-colors">
             <div className="p-8 border-b border-slate-50 dark:border-slate-800"><h3 className="text-xl font-black dark:text-white">Rutas Activas</h3></div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead><tr className="bg-slate-50 dark:bg-slate-800/50"><th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Ruta / Comercial</th><th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Empresa</th><th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Línea</th><th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th></tr></thead>
                 <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                   {routes.map(r => (
                     <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                       <td className="px-8 py-4"><p className="font-bold dark:text-white">{r.origin} → {r.destination}</p><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tighter">{r.route_name}</p>{r.is_special && <p className="text-[10px] text-amber-600 font-bold">{r.special_reason || 'Servicio Especial'}</p>}</td>
                       <td className="px-8 py-4 font-medium text-slate-500">{r.company}</td>
                       <td className="px-8 py-4 font-medium text-slate-500">{r.show_line ? r.line : '--'}</td>
                       <td className="px-8 py-4 text-right"><button onClick={() => handleDeleteRoute(r.id)} className="p-2 text-slate-400 hover:text-red-500 transition-all"><span className="material-symbols-outlined">delete</span></button></td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
