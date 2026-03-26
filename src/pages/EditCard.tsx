import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, query, collection, where, getDocs } from 'firebase/firestore';
import { ArrowLeft, Save, Upload } from 'lucide-react';

export default function EditCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { cardId } = useParams();
  const [searchParams] = useSearchParams();
  const targetOwnerUid = searchParams.get('ownerUid');
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [originalOwnerUid, setOriginalOwnerUid] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [formData, setFormData] = useState({
    identity: { firstName: '', lastName: '', company: '', role: '', photoUrl: '' },
    contact: { mobile: '', landline: '', email: '', website: '' },
    context: { notes: '' },
    address: { street: '', zip: '', city: '', province: '', country: '' },
    social: { linkedin: '', instagram: '', twitter: '', tiktok: '' },
    settings: { qrLogo: false, qrLogoUrl: '' },
    status: 'active'
  });

 useEffect(() => {
    const fetchCard = async () => {
      if (!user) {
        setInitialLoading(false);
        return;
      }

      // Check if current user is admin
      let isUserAdmin = false;
      if (user?.email === 'beatriz@aidea.es') {
        isUserAdmin = true;
      } else {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data().role === 'admin') {
            isUserAdmin = true;
          }
        } catch (e) {
          console.error("Error checking admin status", e);
        }
      }
      setIsAdmin(isUserAdmin);

      if (!cardId) {
        setInitialLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'cards', cardId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          if (data.ownerUid === user?.uid || isUserAdmin) {
            setOriginalOwnerUid(data.ownerUid);
            setFormData({
  identity: {
    firstName: data.identity?.firstName || '',
    lastName: data.identity?.lastName || '',
    company: data.identity?.company || '',
    role: data.identity?.role || '',
    photoUrl: data.identity?.photoUrl || ''
  },
  contact: {
    mobile: data.contact?.mobile || '',
    landline: data.contact?.landline || '',
    email: data.contact?.email || '',
    website: data.contact?.website || ''
  },
  context: { notes: data.context?.notes || '' },
  address: {
    street: data.address?.street || '',
    zip: data.address?.zip || '',
    city: data.address?.city || '',
    province: data.address?.province || '',
    country: data.address?.country || ''
  },
  social: {
    linkedin: data.social?.linkedin || '',
    instagram: data.social?.instagram || '',
    twitter: data.social?.twitter || '',
    tiktok: data.social?.tiktok || ''
  },
  settings: {
    qrLogo: data.settings?.qrLogo || false,
    qrLogoUrl: data.settings?.qrLogoUrl || ''
  },
  status: data.status || 'active'
});
          } else {
            navigate('/dashboard');
          }
        } else {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error("Error fetching card", error);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchCard();
  }, [cardId, user, navigate]);

  const handleChange = (section: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev as any)[section],
        [field]: value
      }
    }));
  };

  const handleImageUpload = (section: string, field: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.8 quality to keep it well under Firestore's 1MB limit
          const base64String = canvas.toDataURL('image/jpeg', 0.8);
          handleChange(section, field, base64String);
          setUploadingImage(false);
        };
        img.onerror = () => {
          setUploadingImage(false);
          alert("Error al procesar la imagen.");
        };
      };
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        setUploadingImage(false);
        alert("Error al leer la imagen.");
      };
    } catch (error) {
      console.error("Error processing image:", error);
      setUploadingImage(false);
      alert("Error al procesar la imagen.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const id = cardId || crypto.randomUUID();
      const cardRef = doc(db, 'cards', id);
      
      const payload = {
        id,
        ownerUid: originalOwnerUid || (isAdmin && targetOwnerUid ? targetOwnerUid : user.uid),
        ...formData,
        updatedAt: serverTimestamp()
      };

      if (!cardId) {
        (payload as any).createdAt = serverTimestamp();
      }

      await setDoc(cardRef, payload, { merge: true });
      navigate(-1); // Go back to the previous page (Dashboard or AdminDashboard)
    } catch (error) {
      console.error("Error saving card", error);
      alert("Error al guardar la tarjeta. Revisa los permisos.");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 font-medium">
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-3xl font-bold text-zinc-900 mb-8">{cardId ? 'Editar Tarjeta' : 'Nueva Tarjeta'}</h1>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Identity */}
          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-zinc-900">Identidad Profesional</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre *</label>
                <input required type="text" value={formData.identity.firstName} onChange={e => handleChange('identity', 'firstName', e.target.value)} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Apellidos *</label>
                <input required type="text" value={formData.identity.lastName} onChange={e => handleChange('identity', 'lastName', e.target.value)} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Empresa</label>
                <input type="text" value={formData.identity.company} onChange={e => handleChange('identity', 'company', e.target.value)} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Cargo</label>
                <input type="text" value={formData.identity.role} onChange={e => handleChange('identity', 'role', e.target.value)} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 mb-1">Foto de Perfil / Logo</label>
                <div className="flex items-center gap-4">
                  {formData.identity.photoUrl && (
                    <img src={formData.identity.photoUrl} alt="Preview" className="w-16 h-16 rounded-full object-cover border border-zinc-200" />
                  )}
                  <div className="flex-1">
                    <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-zinc-300 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-colors cursor-pointer">
                      <Upload className="w-5 h-5 text-zinc-500" />
                      <span className="text-sm font-medium text-zinc-700">
                        {uploadingImage ? 'Subiendo...' : 'Subir imagen (JPG, PNG)'}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload('identity', 'photoUrl')}
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-zinc-900">Contacto Digital</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Móvil / WhatsApp</label>
                <input type="tel" value={formData.contact.mobile} onChange={e => handleChange('contact', 'mobile', e.target.value)} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Teléfono Fijo</label>
                <input type="tel" value={formData.contact.landline} onChange={e => handleChange('contact', 'landline', e.target.value)} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Email Corporativo</label>
                <input type="email" value={formData.contact.email} onChange={e => handleChange('contact', 'email', e.target.value)} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Web / Portfolio</label>
                <input type="url" value={formData.contact.website} onChange={e => handleChange('contact', 'website', e.target.value)} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              </div>
            </div>
          </section>

          {/* Context */}
          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-zinc-900">Contexto de Red</h2>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Notas (Por qué te pueden recordar)</label>
              <textarea rows={3} value={formData.context.notes} onChange={e => handleChange('context', 'notes', e.target.value)} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none" placeholder="Ej: Nos conocimos en el evento Tech 2026..." />
            </div>
          </section>

          {/* Address */}
          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-zinc-900">Dirección</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 mb-1">Dirección</label>
                <input type="text" value={formData.address.street} onChange={e => handleChange('address', 'street', e.target.value)} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Código Postal</label>
                <input type="text" value={formData.address.zip} onChange={e => handleChange('address', 'zip', e.target.value)} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Población</label>
                <input type="text" value={formData.address.city} onChange={e => handleChange('address', 'city', e.target.value)} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Provincia</label>
                <input type="text" value={formData.address.province} onChange={e => handleChange('address', 'province', e.target.value)} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">País</label>
                <input type="text" value={formData.address.country} onChange={e => handleChange('address', 'country', e.target.value)} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              </div>
            </div>
          </section>

          {/* Social */}
          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-zinc-900">Redes Sociales</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">LinkedIn</label>
                <input type="url" value={formData.social.linkedin} onChange={e => handleChange('social', 'linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Instagram</label>
                <input type="url" value={formData.social.instagram} onChange={e => handleChange('social', 'instagram', e.target.value)} placeholder="https://instagram.com/..." className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">X (Twitter)</label>
                <input type="url" value={formData.social.twitter} onChange={e => handleChange('social', 'twitter', e.target.value)} placeholder="https://x.com/..." className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">TikTok</label>
                <input type="url" value={formData.social.tiktok} onChange={e => handleChange('social', 'tiktok', e.target.value)} placeholder="https://tiktok.com/@..." className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
              </div>
            </div>
          </section>

          {/* Settings */}
          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-zinc-900">Configuración del QR</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="qrLogo"
                  checked={formData.settings.qrLogo} 
                  onChange={e => setFormData(prev => ({ ...prev, settings: { ...prev.settings, qrLogo: e.target.checked } }))} 
                  className="w-5 h-5 text-brand-600 rounded border-zinc-300 focus:ring-brand-500"
                />
                <label htmlFor="qrLogo" className="text-sm font-medium text-zinc-700 cursor-pointer">
                  Integrar un logo en el código QR
                </label>
              </div>
              
              {formData.settings.qrLogo && (
                <div className="pl-8">
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Logo para el QR</label>
                  <div className="flex items-center gap-4">
                    {formData.settings.qrLogoUrl && (
                      <img src={formData.settings.qrLogoUrl} alt="QR Logo Preview" className="w-12 h-12 object-contain border border-zinc-200 bg-white rounded-lg p-1" />
                    )}
                    <div className="flex-1">
                      <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-zinc-300 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-colors cursor-pointer">
                        <Upload className="w-5 h-5 text-zinc-500" />
                        <span className="text-sm font-medium text-zinc-700">
                          {uploadingImage ? 'Subiendo...' : 'Subir logo (JPG, PNG)'}
                        </span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleImageUpload('settings', 'qrLogoUrl')}
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium text-lg disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Tarjeta'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
