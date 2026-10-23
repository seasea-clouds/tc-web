declare global {
  interface Window {
    turnstile?: {
      /** 返回 widgetId（CF 实现返回 string，类型上放宽以免误用） */
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          language?: string;
        },
      ) => string | undefined;
      /** 接受 widgetId 或容器（新版 API 两种都支持） */
      reset: (widgetIdOrContainer: string | HTMLElement) => void;
      getResponse: (widgetIdOrContainer: string | HTMLElement) => string;
      /** 存在但不保证一定有；用于等 api.js 完全就绪后再 render */
      ready?: (cb: () => void) => void;
    };
  }
}

export {};
