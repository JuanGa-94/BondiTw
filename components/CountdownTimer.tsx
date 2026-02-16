
import React, { useState, useEffect } from 'react';
import { Route } from '../types';

interface CountdownTimerProps {
  route: Route;
  onFinish?: () => void;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ route, onFinish }) => {
  const [timeLeft, setTimeLeft] = useState<{ h: string; m: string; s: string } | null>(null);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const [hours, minutes] = route.departure_time.split(':').map(Number);
      
      const target = new Date();
      target.setHours(hours, minutes, 0, 0);
      
      // If the time already passed today, assume it's for tomorrow or just pass
      if (target.getTime() < now.getTime()) {
        target.setDate(target.getDate() + 1);
      }

      const diff = target.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft({ h: '00', m: '00', s: '00' });
        if (onFinish) onFinish();
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
      const m = Math.floor((diff / (1000 * 60)) % 60).toString().padStart(2, '0');
      const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');

      setTimeLeft({ h, m, s });
      
      // Calculate fake progress for UI (e.g. 1 hour total)
      const totalDuration = 60 * 60 * 1000; 
      const progress = Math.min(100, Math.max(0, 100 - (diff / totalDuration * 100)));
      setPercent(progress);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [route.departure_time, onFinish]);

  if (!timeLeft) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center justify-center py-10 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/10">
        <div className="flex gap-4 md:gap-8 items-baseline">
          <div className="flex flex-col items-center">
            <div className="text-5xl md:text-7xl font-black text-primary tracking-tighter">{timeLeft.h}</div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Hours</span>
          </div>
          <div className="text-4xl md:text-6xl font-black text-primary/30">:</div>
          <div className="flex flex-col items-center">
            <div className="text-5xl md:text-7xl font-black text-primary tracking-tighter">{timeLeft.m}</div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Minutes</span>
          </div>
          <div className="text-4xl md:text-6xl font-black text-primary/30">:</div>
          <div className="flex flex-col items-center">
            <div className="text-5xl md:text-7xl font-black text-primary tracking-tighter">{timeLeft.s}</div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Seconds</span>
          </div>
        </div>
        <div className="mt-8 flex items-center gap-2 text-slate-500 font-medium text-sm">
          <span className="material-symbols-outlined text-primary text-xl">near_me</span>
          Autobús aproximándose a tu parada
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
          <span className="text-primary">En camino</span>
          <span className="text-slate-400">{Math.round(percent)}% de espera completado</span>
        </div>
        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${percent}%` }}></div>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
