import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Check } from 'lucide-react';

export default function ChoosePlan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSelectFree = async () => {
    if (!user) {
      navigate('/');
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: 'free' });
      navigate('/crear');
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Hubo un error al actualizar tu plan. Por favor, inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPaid = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!user) return;
    setLoading(true);
    try {
      const planName = e.currentTarget.textContent?.includes('Premium') ? 'Premium' : 'Standard';
      
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const timestamp = serverTimestamp();

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || '',
          role: 'pending',
          isAnonymous: user.isAnonymous || false,
          createdAt: timestamp,
          updatedAt: timestamp
        });
      } else {
        await updateDoc(userRef, { 
          role: 'pending',
          updatedAt: timestamp
        });
      }
      
      try {
        const { collection, addDoc } = await import('firebase/firestore');
        await addDoc(collection(db, 'notifications'), {
          type: 'new_subscription_request',
          userEmail: user.email || '',
          userId: user.uid,
          plan: planName,
          createdAt: new Date()
        });
      } catch (notifErr) {
        console.warn("Could not create notification:", notifErr);
      }
      navigate('/crear');
    } catch (error) {
      console.error("Error processing subscription request:", error);
      alert("Hubo un error al procesar tu solicitud. Por favor, inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEnterprise = () => {
    navigate('/contacto-enterprise');
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center">
      <div className="max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-zinc-900 sm:text-5xl">
            Elige tu plan
          </h1>
          <p className="mt-4 text-xl text-zinc-600 max-w-2xl mx-auto">
            Selecciona el plan que mejor se adapte a tus necesidades para empezar a crear tu tarjeta.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Free Plan */}
          <div className="bg-white rounded-3xl shadow-sm border border-zinc-200 p-8 flex flex-col">
            <h3 className="text-2xl font-semibold text-zinc-900">Free</h3>
            <div className="mt-4 flex items-baseline text-5xl font-extrabold text-zinc-900">
              0€
              <span className="ml-1 text-xl font-medium text-zinc-500">/mes</span>
            </div>
            <span className="text-xs text-zinc-500 mt-1">IVA no incluido</span>
            <ul className="mt-6 space-y-3 text-sm text-zinc-600 flex-grow">
              <li className="flex items-start"><Check className="w-5 h-5 text-brand-600 mr-2 shrink-0" /> Generación de QR básico</li>
              <li className="flex items-start"><Check className="w-5 h-5 text-brand-600 mr-2 shrink-0" /> Enlace público</li>
              <li className="flex items-start"><Check className="w-5 h-5 text-brand-600 mr-2 shrink-0" /> Opción de pedir tarjeta física (pago único)</li>
            </ul>
            <button
              onClick={handleSelectFree}
              disabled={loading}
              className="mt-8 w-full py-3 px-4 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Procesando...' : 'Elegir Free'}
            </button>
          </div>

          {/* Standard Plan */}
          <div className="bg-white rounded-3xl shadow-sm border border-brand-200 p-8 flex flex-col relative ring-2 ring-brand-600">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-0 sm:-translate-x-4">
              <span className="inline-flex items-center rounded-full bg-brand-100 px-4 py-1 text-sm font-semibold text-brand-600">
                Popular
              </span>
            </div>
            <h3 className="text-2xl font-semibold text-zinc-900">Standard</h3>
            <div className="mt-4 flex items-baseline text-5xl font-extrabold text-zinc-900">
              1,50€
              <span className="ml-1 text-xl font-medium text-zinc-500">/mes</span>
            </div>
            <span className="text-xs text-zinc-500 mt-1">IVA no incluido — Facturado anualmente (18€/año)</span>
            <ul className="mt-6 space-y-3 text-sm text-zinc-600 flex-grow">
              <li className="flex items-start"><Check className="w-5 h-5 text-brand-600 mr-2 shrink-0" /> Todo lo del plan gratuito</li>
              <li className="flex items-start"><Check className="w-5 h-5 text-brand-600 mr-2 shrink-0" /> Landing page personalizada</li>
              <li className="flex items-start"><Check className="w-5 h-5 text-brand-600 mr-2 shrink-0" /> Modificación de datos ilimitada</li>
            </ul>
            <button
              onClick={handleSelectPaid}
              className="mt-8 w-full py-3 px-4 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors"
            >
              Elegir Standard
            </button>
          </div>

          {/* Premium Plan */}
          <div className="bg-white rounded-3xl shadow-sm border border-zinc-200 p-8 flex flex-col">
            <h3 className="text-2xl font-semibold text-zinc-900">Premium</h3>
            <div className="mt-4 flex items-baseline text-5xl font-extrabold text-zinc-900">
              2,50€
              <span className="ml-1 text-xl font-medium text-zinc-500">/mes</span>
            </div>
            <span className="text-xs text-zinc-500 mt-1">IVA no incluido — Facturado anualmente (30€/año)</span>
            <ul className="mt-6 space-y-3 text-sm text-zinc-600 flex-grow">
              <li className="flex items-start"><Check className="w-5 h-5 text-brand-600 mr-2 shrink-0" /> Todo lo del plan estándar</li>
              <li className="flex items-start"><Check className="w-5 h-5 text-brand-600 mr-2 shrink-0" /> Creación de varias tarjetas</li>
              <li className="flex items-start"><Check className="w-5 h-5 text-brand-600 mr-2 shrink-0" /> Compartir tarjeta online</li>
              <li className="flex items-start"><Check className="w-5 h-5 text-brand-600 mr-2 shrink-0" /> Añadir a wallet (Próximamente)</li>
            </ul>
            <button
              onClick={handleSelectPaid}
              className="mt-8 w-full py-3 px-4 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors"
            >
              Elegir Premium
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-zinc-900 rounded-3xl shadow-sm border border-zinc-800 p-8 flex flex-col text-white">
            <h3 className="text-2xl font-semibold text-white">Enterprise</h3>
            <div className="mt-4 flex items-baseline text-3xl font-extrabold text-white">
              A medida
            </div>
            <span className="text-xs text-zinc-400 mt-1">IVA no incluido</span>
            <ul className="mt-6 space-y-3 text-sm text-zinc-400 flex-grow">
              <li className="flex items-start"><Check className="w-5 h-5 text-white mr-2 shrink-0" /> Todo lo que el resto de planes</li>
              <li className="flex items-start"><Check className="w-5 h-5 text-white mr-2 shrink-0" /> Gestión de equipo/empleados centralizado</li>
              <li className="flex items-start"><Check className="w-5 h-5 text-white mr-2 shrink-0" /> Enlaces/campos personalizados</li>
              <li className="flex items-start"><Check className="w-5 h-5 text-white mr-2 shrink-0" /> Creación de acceso corporativo</li>
              <li className="flex items-start"><Check className="w-5 h-5 text-white mr-2 shrink-0" /> Control de accesos y permisos corporativo</li>
              <li className="flex items-start"><Check className="w-5 h-5 text-white mr-2 shrink-0" /> Analítica de escaneos (Próximamente)</li>
            </ul>
            <button
              onClick={handleSelectEnterprise}
              className="mt-8 w-full py-3 px-4 bg-white text-zinc-900 font-semibold rounded-xl hover:bg-zinc-100 transition-colors"
            >
              Contactar ventas
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
