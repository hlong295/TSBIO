"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { PiAuthenticationCard } from "@/components/pi-authentication-card"
import { User, Mail, Lock, LogIn, LogOut, ShoppingBag, Heart, Bell, Settings } from "lucide-react"

export default function AccountPage() {
  const router = useRouter()
  const { isAuthenticated, piUser, login, logout } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPiAuth, setShowPiAuth] = useState(false)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // TODO: Implement email login logic with backend
    console.log("[v0] Email login:", { email, password })
    setTimeout(() => setIsLoading(false), 1000)
  }

  const handlePiLoginClick = () => {
    setShowPiAuth(true)
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  // If authenticated, show account dashboard
  if (isAuthenticated && piUser) {
    return (
      <div className="min-h-screen bg-white pb-20">
        <AppHeader />
        <main className="px-4 py-6 space-y-4 max-w-screen-sm mx-auto">
          {/* User Profile Section */}
          <Card className="bg-white border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                  <svg
                    className="h-8 w-8 text-amber-600"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-foreground">{piUser.username}</h2>
                  <p className="text-xs text-muted-foreground">Pi User ID: {piUser.uid}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="text-[10px] text-primary font-medium">Pi Network Connected</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2.5">
            <Card className="bg-white border-border cursor-pointer hover:border-primary/50 transition-colors">
              <CardContent className="p-3.5">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium leading-tight">Đơn hàng</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-border cursor-pointer hover:border-primary/50 transition-colors">
              <CardContent className="p-3.5">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                    <Heart className="h-5 w-5 text-red-500" />
                  </div>
                  <span className="text-xs font-medium leading-tight">Yêu thích</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-border cursor-pointer hover:border-primary/50 transition-colors">
              <CardContent className="p-3.5">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                    <Bell className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium leading-tight">Thông báo</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-border cursor-pointer hover:border-primary/50 transition-colors">
              <CardContent className="p-3.5">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                    <Settings className="h-5 w-5 text-foreground" />
                  </div>
                  <span className="text-xs font-medium leading-tight">Cài đặt</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Info */}
          <Card className="bg-white border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Thông tin tài khoản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-xs text-muted-foreground">Loại tài khoản</span>
                <span className="text-xs font-medium">Pi Network</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-xs text-muted-foreground">Trạng thái</span>
                <span className="text-xs font-medium text-primary">Đã xác thực</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-muted-foreground">Pi Wallet</span>
                <span className="text-xs font-medium text-amber-600">Đã kết nối</span>
              </div>
            </CardContent>
          </Card>

          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full h-10 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 bg-transparent"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Đăng xuất
          </Button>
        </main>
        <AppFooter />
      </div>
    )
  }

  // Show login form if not authenticated
  return (
    <div className="min-h-screen bg-white pb-20">
      <AppHeader />

      <main className="px-4 py-6 space-y-5 max-w-screen-sm mx-auto">
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <User className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-foreground">Đăng nhập</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Đăng nhập để truy cập đầy đủ tính năng của TSBIO
          </p>
        </div>

        {/* Login Options */}
        <Tabs defaultValue="pi" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-10 bg-secondary">
            <TabsTrigger value="pi" className="text-xs data-[state=active]:bg-white">
              <svg
                className="mr-1.5 h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              </svg>
              Pi Network
            </TabsTrigger>
            <TabsTrigger value="email" className="text-xs data-[state=active]:bg-white">
              <Mail className="mr-1.5 h-3.5 w-3.5" />
              Email / Username
            </TabsTrigger>
          </TabsList>

          {/* Email/Username Login Tab */}
          <TabsContent value="email" className="mt-4">
            <Card className="bg-white border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm">Đăng nhập bằng Email hoặc Username</CardTitle>
                <CardDescription className="text-xs">
                  Nhập thông tin đăng nhập của bạn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-medium">
                      Email / Username
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="text"
                        placeholder="Nhập email hoặc username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-10 text-sm bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-medium">
                      Mật khẩu
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Nhập mật khẩu"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-10 text-sm bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <Link href="/quen-mat-khau" className="text-primary hover:underline">
                      Quên mật khẩu?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-10 bg-primary hover:bg-primary/90 text-white text-sm"
                    disabled={isLoading}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
                  </Button>

                  <div className="text-center pt-2">
                    <p className="text-xs text-muted-foreground">
                      Chưa có tài khoản?{" "}
                      <Link href="/dang-ky" className="text-primary font-medium hover:underline">
                        Đăng ký ngay
                      </Link>
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pi Network Login Tab */}
          <TabsContent value="pi" className="mt-4">
            {!showPiAuth ? (
              <Card className="bg-white border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm">Đăng nhập bằng Pi Network</CardTitle>
                  <CardDescription className="text-xs">
                    Sử dụng tài khoản Pi Network để đăng nhập nhanh chóng
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pi SDK Status Line */}
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <span className="text-xs font-medium text-foreground">Pi SDK:</span>
                    <span className="text-xs font-semibold text-primary">Connected</span>
                  </div>

                  <div className="flex flex-col items-center justify-center py-4 space-y-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                      <svg
                        className="h-8 w-8 text-amber-600"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                        <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
                      </svg>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium">Pi Network Login</p>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                        Kết nối với Pi Network để thanh toán và giao dịch trực tiếp bằng Pi
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handlePiLoginClick}
                    className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium"
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                    </svg>
                    Đăng nhập bằng Pi
                  </Button>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-[10px] text-amber-800 leading-relaxed">
                      <strong>Lưu ý:</strong> Tính năng này hoạt động khi bạn mở ứng dụng trong Pi Browser.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <PiAuthenticationCard onSuccess={(accessToken, username, uid) => {
                login({ accessToken, username, uid })
                router.push("/")
              }} />
            )}
          </TabsContent>
        </Tabs>

        {/* Additional Info */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Tại sao đăng nhập?</h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Mua sắm nông sản và sản phẩm TSBIO</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Theo dõi đơn hàng và lịch sử giao dịch</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Đăng bán nông sản của bạn</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Tham gia cộng đồng nông nghiệp minh bạch</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>

      <AppFooter />
    </div>
  )
}
