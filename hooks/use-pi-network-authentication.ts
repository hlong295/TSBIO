"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/contexts/auth-context"

declare global {
  interface Window {
    Pi?: any
  }
}

interface PiUser {
  uid: string
  username: string
  accessToken: string
}

type PiNetworkMode = "sandbox" | "mainnet"

function isPiBrowser(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent || ""
  return /PiBrowser/i.test(ua)
}

function getRequestedMode(): PiNetworkMode {
  // Priority:
  // 1) query param ?pi_mode=sandbox|mainnet (or ?sandbox=1)
  // 2) env NEXT_PUBLIC_PI_NETWORK=mainnet|sandbox
  // 3) heuristic: pinet.com/localhost => sandbox, otherwise sandbox by default
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search)
    const piMode = params.get("pi_mode")
    if (piMode === "mainnet" || piMode === "sandbox") return piMode
    const sandbox = params.get("sandbox")
    if (sandbox === "1" || sandbox === "true") return "sandbox"
  }

  const env = (process.env.NEXT_PUBLIC_PI_NETWORK || "").toLowerCase()
  if (env === "mainnet") return "mainnet"
  if (env === "sandbox" || env === "testnet") return "sandbox"

  if (typeof window !== "undefined") {
    const host = window.location.hostname
    if (host.includes("pinet.com") || host.includes("localhost")) return "sandbox"
  }

  // Default to sandbox to avoid "silent hang" when the developer only created a testnet app.
  return "sandbox"
}

function loadPiSdkIfNeeded(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.Pi) return Promise.resolve()

  return new Promise((resolve, reject) => {
    // Avoid duplicate loads
    const existing = document.querySelector('script[data-pi-sdk="1"]') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("PI_SDK_LOAD_FAILED")))
      return
    }

    const script = document.createElement("script")
    script.src = "https://sdk.minepi.com/pi-sdk.js"
    script.async = true
    script.defer = true
    script.setAttribute("data-pi-sdk", "1")
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("PI_SDK_LOAD_FAILED"))
    document.head.appendChild(script)
  })
}

async function withTimeout<T>(p: Promise<T>, ms: number, timeoutCode: string): Promise<T> {
  let t: any
  const timeout = new Promise<T>((_, reject) => {
    t = setTimeout(() => reject(new Error(timeoutCode)), ms)
  })
  try {
    return await Promise.race([p, timeout])
  } finally {
    clearTimeout(t)
  }
}

export function usePiNetworkAuthentication() {
  const { login, user: authUser } = useAuth()

  const [sdkReady, setSdkReady] = useState(false)
  const [sdkStatus, setSdkStatus] = useState<string>("Initializing...")
  const [sdkError, setSdkError] = useState<string | null>(null)

  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const mode = useMemo(() => getRequestedMode(), [])

  const initOnce = useRef(false)
  const currentModeRef = useRef<PiNetworkMode>(mode)

  const initSdk = useCallback(async () => {
    if (typeof window === "undefined") return
    if (initOnce.current) return
    initOnce.current = true

    try {
      setSdkStatus("Loading Pi SDK...")
      setSdkError(null)

      // In Pi Browser, Pi object is often already available; still safe to load.
      // NOTE: In Pi Browser / Pi App Studio, network can be slow; allow more time.
      await withTimeout(loadPiSdkIfNeeded(), 15000, "PI_SDK_LOAD_TIMEOUT")

      if (!window.Pi) {
        throw new Error("PI_SDK_NOT_AVAILABLE")
      }

      const sandbox = mode === "sandbox"
      currentModeRef.current = mode
      setSdkStatus(`Pi SDK init (${sandbox ? "sandbox" : "mainnet"})...`)
      window.Pi.init({ version: "2.0", sandbox })

      setSdkReady(true)
      setSdkStatus(`Pi SDK: ${isPiBrowser() ? "Pi Browser" : "Web"} • ${sandbox ? "sandbox" : "mainnet"}`)
    } catch (err: any) {
      const msg = err?.message || "PI_SDK_INIT_FAILED"
      setSdkError(msg)
      setSdkStatus("Pi SDK: error")
      setSdkReady(false)
    }
  }, [mode])

  useEffect(() => {
    void initSdk()
  }, [initSdk])

  const authenticateWithPi = useCallback(async () => {
    if (typeof window === "undefined") return
    setAuthError(null)

    // Must be triggered by a direct user click.
    try {
      if (!sdkReady) {
        await initSdk()
      }
      if (!window.Pi) {
        throw new Error("PI_SDK_NOT_AVAILABLE")
      }

      const tryAuth = async (tryMode: PiNetworkMode) => {
        // Re-init with the desired mode (Pi SDK allows re-init; keep it idempotent).
        const sandbox = tryMode === "sandbox"
        currentModeRef.current = tryMode
        try {
          window.Pi.init({ version: "2.0", sandbox })
        } catch {
          // Ignore re-init errors; we'll still attempt authenticate.
        }

        return await withTimeout(
          window.Pi.authenticate(["username"], (payment: any) => {
            // No-op. TSBIO login does not use payments here.
            return payment
          }),
          15000,
          "PI_AUTH_TIMEOUT"
        )
      }

      setIsAuthenticating(true)

      // If Pi SDK gets stuck (very common when app network mismatches: testnet vs mainnet),
      // auto-retry ONCE with the opposite mode.
      let authResult: any
      try {
        authResult = await tryAuth(currentModeRef.current)
      } catch (e: any) {
        const code = e?.message || "PI_AUTH_FAILED"
        if (code === "PI_AUTH_TIMEOUT") {
          const alt: PiNetworkMode = currentModeRef.current === "sandbox" ? "mainnet" : "sandbox"
          authResult = await tryAuth(alt)
        } else {
          throw e
        }
      }

      const user: PiUser = {
        uid: authResult?.user?.uid,
        username: authResult?.user?.username,
        accessToken: authResult?.accessToken,
      }

      if (!user.uid || !user.username || !user.accessToken) {
        throw new Error("PI_AUTH_INVALID_RESPONSE")
      }

      // Persist in your auth context (existing behavior)
      login({
        id: user.uid,
        username: user.username,
        email: "",
        role: "user",
        isPiUser: true,
        piUid: user.uid,
        accessToken: user.accessToken,
      })

      return user
    } catch (err: any) {
      const code = err?.message || "PI_AUTH_FAILED"

      // Friendly, actionable messages for the most common causes.
      if (code === "PI_AUTH_TIMEOUT") {
        setAuthError(
          "Pi SDK không mở được màn hình xác thực. Thường do app đang để TESTNET nhưng code init MAINNET (hoặc ngược lại), hoặc bạn mở link ngoài danh sách App trong Pi Browser. Hãy thử mở app từ Pi Browser → Develop → mở đúng app TSBIO Testnet, hoặc thêm ?pi_mode=sandbox vào URL rồi thử lại."
        )
      } else if (code === "PI_SDK_LOAD_TIMEOUT") {
        setAuthError("Tải Pi SDK quá lâu / thất bại. Hãy kiểm tra mạng trong Pi Browser hoặc thử tải lại trang.")
      } else if (code === "PI_SDK_NOT_AVAILABLE") {
        setAuthError("Không tìm thấy Pi SDK. Hãy mở trang này trong Pi Browser (không phải Chrome).")
      } else {
        setAuthError(`Đăng nhập Pi thất bại: ${code}`)
      }

      throw err
    } finally {
      setIsAuthenticating(false)
    }
  }, [initSdk, login, sdkReady])

  return {
    // Backward-compatible fields (some parts of the app expect these)
    isAuthenticated: Boolean(authUser?.isPiUser),
    user: authUser,
    isLoading: !sdkReady && !sdkError,
    sdkReady,
    sdkStatus,
    sdkError,
    mode,
    isAuthenticating,
    authError,
    authenticateWithPi,
  }
}
