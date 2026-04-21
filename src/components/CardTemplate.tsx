import React from 'react';
import { Phone, Mail, Globe, Building2, Linkedin, Instagram, Twitter, Music2, FileText } from 'lucide-react';

interface CardTemplateProps {
  templateId: number;
  color: string;
  logo: string | null;
  companyLogo?: string | null;
  companyLogoSize?: 'S' | 'M' | 'L';
  data: {
    firstName: string;
    lastName: string;
    role: string;
    company: string;
    mobile: string;
    landline: string;
    email: string;
    website: string;
    linkedin: string;
    instagram: string;
    twitter: string;
    tiktok: string;
  };
}

export default function CardTemplate({ templateId, color, logo, companyLogo, companyLogoSize = 'M', data }: CardTemplateProps) {
  const { firstName, lastName, role, company, mobile, landline, email, website, linkedin, instagram, twitter, tiktok } = data;
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const displayRole = [role, company].filter(Boolean).join(' - ');

  // Common styles
  const bgWhite = 'bg-white text-zinc-900';
  const bgBlack = 'bg-zinc-900 text-white';
  const bgBeige = 'bg-[#f5ebe0] text-zinc-900';

  const renderLogo = (className = "w-12 h-12") => {
    if (logo) {
      if (logo.startsWith('data:application/pdf')) {
        return (
          <div className={`${className} bg-zinc-100 rounded flex flex-col items-center justify-center text-zinc-500`}>
            <FileText className="w-1/2 h-1/2 mb-0.5" />
            <span className="text-[8px] font-bold">PDF</span>
          </div>
        );
      }
      return <img src={logo} alt="Logo" className={`${className} object-contain`} />;
    }
    return (
      <div className={`${className} bg-zinc-200 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-500`}>
        LOGO
      </div>
    );
  };

  const companyLogoSizeMap = { S: 'h-6', M: 'h-10', L: 'h-16' };
  const renderCompanyLogo = () => {
    if (companyLogo) {
      return <img src={companyLogo} alt="Logo empresa" className={`${companyLogoSizeMap[companyLogoSize ?? 'M']} w-auto max-w-[160px] object-contain`} />;
    }
    return <div className={`${companyLogoSizeMap[companyLogoSize ?? 'M']} w-24 bg-zinc-200 rounded flex items-center justify-center text-[8px] font-bold text-zinc-400`}>LOGO</div>;
  };

  const renderContact = (className = "text-[8px] flex flex-col gap-1", iconColor = "text-zinc-500") => (
    <div className={className}>
      {mobile && <div className="flex items-center gap-1.5"><Phone className={`w-2.5 h-2.5 ${iconColor}`} /> {mobile}</div>}
      {landline && <div className="flex items-center gap-1.5"><Phone className={`w-2.5 h-2.5 ${iconColor}`} /> {landline}</div>}
      {email && <div className="flex items-center gap-1.5"><Mail className={`w-2.5 h-2.5 ${iconColor}`} /> {email}</div>}
      {website && <div className="flex items-center gap-1.5"><Globe className={`w-2.5 h-2.5 ${iconColor}`} /> {website}</div>}
      {linkedin && <div className="flex items-center gap-1.5"><Linkedin className={`w-2.5 h-2.5 ${iconColor}`} /> {linkedin}</div>}
      {instagram && <div className="flex items-center gap-1.5"><Instagram className={`w-2.5 h-2.5 ${iconColor}`} /> {instagram}</div>}
      {twitter && <div className="flex items-center gap-1.5"><Twitter className={`w-2.5 h-2.5 ${iconColor}`} /> {twitter}</div>}
      {tiktok && <div className="flex items-center gap-1.5"><Music2 className={`w-2.5 h-2.5 ${iconColor}`} /> {tiktok}</div>}
    </div>
  );

  const renderContactHorizontal = (className = "text-[8px] flex flex-wrap gap-3", iconColor = "text-zinc-500") => (
    <div className={className}>
      {mobile && <div className="flex items-center gap-1"><Phone className={`w-2.5 h-2.5 ${iconColor}`} /> {mobile}</div>}
      {landline && <div className="flex items-center gap-1"><Phone className={`w-2.5 h-2.5 ${iconColor}`} /> {landline}</div>}
      {email && <div className="flex items-center gap-1"><Mail className={`w-2.5 h-2.5 ${iconColor}`} /> {email}</div>}
      {website && <div className="flex items-center gap-1"><Globe className={`w-2.5 h-2.5 ${iconColor}`} /> {website}</div>}
      {linkedin && <div className="flex items-center gap-1"><Linkedin className={`w-2.5 h-2.5 ${iconColor}`} /> {linkedin}</div>}
      {instagram && <div className="flex items-center gap-1"><Instagram className={`w-2.5 h-2.5 ${iconColor}`} /> {instagram}</div>}
      {twitter && <div className="flex items-center gap-1"><Twitter className={`w-2.5 h-2.5 ${iconColor}`} /> {twitter}</div>}
      {tiktok && <div className="flex items-center gap-1"><Music2 className={`w-2.5 h-2.5 ${iconColor}`} /> {tiktok}</div>}
    </div>
  );

  const renderContactGrid = (className = "text-[8px] grid grid-cols-3 gap-x-3 gap-y-1", iconColor = "text-zinc-500") => (
    <div className={className}>
      {mobile && <div className="flex items-center gap-1.5"><Phone className={`w-2.5 h-2.5 ${iconColor}`} /> {mobile}</div>}
      {landline && <div className="flex items-center gap-1.5"><Phone className={`w-2.5 h-2.5 ${iconColor}`} /> {landline}</div>}
      {email && <div className="flex items-center gap-1.5"><Mail className={`w-2.5 h-2.5 ${iconColor}`} /> {email}</div>}
      {website && <div className="flex items-center gap-1.5"><Globe className={`w-2.5 h-2.5 ${iconColor}`} /> {website}</div>}
      {linkedin && <div className="flex items-center gap-1.5"><Linkedin className={`w-2.5 h-2.5 ${iconColor}`} /> {linkedin}</div>}
      {instagram && <div className="flex items-center gap-1.5"><Instagram className={`w-2.5 h-2.5 ${iconColor}`} /> {instagram}</div>}
      {twitter && <div className="flex items-center gap-1.5"><Twitter className={`w-2.5 h-2.5 ${iconColor}`} /> {twitter}</div>}
      {tiktok && <div className="flex items-center gap-1.5"><Music2 className={`w-2.5 h-2.5 ${iconColor}`} /> {tiktok}</div>}
    </div>
  );

  switch (templateId) {
    case 1:
      return (
        <div className={`w-full h-full ${bgWhite} p-6 flex flex-col justify-between relative`}>
          <div>
            <div className="mb-3">{renderCompanyLogo()}</div>
            <h4 className="text-sm font-bold uppercase tracking-wide">{fullName}</h4>
            <p className="text-[9px] text-zinc-500 mt-0.5">{displayRole}</p>
          </div>
          {renderContact()}
        </div>
      );
    case 2:
      return (
        <div className={`w-full h-full ${bgWhite} p-6 flex flex-col justify-between relative`}>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide">{fullName}</h4>
            <p className="text-[9px] text-zinc-500 mt-0.5">{displayRole}</p>
          </div>
          {renderContact()}
        </div>
      );
    case 3:
      return (
        <div className={`w-full h-full ${bgWhite} p-6 flex flex-col items-center justify-between text-center relative`}>
          <div className="mt-2">{renderCompanyLogo()}</div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide">{fullName}</h4>
            <p className="text-[9px] text-zinc-500 mt-0.5">{displayRole}</p>
          </div>
          {renderContactGrid()}
        </div>
      );
    case 4:
      return (
        <div className={`w-full h-full ${bgWhite} p-6 flex flex-col items-end justify-between text-right relative`}>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide">{fullName}</h4>
            <p className="text-[9px] text-zinc-500 mt-0.5">{displayRole}</p>
          </div>
          {renderContactGrid()}
        </div>
      );
    case 5:
      return (
        <div className={`w-full h-full ${bgWhite} p-6 flex flex-col justify-between relative`}>
          <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: color }} />
          <div className="pl-4 flex items-center gap-3">
            {renderCompanyLogo()}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide">{fullName}</h4>
              <p className="text-[9px] text-zinc-500 mt-0.5">{displayRole}</p>
            </div>
          </div>
          <div className="pl-4">
            {renderContact()}
          </div>
        </div>
      );
    case 6:
      return (
        <div className={`w-full h-full ${bgWhite} p-6 flex flex-col justify-between relative`}>
          <div className="w-3/4 p-3 mt-2" style={{ backgroundColor: color }}>
            <h4 className="text-sm font-bold uppercase tracking-wide text-white">{fullName}</h4>
            <p className="text-[9px] text-white/80 mt-0.5">{displayRole}</p>
          </div>
          {renderContact()}
        </div>
      );
    case 7:
      return (
        <div className={`w-full h-full ${bgBeige} p-6 flex flex-col items-center justify-center text-center relative`}>
          <div className="mb-6">
            <h4 className="text-lg font-serif uppercase tracking-widest">{fullName}</h4>
            <p className="text-[9px] text-zinc-600 mt-1 uppercase tracking-widest">{displayRole}</p>
          </div>
          <div className="absolute bottom-6 w-full px-6">
            {renderContactGrid()}
          </div>
        </div>
      );
    case 8:
      return (
        <div className={`w-full h-full ${bgBeige} p-6 flex flex-col justify-between relative`}>
          <div className="flex items-center gap-3">
            {renderCompanyLogo()}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide">{fullName}</h4>
              <p className="text-[9px] text-zinc-600 mt-0.5">{displayRole}</p>
            </div>
          </div>
          {renderContact()}
        </div>
      );
    case 9:
      return (
        <div className={`w-full h-full ${bgBlack} p-6 flex flex-col justify-between relative`}>
          <div className="flex items-center gap-3">
            {renderCompanyLogo()}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide text-white">{fullName}</h4>
              <p className="text-[9px] text-zinc-400 mt-0.5">{displayRole}</p>
            </div>
          </div>
          {renderContact("text-[8px] flex flex-col gap-1", "text-zinc-400")}
        </div>
      );
    case 10:
      return (
        <div className={`w-full h-full ${bgBlack} p-6 flex flex-col justify-between relative`}>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide text-white">{fullName}</h4>
            <p className="text-[9px] text-zinc-400 mt-0.5">{displayRole}</p>
            <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: color }} />
          </div>
          {renderContact("text-[8px] flex flex-col gap-1", "text-zinc-400")}
        </div>
      );
    case 11:
      return (
        <div className={`w-full h-full ${bgBlack} p-6 flex flex-col justify-between relative`}>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide text-white">{fullName}</h4>
            <p className="text-[9px] text-zinc-400 mt-0.5">{displayRole}</p>
          </div>
          {renderContact("text-[8px] flex flex-col gap-1", "text-zinc-400")}
        </div>
      );
    case 12:
      return (
        <div className={`w-full h-full ${bgBlack} p-6 flex items-center gap-6 relative`}>
          <div className="flex-shrink-0">
            {renderCompanyLogo()}
          </div>
          <div className="w-px h-24 bg-zinc-700" />
          <div className="flex flex-col justify-between h-24 py-1">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide text-white" style={{ color }}>{fullName}</h4>
              <p className="text-[9px] text-zinc-400 mt-0.5">{displayRole}</p>
            </div>
            {renderContact("text-[8px] flex flex-col gap-1", "text-zinc-400")}
          </div>
        </div>
      );
    case 13:
      return (
        <div className={`w-full h-full ${bgWhite} p-6 flex flex-col items-center justify-center text-center relative`}>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {mobile && <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center"><Phone className="w-3 h-3 text-zinc-600" /></div>}
            {landline && <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center"><Phone className="w-3 h-3 text-zinc-600" /></div>}
            {email && <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center"><Mail className="w-3 h-3 text-zinc-600" /></div>}
            {website && <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center"><Globe className="w-3 h-3 text-zinc-600" /></div>}
            {linkedin && <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center"><Linkedin className="w-3 h-3 text-zinc-600" /></div>}
            {instagram && <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center"><Instagram className="w-3 h-3 text-zinc-600" /></div>}
            {twitter && <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center"><Twitter className="w-3 h-3 text-zinc-600" /></div>}
            {tiktok && <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center"><Music2 className="w-3 h-3 text-zinc-600" /></div>}
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide">{fullName}</h4>
            <p className="text-[9px] text-zinc-500 mt-0.5">{displayRole}</p>
          </div>
        </div>
      );
    case 14:
      return (
        <div className={`w-full h-full ${bgWhite} p-6 flex flex-col justify-between relative`}>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide">{fullName}</h4>
            <p className="text-[9px] text-zinc-500 mt-0.5">{displayRole}</p>
          </div>
          {renderContact()}
        </div>
      );
    case 15:
      return (
        <div className={`w-full h-full ${bgWhite} p-6 flex flex-col justify-between relative`}>
          <div className="flex justify-between items-start">
            <h4 className="text-sm font-bold uppercase tracking-wide w-1/2">{fullName}</h4>
            <p className="text-[9px] text-zinc-500 text-right w-1/2">{displayRole}</p>
          </div>
          <div className="flex justify-between items-end">
            <div className="w-1/2">{renderContact()}</div>
            <div className="w-1/2 flex justify-end">{renderCompanyLogo()}</div>
          </div>
        </div>
      );
    case 16:
      return (
        <div className={`w-full h-full ${bgWhite} p-6 flex flex-col justify-between items-center text-center relative`}>
          <div className="w-full h-px bg-zinc-300 mt-2" />
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide">{fullName}</h4>
            <p className="text-[9px] text-zinc-500 mt-0.5">{displayRole}</p>
          </div>
          <div className="w-full">
            {renderContactGrid()}
            <div className="w-full h-px bg-zinc-300 mt-2" />
          </div>
        </div>
      );
    case 17:
      return (
        <div className={`w-full h-full ${bgWhite} p-6 flex flex-col justify-between relative overflow-hidden`}>
          <div className="absolute top-0 left-0 w-24 h-24 -translate-x-12 -translate-y-12 rotate-45" style={{ backgroundColor: color }} />
          <div className="pl-4 mt-4">
            <h4 className="text-sm font-bold uppercase tracking-wide">{fullName}</h4>
            <p className="text-[9px] text-zinc-500 mt-0.5">{displayRole}</p>
          </div>
          <div className="pl-4">
            {renderContact()}
          </div>
        </div>
      );
    case 18:
      return (
        <div className={`w-full h-full ${bgWhite} p-6 flex items-center gap-6 relative`}>
          <div className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center text-white text-center p-2" style={{ backgroundColor: color }}>
            <div>
              <h4 className="text-[10px] font-bold uppercase leading-tight">{firstName}<br/>{lastName}</h4>
              <p className="text-[6px] mt-1 opacity-80">{displayRole}</p>
            </div>
          </div>
          <div className="flex-1">
            {renderContact()}
          </div>
        </div>
      );
    case 19:
      return (
        <div className={`w-full h-full ${bgWhite} p-6 flex flex-col justify-between relative`}>
          <div className="absolute left-0 top-0 bottom-0 w-8" style={{ backgroundColor: color }} />
          <div className="pl-6 flex items-center gap-3">
            {renderCompanyLogo()}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide">{fullName}</h4>
              <p className="text-[9px] text-zinc-500 mt-0.5">{displayRole}</p>
            </div>
          </div>
          <div className="pl-6">
            {renderContact()}
          </div>
        </div>
      );
    case 20:
      return (
        <div className={`w-full h-full ${bgWhite} p-6 flex flex-col items-end justify-between text-right relative`}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-zinc-200" />
          <div className="relative z-10 mt-2 mr-2">
            <h4 className="text-sm font-bold uppercase tracking-wide">{fullName}</h4>
            <p className="text-[9px] text-zinc-500 mt-0.5">{displayRole}</p>
          </div>
          {renderContact("text-[8px] flex flex-col gap-1 items-end")}
        </div>
      );
    default:
      return null;
  }
}
