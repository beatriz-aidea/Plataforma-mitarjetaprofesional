import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, limit } from 'firebase/firestore';
import { Building2, Users, Download, FileSpreadsheet, Eye, Edit2, Ban, Trash2, ArrowLeft, X, Check, LayoutGrid, List, Table, Settings, Plus, Palette } from 'lucide-react';
import Logo from '../components/Logo';
import CardTemplate from '../components/CardTemplate';

interface Company {
  id: string;
  name: string;
  logo: string;
  customFields: any[];
  visibleFields?: string[];
}

interface Member {
  uid: string;
  email: string;
  name: string;
  status: string;
  cardId?: string;
  customFieldValues?: Record<string, any>;
  cardData?: any;
}

export default function CompanyDashboard() {
  const { user, userRole, companyId } = useAuth();
  const navigate = useNavigate();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [customValues, setCustomValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [savingFields, setSavingFields] = useState(false);
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState<'members' | 'settings' | 'design'>('members');
  const [viewMode, setViewMode] = useState<'list' | 'gallery' | 'edit'>('list');

  useEffect(() => {
    if (!user) return;
    
    if (userRole !== 'company_admin' && userRole !== 'admin') {
      navigate('/dashboard');
      return;
    }

    if (!companyId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch company details
        const companyDoc = await getDoc(doc(db, 'companies', companyId));
        if (companyDoc.exists()) {
          const data = companyDoc.data() as any;
          setCompany({ id: companyDoc.id, ...data } as Company);
          if (data.visibleFields) {
            setVisibleFields(data.visibleFields);
          } else {
            const defaultStandards = ['name', 'email', 'phone', 'company', 'role', 'website', 'address', 'color', 'social', 'photo', 'logo', 'description', 'notes'];
            const customIds = (data.customFields || []).map((f: any) => f.id);
            setVisibleFields([...defaultStandards, ...customIds]);
          }
        }

        // Fetch members (users)
        const usersQuery = query(collection(db, 'users'), where('companyId', '==', companyId));
        const usersSnap = await getDocs(usersQuery);
        
        // Fetch all cards for this company
        const allCardsQuery = query(collection(db, 'cards'), where('companyId', '==', companyId));
        const allCardsSnap = await getDocs(allCardsQuery);
        
        const membersMap = new Map<string, Member>();
        
        // Process users
        for (const userDoc of usersSnap.docs) {
          const userData = userDoc.data();
          membersMap.set(userDoc.id, {
            uid: userDoc.id,
            email: userData.email || '',
            name: userData.email || 'Usuario',
            status: userData.status || 'active',
          });
        }
        
        // Process cards and merge
        for (const cardDoc of allCardsSnap.docs) {
          const cardData = cardDoc.data();
          const cardId = cardDoc.id;
          const ownerUid = cardData.ownerUid;
          
          let name = 'Usuario';
          if (cardData.identity?.firstName || cardData.identity?.lastName) {
            name = `${cardData.identity?.firstName || ''} ${cardData.identity?.lastName || ''}`.trim();
          }
          
          if (membersMap.has(ownerUid)) {
            const member = membersMap.get(ownerUid)!;
            member.cardId = cardId;
            member.cardData = cardData;
            member.customFieldValues = cardData.customFieldValues || {};
            if (name !== 'Usuario') member.name = name;
          } else {
            // Card exists but no dedicated user document (e.g. created by company admin)
            membersMap.set(cardId, { // Use cardId as uid for these shadow members
              uid: cardId,
              email: cardData.contact?.email || 'Sin email',
              name: name,
              status: cardData.status || 'active',
              cardId: cardId,
              cardData: cardData,
              customFieldValues: cardData.customFieldValues || {}
            });
          }
        }
        
        setMembers(Array.from(membersMap.values()));
      } catch (error) {
        console.error("Error fetching company data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, userRole, companyId, navigate]);

  const handleDeactivate = async (uid: string) => {
    if (!window.confirm('¿Estás seguro de que deseas desactivar a este miembro?')) return;
    try {
      await updateDoc(doc(db, 'users', uid), { status: 'inactive' });
      setMembers(members.map(m => m.uid === uid ? { ...m, status: 'inactive' } : m));
    } catch (error) {
      console.error("Error deactivating member:", error);
      alert("Error al desactivar el miembro");
    }
  };

  const handleDelete = async (uid: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar a este miembro permanentemente?')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      setMembers(members.filter(m => m.uid !== uid));
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Error al eliminar el miembro");
    }
  };

  const openEditModal = (member: Member) => {
    setSelectedMember(member);
    setCustomValues(member.customFieldValues || {});
    setIsEditModalOpen(true);
  };

  const saveCustomFields = async () => {
    if (!selectedMember || !selectedMember.cardId) {
      alert("Este usuario no tiene una tarjeta asociada.");
      return;
    }
    
    setSaving(true);
    try {
      await updateDoc(doc(db, 'cards', selectedMember.cardId), {
        customFieldValues: customValues
      });
      
      setMembers(members.map(m => 
        m.uid === selectedMember.uid 
          ? { ...m, customFieldValues: customValues } 
          : m
      ));
      
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error saving custom fields:", error);
      alert("Error al guardar los campos personalizados");
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    if (!company) return;
    
    const headers = ['Nombre', 'Email', 'Estado', 'Tarjeta Activa'];
    const customFieldKeys = company.customFields?.map(f => f.label) || [];
    
    const rows = members.map(m => {
      const baseData = [
        m.name,
        m.email,
        m.status === 'active' ? 'Activo' : 'Inactivo',
        m.cardId ? 'Sí' : 'No'
      ];
      
      const customData = company.customFields?.map(f => m.customFieldValues?.[f.id] || '') || [];
      return [...baseData, ...customData].join(',');
    });
    
    const csvContent = [
      [...headers, ...customFieldKeys].join(','),
      ...rows
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `miembros_${company.name.replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  const STANDARD_FIELDS = [
    { id: 'name', label: 'Nombre' },
    { id: 'email', label: 'Email' },
    { id: 'phone', label: 'Teléfono' },
    { id: 'company', label: 'Empresa' },
    { id: 'role', label: 'Cargo' },
    { id: 'website', label: 'Web' },
    { id: 'address', label: 'Dirección' },
    { id: 'color', label: 'Color de tarjeta' },
    { id: 'social', label: 'Redes Sociales' },
    { id: 'photo', label: 'Foto' },
    { id: 'logo', label: 'Logo' },
    { id: 'description', label: 'Descripción' },
    { id: 'notes', label: 'Contexto de red' }
  ];

  const handleToggleField = (id: string) => {
    if (id === 'name' || id === 'email') return; // Cannot toggle mandatory fields
    setVisibleFields(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const saveVisibleFields = async () => {
    if (!companyId) return;
    setSavingFields(true);
    try {
      await updateDoc(doc(db, 'companies', companyId), {
        visibleFields
      });
      if (company) {
        setCompany({ ...company, visibleFields });
      }
      alert('Configuración guardada correctamente.');
    } catch (err) {
      console.error(err);
      alert('Error al guardar la configuración.');
    } finally {
      setSavingFields(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  if (!company) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-200 text-center max-w-md w-full">
          <Building2 className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Empresa no encontrada</h2>
          <p className="text-zinc-600 mb-6">No estás asociado a ninguna empresa o la empresa no existe.</p>
          <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-brand-600 text-white rounded-xl font-medium">
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans pb-20">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="text-zinc-600 hover:text-zinc-900">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Logo className="h-8" />
            <span className="font-semibold text-zinc-900 hidden sm:inline">Panel de Empresa</span>
          </div>
          <div className="flex items-center gap-3">
            {company.logo && (
              <img src={company.logo} alt={company.name} className="h-8 w-auto object-contain" />
            )}
            <span className="font-bold text-zinc-900">{company.name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-brand-600" />
              Miembros del Equipo
            </h1>
            <p className="text-zinc-600 mt-1">Gestiona los usuarios y tarjetas de tu empresa</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-xl hover:bg-zinc-50 font-medium text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
            <button 
              onClick={() => navigate('/edit')}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-medium text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo miembro
            </button>
          </div>
        </div>

        <div className="flex border-b border-zinc-200 mb-6">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'members' 
                ? 'border-brand-600 text-brand-600' 
                : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Tarjetas de Empleados
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'settings' 
                ? 'border-brand-600 text-brand-600' 
                : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configuración de Campos
            </div>
          </button>
          <button
            onClick={() => setActiveTab('design')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'design' 
                ? 'border-brand-600 text-brand-600' 
                : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Diseño Corporativo
            </div>
          </button>
        </div>

        {activeTab === 'design' ? (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Palette className="w-8 h-8 text-brand-600" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Diseño Corporativo</h2>
            <p className="text-zinc-600 mb-6 max-w-md mx-auto">
              Configura los colores, logotipo y plantillas por defecto para todas las tarjetas de tus empleados.
            </p>
            <button className="px-6 py-3 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 transition-colors">
              Configurar Diseño
            </button>
          </div>
        ) : activeTab === 'settings' ? (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Configuración de Campos</h2>
                <p className="text-zinc-600 text-sm mt-1">
                  Selecciona qué campos quieres que sean visibles para los empleados de tu empresa en su formulario.
                </p>
              </div>
              <button
                onClick={saveVisibleFields}
                disabled={savingFields}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {savingFields ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
            
            <div className="space-y-8">
              {/* Campos estándar */}
              <div>
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4 border-b border-zinc-100 pb-2">Campos Estándar</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {STANDARD_FIELDS.map(field => {
                    const isMandatory = field.id === 'name' || field.id === 'email';
                    const isVisible = isMandatory || visibleFields.includes(field.id);
                    return (
                      <div key={field.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                        <span className="font-medium text-zinc-900">{field.label}</span>
                        <button
                          onClick={() => handleToggleField(field.id)}
                          disabled={isMandatory}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isMandatory ? 'opacity-50 cursor-not-allowed' : ''} ${isVisible ? 'bg-brand-600' : 'bg-zinc-200'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isVisible ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Campos personalizados */}
              <div>
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4 border-b border-zinc-100 pb-2">Campos Personalizados</h3>
                {company?.customFields && company.customFields.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {company.customFields.map((field: any) => {
                      const isVisible = visibleFields.includes(field.id);
                      return (
                        <div key={field.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                          <div>
                            <span className="font-medium text-zinc-900 block leading-tight">{field.label}</span>
                            <span className="text-xs text-zinc-500">{field.type}</span>
                          </div>
                          <button
                            onClick={() => handleToggleField(field.id)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isVisible ? 'bg-brand-600' : 'bg-zinc-200'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isVisible ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                    No has definido ningún campo personalizado.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <div className="flex bg-white border border-zinc-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
                  title="Vista de lista"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('gallery')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'gallery' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
                  title="Vista de galería"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('edit')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'edit' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
                  title="Vista de edición"
                >
                  <Table className="w-4 h-4" />
                </button>
              </div>
            </div>

            {viewMode === 'gallery' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {members.map(member => (
                  <div key={member.uid} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                      <div className="font-medium text-zinc-900 truncate pr-2">{member.name}</div>
                      {member.cardId ? (
                        <button 
                          onClick={() => window.open(`/c/${member.cardId}`, '_blank')}
                          className="text-brand-600 hover:text-brand-700 text-sm font-medium flex-shrink-0"
                        >
                          Ver
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-500">Sin tarjeta</span>
                      )}
                    </div>
                    <div className="p-4 flex-grow flex items-center justify-center bg-zinc-100/50">
                      {member.cardData ? (
                        <div className="w-full max-w-[280px] aspect-[9/16] bg-white rounded-xl shadow-sm overflow-hidden relative transform scale-90 origin-center">
                          <CardTemplate 
                            templateId={member.cardData.design?.templateId || 1}
                            color={member.cardData.design?.color || '#000000'}
                            logo={member.cardData.design?.logoUrl}
                            companyLogo={company.logo}
                            data={{
                              firstName: member.cardData.identity?.firstName || '',
                              lastName: member.cardData.identity?.lastName || '',
                              role: member.cardData.identity?.role || '',
                              company: member.cardData.identity?.company || '',
                              mobile: member.cardData.contact?.mobile || '',
                              landline: member.cardData.contact?.landline || '',
                              email: member.cardData.contact?.email || '',
                              website: member.cardData.contact?.website || '',
                              linkedin: member.cardData.social?.linkedin || '',
                              instagram: member.cardData.social?.instagram || '',
                              twitter: member.cardData.social?.twitter || '',
                              tiktok: member.cardData.social?.tiktok || ''
                            }}
                          />
                        </div>
                      ) : (
                        <div className="text-zinc-400 text-sm flex flex-col items-center gap-2">
                          <Ban className="w-8 h-8 opacity-50" />
                          <span>No hay diseño disponible</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 border-t border-zinc-100 flex justify-between gap-2">
                      <button 
                        onClick={() => openEditModal(member)}
                        className="flex-1 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors"
                      >
                        Campos
                      </button>
                      {member.cardId && (
                        <button 
                          onClick={() => navigate(`/edit/${member.cardId}`)}
                          className="flex-1 py-2 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200">
                        <th className="px-6 py-4 text-sm font-semibold text-zinc-900">Nombre</th>
                        <th className="px-6 py-4 text-sm font-semibold text-zinc-900">Email</th>
                        <th className="px-6 py-4 text-sm font-semibold text-zinc-900">Tarjeta Activa</th>
                        <th className="px-6 py-4 text-sm font-semibold text-zinc-900">Estado</th>
                        <th className="px-6 py-4 text-sm font-semibold text-zinc-900 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {members.map(member => (
                        <tr key={member.uid} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-zinc-900">{member.name}</div>
                          </td>
                          <td className="px-6 py-4 text-zinc-600">{member.email}</td>
                          <td className="px-6 py-4">
                            {member.cardId ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3" /> Sí
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
                                No
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              member.status === 'active' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {member.status === 'active' ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {viewMode === 'edit' && member.cardId && (
                                <button 
                                  onClick={() => navigate(`/edit/${member.cardId}`)}
                                  className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                                  title="Editar tarjeta completa"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Editar
                                </button>
                              )}
                              {member.cardId && (
                                <button 
                                  onClick={() => window.open(`/c/${member.cardId}`, '_blank')}
                                  className="p-2 text-zinc-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                  title="Ver tarjeta"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={() => openEditModal(member)}
                                className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar campos personalizados"
                              >
                                <FileSpreadsheet className="w-4 h-4" />
                              </button>
                              {member.status === 'active' && (
                                <button 
                                  onClick={() => handleDeactivate(member.uid)}
                                  className="p-2 text-zinc-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                  title="Desactivar miembro"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={() => handleDelete(member.uid)}
                                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar miembro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {members.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                            No hay miembros en esta empresa.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Edit Custom Fields Modal */}
      {isEditModalOpen && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100">
              <h3 className="text-lg font-bold text-zinc-900">
                Campos de {selectedMember.name}
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {company?.customFields && company.customFields.length > 0 ? (
                company.customFields.map(field => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={customValues[field.id] || ''}
                        onChange={(e) => setCustomValues({...customValues, [field.id]: e.target.value})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                      >
                        <option value="">Seleccionar...</option>
                        {field.options?.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'date' ? 'date' : 'text'}
                        value={customValues[field.id] || ''}
                        onChange={(e) => setCustomValues({...customValues, [field.id]: e.target.value})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                    )}
                  </div>
                ))
              ) : (
                <p className="text-zinc-500 text-center py-4">
                  Esta empresa no tiene campos personalizados configurados.
                </p>
              )}
            </div>
            
            <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-zinc-600 font-medium hover:bg-zinc-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={saveCustomFields}
                disabled={saving || !selectedMember.cardId}
                className="px-4 py-2 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}