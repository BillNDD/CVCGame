/* WHAT THE CHECKER CANNOT SEE FROM THE SOURCE ALONE - the build's own
   globals and the vendor APIs the audio adapter feels for. Declared once here
   so `tsc -p app/jsconfig.json` (in npm run check since 2026-08-22, the
   bug-hunt ruling on @ts-check) reads the app the way the browser does. This
   file carries no code and ships nothing. It is a module (the export at the
   end) so the react augmentation below ADDS to react's types rather than
   replacing them, which is what an ambient `declare module` in a script does. */
export {};

declare global {
  const __APP_VERSION__: string;
  const __APP_BUILD__: string;
  interface ImportMeta {
    readonly env: { readonly PROD: boolean; readonly DEV: boolean; readonly MODE: string; readonly BASE_URL: string };
  }
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    /* The reference build's storage hook, read by the generated engine. */
    storage?: {
      get: (key: string) => Promise<{ value?: string } | null | undefined>;
      set: (key: string, value: string) => Promise<unknown>;
    };
  }
  interface Navigator {
    audioSession?: { type: string };
  }
  /* The gates' own probes, set on the page from page.evaluate in tools/ and
     tests/ui: every name begins with two underscores, and axe is injected by
     G8 and the census. Declared here so the tools config, which reads this
     file too, sees what a probe writes. */
  interface Window {
    [probe: `__${string}`]: any;
    axe?: any;
    webkitSpeechRecognition?: any;
    WebkitAudioContext?: any;
  }
}

/* The app sets CSS custom properties from style objects (--wqpop, --wqfill). */
declare module "react" {
  interface CSSProperties { [name: `--${string}`]: string | number | undefined }
}
