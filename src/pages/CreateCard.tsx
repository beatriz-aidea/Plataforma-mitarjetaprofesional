import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import Logo from '../components/Logo';
import { doc, setDoc, getDocs, collection, serverTimestamp, updateDoc, query, where, limit } from 'firebase/firestore';
import { ArrowLeft, Save, Upload, Lock, Smartphone, User, Phone, Users, MapPin, Share2, Palette, QrCode, Briefcase, Mail, Globe, Check, MessageCircle, Plus, Trash2, ExternalLink } from 'lucide-react';

export default function CreateCard() {
  const { user, userRole, signInAnon } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [duplicateEmailError, setDuplicateEmailError] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cardType, setCardType] = useState<'estatica' | 'dinamica'>('dinamica');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [availableCustomFields, setAvailableCustomFields] = useState<any[]>([]);
  const [hasExistingCards, setHasExistingCards] = useState(false);

  useEffect(() => {
    if (user && !user.isAnonymous) {
      const checkExistingCards = async () => {
        try {
          const q = query(collection(db, 'cards'), where('ownerUid', '==', user.uid), limit(1));
          const querySnapshot = await getDocs(q);
          setHasExistingCards(!querySnapshot.empty);
        } catch (error) {
          console.error("Error checking existing cards:", error);
        }
      };
      checkExistingCards();
    }
  }, [user]);

  const [formData, setFormData] = useState({
    identity: { firstName: '', lastName: '', company: '', role: '', photoUrl: '' },
    contact: { mobile: '', landline: '', email: '', website: '' },
    context: { notes: '' },
    address: { street: '', zip: '', city: '', province: '', country: '' },
    social: { linkedin: '', instagram: '', twitter: '', tiktok: '' },
    customFields: [] as any[],
    settings: { 
      qrLogo: false, 
      qrLogoUrl: '',
      showPhoto: true,
      showLogo: true,
      primaryColor: '#D61E51', // Default brand color
      secondaryColor1: '#ffffff',
      secondaryColor2: '#f4f4f5'
    },
    status: 'active'
  });

  useEffect(() => {
    if (user && !user.isAnonymous && user.email) {
      setFormData(prev => ({
        ...prev,
        contact: {
          ...prev.contact,
          email: user.email!
        }
      }));
    }
  }, [user]);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const fieldsSnapshot = await getDocs(collection(db, 'customFields'));
        const fieldsData = fieldsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAvailableCustomFields(fieldsData);
      } catch (error) {
        console.error("Error fetching custom fields", error);
      }
    };
    fetchFields();
  }, []);

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

  const addCustomField = (field: any) => {
    const newCustomFields = [...formData.customFields];
    if (newCustomFields.find(f => f.id === field.id)) return;
    
    newCustomFields.push({
      id: field.id,
      label: field.label,
      type: field.type,
      value: '',
      icon: field.icon
    });
    setFormData({ ...formData, customFields: newCustomFields });
  };

  const removeCustomField = (fieldId: string) => {
    const newCustomFields = formData.customFields.filter(f => f.id !== fieldId);
    setFormData({ ...formData, customFields: newCustomFields });
  };

  const updateCustomFieldValue = (fieldId: string, value: string) => {
    const newCustomFields = formData.customFields.map(f => 
      f.id === fieldId ? { ...f, value } : f
    );
    setFormData({ ...formData, customFields: newCustomFields });
  };

  const handleSubmit = async (e: React.SyntheticEvent, targetPath?: string) => {
    e.preventDefault();
    console.log("handleSubmit called", { user, formData });
    
    // Check if email is provided
    const email = formData.contact.email.trim();
    if (!email) {
      alert("Por favor, introduce un correo electrónico.");
      return;
    }

    setLoading(true);
    setDuplicateEmailError(false);

    try {
      // 1. If no user, sign in anonymously now
      if (!user) {
        try {
          await signInAnon();
        } catch (e) {
          console.error("Error signing in anonymously", e);
          throw new Error("No se pudo iniciar sesión de forma anónima.");
        }
      }
      
      // Use auth.currentUser directly as the state might not have updated yet
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.warn("No user found in handleSubmit after sign-in");
        throw new Error("No se encontró un usuario válido.");
      }

      // 2. Check if this email already has a card BEFORE creating (Skip for admins)
      const isAdmin = userRole === 'admin';
      if (!isAdmin) {
        const q = query(collection(db, 'cards'), where('contact.email', '==', email), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          setDuplicateEmailError(true);
          setLoading(false);
          return;
        }
      }
      
      // Generate ID: 8 random uppercase alphanumeric + email
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let randomPart = '';
      for (let i = 0; i < 8; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      // ID sin email - solo alfanumérico
      const id = randomPart;
      
      const cardRef = doc(db, 'cards', id);
      
      const payload = {
        id,
        ownerUid: currentUser.uid,
        isAnonymous: currentUser.isAnonymous,
        ownerRole: userRole,
        cardType,
        ...formData,
        contact: {
          ...formData.contact,
          email: email // Use trimmed email
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(cardRef, payload).catch(err => handleFirestoreError(err, OperationType.WRITE, `cards/${id}`));

      // Sync company to user profile and update anonymous identifier
      const userRef = doc(db, 'users', currentUser.uid);
      const userUpdates: any = {
        companyName: formData.identity.company,
        updatedAt: serverTimestamp()
      };

      if (currentUser.isAnonymous) {
        // Update anonymous identifier as requested: anon_+id+email
        userUpdates.email = `anon_${currentUser.uid}_${email}`;
      }

      await updateDoc(userRef, userUpdates).catch(err => {
        console.warn("Could not update user profile", err);
        // We don't throw here to not block the main flow if user profile update fails
      });

      console.log("Navigation to target page", targetPath || `/success/${encodeURIComponent(id)}`);
      navigate(targetPath || `/success/${encodeURIComponent(id)}`);
    } catch (error) {
      console.error("Error saving card", error);
      alert("Error al guardar la tarjeta. Por favor, inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    navigate('/enterprise-contact');
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => handleSubmit(e, '/dashboard')}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCardType(cardType === 'dinamica' ? 'estatica' : 'dinamica')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider transition-all border ${
                cardType === 'estatica' 
                  ? 'bg-zinc-900 text-white border-zinc-900' 
                  : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {cardType === 'estatica' ? <Lock className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
              {cardType === 'estatica' ? 'MODO ESTÁTICO' : 'MODO DINÁMICO'}
            </button>
          </div>
          <Logo className="h-10" />
          <div className="w-24"></div> {/* Spacer for balance */}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {duplicateEmailError && (
            <div className="bg-red-50 border border-red-200 p-6 rounded-3xl mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-300">
              <p className="text-red-800 font-medium mb-4">
                Ya tienes una tarjeta creada con este email. Solo se permite una tarjeta gratuita por email. ¿Quieres cambiar de plan?
              </p>
              <button
                type="button"
                onClick={() => {
                  const element = document.getElementById('suscribete');
                  element?.scrollIntoView({ behavior: 'smooth' });
                  setDuplicateEmailError(false);
                }}
                className="px-6 py-2 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/20"
              >
                Ver Planes
              </button>
            </div>
          )}

          {/* Identity */}
          <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <User className="w-6 h-6 text-brand-600" />
              <h2 className="text-2xl font-bold text-zinc-900">Identidad Profesional</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  <User className="w-4 h-4 text-brand-600" /> NOMBRE
                </label>
                <input required type="text" value={formData.identity.firstName} onChange={e => handleChange('identity', 'firstName', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300" placeholder="Ej. Javier" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  <User className="w-4 h-4 text-brand-600" /> APELLIDOS
                </label>
                <input required type="text" value={formData.identity.lastName} onChange={e => handleChange('identity', 'lastName', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300" placeholder="Ej. García" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  <Briefcase className="w-4 h-4 text-brand-600" /> EMPRESA
                </label>
                <input type="text" value={formData.identity.company} onChange={e => handleChange('identity', 'company', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300" placeholder="Ej. AIDEA Creative" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  <Briefcase className="w-4 h-4 text-brand-600" /> CARGO
                </label>
                <input type="text" value={formData.identity.role} onChange={e => handleChange('identity', 'role', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300" placeholder="Ej. Director Creativo" />
              </div>
              
              {cardType === 'dinamica' && (
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    <User className="w-4 h-4 text-brand-600" /> Foto de Perfil / Logo
                  </label>
                  <div className="flex items-center gap-4">
                    {formData.identity.photoUrl && (
                      <img src={formData.identity.photoUrl} alt="Preview" className="w-16 h-16 rounded-full object-cover border border-zinc-200" />
                    )}
                    <div className="flex-1">
                      <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-zinc-300 rounded-2xl hover:border-brand-600 hover:bg-red-50 transition-colors cursor-pointer">
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
              )}
            </div>
          </section>

          {/* Contact */}
          <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <Phone className="w-6 h-6 text-brand-600" />
              <h2 className="text-2xl font-bold text-zinc-900">Contacto Digital</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  <Smartphone className="w-4 h-4 text-brand-600" /> MÓVIL/WHATSAPP
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center justify-between px-4 py-3 border border-zinc-200 rounded-2xl bg-white w-32 shrink-0">
                    <span className="font-bold text-zinc-900">ES (+34)</span>
                    <span className="text-zinc-400 text-xs">▼</span>
                  </div>
                  <input type="tel" value={formData.contact.mobile} onChange={e => handleChange('contact', 'mobile', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300" placeholder="600 000 000" />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  <Mail className="w-4 h-4 text-brand-600" /> EMAIL CORPORATIVO
                </label>
                <input 
                  type="email" 
                  value={formData.contact.email} 
                  onChange={e => handleChange('contact', 'email', e.target.value)} 
                  readOnly={!!(user && !user.isAnonymous && (userRole !== 'premium' || !hasExistingCards))}
                  className={`w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300 ${user && !user.isAnonymous && (userRole !== 'premium' || !hasExistingCards) ? 'bg-zinc-50 cursor-not-allowed' : ''}`}
                  placeholder="javier@aidea.com" 
                />
                {user && !user.isAnonymous && (userRole !== 'premium' || !hasExistingCards) && (
                  <p className="mt-2 text-xs text-zinc-500">Este email está vinculado a tu cuenta de registro y no puede modificarse.</p>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  <Phone className="w-4 h-4 text-brand-600" /> TELÉFONO FIJO
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center justify-between px-4 py-3 border border-zinc-200 rounded-2xl bg-white w-32 shrink-0">
                    <span className="font-bold text-zinc-900">ES (+34)</span>
                    <span className="text-zinc-400 text-xs">▼</span>
                  </div>
                  <input type="tel" value={formData.contact.landline} onChange={e => handleChange('contact', 'landline', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300" placeholder="912 000 000" />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  <Globe className="w-4 h-4 text-brand-600" /> WEB / PORTFOLIO
                </label>
                <input type="text" value={formData.contact.website} onChange={e => handleChange('contact', 'website', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300" placeholder="www.aidea.com" />
              </div>
            </div>
          </section>

          {/* Context */}
          <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <Users className="w-6 h-6 text-brand-600" />
              <h2 className="text-2xl font-bold text-zinc-900">Contexto de Red</h2>
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                <span className="text-brand-600 font-bold">≡</span> POR QUÉ TE PUEDEN RECORDAR
              </label>
              <textarea rows={3} value={formData.context.notes} onChange={e => handleChange('context', 'notes', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none resize-none text-zinc-700 placeholder:text-zinc-300" placeholder="(Tus productos, servicios, proyectos, networking...)" />
              <div className="flex justify-between mt-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">SÉ BREVE, TE LEERÁN MEJOR</span>
                <span className="text-xs font-bold text-zinc-400">{formData.context.notes.length}/100</span>
              </div>
            </div>
          </section>

          {/* Address */}
          {cardType === 'dinamica' && (
            <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <MapPin className="w-6 h-6 text-brand-600" />
                <h2 className="text-2xl font-bold text-zinc-900">Dirección</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    <MapPin className="w-4 h-4 text-brand-600" /> Dirección
                  </label>
                  <input type="text" value={formData.address.street} onChange={e => handleChange('address', 'street', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    Código Postal
                  </label>
                  <input type="text" value={formData.address.zip} onChange={e => handleChange('address', 'zip', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    Población
                  </label>
                  <input type="text" value={formData.address.city} onChange={e => handleChange('address', 'city', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    Provincia
                  </label>
                  <input type="text" value={formData.address.province} onChange={e => handleChange('address', 'province', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    País
                  </label>
                  <input type="text" value={formData.address.country} onChange={e => handleChange('address', 'country', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300" />
                </div>
              </div>
            </section>
          )}

          {/* Social */}
          {cardType === 'dinamica' && (
            <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <Share2 className="w-6 h-6 text-brand-600" />
                <h2 className="text-2xl font-bold text-zinc-900">Redes Sociales</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    LinkedIn
                  </label>
                  <input type="text" value={formData.social.linkedin} onChange={e => handleChange('social', 'linkedin', e.target.value)} placeholder="www.linkedin.com/in/..." className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    Instagram
                  </label>
                  <input type="text" value={formData.social.instagram} onChange={e => handleChange('social', 'instagram', e.target.value)} placeholder="www.instagram.com/..." className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    X (Twitter)
                  </label>
                  <input type="text" value={formData.social.twitter} onChange={e => handleChange('social', 'twitter', e.target.value)} placeholder="www.x.com/..." className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    TikTok
                  </label>
                  <input type="text" value={formData.social.tiktok} onChange={e => handleChange('social', 'tiktok', e.target.value)} placeholder="www.tiktok.com/@..." className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300" />
                </div>
              </div>
            </section>
          )}

          {/* Design and Colors */}
          <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <Palette className="w-6 h-6 text-brand-600" />
              <h2 className="text-2xl font-bold text-zinc-900">Diseño y Colores</h2>
            </div>
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="showPhoto" className="text-sm font-medium text-zinc-700 cursor-pointer">
                    Mostrar foto de perfil en la tarjeta pública
                  </label>
                  <div className="relative inline-block w-12 h-6 align-middle select-none transition duration-200 ease-in">
                    <input 
                      type="checkbox" 
                      id="showPhoto" 
                      checked={formData.settings.showPhoto}
                      onChange={e => setFormData(prev => ({ ...prev, settings: { ...prev.settings, showPhoto: e.target.checked } }))}
                      className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out"
                      style={{ transform: formData.settings.showPhoto ? 'translateX(100%)' : 'translateX(0)', borderColor: formData.settings.showPhoto ? '#059669' : '#d4d4d8' }}
                    />
                    <label 
                      htmlFor="showPhoto" 
                      className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${formData.settings.showPhoto ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                    ></label>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <label htmlFor="showLogo" className="text-sm font-medium text-zinc-700 cursor-pointer">
                    Mostrar logotipo en la tarjeta pública
                  </label>
                  <div className="relative inline-block w-12 h-6 align-middle select-none transition duration-200 ease-in">
                    <input 
                      type="checkbox" 
                      id="showLogo" 
                      checked={formData.settings.showLogo}
                      onChange={e => setFormData(prev => ({ ...prev, settings: { ...prev.settings, showLogo: e.target.checked } }))}
                      className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out"
                      style={{ transform: formData.settings.showLogo ? 'translateX(100%)' : 'translateX(0)', borderColor: formData.settings.showLogo ? '#059669' : '#d4d4d8' }}
                    />
                    <label 
                      htmlFor="showLogo" 
                      className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${formData.settings.showLogo ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                    ></label>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-zinc-100">
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Color Principal de la Tarjeta</label>
                  <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-sm border-2 border-zinc-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                      <input 
                        type="color" 
                        value={formData.settings.primaryColor} 
                        onChange={e => setFormData(prev => ({ ...prev, settings: { ...prev.settings, primaryColor: e.target.value } }))}
                        className="absolute -top-2 -left-2 w-20 h-20 cursor-pointer border-0 p-0"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <input 
                        type="text" 
                        value={formData.settings.primaryColor} 
                        onChange={e => setFormData(prev => ({ ...prev, settings: { ...prev.settings, primaryColor: e.target.value } }))}
                        className="text-sm font-bold text-zinc-900 uppercase bg-transparent border-b border-zinc-200 outline-none focus:border-brand-600"
                      />
                      <span className="text-xs text-zinc-500">Haz clic en el cuadro o escribe el código</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Settings */}
          <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <QrCode className="w-6 h-6 text-brand-600" />
              <h2 className="text-2xl font-bold text-zinc-900">Configuración del QR</h2>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="qrLogo"
                  checked={formData.settings.qrLogo} 
                  onChange={e => setFormData(prev => ({ ...prev, settings: { ...prev.settings, qrLogo: e.target.checked } }))} 
                  className="w-5 h-5 text-brand-600 rounded border-zinc-300 focus:ring-brand-600"
                />
                <label htmlFor="qrLogo" className="text-sm font-bold text-zinc-700 cursor-pointer">
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
          
          <div className="flex justify-end mb-8">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium text-lg disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Crear tarjeta y Qr'}
            </button>
          </div>

          {/* More Data for Premium/Enterprise */}
          {(userRole === 'premium' || userRole === 'enterprise' || userRole === 'admin') && (
            <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm mb-8">
              <div className="flex items-center gap-3 mb-8">
                <Users className="w-6 h-6 text-brand-600" />
                <h2 className="text-2xl font-bold text-zinc-900">Más datos</h2>
              </div>
              
              <div className="space-y-6">
                {formData.customFields.length === 0 ? (
                  <p className="text-zinc-500 text-center italic py-4">Añade campos personalizados a tu tarjeta.</p>
                ) : (
                  <div className="space-y-4">
                    {formData.customFields.map((field) => (
                      <div key={field.id} className="flex gap-3 items-end">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                            {field.label}
                          </label>
                          <input
                            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                            value={field.value}
                            onChange={(e) => updateCustomFieldValue(field.id, e.target.value)}
                            className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300"
                            placeholder={`Introduce ${field.label.toLowerCase()}`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCustomField(field.id)}
                          className="p-3 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors mb-0.5"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {availableCustomFields.length > 0 && (
                  <div className="pt-4 border-t border-zinc-100">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Campos disponibles para añadir:</p>
                    <div className="flex flex-wrap gap-2">
                      {availableCustomFields
                        .filter(f => !formData.customFields.find(cf => cf.id === f.id))
                        .map(field => (
                          <button
                            key={field.id}
                            type="button"
                            onClick={() => addCustomField(field)}
                            className="px-4 py-2 bg-zinc-100 hover:bg-brand-50 hover:text-brand-600 text-zinc-700 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border border-transparent hover:border-brand-200"
                          >
                            <Plus className="w-4 h-4" />
                            {field.label}
                          </button>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Subscription Section (Hide for admins) */}
          {userRole !== 'admin' && (
            <section id="suscribete" className="mt-12 bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
              <h3 className="text-2xl font-bold text-zinc-900 mb-6 text-center">¿Necesitas un plan mejor? ¡Suscríbete!</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {/* Standard */}
                <div className="p-6 border border-zinc-100 rounded-2xl bg-zinc-50 flex flex-col">
                  <h4 className="font-bold text-lg mb-2">Estándar</h4>
                  <p className="text-2xl font-bold text-brand-600 mb-1">1,50€<span className="text-sm text-zinc-500 font-normal">/mes</span></p>
                  <p className="text-xs text-zinc-400 mb-4">IVA NO INCLUIDO</p>
                  <ul className="text-sm text-zinc-600 space-y-2 mb-6 flex-1">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Landing page personalizada</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Modificación ilimitada</li>
                  </ul>
                  <button type="button" onClick={() => navigate('/crear')} className="w-full py-2 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors">
                    Suscribirse (Pasarela de pago)
                  </button>
                </div>

                {/* Premium */}
                <div className="p-6 border-2 border-brand-600 rounded-2xl bg-white flex flex-col relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Más Popular
                  </div>
                  <h4 className="font-bold text-lg mb-2">Premium</h4>
                  <p className="text-2xl font-bold text-brand-600 mb-1">2,50€<span className="text-sm text-zinc-500 font-normal">/mes</span></p>
                  <p className="text-xs text-zinc-400 mb-4">IVA NO INCLUIDO</p>
                  <ul className="text-sm text-zinc-600 space-y-2 mb-6 flex-1">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Todo lo del plan estándar</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Creación de varias tarjetas</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Compartir tarjeta online</li>
                  </ul>
                  <button type="button" onClick={() => navigate('/crear')} className="w-full py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors">
                    Suscribirse (Pasarela de pago)
                  </button>
                </div>

                {/* Enterprise */}
                <div className="p-6 border border-zinc-100 rounded-2xl bg-zinc-50 flex flex-col">
                  <h4 className="font-bold text-lg mb-2">Empresa/Usuario</h4>
                  <p className="text-2xl font-bold text-zinc-900 mb-1">A medida</p>
                  <p className="text-xs text-zinc-400 mb-4">IVA NO INCLUIDO</p>
                  <ul className="text-sm text-zinc-600 space-y-2 mb-6 flex-1">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Todo lo que el resto de planes</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Gestión de equipos</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Control corporativo</li>
                  </ul>
                  <button type="button" onClick={() => navigate('/enterprise-contact')} className="w-full py-2 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors text-center">
                    Contactar con ventas
                  </button>
                </div>
              </div>
            </section>
          )}
        </form>
      </main>

      {/* Success Modal removed as it's now on the separate page */}
    </div>
  );
}
