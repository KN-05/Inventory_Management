// src/components/auth/GoogleButton.jsx
// "Continue with Google" using Google Identity Services (Google's official
// browser library). Google shows its own button and sign-in popup; when the
// person finishes, Google hands us an ID token ("credential") which we pass
// to `onCredential`. The token is NOT trusted here - the server verifies it.
//
// Needs VITE_GOOGLE_CLIENT_ID in client/.env. Without it the button explains
// that Google sign-in is not set up and the e-mail form keeps working.

import { useEffect, useRef, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise;
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = SCRIPT_SRC;
      el.async = true;
      el.defer = true;
      el.onload = () => resolve();
      el.onerror = () => {
        scriptPromise = undefined; // allow a retry
        reject(new Error('Google script failed to load'));
      };
      document.head.appendChild(el);
    });
  }
  return scriptPromise;
}

function GoogleButton({ intent = 'signin', onCredential, disabled = false }) {
  const holderRef = useRef(null);
  // loading | ready | failed | unconfigured
  const [status, setStatus] = useState(CLIENT_ID ? 'loading' : 'unconfigured');
  const callbackRef = useRef(onCredential);

  // always call the latest handler without re-initialising Google
  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !holderRef.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            if (response?.credential) callbackRef.current?.(response.credential);
          },
        });
        window.google.accounts.id.renderButton(holderRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: intent === 'signup' ? 'signup_with' : 'signin_with',
          logo_alignment: 'left',
          width: Math.min(360, Math.max(240, holderRef.current.clientWidth || 320)),
        });
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [intent]);

  if (status === 'unconfigured') {
    return (
      <p className="auth-google-note" role="note">
        Google sign-in is not set up on this app yet. Please use e-mail and password below.
      </p>
    );
  }

  return (
    <div className="auth-google" aria-busy={status === 'loading'}>
      {/* Google draws its own button inside this box. While `disabled` (a
          request is already running) it is dimmed and ignores clicks. */}
      <div ref={holderRef} className={`auth-google-holder${disabled ? ' is-disabled' : ''}`} />
      {status === 'loading' && <p className="auth-google-note">Loading Google sign-in...</p>}
      {status === 'failed' && (
        <p className="auth-google-note" role="alert">
          Google sign-in could not be loaded (check your connection or an ad blocker). You can still use e-mail and
          password.
        </p>
      )}
    </div>
  );
}

export default GoogleButton;
