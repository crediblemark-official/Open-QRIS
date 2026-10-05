import { HexclaveClientApp } from "@hexclave/js";

export const hexclaveClientApp = new HexclaveClientApp({
  projectId: "e256b22d-cd84-4f53-b37c-abae073d0278",
  publishableClientKey: "pck_wk7jqtvrh9d4jm97dkemsn2077y2507bypr2tdqzxha2r",
  tokenStore: "cookie",
  urls: {
    default: { type: "hosted" },
    signIn: { type: "custom", url: "/login", version: 1 },
    signUp: { type: "custom", url: "/sign-up", version: 1 },
    forgotPassword: { type: "custom", url: "/forgot-password", version: 1 },
    passwordReset: { type: "custom", url: "/password-reset", version: 1 },
    emailVerification: { type: "custom", url: "/verify-email", version: 1 },
    accountSettings: { type: "custom", url: "/account-settings", version: 1 },
    error: { type: "custom", url: "/error", version: 1 },
    mfa: { type: "custom", url: "/mfa", version: 1 },
    afterSignIn: "/",
    afterSignUp: "/",
    afterSignOut: "/login",
    home: "/",
  },
});
