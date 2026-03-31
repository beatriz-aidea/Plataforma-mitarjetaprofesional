import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import Logo from '../components/Logo';
import { Users, Building2, Palette, Plus, Edit2, Trash2, ExternalLink, Search, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

export default function EnterpriseDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('employees');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchEnterpriseData = async () => {
      try {
        // Fetch cards owned by this enterprise account
        const q = query(collection(db, 'cards'), where('ownerUid', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const cardsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCards(cardsData);
      } catch (err) {
        console.error("Error fetching enterprise data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEnterpriseData();
  }, [user, navigate]);

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

  const filteredCards = cards.filter(card => {
    const fullName = `${card.identity?.firstName || ''} ${card.identity?.lastName || ''}`.toLowerCase();
    const role = (card.identity?.role || '').toLowerCase();
    const email = (card.contact?.email || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || role.includes(search) || email.includes(search);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-zinc-500">Cargando panel corporativo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo />
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            Volver a mi panel
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Enterprise Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 font-medium">Empleados Activos</p>
              <p className="text-2xl font-bold text-zinc-900">{cards.length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 font-medium">Plan Actual</p>
              <p className="text-xl font-bold text-zinc-900">Empresa Pro</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-zinc-200 mb-6">
          <button 
            onClick={() => setActiveTab('employees')}
            className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'employees' ? 'border-brand-600 text-brand-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
          >
            Directorio de Empleados
          </button>
          <button 
            onClick={() => setActiveTab('design')}
            className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'design' ? 'border-brand-600 text-brand-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
          >
            Diseño Corporativo
          </button>
        </div>

        {activeTab === 'employees' && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-5 h-5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Buscar empleado por nombre, cargo o email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-300 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-50 transition-colors">
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </button>
                <button 
                  onClick={() => navigate('/edit')}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Empleado
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-zinc-500 border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-3 font-medium">Empleado</th>
                    <th className="px-6 py-3 font-medium">Cargo</th>
                    <th className="px-6 py-3 font-medium">Email / Teléfono</th>
                    <th className="px-6 py-3 font-medium">Estado</th>
                    <th className="px-6 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredCards.length > 0 ? (
                    filteredCards.map(card => (
                      <tr key={card.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-200 overflow-hidden flex-shrink-0">
                              {card.identity?.photoUrl ? (
                                <img src={card.identity.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold">
                                  {card.identity?.firstName?.charAt(0) || 'E'}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-zinc-900">{card.identity?.firstName} {card.identity?.lastName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-600">{card.identity?.role || '-'}</td>
                        <td className="px-6 py-4 text-zinc-600">
                          <div className="flex flex-col">
                            <span>{card.contact?.email || '-'}</span>
                            <span className="text-xs text-zinc-400">{card.contact?.mobile || '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${card.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-800'}`}>
                            {card.status === 'active' ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => navigate(`/edit/${encodeURIComponent(card.id)}`)}
                              className="p-2 text-zinc-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                              title="Editar empleado"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <a 
                              href={`/c/${encodeURIComponent(card.id)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ver tarjeta pública"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button 
                              onClick={() => confirmDelete(card.id)}
                              className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar empleado"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                        No se encontraron empleados. Usa el botón "Nuevo Empleado" para añadir uno.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'design' && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Palette className="w-8 h-8 text-brand-600" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Diseño Corporativo Unificado</h3>
            <p className="text-zinc-500 max-w-md mx-auto mb-6">
              Configura el logotipo, los colores de la marca y la plantilla base. Todos los nuevos empleados que añadas heredarán este diseño automáticamente.
            </p>
            <button className="px-6 py-3 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-colors">
              Configurar Marca (Próximamente)
            </button>
          </div>
        )}

      </main>

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Eliminar Empleado"
        message="¿Estás seguro de que quieres eliminar la tarjeta de este empleado? Esta acción no se puede deshacer."
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
