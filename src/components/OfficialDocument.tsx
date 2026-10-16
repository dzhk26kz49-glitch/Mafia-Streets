import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { User, ShieldCheck, Download, Share2, Check, Loader2, Sparkles } from 'lucide-react';
import { safeToDate } from '../lib/utils';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';

interface OfficialDocumentProps {
  doc: {
    id: string;
    header: string;
    subHeader: string;
    color: string;
    icon: any;
  };
  profile: any;
  getCountryName: (code: string) => string;
  showDownloadActions?: boolean;
}

export const OfficialDocument: React.FC<OfficialDocumentProps> = ({ 
  doc, 
  profile, 
  getCountryName,
  showDownloadActions = true
}) => {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  
  const issueDate = profile?.createdAt 
    ? safeToDate(profile.createdAt)
    : new Date(2024, 0, 1);
  const expiryDate = new Date(issueDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 5);
  
  const displayDocNumber = profile?.docNumber || 
    `ID-${profile?.uid?.slice(0, 3).toUpperCase()}-${profile?.uid?.slice(-4).toUpperCase()}-001`;
  
  const countryCode = profile?.country?.slice(0, 3).toUpperCase() || 'IRQ';
  const docType = doc.id === 'passport' ? 'P' : 'I';
  const cleanDocNum = displayDocNumber.replace(/[^A-Z0-9]/g, '').padEnd(9, '<');
  const birth = profile?.birthdate?.replace(/-/g, '').slice(2) || '900101';
  const expiry = format(expiryDate, 'yyMMdd');
  const namePart = (profile?.displayName?.toUpperCase().replace(/[^A-Z]/g, '<') || 'UNKNOWN<PLAYER').padEnd(30, '<');

  const mrzLine1 = `${docType}<${countryCode}${namePart.slice(0, 30)}`;
  const mrzLine2 = `${cleanDocNum}${birth}7M${expiry}5${countryCode}<<<<<<<<<<<8`;

  // Download high-resolution PNG
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cardRef.current || isDownloading) return;

    try {
      setIsDownloading(true);
      toast.loading('جاري توليد بطاقة الهوية بدقة فائقة...', { id: 'download-id' });

      // Generate ultra-sharp PNG with 2.5x pixel ratio
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
        quality: 1.0,
        backgroundColor: '#f4f4f5'
      });

      const filename = `MAFIA_ID_${(profile?.displayName || 'Card').replace(/[^\w\u0600-\u06FF]/g, '_')}.png`;
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();

      toast.success('تم تنزيل بطاقة الهوية الرسمية كصورة PNG بنجاح! 📥', { id: 'download-id' });
    } catch (err: any) {
      console.error('Download error:', err);
      toast.error('تعذر تنزيل الصورة، يرجى المحاولة مرة أخرى', { id: 'download-id' });
    } finally {
      setIsDownloading(false);
    }
  };

  // Share ID Card or copy image to clipboard
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cardRef.current || isSharing) return;

    try {
      setIsSharing(true);
      toast.loading('جاري تجهيز بطاقة الهوية للمشاركة...', { id: 'share-id' });

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
        quality: 1.0,
        backgroundColor: '#f4f4f5'
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `MAFIA_ID_${profile?.displayName || 'Card'}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `بطاقة هوية ${profile?.displayName || 'اللاعب'} في MAFIA STREETS`,
          text: `بطاقة الهوية الوطنية الرسمية المعتمدة في عالم المافيا! 🏛️`
        });
        toast.success('تمت المشاركة بنجاح! 🚀', { id: 'share-id' });
      } else {
        // Fallback: write image directly to clipboard
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setCopiedSuccess(true);
          setTimeout(() => setCopiedSuccess(false), 2500);
          toast.success('تم نسخ صورة بطاقة الهوية إلى الحافظة! يمكنك لصقها الآن في أي مكان. 📋', { id: 'share-id' });
        } catch {
          // If clipboard image copying isn't supported, trigger direct download
          const link = document.createElement('a');
          link.download = file.name;
          link.href = dataUrl;
          link.click();
          toast.success('تم حفظ بطاقة الهوية على جهازك لمشاركتها 📥', { id: 'share-id' });
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share error:', err);
        toast.error('تعذرت مشاركة الصورة', { id: 'share-id' });
      } else {
        toast.dismiss('share-id');
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* The Printable / Capturable Card Container */}
      <div 
        ref={cardRef}
        className="relative w-full aspect-[1.586/1] rounded-[1.25rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 bg-zinc-100 text-zinc-900 group transition-all duration-500 hover:scale-[1.01] hover:shadow-xl select-none"
      >
        {/* Subtle Guilloche & Radial Texture (Canvas/CORS-safe inline SVG) */}
        <div className="absolute inset-0 opacity-[0.15] pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,_transparent_0%,_rgba(0,0,0,0.12)_100%)]" />
          <svg width="100%" height="100%" className="absolute inset-0">
            <defs>
              <pattern id={`guilloche-${doc.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 20 Q 10 0 20 20 T 40 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-zinc-400" />
                <path d="M0 10 Q 10 30 20 10 T 40 10" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-zinc-300" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#guilloche-${doc.id})`} />
          </svg>
        </div>

        {/* Top Banner (Official Color) */}
        <div className={`absolute top-0 left-0 right-0 h-12 bg-gradient-to-r ${doc.color} flex items-center px-6 justify-between border-b border-black/10`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <doc.icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col text-right" dir="rtl">
              <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{doc.header}</span>
              <span className="text-[8px] font-bold text-white/70 uppercase leading-tight">{doc.subHeader}</span>
            </div>
          </div>
          <div className="text-right" dir="rtl">
            <span className="block text-[8px] font-black text-white/60 uppercase tracking-tighter">{t('government.documents.republicOf')}</span>
            <span className="block text-xs font-black text-white uppercase tracking-tight">{getCountryName(profile?.country)}</span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="mt-14 px-6 flex gap-6">
          {/* Left Column: Photo & Chip */}
          <div className="flex flex-col gap-4">
            {/* ID Photo */}
            <div className="relative w-28 h-36 bg-zinc-200 rounded-lg border-2 border-zinc-300 overflow-hidden shadow-md shrink-0">
              {profile?.photoURL ? (
                <img 
                  src={profile.photoURL} 
                  alt="ID" 
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover grayscale-[0.1] contrast-[1.1]" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400">
                  <User size={48} />
                </div>
              )}
              {/* Holographic Seal Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full border border-zinc-400/50 bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-60">
                <ShieldCheck size={14} className="text-zinc-600" />
              </div>
              {/* Red Stamped Seal Effect */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-4 border-red-600/30 rounded-full flex items-center justify-center rotate-[-25deg] pointer-events-none select-none opacity-40">
                <div className="border-2 border-red-600/30 rounded-full w-16 h-16 flex items-center justify-center">
                  <span className="text-[8px] font-black text-red-600/40 uppercase text-center leading-none">OFFICIAL<br/>SEAL</span>
                </div>
              </div>
            </div>

            {/* Electronic Chip */}
            <div className="w-10 h-8 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 rounded-md border border-amber-700/30 flex flex-col p-1 gap-0.5 shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.3)_50%,transparent_100%)] -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <div className="h-px bg-amber-800/20 w-full" />
              <div className="h-px bg-amber-800/20 w-full" />
              <div className="flex gap-1 h-full">
                <div className="w-px bg-amber-800/20 h-full" />
                <div className="w-px bg-amber-800/20 h-full" />
              </div>
            </div>
          </div>

          {/* Right Column: Data Fields */}
          <div className="flex-1 space-y-3" dir="rtl">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="col-span-2 border-b border-zinc-200 pb-1">
                <div className="flex justify-between text-[7px] font-bold text-zinc-400 uppercase tracking-tighter">
                  <span>الاسم واللقب / FULL NAME</span>
                </div>
                <span className="text-sm font-black text-zinc-800 uppercase tracking-tight block truncate">
                  {profile?.displayName || 'لاعب مجهول'}
                </span>
              </div>

              <div className="border-b border-zinc-200 pb-1">
                <div className="flex justify-between text-[7px] font-bold text-zinc-400 uppercase tracking-tighter">
                  <span>تاريخ الميلاد / DATE OF BIRTH</span>
                </div>
                <span className="text-[10px] font-bold text-zinc-700 font-mono">
                  {profile?.birthdate || '1990-01-01'}
                </span>
              </div>

              <div className="border-b border-zinc-200 pb-1">
                <div className="flex justify-between text-[7px] font-bold text-zinc-400 uppercase tracking-tighter">
                  <span>الجنسية / NATIONALITY</span>
                </div>
                <span className="text-[10px] font-bold text-zinc-700 uppercase">
                  {getCountryName(profile?.country)}
                </span>
              </div>

              <div className="border-b border-zinc-200 pb-1">
                <div className="flex justify-between text-[7px] font-bold text-zinc-400 uppercase tracking-tighter">
                  <span>تاريخ الإصدار / ISSUE DATE</span>
                </div>
                <span className="text-[10px] font-bold text-zinc-700 font-mono">
                  {format(issueDate, 'yyyy-MM-dd')}
                </span>
              </div>

              <div className="border-b border-zinc-200 pb-1">
                <div className="flex justify-between text-[7px] font-bold text-zinc-400 uppercase tracking-tighter">
                  <span>تاريخ الانتهاء / EXPIRY DATE</span>
                </div>
                <span className="text-[10px] font-bold text-zinc-700 font-mono">
                  {format(expiryDate, 'yyyy-MM-dd')}
                </span>
              </div>
            </div>

            {/* QR Code & Signature */}
            <div className="flex justify-between items-end pt-2">
              <div className="flex flex-col gap-1">
                <span className="text-[6px] font-bold text-zinc-400 uppercase tracking-widest">توقيع صاحب المستند</span>
                <div className="h-8 w-28 border-b border-zinc-300 flex items-end pb-1">
                  <span className="font-serif italic text-xs text-zinc-500 opacity-80 select-none">
                    {profile?.displayName?.split(' ')[0] || 'التوقيع'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1 items-end">
                <span className="text-[6px] font-bold text-zinc-400 uppercase tracking-widest">توقيع السلطة المصدرة</span>
                <div className="h-8 w-28 border-b border-zinc-300 flex items-end justify-end pb-1">
                  <span className="font-serif italic text-[10px] text-zinc-400 opacity-60 select-none">
                    وزير الداخلية
                  </span>
                </div>
              </div>
              
              {/* Simulated QR Code */}
              <div className="relative w-12 h-12 bg-white p-1 border border-zinc-200 rounded shadow-sm overflow-hidden">
                <div className="w-full h-full grid grid-cols-4 grid-rows-4 gap-0.5">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className={`w-full h-full ${((i * 7 + 3) % 5 === 0) ? 'bg-zinc-800' : 'bg-transparent'}`} />
                  ))}
                </div>
                {/* Ghost Photo Overlay (Security Feature) */}
                <div className="absolute inset-0 opacity-20 pointer-events-none grayscale contrast-150 mix-blend-multiply">
                  {profile?.photoURL && <img src={profile.photoURL} alt="" crossOrigin="anonymous" className="w-full h-full object-cover" />}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MRZ (Machine Readable Zone) */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-zinc-200/90 border-t border-zinc-300 px-6 py-1 flex flex-col justify-center" dir="ltr">
          <p className="font-mono text-[10px] leading-none tracking-[0.3em] text-zinc-700 uppercase whitespace-nowrap overflow-hidden">
            {mrzLine1}
          </p>
          <p className="font-mono text-[10px] leading-none tracking-[0.3em] text-zinc-700 uppercase whitespace-nowrap overflow-hidden mt-1">
            {mrzLine2}
          </p>
        </div>

        {/* Holographic Overlay (Shine) */}
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity duration-700 bg-gradient-to-tr from-transparent via-white to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>

      {/* Action Buttons: Download & Share */}
      {showDownloadActions && (
        <div className="flex items-center justify-between gap-3 pt-1" dir="rtl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl border border-zinc-700/80 hover:border-amber-500/50 flex items-center gap-2 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <Loader2 size={14} className="animate-spin text-amber-400" />
                  <span>جاري التوليد بدقة فائقة...</span>
                </>
              ) : (
                <>
                  <Download size={14} className="text-amber-400" />
                  <span>تحميل كصورة PNG 📥</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleShare}
              disabled={isSharing}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl border border-zinc-700/80 hover:border-blue-500/50 flex items-center gap-2 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSharing ? (
                <>
                  <Loader2 size={14} className="animate-spin text-blue-400" />
                  <span>جاري التجهيز...</span>
                </>
              ) : copiedSuccess ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span className="text-emerald-400">تم النسخ للحافظة!</span>
                </>
              ) : (
                <>
                  <Share2 size={14} className="text-blue-400" />
                  <span>مشاركة الوثيقة 🔗</span>
                </>
              )}
            </button>
          </div>

          <span className="text-[10px] text-zinc-500 font-bold hidden sm:inline-flex items-center gap-1">
            <Sparkles size={11} className="text-amber-500" />
            <span>دقة فائقة Ultra-HD صالحة للاستخدام الشخصي</span>
          </span>
        </div>
      )}
    </div>
  );
};
