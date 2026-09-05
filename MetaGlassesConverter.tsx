import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import piexif from 'piexifjs';
import { Camera, Image as ImageIcon, Zap, Copy, Check, Save, Lock, RefreshCw } from 'lucide-react';

export const MetaGlassesConverter: React.FC = () => {
  const [sourceDataUrl, setSourceDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('photo.jpg');
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [convertedDataUrl, setConvertedDataUrl] = useState<string | null>(null);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const TARGET_WIDTH = 3024;
  const TARGET_HEIGHT = 4032;
  const EXIF_MAKE = 'Meta';
  const EXIF_MODEL = 'Ray-Ban Meta 2';
  const EXIF_SOFTWARE = 'Meta View 151.0';

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      triggerToast('Please upload a valid JPG/JPEG photo.', 'error');
      return;
    }

    setFileName(file.name);
    setConvertedDataUrl(null);
    setConvertedBlob(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setSourceDataUrl(dataUrl);

      const img = new Image();
      img.onload = () => {
        setOriginalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        triggerToast('Photo loaded! Tap convert below.', 'info');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const getExifDate = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const injectExifMetadata = (jpegDataUrl: string): string => {
    try {
      const dateStr = getExifDate();
      const zeroth: Record<string, any> = {};
      const exif: Record<string, any> = {};

      zeroth[piexif.ImageIFD.Make] = EXIF_MAKE;
      zeroth[piexif.ImageIFD.Model] = EXIF_MODEL;
      zeroth[piexif.ImageIFD.Software] = EXIF_SOFTWARE;
      zeroth[piexif.ImageIFD.Orientation] = 1;
      zeroth[piexif.ImageIFD.DateTime] = dateStr;
      zeroth[piexif.ImageIFD.XResolution] = [72, 1];
      zeroth[piexif.ImageIFD.YResolution] = [72, 1];

      exif[piexif.ExifIFD.PixelXDimension] = TARGET_WIDTH;
      exif[piexif.ExifIFD.PixelYDimension] = TARGET_HEIGHT;
      exif[piexif.ExifIFD.DateTimeOriginal] = dateStr;
      exif[piexif.ExifIFD.DateTimeDigitized] = dateStr;
      exif[piexif.ExifIFD.LensModel] = 'Ray-Ban Meta Smart Glasses Camera';
      exif[piexif.ExifIFD.LensMake] = 'Meta';
      exif[piexif.ExifIFD.FocalLength] = [22, 10]; // 2.2mm
      exif[piexif.ExifIFD.FNumber] = [22, 10]; // f/2.2
      exif[piexif.ExifIFD.ColorSpace] = 1; // sRGB

      const exifObj = {
        '0th': zeroth,
        Exif: exif,
        GPS: {},
        Interop: {},
        '1st': {},
        thumbnail: null
      };

      const exifBytes = piexif.dump(exifObj);
      return piexif.insert(exifBytes, jpegDataUrl);
    } catch (err) {
      console.warn('piexif injection warning:', err);
      return jpegDataUrl;
    }
  };

  const convertImage = async () => {
    if (!sourceDataUrl || isConverting) return;

    setIsConverting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 60));

      const img = new Image();
      img.src = sourceDataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Canvas Resizing & Aspect-Fill Crop
      const canvas = document.createElement('canvas');
      canvas.width = TARGET_WIDTH;
      canvas.height = TARGET_HEIGHT;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Could not obtain canvas 2D context');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;
      const srcRatio = img.naturalWidth / img.naturalHeight;

      let drawWidth: number;
      let drawHeight: number;
      let offsetX: number;
      let offsetY: number;

      if (srcRatio > targetRatio) {
        // Wider than 3:4 target
        drawHeight = TARGET_HEIGHT;
        drawWidth = img.naturalWidth * (TARGET_HEIGHT / img.naturalHeight);
        offsetX = (TARGET_WIDTH - drawWidth) / 2;
        offsetY = 0;
      } else {
        // Taller than 3:4 target
        drawWidth = TARGET_WIDTH;
        drawHeight = img.naturalHeight * (TARGET_WIDTH / img.naturalWidth);
        offsetX = 0;
        offsetY = (TARGET_HEIGHT - drawHeight) / 2;
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      // High quality JPEG
      const baseJpeg = canvas.toDataURL('image/jpeg', 0.96);

      // EXIF Injection
      const finalJpegWithExif = injectExifMetadata(baseJpeg);

      // Convert to Blob
      const arr = finalJpegWithExif.split(',');
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: 'image/jpeg' });

      setConvertedDataUrl(finalJpegWithExif);
      setConvertedBlob(blob);
      triggerToast('Converted to 3024x4032 with Meta EXIF!', 'success');
    } catch (err: any) {
      triggerToast('Conversion error: ' + err.message, 'error');
    } finally {
      setIsConverting(false);
    }
  };

  const handleCopyBase64 = async () => {
    if (!convertedDataUrl) return;
    try {
      await navigator.clipboard.writeText(convertedDataUrl);
      setIsCopied(true);
      triggerToast('Base64 copied to clipboard!', 'success');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      triggerToast('Could not access clipboard.', 'error');
    }
  };

  const handleSaveOrShare = async () => {
    if (!convertedBlob || !convertedDataUrl) return;

    const exportFileName = `rayban_meta_${Date.now()}.jpg`;
    const file = new File([convertedBlob], exportFileName, { type: 'image/jpeg' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Ray-Ban Meta Photo',
          text: 'Converted with Meta Glasses Converter'
        });
        triggerToast('Shared successfully!', 'success');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // Direct Download Fallback
    const link = document.createElement('a');
    link.href = convertedDataUrl;
    link.download = exportFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Saved to downloads folder!', 'success');
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col items-center justify-center px-4 py-8 antialiased selection:bg-pink-500/30 selection:text-white relative overflow-x-hidden">
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-blue-600/20 blur-[130px] rounded-full" />
        <div className="absolute bottom-10 left-10 w-[350px] h-[350px] bg-purple-600/15 blur-[120px] rounded-full" />
        <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-pink-600/15 blur-[120px] rounded-full" />
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        capture="environment"
        onChange={onFileInputChange}
        className="hidden"
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={onFileInputChange}
        className="hidden"
      />

      <div className="relative z-10 max-w-md w-full flex flex-col items-center">
        {/* 1. Top Badge */}
        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-950/70 border border-blue-500/30 text-blue-400 text-xs font-semibold tracking-wide shadow-sm">
            <span className="font-mono text-sm leading-none text-blue-500">--</span>
            <span>Ray-Ban Meta Smart Glasses</span>
          </div>
        </div>

        {/* 2. Header */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight text-center mb-2">
          Photo Converter
        </h1>

        {/* 3. Subtext */}
        <p className="text-xs sm:text-sm text-slate-400 text-center max-w-sm mb-6 leading-relaxed">
          1-Tap 3024x4032 format, Meta AI EXIF injection, Base64 &amp; direct Photo Save.
        </p>

        {/* 4. Main App Card */}
        <div className="w-full bg-slate-900/75 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-2xl sm:rounded-3xl p-5 sm:p-7">
          {/* 5. Top Button Row (Inside Card) */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center justify-center gap-2 py-3 px-3.5 bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-800 border border-slate-700/60 rounded-xl text-xs sm:text-sm font-medium text-slate-200 hover:text-white transition-colors"
            >
              <Camera className="w-4 h-4 text-blue-400" />
              <span>Take Photo</span>
            </button>

            <button
              type="button"
              onClick={() => libraryInputRef.current?.click()}
              className="flex items-center justify-center gap-2 py-3 px-3.5 bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-800 border border-slate-700/60 rounded-xl text-xs sm:text-sm font-medium text-slate-200 hover:text-white transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-purple-400" />
              <span>Photo Library</span>
            </button>
          </div>

          {/* 6. Upload Dropzone */}
          <div
            onClick={() => libraryInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragActive(true);
            }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[190px] relative overflow-hidden group ${
              isDragActive
                ? 'border-[#00d2ff] bg-[#00d2ff]/5'
                : 'border-slate-700/80 hover:border-slate-500 bg-slate-950/40 hover:bg-slate-850'
            }`}
          >
            {!sourceDataUrl ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 mb-3 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-2xl select-none">⚡</span>
                </div>
                <p className="text-sm sm:text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                  Tap to select photo
                </p>
                <p className="text-xs text-slate-400 mt-1">Supports any JPG / JPEG photo</p>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center gap-3">
                <div className="relative w-28 h-36 rounded-xl overflow-hidden shadow-lg border border-slate-700 bg-slate-900 group/img">
                  <img
                    src={convertedDataUrl || sourceDataUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[10px] text-white font-medium bg-black/60 px-2 py-1 rounded">
                      Change
                    </span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-200 truncate max-w-[220px]">
                    {fileName}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    {originalDimensions
                      ? `Original: ${originalDimensions.width} x ${originalDimensions.height} px`
                      : 'Loaded'}
                  </p>
                  {convertedDataUrl && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
                      <span>✓ 3024x4032 &amp; EXIF Injected</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 7. Primary Action Button */}
          <button
            type="button"
            disabled={!sourceDataUrl || isConverting}
            onClick={convertImage}
            className="w-full mt-4 py-3.5 px-6 rounded-xl font-bold text-white text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed select-none bg-gradient-to-r from-[#00d2ff] via-[#7928ca] to-[#ff007f] hover:shadow-[0_10px_25px_-5px_rgba(255,0,127,0.4)] active:scale-[0.99]"
          >
            {isConverting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>PROCESSING 3024x4032...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-white" />
                <span>ALL-IN-ONE CONVERT</span>
              </>
            )}
          </button>

          {/* 8. Secondary Action Row */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            {/* Copy Base64 */}
            <button
              type="button"
              disabled={!convertedDataUrl}
              onClick={handleCopyBase64}
              className="flex items-center justify-center gap-2 py-3 px-3.5 bg-slate-800/60 hover:bg-slate-700/70 active:bg-slate-800 border border-slate-700/50 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copy Base64</span>
                </>
              )}
            </button>

            {/* Save / Share */}
            <button
              type="button"
              disabled={!convertedDataUrl}
              onClick={handleSaveOrShare}
              className="flex items-center justify-center gap-2 py-3 px-3.5 bg-slate-800/60 hover:bg-slate-700/70 active:bg-slate-800 border border-slate-700/50 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Save className="w-4 h-4 text-slate-400" />
              <span>Save / Share</span>
            </button>
          </div>

          {/* 9. Information Badges */}
          <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-800/80">
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 text-left">
              <span className="block text-[11px] font-medium text-slate-400 tracking-wide uppercase">
                Resolution
              </span>
              <span className="block text-xs sm:text-sm font-bold text-white mt-0.5 font-mono">
                3024 x 4032 px
              </span>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 text-left">
              <span className="block text-[11px] font-medium text-slate-400 tracking-wide uppercase">
                Meta AI EXIF
              </span>
              <span className="block text-xs sm:text-sm font-bold text-white mt-0.5">
                Ray-Ban Meta 2
              </span>
            </div>
          </div>
        </div>

        {/* 10. Footer */}
        <footer className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500 text-center">
          <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span>100% Client-Side. Photos are processed strictly on your device.</span>
        </footer>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md text-xs font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-slate-900/90 border-emerald-500/40 text-emerald-300'
              : toast.type === 'error'
              ? 'bg-slate-900/90 border-rose-500/40 text-rose-300'
              : 'bg-slate-900/90 border-blue-500/40 text-blue-300'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default MetaGlassesConverter;
