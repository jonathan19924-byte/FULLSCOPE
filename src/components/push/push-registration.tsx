"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { registerDeviceTokenAction } from "@/lib/push/actions";

/**
 * Requests push permission and registers this device's APNs token on every
 * app launch while signed in — a plain no-op on web, since Capacitor.
 * isNativePlatform() is only true inside the native iOS shell. Runs once
 * per mount (not per-navigation) since permission/registration only needs
 * to happen once per launch, not once per page.
 */
export function PushRegistration({ signedIn }: { signedIn: boolean }) {
  useEffect(() => {
    if (!signedIn || !Capacitor.isNativePlatform()) return;

    let cancelled = false;

    async function register() {
      const permission = await PushNotifications.checkPermissions();
      let status = permission.receive;
      if (status === "prompt" || status === "prompt-with-rationale") {
        const requested = await PushNotifications.requestPermissions();
        status = requested.receive;
      }
      if (status !== "granted" || cancelled) return;

      await PushNotifications.register();
    }

    const registrationListener = PushNotifications.addListener("registration", (token) => {
      registerDeviceTokenAction(token.value);
    });
    // Without this, a registration failure (missing AppDelegate forwarding,
    // a provisioning/entitlement mismatch, no network, etc.) fails
    // completely silently — this was exactly how the AppDelegate bug went
    // unnoticed. Just a console log for now: there's no user-facing surface
    // where a push-setup failure would make sense to show.
    const errorListener = PushNotifications.addListener("registrationError", (err) => {
      console.error("Push registration failed:", err);
    });

    register();

    return () => {
      cancelled = true;
      registrationListener.then((handle) => handle.remove());
      errorListener.then((handle) => handle.remove());
    };
  }, [signedIn]);

  return null;
}
