import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Edit2, Trash2, ExternalLink, LogOut, ShieldAlert, Building2, Wallet } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEnterprise, setIsEnterprise] = useState(false);
  const [isSubscription, setIsSubscription] = useState(false);
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkUserRole = async () => {
      // Check if user is beatriz or has admin role
      if (user.email === 'beatriz@aidea.es') {
        setIsAdmin(true);
      }
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          if (role === 'admin') setIsAdmin(true);
          if (role === 'enterprise') setIsEnterprise(true);
          if (role === 'subscription') setIsSubscription(true);
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkUserRole();

    const fetchCards = async () => {
      try {
        const q = query(collection(db, 'cards'), where('ownerUid', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const cardsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCards(cardsData);
      } catch (error) {
        console.error("Error fetching cards:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [user]);

  const confirmDelete = (cardId: string) => {
    setCardToDelete(cardId);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!cardToDelete) return;
    try {
      await deleteDoc(doc(db, 'cards', cardToDelete));
      setCards(cards.filter(c => c.id !== cardToDelete));
    } catch (error) {
      console.error("Error deleting card:", error);
      alert("Error al eliminar la tarjeta");
    } finally {
      setDeleteModalOpen(false);
      setCardToDelete(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleAddToWallet = () => {
    alert('Funcionalidad de Wallet en desarrollo. Próximamente podrás descargar tu pase para Apple Wallet y Google Wallet.');
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/logoQr.svg" alt="AIDEA Logo" className="h-8" />
            <img src="/AIDEA_VCARD.svg" alt="AIDEA VCARD" className="h-8" />
            <h1 className="font-bold text-xl text-zinc-900 hidden sm:block ml-2">Panel de Control</h1>
          </div>
          <div className="flex items-center gap-4">
            {isEnterprise && (
              <button
                onClick={() => navigate('/enterprise')}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
              >
                <Building2 className="w-4 h-4" />
                Panel Corporativo
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <ShieldAlert className="w-4 h-4" />
                Panel Admin
              </button>
            )}
            <button
              onClick={() => navigate('/store')}
              className="px-4 py-2 bg-zinc-100 text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Pedir Tarjeta Física
            </button>
            <span className="text-sm text-zinc-600 hidden sm:inline-block">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-zinc-900">Mis Tarjetas</h2>
          <button
            onClick={() => navigate('/edit')}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Nueva Tarjeta
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-500">Cargando tus tarjetas...</div>
        ) : cards.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">No tienes ninguna tarjeta</h3>
            <p className="text-zinc-500 mb-6">Crea tu primera tarjeta profesional para empezar a compartirla.</p>
            <button
              onClick={() => navigate('/edit')}
              className="px-6 py-3 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors font-medium"
            >
              Crear mi primera tarjeta
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => {
              const cardUrl = `${window.location.origin}/c/${card.id}`;
              const primaryColor = card.settings?.primaryColor || '#4f46e5';
              const secondaryColor1 = card.settings?.secondaryColor1 || '#18181b';
              const secondaryColor2 = card.settings?.secondaryColor2 || '#fafafa';

              return (
                <div key={card.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm flex flex-col">
                  <div className="p-6 flex-1 flex flex-col items-center">
                    
                    {/* Tarjeta Física Preview (Frontal y Trasera) */}
                    <div className="w-full max-w-sm aspect-[1.586/1] rounded-xl shadow-lg relative overflow-hidden mb-6 flex flex-col" style={{ backgroundColor: secondaryColor2 }}>
                      {/* Frontal simulado */}
                      <div className="flex-1 p-4 flex flex-col justify-between relative z-10">
                        <div className="flex justify-between items-start">
                          {card.settings?.showLogo !== false && card.identity?.logoUrl ? (
                            <img src={card.identity.logoUrl} alt="Logo" className="h-8 object-contain" />
                          ) : (
                            <div className="h-8"></div>
                          )}
                          {card.settings?.showPhoto !== false && card.identity?.photoUrl && (
                            <img src={card.identity.photoUrl} alt="Profile" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg" style={{ color: secondaryColor1 }}>{card.identity?.firstName} {card.identity?.lastName}</h3>
                          <p className="text-xs font-medium opacity-80" style={{ color: primaryColor }}>{card.identity?.role}</p>
                          <p className="text-xs opacity-60" style={{ color: secondaryColor1 }}>{card.identity?.company}</p>
                        </div>
                      </div>
                      {/* Decoración */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-10 rounded-bl-full" style={{ backgroundImage: `linear-gradient(to bottom right, ${primaryColor}, ${secondaryColor1})` }}></div>
                    </div>

                    {/* Trasera simulada con QR */}
                    <div className="w-full max-w-sm aspect-[1.586/1] rounded-xl shadow-lg relative overflow-hidden flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                      <div className="bg-white p-3 rounded-xl shadow-inner">
                        <QRCodeSVG 
                          value={cardUrl} 
                          size={100} 
                          level="H" 
                          includeMargin={false} 
                          imageSettings={
                            card.settings?.qrLogo && card.settings?.qrLogoUrl 
                              ? { src: card.settings.qrLogoUrl, height: 20, width: 20, excavate: true } 
                              : undefined
                          }
                        />
                      </div>
                      {card.settings?.showLogo !== false && card.identity?.logoUrl && (
                        <div className="absolute bottom-4 left-4 opacity-50">
                          <img src={card.identity.logoUrl} alt="Logo" className="h-6 object-contain filter brightness-0 invert" />
                        </div>
                      )}
                    </div>

                    <div className="w-full flex items-center justify-between mt-6">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${card.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                        {card.status === 'active' ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-t border-zinc-100 p-4 bg-zinc-50 flex justify-between items-center">
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/edit/${card.id}`)}
                        className="p-2 text-zinc-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => confirmDelete(card.id)}
                        className="p-2 text-zinc-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      {(isAdmin || isEnterprise || isSubscription) && (
                        <button
                          onClick={handleAddToWallet}
                          className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
                          title="Añadir a Wallet"
                        >
                          <Wallet className="w-4 h-4" />
                          <span className="hidden sm:inline">Añadir a Wallet</span>
                        </button>
                      )}
                      <a
                        href={`/c/${card.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
                      >
                        Ver tarjeta <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Eliminar Tarjeta"
        message="¿Estás seguro de que quieres eliminar esta tarjeta? Esta acción no se puede deshacer."
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setCardToDelete(null);
        }}
        confirmText="Eliminar"
      />
    </div>
  );
}
