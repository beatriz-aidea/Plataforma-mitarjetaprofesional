import React, { useState, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Download, Edit2, AlertTriangle, MessageCircle, CreditCard, Mail } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import Logo from '../components/Logo';

export default function CrearDinamicaResultadoApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;

  if (!state || !state.cardId) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
        <p className="text-zinc-600 mb-4">No se encontraron datos.</p>
        <button onClick={() => navigate('/app/crear')} className="px-6 py-2 bg-brand-600 text-white rounded-xl">Volver al inicio</button>
      </div>
    );
  }

  const { cardId } = state;
  const qrRef = useRef<HTMLDivElement>(null);
  const cardUrl = `https://mitarjetaprofesional.app/c/${cardId}`;

  const [selectedProduct, setSelectedProduct] = useState<'clasicas' | 'pvc' | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number | null>(null);
  const [selectedPvcType, setSelectedPvcType] = useState<string | null>(null);

  const quantities = [
    { count: 100, price: '22,00€' },
    { count: 250, price: '28,00€' },
    { count: 500, price: '35,00€' },
    { count: 1000, price: '40,00€' },
  ];

  const pvcTypes = [
    { id: 'pvc_qr', name: 'PVC + QR', price: '20,00€' },
    { id: 'pvc_qr_nfc', name: 'PVC + QR + NFC', price: '30,00€' },
  ];

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;
    
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${cardId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleWhatsApp = () => {
    let msg = '';
    
    if (selectedProduct === 'clasicas') {
      if (!selectedQuantity) {
        alert('Selecciona una cantidad de tarjetas clásicas para continuar');
        return;
      }
      msg = `Hola, acabo de crear mi tarjeta dinámica en Mi Tarjeta Profesional y me gustaría pedir ${selectedQuantity} tarjetas clásicas. Mi URL es ${cardUrl}`;
    } else if (selectedProduct === 'pvc') {
      if (!selectedPvcType) {
        alert('Selecciona el tipo de tarjeta PVC para continuar');
        return;
      }
      if (selectedPvcType === 'pvc_qr') {
        msg = `Hola, acabo de crear mi tarjeta dinámica en Mi Tarjeta Profesional y me gustaría pedir una tarjeta PVC con QR. Mi URL es ${cardUrl}`;
      } else {
        msg = `Hola, acabo de crear mi tarjeta dinámica en Mi Tarjeta Profesional y me gustaría pedir una tarjeta PVC con QR y NFC. Mi URL es ${cardUrl}`;
      }
    } else {
      alert('Selecciona un producto para continuar');
      return;
    }

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/34918826655?text=${encoded}`, '_blank');
  };

  const handleProductSelect = (product: 'clasicas' | 'pvc') => {
    setSelectedProduct(product);
    if (product === 'clasicas') setSelectedPvcType(null);
    if (product === 'pvc') setSelectedQuantity(null);
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <div className="bg-white border-b border-zinc-200 py-4 px-6 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Logo />
          <div className="text-sm font-medium text-zinc-500">Tu Tarjeta Dinámica</div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        
        {/* Banner */}
        <div className="flex items-start gap-3 bg-brand-50 text-brand-800 p-4 rounded-2xl border border-brand-100 shadow-sm">
          <Mail className="w-6 h-6 shrink-0 mt-0.5" />
          <p className="font-medium">Hemos enviado un enlace a tu email. Úsalo para editar tu tarjeta cuando quieras, sin contraseña.</p>
        </div>

        {/* Resultado QR */}
        <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm text-center">
          <h2 className="text-2xl font-bold text-zinc-900 mb-6">Aquí tienes tu código QR</h2>
          
          <div className="flex justify-center mb-6" ref={qrRef}>
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-zinc-100 inline-block">
              <QRCodeCanvas
                value={cardUrl}
                size={220}
                fgColor="#000000"
                level="M"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button onClick={handleDownloadQR} className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors font-medium text-sm">
              <Download className="w-4 h-4" /> Descargar QR (PNG)
            </button>
            <button onClick={() => navigate('/app/crear/dinamica')} className="flex items-center gap-2 px-6 py-2.5 bg-white text-zinc-600 rounded-xl hover:bg-zinc-50 transition-colors font-medium text-sm border border-zinc-200">
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

          <div className="space-y-4 mb-8">
            {/* Clásicas */}
            <div 
              className={`border-2 rounded-2xl p-6 cursor-pointer transition-all ${selectedProduct === 'clasicas' ? 'border-brand-600 bg-brand-50/50' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}
              onClick={() => handleProductSelect('clasicas')}
            >
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-1">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedProduct === 'clasicas' ? 'border-brand-600' : 'border-zinc-300'}`}>
                    {selectedProduct === 'clasicas' && <div className="w-2.5 h-2.5 rounded-full bg-brand-600" />}
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900">Tarjetas Clásicas</h3>
                </div>
                <p className="text-sm text-zinc-500 pl-8">85x55mm · Estucado 350gr · Impresión 2 caras</p>
              </div>
              
              {selectedProduct === 'clasicas' && (
                <div className="pl-8 grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                  {quantities.map(q => (
                    <button
                      key={q.count}
                      onClick={(e) => { e.stopPropagation(); setSelectedQuantity(q.count); }}
                      className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${selectedQuantity === q.count ? 'border-brand-600 bg-brand-100/50' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}
                    >
                      <span className="font-bold text-zinc-900 block">{q.count} und.</span>
                      <span className="text-brand-600 font-medium">{q.price}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PVC */}
            <div 
              className={`border-2 rounded-2xl p-6 cursor-pointer transition-all ${selectedProduct === 'pvc' ? 'border-brand-600 bg-brand-50/50' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}
              onClick={() => handleProductSelect('pvc')}
            >
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-1">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedProduct === 'pvc' ? 'border-brand-600' : 'border-zinc-300'}`}>
                    {selectedProduct === 'pvc' && <div className="w-2.5 h-2.5 rounded-full bg-brand-600" />}
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900">Tarjeta PVC</h3>
                </div>
                <p className="text-sm text-zinc-500 pl-8">85x54mm · PVC 840 micras</p>
              </div>
              
              {selectedProduct === 'pvc' && (
                <div className="pl-8 grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {pvcTypes.map(pvc => (
                    <button
                      key={pvc.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedPvcType(pvc.id); }}
                      className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${selectedPvcType === pvc.id ? 'border-brand-600 bg-brand-100/50' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}
                    >
                      <span className="font-bold text-zinc-900 block">{pvc.name}</span>
                      <span className="text-brand-600 font-medium text-lg">{pvc.price}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <p className="text-xs text-zinc-400 text-center mt-2">IVA no incluido</p>
          </div>

          <div className="flex flex-col items-center justify-center gap-4">
            <button 
              onClick={handleWhatsApp}
              className="flex items-center gap-2 px-8 py-3 bg-[#25D366] text-white rounded-xl hover:bg-[#128C7E] transition-colors font-bold text-lg shadow-lg shadow-[#25D366]/20"
            >
              <MessageCircle className="w-5 h-5" /> Pedir tarjetas
            </button>
            <p className="text-sm text-zinc-500">¿Ya tienes cuenta? <Link to="/login" className="font-bold text-brand-600 hover:underline">Accede a tu dashboard</Link></p>
          </div>
        </section>

      </main>
    </div>
  );
}
