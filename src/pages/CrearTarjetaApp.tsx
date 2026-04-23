import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Zap } from 'lucide-react';
import Logo from '../components/Logo';

export default function CrearTarjetaApp() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>
        <h1 className="text-3xl font-bold text-center text-zinc-900 mb-8">¿Qué tipo de tarjeta necesitas?</h1>
        <div className="grid md:grid-cols-2 gap-6">
          <button 
            onClick={() => navigate('/app/crear/estatica')}
            className="flex flex-col items-center p-8 bg-white rounded-3xl border border-zinc-200 shadow-sm hover:border-brand-500 hover:shadow-xl transition-all cursor-pointer group text-left w-full"
          >
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Smartphone className="w-8 h-8 text-brand-600" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 mb-2 text-center w-full">Tarjeta Estática</h2>
            <p className="text-zinc-500 text-center">La clásica, en estucado, de toda la vida + Qr con tus datos para escanear y compartir. Sin registro.</p>
          </button>

          <button 
            onClick={() => navigate('/app/crear/dinamica')}
            className="flex flex-col items-center p-8 bg-white rounded-3xl border border-zinc-200 shadow-sm hover:border-brand-500 hover:shadow-xl transition-all cursor-pointer group text-left w-full"
          >
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="w-8 h-8 text-brand-600" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 mb-2 text-center w-full">Tarjeta Dinámica</h2>
            <p className="text-zinc-500 text-center">En PVC + Qr + Nfc, con tus datos para compartir solo acercando el móvil. Perfil actualizable.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
