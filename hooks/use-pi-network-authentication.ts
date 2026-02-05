// LOCKED FILE

import { useState, useEffect } from "react";
import { PI_NETWORK_CONFIG, BACKEND_URLS } from "@/lib/system-config";

interface PiAuthResult {
  accessToken: string;
  user: {
    uid: string;
    username: string;
  };
}

type PiUserIdentity = {
  uid: string;
  username: string;
};

declare global {
  interface Window {
    Pi: {
      init: (config: { version: string; sandbox?: boolean }) => Promise<void>;
      authenticate: (scopes: string[]) => Promise<PiAuthResult>;
    };
  }
}

const COMMUNICATION_REQUEST_TYPE = '@pi:app:sdk:communication_information_request';
const DEFAULT_ERROR_MESSAGE = 'Failed to authenticate or login. Please refresh and try again.';

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (error) {
    // Cross-origin access may throw when in an iframe
    if (
      error instanceof DOMException &&
      (error.name === 'SecurityError' || error.code === DOMException.SECURITY_ERR || error.code === 18)
    ) {
      return true;
    }
    // Firefox may throw generic Permission denied errors
    if (error instanceof Error && /Permission denied/i.test(error.message)) {
      return true;
    }

    throw error;
  }
}

function parseJsonSafely(value: any): any {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }
  return typeof value === 'object' && value !== null ? value : null;
}

// Function to dynamically load Pi SDK script
const loadPiSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    if (!PI_NETWORK_CONFIG.SDK_URL) {
      throw new Error("SDK URL is not set");
    }
    script.src = PI_NETWORK_CONFIG.SDK_URL;
    script.async = true;

    script.onload = () => {
      console.log("✅ Pi SDK script loaded successfully");
      resolve();
    };

    script.onerror = () => {
      console.error("❌ Failed to load Pi SDK script");
      reject(new Error("Failed to load Pi SDK script"));
    };

    document.head.appendChild(script);
  });
};

/**
 * Requests authentication credentials from the parent window (App Studio) via postMessage.
 * Returns null if not in iframe, timeout, or missing token (non-fatal check).
 *
 * @returns {Promise<{accessToken: string, appId: string}|null>} Resolves with credentials or null
 */
function requestParentCredentials(): Promise<{ accessToken: string; appId: string | null } | null> {
  // Early return if not in an iframe
  if (!isInIframe()) {
    return Promise.resolve(null);
  }

  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const timeoutMs = 1500;

  return new Promise((resolve) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Cleanup function to remove listener and clear timeout
    const cleanup = (listener: (event: MessageEvent) => void) => {
      window.removeEventListener('message', listener);
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };

    const messageListener = (event: MessageEvent) => {
      // Security: only accept messages from parent window
      if (event.source !== window.parent) {
        return;
      }

      // Validate message type and request ID match
      const data = parseJsonSafely(event.data);
      if (!data || data.type !== COMMUNICATION_REQUEST_TYPE || data.id !== requestId) {
        return;
      }

      cleanup(messageListener);

      // Extract credentials from response payload
      const payload = typeof data.payload === 'object' && data.payload !== null ? data.payload : {};
      const accessToken = typeof payload.accessToken === 'string' ? payload.accessToken : null;
      const appId = typeof payload.appId === 'string' ? payload.appId : null;

      // Return credentials or null if missing token
      resolve(accessToken ? { accessToken, appId } : null);
    };

    // Set timeout handler (resolve with null on timeout)
    timeoutId = setTimeout(() => {
      cleanup(messageListener);
      resolve(null);
    }, timeoutMs);

    // Register listener before sending request
    window.addEventListener('message', messageListener);

    // Send request to parent window to get credentials
    window.parent.postMessage(
      JSON.stringify({
        type: COMMUNICATION_REQUEST_TYPE,
        id: requestId
      }),
      '*'
    );
  });
}

/**
 * Logs in to the backend using a Pi auth token.
 *
 * The backend may (or may not) return identity info; we parse it when available
 * and fall back safely without breaking Pi SDK login.
 */
async function loginWithBackend(
  accessToken: string,
  appId: string | null
): Promise<PiUserIdentity | null> {
  let endpoint: string;
  let payload: { pi_auth_token: string; app_id?: string };
  if (appId) {
    endpoint = BACKEND_URLS.LOGIN_PREVIEW;
    payload = { pi_auth_token: accessToken, app_id: appId };
  } else {
    endpoint = BACKEND_URLS.LOGIN;
    payload = { pi_auth_token: accessToken };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(DEFAULT_ERROR_MESSAGE);

    // Best-effort parse.
    // Some backends return {
    isAuthenticated,
    authenticatedUser: piUser,
    authMessage,
    error,
    isLoading,
    authenticatePiUser,
    reinitialize: authenticatePiUser,
  }
}



export const usePiNetworkAuthentication = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMessage, setAuthMessage] = useState("Initializing Pi Network...");
  const [piAccessToken, setPiAccessToken] = useState<string | null>(null);
  const [piUser, setPiUser] = useState<PiUserIdentity | null>(null);
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false);

  const authenticateViaPiSdk = async (): Promise<void> => {
    setAuthMessage("Initializing Pi Network...");
    await window.Pi.init({ version: '2.0', sandbox: PI_NETWORK_CONFIG.SANDBOX });

    setAuthMessage("Authenticating Pi Network...");
    const scopes = ['username', 'roles', 'payments'];

    // Pi Browser may require a user gesture. We attempt once automatically; if it hangs,
    // we surface an actionable error so user can tap Retry.
    const authPromise = window.Pi.authenticate(scopes);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('PI_AUTH_TIMEOUT')), 12000)
    );
    const piAuthResult = (await Promise.race([authPromise, timeoutPromise])) as any;

    if (!piAuthResult.accessToken) {
      throw new Error(DEFAULT_ERROR_MESSAGE);
    }

    setAuthMessage("Logging in...");
    const identityFromBackend = await loginWithBackend(piAuthResult.accessToken, null);
    setPiAccessToken(piAuthResult.accessToken);
    setPiUser(identityFromBackend ?? piAuthResult.user ?? null);
  };

  // Initialize Pi SDK only (no automatic Pi.authenticate) to avoid popup blocking.
  // If running inside Pi App Studio iframe and parent provides credentials via postMessage,
  // we can still auto-link without requiring a popup.
  const initializePiSdkOnly = async () => {
    try {
      setError(null)
      setAuthMessage("Đang tải Pi SDK...")

      await loadPiSDK()

      if (typeof window === "undefined" || !(window as any).Pi) {
        throw new Error("PI_SDK_NOT_AVAILABLE")
      }

      // Initialize Pi SDK (safe to call multiple times)
      try {
        ;(window as any).Pi.init({
          version: PI_NETWORK_CONFIG.SDK_VERSION,
          sandbox: PI_NETWORK_CONFIG.SANDBOX,
        })
      } catch {
        // ignore duplicate init errors
      }

      setIsInitialized(true)

      // Auto attempt ONLY for iframe parent credentials (no popup needed)
      if (typeof window !== "undefined" && window.self !== window.top) {
        try {
          const parentAuth = await getParentCredentials()
          if (parentAuth?.accessToken) {
            setAuthMessage("Đang xác thực (Pi App Studio)...")
            const result = await callBackendAuth(parentAuth.accessToken)
            if (result?.user) {
              setAuthenticatedUser(result.user)
              setIsAuthenticated(true)
              setAuthMessage(`Xin chào ${result.user.username || "bạn"}! ✅`)
              return
            }
          }
        } catch {
          // ignore iframe auto-auth failures; user can still click to login
        }
      }

      setAuthMessage("Sẵn sàng đăng nhập bằng Pi Network.")
    } catch (err: any) {
      console.error("Pi SDK init error:", err)
      const msg =
        err?.message === "PI_SDK_NOT_AVAILABLE"
          ? "Pi SDK không khả dụng. Hãy mở app trong Pi Browser hoặc Pi App Studio."
          : "Không thể tải Pi SDK. Vui lòng thử lại."
      setError(msg)
      setAuthMessage(msg)
      setIsInitialized(false)
    }
  }

  // User-gesture login: this MUST be called from a button click to avoid popup blocking.
  const authenticatePiUser = async () => {
    setIsLoading(true)
    setError(null)
    setAuthMessage("Đang xác thực Pi Network...")

    try {
      if (!isInitialized) {
        await initializePiSdkOnly()
      }

      // If iframe + parent credentials available, prefer that (no popup).
      if (typeof window !== "undefined" && window.self !== window.top) {
        const parentAuth = await getParentCredentials()
        if (parentAuth?.accessToken) {
          const result = await callBackendAuth(parentAuth.accessToken)
          if (result?.user) {
            setAuthenticatedUser(result.user)
            setIsAuthenticated(true)
            setAuthMessage(`Xin chào ${result.user.username || "bạn"}! ✅`)
            return
          }
        }
      }

      // Otherwise use Pi SDK popup flow (requires user gesture).
      await authenticateViaPiSdk()
    } catch (err: any) {
      console.error("Pi auth error:", err)
      const msg =
        err?.message?.includes("timeout") || err?.message?.includes("TIMEOUT")
          ? "Pi SDK không phản hồi (không bật popup). Hãy bấm “Thử lại” và cho phép popup trong Pi Browser."
          : err?.message || "Đăng nhập Pi Network thất bại."
      setError(msg)
      setAuthMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => {
    initializePiSdkOnly();
  }, []);

  return {
    isAuthenticated,
    authMessage,
    piAccessToken,
    piUser,
    error,
    authenticatePiUser,
  };
};