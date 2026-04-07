import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import Logo from '../components/Logo';
import { collection, query, where, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Edit2, Trash2, ExternalLink, LogOut, ShieldAlert, Building2, Wallet, CreditCard } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function Dashboard() {
  const { user, signOut, userRole } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);

  const isAdmin = userRole === 'admin';
  const isEnterprise = userRole === 'enterprise';
  const isSubscription = userRole === 'standard' || userRole === 'premium';

  useEffect(() => {
    if (!user) return;

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

  if ((userRole === 'free' || userRole === 'pending') && !isAdmin && !(userRole === 'free' && sessionStorage.getItem('justCreatedCard') === 'true')) {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-zinc-500 font-medium">Cargando...</div>
        </div>
      );
    }

    const firstCard = cards[0];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
        <Logo />
        <h2 className="text-2xl font-bold mt-6 mb-3">Acceso limitado</h2>
        <p className="text-gray-600 max-w-md mb-6">
          {userRole === 'pending' 
            ? 'Tu solicitud de suscripción está siendo procesada. Nos pondremos en contacto contigo en breve para activar tu cuenta.'
            : 'Tu plan gratuito te permite crear y compartir tu tarjeta digital mediante QR. Para acceder al panel de gestión, actualiza tu plan.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          {userRole === 'free' && (
            <button onClick={() => navigate('/elegir-plan')} className="px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors">Ver planes</button>
          )}
          {firstCard && (
            <button onClick={() => navigate(`/c/${encodeURIComponent(firstCard.id)}`)} className="px-6 py-3 border-2 border-brand-600 text-brand-600 font-semibold rounded-xl hover:bg-brand-50 transition-colors">Ver mi tarjeta</button>
          )}
          {userRole === 'free' && firstCard && (
            <button onClick={() => navigate('/store')} className="px-6 py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-colors">Pedir tarjeta física</button>
          )}
          <button onClick={signOut} className="px-6 py-3 border border-gray-300 text-gray-600 font-semibold rounded-xl hover:bg-gray-100 transition-colors">Cerrar sesión</button>
        </div>
        <a
          href="https://wa.me/34918826655?text=Hola,%20tengo%20problemas%20de%20acceso%20en%20Mi%20Tarjeta%20Profesional"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 text-sm text-gray-500 hover:text-green-600 transition-colors"
        >
          ¿Tienes problemas de acceso? Ponte en contacto con nosotros, te ayudaremos a resolverlo
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo />
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">Mis Tarjetas</h2>
            <p className="text-zinc-500 text-sm mt-1">Gestiona tus tarjetas profesionales digitales</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                const plansSection = document.getElementById('planes');
                if (plansSection) {
                  plansSection.scrollIntoView({ behavior: 'smooth' });
                } else {
                  navigate('/#planes');
                }
              }}
              className="flex-1 sm:flex-none px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors font-medium text-sm"
            >
              ¿Quieres modificar tu plan?
            </button>
            <button
              onClick={() => navigate('/edit')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium text-sm"
            >
              <Plus className="w-5 h-5" />
              Nueva Tarjeta
            </button>
          </div>
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {cards.map((card) => {
              const encodedId = encodeURIComponent(card.id);
              const cardUrl = `${window.location.origin}/c/${encodedId}`;
              const primaryColor = card.settings?.primaryColor || '#000000';
              
              return (
                <div key={card.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm flex flex-col">
                  <div className="p-6 flex-1 space-y-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-lg text-zinc-900">{card.identity?.firstName} {card.identity?.lastName}</h3>
                        <p className="text-sm text-zinc-500">{card.identity?.role} en {card.identity?.company}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${card.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                        {card.status === 'active' ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    
                    {/* QR Code */}
                    <div className="flex flex-col items-center justify-center p-6 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                        <QRCodeSVG 
                          value={cardUrl} 
                          size={160} 
                          level="H" 
                          includeMargin={false} 
                          imageSettings={
                            card.settings?.qrLogo && card.settings?.qrLogoUrl 
                              ? { src: card.settings.qrLogoUrl, height: 32, width: 32, excavate: true } 
                              : undefined
                          }
                        />
                      </div>
                      <button
                        onClick={() => navigate('/store')}
                        className="w-full py-2.5 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <CreditCard className="w-5 h-5" />
                        Pedir tarjetas físicas
                      </button>
                    </div>
                  </div>
                  
                  <div className="border-t border-zinc-100 p-4 bg-zinc-50 flex justify-between items-center">
                    <div className="flex gap-2">
                      {(isAdmin || isSubscription || isEnterprise) ? (
                        <button
                          onClick={() => navigate(`/edit/${encodedId}`)}
                          className="p-2 text-zinc-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          disabled
                          className="p-2 text-zinc-300 cursor-not-allowed"
                          title="Suscríbete para editar"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      )}
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
                        href={`/c/${encodedId}`}
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
