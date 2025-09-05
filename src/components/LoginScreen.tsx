import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@/types/truck';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Shield, Users, Navigation } from 'lucide-react';

// Assets
import logoPng from '@/assets/main_large.png';
import img1 from '@/assets/pumpanptco.png';
import img2 from '@/assets/1.png';
import img3 from '@/assets/2.png';
import img4 from '@/assets/3.png';
import img5 from '@/assets/4.png';
import img6 from '@/assets/5.png';

interface LoginScreenProps {
  onLogin: (role: UserRole, name: string) => void;
}

type ColorKey = 'primary' | 'success' | 'warning' | 'accent';

const colorClasses: Record<ColorKey, { icon: string; chipBg: string; chipBorder: string }> = {
  primary: { icon: 'text-sky-700',     chipBg: 'bg-sky-50',     chipBorder: 'border-sky-200' },
  success: { icon: 'text-emerald-700', chipBg: 'bg-emerald-50', chipBorder: 'border-emerald-200' },
  warning: { icon: 'text-amber-700',   chipBg: 'bg-amber-50',   chipBorder: 'border-amber-200' },
  accent:  { icon: 'text-indigo-700',  chipBg: 'bg-indigo-50',  chipBorder: 'border-indigo-200' },
};

const roles = [
  { role: 'manager' as UserRole,  title: 'Manager',    name: 'Gautam Mahli',  description: 'Full fleet oversight, analytics, and security monitoring.', icon: Shield,     color: 'primary' as ColorKey },
  { role: 'client' as UserRole,   title: 'Client',     name: 'Deepak Mahli',  description: 'Track your deliveries and verify fuel receipts.',           icon: Users,      color: 'success' as ColorKey },
  { role: 'operator' as UserRole, title: 'Dispatcher', name: 'Praveen Mahli', description: 'Assign trips, monitor routes, and manage operations.',      icon: Navigation, color: 'warning' as ColorKey },
  { role: 'driver' as UserRole,   title: 'Driver',     name: 'Vivek Mahli',   description: 'View assigned trips and update delivery status.',           icon: Truck,      color: 'accent' as ColorKey },
];

// Auto slider (no onLoad gating)
const useAutoSlider = (length: number, intervalMs = 4500, startIndex = 0) => {
  const [index, setIndex] = useState(startIndex);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (paused || length <= 1) return;
    timerRef.current = window.setTimeout(() => {
      setIndex((i) => (i + 1) % length);
    }, intervalMs);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [index, paused, length, intervalMs]);

  const next = () => setIndex((i) => (i + 1) % length);
  const prev = () => setIndex((i) => (i - 1 + length) % length);

  return { index, setIndex, next, prev, paused, setPaused };
};

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const navigate = useNavigate();
  const go = (role: UserRole, name: string) => { onLogin(role, name); navigate(`/${role}`); };
  const handleKeyActivate =
    (role: UserRole, name: string) =>
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(role, name); }
    };

  // include all images (now 5)
  const IMAGES = useMemo(() => [img1, img2, img3, img4, img5,img6].filter(Boolean), []);
  const { index, setIndex, next, prev, paused, setPaused } = useAutoSlider(IMAGES.length, 4500, 0);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-sky-50 to-indigo-50 text-gray-900">
      {/* Header / Brand */}
      <header className="sticky top-0 z-20 border-b border-white/50 bg-white/60 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoPng} alt="ANPTCO Logo" className="w-14 h-14 md:w-16 md:h-16 object-contain rounded-xl shadow-sm" />
            <span className="text-2xl md:text-3xl font-black tracking-tight">ANPTCO</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-gray-500">Developed by</span>
            <span className="text-sm font-semibold">Mahli</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <div className="grid lg:grid-cols-2 gap-10 items-stretch">
          {/* Left: RAKAN + Acronym + Slider */}
          <section className="relative flex flex-col justify-center space-y-6">
            {/* ✨ Full highlighted RAKAN wordmark */}
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-none">
              <span className="relative inline-block">
                {/* underline highlight */}
                <span className="absolute inset-x-0 -bottom-1 h-3 md:h-4 bg-amber-200/60 rounded-md -z-10"></span>
                <span className="bg-gradient-to-r from-sky-700 via-indigo-700 to-rose-700 bg-clip-text text-transparent drop-shadow-sm">
                  RAKAN
                </span>
              </span>
            </h1>

            {/* Acronym Expansion */}
            <div className="text-lg md:text-xl font-medium text-gray-800 leading-relaxed space-y-1">
              <p><span className="text-sky-700 font-bold">R</span>etail</p>
              <p><span className="text-emerald-700 font-bold">A</span>lert</p>
              <p><span className="text-amber-700 font-bold">K</span>nowledgeable</p>
              <p><span className="text-indigo-700 font-bold">A</span>nd</p>
              <p><span className="text-rose-700 font-bold">N</span>otify</p>
            </div>

            {/* Image Slider */}
            <div
              className="relative mt-6 rounded-3xl overflow-hidden border border-gray-200 shadow-xl bg-black aspect-video"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              {IMAGES.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Slide ${i + 1}`}
                  className={[
                    'absolute inset-0 w-full h-full object-contain select-none pointer-events-none',
                    'transition-opacity duration-500',
                    i === index ? 'opacity-100' : 'opacity-0'
                  ].join(' ')}
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
              ))}

              {/* Top-right badge */}
              <div className="absolute right-3 top-3 rounded-full bg-white/85 backdrop-blur px-3 py-1 text-xs font-semibold text-gray-700 border border-gray-200">
                {paused ? 'Paused' : 'Auto'}
              </div>

              {/* Controls */}
              <button
                aria-label="Previous slide"
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 hover:bg-white shadow border border-gray-200 px-3 py-2 text-sm font-semibold"
              >
                ‹
              </button>
              <button
                aria-label="Next slide"
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 hover:bg-white shadow border border-gray-200 px-3 py-2 text-sm font-semibold"
              >
                ›
              </button>

              {/* Dots */}
              <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2">
                {IMAGES.map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Go to slide ${i + 1}`}
                    onClick={() => setIndex(i)}
                    className={[
                      'h-2.5 rounded-full transition-all',
                      i === index ? 'w-6 bg-sky-600' : 'w-2.5 bg-white/70 border border-gray-300'
                    ].join(' ')}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Right: Roles */}
          <section className="flex flex-col">
            <div className="mb-5 text-center sm:text-left">
              <h2 className="text-2xl font-bold">Choose Your Role</h2>
              <p className="text-gray-600">Pick a profile to continue</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {roles.map((roleData) => {
                const Icon = roleData.icon;
                const c = colorClasses[roleData.color];
                return (
                  <Card
                    key={roleData.role}
                    role="button"
                    tabIndex={0}
                    aria-label={`Enter as ${roleData.title}`}
                    onClick={() => go(roleData.role, roleData.name)}
                    onKeyDown={handleKeyActivate(roleData.role, roleData.name)}
                    className={[
                      'group cursor-pointer rounded-2xl border border-white/60 bg-white/70 backdrop-blur',
                      'shadow-sm hover:shadow-md transition-all duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60',
                    ].join(' ')}
                  >
                    <CardHeader className="flex items-start gap-4 pb-3">
                      <div className={`p-2.5 rounded-xl border ${c.chipBg} ${c.chipBorder} transition-transform duration-200 group-hover:scale-105`}>
                        <Icon className={`w-7 h-7 ${c.icon}`} strokeWidth={2.2} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{roleData.title}</CardTitle>
                        <CardDescription className="text-gray-800 font-medium">{roleData.name}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-700 mb-4">{roleData.description}</p>
                      <Button
                        variant="outline"
                        className="w-full border-gray-300 text-gray-900 hover:bg-gray-900 hover:text-white focus-visible:ring-2 focus-visible:ring-sky-500/60 rounded-xl"
                        onClick={(e) => { e.stopPropagation(); go(roleData.role, roleData.name); }}
                      >
                        Enter as {roleData.title}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-10 border-t border-white/50 bg-white/60 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} ANPTCO. All rights reserved.</p>
          <p className="text-xs text-gray-600">RAKAN • Retail • Alert • Knowledgeable • And • Notify</p>
        </div>
      </footer>
    </div>
  );
};

export default LoginScreen;
