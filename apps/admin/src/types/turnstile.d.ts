declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'expired-callback'?: () => void;
        'error-callback'?: () => void;
        theme?: 'light' | 'dark' | 'auto';
        language?: string;
      }) => void;
      reset: (container: HTMLElement) => void;
      getResponse: (container: HTMLElement) => string;
    };
  }
}

export {};
