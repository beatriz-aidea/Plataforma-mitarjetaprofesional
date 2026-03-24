import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ShoppingBag, Upload, CreditCard, CheckCircle2, ArrowLeft, Palette } from 'lucide-react';
import CardTemplate from '../components/CardTemplate';

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
  const [loading, setLoading] = useState(true);
  
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [selectedDesign, setSelectedDesign] = useState(DESIGNS[0]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [corporateColor, setCorporateColor] = useState<string>('#d60b52');
  
  const [step, setStep] = useState(1);
  const [shipping, setShipping] = useState({
    fullName: '', street: '', city: '', zip: '', country: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchCards = async () => {
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
      } catch (error) {
        console.error("Error fetching cards:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [user]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
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
        design: selectedDesign.id,
        corporateColor,
        logoUrl: logoPreview || '', // In a real app, upload to Storage first
        status: 'paid',
        shippingAddress: shipping,
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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  const activeCardData = cards.find(c => c.id === selectedCard);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans pb-20">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 font-medium">
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <div className="flex items-center gap-2 font-semibold text-zinc-900">
            <img src="/logoQr.svg" alt="Logo" className="w-6 h-6" />
            Tienda de Tarjetas Físicas
          </div>
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
              Tu tarjeta física está en proceso de fabricación. Te notificaremos cuando sea enviada.
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
                  Diseño y Personalización
                </h2>
                
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Selecciona la tarjeta a imprimir</label>
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
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Color Corporativo</label>
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
                            <div className="w-full aspect-[1.58] relative pointer-events-none">
                              <div className="absolute inset-0 origin-top-left" style={{ transform: 'scale(0.35)', width: '285%', height: '285%' }}>
                                <CardTemplate 
                                  templateId={design.templateId} 
                                  color={corporateColor} 
                                  logo={logoPreview}
                                  data={{
                                    firstName: activeCardData?.identity?.firstName || 'NOMBRE',
                                    lastName: activeCardData?.identity?.lastName || 'APELLIDO',
                                    role: activeCardData?.identity?.role || 'Cargo profesional',
                                    phone: activeCardData?.contact?.mobile || '+34 600 000 000',
                                    email: activeCardData?.contact?.email || 'hola@mitarjetaprofesional.com',
                                    website: activeCardData?.contact?.website || 'www.mitarjetaprofesional.com'
                                  }} 
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
                          accept="image/*" 
                          onChange={handleLogoUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                        <p className="text-sm text-zinc-600">Haz clic o arrastra tu logo aquí</p>
                        <p className="text-xs text-zinc-400 mt-1">PNG, JPG o SVG (Max. 5MB)</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => setStep(2)}
                      className="w-full py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors"
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
                  Datos de Envío
                </h2>
                
                {step === 2 && (
                  <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre Completo</label>
                      <input required type="text" value={shipping.fullName} onChange={e => setShipping({...shipping, fullName: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Dirección</label>
                      <input required type="text" value={shipping.street} onChange={e => setShipping({...shipping, street: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Ciudad</label>
                        <input required type="text" value={shipping.city} onChange={e => setShipping({...shipping, city: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Código Postal</label>
                        <input required type="text" value={shipping.zip} onChange={e => setShipping({...shipping, zip: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">País</label>
                      <input required type="text" value={shipping.country} onChange={e => setShipping({...shipping, country: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
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
                        <span className="text-zinc-600">Tarjeta Física ({selectedDesign.name})</span>
                        <span className="font-medium">{selectedDesign.price}€</span>
                      </div>
                      <div className="flex justify-between mb-4">
                        <span className="text-zinc-600">Envío</span>
                        <span className="font-medium">Gratis</span>
                      </div>
                      <div className="flex justify-between pt-4 border-t border-zinc-200 font-bold text-lg">
                        <span>Total</span>
                        <span>{selectedDesign.price}€</span>
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
                        className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? 'Procesando...' : `Pagar ${selectedDesign.price}€`}
                      </button>
                    </div>
                  </form>
                )}
              </section>
            </div>

            {/* Right Column: Live Preview */}
            <div className="lg:sticky lg:top-24 h-fit">
              <h3 className="text-lg font-bold text-zinc-900 mb-4">Previsualización de tu Tarjeta</h3>
              
              <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm flex items-center justify-center min-h-[400px]">
                {/* Physical Card Mockup */}
                <div className="w-[340px] h-[215px] rounded-2xl shadow-2xl relative overflow-hidden transition-all duration-500 bg-white">
                  <CardTemplate 
                    templateId={selectedDesign.templateId} 
                    color={corporateColor} 
                    logo={logoPreview}
                    data={{
                      firstName: activeCardData?.identity?.firstName || 'NOMBRE',
                      lastName: activeCardData?.identity?.lastName || 'APELLIDO',
                      role: activeCardData?.identity?.role || 'Cargo profesional',
                      phone: activeCardData?.contact?.mobile || '+34 600 000 000',
                      email: activeCardData?.contact?.email || 'hola@mitarjetaprofesional.com',
                      website: activeCardData?.contact?.website || 'www.mitarjetaprofesional.com'
                    }} 
                  />
                  
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
