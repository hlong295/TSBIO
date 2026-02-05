"use client";

import { useState } from "react";

declare global {
  interface Window {
    Pi?: any;
  }
}

interface PiUser {
  uid: string;
  username: string;
  accessToken: string;
}

export function usePiNetworkAuthentication() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<PiUser | null>(null);

  // Load SDK nếu chưa có
  const loadSdk = () => {
    return new Promise<void>((resolve, reject) => {
      if (window.Pi) return resolve();

      const script = document.createElement("script");
      script.src = "https://sdk.minepi.com/pi-sdk.js";
      script.async = true;

      script.onload = () => resolve();
      script.onerror = () => reject("Load Pi SDK failed");

      document.body.appendChild(script);
    });
  };

  // Login chỉ chạy khi user bấm nút
  const authenticate = async () => {
    try {
      setLoading(true);
      setError(null);

      await loadSdk();

      if (!window.Pi) {
        throw new Error("Pi SDK not available");
      }

      window.Pi.init({
        version: "2.0",
        sandbox: false, // mainnet
      });

      const auth = await window.Pi.authenticate(
        ["username", "payments"],
        () => {}
      );

      const piUser: PiUser = {
        uid: auth.user.uid,
        username: auth.user.username,
        accessToken: auth.accessToken,
      };

      setUser(piUser);

      // Optional: sync backend
      try {
        await fetch("/api/auth/pi", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(piUser),
        });
      } catch {
        // ignore backend error
      }

      return piUser;
    } catch (err: any) {
      console.error("Pi auth error:", err);
      setError("Không thể kết nối Pi Network");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    authenticate,
    loading,
    error,
    user,
  };
}
