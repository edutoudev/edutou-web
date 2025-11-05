'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, ArrowRight, X, Camera, Sparkles, Target, Sun, Moon, BookOpen } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// QR Scanner Modal Component
const QRScannerModal = ({ isOpen, onClose, onScanSuccess }: {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: string) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState(false);

  useEffect(() => {
    setHasBarcodeDetector('BarcodeDetector' in window);
    if (isOpen) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setScanning(true);

        scanIntervalRef.current = setInterval(() => {
          scanQRCode();
        }, 500);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        barcodeDetector.detect(canvas)
          .then((barcodes: any[]) => {
            if (barcodes.length > 0) {
              const qrData = barcodes[0].rawValue;
              stopCamera();
              if (qrData.startsWith('http://') || qrData.startsWith('https://')) {
                window.location.href = qrData;
              } else {
                onScanSuccess(qrData);
              }
            }
          })
          .catch((err: any) => console.error('Barcode detection error:', err));
      }
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-scaleIn">
        <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 p-4 sm:p-6 text-white relative">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white hover:bg-white/20 rounded-full p-1.5 sm:p-2 transition-all hover:scale-110"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex-1 pr-8">
              <h2 className="text-xl sm:text-2xl font-bold">Scan QR Code</h2>
              <p className="text-white/80 text-xs sm:text-sm">Position the QR code within the frame</p>
            </div>
          </div>
        </div>

        <div className="relative bg-black aspect-square">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
              <div className="text-center">
                <Camera className="w-12 h-12 sm:w-16 sm:h-16 text-red-400 mx-auto mb-3 sm:mb-4" />
                <p className="text-white text-base sm:text-lg mb-1 sm:mb-2 font-semibold">Camera Access Required</p>
                <p className="text-gray-400 text-xs sm:text-sm px-4">{error}</p>
                <button
                  onClick={startCamera}
                  className="mt-3 sm:mt-4 px-5 sm:px-6 py-2 sm:py-2.5 bg-white text-cyan-600 rounded-xl font-medium hover:bg-gray-100 transition-all hover:scale-105 text-sm sm:text-base"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64">
                    <div className="absolute top-0 left-0 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-l-[3px] border-t-[3px] sm:border-l-4 sm:border-t-4 border-white rounded-tl-2xl animate-pulse"></div>
                    <div className="absolute top-0 right-0 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-r-[3px] border-t-[3px] sm:border-r-4 sm:border-t-4 border-white rounded-tr-2xl animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-l-[3px] border-b-[3px] sm:border-l-4 sm:border-b-4 border-white rounded-bl-2xl animate-pulse"></div>
                    <div className="absolute bottom-0 right-0 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-r-[3px] border-b-[3px] sm:border-r-4 sm:border-b-4 border-white rounded-br-2xl animate-pulse"></div>
                    <div className="absolute inset-0 overflow-hidden rounded-2xl">
                      <div className="w-full h-0.5 sm:h-1 bg-gradient-to-r from-transparent via-white to-transparent animate-scan"></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 sm:p-6 bg-gradient-to-b from-gray-50 to-white">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-cyan-500 rounded-full mt-1 sm:mt-1.5 flex-shrink-0"></div>
              <p>Align the QR code within the frame for automatic scanning</p>
            </div>
            {hasBarcodeDetector ? (
              <div className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-green-600">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full mt-1 sm:mt-1.5 flex-shrink-0 animate-pulse"></div>
                <p>QR Scanner is active and ready</p>
              </div>
            ) : (
              <div className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-amber-600">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-500 rounded-full mt-1 sm:mt-1.5 flex-shrink-0"></div>
                <p>QR Scanner requires Chrome/Edge browser for best results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function QuizPage() {
  const [code, setCode] = useState('');
  const [inputError, setInputError] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length === 0) {
      setInputError(true);
      return;
    }
    setInputError(false);

    // Check if it's a live session code (6 characters) or static quiz code
    const trimmedCode = code.trim().toUpperCase();

    // Try to determine if this is a live session code
    // Live session codes are exactly 6 characters
    if (trimmedCode.length === 6) {
      // Redirect to student lobby for live sessions
      router.push(`/student/session/${trimmedCode}/lobby`);
    } else {
      // Redirect to static quiz
      router.push(`/quiz/${trimmedCode}`);
    }
  };

  const handleScanSuccess = (scannedCode: string) => {
    setShowScanner(false);
    router.push(`/quiz/${scannedCode}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/20 dark:from-slate-900 dark:via-blue-950 dark:to-cyan-950 reading:from-amber-50 reading:via-yellow-50/50 reading:to-orange-50/30 relative overflow-hidden transition-colors duration-300">
      {/* Theme Dropdown Menu */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg transition-all duration-300 hover:scale-110 bg-white dark:bg-slate-800 reading:bg-amber-100 text-blue-600 dark:text-yellow-400 reading:text-amber-700 hover:bg-gray-50 dark:hover:bg-slate-700 reading:hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-cyan-500">
              {theme === 'light' && <Sun className="w-5 h-5 sm:w-6 sm:h-6" />}
              {theme === 'dark' && <Moon className="w-5 h-5 sm:w-6 sm:h-6" />}
              {theme === 'reading' && <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setTheme('light')}
              className="cursor-pointer"
            >
              <Sun className="mr-2 h-4 w-4" />
              <span>Light</span>
              {theme === 'light' && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme('dark')}
              className="cursor-pointer"
            >
              <Moon className="mr-2 h-4 w-4" />
              <span>Dark</span>
              {theme === 'dark' && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme('reading')}
              className="cursor-pointer"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              <span>Reading Mode</span>
              {theme === 'reading' && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl animate-pulse bg-gradient-to-br from-blue-400/20 to-cyan-400/20 dark:from-blue-600/10 dark:to-cyan-600/10 reading:from-amber-400/15 reading:to-orange-400/15"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl animate-pulse delay-700 bg-gradient-to-br from-cyan-400/20 to-teal-400/20 dark:from-cyan-600/10 dark:to-teal-600/10 reading:from-yellow-400/15 reading:to-amber-400/15"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 dark:from-blue-600/5 dark:to-cyan-600/5 reading:from-orange-400/10 reading:to-yellow-400/10"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl">
          {/* Header Section */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 rounded-2xl sm:rounded-3xl shadow-xl mb-4 sm:mb-6">
              <Target className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-400 dark:via-cyan-400 dark:to-teal-400 reading:from-amber-600 reading:via-orange-600 reading:to-yellow-600 bg-clip-text text-transparent mb-3 sm:mb-4">
              Join a Quiz
            </h1>
            <p className="text-base sm:text-lg max-w-md mx-auto text-gray-600 dark:text-gray-300 reading:text-amber-800">
              Enter your quiz code or scan a QR code to get started
            </p>
          </div>

          {/* Main Card */}
          <div className="backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden bg-white/70 dark:bg-slate-800/70 reading:bg-amber-100/70 border border-gray-100/50 dark:border-slate-700/50 reading:border-amber-300/50">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2 animate-pulse delay-300"></div>
              </div>

              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Enter Quiz Code</h2>
                  <p className="text-white/80 text-sm sm:text-base">Your instructor will provide the code</p>
                </div>
              </div>
            </div>

            {/* Form Section */}
            <div className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="quizCode"
                    className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300 reading:text-amber-900"
                  >
                    Quiz Code
                  </label>
                  <input
                    type="text"
                    id="quizCode"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setInputError(false);
                    }}
                    placeholder="Enter code (e.g., QZ1234)"
                    className={`w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl border-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-medium text-base sm:text-lg transition-all bg-gray-50 dark:bg-slate-700 reading:bg-amber-50 border-gray-200 dark:border-slate-600 reading:border-amber-300 text-gray-800 dark:text-gray-100 reading:text-amber-900 ${
                      inputError ? 'border-red-300 ring-2 ring-red-300' : ''
                    }`}
                    maxLength={10}
                  />
                  {inputError && (
                    <p className="text-red-500 text-sm mt-2 ml-1 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      Please enter a quiz code
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white hover:shadow-xl font-semibold px-6 py-3 sm:py-4 rounded-xl transition-all duration-200 inline-flex items-center justify-center gap-2 hover:scale-105 group"
                  >
                    <span className="text-base sm:text-lg">Start Quiz</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="bg-white border-2 border-cyan-600 text-cyan-600 hover:bg-cyan-50 font-semibold px-6 py-3 sm:py-4 rounded-xl transition-all duration-200 inline-flex items-center justify-center gap-2 hover:scale-105"
                  >
                    <QrCode className="w-5 h-5" />
                    <span className="text-base sm:text-lg">Scan QR</span>
                  </button>
                </div>
              </form>

              {/* Info Section */}
              <div className="mt-6 sm:mt-8 pt-6 border-t border-gray-200 dark:border-slate-700 reading:border-amber-300">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400 reading:text-amber-700">
                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <p>Quiz codes are provided by your instructor or course coordinator</p>
                  </div>
                  <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400 reading:text-amber-700">
                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <p>Codes are case-insensitive and typically 4-10 characters long</p>
                  </div>
                  <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400 reading:text-amber-700">
                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <p>You can also scan a QR code if your instructor provides one</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
}