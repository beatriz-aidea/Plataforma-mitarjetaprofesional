import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import Logo from '../components/Logo';
import { Users, CreditCard, ShoppingBag, ShieldAlert, Edit2, ExternalLink, Trash2, Plus, Smartphone, QrCode, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [fieldTemplates, setFieldTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [showProductModal, setShowProductModal] = useState(false);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [newCompany, setNewCompany] = useState({
    name: '',
    type: 'empresa',
    templateId: '',
    customFields: [] as any[],
    parentCompanyId: '',
    adminEmail: '',
    logoUrl: '',
    status: 'activo'
  });
  const [newProduct, setNewProduct] = useState({ 
    name: '', 
    price: 0, 
    imageUrl: '',
    features: '',
    colors: '',
    datasheetUrl: ''
  });
  const [newField, setNewField] = useState({
    label: '',
    type: 'text',
    icon: ''
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'user' | 'card' | 'product' | 'field' | 'company', id: string } | null>(null);
  const [companyAdminModal, setCompanyAdminModal] = useState<{ userId: string } | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'enterprises', 'cards', 'products'

  const compressImage = (file: File, callback: (dataUrl: string) => void) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es demasiado grande. Máximo 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
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
        callback(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) compressImage(file, (dataUrl) => setNewProduct(prev => ({ ...prev, imageUrl: dataUrl })));
  };

  const handleDatasheetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('El PDF es demasiado grande. Máximo 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct(prev => ({ ...prev, datasheetUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        // Check if admin
        if (!auth.currentUser) {
          navigate('/');
          return;
        }

        console.log("AdminDashboard: Current user email:", auth.currentUser.email);
        console.log("AdminDashboard: Current user uid:", auth.currentUser.uid);

        // Fetch all users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);

        // Fetch all cards
        const cardsSnapshot = await getDocs(collection(db, 'cards'));
        const cardsData = cardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by email
        cardsData.sort((a: any, b: any) => {
          const emailA = a.contact?.email || '';
          const emailB = b.contact?.email || '';
          return emailA.localeCompare(emailB);
        });
        setCards(cardsData);

        // Fetch all orders
        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        const ordersData = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrders(ordersData);

        // Fetch all products
        const productsSnapshot = await getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc')));
        const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(productsData);

        // Fetch custom fields
        const fieldsSnapshot = await getDocs(collection(db, 'customFields'));
        const fieldsData = fieldsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCustomFields(fieldsData);

        // Fetch companies
        const companiesSnapshot = await getDocs(collection(db, 'companies'));
        const companiesData = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCompanies(companiesData);

        // Fetch field templates
        const templatesSnapshot = await getDocs(collection(db, 'fieldTemplates'));
        const templatesData = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFieldTemplates(templatesData);

      } catch (err: any) {
        console.error("Error fetching admin data:", err);
        setError('No tienes permisos de administrador o hubo un error al cargar los datos.');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [navigate]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (newRole === 'company_admin') {
      setCompanyAdminModal({ userId });
      return;
    }

    try {
      const updates: any = { role: newRole };
      
      if (newRole === 'enterprise') {
        const companyName = window.prompt('Introduce el nombre de la empresa para este panel corporativo:');
        if (companyName === null) return; // User cancelled
        if (companyName.trim()) {
          updates.companyName = companyName.trim();
        }
      } else {
        // Optionally remove companyName if changing away from enterprise, 
        // but it's safer to just leave it or set to null.
      }

      await updateDoc(doc(db, 'users', userId), updates);
      setUsers(users.map(u => u.id === userId ? { ...u, ...updates } : u));

      if (newRole === 'subscription' || newRole === 'enterprise') {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userEmail = userDoc.data().email;
          if (userEmail) {
            await sendPasswordResetEmail(auth, userEmail);
          }
        }
      }

      alert('Rol actualizado correctamente');
    } catch (err) {
      console.error("Error updating role:", err);
      alert('Error al actualizar el rol');
    }
  };

  const handleAssignCompanyAdmin = async () => {
    if (!companyAdminModal || !selectedCompanyId) return;
    
    try {
      const { userId } = companyAdminModal;
      
      // Update user
      await updateDoc(doc(db, 'users', userId), { 
        role: 'company_admin',
        companyId: selectedCompanyId
      });
      
      // Update company
      await updateDoc(doc(db, 'companies', selectedCompanyId), {
        adminUid: userId
      });

      setUsers(users.map(u => u.id === userId ? { ...u, role: 'company_admin', companyId: selectedCompanyId } : u));
      setCompanies(companies.map(c => c.id === selectedCompanyId ? { ...c, adminUid: userId } : c));
      
      alert('Administrador de empresa asignado correctamente');
    } catch (error) {
      console.error("Error assigning company admin:", error);
      alert('Error al asignar administrador de empresa');
    } finally {
      setCompanyAdminModal(null);
      setSelectedCompanyId('');
    }
  };

  const confirmDelete = (type: 'user' | 'card' | 'product' | 'field' | 'company', id: string) => {
    setItemToDelete({ type, id } as any);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    const { type, id } = itemToDelete;

    try {
      if (type === 'card') {
        await deleteDoc(doc(db, 'cards', id));
        setCards(cards.filter(c => c.id !== id));
      } else if (type === 'user') {
        // Delete user's cards
        const userCards = cards.filter(c => c.ownerUid === id);
        for (const card of userCards) {
          await deleteDoc(doc(db, 'cards', card.id));
        }
        // Delete user document
        await deleteDoc(doc(db, 'users', id));
        // Update state
        setUsers(users.filter(u => u.id !== id));
        setCards(cards.filter(c => c.ownerUid !== id));
      } else if (type === 'product') {
        await deleteDoc(doc(db, 'products', id));
        setProducts(products.filter(p => p.id !== id));
      } else if (type === 'field') {
        await deleteDoc(doc(db, 'customFields', id));
        setCustomFields(customFields.filter(f => f.id !== id));
      } else if (type === 'company') {
        await deleteDoc(doc(db, 'companies', id));
        setCompanies(companies.filter(c => c.id !== id));
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      alert(`Error al eliminar el registro`);
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const productId = crypto.randomUUID();
      const productData = {
        id: productId,
        name: newProduct.name,
        price: Number(newProduct.price),
        imageUrl: newProduct.imageUrl || '',
        features: newProduct.features || '',
        colors: newProduct.colors || '',
        datasheetUrl: newProduct.datasheetUrl || '',
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'products', productId), productData);
      setProducts([{ ...productData, createdAt: new Date() }, ...products]);
      setShowProductModal(false);
      setNewProduct({ name: '', price: 0, imageUrl: '', features: '', colors: '', datasheetUrl: '' });
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Error al añadir el producto");
    }
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fieldId = crypto.randomUUID();
      const fieldData = {
        id: fieldId,
        label: newField.label,
        type: newField.type,
        icon: newField.icon,
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'customFields', fieldId), fieldData);
      setCustomFields([...customFields, { ...fieldData, createdAt: new Date() }]);
      setShowFieldModal(false);
      setNewField({ label: '', type: 'text', icon: '' });
    } catch (error) {
      console.error("Error adding field:", error);
      alert("Error al añadir el campo");
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let adminUid = '';
      if (newCompany.adminEmail) {
        const user = users.find(u => u.email === newCompany.adminEmail);
        if (user) {
          adminUid = user.id;
        } else {
          alert('No se encontró ningún usuario con ese email.');
          return;
        }
      }

      const companyId = editingCompanyId || crypto.randomUUID();
      const companyData = {
        name: newCompany.name,
        type: newCompany.type,
        templateId: newCompany.templateId,
        customFields: newCompany.customFields,
        parentCompanyId: newCompany.parentCompanyId,
        adminUid: adminUid,
        logoUrl: newCompany.logoUrl,
        status: newCompany.status,
        updatedAt: serverTimestamp()
      };

      if (!editingCompanyId) {
        (companyData as any).createdAt = serverTimestamp();
      }

      await setDoc(doc(db, 'companies', companyId), companyData, { merge: true });

      if (adminUid) {
        await updateDoc(doc(db, 'users', adminUid), {
          role: 'company_admin',
          companyId: companyId
        });
        setUsers(users.map(u => u.id === adminUid ? { ...u, role: 'company_admin', companyId } : u));
      }

      if (editingCompanyId) {
        setCompanies(companies.map(c => c.id === companyId ? { ...c, ...companyData } : c));
      } else {
        setCompanies([...companies, { id: companyId, ...companyData }]);
      }

      setShowCompanyModal(false);
      setEditingCompanyId(null);
      setNewCompany({ name: '', type: 'empresa', templateId: '', customFields: [], parentCompanyId: '', adminEmail: '', logoUrl: '', status: 'activo' });
    } catch (error) {
      console.error("Error saving company:", error);
      alert("Error al guardar la empresa");
    }
  };

  const handleEditCompany = (company: any) => {
    const adminUser = users.find(u => u.id === company.adminUid);
    setNewCompany({
      name: company.name || '',
      type: company.type || 'empresa',
      templateId: company.templateId || '',
      customFields: company.customFields || [],
      parentCompanyId: company.parentCompanyId || '',
      adminEmail: adminUser ? adminUser.email : '',
      logoUrl: company.logoUrl || '',
      status: company.status || 'activo'
    });
    setEditingCompanyId(company.id);
    setShowCompanyModal(true);
  };

  const handleTemplateChange = (templateId: string) => {
    const template = fieldTemplates.find(t => t.id === templateId);
    setNewCompany(prev => ({
      ...prev,
      templateId,
      customFields: template ? [...template.fields] : []
    }));
  };

  const handleAddCompanyCustomField = () => {
    setNewCompany(prev => ({
      ...prev,
      customFields: [...prev.customFields, { label: '', type: 'text', required: false, options: [] }]
    }));
  };

  const handleRemoveCompanyCustomField = (index: number) => {
    setNewCompany(prev => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateCompanyCustomField = (index: number, field: string, value: any) => {
    setNewCompany(prev => {
      const newFields = [...prev.customFields];
      newFields[index] = { ...newFields[index], [field]: value };
      return { ...prev, customFields: newFields };
    });
  };

  const handleCompanyLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) compressImage(file, (dataUrl) => setNewCompany(prev => ({ ...prev, logoUrl: dataUrl })));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-zinc-500">Cargando panel de administración...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl max-w-md text-center">
          <ShieldAlert className="w-12 h-12 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Volver a mi panel
          </button>
        </div>
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
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 font-medium">Usuarios Totales</p>
              <p className="text-2xl font-bold text-zinc-900">{users.length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 font-medium">Tarjetas Creadas</p>
              <p className="text-2xl font-bold text-zinc-900">{cards.length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 font-medium">Pedidos Físicos</p>
              <p className="text-2xl font-bold text-zinc-900">{orders.length}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-zinc-200">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users' ? 'border-brand-600 text-brand-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab('enterprises')}
            className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'enterprises' ? 'border-brand-600 text-brand-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Empresas
          </button>
          <button
            onClick={() => setActiveTab('cards')}
            className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'cards' ? 'border-brand-600 text-brand-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Tarjetas
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'products' ? 'border-brand-600 text-brand-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Productos NFC
          </button>
          <button
            onClick={() => setActiveTab('customFields')}
            className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'customFields' ? 'border-brand-600 text-brand-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Campos Extra
          </button>
        </div>

        {/* Users Table */}
        {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
            <h2 className="font-bold text-lg text-zinc-900">Gestión de Usuarios</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Empresa</th>
                  <th className="px-6 py-3 font-medium">Rol</th>
                  <th className="px-6 py-3 font-medium">Tarjetas</th>
                  <th className="px-6 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {/* Registered Users */}
                {users.map(user => {
                  const userCards = cards.filter(c => c.ownerUid === user.id);
                  return (
                    <tr key={user.id} className="hover:bg-zinc-50">
                      <td className="px-6 py-4 font-medium text-zinc-900">
                        {user.email}
                        {user.role === 'admin' && <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase">Admin</span>}
                      </td>
                      <td className="px-6 py-4 text-zinc-500">{user.companyName || userCards[0]?.identity?.company || '-'}</td>
                      <td className="px-6 py-4">
                        <select 
                          value={user.role || 'free'} 
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="bg-zinc-100 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="free">Particular (Free)</option>
                          <option value="subscription">Suscripción</option>
                          <option value="enterprise">Empresa</option>
                          <option value="company_admin">Admin Empresa</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-zinc-500">{userCards.length} tarjetas</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1 border-r border-zinc-200 pr-2 mr-2">
                            {userCards.length === 0 && <span className="text-xs text-zinc-400">Sin tarjetas</span>}
                            {userCards.map(c => (
                              <button 
                                key={c.id}
                                onClick={() => navigate(`/edit/${c.id}`)}
                                className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                title={`Editar tarjeta de ${c.identity?.firstName}`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => confirmDelete('user', user.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Unregistered / Anonymous Users */}
                {cards.filter(c => c.isAnonymous).map(card => (
                  <tr key={card.id} className="hover:bg-zinc-50 bg-amber-50/30">
                    <td className="px-6 py-4 font-medium text-zinc-900">
                      {card.identity?.email || 'Anónimo'}
                      <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase">No Registrado</span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500">{card.identity?.company || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-zinc-400 italic">Sin cuenta</span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500">1 tarjeta</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => navigate(`/edit/${card.id}`)}
                          className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Editar tarjeta"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete('card', card.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar tarjeta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Enterprises Table */}
        {activeTab === 'enterprises' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50 flex justify-between items-center">
            <h2 className="font-bold text-lg text-zinc-900">Gestión de Empresas</h2>
            <button 
              onClick={() => {
                setEditingCompanyId(null);
                setNewCompany({ name: '', type: 'empresa', templateId: '', customFields: [], parentCompanyId: '', adminEmail: '', logoUrl: '', status: 'activo' });
                setShowCompanyModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Nueva empresa
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-3 font-medium">Nombre</th>
                  <th className="px-6 py-3 font-medium">Tipo</th>
                  <th className="px-6 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3 font-medium">Admin asignado</th>
                  <th className="px-6 py-3 font-medium">Nº de miembros</th>
                  <th className="px-6 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {companies.map(company => {
                  const adminUser = users.find(u => u.id === company.adminUid);
                  const membersCount = users.filter(u => u.companyId === company.id).length;
                  return (
                    <tr key={company.id} className="hover:bg-zinc-50">
                      <td className="px-6 py-4 font-medium text-zinc-900">{company.name}</td>
                      <td className="px-6 py-4 text-zinc-500 capitalize">{company.type}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          company.status === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {company.status === 'activo' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500">{adminUser ? adminUser.email : 'Sin asignar'}</td>
                      <td className="px-6 py-4 text-zinc-500">{membersCount}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleEditCompany(company)}
                            className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Editar empresa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              const newStatus = company.status === 'activo' ? 'inactivo' : 'activo';
                              await updateDoc(doc(db, 'companies', company.id), { status: newStatus });
                              setCompanies(companies.map(c => c.id === company.id ? { ...c, status: newStatus } : c));
                            }}
                            className="p-1.5 text-zinc-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title={company.status === 'activo' ? 'Desactivar empresa' : 'Activar empresa'}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDelete('company' as any, company.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar empresa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {companies.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                      No hay empresas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Cards Table */}
        {activeTab === 'cards' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
            <h2 className="font-bold text-lg text-zinc-900">Todas las Tarjetas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Nombre</th>
                  <th className="px-6 py-3 font-medium">Empresa</th>
                  <th className="px-6 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {cards.map(card => (
                  <tr key={card.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-4 font-medium text-zinc-900">{card.contact?.email || 'Sin email'}</td>
                    <td className="px-6 py-4 text-zinc-500">{card.identity?.firstName} {card.identity?.lastName}</td>
                    <td className="px-6 py-4 text-zinc-500">{card.identity?.company || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${card.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                        {card.status === 'active' ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <button 
                        onClick={() => navigate(`/edit/${card.id}`)}
                        className="p-2 text-zinc-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => navigate(`/success/${encodeURIComponent(card.id)}`)}
                        className="p-2 text-zinc-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Ver QR"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <a 
                        href={`/c/${card.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-zinc-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver pública"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button 
                        onClick={() => confirmDelete('card', card.id)}
                        className="p-2 text-zinc-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Products Table */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <h2 className="font-bold text-lg text-zinc-900">Galería de Productos NFC</h2>
              <button 
                onClick={() => setShowProductModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Añadir Producto
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-3 font-medium">Imagen</th>
                    <th className="px-6 py-3 font-medium">Nombre</th>
                    <th className="px-6 py-3 font-medium">Precio</th>
                    <th className="px-6 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                        No hay productos en la galería. Añade uno para empezar.
                      </td>
                    </tr>
                  ) : products.map(product => (
                    <tr key={product.id} className="hover:bg-zinc-50">
                      <td className="px-6 py-4">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded-lg object-cover border border-zinc-200" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
                            <Smartphone className="w-6 h-6" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-zinc-900">{product.name}</td>
                      <td className="px-6 py-4 text-zinc-500">{product.price}€</td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => confirmDelete('product', product.id)}
                          className="p-2 text-zinc-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Custom Fields Table */}
        {activeTab === 'customFields' && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <h2 className="font-bold text-lg text-zinc-900">Gestión de Campos Extra</h2>
              <button 
                onClick={() => setShowFieldModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Añadir Campo
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-3 font-medium">Etiqueta</th>
                    <th className="px-6 py-3 font-medium">Tipo</th>
                    <th className="px-6 py-3 font-medium">Icono</th>
                    <th className="px-6 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {customFields.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                        No hay campos extra definidos.
                      </td>
                    </tr>
                  ) : customFields.map(field => (
                    <tr key={field.id} className="hover:bg-zinc-50">
                      <td className="px-6 py-4 font-medium text-zinc-900">{field.label}</td>
                      <td className="px-6 py-4 text-zinc-500 uppercase">{field.type}</td>
                      <td className="px-6 py-4 text-zinc-500">{field.icon || '-'}</td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => confirmDelete('field', field.id)}
                          className="p-2 text-zinc-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* Add Field Modal */}
      {showFieldModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl my-8">
            <h3 className="text-xl font-bold text-zinc-900 mb-4">Añadir Campo Extra</h3>
            <form onSubmit={handleAddField} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre del campo (Etiqueta)</label>
                <input 
                  required 
                  type="text" 
                  value={newField.label} 
                  onChange={e => setNewField({...newField, label: e.target.value})} 
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" 
                  placeholder="Ej: Número de Colegiado"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Tipo de dato</label>
                <select 
                  value={newField.type} 
                  onChange={e => setNewField({...newField, type: e.target.value})} 
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="text">Texto</option>
                  <option value="url">Enlace (URL)</option>
                  <option value="email">Email</option>
                  <option value="phone">Teléfono</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Icono (opcional, nombre de Lucide icon)</label>
                <input 
                  type="text" 
                  value={newField.icon} 
                  onChange={e => setNewField({...newField, icon: e.target.value})} 
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" 
                  placeholder="Ej: Award, User, Phone..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowFieldModal(false)}
                  className="flex-1 px-4 py-2 text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 text-white bg-brand-600 hover:bg-brand-700 rounded-lg font-medium transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl my-8">
            <h3 className="text-xl font-bold text-zinc-900 mb-4">Añadir Producto NFC</h3>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre del producto</label>
                <input 
                  required 
                  type="text" 
                  value={newProduct.name} 
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})} 
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" 
                  placeholder="Ej: Llavero NFC Premium"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Características</label>
                <textarea 
                  value={newProduct.features} 
                  onChange={e => setNewProduct({...newProduct, features: e.target.value})} 
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none resize-none h-24" 
                  placeholder="Ej: Material resistente al agua&#10;Chip NTAG215&#10;Acabado mate"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Colores disponibles</label>
                <input 
                  type="text" 
                  value={newProduct.colors} 
                  onChange={e => setNewProduct({...newProduct, colors: e.target.value})} 
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" 
                  placeholder="Ej: Negro, Blanco, Azul"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Precio (€)</label>
                <input 
                  required 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={newProduct.price} 
                  onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} 
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Imagen del producto</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleProductImageUpload}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" 
                />
                {newProduct.imageUrl && <p className="text-xs text-emerald-600 mt-1">Imagen cargada correctamente</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Ficha Técnica (PDF)</label>
                <input 
                  type="file" 
                  accept="application/pdf"
                  onChange={handleDatasheetUpload}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" 
                />
                {newProduct.datasheetUrl && <p className="text-xs text-emerald-600 mt-1">Ficha técnica cargada correctamente</p>}
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 px-4 py-2 text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 text-white bg-brand-600 hover:bg-brand-700 rounded-lg font-medium transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        title={
          itemToDelete?.type === 'user' ? 'Eliminar Usuario' :
          itemToDelete?.type === 'card' ? 'Eliminar Tarjeta' :
          itemToDelete?.type === 'company' ? 'Eliminar Empresa' :
          'Eliminar Producto'
        }
        message={
          itemToDelete?.type === 'user' ? '¿Estás seguro de que quieres eliminar este usuario y todas sus tarjetas? Esta acción no se puede deshacer.' :
          itemToDelete?.type === 'card' ? '¿Estás seguro de que quieres eliminar esta tarjeta permanentemente?' :
          itemToDelete?.type === 'company' ? '¿Estás seguro de que quieres eliminar esta empresa? Esta acción no se puede deshacer.' :
          '¿Estás seguro de que quieres eliminar este producto?'
        }
        onConfirm={executeDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        confirmText="Eliminar"
      />
      {/* Company Admin Modal */}
      {companyAdminModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Asignar Administrador de Empresa</h3>
            <p className="text-zinc-600 mb-4 text-sm">
              Selecciona la empresa para la que este usuario será administrador.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-700 mb-1">Empresa</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full p-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="">Selecciona una empresa</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => {
                  setCompanyAdminModal(null);
                  setSelectedCompanyId('');
                }}
                className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-xl font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAssignCompanyAdmin}
                disabled={!selectedCompanyId}
                className="px-4 py-2 bg-brand-600 text-white rounded-xl font-medium disabled:opacity-50"
              >
                Asignar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingCompanyId ? 'Editar Empresa' : 'Nueva Empresa'}</h3>
              <button onClick={() => setShowCompanyModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveCompany} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre *</label>
                  <input 
                    type="text" 
                    required
                    value={newCompany.name}
                    onChange={e => setNewCompany({...newCompany, name: e.target.value})}
                    className="w-full p-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Tipo</label>
                  <select 
                    value={newCompany.type}
                    onChange={e => setNewCompany({...newCompany, type: e.target.value})}
                    className="w-full p-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="empresa">Empresa</option>
                    <option value="asociación">Asociación</option>
                    <option value="federación">Federación</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Plantilla de sector</label>
                  <select 
                    value={newCompany.templateId}
                    onChange={e => handleTemplateChange(e.target.value)}
                    className="w-full p-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="">Selecciona una plantilla...</option>
                    {fieldTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name || t.id}</option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500 mt-1">Al seleccionar, se copiarán los campos de la plantilla.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Empresa madre (opcional)</label>
                  <select 
                    value={newCompany.parentCompanyId}
                    onChange={e => setNewCompany({...newCompany, parentCompanyId: e.target.value})}
                    className="w-full p-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="">Ninguna</option>
                    {companies.filter(c => c.id !== editingCompanyId).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Admin de empresa (Email)</label>
                  <input 
                    type="email" 
                    placeholder="usuario@ejemplo.com"
                    value={newCompany.adminEmail}
                    onChange={e => setNewCompany({...newCompany, adminEmail: e.target.value})}
                    className="w-full p-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                  <p className="text-xs text-zinc-500 mt-1">El usuario debe existir en el sistema.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Estado</label>
                  <select 
                    value={newCompany.status}
                    onChange={e => setNewCompany({...newCompany, status: e.target.value})}
                    className="w-full p-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Logo (opcional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleCompanyLogoUpload}
                  className="w-full p-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                />
                {newCompany.logoUrl && (
                  <img src={newCompany.logoUrl} alt="Logo preview" className="mt-2 h-16 object-contain rounded" />
                )}
              </div>

              <div className="border-t border-zinc-200 pt-4 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-zinc-900">Campos Personalizados</h4>
                  <button 
                    type="button"
                    onClick={handleAddCompanyCustomField}
                    className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Añadir campo
                  </button>
                </div>
                
                {newCompany.customFields.length === 0 ? (
                  <p className="text-sm text-zinc-500 italic">No hay campos personalizados.</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {newCompany.customFields.map((field, index) => (
                      <div key={index} className="flex gap-2 items-start bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input 
                            type="text" 
                            placeholder="Etiqueta (ej. Departamento)"
                            value={field.label}
                            onChange={e => handleUpdateCompanyCustomField(index, 'label', e.target.value)}
                            className="w-full p-1.5 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            required
                          />
                          <select 
                            value={field.type}
                            onChange={e => handleUpdateCompanyCustomField(index, 'type', e.target.value)}
                            className="w-full p-1.5 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                          >
                            <option value="text">Texto</option>
                            <option value="number">Número</option>
                            <option value="date">Fecha</option>
                            <option value="select">Desplegable</option>
                            <option value="boolean">Sí/No</option>
                            <option value="url">URL</option>
                          </select>
                          
                          {field.type === 'select' && (
                            <div className="col-span-2">
                              <input 
                                type="text" 
                                placeholder="Opciones separadas por coma"
                                value={field.options ? field.options.join(', ') : ''}
                                onChange={e => handleUpdateCompanyCustomField(index, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                className="w-full p-1.5 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                              />
                            </div>
                          )}
                          
                          <div className="col-span-2 flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              id={`req-${index}`}
                              checked={field.required || false}
                              onChange={e => handleUpdateCompanyCustomField(index, 'required', e.target.checked)}
                              className="rounded text-brand-600 focus:ring-brand-500"
                            />
                            <label htmlFor={`req-${index}`} className="text-sm text-zinc-600">Obligatorio</label>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleRemoveCompanyCustomField(index)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-0.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-200">
                <button 
                  type="button"
                  onClick={() => setShowCompanyModal(false)}
                  className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
