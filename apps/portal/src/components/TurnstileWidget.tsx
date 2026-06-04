'use client';

import { useEffect, useRef, useCallback } from 'react';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  siteKey?: string;
}

// CF Turnstile test key (always passes in dev)
const DEFAULT_SITE_KEY = '1x00000000000000000000AA';

export default function TurnstileWidget({
  onVerify,
  onError,
  onExpire,
  siteKey = DEFAULT_SITE_KEY,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const loadedRef = useRef(false);

  const reset = useCallback(() => {
    if (widgetIdRef.current && (window as any).turnstile) {
      (window as any).turnstile.reset(widgetIdRef.current);
    }
  }, []);

  useEffect(() => {
    // Already loaded
    if (loadedRef.current && containerRef.current && (window as any).turnstile) {
      try {
        widgetIdRef.current = (window as any).turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: onVerify,
          'error-callback': onError,
          'expired-callback': () => {
            onExpire?.();
            reset();
          },
          theme: 'light' as const,
          size: 'normal' as const,
        });
      } catch {}
      return;
    }

    // Load script
    const scriptId = 'cf-turnstile-script';
    if (document.getElementById(scriptId)) {
      // Script already exists, just render
      if (containerRef.current && (window as any).turnstile) {
        widgetIdRef.current = (window as any).turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: onVerify,
          'error-callback': onError,
          'expired-callback': () => {
            onExpire?.();
            reset();
          },
          theme: 'light' as const,
          size: 'normal' as const,
        });
        loadedRef.current = true;
      }
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (containerRef.current && (window as any).turnstile) {
        widgetIdRef.current = (window as any).turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: onVerify,
          'error-callback': onError,
          'expired-callback': () => {
            onExpire?.();
            reset();
          },
          theme: 'light' as const,
          size: 'normal' as const,
        });
        loadedRef.current = true;
      }
    };
    document.head.appendChild(script);

    return () => {
      if (widgetIdRef.current && (window as any).turnstile) {
        (window as any).turnstile.remove(widgetIdRef.current);
      }
    };
  }, [siteKey, onVerify, onError, onExpire, reset]);

  return (
    <div className="flex justify-center">
      <div ref={containerRef} className="cf-turnstile" />
    </div>
  );
}

/**
 * Expose reset via ref pattern — use with useImperativeHandle if needed.
 * For simple usage, key prop re-mount suffices.
 */
export { DEFAULT_SITE_KEY };
