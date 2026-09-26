// src/components/common/BarcodeScannerModal.jsx
// PHASE 31: camera-based barcode scanner, for whenever a dedicated USB/
// Bluetooth barcode scanner isn't available - works on any device with a
// camera (phone, laptop webcam) via the browser's getUserMedia API.
// Uses html5-qrcode, which supports CODE128 (what this project's
// products.buildBarcodeCandidate() generates) plus most common 1D/2D
// formats, so it also works for any barcode printed elsewhere.
//
// PHASE 31 FIX: camera-start failures (no camera, permission denied,
// insecure context, etc.) were previously only console.error'd, so the
// modal looked "stuck" with nothing visible and no clue why. Now shown
// as a visible error message inside the modal instead.
//
// PHASE 32: the camera keeps running after every decode - it does NOT
// close itself, so multiple products can be scanned back-to-back into
// the cart without reopening this modal each time. The caller (Sales.jsx)
// decides whether the scan matched a product and plays the appropriate
// success/error sound + closes the modal whenever IT wants to (e.g. a
// manual Close click).

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import AnimatedModal from './AnimatedModal';
import Button from './Button';

const REGION_ID = 'barcode-scanner-camera-region';

function BarcodeScannerModal({ open, onScan, onClose }) {
  const scannerRef = useRef(null);
  const startedRef = useRef(false);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    setError('');
    setStarting(true);

    // Give the modal's DOM node a tick to actually mount before Html5Qrcode
    // looks up the element by id.
    const timer = setTimeout(() => {
      let scanner;
      try {
        scanner = new Html5Qrcode(REGION_ID);
      } catch (err) {
        setError('Could not initialize the camera view: ' + err.message);
        setStarting(false);
        return;
      }
      scannerRef.current = scanner;
      startedRef.current = false;

      scanner
        .start(
          { facingMode: 'environment' }, // prefer the rear camera on phones
          { fps: 10, qrbox: { width: 260, height: 140 } },
          (decodedText) => {
            // Just report the scan - camera keeps running, sound/closing
            // decisions are left entirely to the parent (Sales.jsx).
            onScan(decodedText);
          },
          () => {
            // Fires on every frame with no barcode found - expected/noisy, ignore.
          }
        )
        .then(() => {
          startedRef.current = true;
          setStarting(false);
        })
        .catch((err) => {
          setStarting(false);
          setError(
            'Could not access the camera: ' +
              (err?.message || String(err)) +
              '. Check that a camera is connected and permission is allowed.'
          );
        });
    }, 100);

    return () => {
      clearTimeout(timer);
      const scanner = scannerRef.current;
      if (scanner && startedRef.current) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      } else if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [open, onScan]);

  return (
    <AnimatedModal open={open} onClose={onClose} maxWidth={420}>
      <h2>Scan Barcode</h2>
      <p className="page-subtitle" style={{ marginBottom: '0.75rem' }}>
        Point your device's camera at a product barcode. Scans continue automatically - keep
        scanning as many products as you need, then close when done.
      </p>
      {starting && !error && <p className="page-subtitle">Starting camera...</p>}
      {error && <p className="form-error">{error}</p>}
      <div id={REGION_ID} style={{ width: '100%', borderRadius: '8px', overflow: 'hidden' }} />
      <div className="modal-actions" style={{ marginTop: '1rem' }}>
        <Button variant="secondary" type="button" onClick={onClose}>
          Close
        </Button>
      </div>
    </AnimatedModal>
  );
}

export default BarcodeScannerModal;
