
import React from 'react';
import { User, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, activeTab, setActiveTab, onLogout }) => {
  if (!user) return <>{children}</>;

  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-0 md:pl-64">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 border-r border-surface-variant bg-white dark:bg-background-dark p-6 z-40 transition-colors">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-primary rounded-lg p-2 text-white flex items-center justify-center">
            <span className="material-symbols-outlined">directions_bus</span>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight dark:text-white">PróximoBus</h1>
            <p className="text-primary text-[10px] font-bold uppercase tracking-widest leading-none">Interurbanos</p>
          </div>
        </div>

        <nav className="space-y-2">
          <button 
            onClick={() => setActiveTab('home')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'home' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-primary/10 hover:text-primary'}`}
          >
            <span className="material-symbols-outlined">home</span>
            <span className="font-bold text-sm">Inicio</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('search')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'search' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-primary/10 hover:text-primary'}`}
          >
            <span className="material-symbols-outlined">search</span>
            <span className="font-bold text-sm">Buscar</span>
          </button>

          {user.role === UserRole.ADMIN && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'admin' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-primary/10 hover:text-primary'}`}
            >
              <span className="material-symbols-outlined">settings</span>
              <span className="font-bold text-sm">Administración</span>
            </button>
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 px-2 mb-4">
            <img src={user.avatar_url} className="w-10 h-10 rounded-full border-2 border-primary/20" alt="Avatar" />
            <div className="overflow-hidden">
              <p className="font-bold text-sm truncate dark:text-white">{user.email}</p>
              <p className="text-slate-400 text-xs">{user.role}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-bold text-sm">
            <span className="material-symbols-outlined">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 z-50">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">directions_bus</span>
          <span className="font-black text-lg tracking-tight dark:text-white">PróximoBus</span>
        </div>
        <div className="flex gap-4">
          <button className="p-2 text-slate-400"><span className="material-symbols-outlined">notifications</span></button>
          <img src={user.avatar_url} className="w-8 h-8 rounded-full" alt="Avatar" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex justify-around py-3 px-6 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-primary' : 'text-slate-400'}`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${activeTab === 'home' ? 1 : 0}` }}>home</span>
          <span className="text-[10px] font-bold">Inicio</span>
        </button>
        <button 
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'search' ? 'text-primary' : 'text-slate-400'}`}
        >
          <span className="material-symbols-outlined">search</span>
          <span className="text-[10px] font-bold">Buscar</span>
        </button>
        {user.role === UserRole.ADMIN && (
          <button 
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'admin' ? 'text-primary' : 'text-slate-400'}`}
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="text-[10px] font-bold">Admin</span>
          </button>
        )}
      </nav>
    </div>
  );
};

export default Layout;
