import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Upload, User, Building2, Phone, Mail, Globe, Palette, QrCode, Smartphone, MapPin, Briefcase, Image } from 'lucide-react';
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

export default function CrearEstaticaApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;

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
      email: state?.formData?.contact?.email || '', 
      website: state?.formData?.contact?.website || '' 
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

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const { identity, contact, context } = formData;
    
    let vcfText = `BEGIN:VCARD\nVERSION:3.0\n`;
    
    const fN = `${identity.firstName} ${identity.lastName}`.trim();
    if (fN) {
      vcfText += `FN:${fN}\nN:${identity.lastName};${identity.firstName};;;\n`;
    }
    if (identity.company) vcfText += `ORG:${identity.company}\n`;
    if (identity.role) vcfText += `TITLE:${identity.role}\n`;
    if (contact.mobile) vcfText += `TEL;TYPE=CELL:${contact.mobile}\n`;
    if (contact.landline) vcfText += `TEL;TYPE=WORK:${contact.landline}\n`;
    if (contact.email) vcfText += `EMAIL;TYPE=INTERNET:${contact.email}\n`;
    if (contact.website) vcfText += `URL:${normalizeUrl(contact.website)}\n`;
    if (context.notes) vcfText += `NOTE:${context.notes.replace(/\n/g, '\\n')}\n`;
    
    vcfText += `END:VCARD`;

    navigate('/app/crear/estatica/resultado', {
      state: { 
        vcfText, 
        colorPrincipal: formData.settings.primaryColor,
        logoQR: formData.settings.qrLogo ? formData.settings.qrLogoUrl : null,
        formData
      }
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <div className="bg-white border-b border-zinc-200 py-4 px-6 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Logo />
          <div className="text-sm font-medium text-zinc-500">Crear Tarjeta Estática</div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleGenerate} className="space-y-8">
          
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
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Email</label>
                <input type="email" value={formData.contact.email} onChange={e => handleChange('contact', 'email', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700" placeholder="tu@email.com" />
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
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Web / Portfolio</label>
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



          {/* BLOQUE 5 - Diseño */}
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

          {/* BLOQUE 6 - QR Configuration */}
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
            <button type="submit" className="px-8 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium text-lg">
              Generar QR
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
