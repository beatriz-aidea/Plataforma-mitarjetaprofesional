import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { ShoppingBag, Upload, CreditCard, CheckCircle2, ArrowLeft, Palette, Smartphone, Tag, ChevronDown, ChevronUp, Download, FileText } from 'lucide-react';
import CardTemplate from '../components/CardTemplate';
import Logo from '../components/Logo';
import { QRCodeSVG } from 'qrcode.react';

const CATEGORIES = [
  {
    id: 'classic',
    name: 'Tarjetas Clásicas',
    icon: CreditCard,
    features: ['85x55 mm', 'Estucado 350 gr', 'Impresión 2 caras'],
    options: [
      { id: 'classic-100', name: '100 und.', quantity: 100, price: 22 },
      { id: 'classic-250', name: '250 und.', quantity: 250, price: 28 },
      { id: 'classic-500', name: '500 und.', quantity: 500, price: 35 },
      { id: 'classic-1000', name: '1000 und.', quantity: 1000, price: 40 },
    ]
  },
  {
    id: 'pvc',
    name: 'Tarjeta PVC',
    icon: CreditCard,
    features: ['85x54 mm', 'PVC 840 micras'],
    options: [
      { id: 'pvc-qr', name: 'PVC + QR', price: 20 },
      { id: 'pvc-qr-nfc', name: 'PVC + QR + NFC', price: 30 },
    ]
  },
  {
    id: 'nfc',
    name: 'Otros productos NFC',
    icon: Smartphone,
    features: ['Llaveros, pegatinas y más', 'Conexión instantánea'],
    isGallery: true
  }
];

const DESIGNS = Array.from({ length: 20 }, (_, i) => ({
  id: `template-${i + 1}`,
  name: `Plantilla ${String(i + 1).padStart(2, '0')}`,
  price: 15,
  templateId: i + 1
}));

export default function Store() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<any[]>([]);
  const [nfcProducts, setNfcProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCard, setSelectedCard] = useState<string>('');
  
  const [expandedCategory, setExpandedCategory] = useState<string | null>('classic');
  const [selectedProduct, setSelectedProduct] = useState<any>({
    categoryId: 'classic',
    optionId: 'classic-100',
    name: 'Tarjetas Clásicas - 100 und.',
    price: 22,
    isCard: true
  });

  const [designMode, setDesignMode] = useState<'template' | 'custom'>('template');
  const [customDesignImage, setCustomDesignImage] = useState<string | null>(null);
  const [selectedDesign, setSelectedDesign] = useState(DESIGNS[0]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [qrLogoPreview, setQrLogoPreview] = useState<string | null>(null);
  const [corporateColor, setCorporateColor] = useState<string>('#d60b52');
  
  const [step, setStep] = useState(1);
  const [billingType, setBillingType] = useState<'autonomo' | 'empresa'>('autonomo');
  const [billing, setBilling] = useState({
    firstName: '', lastName: '', company: '', nif: '', street: '', city: '', province: '', zip: '', country: '', phone: ''
  });
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(true);
  const [shipping, setShipping] = useState({
    fullName: '', company: '', street: '', city: '', province: '', zip: '', phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCopyFromCard = () => {
    if (activeCardData) {
      setBilling(prev => ({
        ...prev,
        firstName: activeCardData.identity?.firstName || '',
        lastName: activeCardData.identity?.lastName || '',
        company: activeCardData.identity?.company || ''
      }));
    }
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const q = query(collection(db, 'cards'), where('ownerUid', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const cardsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        setCards(cardsData);
        if (cardsData.length > 0) {
          setSelectedCard(cardsData[0].id);
          if (cardsData[0].identity?.photoUrl) {
            setLogoPreview(cardsData[0].identity.photoUrl);
          }
        }

        const productsSnapshot = await getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc')));
        const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNfcProducts(productsData);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleQrLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setQrLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCustomDesignUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 10MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setCustomDesignImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCard) return;
    
    setIsSubmitting(true);
    try {
      const orderId = crypto.randomUUID();
      await setDoc(doc(db, 'orders', orderId), {
        id: orderId,
        userId: user.uid,
        cardId: selectedCard,
        productId: selectedProduct.optionId || selectedProduct.id,
        productName: selectedProduct.name,
        price: selectedProduct.price,
        designMode: selectedProduct.isCard ? designMode : null,
        design: selectedProduct.isCard ? (designMode === 'template' ? selectedDesign.id : 'custom') : null,
        corporateColor: selectedProduct.isCard ? corporateColor : null,
        logoUrl: selectedProduct.isCard && designMode === 'template' ? (logoPreview || '') : '', 
        qrLogoUrl: selectedProduct.isCard ? (qrLogoPreview || '') : '',
        customDesignUrl: selectedProduct.isCard && designMode === 'custom' ? (customDesignImage || '') : '',
        status: 'paid',
        billingAddress: billing,
        billingType: billingType,
        shippingAddress: shippingSameAsBilling ? billing : shipping,
        createdAt: serverTimestamp()
      });
      
      setStep(4); // Success step
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Error al procesar el pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
    logo: true,
    firstName: true,
    lastName: true,
    role: true,
    mobile: true,
    landline: false,
    email: true,
    website: true,
    company: false,
    linkedin: false,
    instagram: false,
    twitter: false,
    tiktok: false,
  });
  const [showAllFields, setShowAllFields] = useState(false);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  const activeCardData = cards.find(c => c.id === selectedCard);

  const templateData = {
    firstName: selectedFields.firstName ? (activeCardData?.identity?.firstName || 'NOMBRE') : '',
    lastName: selectedFields.lastName ? (activeCardData?.identity?.lastName || 'APELLIDO') : '',
    role: selectedFields.role ? (activeCardData?.identity?.role || 'Cargo profesional') : '',
    company: selectedFields.company ? (activeCardData?.identity?.company || 'Empresa') : '',
    mobile: selectedFields.mobile ? (activeCardData?.contact?.mobile || '+34 600 000 000') : '',
    landline: selectedFields.landline ? (activeCardData?.contact?.landline || '+34 900 000 000') : '',
    email: selectedFields.email ? (activeCardData?.contact?.email || 'hola@mitarjetaprofesional.com') : '',
    website: selectedFields.website ? (activeCardData?.contact?.website || 'www.mitarjetaprofesional.com') : '',
    linkedin: selectedFields.linkedin ? (activeCardData?.social?.linkedin || 'linkedin.com/in/usuario') : '',
    instagram: selectedFields.instagram ? (activeCardData?.social?.instagram || '@usuario') : '',
    twitter: selectedFields.twitter ? (activeCardData?.social?.twitter || '@usuario') : '',
    tiktok: selectedFields.tiktok ? (activeCardData?.social?.tiktok || '@usuario') : '',
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans pb-20">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 font-medium">
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <Logo className="h-8" />
          <span className="ml-2 font-semibold text-zinc-900">Tienda</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {cards.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-zinc-200">
            <h2 className="text-xl font-bold mb-4">Primero necesitas una tarjeta digital</h2>
            <p className="text-zinc-600 mb-6">Crea tu perfil profesional antes de pedir una tarjeta física.</p>
            <button onClick={() => navigate('/edit')} className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium">
              Crear Tarjeta Digital
            </button>
          </div>
        ) : step === 4 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-zinc-200 shadow-sm max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">¡Pedido Confirmado!</h2>
            <p className="text-lg text-zinc-600 mb-8">
              Tu pedido está en proceso de fabricación. Te notificaremos cuando sea enviado.
            </p>
            <button onClick={() => navigate('/dashboard')} className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800">
              Volver a mis tarjetas
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Left Column: Form Steps */}
            <div className="space-y-8">
              {/* Step 1: Select Card & Design */}
              <section className={`bg-white p-6 rounded-2xl border ${step === 1 ? 'border-brand-500 shadow-md' : 'border-zinc-200 opacity-60'}`}>
                <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-sm">1</span>
                  Selección de Producto
                </h2>
                
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Selecciona la tarjeta digital a enlazar</label>
                      <select 
                        value={selectedCard} 
                        onChange={(e) => setSelectedCard(e.target.value)}
                        className="w-full px-4 py-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                      >
                        {cards.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.identity?.firstName} {c.identity?.lastName} - {c.identity?.role}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-4">Selecciona el producto</label>
                      <div className="space-y-4">
                        {CATEGORIES.map(category => {
                          const Icon = category.icon;
                          const isExpanded = expandedCategory === category.id;
                          return (
                            <div key={category.id} className="border border-zinc-200 rounded-xl overflow-hidden">
                              <button
                                onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                                className={`w-full flex items-center justify-between p-4 bg-zinc-50 hover:bg-zinc-100 transition-colors ${isExpanded ? 'border-b border-zinc-200' : ''}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-600">
                                    <Icon className="w-5 h-5" />
                                  </div>
                                  <div className="text-left">
                                    <h3 className="font-semibold text-zinc-900">{category.name}</h3>
                                    <p className="text-xs text-zinc-500">{category.features?.join(' • ')}</p>
                                  </div>
                                </div>
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
                              </button>
                              
                              {isExpanded && !category.isGallery && category.options && (
                                <div className="p-3 bg-white grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {category.options.map(option => (
                                    <button
                                      key={option.id}
                                      onClick={() => setSelectedProduct({
                                        categoryId: category.id,
                                        optionId: option.id,
                                        name: `${category.name} - ${option.name}`,
                                        price: option.price,
                                        isCard: true
                                      })}
                                      className={`p-2 rounded-lg border text-left transition-all ${selectedProduct.optionId === option.id ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-zinc-200 hover:border-zinc-300'}`}
                                    >
                                      <div className="font-medium text-sm text-zinc-900 leading-tight">{option.name}</div>
                                      <div className="text-brand-600 font-bold text-sm mt-1">{option.price}€</div>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {isExpanded && category.isGallery && (
                                <div className="p-3 bg-white grid grid-cols-3 sm:grid-cols-4 gap-3">
                                  {nfcProducts.length > 0 ? nfcProducts.map(product => (
                                    <button
                                      key={product.id}
                                      onClick={() => setSelectedProduct({
                                        categoryId: category.id,
                                        optionId: product.id,
                                        name: product.name,
                                        price: product.price,
                                        isCard: false,
                                        imageUrl: product.imageUrl
                                      })}
                                      className={`group rounded-xl border overflow-hidden transition-all ${selectedProduct.optionId === product.id ? 'border-brand-600 ring-2 ring-brand-600' : 'border-zinc-200 hover:border-zinc-300'}`}
                                    >
                                      <div className="aspect-square bg-zinc-100 relative">
                                        {product.imageUrl ? (
                                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                            <Smartphone className="w-6 h-6" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="p-2 text-left">
                                        <div className="font-medium text-xs text-zinc-900 truncate">{product.name}</div>
                                        <div className="text-brand-600 font-bold text-sm mt-0.5">{product.price}€</div>
                                      </div>
                                    </button>
                                  )) : (
                                    <div className="col-span-full py-8 text-center text-zinc-500 text-sm">
                                      No hay productos NFC disponibles en este momento.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 text-xs text-zinc-500 text-center bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                        <span className="font-medium text-zinc-700">Información importante:</span> IVA NO INCLUIDO • PORTES INCLUIDOS • ENTREGA 7-10 DÍAS
                      </div>
                    </div>

                    {selectedProduct.isCard && (
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-2">¿Cómo quieres diseñar el anverso?</label>
                        <div className="flex gap-4">
                          <button 
                            onClick={() => setDesignMode('template')} 
                            className={`flex-1 py-3 rounded-xl font-medium border-2 transition-colors ${designMode === 'template' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}
                          >
                            Usar Plantillas
                          </button>
                          <button 
                            onClick={() => setDesignMode('custom')} 
                            className={`flex-1 py-3 rounded-xl font-medium border-2 transition-colors ${designMode === 'custom' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}
                          >
                            Subir mi diseño
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedProduct.isCard && designMode === 'template' ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-2">Color Corporativo (Fondo del reverso y acentos)</label>
                          <div className="flex items-center gap-4">
                            <input 
                              type="color" 
                              value={corporateColor} 
                              onChange={(e) => setCorporateColor(e.target.value)}
                              className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                            />
                            <div className="flex-1 flex items-center gap-2 px-4 py-3 border border-zinc-300 rounded-xl">
                              <Palette className="w-5 h-5 text-zinc-400" />
                              <input 
                                type="text" 
                                value={corporateColor}
                                onChange={(e) => setCorporateColor(e.target.value)}
                                className="w-full outline-none text-zinc-700 font-mono uppercase"
                                placeholder="#000000"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-2">Elige un diseño base</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto p-2 border border-zinc-200 rounded-xl bg-zinc-50">
                            {DESIGNS.map(design => (
                              <button
                                key={design.id}
                                onClick={() => setSelectedDesign(design)}
                                className={`relative rounded-xl border-2 text-center transition-all overflow-hidden bg-white ${selectedDesign.id === design.id ? 'border-brand-600 ring-2 ring-brand-600/20' : 'border-zinc-200 hover:border-zinc-300'}`}
                              >
                                <div className="w-full aspect-[1.58] relative pointer-events-none overflow-hidden">
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      width: '340px',
                                      height: '215px',
                                      transformOrigin: 'top left',
                                      transform: `scale(var(--thumb-scale))`,
                                    }}
                                    ref={(el) => {
                                      if (el) {
                                        const parent = el.parentElement;
                                        if (parent) {
                                          const scale = parent.offsetWidth / 340;
                                          el.style.setProperty('--thumb-scale', String(scale));
                                        }
                                      }
                                    }}
                                  >
                                    <CardTemplate
                                      templateId={design.templateId}
                                      color={corporateColor}
                                      logo={selectedFields.logo ? logoPreview : undefined}
                                      data={templateData}
                                    />
                                  </div>
                                </div>
                                <div className="p-2 border-t border-zinc-100 bg-white relative z-10">
                                  <div className="text-xs font-medium text-zinc-900">{design.name}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-2">Logo Personalizado (Opcional)</label>
                          <div className="border-2 border-dashed border-zinc-300 rounded-xl p-6 text-center hover:bg-zinc-50 transition-colors relative">
                            <input 
                              type="file" 
                              accept="image/jpeg, image/png, application/pdf" 
                              onChange={handleLogoUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                            <p className="text-sm text-zinc-600">Haz clic o arrastra tu logo aquí</p>
                            <p className="text-xs text-zinc-400 mt-1">Formatos recomendados: JPG, PNG. Tamaño máximo: 5MB.</p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-2">Datos a mostrar en la tarjeta</label>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              {Object.entries({
                                logo: 'Logo / Foto',
                                firstName: 'Nombre',
                                lastName: 'Apellidos',
                                mobile: 'Móvil',
                                landline: 'Teléfono fijo',
                                email: 'Correo electrónico',
                                website: 'Web'
                              }).map(([key, label]) => (
                                <label key={key} className="flex items-center gap-2 p-3 border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-50">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedFields[key]} 
                                    onChange={(e) => setSelectedFields(prev => ({ ...prev, [key]: e.target.checked }))}
                                    className="w-4 h-4 text-brand-600 rounded border-zinc-300 focus:ring-brand-500"
                                  />
                                  <span className="text-sm font-medium text-zinc-700">{label}</span>
                                </label>
                              ))}
                            </div>
                            
                            {showAllFields && (
                              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-100">
                                {Object.entries({
                                  role: 'Cargo',
                                  company: 'Empresa',
                                  linkedin: 'LinkedIn',
                                  instagram: 'Instagram',
                                  twitter: 'Twitter',
                                  tiktok: 'TikTok'
                                }).map(([key, label]) => (
                                  <label key={key} className="flex items-center gap-2 p-3 border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-50">
                                    <input 
                                      type="checkbox" 
                                      checked={selectedFields[key]} 
                                      onChange={(e) => setSelectedFields(prev => ({ ...prev, [key]: e.target.checked }))}
                                      className="w-4 h-4 text-brand-600 rounded border-zinc-300 focus:ring-brand-500"
                                    />
                                    <span className="text-sm font-medium text-zinc-700">{label}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                            
                            <button 
                              type="button"
                              onClick={() => setShowAllFields(!showAllFields)}
                              className="w-full py-2 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                            >
                              {showAllFields ? 'Ocultar campos adicionales' : 'Más campos'}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : selectedProduct.isCard && designMode === 'custom' ? (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-2">Sube el diseño de tu tarjeta (Anverso)</label>
                          <div className="border-2 border-dashed border-zinc-300 rounded-xl p-8 text-center hover:bg-zinc-50 transition-colors relative">
                            <input 
                              type="file" 
                              accept="image/jpeg, image/png, application/pdf" 
                              onChange={handleCustomDesignUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Upload className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
                            <p className="text-sm font-medium text-zinc-900 mb-1">Haz clic para subir o tomar una foto</p>
                            <p className="text-xs text-zinc-500">Formatos recomendados: JPG, PNG. Tamaño máximo: 5MB.<br/>Para diseños completos, usar proporciones 85x54mm.</p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-2">Color Corporativo (Fondo del reverso)</label>
                          <div className="flex items-center gap-4">
                            <input 
                              type="color" 
                              value={corporateColor} 
                              onChange={(e) => setCorporateColor(e.target.value)}
                              className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                            />
                            <div className="flex-1 flex items-center gap-2 px-4 py-3 border border-zinc-300 rounded-xl">
                              <Palette className="w-5 h-5 text-zinc-400" />
                              <input 
                                type="text" 
                                value={corporateColor}
                                onChange={(e) => setCorporateColor(e.target.value)}
                                className="w-full outline-none text-zinc-700 font-mono uppercase"
                                placeholder="#000000"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {selectedProduct.isCard && (
                      <div className="pt-6 border-t border-zinc-200 mt-6">
                        <label className="block text-sm font-medium text-zinc-700 mb-2">Logo para el QR / Isotipo (Opcional)</label>
                        <div className="border-2 border-dashed border-zinc-300 rounded-xl p-6 text-center hover:bg-zinc-50 transition-colors relative">
                          <input 
                            type="file" 
                            accept="image/jpeg, image/png, image/svg+xml" 
                            onChange={handleQrLogoUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                          <p className="text-sm font-medium text-zinc-900 mb-1">Sube el isotipo para el QR</p>
                          <p className="text-xs text-zinc-500">Se integrará en el centro del código QR sin deformar.</p>
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={() => setStep(2)}
                      disabled={selectedProduct.isCard && designMode === 'custom' && !customDesignImage}
                      className="w-full py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                    >
                      Continuar al Envío
                    </button>
                  </div>
                )}
              </section>

              {/* Step 2: Shipping */}
              <section className={`bg-white p-6 rounded-2xl border ${step === 2 ? 'border-brand-500 shadow-md' : 'border-zinc-200 opacity-60'}`}>
                <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-sm">2</span>
                  Datos Facturación/Envío
                </h2>
                
                {step === 2 && (
                  <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-zinc-900">Datos de Facturación</h3>
                        {activeCardData && (
                          <button type="button" onClick={handleCopyFromCard} className="text-sm text-brand-600 font-medium hover:text-brand-700">
                            (Copiar datos de la tarjeta)
                          </button>
                        )}
                      </div>
                      
                      <div className="flex gap-4 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="billingType" checked={billingType === 'autonomo'} onChange={() => setBillingType('autonomo')} className="text-brand-600 focus:ring-brand-500" />
                          <span className="text-sm font-medium text-zinc-700">Autónomo</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="billingType" checked={billingType === 'empresa'} onChange={() => setBillingType('empresa')} className="text-brand-600 focus:ring-brand-500" />
                          <span className="text-sm font-medium text-zinc-700">Empresa</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre {billingType === 'empresa' && '(Opcional)'}</label>
                          <input required={billingType === 'autonomo'} type="text" value={billing.firstName} onChange={e => setBilling({...billing, firstName: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-1">Apellidos {billingType === 'empresa' && '(Opcional)'}</label>
                          <input required={billingType === 'autonomo'} type="text" value={billing.lastName} onChange={e => setBilling({...billing, lastName: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-1">Empresa {billingType === 'autonomo' && '(Opcional)'}</label>
                          <input required={billingType === 'empresa'} type="text" value={billing.company} onChange={e => setBilling({...billing, company: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-1">NIF/CIF</label>
                          <input required type="text" value={billing.nif} onChange={e => setBilling({...billing, nif: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Dirección</label>
                        <input required type="text" value={billing.street} onChange={e => setBilling({...billing, street: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-1">Código Postal</label>
                          <input required type="text" value={billing.zip} onChange={e => setBilling({...billing, zip: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-1">Población</label>
                          <input required type="text" value={billing.city} onChange={e => setBilling({...billing, city: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-1">Provincia</label>
                          <input required type="text" value={billing.province} onChange={e => setBilling({...billing, province: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-1">País</label>
                          <input required type="text" value={billing.country} onChange={e => setBilling({...billing, country: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Teléfono de contacto</label>
                        <input required type="tel" value={billing.phone} onChange={e => setBilling({...billing, phone: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-zinc-200 space-y-4">
                      <h3 className="text-lg font-semibold text-zinc-900">Datos de Envío</h3>
                      <div className="flex gap-4 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" checked={shippingSameAsBilling} onChange={() => setShippingSameAsBilling(true)} className="text-brand-600 focus:ring-brand-500" />
                          <span className="text-sm font-medium text-zinc-700">Igual que facturación</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" checked={!shippingSameAsBilling} onChange={() => setShippingSameAsBilling(false)} className="text-brand-600 focus:ring-brand-500" />
                          <span className="text-sm font-medium text-zinc-700">Otros</span>
                        </label>
                      </div>

                      {!shippingSameAsBilling && (
                        <div className="space-y-4 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre</label>
                              <input required type="text" value={shipping.fullName} onChange={e => setShipping({...shipping, fullName: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-zinc-700 mb-1">Empresa</label>
                              <input type="text" value={shipping.company} onChange={e => setShipping({...shipping, company: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Dirección</label>
                            <input required type="text" value={shipping.street} onChange={e => setShipping({...shipping, street: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-zinc-700 mb-1">Código Postal</label>
                              <input required type="text" value={shipping.zip} onChange={e => setShipping({...shipping, zip: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-zinc-700 mb-1">Población</label>
                              <input required type="text" value={shipping.city} onChange={e => setShipping({...shipping, city: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-zinc-700 mb-1">Provincia</label>
                              <input required type="text" value={shipping.province} onChange={e => setShipping({...shipping, province: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-zinc-700 mb-1">Teléfono de contacto</label>
                              <input required type="tel" value={shipping.phone} onChange={e => setShipping({...shipping, phone: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-4 pt-4">
                      <button type="button" onClick={() => setStep(1)} className="px-6 py-3 bg-zinc-100 text-zinc-900 rounded-xl font-medium hover:bg-zinc-200 transition-colors">
                        Atrás
                      </button>
                      <button type="submit" className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors">
                        Continuar al Pago
                      </button>
                    </div>
                  </form>
                )}
              </section>

              {/* Step 3: Payment */}
              <section className={`bg-white p-6 rounded-2xl border ${step === 3 ? 'border-brand-500 shadow-md' : 'border-zinc-200 opacity-60'}`}>
                <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-sm">3</span>
                  Pago Seguro
                </h2>
                
                {step === 3 && (
                  <form onSubmit={handleCheckout} className="space-y-6">
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 mb-6">
                      <div className="flex justify-between mb-2">
                        <span className="text-zinc-600">{selectedProduct.name}</span>
                        <span className="font-medium">{selectedProduct.price}€</span>
                      </div>
                      <div className="flex justify-between mb-4">
                        <span className="text-zinc-600">Envío</span>
                        <span className="font-medium">Gratis</span>
                      </div>
                      <div className="flex justify-between pt-4 border-t border-zinc-200 font-bold text-lg">
                        <span>Total</span>
                        <span>{selectedProduct.price}€</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Número de Tarjeta (Simulado)</label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                          <input required type="text" placeholder="0000 0000 0000 0000" className="w-full pl-10 pr-3 py-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-mono" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-1">Caducidad</label>
                          <input required type="text" placeholder="MM/AA" className="w-full px-3 py-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-mono" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-1">CVC</label>
                          <input required type="text" placeholder="123" className="w-full px-3 py-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-mono" />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button type="button" onClick={() => setStep(2)} className="px-6 py-3 bg-zinc-100 text-zinc-900 rounded-xl font-medium hover:bg-zinc-200 transition-colors">
                        Atrás
                      </button>
                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 flex flex-col items-center justify-center gap-0.5"
                      >
                        {isSubmitting ? 'Procesando...' : <span>Pagar {selectedProduct.price}€</span>}
                        {!isSubmitting && <span className="text-[10px] font-normal opacity-80 text-center leading-tight">IVA NO INCLUIDO<br/>PORTES INCLUIDOS<br/>ENTREGA 7-10 DÍAS</span>}
                      </button>
                    </div>
                  </form>
                )}
              </section>
            </div>

            {/* Right Column: Live Preview */}
            <div className="lg:sticky lg:top-24 h-fit">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-zinc-900">Previsualización</h3>
                {selectedProduct.isCard && (
                  <p className="text-sm text-zinc-500">Pasa el ratón para ver el reverso</p>
                )}
              </div>
              
              <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm flex items-center justify-center min-h-[400px]">
                {/* Physical Product Mockup */}
                {selectedProduct.isCard ? (
                  <div className="group [perspective:1000px] w-[340px] h-[215px] cursor-pointer">
                    <div className="relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] shadow-2xl rounded-2xl">
                      {/* Front Face */}
                      <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] bg-white rounded-2xl overflow-hidden flex items-center justify-center">
                        {designMode === 'custom' ? (
                          customDesignImage ? (
                            customDesignImage.startsWith('data:application/pdf') ? (
                              <embed src={customDesignImage} type="application/pdf" className="w-full h-full rounded-2xl" />
                            ) : (
                              <img src={customDesignImage} alt="Tu diseño" className="w-full h-full object-cover" style={{ imageOrientation: 'from-image' }} />
                            )
                          ) : (
                            <div className="text-zinc-400 flex flex-col items-center">
                              <Upload className="w-8 h-8 mb-2 opacity-50" />
                              <span className="text-sm font-medium">Sube tu diseño</span>
                            </div>
                          )
                        ) : (
                          <CardTemplate 
                            templateId={selectedDesign.templateId} 
                            color={corporateColor} 
                            logo={selectedFields.logo ? logoPreview : undefined}
                            data={templateData} 
                          />
                        )}
                        
                        {/* NFC Icon Hint */}
                        <div className="absolute top-4 right-4 opacity-50 pointer-events-none">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                            <path d="M6 2L6 22"/>
                            <path d="M10 4L10 20"/>
                            <path d="M14 6L14 18"/>
                            <path d="M18 8L18 16"/>
                          </svg>
                        </div>
                      </div>
                      
                      {/* Back Face */}
                      <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl overflow-hidden flex flex-col items-center justify-center" style={{ backgroundColor: corporateColor }}>
                        <div className="bg-white p-4 rounded-2xl shadow-lg">
                          <QRCodeSVG 
                            value={`${window.location.origin}/c/${selectedCard}`} 
                            size={100} 
                            level="H" 
                            includeMargin={false}
                            imageSettings={
                              qrLogoPreview || (activeCardData?.settings?.qrLogo && activeCardData?.settings?.qrLogoUrl)
                                ? { 
                                    src: qrLogoPreview || activeCardData.settings.qrLogoUrl, 
                                    height: 24, 
                                    width: 24, 
                                    excavate: true 
                                  } 
                                : undefined
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center w-full max-w-sm mx-auto">
                    {selectedProduct.imageUrl ? (
                      <div className="w-48 h-48 rounded-2xl overflow-hidden shadow-xl mb-6">
                        <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-full flex items-center justify-center shadow-xl mb-6 relative overflow-hidden" style={{ backgroundColor: corporateColor }}>
                        <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
                        <Smartphone className="w-12 h-12 text-white opacity-90" />
                      </div>
                    )}
                    <h4 className="font-bold text-xl text-zinc-900">{selectedProduct.name}</h4>
                    
                    {selectedProduct.features && (
                      <div className="mt-4 text-sm text-zinc-600 text-left w-full bg-zinc-50 p-4 rounded-xl">
                        <h5 className="font-semibold text-zinc-900 mb-2">Características:</h5>
                        <p className="whitespace-pre-wrap">{selectedProduct.features}</p>
                      </div>
                    )}

                    {selectedProduct.colors && (
                      <div className="mt-4 text-sm text-zinc-600 text-left w-full">
                        <span className="font-semibold text-zinc-900">Colores disponibles:</span> {selectedProduct.colors}
                      </div>
                    )}

                    <div className="mt-6">
                      <div className="text-2xl font-bold text-brand-600">{selectedProduct.price}€</div>
                      <div className="text-[10px] text-zinc-500 font-medium mt-1 leading-tight">
                        IVA NO INCLUIDO<br/>PORTES INCLUIDOS<br/>ENTREGA 7-10 DÍAS
                      </div>
                    </div>

                    {selectedProduct.datasheetUrl && (
                      <a 
                        href={selectedProduct.datasheetUrl} 
                        download={`Ficha_Tecnica_${selectedProduct.name.replace(/\s+/g, '_')}.pdf`}
                        className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors"
                      >
                        <Download className="w-5 h-5" />
                        Descargar Ficha Técnica
                      </a>
                    )}
                  </div>
                )}
              </div>
              
              <p className="text-sm text-zinc-500 text-center mt-4">
                * La previsualización es aproximada. El resultado final puede variar ligeramente en la impresión.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
