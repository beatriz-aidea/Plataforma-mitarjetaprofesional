import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, query, collection, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, Save, Upload } from 'lucide-react';

export default function EditCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { cardId } = useParams();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [originalOwnerUid, setOriginalOwnerUid] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    identity: { firstName: '', lastName: '', company: '', role: '', photoUrl: '' },
    contact: { mobile: '', landline: '', email: '', website: '' },
    context: { notes: '' },
    address: { street: '', zip: '', city: '', province: '', country: '' },
    social: { linkedin: '', instagram: '', twitter: '', tiktok: '' },
    status: 'active'
  });

  useEffect(() => {
    const fetchCard = async () => {
      if (!cardId) {
        setInitialLoading(false);
        return;
      }
      try {
        const docRef = doc(db, 'cards', cardId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Check if current user is owner or admin
          let isAdmin = false;
          if (user?.email === 'beatriz@aidea.es') {
            isAdmin = true;
          } else if (user) {
            const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
            if (!userDoc.empty && userDoc.docs[0].data().role === 'admin') {
              isAdmin = true;
            }
          }

          if (data.ownerUid === user?.uid || isAdmin) {
            setOriginalOwnerUid(data.ownerUid);
            setFormData({
              identity: { ...formData.identity, ...data.identity },
              contact: { ...formData.contact, ...data.contact },
              context: { ...formData.context, ...data.context },
              address: { ...formData.address, ...data.address },
              social: { ...formData.social, ...data.social },
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingImage(true);
    try {
      const id = cardId || crypto.randomUUID();
      const storageRef = ref(storage, `cards/${id}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      
      handleChange('identity', 'photoUrl', downloadUrl);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Error al subir la imagen. Asegúrate de que el archivo no sea muy grande.");
    } finally {
      setUploadingImage(false);
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
        ownerUid: originalOwnerUid || user.uid,
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
                        onChange={handleImageUpload}
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
