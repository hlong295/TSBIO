"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { Leaf, Globe, User } from "lucide-react"

export function AppHeader() {
  const { isAuthenticated, piUser } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="flex h-14 items-center justify-between px-4 max-w-screen-sm mx-auto">
        {/* App Logo and Name */}
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-base font-bold text-foreground">TSBIO</h1>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Language Switch */}
          <Button size="icon" variant="ghost" className="h-9 w-9 bg-transparent">
            <Globe className="h-4 w-4" />
            <span className="sr-only">Chuyển ngôn ngữ</span>
          </Button>

          {/* Account/Login */}
          <Link href="/tai-khoan">
            <Button size="icon" variant="ghost" className="h-9 w-9 bg-transparent relative">
              <User className="h-4 w-4" />
              {isAuthenticated && (
                <Badge className="absolute -top-1 -right-1 h-3 w-3 p-0 bg-primary border-2 border-white" />
              )}
              <span className="sr-only">{isAuthenticated ? piUser?.username : "Đăng nhập"}</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
