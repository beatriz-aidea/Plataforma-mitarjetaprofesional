import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import Logo from '../components/Logo';
import { doc, getDoc, setDoc, getDocs, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ArrowLeft, Save, Upload, Lock, Smartphone, User, Phone, Users, MapPin, Share2, Palette, QrCode, Briefcase, Mail, Globe, Check, Plus, Trash2, ExternalLink, Building2 } from 'lucide-react';

export default function EditCard() {
  const { user, userRole, companyId } = useAuth();
  const navigate = useNavigate();
  const { cardId } = useParams();
  const [searchParams] = useSearchParams();
  const targetOwnerUid = searchParams.get('ownerUid');
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [originalOwnerUid, setOriginalOwnerUid] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cardType, setCardType] = useState<'estatica' | 'dinamica'>('dinamica');
  const [availableCustomFields, setAvailableCustomFields] = useState<any[]>([]);
  const [visibleFields, setVisibleFields] = useState<string[] | null>(null);
  const [showPlans, setShowPlans] = useState(false);

  const [formData, setFormData] = useState({
    identity: { firstName: '', lastName: '', company: '', role: '', photoUrl: '', companyLogoUrl: '' },
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
      companyLogoSize: 'M',
      primaryColor: '#000000',
      secondaryColor1: '#ffffff',
      secondaryColor2: '#f4f4f5'
    },
    status: 'active'
  });

  const [customFields, setCustomFields] = useState<Array<{
    fieldId: string,
    label: string, 
    type: string,
    icon: string,
    value: string
  }>>([]);

  useEffect(() => {
    const fetchCard = async () => {
      if (!user) {
        setInitialLoading(false);
        return;
      }

      const isAdminUser = userRole === 'admin';
      setIsAdmin(isAdminUser);

      const loadAssignedFields = async (targetUid: string) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', targetUid));
          const assigned = userDoc.exists() ? userDoc.data().assignedFields || [] : [];
          if (companyId) {
            const compDoc = await getDoc(doc(db, 'companies', companyId));
            const compAssigned = compDoc.exists() ? compDoc.data().assignedFields || [] : [];
            const userFieldIds = new Set(assigned.map((a: any) => a.id || a.fieldId));
            compAssigned.forEach((c: any) => {
              if (!userFieldIds.has(c.id || c.fieldId)) {
                 assigned.push(c);
              }
            });
          }
          const finalCustomFields: any[] = [];
          for (const item of assigned) {
             const fId = item.id || item.fieldId;
             if (!fId) continue;
             const defDoc = await getDoc(doc(db, 'fieldDefinitions', fId));
             if (defDoc.exists()) {
               const defData = defDoc.data();
               finalCustomFields.push({
                 fieldId: fId,
                 label: defData.label,
                 type: defData.type,
                 icon: defData.icon,
                 value: item.value || '',
                 placeholder: defData.placeholder || ''
               });
             }
          }
          setCustomFields(finalCustomFields);
        } catch (err) {
          console.error("Error loading assigned fields", err);
        }
      };

      try {
        // Fetch available custom fields
        const fieldsSnapshot = await getDocs(collection(db, 'customFields'));
        const fieldsData = fieldsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAvailableCustomFields(fieldsData);

        let companyDataFromDb = null;
        if (companyId) {
          try {
            const companyDoc = await getDoc(doc(db, 'companies', companyId));
            if (companyDoc.exists()) {
              companyDataFromDb = companyDoc.data();
              if (companyDataFromDb.visibleFields) {
                setVisibleFields(companyDataFromDb.visibleFields);
              }
            }
          } catch (error) {
            console.error('Error cargando datos de empresa:', error);
          }
        }

        if (!cardId) {
          if (companyDataFromDb) {
            setFormData(prev => ({
              ...prev,
              identity: {
                ...prev.identity,
                company: companyDataFromDb.name || '',
                companyLogoUrl: companyDataFromDb.logoUrl || companyDataFromDb.logo || '',
              },
              settings: {
                ...prev.settings,
                primaryColor: companyDataFromDb.primaryColor || prev.settings.primaryColor,
              },
              customFields: companyDataFromDb.customFields || [],
            }));
          }
          await loadAssignedFields(user.uid);
          setInitialLoading(false);
          return;
        }

        const decodedCardId = decodeURIComponent(cardId);
        const docRef = doc(db, 'cards', decodedCardId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          let hasPermission = data.ownerUid === user?.uid || isAdminUser;

          if (!hasPermission && userRole === 'company_admin' && companyId) {
            // Check if the card owner belongs to the same company
            const ownerDoc = await getDoc(doc(db, 'users', data.ownerUid));
            if (ownerDoc.exists() && ownerDoc.data().companyId === companyId) {
              hasPermission = true;
            }
          }
          
          // Check permissions: owner or admin or company_admin
          if (hasPermission) {
            // Check if free user is trying to edit (allow anonymous users during session)
            if (userRole === 'free' && !isAdminUser && !user.isAnonymous) {
              alert("Los usuarios con plan gratuito no pueden editar sus tarjetas. Por favor, suscríbete para habilitar la edición.");
              navigate(isAdminUser ? '/admin' : '/dashboard');
              return;
            }

            setOriginalOwnerUid(data.ownerUid);
            if (data.cardType) {
              setCardType(data.cardType);
            }
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
              customFields: data.customFields || [],
              settings: {
                qrLogo: data.settings?.qrLogo || false,
                qrLogoUrl: data.settings?.qrLogoUrl || '',
                showPhoto: data.settings?.showPhoto ?? true,
                showLogo: data.settings?.showLogo ?? true,
                primaryColor: data.settings?.primaryColor || '#000000',
                secondaryColor1: data.settings?.secondaryColor1 || '#ffffff',
                secondaryColor2: data.settings?.secondaryColor2 || '#f4f4f5'
              },
              status: data.status || 'active'
            });
            await loadAssignedFields(data.ownerUid);
          } else {
            navigate(isAdminUser ? '/admin' : (userRole === 'company_admin' ? '/empresa' : '/dashboard'));
          }
        } else {
          navigate(isAdminUser ? '/admin' : (userRole === 'company_admin' ? '/empresa' : '/dashboard'));
        }
      } catch (error) {
        console.error("Error fetching card", error);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchCard();
  }, [cardId, user, userRole, navigate]);

  const handleChange = (section: string, field: string, value: string) => {
    if (section === 'social' || (section === 'contact' && field === 'website')) {
      const lower = value.toLowerCase().trimStart();
      if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
        return;
      }
    }

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

  const isFieldVisible = (fieldId: string) => {
    if (visibleFields === null) return true;
    return visibleFields.includes(fieldId) || fieldId === 'name' || fieldId === 'email';
  };

  const handleSubmit = async (e: React.FormEvent, targetPath?: string) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      let id = cardId ? decodeURIComponent(cardId) : null;
      if (!id) {
        // Check if email is provided for new card
        if (!formData.contact.email) {
          alert("Por favor, introduce un correo electrónico.");
          setLoading(false);
          return;
        }
        // Generate ID: 8 random uppercase alphanumeric + email
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let randomPart = '';
        for (let i = 0; i < 8; i++) {
          randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        id = randomPart;
      }
      
      const cardRef = doc(db, 'cards', id);
      
      const payload: any = {
        id,
        ownerUid: originalOwnerUid || (isAdmin && targetOwnerUid ? targetOwnerUid : user.uid),
        isAnonymous: user.isAnonymous,
        ownerRole: userRole,
        cardType,
        ...formData,
        updatedAt: serverTimestamp()
      };

      if (companyId) {
        payload.companyId = companyId;
      }

      if (!cardId) {
        payload.createdAt = serverTimestamp();
      }

      await setDoc(cardRef, payload, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, `cards/${id}`));

      // Sync company to user profile if registered
      if (!user.isAnonymous) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          companyName: formData.identity.company,
          updatedAt: serverTimestamp()
        }).catch(err => console.warn("Could not update user company", err));
      }

      await updateDoc(doc(db, 'users', payload.ownerUid), {
        assignedFields: customFields.map(f => ({
          fieldId: f.fieldId,
          id: f.fieldId,
          value: f.value
        }))
      }).catch(err => console.warn("Could not save assigned fields", err));

      navigate(targetPath || `/success/${encodeURIComponent(id)}`);
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
          <Logo />
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(isAdmin ? '/admin' : (userRole === 'company_admin' ? '/empresa' : '/dashboard'))} className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 font-medium mr-4">
                <ArrowLeft className="w-5 h-5" />
                Volver
              </button>
              <button
                onClick={(e) => handleSubmit(e)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
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
              
              {isFieldVisible('company') && (
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    <Briefcase className="w-4 h-4 text-brand-600" /> EMPRESA
                  </label>
                  <input type="text" value={formData.identity.company} onChange={e => handleChange('identity', 'company', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300" placeholder="Ej. AIDEA Creative" />
                </div>
              )}
              
              {isFieldVisible('role') && (
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    <Briefcase className="w-4 h-4 text-brand-600" /> CARGO
                  </label>
                  <input type="text" value={formData.identity.role} onChange={e => handleChange('identity', 'role', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300" placeholder="Ej. Director Creativo" />
                </div>
              )}
              
              {cardType === 'dinamica' && isFieldVisible('photo') && (
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

              {isFieldVisible('logo') && (
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    <Building2 className="w-4 h-4 text-brand-600" /> Logotipo de Empresa
                    </label>
                    <p className="text-xs text-zinc-400 mb-2">Imagen horizontal de tu empresa (distinta de la foto de perfil)</p>
                    <div className="flex items-center gap-4">
                      {formData.identity.companyLogoUrl && (
                        <img src={formData.identity.companyLogoUrl} alt="Logo empresa" className="h-12 w-auto max-w-[120px] object-contain border border-zinc-200 rounded-lg p-1" />
                      )}
                      <div className="flex-1">
                        <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-zinc-300 rounded-2xl hover:border-brand-600 hover:bg-red-50 transition-colors cursor-pointer">
                          <Upload className="w-5 h-5 text-zinc-500" />
                          <span className="text-sm font-medium text-zinc-700">
                            {uploadingImage ? 'Subiendo...' : 'Subir logotipo (JPG, PNG)'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload('identity', 'companyLogoUrl')}
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
              {isFieldVisible('phone') && (
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
              )}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  <Mail className="w-4 h-4 text-brand-600" /> EMAIL CORPORATIVO
                </label>
                <div className="relative">
                  <input readOnly disabled type="email" value={formData.contact.email} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-0 focus:outline-none bg-zinc-50 text-zinc-500 pr-12 cursor-not-allowed placeholder:text-zinc-300" placeholder="javier@aidea.com" />
                  <Lock className="w-5 h-5 text-zinc-400 absolute right-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              {isFieldVisible('phone') && (
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
              )}
              {isFieldVisible('website') && (
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    <Globe className="w-4 h-4 text-brand-600" /> WEB / PORTFOLIO
                  </label>
                  <input type="text" value={formData.contact.website} onChange={e => handleChange('contact', 'website', e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none text-zinc-700 placeholder:text-zinc-300" placeholder="www.aidea.com" />
                </div>
              )}
            </div>
          </section>

          {/* Context */}
          {isFieldVisible('notes') && (
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
                  <span className="text-xs font-bold text-zinc-400">{(formData.context?.notes?.length || 0)}/100</span>
                </div>
              </div>
            </section>
          )}

          {/* Address */}
          {cardType === 'dinamica' && isFieldVisible('address') && (
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
          {cardType === 'dinamica' && isFieldVisible('social') && (
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
          {isFieldVisible('color') && (
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
          )}

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

          {customFields.length > 0 && (
            <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <Plus className="w-6 h-6 text-brand-600" />
                <h2 className="text-2xl font-bold text-zinc-900">Información adicional</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {customFields.map((field, i) => (
                  <div key={field.fieldId}>
                    <label className="block text-sm font-bold text-zinc-900 mb-2">{field.label}</label>
                    <input 
                      type={field.type === 'custom_date' ? 'date' : 'text'} 
                      value={field.value} 
                      onChange={e => {
                        const newFields = [...customFields];
                        newFields[i].value = e.target.value;
                        setCustomFields(newFields);
                      }}
                      placeholder={field.type === 'custom_url' ? 'https://...' : (field.type === 'preset' ? (field as any).placeholder : '')}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none transition-all"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
          
          <div className="flex justify-end mb-8">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium text-lg disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>

          {/* More Data for Premium/Enterprise/Company */}
          {userRole !== 'company_admin' && (userRole === 'premium' || userRole === 'enterprise' || userRole === 'admin' || userRole === 'company_admin' || !!companyId) && (
            <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm mb-8">
              <div className="flex items-center gap-3 mb-8">
                <Users className="w-6 h-6 text-brand-600" />
                <h2 className="text-2xl font-bold text-zinc-900">Más datos</h2>
              </div>
              
              <div className="space-y-6">
                {(!formData.customFields || formData.customFields.filter(f => isFieldVisible(f.id)).length === 0) ? (
                  <p className="text-zinc-500 text-center italic py-4">Añade campos personalizados a tu tarjeta.</p>
                ) : (
                  <div className="space-y-4">
                    {formData.customFields.filter(field => isFieldVisible(field.id)).map((field) => (
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
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Añadir campo extra:</p>
                    <div className="flex gap-2">
                      <select
                        onChange={(e) => {
                          const field = availableCustomFields.find(f => f.id === e.target.value);
                          if (field) addCustomField(field);
                          e.target.value = "";
                        }}
                        className="flex-1 px-4 py-2 bg-zinc-100 border border-zinc-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                        defaultValue=""
                      >
                        <option value="" disabled>Selecciona un campo para añadir...</option>
                        {availableCustomFields
                          .filter(f => isFieldVisible(f.id))
                          .filter(f => !formData.customFields?.find(cf => cf.id === f.id))
                          .map(field => (
                            <option key={field.id} value={field.id}>
                              {field.label}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Subscription Section */}
          {userRole !== 'company_admin' && (
            <section id="suscribete" className="mt-12 bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
              <h3 className="text-2xl font-bold text-zinc-900 mb-6 text-center">Gestión de Plan</h3>
              
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <p className="text-zinc-600 mb-4">
                  {userRole === 'free' 
                    ? 'Actualmente estás en el plan gratuito. Suscríbete para desbloquear todas las funcionalidades.'
                    : '¿Quieres cambiar o gestionar tu plan actual?'}
                </p>
                <button 
                  type="button"
                  onClick={() => {
                    const plansSection = document.getElementById('planes');
                    if (plansSection) {
                      plansSection.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      navigate('/#planes');
                    }
                  }}
                  className="px-8 py-4 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-600/20"
                >
                  Ver Planes de Suscripción
                </button>
              </div>
            </section>
          )}
        </form>
      </main>
    </div>
  );
}
