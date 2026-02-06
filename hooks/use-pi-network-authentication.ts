"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/contexts/auth-context"

declare global {
  interface Window {
    Pi?: {
      init: (args: { version: string; sandbox?: boolean }) => void
      authenticate: (scopes: string[], onIncompletePaymentFound?: (payment: any) => any) => Promise<any>
    }
  }
}

interface PiUser {
  uid: string
  username: string
  accessToken: string
}

type PiNetworkMode = "mainnet"

function isPiBrowser(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent || ""
  return /PiBrowser/i.test(ua)
}

function hasPiSdk(): boolean {
  return typeof window !== "undefined" && typeof window.Pi !== "undefined"
}

export function usePiNetworkAuthentication() {
  const { login, user: authUser } = useAuth()

  // Keep UI fields stable
  const [sdkReady, setSdkReady] = useState(false)
  const [sdkStatus, setSdkStatus] = useState<string>("Initializing...")
  const [sdkError, setSdkError] = useState<string | null>(null)

  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // V5: Prod only, no sandbox
  const mode: PiNetworkMode = "mainnet"

  const initOnce = useRef(false)

  const initSdk = useCallback(async () => {
    if (typeof window === "undefined") return
    if (initOnce.current) return
    initOnce.current = true

    try {
      setSdkError(null)

      // No injection: in Pi Browser, window.Pi is injected.
      // In normal browsers (Chrome/Safari), Pi login is not available.
      if (!hasPiSdk()) {
        setSdkReady(false)
        setSdkStatus("Pi SDK: not available")
        return
      }

      // Same as dowithpi: init once, sandbox=false
      setSdkStatus("Pi SDK init (mainnet)...")
      window.Pi!.init({ version: "2.0", sandbox: false })

      setSdkReady(true)
      setSdkStatus(`Pi SDK: Connected${isPiBrowser() ? " (Pi Browser)" : ""}`)
    } catch (err: any) {
      const msg = err?.message || "PI_SDK_INIT_FAILED"
      setSdkError(msg)
      setSdkReady(false)
      setSdkStatus("Pi SDK: error")
    }
  }, [])

  useEffect(() => {
    void initSdk()
  }, [initSdk])

  const authenticateWithPi = useCallback(async () => {
    if (typeof window === "undefined") return

    setAuthError(null)

    try {
      if (!sdkReady) {
        await initSdk()
      }

      if (!hasPiSdk()) {
        throw new Error("PI_SDK_NOT_AVAILABLE")
      }

      setIsAuthenticating(true)
      setSdkStatus("Pi SDK: Connected")

      // Copy dowithpi pattern: request username only; no payments here.
      const authResult = await window.Pi!.authenticate(["username"], (payment: any) => payment)

      const user: PiUser = {
        uid: authResult?.user?.uid,
        username: authResult?.user?.username,
        accessToken: authResult?.accessToken,
      }

      if (!user.uid || !user.username || !user.accessToken) {
        throw new Error("PI_AUTH_INVALID_RESPONSE")
      }

      // Persist into app auth context (existing behavior)
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
      const msg = err?.message || "PI_AUTH_FAILED"

      // Keep message short and actionable, without changing UI.
      if (msg === "PI_SDK_NOT_AVAILABLE") {
        setAuthError("Pi SDK chưa sẵn sàng. Hãy mở trang trong Pi Browser (Develop) và thử lại.")
      } else {
        setAuthError(`Đăng nhập Pi thất bại: ${msg}`)
      }

      throw err
    } finally {
      setIsAuthenticating(false)
    }
  }, [initSdk, login, sdkReady])

  const resetAuthErrors = useCallback(() => {
    setAuthError(null)
    setSdkError(null)
  }, [])

  return {
    // Backward-compatible fields
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
    resetAuthErrors,
  }
}
