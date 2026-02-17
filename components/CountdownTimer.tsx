
import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  departureTime: string;
  onFinish?: () => void;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ departureTime, onFinish }) => {
  const [timeLeft, setTimeLeft] = useState<{ h: string; m: string; s: string } | null>(null);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const [hours, minutes] = departureTime.split(':').map(Number);
      
      const target = new Date();
      target.setHours(hours, minutes, 0, 0);
      
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
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [departureTime, onFinish]);

  if (!timeLeft) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center py-10 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/10 transition-colors">
        <div className="flex gap-4 md:gap-8 items-baseline">
          <div className="flex flex-col items-center">
            <div className="text-5xl md:text-7xl font-black text-primary tracking-tighter tabular-nums">{timeLeft.h}</div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Horas</span>
          </div>
          <div className="text-4xl md:text-6xl font-black text-primary/30">:</div>
          <div className="flex flex-col items-center">
            <div className="text-5xl md:text-7xl font-black text-primary tracking-tighter tabular-nums">{timeLeft.m}</div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Minutos</span>
          </div>
          <div className="text-4xl md:text-6xl font-black text-primary/30">:</div>
          <div className="flex flex-col items-center">
            <div className="text-5xl md:text-7xl font-black text-primary tracking-tighter tabular-nums">{timeLeft.s}</div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Segundos</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
