"use client"

import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { usePiNetworkAuthentication } from "@/hooks/use-pi-network-authentication"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"

interface PiAuthenticationCardProps {
  onSuccess: (accessToken: string, username: string, uid: string) => void
}

export function PiAuthenticationCard({ onSuccess }: PiAuthenticationCardProps) {
  const { isAuthenticated, authMessage, piAccessToken, error, reinitialize } = usePiNetworkAuthentication()

  useEffect(() => {
    if (isAuthenticated && piAccessToken) {
      // Extract user info from the authentication
      // Note: The hook doesn't return username/uid directly, 
      // so we'll need to handle this with the actual Pi SDK response
      onSuccess(piAccessToken, "Pi User", "pi-user-id")
    }
  }, [isAuthenticated, piAccessToken, onSuccess])

  return (
    <Card className="bg-white border-[hsl(30,8%,88%)]/50 shadow-sm">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-sm text-[hsl(130,38%,32%)]">Đăng nhập bằng Pi Network</CardTitle>
        <CardDescription className="text-xs text-[hsl(30,12%,45%)]">
          Đang xác thực tài khoản Pi Network của bạn
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col items-center justify-center py-4 space-y-3">
          {!error && !isAuthenticated && (
            <>
              <div className="flex h-12 w-12 items-center justify-center">
                <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-[hsl(130,38%,32%)]">{authMessage}</p>
                <p className="text-xs text-[hsl(30,12%,45%)] leading-relaxed max-w-xs">
                  Vui lòng chờ trong giây lát...
                </p>
              </div>
            </>
          )}

          {error && (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-7 w-7 text-red-600" />
              </div>
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-xs text-red-800">
                  {authMessage}
                </AlertDescription>
              </Alert>
              <Button
                onClick={reinitialize}
                className="w-full h-9 bg-gradient-to-r from-[hsl(45,96%,62%)] to-[hsl(38,92%,50%)] hover:from-[hsl(45,96%,58%)] hover:to-[hsl(38,92%,46%)] text-white text-sm font-semibold"
              >
                Thử lại
              </Button>
            </>
          )}

          {isAuthenticated && (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(115,48%,90%)]">
                <CheckCircle2 className="h-7 w-7 text-[hsl(122,48%,54%)]" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-[hsl(122,48%,54%)]">Đăng nhập thành công!</p>
                <p className="text-xs text-[hsl(30,12%,45%)]">
                  Đang chuyển hướng...
                </p>
              </div>
            </>
          )}
        </div>

        {!error && !isAuthenticated && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            <p className="text-[10px] text-amber-800 leading-relaxed">
              Nếu popup Pi Network không xuất hiện, vui lòng kiểm tra trình duyệt của bạn đã cho phép popup chưa.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
