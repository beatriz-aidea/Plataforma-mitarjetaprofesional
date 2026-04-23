import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Download, Edit2, AlertTriangle, MessageCircle, CreditCard } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import Logo from '../components/Logo';

export default function CrearEstaticaResultadoApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;

  if (!state || !state.vcfText) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
        <p className="text-zinc-600 mb-4">No se encontraron datos.</p>
        <button onClick={() => navigate('/app/crear')} className="px-6 py-2 bg-brand-600 text-white rounded-xl">Volver al inicio</button>
      </div>
    );
  }

  const { vcfText, colorPrincipal, logoQR, formData } = state;
  const isDense = vcfText.length > 300;
  const qrRef = useRef<HTMLDivElement>(null);

  const [selectedQuantity, setSelectedQuantity] = useState<number | null>(null);

  const quantities = [
    { count: 100, price: '22,00€' },
    { count: 250, price: '28,00€' },
    { count: 500, price: '35,00€' },
    { count: 1000, price: '40,00€' },
  ];

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;
    
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mi-tarjeta-qr.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadVCF = () => {
    const blob = new Blob([vcfText], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacto.vcf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleWhatsApp = () => {
    if (!selectedQuantity) {
      alert('Selecciona una cantidad para continuar');
      return;
    }
    const msg = `Hola, acabo de crear mi tarjeta en Mi Tarjeta Profesional y me gustaría pedir ${selectedQuantity} tarjetas clásicas. Mi QR ya está listo.`;
    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/34918826655?text=${encoded}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <div className="bg-white border-b border-zinc-200 py-4 px-6 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Logo />
          <div className="text-sm font-medium text-zinc-500">Tu Tarjeta Estática</div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        
        {/* Resultado QR */}
        <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm text-center">
          <h2 className="text-2xl font-bold text-zinc-900 mb-6">Aquí tienes tu código QR</h2>
          
          <div className="flex justify-center mb-6" ref={qrRef}>
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-zinc-100 inline-block">
              <QRCodeCanvas
                value={vcfText}
                size={220}
                fgColor={colorPrincipal || '#000000'}
                level="H"
                imageSettings={logoQR ? {
                  src: logoQR,
                  x: undefined,
                  y: undefined,
                  height: 50,
                  width: 50,
                  excavate: true,
                } : undefined}
              />
            </div>
          </div>

          {isDense && (
            <div className="flex items-start gap-3 bg-amber-50 text-amber-800 p-4 rounded-xl mb-6 text-left text-sm max-w-md mx-auto">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>Tu QR es muy denso. Puede ser difícil de leer en móviles básicos. Considera acortar el Contexto de Red.</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button onClick={handleDownloadQR} className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors font-medium text-sm">
              <Download className="w-4 h-4" /> Descargar QR (PNG)
            </button>
            <button onClick={handleDownloadVCF} className="flex items-center gap-2 px-6 py-2.5 bg-zinc-100 text-zinc-700 rounded-xl hover:bg-zinc-200 transition-colors font-medium text-sm border border-zinc-200">
              <Download className="w-4 h-4" /> Descargar .vcf
            </button>
            <button onClick={() => navigate('/app/crear/estatica', { state: { formData } })} className="flex items-center gap-2 px-6 py-2.5 bg-white text-zinc-600 rounded-xl hover:bg-zinc-50 transition-colors font-medium text-sm border border-zinc-200">
              <Edit2 className="w-4 h-4" /> Volver a editar
            </button>
          </div>
        </section>

        {/* Prod Físicos */}
        <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
          <div className="flex flex-col items-center text-center mb-8">
            <CreditCard className="w-8 h-8 text-brand-600 mb-3" />
            <h2 className="text-2xl font-bold text-zinc-900">Pide tus tarjetas físicas</h2>
            <p className="text-zinc-500 mt-2">Imprimimos tus tarjetas con la mejor calidad y te las enviamos</p>
          </div>

          <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-200 mb-8">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-zinc-900">Tarjetas Clásicas</h3>
              <p className="text-sm text-zinc-500">85x55mm · Estucado 350gr · Impresión 2 caras</p>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {quantities.map(q => (
                <button
                  key={q.count}
                  onClick={() => setSelectedQuantity(q.count)}
                  className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${selectedQuantity === q.count ? 'border-brand-600 bg-brand-50' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}
                >
                  <span className="font-bold text-zinc-900 block">{q.count} und.</span>
                  <span className="text-brand-600 font-medium">{q.price}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-400 text-center mt-4">IVA no incluido</p>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={handleWhatsApp}
              className="flex items-center gap-2 px-8 py-3 bg-[#25D366] text-white rounded-xl hover:bg-[#128C7E] transition-colors font-bold text-lg shadow-lg shadow-[#25D366]/20"
            >
              <MessageCircle className="w-5 h-5" /> Pedir tarjetas
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}
