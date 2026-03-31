import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, User, Briefcase, MessageCircle, Check, ArrowLeft } from 'lucide-react';
import Logo from '../components/Logo';

export default function EnterpriseContact() {
  const navigate = useNavigate();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const contactData = Object.fromEntries(formData.entries());
    
    const subject = encodeURIComponent("Información mitarjetaprofesional - Empresa");
    const body = encodeURIComponent(`
Nombre: ${contactData.firstName || ''}
Apellidos: ${contactData.lastName || ''}
Empresa: ${contactData.company || ''}
Cargo: ${contactData.role || ''}
Email: ${contactData.email || ''}
Teléfono: ${contactData.phone || ''}
Necesidades: ${contactData.needs || ''}
    `);
    
    // Open email client
    window.location.href = `mailto:info@mitarjetaprofesional.es?subject=${subject}&body=${body}`;
    
    setLoading(false);
    setShowSuccessModal(true);
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo />
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-4">Solicitar información para Empresa</h1>
          <p className="text-lg text-zinc-600">
            Completa el formulario y nos pondremos en contacto contigo para ofrecerte una solución a medida para tu equipo.
          </p>
        </div>

        <form onSubmit={handleContactSubmit} className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre</label>
              <input type="text" name="firstName" required className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-600 outline-none" placeholder="Ej. Javier" />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-zinc-700 mb-1">Apellidos</label>
              <input type="text" name="lastName" required className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-600 outline-none" placeholder="Ej. García" />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-zinc-700 mb-1">Empresa</label>
              <input type="text" name="company" required className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-600 outline-none" placeholder="Ej. AIDEA Creative" />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-zinc-700 mb-1">Cargo</label>
              <input type="text" name="role" required className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-600 outline-none" placeholder="Ej. Director Creativo" />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-zinc-700 mb-1">Email Corporativo</label>
              <input type="email" name="email" required className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-600 outline-none" placeholder="javier@empresa.com" />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-zinc-700 mb-1">Teléfono</label>
              <input type="tel" name="phone" required className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-600 outline-none" placeholder="600 000 000" />
            </div>
            
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-700 mb-1">¿Qué funcionalidades buscas? ¿Tienes un equipo o una empresa?</label>
              <textarea name="needs" required rows={4} className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-600 outline-none resize-none" placeholder="Explícanos tus necesidades..."></textarea>
            </div>
            
            <div className="sm:col-span-2">
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-zinc-500 mb-4">O si lo prefieres, contáctanos directamente:</p>
            <a 
              href="https://wa.me/34623103402"
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="w-5 h-5" />
              Ayuda vía WhatsApp
            </a>
          </div>
        </form>
      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 mb-4">¡Solicitud Enviada!</h3>
            <p className="text-zinc-600 mb-8">
              Gracias por tu solicitud, en breve nos pondremos en contacto contigo para atender tu solicitud.
            </p>
            <button 
              onClick={() => {
                setShowSuccessModal(false);
                navigate('/');
              }}
              className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors"
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
