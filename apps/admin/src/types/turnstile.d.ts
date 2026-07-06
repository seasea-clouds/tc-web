declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
      }) => void;
      reset: (container: HTMLElement) => void;
      getResponse: (container: HTMLElement) => string;
    };
  }
}

export {};
