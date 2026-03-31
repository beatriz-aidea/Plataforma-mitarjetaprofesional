import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Logo from '../components/Logo';
import { QRCodeSVG } from 'qrcode.react';
import { Check, ExternalLink, Download, ArrowLeft, ShoppingBag, LayoutDashboard, Pencil } from 'lucide-react';

export default function SuccessCard() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState<any>(null);

  useEffect(() => {
    console.log("SuccessCard mounted with cardId:", cardId);
    const fetchCard = async () => {
      if (!cardId) return;
      try {
        const decodedCardId = decodeURIComponent(cardId);
        const docSnap = await getDoc(doc(db, 'cards', decodedCardId));
        if (docSnap.exists()) {
          setCard(docSnap.data());
        }
      } catch (e) {
        console.error("Error fetching card", e);
      } finally {
        setLoading(false);
      }
    };
    fetchCard();
  }, [cardId]);

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR_${card.identity?.firstName || 'vcard'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (!card) return <div className="min-h-screen flex items-center justify-center">Tarjeta no encontrada</div>;

  const cardUrl = `${window.location.origin}/c/${encodeURIComponent(cardId || '')}`;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-zinc-100 p-8 text-center">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10" />
        </div>
        
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">¡Tarjeta Creada!</h1>
        <p className="text-zinc-500 mb-8">Tu tarjeta profesional digital y tu código QR están listos para ser compartidos.</p>
        
        <div className="bg-zinc-50 p-6 rounded-3xl mb-8 flex flex-col items-center">
          <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
            <QRCodeSVG 
              id="qr-code-svg"
              value={cardUrl} 
              size={200}
              level="H"
              includeMargin={true}
              imageSettings={(card.settings?.qrLogo && card.settings?.qrLogoUrl) || card.identity?.photoUrl ? {
                src: (card.settings?.qrLogo && card.settings?.qrLogoUrl) || card.identity.photoUrl,
                x: undefined,
                y: undefined,
                height: 40,
                width: 40,
                excavate: true,
              } : undefined}
            />
          </div>
          <button 
            onClick={downloadQR}
            className="flex items-center gap-2 text-brand-600 font-bold hover:text-brand-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            Descargar Código QR
          </button>
        </div>
        
        <div className="space-y-4">
          <button 
            onClick={() => navigate(`/edit/${encodeURIComponent(card.id)}`)}
            className="w-full py-4 bg-white text-zinc-900 border-2 border-zinc-900 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-50 transition-all"
          >
            <Pencil className="w-5 h-5" />
            Editar tarjeta
          </button>

          <button 
            onClick={() => window.open(cardUrl, '_blank')}
            className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-700 transition-all shadow-lg shadow-brand-600/20"
          >
            <ExternalLink className="w-5 h-5" />
            Ver tarjeta
          </button>

          <button 
            onClick={() => navigate('/store')}
            className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all"
          >
            <ShoppingBag className="w-5 h-5" />
            Pedir tarjetas
          </button>
          
          {(card.ownerRole && card.ownerRole !== 'free') && (
            <button 
              onClick={() => navigate('/dashboard')}
              className="w-full py-4 bg-zinc-100 text-zinc-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all"
            >
              <LayoutDashboard className="w-5 h-5" />
              Ir a mi Panel
            </button>
          )}
        </div>
      </div>
      
      <div className="mt-8">
        <Logo />
      </div>
    </div>
  );
}
