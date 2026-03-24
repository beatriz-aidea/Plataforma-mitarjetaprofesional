import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QrCode, Smartphone, Building2, CheckCircle2, X, Mail } from 'lucide-react';

export default function Landing() {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setAuthError('');
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/unauthorized-domain') {
        setAuthError('Error: Este dominio no está autorizado en Firebase. Añade la URL de esta app en Firebase > Authentication > Settings > Authorized domains.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setAuthError('Se cerró la ventana emergente antes de terminar.');
      } else {
        setAuthError(`Error con Google: ${error.message || error.code}`);
      }
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      navigate('/dashboard');
    } catch (error: any) {
      console.error("Auth failed", error);
      if (error.code === 'auth/email-already-in-use') {
        setAuthError('El correo ya está en uso.');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        setAuthError('Credenciales incorrectas.');
      } else if (error.code === 'auth/weak-password') {
        setAuthError('La contraseña debe tener al menos 6 caracteres.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setAuthError('Error: El acceso por correo no está habilitado en tu consola de Firebase.');
      } else {
        setAuthError(`Error: ${error.message || error.code}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const openAuthModal = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logoQr.svg" alt="Logo" className="w-8 h-8" />
            <span className="font-bold text-xl tracking-tight">Mi Tarjeta Profesional</span>
          </div>
          <button
            onClick={openAuthModal}
            className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
          >
            {user ? 'Ir al Panel' : 'Acceder / Registro'}
          </button>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-xl">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl font-bold text-center mb-6">
              {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </h2>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-zinc-300 rounded-xl hover:bg-zinc-50 transition-colors font-medium mb-6"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Continuar con Google
            </button>

            <div className="relative flex items-center py-2 mb-6">
              <div className="flex-grow border-t border-zinc-200"></div>
              <span className="flex-shrink-0 mx-4 text-zinc-400 text-sm">o con tu correo</span>
              <div className="flex-grow border-t border-zinc-200"></div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Correo electrónico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="tu@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Contraseña</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="••••••••"
                />
              </div>

              {authError && (
                <p className="text-red-500 text-sm">{authError}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Cargando...' : (isLogin ? 'Entrar' : 'Registrarse')}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-zinc-600">
              {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
              <button 
                onClick={() => { setIsLogin(!isLogin); setAuthError(''); }}
                className="text-brand-600 font-medium hover:underline"
              >
                {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main>
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-900 mb-6">
            Tu identidad profesional,<br />
            <span className="text-brand-600">siempre contigo.</span>
          </h1>
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto mb-10">
            Crea, gestiona y comparte tu tarjeta de visita digital mediante QR o NFC. 
            Olvídate del papel y conecta al instante.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={openAuthModal}
              className="px-8 py-4 bg-brand-600 text-white text-lg font-semibold rounded-xl hover:bg-brand-700 transition-colors w-full sm:w-auto"
            >
              Crear mi tarjeta gratis
            </button>
            <a
              href="#planes"
              className="px-8 py-4 bg-white text-zinc-900 border border-zinc-200 text-lg font-semibold rounded-xl hover:bg-zinc-50 transition-colors w-full sm:w-auto"
            >
              Ver planes
            </a>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-white border-y border-zinc-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <QrCode className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3">Comparte al instante</h3>
                <p className="text-zinc-600">Muestra tu código QR o acerca tu tarjeta NFC. El contacto se guarda directamente en el móvil de tu cliente.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Smartphone className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3">Siempre actualizada</h3>
                <p className="text-zinc-600">Cambia de teléfono o de empresa y tu tarjeta se actualizará automáticamente. Sin reimprimir nada.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Building2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3">Gestión de equipos</h3>
                <p className="text-zinc-600">Controla las tarjetas de todos tus empleados desde un único panel corporativo.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="planes" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Planes adaptados a ti</h2>
            <p className="text-zinc-600">Elige la opción que mejor encaje con tus necesidades profesionales.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm flex flex-col">
              <h3 className="text-xl font-semibold mb-2">Gratuito</h3>
              <div className="text-4xl font-bold mb-6">0€<span className="text-lg text-zinc-500 font-normal">/mes</span></div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-zinc-600">Generación de QR básico</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-zinc-600">Enlace público</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-zinc-600">Opción de pedir tarjeta física (pago único)</span></li>
              </ul>
              <button onClick={openAuthModal} className="w-full py-3 rounded-xl font-medium bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-colors">
                Empezar gratis
              </button>
            </div>

            {/* Pro */}
            <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-900 shadow-xl flex flex-col relative transform md:-translate-y-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                Más popular
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Suscripción</h3>
              <div className="text-4xl font-bold mb-6 text-white">1,50€<span className="text-lg text-zinc-400 font-normal">/mes</span></div>
              <p className="text-zinc-400 text-sm mb-6">Facturado anualmente (18€/año)</p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" /><span className="text-zinc-300">Todo lo del plan gratuito</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" /><span className="text-zinc-300">Landing page personalizada</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" /><span className="text-zinc-300">Modificación de datos ilimitada</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" /><span className="text-zinc-300">Añadir a Apple/Google Wallet</span></li>
              </ul>
              <button onClick={openAuthModal} className="w-full py-3 rounded-xl font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors">
                Suscribirse
              </button>
            </div>

            {/* Enterprise */}
            <div className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm flex flex-col">
              <h3 className="text-xl font-semibold mb-2">Empresa</h3>
              <div className="text-4xl font-bold mb-6">A medida</div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-zinc-600">Gestión centralizada de empleados</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-zinc-600">Diseño corporativo unificado</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-zinc-600">Control de accesos y permisos</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-zinc-600">Analítica de escaneos</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-zinc-600">Enlaces interactivos personalizados</span></li>
              </ul>
              <button className="w-full py-3 rounded-xl font-medium bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-colors">
                Contactar ventas
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-zinc-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-zinc-500">
          <p>© {new Date().getFullYear()} Mi Tarjeta Profesional. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
