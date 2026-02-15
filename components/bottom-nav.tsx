"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Leaf, Sprout, LifeBuoy, Newspaper } from "lucide-react"

import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/language-context"

// TSBIO Constitution (V5): Footer MUST be exactly 5 tabs in this fixed order
// Trang chủ – Nông sản – TSBIO (center) – Cứu vườn – Tin tức
export function BottomNav() {
  const { t } = useLanguage()
  const { user } = useAuth() // keep for future; do not change auth flow
  const pathname = usePathname()

  const navItems = [
    { id: "home", href: "/", icon: Home, labelKey: "navHome" as const },
    { id: "market", href: "/market", icon: Leaf, labelKey: "navMarket" as const },
    { id: "tsbio", href: "/tsbio", icon: Sprout, labelKey: "navTSBIO" as const, isCenter: true },
    { id: "rescue", href: "/rescue", icon: LifeBuoy, labelKey: "navRescue" as const },
    { id: "news", href: "/news", icon: Newspaper, labelKey: "navNews" as const },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl rounded-t-3xl shadow-[0_-4px_24px_rgba(16,185,129,0.12)] border-t border-green-100/60">
      <div className="container px-1">
        <div className="grid grid-cols-5 h-16 items-end pb-1">
          {navItems.map((item) => {
            // If we redirect Market/TSBIO to /exchange internally, keep highlight consistent.
            const isActive =
              pathname === item.href ||
              ((item.id === "market" || item.id === "tsbio") && pathname === "/exchange")

            if (item.isCenter) {
              return (
                <div key={item.id} className="flex justify-center">
                  <Link
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 transition-all duration-300",
                      "h-14 w-14 rounded-2xl shadow-xl -mt-4",
                      isActive
                        ? "bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 scale-105"
                        : "bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 hover:scale-105",
                    )}
                  >
                    <item.icon className="h-6 w-6 stroke-[2.5] text-white" />
                    <span className="text-[8px] font-bold text-white">{t(item.labelKey)}</span>
                  </Link>
                </div>
              )
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-1.5 transition-all duration-300 rounded-xl mx-0.5",
                  isActive
                    ? "bg-gradient-to-br from-green-700 to-emerald-700 shadow-lg shadow-green-500/20"
                    : "text-gray-400 hover:text-gray-600",
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-all duration-300",
                    isActive ? "stroke-[2.5] text-white" : "stroke-[2]",
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-semibold transition-all duration-300",
                    isActive ? "text-white" : "text-gray-500",
                  )}
                >
                  {t(item.labelKey)}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
