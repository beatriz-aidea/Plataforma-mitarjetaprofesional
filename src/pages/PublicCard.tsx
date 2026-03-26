import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
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
        const docRef = doc(db, 'cards', cardId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().status === 'active') {
          const cardData = docSnap.data();
          setCard(cardData);
          
          // Only fetch owner's role if the current visitor is the owner or an admin
          // This prevents permission denied errors for public visitors
          if (cardData.ownerUid && user && (user.uid === cardData.ownerUid || user.email === 'beatriz@aidea.es')) {
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50">Cargando...</div>;
  if (error || !card) return <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-red-500">{error}</div>;

  const hasPremiumFeatures = ownerRole === 'subscription' || ownerRole === 'enterprise' || ownerRole === 'admin';

  const primaryColor = card.settings?.primaryColor || '#4f46e5'; // brand-600 default
  const secondaryColor1 = card.settings?.secondaryColor1 || '#18181b'; // zinc-900 default
  const secondaryColor2 = card.settings?.secondaryColor2 || '#fafafa'; // zinc-50 default

  return (
    <div className="min-h-screen bg-zinc-50 font-sans pb-20">
      <style>
        {`
          .dynamic-hover:hover {
            color: ${primaryColor} !important;
          }
          .dynamic-bg-hover:hover {
            background-color: ${primaryColor} !important;
            color: white !important;
          }
          .dynamic-border {
            border-color: ${primaryColor} !important;
          }
          .dynamic-bg-light {
            background-color: ${primaryColor}15 !important; /* 15 is hex for ~8% opacity */
            color: ${primaryColor} !important;
          }
        `}
      </style>
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl relative">
        {/* Header Background */}
        <div className="h-48 relative" style={{ backgroundColor: primaryColor }}>
          {card.settings?.showLogo !== false && card.identity.logoUrl && (
            <div className="absolute top-4 left-4">
              <img src={card.identity.logoUrl} alt="Logo" className="h-12 object-contain bg-white/20 backdrop-blur-md p-2 rounded-lg" referrerPolicy="no-referrer" />
            </div>
          )}
          <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={handleShare} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Profile Info */}
        <div className="px-6 relative -mt-20 mb-8 text-center">
          <div className="w-32 h-32 mx-auto bg-white rounded-full p-1 shadow-lg mb-4">
            {card.settings?.showPhoto !== false && card.identity.photoUrl ? (
              <img src={card.identity.photoUrl} alt="Profile" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full rounded-full bg-zinc-100 flex items-center justify-center text-4xl text-zinc-400 font-bold">
                {card.identity.firstName[0]}{card.identity.lastName[0]}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">{card.identity.firstName} {card.identity.lastName}</h1>
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
            style={{ backgroundColor: secondaryColor1 }}
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
          <div className="rounded-3xl p-6 space-y-4 border border-zinc-100" style={{ backgroundColor: secondaryColor2 }}>
            {card.contact.mobile && (
              <a href={`tel:${card.contact.mobile}`} className="flex items-center gap-4 text-zinc-700 transition-colors dynamic-hover">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-zinc-500 mb-0.5">Móvil</p>
                  <p className="font-medium truncate">{card.contact.mobile}</p>
                </div>
              </a>
            )}
            
            {card.contact.email && (
              <a href={`mailto:${card.contact.email}`} className="flex items-center gap-4 text-zinc-700 transition-colors dynamic-hover">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-zinc-500 mb-0.5">Email</p>
                  <p className="font-medium truncate">{card.contact.email}</p>
                </div>
              </a>
            )}

            {card.contact.website && (
              <a href={card.contact.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 text-zinc-700 transition-colors dynamic-hover">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
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
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
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
                <a href={card.social.linkedin} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-zinc-100 text-zinc-600 rounded-full flex items-center justify-center transition-colors dynamic-bg-hover">
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
              {card.social.twitter && (
                <a href={card.social.twitter} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-zinc-100 text-zinc-600 rounded-full flex items-center justify-center transition-colors dynamic-bg-hover">
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {card.social.instagram && (
                <a href={card.social.instagram} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-zinc-100 text-zinc-600 rounded-full flex items-center justify-center transition-colors dynamic-bg-hover">
                  <Instagram className="w-5 h-5" />
                </a>
              )}
            </div>
          )}

          {/* Context Notes */}
          {card.context.notes && (
            <div className="rounded-3xl p-6 border dynamic-bg-light dynamic-border">
              <h3 className="text-sm font-bold mb-2 uppercase tracking-wider">Sobre mí</h3>
              <p className="text-sm leading-relaxed">{card.context.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
