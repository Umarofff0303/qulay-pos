'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  MenuItem,
  Slider,
  TextField,
  Typography,
} from '@mui/material';
import type { CameraDevice, Html5Qrcode } from 'html5-qrcode';

type BarcodeScannerDialogProps = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onDetected: (code: string) => void | Promise<void>;
};

const formatScannerError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');

  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return "Kameradan foydalanish uchun HTTPS yoki localhost kerak.";
  }

  if (/NotAllowedError|Permission denied|Permission dismissed/i.test(message)) {
    return "Kamera ruxsati berilmadi. Ruxsat bering va qayta urinib ko'ring.";
  }

  if (/NotFoundError|Requested device not found/i.test(message)) {
    return 'Bu qurilmada kamera topilmadi.';
  }

  if (/NotReadableError|TrackStartError/i.test(message)) {
    return "Kameradan boshqa dastur yoki brauzer oynasi foydalanmoqda.";
  }

  return message || 'Kamera skanerini ishga tushirib bo`lmadi.';
};

const getPreferredCamera = (cameras: CameraDevice[]) =>
  cameras.find((camera) => /back|rear|environment/i.test(camera.label)) ||
  cameras[cameras.length - 1] ||
  cameras[0] ||
  null;

export function BarcodeScannerDialog({
  open,
  title = 'Kamera orqali barcode skanerlash',
  description = "Barcode'ni chiziqlar bilan to'g'ri tuting. Zarur bo'lsa kamerani almashtiring yoki chiroqni yoqing.",
  onClose,
  onDetected,
}: BarcodeScannerDialogProps) {
  const scannerId = useId().replace(/:/g, '');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const detectedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const onDetectedRef = useRef(onDetected);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [restartKey, setRestartKey] = useState(0);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomValue, setZoomValue] = useState(1);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 1, step: 0.1 });

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const cleanupScanner = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (!scanner) {
      return;
    }

    try {
      await scanner.stop();
    } catch {
      // Ignore stop errors when the scanner never fully started.
    }

    try {
      scanner.clear();
    } catch {
      // Ignore clear errors if the DOM was already unmounted.
    }
  };

  const handleDetectedCode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code || detectedRef.current) {
      return;
    }

    detectedRef.current = true;
    await cleanupScanner();
    onCloseRef.current();
    await onDetectedRef.current(code);
  };

  const handleManualSubmit = async () => {
    if (!manualCode.trim()) {
      setScannerError('Barcode ni kiriting.');
      return;
    }

    setScannerError('');
    await handleDetectedCode(manualCode);
  };

  const handleTorchToggle = async () => {
    const scanner = scannerRef.current;
    if (!scanner || !torchSupported) {
      return;
    }

    const nextTorchState = !torchEnabled;

    try {
      await scanner.applyVideoConstraints({
        advanced: [{ torch: nextTorchState } as MediaTrackConstraintSet],
      });
      setTorchEnabled(nextTorchState);
      setScannerError('');
    } catch (error) {
      setScannerError(formatScannerError(error));
    }
  };

  const applyZoom = async (nextZoomValue: number) => {
    const scanner = scannerRef.current;
    if (!scanner || !zoomSupported) {
      return;
    }

    try {
      await scanner.applyVideoConstraints({
        advanced: [{ zoom: nextZoomValue } as MediaTrackConstraintSet],
      });
      setZoomValue(nextZoomValue);
      setScannerError('');
    } catch (error) {
      setScannerError(formatScannerError(error));
    }
  };

  useEffect(() => {
    if (!open) {
      setManualCode('');
      setScannerError('');
      setTorchSupported(false);
      setTorchEnabled(false);
      setZoomSupported(false);
      return;
    }

    let active = true;

    const loadCameras = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const cameras = await Html5Qrcode.getCameras();

        if (!active) {
          return;
        }

        setAvailableCameras(cameras);
        setSelectedCameraId((currentCameraId) => currentCameraId || getPreferredCamera(cameras)?.id || '');
      } catch {
        if (active) {
          setAvailableCameras([]);
        }
      }
    };

    void loadCameras();

    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    let disposed = false;

    const startScanner = async () => {
      if (!open) {
        await cleanupScanner();
        return;
      }

      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setScannerError("Bu brauzer kamera orqali skanerlashni qo'llamaydi.");
        return;
      }

      setScannerLoading(true);
      setScannerError('');
      setTorchSupported(false);
      setTorchEnabled(false);
      setZoomSupported(false);
      detectedRef.current = false;

      try {
        await cleanupScanner();

        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

        if (disposed) {
          return;
        }

        const scanner = new Html5Qrcode(scannerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.ITF,
          ],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
          verbose: false,
        });

        scannerRef.current = scanner;

        const cameraCandidates: Array<string | MediaTrackConstraints> = [];

        if (selectedCameraId) {
          cameraCandidates.push(selectedCameraId);
        }

        const preferredCameraId = getPreferredCamera(availableCameras)?.id;
        if (preferredCameraId && preferredCameraId !== selectedCameraId) {
          cameraCandidates.push(preferredCameraId);
        }

        cameraCandidates.push(
          { facingMode: { exact: 'environment' } },
          { facingMode: 'environment' },
          { facingMode: 'user' }
        );

        const scanConfig = {
          fps: 10,
          disableFlip: false,
          qrbox: { width: 280, height: 140 },
          aspectRatio: 1.777778,
          videoConstraints: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            focusMode: 'continuous',
          },
        };

        let startError: unknown = null;

        for (const cameraSource of cameraCandidates) {
          try {
            await scanner.start(
              cameraSource,
              scanConfig,
              async (decodedText) => {
                await handleDetectedCode(decodedText);
              },
              () => {
                // Ignore frame-level misses.
              }
            );
            startError = null;
            break;
          } catch (error) {
            startError = error;
          }
        }

        if (startError) {
          throw startError;
        }

        try {
          const trackCapabilities = scanner.getRunningTrackCapabilities() as MediaTrackCapabilities & {
            zoom?: MediaSettingsRange;
            torch?: boolean;
          };
          const trackSettings = scanner.getRunningTrackSettings() as MediaTrackSettings & {
            zoom?: number;
            torch?: boolean;
          };

          setTorchSupported(Boolean(trackCapabilities.torch));
          setTorchEnabled(Boolean(trackSettings.torch));

          if (
            trackCapabilities.zoom &&
            typeof trackCapabilities.zoom.min === 'number' &&
            typeof trackCapabilities.zoom.max === 'number'
          ) {
            setZoomSupported(true);
            setZoomRange({
              min: trackCapabilities.zoom.min,
              max: trackCapabilities.zoom.max,
              step: trackCapabilities.zoom.step || 0.1,
            });
            setZoomValue(
              typeof trackSettings.zoom === 'number'
                ? trackSettings.zoom
                : trackCapabilities.zoom.min
            );
          }
        } catch {
          setTorchSupported(false);
          setTorchEnabled(false);
          setZoomSupported(false);
        }

        if (disposed) {
          await cleanupScanner();
        }
      } catch (error) {
        if (!disposed) {
          detectedRef.current = false;
          setScannerError(formatScannerError(error));
        }
      } finally {
        if (!disposed) {
          setScannerLoading(false);
        }
      }
    };

    void startScanner();

    return () => {
      disposed = true;
      void cleanupScanner();
    };
  }, [availableCameras, open, restartKey, scannerId, selectedCameraId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          {title}
        </Typography>

        {scannerError && <Alert severity="error" sx={{ mb: 2 }}>{scannerError}</Alert>}

        {availableCameras.length > 1 && (
          <TextField
            fullWidth
            select
            label="Kamera"
            value={selectedCameraId}
            onChange={(event) => setSelectedCameraId(event.target.value)}
            sx={{ mb: 2 }}
          >
            {availableCameras.map((camera, index) => (
              <MenuItem key={camera.id} value={camera.id}>
                {camera.label || `Kamera ${index + 1}`}
              </MenuItem>
            ))}
          </TextField>
        )}

        <Box
          sx={{
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#111',
            minHeight: { xs: 280, sm: 340 },
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
            '& video': {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            },
          }}
        >
          {scannerLoading && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(17, 17, 17, 0.35)',
                zIndex: 1,
              }}
            >
              <CircularProgress />
            </Box>
          )}
          <Box
            id={scannerId}
            sx={{
              width: '100%',
              minHeight: { xs: 280, sm: 340 },
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Button variant="outlined" onClick={() => setRestartKey((value) => value + 1)}>
            Qayta ishga tushirish
          </Button>
          {torchSupported && (
            <Button variant="outlined" color={torchEnabled ? 'warning' : 'primary'} onClick={handleTorchToggle}>
              {torchEnabled ? 'Chiroqni o`chirish' : 'Chiroqni yoqish'}
            </Button>
          )}
        </Box>

        {zoomSupported && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
              Kamera yaqinlashtirish: {zoomValue.toFixed(1)}x
            </Typography>
            <Slider
              min={zoomRange.min}
              max={zoomRange.max}
              step={zoomRange.step}
              value={zoomValue}
              onChange={(_, value) => setZoomValue(Array.isArray(value) ? value[0] : value)}
              onChangeCommitted={async (_, value) => {
                const nextValue = Array.isArray(value) ? value[0] : value;
                await applyZoom(nextValue);
              }}
            />
          </Box>
        )}

        <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
          {description}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <TextField
            fullWidth
            label="Barcode ni qo`lda kiriting"
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            onKeyDown={async (event) => {
              if (event.key === 'Enter') {
                await handleManualSubmit();
              }
            }}
          />
          <Button variant="contained" onClick={handleManualSubmit}>
            Topish
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button fullWidth variant="outlined" onClick={onClose}>
            Yopish
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
