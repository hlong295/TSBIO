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

// NOTE: This is intentionally modeled after the proven DowithPi pattern.
// - No sandbox flag (prod/mainnet style init)
// - No retry / no auto mode switching
// - No custom script injection here
// - Safe guard: never call Pi.authenticate outside Pi Browser

function isPiBrowser(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent || ""
  return /PiBrowser/i.test(ua)
}

export function usePiNetworkAuthentication() {
  const { login, user: authUser } = useAuth()

  const [sdkReady, setSdkReady] = useState(false)
  const [sdkStatus, setSdkStatus] = useState<string>("Initializing...")
  const [sdkError, setSdkError] = useState<string | null>(null)

  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Keep stable values for UI that expects them
  const mode = useMemo(() => "mainnet" as const, [])
  const initOnce = useRef(false)

  const initSdk = useCallback(async () => {
    if (typeof window === "undefined") return
    if (initOnce.current) return
    initOnce.current = true

    try {
      setSdkError(null)
      setSdkStatus("Checking Pi SDK...")

      // IMPORTANT: In normal browsers, Pi SDK login is not supported.
      // We deliberately do NOT call Pi.init / Pi.authenticate outside Pi Browser.
      if (!isPiBrowser()) {
        setSdkReady(false)
        setSdkStatus("not_connected")
        return
      }

      if (!window.Pi) {
        // In Pi Browser, Pi object should be injected.
        setSdkReady(false)
        setSdkStatus("not_connected")
        setSdkError("PI_SDK_NOT_AVAILABLE")
        return
      }

      setSdkStatus("Initializing Pi SDK...")
      // DowithPi-style init: no sandbox flag.
      window.Pi.init({ version: "2.0" })

      setSdkReady(true)
      setSdkStatus("connected")
    } catch (err: any) {
      const msg = err?.message || "PI_SDK_INIT_FAILED"
      setSdkReady(false)
      setSdkStatus("error")
      setSdkError(msg)
    }
  }, [])

  useEffect(() => {
    void initSdk()
  }, [initSdk])

  const authenticateWithPi = useCallback(async () => {
    if (typeof window === "undefined") return
    setAuthError(null)

    try {
      // Hard guard: only Pi Browser is allowed to proceed.
      if (!isPiBrowser()) {
        throw new Error("PI_BROWSER_REQUIRED")
      }

      if (!sdkReady) {
        await initSdk()
      }

      if (!window.Pi) {
        throw new Error("PI_SDK_NOT_AVAILABLE")
      }

      setIsAuthenticating(true)

      // DowithPi-style authenticate: minimal scopes.
      const authResult = await window.Pi.authenticate(["username"], (payment: any) => payment)

      const user: PiUser = {
        uid: authResult?.user?.uid,
        username: authResult?.user?.username,
        accessToken: authResult?.accessToken,
      }

      if (!user.uid || !user.username || !user.accessToken) {
        throw new Error("PI_AUTH_INVALID_RESPONSE")
      }

      login({
        id: user.uid,
        username: user.username,
        email: "",
        role: "user",
        isPiUser: true,
      })

      return user
    } catch (err: any) {
      const code = err?.message || "PI_AUTH_FAILED"

      if (code === "PI_BROWSER_REQUIRED") {
        setAuthError("Vui lòng mở trang này trong Pi Browser để đăng nhập bằng Pi Network.")
      } else if (code === "PI_SDK_NOT_AVAILABLE") {
        setAuthError("Không tìm thấy Pi SDK trong Pi Browser. Hãy thử tải lại trang trong Pi Browser.")
      } else {
        setAuthError(`Đăng nhập Pi thất bại: ${code}`)
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
    isAuthenticated: Boolean(authUser?.isPiUser),
    user: authUser,
    isLoading: !sdkReady && !sdkError,
    sdkReady,
    // Keep these keys for existing UI
    sdkStatus,
    sdkError,
    mode,
    isAuthenticating,
    authError,
    authenticateWithPi,
    resetAuthErrors,
  }
}
