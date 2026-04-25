import React, { useEffect, useState, Fragment } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import Logo from '../components/Logo';
import { Users, CreditCard, ShoppingBag, ShieldAlert, Edit2, ExternalLink, Trash2, Plus, Smartphone, QrCode, Ban, Copy, Puzzle, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';

const renderDate = (dateObj: any) => {
  if (!dateObj) return '-';
  if (dateObj.toDate) return new Date(dateObj.toDate()).toLocaleDateString();
  if (dateObj instanceof Date) return dateObj.toLocaleDateString();
  return new Date(dateObj).toLocaleDateString();
};

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
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyModalError, setCompanyModalError] = useState('');
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

  const [fieldDefinitions, setFieldDefinitions] = useState<any[]>([]);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldToDelete, setFieldToDelete] = useState<{id: string, label: string} | null>(null);
  const [managingFieldsFor, setManagingFieldsFor] = useState<{type: 'user' | 'company', id: string, name: string} | null>(null);
  const [selectedAssignedFields, setSelectedAssignedFields] = useState<string[]>([]);
  
  const handleOpenManageFields = (type: 'user' | 'company', entity: any) => {
    const fields = entity.assignedFields || [];
    setSelectedAssignedFields(fields.map((f: any) => f.fieldId));
    setManagingFieldsFor({ 
      type, 
      id: entity.id, 
      name: type === 'user' ? entity.email : entity.name 
    });
  };

  const handleToggleAssignedField = (fieldId: string) => {
    setSelectedAssignedFields(prev => 
      prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
    );
  };

  const handleSaveAssignedFields = async () => {
    if (!managingFieldsFor) return;
    const { type, id } = managingFieldsFor;
    
    try {
      const listToUpdate = type === 'user' ? users : companies;
      const entity = listToUpdate.find(e => e.id === id);
      if (!entity) return;

      const existingFields = entity.assignedFields || [];
      const newAssignedFields = selectedAssignedFields.map(fieldId => {
        const existing = existingFields.find((f: any) => f.fieldId === fieldId);
        return existing ? existing : { fieldId, value: "" };
      });

      const collectionName = type === 'user' ? 'users' : 'companies';
      await updateDoc(doc(db, collectionName, id), {
        assignedFields: newAssignedFields
      });

      if (type === 'user') {
        setUsers(users.map(u => u.id === id ? { ...u, assignedFields: newAssignedFields } : u));
      } else {
        setCompanies(companies.map(c => c.id === id ? { ...c, assignedFields: newAssignedFields } : c));
      }

      alert('Campos guardados correctamente');
      setManagingFieldsFor(null);
    } catch (err) {
      console.error(err);
      alert('Error al guardar los campos');
    }
  };

  const [newFieldDefinition, setNewFieldDefinition] = useState({
    type: 'preset',
    label: '',
    icon: 'link',
    placeholder: ''
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'user' | 'card' | 'product' | 'field' | 'company', id: string } | null>(null);
  const [companyAdminModal, setCompanyAdminModal] = useState<{ userId: string } | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'enterprises', 'cards', 'products'
  const [searchTerm, setSearchTerm] = useState('');
  
  const [userFilters, setUserFilters] = useState({ email: '', company: '', role: '', date: '' });
  const [companyFilters, setCompanyFilters] = useState({ name: '', type: '', status: '', date: '' });
  const [cardFilters, setCardFilters] = useState({ email: '', name: '', company: '', status: '' });
  const [productFilters, setProductFilters] = useState({ name: '', price: '' });
  const [orderFilters, setOrderFilters] = useState({ id: '', user: '', status: '', date: '', address: '' });

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
    const fetchFieldDefinitions = async () => {
      try {
        if (!auth.currentUser) return;
        const snapshot = await getDocs(query(collection(db, 'fieldDefinitions'), orderBy('createdAt', 'desc')));
        setFieldDefinitions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching fieldDefinitions:", err);
      }
    };
    fetchFieldDefinitions();
  }, []);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        // Check if admin
        if (!auth.currentUser) {
          navigate('/');
          return;
        }

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

  const handleDeleteFieldDefinition = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'fieldDefinitions', id));
      const snapshot = await getDocs(query(collection(db, 'fieldDefinitions'), orderBy('createdAt', 'desc')));
      setFieldDefinitions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setFieldToDelete(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditFieldDefinition = (field: any) => {
    setEditingFieldId(field.id);
    setNewFieldDefinition({
      type: field.type,
      label: field.label,
      icon: field.icon || '',
      placeholder: field.placeholder || ''
    });
    setShowFieldForm(true);
  };

  const handleDuplicateFieldDefinition = (field: any) => {
    setEditingFieldId(null);
    setNewFieldDefinition({
      type: field.type,
      label: `${field.label} (copia)`,
      icon: field.icon || '',
      placeholder: field.placeholder || ''
    });
    setShowFieldForm(true);
  };

  const handleSaveFieldDefinition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldDefinition.label.trim()) return;
    try {
      const inputType = newFieldDefinition.type === 'custom_date' ? 'date' : newFieldDefinition.type === 'custom_url' ? 'url' : 'text';
      
      const payload: any = {
        type: newFieldDefinition.type,
        label: newFieldDefinition.label,
        inputType
      };
      
      if (newFieldDefinition.type !== 'custom_date') {
        payload.icon = newFieldDefinition.icon;
      }
      
      if (newFieldDefinition.type === 'preset') {
        payload.placeholder = newFieldDefinition.placeholder;
      }

      if (editingFieldId) {
        payload.updatedAt = serverTimestamp();
        await updateDoc(doc(db, 'fieldDefinitions', editingFieldId), payload);
      } else {
        payload.createdAt = serverTimestamp();
        await setDoc(doc(collection(db, 'fieldDefinitions')), payload);
      }

      const snapshot = await getDocs(query(collection(db, 'fieldDefinitions'), orderBy('createdAt', 'desc')));
      setFieldDefinitions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setShowFieldForm(false);
      setEditingFieldId(null);
      setNewFieldDefinition({ type: 'preset', label: '', icon: 'link', placeholder: '' });
    } catch (err) {
      console.error(err);
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

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const productId = editingProductId || crypto.randomUUID();
      const productData = {
        id: productId,
        name: newProduct.name,
        price: Number(newProduct.price),
        imageUrl: newProduct.imageUrl || '',
        features: newProduct.features || '',
        colors: newProduct.colors || '',
        datasheetUrl: newProduct.datasheetUrl || '',
        updatedAt: serverTimestamp()
      };

      if (!editingProductId) {
        (productData as any).createdAt = serverTimestamp();
      }

      await setDoc(doc(db, 'products', productId), productData, { merge: true });
      
      if (editingProductId) {
        setProducts(products.map(p => p.id === productId ? { ...p, ...productData } : p));
      } else {
        setProducts([{ ...productData, createdAt: new Date() }, ...products]);
      }
      
      setShowProductModal(false);
      setEditingProductId(null);
      setNewProduct({ name: '', price: 0, imageUrl: '', features: '', colors: '', datasheetUrl: '' });
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Error al guardar el producto");
    }
  };

  const handleEditProduct = (product: any) => {
    setNewProduct({
      name: product.name || '',
      price: product.price || 0,
      imageUrl: product.imageUrl || '',
      features: product.features || '',
      colors: product.colors || '',
      datasheetUrl: product.datasheetUrl || ''
    });
    setEditingProductId(product.id);
    setShowProductModal(true);
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
    setCompanyModalError('');
    try {
      let adminUid = '';
      if (newCompany.adminEmail) {
        const user = users.find(u => u.email === newCompany.adminEmail);
        if (user) {
          adminUid = user.id;
        } else {
          setCompanyModalError('No se encontró ningún usuario con ese email.');
          return;
        }
      }

      // Sanitize customFields to remove undefined values which Firestore rejects
      const sanitizedCustomFields = (newCompany.customFields || []).map(field => {
        const sanitized = { ...field };
        Object.keys(sanitized).forEach(key => {
          if (sanitized[key] === undefined) {
            delete sanitized[key];
          }
        });
        return sanitized;
      });

      const companyId = editingCompanyId || crypto.randomUUID();
      const companyData = {
        name: newCompany.name || '',
        type: newCompany.type || 'empresa',
        templateId: newCompany.templateId || '',
        customFields: sanitizedCustomFields,
        parentCompanyId: newCompany.parentCompanyId || '',
        adminUid: adminUid,
        logoUrl: newCompany.logoUrl || '',
        status: newCompany.status || 'activo',
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
      setCompanyModalError(`Error al guardar la empresa: ${error instanceof Error ? error.message : 'Error desconocido'}`);
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
      customFields: template ? [...(template.fields || [])] : []
    }));
  };

  const handleAddCompanyCustomField = () => {
    setNewCompany(prev => ({
      ...prev,
      customFields: [...(prev.customFields || []), { label: '', type: 'text', required: false, options: [] }]
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

  const filteredUsers = users.filter(user => {
    const searchMatch = (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.role || '').toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = (user.email || '').toLowerCase().includes(userFilters.email.toLowerCase());
    const companyMatch = (user.companyName || '').toLowerCase().includes(userFilters.company.toLowerCase());
    const roleMatch = (user.role || '').toLowerCase().includes(userFilters.role.toLowerCase());
    const dateMatch = renderDate(user.createdAt).toLowerCase().includes(userFilters.date.toLowerCase());
    return searchMatch && emailMatch && companyMatch && roleMatch && dateMatch;
  });

  const filteredCompanies = companies.filter(company => {
    const searchMatch = (company.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.type || '').toLowerCase().includes(searchTerm.toLowerCase());
    const nameMatch = (company.name || '').toLowerCase().includes(companyFilters.name.toLowerCase());
    const typeMatch = (company.type || '').toLowerCase().includes(companyFilters.type.toLowerCase());
    const statusMatch = (company.status || '').toLowerCase().includes(companyFilters.status.toLowerCase());
    const dateMatch = renderDate(company.createdAt).toLowerCase().includes(companyFilters.date.toLowerCase());
    return searchMatch && nameMatch && typeMatch && statusMatch && dateMatch;
  });

  const filteredCards = cards.filter(card => {
    const searchMatch = (card.contact?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (card.identity?.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (card.identity?.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (card.identity?.company || '').toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = (card.contact?.email || '').toLowerCase().includes(cardFilters.email.toLowerCase());
    const nameMatch = `${card.identity?.firstName || ''} ${card.identity?.lastName || ''}`.toLowerCase().includes(cardFilters.name.toLowerCase());
    const companyMatch = (card.identity?.company || '').toLowerCase().includes(cardFilters.company.toLowerCase());
    const statusText = !card.ownerUid ? 'Pendiente' : card.status === 'inactive' ? 'Inactiva' : 'Activa';
    const statusMatch = statusText.toLowerCase().includes(cardFilters.status.toLowerCase());
    return searchMatch && emailMatch && nameMatch && companyMatch && statusMatch;
  });

  const filteredProducts = products.filter(product => {
    const searchMatch = (product.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const nameMatch = (product.name || '').toLowerCase().includes(productFilters.name.toLowerCase());
    const priceMatch = (product.price || '').toString().toLowerCase().includes(productFilters.price.toLowerCase());
    return searchMatch && nameMatch && priceMatch;
  });

  const filteredOrders = orders.filter(order => {
    const searchMatch = (order.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.userEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.shippingAddress?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const idMatch = (order.id || '').toLowerCase().includes(orderFilters.id.toLowerCase());
    const userMatch = (order.userEmail || '').toLowerCase().includes(orderFilters.user.toLowerCase());
    const statusMatch = (order.status || '').toLowerCase().includes(orderFilters.status.toLowerCase());
    const dateMatch = (order.createdAt?.toDate ? new Date(order.createdAt.toDate()).toLocaleDateString() : '-').toLowerCase().includes(orderFilters.date.toLowerCase());
    const addressMatch = (order.shippingAddress?.fullName || '').toLowerCase().includes(orderFilters.address.toLowerCase());
    return searchMatch && idMatch && userMatch && statusMatch && dateMatch && addressMatch;
  });

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

        {/* Tabs and Search */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8 border-b border-zinc-200">
          <div className="flex gap-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'users' ? 'border-brand-600 text-brand-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Usuarios
            </button>
            <button
              onClick={() => setActiveTab('enterprises')}
              className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'enterprises' ? 'border-brand-600 text-brand-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Empresas
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'cards' ? 'border-brand-600 text-brand-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Tarjetas
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'products' ? 'border-brand-600 text-brand-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Productos NFC
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'orders' ? 'border-brand-600 text-brand-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Pedidos
            </button>
          </div>
          <div className="pb-4 relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Buscar en la tabla..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all focus:border-brand-500"
            />
          </div>
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
                  <th className="px-6 py-3 font-medium">
                    <div>Email</div>
                    <input type="text" placeholder="Filtrar por email..." className="mt-1 w-full px-2 py-1 text-xs border border-zinc-200 rounded outline-none font-normal" value={userFilters.email} onChange={e => setUserFilters({...userFilters, email: e.target.value})} />
                  </th>
                  <th className="px-6 py-3 font-medium">
                    <div>Empresa</div>
                    <input type="text" placeholder="Filtrar por empresa..." className="mt-1 w-full px-2 py-1 text-xs border border-zinc-200 rounded outline-none font-normal" value={userFilters.company} onChange={e => setUserFilters({...userFilters, company: e.target.value})} />
                  </th>
                  <th className="px-6 py-3 font-medium">
                    <div>Rol</div>
                    <input type="text" placeholder="Filtrar por rol..." className="mt-1 w-full px-2 py-1 text-xs border border-zinc-200 rounded outline-none font-normal" value={userFilters.role} onChange={e => setUserFilters({...userFilters, role: e.target.value})} />
                  </th>
                  <th className="px-6 py-3 font-medium">
                    <div>Fecha de alta</div>
                    <input type="text" placeholder="Filtrar por fecha..." className="mt-1 w-full px-2 py-1 text-xs border border-zinc-200 rounded outline-none font-normal" value={userFilters.date} onChange={e => setUserFilters({...userFilters, date: e.target.value})} />
                  </th>
                  <th className="px-6 py-3 font-medium align-top">Tarjetas</th>
                  <th className="px-6 py-3 font-medium align-top">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {/* Registered Users */}
                {filteredUsers.map(user => {
                  const userCards = cards.filter(c => c.ownerUid === user.id);
                  return (
                    <Fragment key={user.id}>
                    <tr className="hover:bg-zinc-50">
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
                      <td className="px-6 py-4 text-zinc-500">{renderDate(user.createdAt)}</td>
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
                            onClick={() => handleOpenManageFields('user', user)}
                            className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Gestionar campos"
                          >
                            <Puzzle className="w-4 h-4" />
                          </button>
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
                    {managingFieldsFor?.type === 'user' && managingFieldsFor.id === user.id && (
                      <tr className="bg-brand-50/50">
                        <td colSpan={5} className="px-6 py-4 border-t border-brand-100">
                          <div className="bg-white rounded-xl border border-brand-200 p-4 shadow-sm">
                            <h4 className="font-semibold text-zinc-900 mb-4">Campos asignados a {managingFieldsFor.name}</h4>
                            
                            {fieldDefinitions.length === 0 ? (
                              <p className="text-sm text-zinc-500 italic">No hay campos personalizados en el catálogo.</p>
                            ) : (
                              <div className="space-y-2 mb-6">
                                {fieldDefinitions.map(field => (
                                  <label key={field.id} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 cursor-pointer transition">
                                    <input 
                                      type="checkbox"
                                      checked={selectedAssignedFields.includes(field.id)}
                                      onChange={() => handleToggleAssignedField(field.id)}
                                      className="rounded border-zinc-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium text-sm text-zinc-900">{field.label}</span>
                                    </div>
                                    <span className="ml-auto px-2 py-1 bg-zinc-100 rounded-lg text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                                      {field.type === 'preset' ? 'Predefinido' : field.type === 'custom_url' ? 'URL' : 'Fecha'}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}

                            <div className="flex gap-3 justify-end pt-4 border-t border-zinc-100">
                              <button 
                                onClick={() => setManagingFieldsFor(null)}
                                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
                              >
                                Cerrar
                              </button>
                              <button 
                                onClick={handleSaveAssignedFields}
                                className="px-4 py-2 text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 rounded-xl transition-colors"
                              >
                                Guardar asignación
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
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
                  <th className="px-6 py-3 font-medium">
                    <div>Nombre</div>
                    <input type="text" placeholder="Filtrar por nombre..." className="mt-1 w-full px-2 py-1 text-xs border border-zinc-200 rounded outline-none font-normal" value={companyFilters.name} onChange={e => setCompanyFilters({...companyFilters, name: e.target.value})} />
                  </th>
                  <th className="px-6 py-3 font-medium">
                    <div>Tipo</div>
                    <input type="text" placeholder="Filtrar por tipo..." className="mt-1 w-full px-2 py-1 text-xs border border-zinc-200 rounded outline-none font-normal" value={companyFilters.type} onChange={e => setCompanyFilters({...companyFilters, type: e.target.value})} />
                  </th>
                  <th className="px-6 py-3 font-medium">
                    <div>Estado</div>
                    <input type="text" placeholder="Filtrar por estado..." className="mt-1 w-full px-2 py-1 text-xs border border-zinc-200 rounded outline-none font-normal" value={companyFilters.status} onChange={e => setCompanyFilters({...companyFilters, status: e.target.value})} />
                  </th>
                  <th className="px-6 py-3 font-medium">
                    <div>Fecha de alta</div>
                    <input type="text" placeholder="Filtrar por fecha..." className="mt-1 w-full px-2 py-1 text-xs border border-zinc-200 rounded outline-none font-normal" value={companyFilters.date} onChange={e => setCompanyFilters({...companyFilters, date: e.target.value})} />
                  </th>
                  <th className="px-6 py-3 font-medium align-top">Admin asignado</th>
                  <th className="px-6 py-3 font-medium align-top">Nº de miembros</th>
                  <th className="px-6 py-3 font-medium align-top">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredCompanies.map(company => {
                  const adminUser = users.find(u => u.id === company.adminUid);
                  const membersCount = users.filter(u => u.companyId === company.id).length;
                  return (
                    <Fragment key={company.id}>
                    <tr className="hover:bg-zinc-50">
                      <td className="px-6 py-4 font-medium text-zinc-900">{company.name}</td>
                      <td className="px-6 py-4 text-zinc-500 capitalize">{company.type}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          company.status === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {company.status === 'activo' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500">{renderDate(company.createdAt)}</td>
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
                            onClick={() => handleOpenManageFields('company', company)}
                            className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Gestionar campos"
                          >
                            <Puzzle className="w-4 h-4" />
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
                    {managingFieldsFor?.type === 'company' && managingFieldsFor.id === company.id && (
                      <tr className="bg-brand-50/50">
                        <td colSpan={6} className="px-6 py-4 border-t border-brand-100">
                          <div className="bg-white rounded-xl border border-brand-200 p-4 shadow-sm">
                            <h4 className="font-semibold text-zinc-900 mb-4">Campos asignados a {managingFieldsFor.name}</h4>
                            
                            {fieldDefinitions.length === 0 ? (
                              <p className="text-sm text-zinc-500 italic">No hay campos personalizados en el catálogo.</p>
                            ) : (
                              <div className="space-y-2 mb-6">
                                {fieldDefinitions.map(field => (
                                  <label key={field.id} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 cursor-pointer transition">
                                    <input 
                                      type="checkbox"
                                      checked={selectedAssignedFields.includes(field.id)}
                                      onChange={() => handleToggleAssignedField(field.id)}
                                      className="rounded border-zinc-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium text-sm text-zinc-900">{field.label}</span>
                                    </div>
                                    <span className="ml-auto px-2 py-1 bg-zinc-100 rounded-lg text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                                      {field.type === 'preset' ? 'Predefinido' : field.type === 'custom_url' ? 'URL' : 'Fecha'}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}

                            <div className="flex gap-3 justify-end pt-4 border-t border-zinc-100">
                              <button 
                                onClick={() => setManagingFieldsFor(null)}
                                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
                              >
                                Cerrar
                              </button>
                              <button 
                                onClick={handleSaveAssignedFields}
                                className="px-4 py-2 text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 rounded-xl transition-colors"
                              >
                                Guardar asignación
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
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
                  <th className="px-6 py-3 font-medium">
                    <div>Email</div>
                    <input type="text" placeholder="Filtrar por email..." className="mt-1 w-full px-2 py-1 text-xs border border-zinc-200 rounded outline-none font-normal" value={cardFilters.email} onChange={e => setCardFilters({...cardFilters, email: e.target.value})} />
                  </th>
                  <th className="px-6 py-3 font-medium">
                    <div>Nombre</div>
                    <input type="text" placeholder="Filtrar por nombre..." className="mt-1 w-full px-2 py-1 text-xs border border-zinc-200 rounded outline-none font-normal" value={cardFilters.name} onChange={e => setCardFilters({...cardFilters, name: e.target.value})} />
                  </th>
                  <th className="px-6 py-3 font-medium">
                    <div>Empresa</div>
                    <input type="text" placeholder="Filtrar por empresa..." className="mt-1 w-full px-2 py-1 text-xs border border-zinc-200 rounded outline-none font-normal" value={cardFilters.company} onChange={e => setCardFilters({...cardFilters, company: e.target.value})} />
                  </th>
                  <th className="px-6 py-3 font-medium">
                    <div>Estado</div>
                    <input type="text" placeholder="Filtrar por estado..." className="mt-1 w-full px-2 py-1 text-xs border border-zinc-200 rounded outline-none font-normal" value={cardFilters.status} onChange={e => setCardFilters({...cardFilters, status: e.target.value})} />
                  </th>
                  <th className="px-6 py-3 font-medium align-top">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredCards.map(card => (
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
                    <th className="px-6 py-3 font-medium align-top">Imagen</th>
                    <th className="px-6 py-3 font-medium">
                      <div>Nombre</div>
                      <input type="text" placeholder="Filtrar por nombre..." className="mt-1 w-full px-2 py-1 text-xs border border-zinc-200 rounded outline-none font-normal" value={productFilters.name} onChange={e => setProductFilters({...productFilters, name: e.target.value})} />
                    </th>
                    <th className="px-6 py-3 font-medium">
                      <div>Precio</div>
                      <input type="text" placeholder="Filtrar por precio..." className="mt-1 w-full px-2 py-1 text-xs border border-zinc-200 rounded outline-none font-normal" value={productFilters.price} onChange={e => setProductFilters({...productFilters, price: e.target.value})} />
                    </th>
                    <th className="px-6 py-3 font-medium align-top">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                        No hay productos en la galería. Añade uno para empezar.
                      </td>
                    </tr>
                  ) : filteredProducts.map(product => (
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
                      <td className="px-6 py-4 text-zinc-500">
                        <div>{Number(product.price).toFixed(2)}€</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">IVA NO INCLUIDO</div>
                      </td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        <button 
                          onClick={() => handleEditProduct(product)}
                          className="p-2 text-zinc-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
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

        {/* Orders Table */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <h2 className="font-bold text-lg text-zinc-900">Gestión de Pedidos</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-3 font-medium">
                      <div>ID Pedido</div>
                      <input type="text" placeholder="Filtrar por ID..." className="mt-1 w-full px-2 py-1 text-xs border border-zinc-200 rounded outline-none font-normal" value={orderFilters.id} onChange={e => setOrderFilters({...orderFilters, id: e.target.value})} />
                    </th>
                    <th className="px-6 py-3 font-medium">
                      <div>Usuario</div>
                      <input type="text" placeholder="Filtrar por usuario..." className="mt-1 w-full px-2 py-1 text-xs border border-zinc-200 rounded outline-none font-normal" value={orderFilters.user} onChange={e => setOrderFilters({...orderFilters, user: e.target.value})} />
                    </th>
                    <th className="px-6 py-3 font-medium">
                      <div>Estado</div>
                      <input type="text" placeholder="Filtrar por estado..." className="mt-1 w-full px-2 py-1 text-xs border border-zinc-200 rounded outline-none font-normal" value={orderFilters.status} onChange={e => setOrderFilters({...orderFilters, status: e.target.value})} />
                    </th>
                    <th className="px-6 py-3 font-medium">
                      <div>Fecha</div>
                      <input type="text" placeholder="Filtrar por fecha..." className="mt-1 w-full px-2 py-1 text-xs border border-zinc-200 rounded outline-none font-normal" value={orderFilters.date} onChange={e => setOrderFilters({...orderFilters, date: e.target.value})} />
                    </th>
                    <th className="px-6 py-3 font-medium">
                      <div>Dirección</div>
                      <input type="text" placeholder="Filtrar por dirección..." className="mt-1 w-full px-2 py-1 text-xs border border-zinc-200 rounded outline-none font-normal" value={orderFilters.address} onChange={e => setOrderFilters({...orderFilters, address: e.target.value})} />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                        No hay pedidos registrados.
                      </td>
                    </tr>
                  ) : filteredOrders.map(order => {
                    const user = users.find(u => u.id === order.userId);
                    return (
                      <tr key={order.id} className="hover:bg-zinc-50">
                        <td className="px-6 py-4 font-medium text-zinc-900">{order.id.slice(0, 8)}...</td>
                        <td className="px-6 py-4 text-zinc-500">{user?.email || order.userId}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                            order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                            'bg-zinc-100 text-zinc-800'
                          }`}>
                            {order.status === 'pending' ? 'Pendiente' :
                             order.status === 'confirmed' ? 'Confirmado' :
                             order.status === 'paid' ? 'Pagado' :
                             order.status === 'shipped' ? 'Enviado' : order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-500">
                          {order.createdAt?.toDate ? new Date(order.createdAt.toDate()).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 text-zinc-500">
                          {order.shippingAddress ? `${order.shippingAddress.street}, ${order.shippingAddress.city}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- NUEVA SECCIÓN: Campos Personalizados --- */}
        <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mt-8">
          <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg text-zinc-900">Campos Personalizados</h2>
              <p className="text-sm text-zinc-500">Crea el catálogo de campos adicionales que podrás asignar a usuarios y empresas</p>
            </div>
            <button 
              onClick={() => setShowFieldForm(!showFieldForm)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition"
            >
              <Plus className="w-4 h-4" /> Nuevo campo
            </button>
          </div>

          {showFieldForm && (
            <div className="p-6 border-b border-zinc-200 bg-white">
              <form onSubmit={handleSaveFieldDefinition} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Tipo de campo</label>
                  <select 
                    value={newFieldDefinition.type}
                    onChange={e => setNewFieldDefinition({ ...newFieldDefinition, type: e.target.value })}
                    className="w-full p-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="preset">Campo predefinido</option>
                    <option value="custom_url">Enlace URL personalizado</option>
                    <option value="custom_date">Campo de fecha</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre del campo</label>
                  <input 
                    type="text" 
                    placeholder={
                      newFieldDefinition.type === 'custom_date' ? "Ej: Fecha de alta, Cumpleaños, Aniversario..." :
                      newFieldDefinition.type === 'custom_url' ? "Ej: Mi catálogo, Reservar cita, Ver vídeo..." :
                      "Ej: Ficha en Idealista, Reservar mesa..."
                    }
                    value={newFieldDefinition.label}
                    onChange={e => setNewFieldDefinition({ ...newFieldDefinition, label: e.target.value })}
                    className="w-full p-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                    required 
                  />
                </div>
                {newFieldDefinition.type !== 'custom_date' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Icono</label>
                    <select 
                      value={newFieldDefinition.icon}
                      onChange={e => setNewFieldDefinition({ ...newFieldDefinition, icon: e.target.value })}
                      className="w-full p-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                    >
                      <option value="link">🔗 Enlace web</option>
                      <option value="file">📄 Documento PDF</option>
                      <option value="video">▶️ Vídeo</option>
                      <option value="calendar">📅 Agenda / Reservas</option>
                      <option value="whatsapp">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15
                            -.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075
                            -.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059
                            -.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52
                            .149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52
                            -.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51
                            -.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372
                            -.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074
                            .149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625
                            .712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413
                            .248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.561 4.14 1.535 5.874L0 24l6.322-1.507
                            A11.933 11.933 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818
                            a9.818 9.818 0 01-5.007-1.371l-.36-.214-3.732.889.936-3.617-.235-.372
                            A9.818 9.818 0 1112 21.818z"/>
                          </svg>
                          💬 WhatsApp
                        </span>
                      </option>
                      <option value="map">📍 Ubicación</option>
                      <option value="phone">📞 Teléfono directo</option>
                    </select>
                  </div>
                )}
                {newFieldDefinition.type === 'preset' ? (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Texto de ayuda</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Ej: https://calendly.com/..."
                        value={newFieldDefinition.placeholder}
                        onChange={e => setNewFieldDefinition({ ...newFieldDefinition, placeholder: e.target.value })}
                        className="w-full p-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                      <button 
                        type="submit"
                        className="px-4 py-2 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition whitespace-nowrap h-[42px]"
                      >
                        Guardar campo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <button 
                      type="submit"
                      className="w-full px-4 py-2 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition whitespace-nowrap h-[42px]"
                    >
                      Guardar campo
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {fieldToDelete && (
            <div className="bg-red-50 p-4 border-b border-red-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-full">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-900 text-sm">¿Eliminar el campo {fieldToDelete.label}?</h3>
                  <p className="text-red-700 text-sm">Esta acción no se puede deshacer.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setFieldToDelete(null)}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDeleteFieldDefinition(fieldToDelete.id)}
                  className="px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 rounded-xl transition-colors"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-3 font-medium">Icono</th>
                  <th className="px-6 py-3 font-medium">Nombre</th>
                  <th className="px-6 py-3 font-medium">Tipo</th>
                  <th className="px-6 py-3 font-medium">Placeholder</th>
                  <th className="px-6 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {fieldDefinitions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                      No hay campos personalizados creados.
                    </td>
                  </tr>
                ) : fieldDefinitions.map((field) => (
                  <tr key={field.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-4 text-zinc-500 text-base">
                      {field.icon === 'link' && '🔗'}
                      {field.icon === 'file' && '📄'}
                      {field.icon === 'video' && '▶️'}
                      {field.icon === 'calendar' && '📅'}
                      {field.icon === 'whatsapp' && '💬'}
                      {field.icon === 'map' && '📍'}
                      {field.icon === 'phone' && '📞'}
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-900">{field.label}</td>
                    <td className="px-6 py-4 text-zinc-500">
                      <span className="px-2 py-1 bg-zinc-100 rounded-lg text-xs font-medium">
                        {field.type === 'preset' ? 'Predefinido' : field.type === 'custom_url' ? 'URL' : 'Fecha'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500">{field.placeholder || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleEditFieldDefinition(field)}
                          className="p-2 text-zinc-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDuplicateFieldDefinition(field)}
                          className="p-2 text-zinc-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Duplicar"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setFieldToDelete({ id: field.id, label: field.label })}
                          className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
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
        </section>

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
            <form onSubmit={handleSaveProduct} className="space-y-4">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingCompanyId ? 'Editar Empresa' : 'Nueva Empresa'}</h3>
              <button onClick={() => setShowCompanyModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {companyModalError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
                {companyModalError}
              </div>
            )}

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
                            <option value="lista">Lista</option>
                            <option value="boolean">Sí/No</option>
                            <option value="url">URL</option>
                          </select>
                          
                          {(field.type === 'select' || field.type === 'lista') && (
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
