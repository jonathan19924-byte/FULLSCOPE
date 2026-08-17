import type { CapacitorConfig } from "@capacitor/cli";

// The app can't be a static export (Server Actions, cookie-based auth
// middleware, and cron API routes all need a real Next.js server — that's
// why it's deployed on Vercel rather than exported). So instead of bundling
// local web assets, the native shell's WebView loads the live production
// URL directly — everything server-rendered keeps working exactly as it
// does in the browser today, no rewrite required.
const config: CapacitorConfig = {
  appId: "com.fullscope.app",
  appName: "FullScope",
  webDir: "public",
  server: {
    url: "https://fullscope-eight.vercel.app",
    cleartext: false,
  },
  plugins: {
    SocialLogin: {
      providers: {
        google: true,
        apple: true,
        facebook: false,
        twitter: false,
      },
    },
  },
};

export default config;
