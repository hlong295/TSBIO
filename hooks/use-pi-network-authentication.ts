"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/contexts/auth-context"

declare global {
  interface Window {
    Pi?: any
  }
}

type PiNetworkMode = "sandbox" | "mainnet"

function hasPiSdk(): boolean {
  return typeof window !== "undefined" && typeof window.Pi !== "undefined"
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

const HARD_MODE: PiNetworkMode = "sandbox"

export function usePiNetworkAuthentication() {
  const { login, user: authUser, isAuthenticated } = useAuth()

  const [sdkReady, setSdkReady] = useState(false)
  const [sdkStatus, setSdkStatus] = useState<string>("Initializing...")
  const [sdkError, setSdkError] = useState<string | null>(null)

  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const initOnce = useRef(false)

  const initSdk = useCallback(async () => {
    if (typeof window === "undefined") return
    if (initOnce.current) return
    initOnce.current = true

    try {
      setSdkError(null)

      if (!hasPiSdk()) {
        setSdkReady(false)
        setSdkStatus("Pi SDK: not available")
        return
      }

      const sandbox = HARD_MODE === "sandbox"
      setSdkStatus(`Pi SDK init (${sandbox ? "sandbox" : "mainnet"})...`)
      try {
        window.Pi!.init({ version: "2.0", sandbox })
      } catch {
        // ignore init errors
      }

      setSdkReady(true)
      setSdkStatus(`Pi SDK: Connected • ${sandbox ? "sandbox" : "mainnet"}`)
    } catch (err: any) {
      setSdkReady(false)
      setSdkStatus("Pi SDK: error")
      setSdkError(err?.message || "PI_SDK_INIT_FAILED")
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
      if (!window.Pi) {
        throw new Error("PI_SDK_NOT_AVAILABLE")
      }

      setIsAuthenticating(true)

      const authResult: any = await withTimeout(
        window.Pi.authenticate(["username"], (payment: any) => payment),
        25000,
        "PI_AUTH_TIMEOUT"
      )

      const uid = authResult?.user?.uid
      const username = authResult?.user?.username
      const accessToken = authResult?.accessToken

      if (!uid || !username || !accessToken) {
        throw new Error("PI_AUTH_INVALID_RESPONSE")
      }

      login({ uid, username, accessToken, role: "user" })

      return { uid, username, accessToken }
    } catch (err: any) {
      const code = err?.message || "PI_AUTH_FAILED"
      if (code === "PI_AUTH_TIMEOUT") {
        setAuthError(
          "Pi SDK không mở được màn hình xác thực (timeout). Thường do domain chưa được Pi Portal chấp nhận/verify cho app hiện tại, hoặc URL đang không đúng với cấu hình app trong Pi Developer Portal."
        )
      } else if (code === "PI_SDK_NOT_AVAILABLE") {
        setAuthError("Không tìm thấy Pi SDK. Hãy mở trang này trong Pi Browser.")
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
    isAuthenticated,
    user: authUser,
    isLoading: !sdkReady && !sdkError,
    sdkReady,
    sdkStatus,
    sdkError,
    mode: HARD_MODE,
    isAuthenticating,
    authError,
    authenticateWithPi,
    resetAuthErrors,
  }
}
