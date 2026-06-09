'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { NeonButton } from '@/components/ui/NeonButton';

interface QrScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const id = 'nexora-qr-reader';
    const scanner = new Html5Qrcode(id);
    scannerRef.current = scanner;

    const start = async () => {
      if (startedRef.current) return;
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => {
            try {
              const parsed = JSON.parse(decoded);
              if (parsed?.code) {
                onScan(parsed.code);
                return;
              }
            } catch {
              // plain code
            }
            if (decoded.startsWith('NEX-')) {
              onScan(decoded.trim().toUpperCase());
            }
          },
          () => {},
        );
        startedRef.current = true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось открыть камеру');
      }
    };

    start();

    return () => {
      if (startedRef.current && scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
      }
    };
  }, [onScan]);

  return (
    <div className="space-y-3">
      <div id="nexora-qr-reader" className="rounded-xl overflow-hidden" />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <NeonButton variant="secondary" onClick={onClose}>Закрыть камеру</NeonButton>
    </div>
  );
}
