import React, { useState, useRef, ChangeEvent, DragEvent, useEffect } from 'react';
import piexif from 'piexifjs';
import { 
  Camera, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Zap, 
  Copy, 
  Check, 
  Save, 
  Lock, 
  RefreshCw, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface DeviceProfile {
  name: string;
  badgeText: string;
  tag: string;
  exifMake: string;
  exifModel: string;
  software: string;
  photoWidth: number;
  photoHeight: number;
  videoWidth: number;
  videoHeight: number;
  lensModel: string;
}

const DEVICE_PROFILES: Record<string, DeviceProfile> = {
  rb_meta_gen2: {
    name: 'Ray-Ban Meta (Gen 2)',
    badgeText: 'Ray-Ban Meta Smart Glasses',
    tag: 'Gen 2',
    exifMake: 'Meta AI',
    exifModel: 'Ray-Ban Meta Smart Glasses 2',
    software: 'Meta View 171.0.0.38.109',
    photoWidth: 3024,
    photoHeight: 4032,
    videoWidth: 1440,
    videoHeight: 1920,
    lensModel: 'Ray-Ban Meta Ultra-Wide 12MP f/2.2'
  },
  rb_meta_wayfarer: {
    name: 'Ray-Ban Meta Wayfarer',
    badgeText: 'Ray-Ban Meta Wayfarer',
    tag: 'Wayfarer',
    exifMake: 'Meta AI',
    exifModel: 'Ray-Ban Meta Smart Glasses 2',
    software: 'Meta View 171.0.0.38.109',
    photoWidth: 3024,
    photoHeight: 4032,
    videoWidth: 1440,
    videoHeight: 1920,
    lensModel: 'Ray-Ban Meta Ultra-Wide 12MP f/2.2'
  },
  rb_stories: {
    name: 'Ray-Ban Stories (Gen 1)',
    badgeText: 'Ray-Ban Stories Smart Glasses',
    tag: 'Gen 1',
    exifMake: 'Meta',
    exifModel: 'Ray-Ban Stories',
    software: 'Facebook View 120.0',
    photoWidth: 2592,
    photoHeight: 1944,
    videoWidth: 1184,
    videoHeight: 1184,
    lensModel: 'Ray-Ban Stories Dual 5MP'
  },
  quest_3: {
    name: 'Meta Quest 3',
    badgeText: 'Meta Quest 3 Spatial Capture',
    tag: 'Spatial',
    exifMake: 'Meta',
    exifModel: 'Meta Quest 3',
    software: 'Meta Horizon OS 68.0',
    photoWidth: 2064,
    photoHeight: 2208,
    videoWidth: 1920,
    videoHeight: 1080,
    lensModel: 'Meta Quest 3 Color Passthrough'
  }
};

export const MetaGlassesConverter: React.FC = () => {
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [profileKey, setProfileKey] = useState<string>('rb_meta_gen2');

  // Photo State
  const [sourcePhotoUrl, setSourcePhotoUrl] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string>('photo.jpg');
  const [photoDimensions, setPhotoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [convertedPhotoUrl, setConvertedPhotoUrl] = useState<string | null>(null);
  const [convertedPhotoBlob, setConvertedPhotoBlob] = useState<Blob | null>(null);

  // Video State
  const [sourceVideoUrl, setSourceVideoUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string>('video.mp4');
  const [videoMeta, setVideoMeta] = useState<string>('');
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [videoProgressDetail, setVideoProgressDetail] = useState<string>('');
  const [convertedVideoBlob, setConvertedVideoBlob] = useState<Blob | null>(null);
  const [convertedVideoUrl, setConvertedVideoUrl] = useState<string | null>(null);
  const [convertedVideoExt, setConvertedVideoExt] = useState<string>('mp4');

  // Common UI State
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const photoCameraRef = useRef<HTMLInputElement>(null);
  const photoLibraryRef = useRef<HTMLInputElement>(null);
  const videoCameraRef = useRef<HTMLInputElement>(null);
  const videoLibraryRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const activeProfile = DEVICE_PROFILES[profileKey] || DEVICE_PROFILES.rb_meta_gen2;

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Handle Photo Loading
  const handlePhotoFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      triggerToast('Please select an image file (JPG / JPEG / PNG).', 'error');
      return;
    }
    setPhotoFileName(file.name);
    setConvertedPhotoUrl(null);
    setConvertedPhotoBlob(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setSourcePhotoUrl(url);

      const img = new Image();
      img.onload = () => {
        setPhotoDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        triggerToast('Photo loaded! Ready to convert.', 'info');
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  // Handle Video Loading
  const handleVideoFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      triggerToast('Please select a video file (MP4 / MOV / WebM).', 'error');
      return;
    }
    setVideoFileName(file.name);
    setConvertedVideoBlob(null);
    setConvertedVideoUrl(null);
    setVideoProgress(0);

    if (sourceVideoUrl) URL.revokeObjectURL(sourceVideoUrl);
    const blobUrl = URL.createObjectURL(file);
    setSourceVideoUrl(blobUrl);

    const tempVideo = document.createElement('video');
    tempVideo.src = blobUrl;
    tempVideo.onloadedmetadata = () => {
      const dur = Math.round(tempVideo.duration);
      const mins = String(Math.floor(dur / 60)).padStart(2, '0');
      const secs = String(dur % 60).padStart(2, '0');
      setVideoMeta(`${mins}:${secs} • ${tempVideo.videoWidth} x ${tempVideo.videoHeight} px`);
      triggerToast('Video loaded! Ready to convert.', 'info');
    };
  };

  // Universal Drop Handler
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      setMode('photo');
      handlePhotoFile(file);
    } else if (file.type.startsWith('video/')) {
      setMode('video');
      handleVideoFile(file);
    } else {
      triggerToast('Unsupported file type.', 'error');
    }
  };

  // EXIF Helpers
  const getExifDate = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const injectPhotoExif = (jpegDataUrl: string): string => {
    try {
      const dateStr = getExifDate();
      const zeroth: Record<string, any> = {};
      const exif: Record<string, any> = {};

      zeroth[piexif.ImageIFD.Make] = activeProfile.exifMake;
      zeroth[piexif.ImageIFD.Model] = activeProfile.exifModel;
      zeroth[piexif.ImageIFD.Software] = activeProfile.software;
      zeroth[piexif.ImageIFD.Orientation] = 1;
      zeroth[piexif.ImageIFD.DateTime] = dateStr;
      zeroth[piexif.ImageIFD.XResolution] = [72, 1];
      zeroth[piexif.ImageIFD.YResolution] = [72, 1];

      exif[piexif.ExifIFD.ExifVersion] = "0232";
      exif[piexif.ExifIFD.PixelXDimension] = activeProfile.photoWidth;
      exif[piexif.ExifIFD.PixelYDimension] = activeProfile.photoHeight;
      exif[piexif.ExifIFD.DateTimeOriginal] = dateStr;
      exif[piexif.ExifIFD.DateTimeDigitized] = dateStr;
      exif[piexif.ExifIFD.LensModel] = activeProfile.lensModel;
      exif[piexif.ExifIFD.LensMake] = activeProfile.exifMake;
      exif[piexif.ExifIFD.FocalLength] = [224, 100];
      exif[piexif.ExifIFD.FocalLengthIn35mmFilm] = 12;
      exif[piexif.ExifIFD.FNumber] = [22, 10];
      exif[piexif.ExifIFD.ColorSpace] = 1;
      exif[piexif.ExifIFD.SceneCaptureType] = 0;
      exif[piexif.ExifIFD.ExposureProgram] = 2;

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
      console.warn('EXIF injection fallback notice:', err);
      return jpegDataUrl;
    }
  };

  // Convert Photo
  const convertPhoto = async () => {
    if (!sourcePhotoUrl || isConverting) return;
    setIsConverting(true);
    try {
      await new Promise((r) => setTimeout(r, 60));
      const img = new Image();
      img.src = sourcePhotoUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = activeProfile.photoWidth;
      canvas.height = activeProfile.photoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Aspect Fill Crop
      const targetRatio = activeProfile.photoWidth / activeProfile.photoHeight;
      const srcRatio = img.naturalWidth / img.naturalHeight;
      let dw: number, dh: number, dx: number, dy: number;

      if (srcRatio > targetRatio) {
        dh = activeProfile.photoHeight;
        dw = img.naturalWidth * (activeProfile.photoHeight / img.naturalHeight);
        dx = (activeProfile.photoWidth - dw) / 2;
        dy = 0;
      } else {
        dw = activeProfile.photoWidth;
        dh = img.naturalHeight * (activeProfile.photoWidth / img.naturalWidth);
        dx = 0;
        dy = (activeProfile.photoHeight - dh) / 2;
      }

      ctx.drawImage(img, dx, dy, dw, dh);
      const baseJpeg = canvas.toDataURL('image/jpeg', 0.96);
      const finalJpegWithExif = injectPhotoExif(baseJpeg);

      // Convert to Blob
      const arr = finalJpegWithExif.split(',');
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) u8arr[n] = bstr.charCodeAt(n);
      const blob = new Blob([u8arr], { type: 'image/jpeg' });

      setConvertedPhotoUrl(finalJpegWithExif);
      setConvertedPhotoBlob(blob);
      triggerToast(`Formatted to ${activeProfile.photoWidth}x${activeProfile.photoHeight} with ${activeProfile.exifModel} EXIF!`, 'success');
    } catch (err: any) {
      triggerToast('Photo conversion error: ' + err.message, 'error');
    } finally {
      setIsConverting(false);
    }
  };

  // Convert Video
  const convertVideo = async () => {
    if (!sourceVideoUrl || isConverting) return;
    setIsConverting(true);
    setVideoProgress(0);

    try {
      const video = document.createElement('video');
      video.src = sourceVideoUrl;
      video.muted = false;
      video.playsInline = true;

      await new Promise((resolve, reject) => {
        video.onloadeddata = resolve;
        video.onerror = reject;
      });

      const targetW = activeProfile.videoWidth;
      const targetH = activeProfile.videoHeight;
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to initialize 2D context');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const targetAspect = targetW / targetH;
      const srcAspect = video.videoWidth / video.videoHeight;
      let dw: number, dh: number, dx: number, dy: number;

      if (srcAspect > targetAspect) {
        dh = targetH;
        dw = video.videoWidth * (targetH / video.videoHeight);
        dx = (targetW - dw) / 2;
        dy = 0;
      } else {
        dw = targetW;
        dh = video.videoHeight * (targetW / video.videoWidth);
        dx = 0;
        dy = (targetH - dh) / 2;
      }

      // Route Audio through Web Audio API
      const stream = canvas.captureStream(30);
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const sourceNode = audioCtx.createMediaElementSource(video);
          const destNode = audioCtx.createMediaStreamDestination();
          sourceNode.connect(destNode);
          if (destNode.stream.getAudioTracks().length > 0) {
            destNode.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
          }
        }
      } catch (audioErr) {
        console.log('Audio routing note:', audioErr);
      }

      // Check format support
      const preferredTypes = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];
      let chosenMime = '';
      for (const t of preferredTypes) {
        if (MediaRecorder.isTypeSupported(t)) {
          chosenMime = t;
          break;
        }
      }

      const recordedChunks: Blob[] = [];
      const recorder = new MediaRecorder(
        stream,
        chosenMime ? { mimeType: chosenMime, videoBitsPerSecond: 8500000 } : {}
      );

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
      };

      const duration = video.duration;
      const conversionPromise = new Promise<{ blob: Blob; ext: string }>((resolve) => {
        recorder.onstop = () => {
          const ext = chosenMime.includes('mp4') ? 'mp4' : 'webm';
          const blob = new Blob(recordedChunks, { type: chosenMime || 'video/webm' });
          resolve({ blob, ext });
        };
      });

      recorder.start(100);
      video.currentTime = 0;
      await video.play();

      function renderFrame() {
        if (video.paused || video.ended) return;
        ctx?.drawImage(video, dx, dy, dw, dh);
        const percent = Math.min(99, Math.round((video.currentTime / duration) * 100));
        setVideoProgress(percent);
        setVideoProgressDetail(`${video.currentTime.toFixed(1)}s / ${duration.toFixed(1)}s`);
        requestAnimationFrame(renderFrame);
      }
      requestAnimationFrame(renderFrame);

      await new Promise((resolve) => {
        video.onended = resolve;
      });

      recorder.stop();
      setVideoProgress(100);

      const { blob, ext } = await conversionPromise;
      const convertedUrl = URL.createObjectURL(blob);
      setConvertedVideoBlob(blob);
      setConvertedVideoUrl(convertedUrl);
      setConvertedVideoExt(ext);

      triggerToast(`Video converted to ${targetW}x${targetH} (${ext.toUpperCase()})!`, 'success');
    } catch (err: any) {
      triggerToast('Video conversion failed: ' + err.message, 'error');
    } finally {
      setIsConverting(false);
    }
  };

  // Clipboard copy
  const handleCopyBase64 = async () => {
    if (!convertedPhotoUrl) return;
    try {
      await navigator.clipboard.writeText(convertedPhotoUrl);
      setIsCopied(true);
      triggerToast('Base64 copied to clipboard!', 'success');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      triggerToast('Clipboard access denied.', 'error');
    }
  };

  // Save / Share handler
  const handleSaveOrShare = async () => {
    const p = activeProfile;
    if (mode === 'photo') {
      if (!convertedPhotoBlob || !convertedPhotoUrl) return;
      const filename = `${p.exifModel.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${p.photoWidth}x${p.photoHeight}_${Date.now()}.jpg`;
      const file = new File([convertedPhotoBlob], filename, { type: 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `${p.name} Photo`,
            text: 'Formatted with Meta Glasses Converter'
          });
          triggerToast('Shared successfully!', 'success');
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }

      const link = document.createElement('a');
      link.href = convertedPhotoUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerToast('Photo saved to downloads!', 'success');

    } else {
      // Video
      if (!convertedVideoBlob || !convertedVideoUrl) return;
      const filename = `${p.exifModel.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_video_${p.videoWidth}x${p.videoHeight}_${Date.now()}.${convertedVideoExt}`;
      const file = new File([convertedVideoBlob], filename, { type: convertedVideoBlob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `${p.name} Video`,
            text: 'Converted with Meta Glasses Video Studio'
          });
          triggerToast('Video shared successfully!', 'success');
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }

      const link = document.createElement('a');
      link.href = convertedVideoUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerToast('Video saved to downloads!', 'success');
    }
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-100 flex flex-col items-center justify-center px-4 py-8 antialiased selection:bg-cyan-500/30 selection:text-cyan-300 relative overflow-x-hidden font-sans">
      {/* Futuristic Ambient Glows & Subtle Grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-cyan-500/15 blur-[140px] rounded-full" />
        <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-purple-600/15 blur-[140px] rounded-full" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-pink-600/15 blur-[140px] rounded-full" />
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={photoCameraRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        capture="environment"
        onChange={(e) => handlePhotoFile(e.target.files?.[0])}
        className="hidden"
      />
      <input
        ref={photoLibraryRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={(e) => handlePhotoFile(e.target.files?.[0])}
        className="hidden"
      />
      <input
        ref={videoCameraRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/*"
        capture="environment"
        onChange={(e) => handleVideoFile(e.target.files?.[0])}
        className="hidden"
      />
      <input
        ref={videoLibraryRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/*"
        onChange={(e) => handleVideoFile(e.target.files?.[0])}
        className="hidden"
      />

      {/* Top Header with Instagram Creator Badge */}
      <header className="relative z-20 w-full max-w-md mx-auto mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.3)]">
            <span className="text-base">🕶️</span>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold tracking-wider text-cyan-400">META // HUD</span>
            <p className="text-[10px] font-mono text-slate-400">SPATIAL STUDIO</p>
          </div>
        </div>

        <a
          href="https://www.instagram.com/iiankitsingh/"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#f09433]/20 via-[#dc2743]/20 to-[#bc1888]/20 border border-pink-500/40 hover:border-pink-400 text-slate-200 hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(220,39,67,0.25)] hover:scale-[1.02]"
        >
          <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 flex items-center justify-center p-0.5">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.13-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="text-[9px] font-mono text-pink-300/80 uppercase">CREATOR</span>
            <span className="text-xs font-bold text-white tracking-tight">@iiankitsingh ↗</span>
          </div>
        </a>
      </header>

      <div className="relative z-10 max-w-md w-full flex flex-col items-center">
        {/* 1. Top Badge */}
        <div className="mb-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-950/70 border border-blue-500/30 text-blue-400 text-xs font-semibold tracking-wide shadow-sm">
            <span className="font-mono text-sm leading-none text-blue-500">--</span>
            <span>{activeProfile.badgeText}</span>
          </div>
        </div>

        {/* 2. Header */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight text-center mb-1">
          {mode === 'photo' ? 'Photo Converter' : 'Video Converter'}
        </h1>

        {/* 3. Subtext */}
        <p className="text-xs sm:text-sm text-slate-400 text-center max-w-sm mb-4 leading-relaxed">
          {mode === 'photo'
            ? `1-Tap ${activeProfile.photoWidth}x${activeProfile.photoHeight} format, Meta AI EXIF injection, Base64 & direct Photo Save.`
            : `1-Tap ${activeProfile.videoWidth}x${activeProfile.videoHeight} Smart Glasses aspect-fill crop, Audio retention & Video Save.`}
        </p>

        {/* Mode Switcher Tabs */}
        <div className="w-full grid grid-cols-2 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl mb-4 text-xs font-semibold shadow-inner">
          <button
            type="button"
            onClick={() => setMode('photo')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200 ${
              mode === 'photo'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Photo Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('video')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200 ${
              mode === 'video'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <VideoIcon className="w-4 h-4" />
            <span>Video Studio</span>
          </button>
        </div>

        {/* 4. Main App Card */}
        <div className="w-full bg-slate-900/75 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-2xl sm:rounded-3xl p-5 sm:p-7">
          
          {/* Glasses Device Profile Selector */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="device-profile-select" className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Glasses Device Profile
              </label>
              <span className="text-blue-400 font-mono text-[10px] lowercase">
                {activeProfile.tag}
              </span>
            </div>
            <select
              id="device-profile-select"
              value={profileKey}
              onChange={(e) => setProfileKey(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm font-medium text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="rb_meta_gen2">🕶️ Ray-Ban Meta (Gen 2) — 3024x4032 / 1440x1920</option>
              <option value="rb_meta_wayfarer">👓 Ray-Ban Meta Wayfarer — 3024x4032 / 1440x1920</option>
              <option value="rb_stories">🕶️ Ray-Ban Stories (Gen 1) — 2592x1944 / 1184x1184</option>
              <option value="quest_3">🥽 Meta Quest 3 — 2064x2208 / 1920x1080</option>
            </select>
          </div>

          {/* 5. Top Button Row (Inside Card) */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={() => (mode === 'photo' ? photoCameraRef.current?.click() : videoCameraRef.current?.click())}
              className="flex items-center justify-center gap-2 py-3 px-3.5 bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-800 border border-slate-700/60 rounded-xl text-xs sm:text-sm font-medium text-slate-200 hover:text-white transition-colors"
            >
              {mode === 'photo' ? (
                <>
                  <Camera className="w-4 h-4 text-blue-400" />
                  <span>Take Photo</span>
                </>
              ) : (
                <>
                  <VideoIcon className="w-4 h-4 text-blue-400" />
                  <span>Record Video</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => (mode === 'photo' ? photoLibraryRef.current?.click() : videoLibraryRef.current?.click())}
              className="flex items-center justify-center gap-2 py-3 px-3.5 bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-800 border border-slate-700/60 rounded-xl text-xs sm:text-sm font-medium text-slate-200 hover:text-white transition-colors"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>{mode === 'photo' ? 'Photo Library' : 'Video Library'}</span>
            </button>
          </div>

          {/* 6. Upload Dropzone Area */}
          <div
            onClick={() => (mode === 'photo' ? photoLibraryRef.current?.click() : videoLibraryRef.current?.click())}
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
            {mode === 'photo' ? (
              !sourcePhotoUrl ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 mb-3 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-2xl select-none">⚡</span>
                  </div>
                  <p className="text-sm sm:text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                    Tap to select photo
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Supports any JPG / JPEG / PNG photo</p>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-3">
                  <div className="relative w-28 h-36 rounded-xl overflow-hidden shadow-lg border border-slate-700 bg-slate-900 group/img">
                    <img src={convertedPhotoUrl || sourcePhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] text-white font-medium bg-black/60 px-2 py-1 rounded">Change</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-200 truncate max-w-[220px]">{photoFileName}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      {photoDimensions ? `Original: ${photoDimensions.width} x ${photoDimensions.height} px` : 'Loaded'}
                    </p>
                    {convertedPhotoUrl && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
                        <span>✓ Formatted &amp; EXIF Injected</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              !sourceVideoUrl ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 mb-3 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-2xl select-none">⚡</span>
                  </div>
                  <p className="text-sm sm:text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                    Tap to select video
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Supports MP4, MOV, WebM</p>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-3">
                  <div className="relative w-40 sm:w-44 h-48 rounded-xl overflow-hidden shadow-lg border border-slate-700 bg-black">
                    <video
                      ref={videoPreviewRef}
                      src={convertedVideoUrl || sourceVideoUrl}
                      className="w-full h-full object-contain"
                      playsInline
                      controls
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-200 truncate max-w-[220px]">{videoFileName}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{videoMeta}</p>
                    {convertedVideoUrl && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
                        <span>✓ Converted ({convertedVideoExt.toUpperCase()})</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>

          {/* Video Conversion Progress Bar */}
          {mode === 'video' && isConverting && (
            <div className="mt-4 bg-slate-800/80 border border-slate-700/70 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  Rendering frames &amp; routing audio...
                </span>
                <span className="font-mono text-cyan-400 font-bold">{videoProgress}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-700/50">
                <div
                  className="bg-gradient-to-r from-[#00d2ff] via-[#7928ca] to-[#ff007f] h-2.5 rounded-full transition-all duration-150"
                  style={{ width: `${videoProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 text-right font-mono">{videoProgressDetail}</p>
            </div>
          )}

          {/* 7. Primary Action Button */}
          <button
            type="button"
            disabled={mode === 'photo' ? !sourcePhotoUrl || isConverting : !sourceVideoUrl || isConverting}
            onClick={mode === 'photo' ? convertPhoto : convertVideo}
            className="w-full mt-4 py-3.5 px-6 rounded-xl font-bold text-white text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed select-none bg-gradient-to-r from-[#00d2ff] via-[#7928ca] to-[#ff007f] hover:shadow-[0_10px_25px_-5px_rgba(255,0,127,0.4)] active:scale-[0.99]"
          >
            {isConverting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>{mode === 'photo' ? 'PROCESSING PHOTO...' : 'RECORDING VIDEO FRAMES...'}</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-white" />
                <span>{mode === 'photo' ? 'ALL-IN-ONE CONVERT' : 'CONVERT VIDEO'}</span>
              </>
            )}
          </button>

          {/* 8. Secondary Action Row */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            {mode === 'photo' ? (
              <button
                type="button"
                disabled={!convertedPhotoUrl}
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
            ) : (
              <button
                type="button"
                disabled={!convertedVideoBlob}
                onClick={() => {
                  setConvertedVideoBlob(null);
                  setConvertedVideoUrl(null);
                  setVideoProgress(0);
                  triggerToast('Video reset to original.', 'info');
                }}
                className="flex items-center justify-center gap-2 py-3 px-3.5 bg-slate-800/60 hover:bg-slate-700/70 active:bg-slate-800 border border-slate-700/50 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
                <span>Reset Video</span>
              </button>
            )}

            <button
              type="button"
              disabled={mode === 'photo' ? !convertedPhotoBlob : !convertedVideoBlob}
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
                {mode === 'photo'
                  ? `${activeProfile.photoWidth} x ${activeProfile.photoHeight} px`
                  : `${activeProfile.videoWidth} x ${activeProfile.videoHeight} px`}
              </span>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 text-left">
              <span className="block text-[11px] font-medium text-slate-400 tracking-wide uppercase">
                {mode === 'photo' ? 'Meta AI EXIF' : 'Target Profile'}
              </span>
              <span className="block text-xs sm:text-sm font-bold text-white mt-0.5">
                {mode === 'photo' ? activeProfile.exifModel : activeProfile.name}
              </span>
            </div>
          </div>
        </div>

        {/* 10. Footer */}
        <footer className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500 text-center">
          <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span>100% Client-Side. Photos &amp; videos are processed strictly on your device.</span>
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
