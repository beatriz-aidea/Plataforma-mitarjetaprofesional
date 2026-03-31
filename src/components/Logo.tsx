import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export default function Logo({ className = "h-8", showText = true }: LogoProps) {
  const navigate = useNavigate();
  
  return (
    <div 
      className={`flex items-center gap-3 cursor-pointer select-none ${className}`}
      onClick={() => navigate('/')}
    >
      <img src="/logoQr.svg" alt="AIDEA QR Logo" className="h-full w-auto flex-shrink-0 object-contain" />
      {showText && (
        <img src="/AIDEA_VCARD.svg" alt="AIDEA VCARD" className="h-full w-auto flex-shrink-0 object-contain" style={{ height: '100%' }} />
      )}
    </div>
  );
}
