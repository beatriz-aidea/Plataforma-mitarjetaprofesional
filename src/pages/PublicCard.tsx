import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import Logo from '../components/Logo';
import { Phone, Mail, Globe, MapPin, Linkedin, Instagram, Twitter, Download, Share2, Building2, Wallet } from 'lucide-react';

export default function PublicCard() {
  const { cardId } = useParams();
  const { user } = useAuth();
  const [card, setCard] = useState<any>(null);
  const [ownerRole, setOwnerRole] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCard = async () => {
      if (!cardId) return;
      try {
        const decodedCardId = decodeURIComponent((cardId || '').replace(/\+/g, '%2B'));
        const docRef = doc(db, 'cards', decodedCardId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().status === 'active') {
          const cardData = docSnap.data();
          setCard(cardData);
          
          // Only fetch owner's role if the current visitor is the owner or an admin
          // This prevents permission denied errors for public visitors
          if (cardData.ownerUid && user && (user.uid === cardData.ownerUid || user.email === 'beatriz@aidea.es' || user.uid === 'IekQHWYb1Ja2S7JB62th04pJkyZ2')) {
            try {
              const userRef = doc(db, 'users', cardData.ownerUid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                setOwnerRole(userSnap.data().role || 'free');
              }
            } catch (roleErr) {
              console.warn("Could not fetch owner role:", roleErr);
            }
          }
        } else {
          setError('Tarjeta no encontrada o inactiva');
        }
      } catch (err) {
        console.error("Error fetching card", err);
        setError('Error al cargar la tarjeta');
      } finally {
        setLoading(false);
      }
    };
    fetchCard();
  }, [cardId, user]);

  const generateVCard = () => {
    if (!card) return;
    
    const { identity, contact, address, context } = card;
    
    const vcard = `BEGIN:VCARD
VERSION:3.0
N:${identity.lastName};${identity.firstName};;;
FN:${identity.firstName} ${identity.lastName}
ORG:${identity.company || ''}
TITLE:${identity.role || ''}
TEL;TYPE=CELL:${contact.mobile || ''}
TEL;TYPE=WORK,VOICE:${contact.landline || ''}
EMAIL;TYPE=WORK,INTERNET:${contact.email || ''}
URL:${contact.website || ''}
NOTE:${context.notes || ''}
ADR;TYPE=WORK:;;${address.street || ''};${address.city || ''};${address.province || ''};${address.zip || ''};${address.country || ''}
END:VCARD`;

    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${identity.firstName}_${identity.lastName}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Tarjeta Profesional de ${card.identity.firstName} ${card.identity.lastName}`,
          url: shareUrl,
        });
      } catch (err) {
        console.error("Error sharing", err);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Enlace copiado al portapapeles');
    }
  };

  const handleAddToWallet = () => {
    alert('Funcionalidad de Wallet en desarrollo. Próximamente podrás descargar tu pase para Apple Wallet y Google Wallet.');
  };

  const formatUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50">Cargando...</div>;
  if (error || !card) return <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-red-500">{error}</div>;

  const hasPremiumFeatures = ownerRole === 'subscription' || ownerRole === 'enterprise' || ownerRole === 'admin';
  const canShare = card.isAnonymous ? false : (card.ownerRole ? (card.ownerRole !== 'free') : hasPremiumFeatures);

  const primaryColor = card.settings?.primaryColor || '#000000';
  const secondaryColor1 = card.settings?.secondaryColor1 || '#ffffff';
  const secondaryColor2 = card.settings?.secondaryColor2 || '#f4f4f5';
  const showPhoto = card.settings?.showPhoto ?? true;
  const showLogo = card.settings?.showLogo ?? true; // We don't have a logo field yet, but we'll use it if added later

  return (
    <div className="min-h-screen font-sans pb-20" style={{ backgroundColor: secondaryColor2 }}>
      <div className="max-w-md mx-auto min-h-screen shadow-xl relative" style={{ backgroundColor: secondaryColor1 }}>
        {/* Header Background */}
        <div className="h-48 relative" style={{ backgroundColor: primaryColor }}>
          {showLogo && card.settings?.qrLogoUrl && (
            <div className="absolute top-4 left-4 w-16 h-16 bg-white rounded-xl p-2 shadow-md flex items-center justify-center">
              <img src={card.settings.qrLogoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          )}
          {canShare && (
            <div className="absolute top-4 right-4 flex gap-2">
              <button onClick={handleShare} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="px-6 relative -mt-20 mb-8 text-center">
          {showPhoto && (
            <div className="w-32 h-32 mx-auto bg-white rounded-full p-1 shadow-lg mb-4">
              {card.identity.photoUrl ? (
                <img src={card.identity.photoUrl} alt="Profile" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full rounded-full bg-zinc-100 flex items-center justify-center text-4xl text-zinc-400 font-bold">
                  {card.identity.firstName[0]}{card.identity.lastName[0]}
                </div>
              )}
            </div>
          )}
          <h1 className="text-2xl font-bold text-zinc-900 mt-4">{card.identity.firstName} {card.identity.lastName}</h1>
          <p className="text-lg font-medium mb-1" style={{ color: primaryColor }}>{card.identity.role}</p>
          {card.identity.company && (
            <p className="text-zinc-500 flex items-center justify-center gap-1">
              <Building2 className="w-4 h-4" /> {card.identity.company}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-6 mb-8 space-y-3">
          <button
            onClick={generateVCard}
            className="w-full py-4 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg"
            style={{ backgroundColor: primaryColor, boxShadow: `0 10px 15px -3px ${primaryColor}40` }}
          >
            <Download className="w-5 h-5" />
            Guardar en Contactos
          </button>
          
          {hasPremiumFeatures && (
            <button
              onClick={handleAddToWallet}
              className="w-full py-4 bg-black text-white rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors shadow-lg shadow-black/20"
            >
              <Wallet className="w-5 h-5" />
              Añadir a Wallet
            </button>
          )}
        </div>

        {/* Contact Details */}
        <div className="px-6 space-y-6">
          <div className="bg-white/50 rounded-3xl p-6 space-y-4 border border-zinc-100 backdrop-blur-sm">
            {card.contact.mobile && (
              <a href={`tel:${card.contact.mobile}`} className="flex items-center gap-4 text-zinc-700 transition-colors" style={{ '--hover-color': primaryColor } as any}>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0" style={{ color: primaryColor }}>
                  <Phone className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-zinc-500 mb-0.5">Móvil</p>
                  <p className="font-medium truncate">{card.contact.mobile}</p>
                </div>
              </a>
            )}
            
            {card.contact.email && (
              <a href={`mailto:${card.contact.email}`} className="flex items-center gap-4 text-zinc-700 transition-colors">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0" style={{ color: primaryColor }}>
                  <Mail className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-zinc-500 mb-0.5">Email</p>
                  <p className="font-medium truncate">{card.contact.email}</p>
                </div>
              </a>
            )}

            {card.contact.website && (
              <a href={formatUrl(card.contact.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 text-zinc-700 transition-colors">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0" style={{ color: primaryColor }}>
                  <Globe className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-zinc-500 mb-0.5">Sitio Web</p>
                  <p className="font-medium truncate">{card.contact.website.replace(/^https?:\/\//, '')}</p>
                </div>
              </a>
            )}

            {(card.address.street || card.address.city) && (
              <div className="flex items-center gap-4 text-zinc-700">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0" style={{ color: primaryColor }}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-zinc-500 mb-0.5">Dirección</p>
                  <p className="font-medium truncate">
                    {[card.address.street, card.address.city, card.address.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Social Links */}
          {(card.social.linkedin || card.social.twitter || card.social.instagram || card.social.tiktok) && (
            <div className="flex justify-center gap-4 py-4">
              {card.social.linkedin && (
                <a href={formatUrl(card.social.linkedin)} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white rounded-full flex items-center justify-center transition-colors shadow-sm" style={{ color: primaryColor }}>
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
              {card.social.twitter && (
                <a href={formatUrl(card.social.twitter)} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white rounded-full flex items-center justify-center transition-colors shadow-sm" style={{ color: primaryColor }}>
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {card.social.instagram && (
                <a href={formatUrl(card.social.instagram)} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white rounded-full flex items-center justify-center transition-colors shadow-sm" style={{ color: primaryColor }}>
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {card.social.tiktok && (
                <a href={formatUrl(card.social.tiktok)} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white rounded-full flex items-center justify-center transition-colors shadow-sm" style={{ color: primaryColor }}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </a>
              )}
            </div>
          )}

          {/* Context Notes */}
          {card.context.notes && (
            <div className="bg-brand-50 rounded-3xl p-6 border border-brand-100">
              <h3 className="text-sm font-bold text-brand-900 mb-2 uppercase tracking-wider">Sobre mí</h3>
              <p className="text-brand-800 text-sm leading-relaxed">{card.context.notes}</p>
            </div>
          )}
          {/* Footer Logo */}
          <div className="flex justify-center py-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            <Logo />
          </div>
        </div>
      </div>
    </div>
  );
}
