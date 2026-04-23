import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Upload, User, Building2, Phone, Mail, Globe, Palette, QrCode, Lock, Instagram, Linkedin, Briefcase, Image, Share2, MapPin } from 'lucide-react';
import { createUserWithEmailAndPassword, sendSignInLinkToEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import Logo from '../components/Logo';

const normalizeUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') ||
      trimmed.startsWith('https://')) {
    return trimmed;
  }
  return 'https://' + trimmed;
};

export default function CrearDinamicaApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;

  const [authEmail, setAuthEmail] = useState(state?.authEmail || '');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    identity: { 
      firstName: state?.formData?.identity?.firstName || '', 
      lastName: state?.formData?.identity?.lastName || '', 
      company: state?.formData?.identity?.company || '', 
      role: state?.formData?.identity?.role || '', 
      companyLogoUrl: state?.formData?.identity?.companyLogoUrl || '' 
    },
    contact: { 
      mobile: state?.formData?.contact?.mobile || '', 
      landline: state?.formData?.contact?.landline || '', 
      website: state?.formData?.contact?.website || '' 
    },
    social: {
      linkedin: state?.formData?.social?.linkedin || '',
      instagram: state?.formData?.social?.instagram || ''
    },
    address: { 
      street: state?.formData?.address?.street || '', 
      zip: state?.formData?.address?.zip || '', 
      city: state?.formData?.address?.city || '', 
      country: state?.formData?.address?.country || 'España' 
    },
    context: { 
      notes: state?.formData?.context?.notes || '' 
    },
    settings: { 
      showPhoto: state?.formData?.settings?.showPhoto ?? true, 
      showLogo: state?.formData?.settings?.showLogo ?? true, 
      primaryColor: state?.formData?.settings?.primaryColor || '#D61E51', 
      qrLogo: state?.formData?.settings?.qrLogo ?? false, 
      qrLogoUrl: state?.formData?.settings?.qrLogoUrl || '' 
    }
  });

  const handleChange = (section: string, field: string, value: any) => {
    setFormData(prev => ({ ...prev, [section]: { ...(prev as any)[section], [field]: value } }));
  };

  const handleImageUpload = (section: string, field: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      handleChange(section, field, reader.result as string);
    };
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail) {
      setErrorMessage("Introduce tu email de acceso.");
      return;
    }
    setErrorMessage('');
    setLoading(true);

    try {
      // 1 & 2. Try to create the user
      await createUserWithEmailAndPassword(auth, authEmail, crypto.randomUUID());
      
      // If success, user is created
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let cardId = '';
      for (let i = 0; i < 8; i++) {
        cardId += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const cardRef = doc(db, 'cards', cardId);
      
      const payload = {
        id: cardId,
        ownerUid: auth.currentUser?.uid,
        isAnonymous: false,
        ownerRole: 'free',
        plan: 'free',
        cardType: 'dinamica',
        createdFrom: 'app',
        hasPassword: false,
        ...formData,
        contact: { ...formData.contact, email: authEmail },
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(cardRef, payload).catch(err => handleFirestoreError(err, OperationType.WRITE, `cards/${cardId}`));

      // Send magic link
      const actionCodeSettings = {
        url: 'https://mitarjetaprofesional.app/dashboard',
        handleCodeInApp: true
      };
      
      await sendSignInLinkToEmail(auth, authEmail, actionCodeSettings);

      navigate('/app/crear/dinamica/resultado', {
        state: { cardId }
      });

    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setErrorMessage("Ya tienes una tarjeta activa. Accede a tu dashboard para gestionarla.");
      } else {
        setErrorMessage("Ocurrió un error al crear tu tarjeta. Inténtalo de nuevo.");
        console.error(err);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <div className="bg-white border-b border-zinc-200 py-4 px-6 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Logo />
          <div className="text-sm font-medium text-zinc-500">Crear Tarjeta Dinámica</div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleGenerate} className="space-y-8">
          
          {/* EMAIL ACCESO */}
          <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm border-l-4 border-l-brand-600">
            <label className="block text-sm font-bold text-zinc-900 tracking-wider mb-2">Tu email de acceso</label>
            <input 
              required 
              type="email" 
              value={authEmail} 
              onChange={e => setAuthEmail(e.target.value)} 
              className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700" 
              placeholder="correo@ejemplo.com" 
            />
            <p className="text-zinc-500 text-sm mt-2">Tu correo es la base para poder crear tu url personalizada</p>
            {errorMessage && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm flex flex-col gap-2">
                <span>{errorMessage}</span>
                {errorMessage.includes("Ya tienes una tarjeta") && (
                  <Link to="/login" className="inline-block font-bold text-red-800 hover:underline">Ir a Iniciar Sesión →</Link>
                )}
              </div>
            )}
          </section>

          {/* BLOQUE 1 - Identidad */}
          <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <User className="w-6 h-6 text-brand-600" />
              <h2 className="text-2xl font-bold text-zinc-900">Identidad Profesional</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Nombre</label>
                <input required type="text" value={formData.identity.firstName} onChange={e => handleChange('identity', 'firstName', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700" placeholder="Tu nombre" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Apellidos</label>
                <input required type="text" value={formData.identity.lastName} onChange={e => handleChange('identity', 'lastName', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700" placeholder="Tus apellidos" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Empresa</label>
                <input type="text" value={formData.identity.company} onChange={e => handleChange('identity', 'company', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700" placeholder="Tu empresa" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Cargo</label>
                <input type="text" value={formData.identity.role} onChange={e => handleChange('identity', 'role', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700" placeholder="Tu cargo" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Logotipo de empresa</label>
                <div className="flex gap-4 items-center">
                  {formData.identity.companyLogoUrl ? (
                    <img src={formData.identity.companyLogoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-xl border border-zinc-200" />
                  ) : (
                    <div className="w-16 h-16 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col items-center justify-center text-zinc-400 shrink-0">
                      <Image className="w-6 h-6 mb-1" />
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-zinc-200 hover:border-brand-500 hover:bg-brand-50 rounded-2xl cursor-pointer transition-colors text-zinc-600 hover:text-brand-600 font-medium">
                      <Upload className="w-5 h-5" /> Subir logotipo
                      <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleImageUpload('identity', 'companyLogoUrl')} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* BLOQUE 2 - Contacto */}
          <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <Phone className="w-6 h-6 text-brand-600" />
              <h2 className="text-2xl font-bold text-zinc-900">Contacto Digital</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Móvil / WhatsApp</label>
                <div className="flex gap-2">
                  <div className="flex items-center justify-between px-4 py-3 border border-zinc-200 rounded-2xl bg-white w-32 shrink-0">
                    <span className="font-bold text-zinc-900">ES (+34)</span>
                    <span className="text-zinc-400 text-xs">▼</span>
                  </div>
                  <input type="tel" value={formData.contact.mobile} onChange={e => handleChange('contact', 'mobile', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700" placeholder="600 000 000" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Email Corporativo</label>
                <div className="relative">
                  <input type="email" disabled value={authEmail} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl bg-zinc-50 text-zinc-500 outline-none pr-10" placeholder="Email (arriba)" />
                  <Lock className="w-4 h-4 text-zinc-400 absolute right-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Teléfono Fijo</label>
                <div className="flex gap-2">
                  <div className="flex items-center justify-between px-4 py-3 border border-zinc-200 rounded-2xl bg-white w-32 shrink-0">
                    <span className="font-bold text-zinc-900">ES (+34)</span>
                    <span className="text-zinc-400 text-xs">▼</span>
                  </div>
                  <input type="tel" value={formData.contact.landline} onChange={e => handleChange('contact', 'landline', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700" placeholder="910 000 000" />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  <Globe className="w-4 h-4 text-brand-600" /> WEB / PORTFOLIO
                </label>
                <input 
                  type="text" 
                  value={formData.contact.website} 
                  onChange={e => handleChange('contact', 'website', e.target.value)} 
                  onBlur={e => handleChange('contact', 'website', normalizeUrl(e.target.value))}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700" 
                  placeholder="https://" 
                />
              </div>
            </div>
          </section>

          {/* BLOQUE 3 - Contexto */}
          <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <Briefcase className="w-6 h-6 text-brand-600" />
              <h2 className="text-2xl font-bold text-zinc-900">Contexto de Red</h2>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Por qué te pueden recordar</label>
              <textarea 
                maxLength={100}
                value={formData.context.notes}
                onChange={e => handleChange('context', 'notes', e.target.value)}
                className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 resize-none h-24"
                placeholder="Ej. Nos conocimos en el evento de networking..."
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-zinc-500 italic">Sé breve, te leerán mejor</span>
                <span className="text-sm font-medium text-zinc-400">{formData.context.notes.length}/100</span>
              </div>
            </div>
          </section>

          {/* BLOQUE 4 - Redes Sociales */}
          <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <Share2 className="w-6 h-6 text-brand-600" />
              <h2 className="text-2xl font-bold text-zinc-900">Redes Sociales</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  <Linkedin className="w-4 h-4 text-brand-600" /> LINKEDIN
                </label>
                <input type="url" value={formData.social.linkedin} onChange={e => handleChange('social', 'linkedin', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700" placeholder="https://linkedin.com/in/..." />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  <Instagram className="w-4 h-4 text-brand-600" /> INSTAGRAM
                </label>
                <input type="text" value={formData.social.instagram} onChange={e => handleChange('social', 'instagram', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700" placeholder="@usuario" />
              </div>
            </div>
          </section>

          {/* BLOQUE 5 - Dirección */}
          <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <MapPin className="w-6 h-6 text-brand-600" />
              <h2 className="text-2xl font-bold text-zinc-900">Dirección</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Calle y número</label>
                <input type="text" value={formData.address.street} onChange={e => handleChange('address', 'street', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700" placeholder="Dirección completa" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Ciudad</label>
                <input type="text" value={formData.address.city} onChange={e => handleChange('address', 'city', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700" placeholder="Ciudad" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Código Postal</label>
                <input type="text" value={formData.address.zip} onChange={e => handleChange('address', 'zip', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700" placeholder="12345" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">País</label>
                <input type="text" value={formData.address.country} onChange={e => handleChange('address', 'country', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700" placeholder="País" />
              </div>
            </div>
          </section>

          {/* BLOQUE 6 - Diseño */}
          <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <Palette className="w-6 h-6 text-brand-600" />
              <h2 className="text-2xl font-bold text-zinc-900">Diseño y Colores</h2>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <span className="font-medium text-zinc-700">Mostrar foto de perfil en la tarjeta pública</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={formData.settings.showPhoto} onChange={e => handleChange('settings', 'showPhoto', e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <span className="font-medium text-zinc-700">Mostrar logotipo en la tarjeta pública</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={formData.settings.showLogo} onChange={e => handleChange('settings', 'showLogo', e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                </label>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Color Principal</label>
                <div className="flex gap-4">
                  <input type="color" value={formData.settings.primaryColor} onChange={e => handleChange('settings', 'primaryColor', e.target.value)} className="w-14 h-14 rounded-xl cursor-pointer border-0 p-0" />
                  <input type="text" value={formData.settings.primaryColor} onChange={e => handleChange('settings', 'primaryColor', e.target.value)} className="flex-1 px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-600 outline-none font-mono" />
                </div>
              </div>
            </div>
          </section>

          {/* BLOQUE 7 - QR Configuration */}
          <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <QrCode className="w-6 h-6 text-brand-600" />
              <h2 className="text-2xl font-bold text-zinc-900">Configuración del QR</h2>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <input id="qrLogoToggle" type="checkbox" checked={formData.settings.qrLogo} onChange={e => handleChange('settings', 'qrLogo', e.target.checked)} className="w-5 h-5 rounded border-zinc-300 text-brand-600 focus:ring-brand-600" />
                <label htmlFor="qrLogoToggle" className="font-medium text-zinc-700">Integrar un logo en el código QR</label>
              </div>
              {formData.settings.qrLogo && (
                <div className="pl-8">
                  {formData.settings.qrLogoUrl && (
                    <img src={formData.settings.qrLogoUrl} alt="QR Logo" className="w-16 h-16 object-contain rounded-xl border border-zinc-200 mb-4" />
                  )}
                  <label className="inline-flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-zinc-200 hover:border-brand-500 hover:bg-brand-50 rounded-2xl cursor-pointer transition-colors text-zinc-600 hover:text-brand-600 font-medium w-full md:w-auto">
                    <Upload className="w-5 h-5" /> Subir logo para QR (JPG/PNG)
                    <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleImageUpload('settings', 'qrLogoUrl')} />
                  </label>
                </div>
              )}
            </div>
          </section>

          <div className="flex items-center justify-end border-t border-zinc-200 pt-8 mt-8">
            <button disabled={loading} type="submit" className="px-8 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium text-lg disabled:opacity-50">
              {loading ? 'Generando...' : 'Generar QR'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
