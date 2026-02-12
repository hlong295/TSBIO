"use client"

import React from "react"

import { Home, Package, Leaf, HandHeart, Newspaper } from "lucide-react"
import { cn } from "@/lib/utils"

interface FooterNavItem {
  label: string
  icon: React.ElementType
  href: string
  isPrimary?: boolean
}

const navItems: FooterNavItem[] = [
  {
    label: "Trang chủ",
    icon: Home,
    href: "/",
  },
  {
    label: "Nông sản",
    icon: Package,
    href: "/nong-san",
  },
  {
    label: "TSBIO",
    icon: Leaf,
    href: "/tsbio",
    isPrimary: true,
  },
  {
    label: "Cứu vườn",
    icon: HandHeart,
    href: "/cuu-vuon",
  },
  {
    label: "Tin tức",
    icon: Newspaper,
    href: "/tin-tuc",
  },
]

export function AppFooter() {
  const activeRoute = "/"

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white">
      <nav className="max-w-screen-sm mx-auto">
        <ul className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeRoute === item.href
            const isPrimary = item.isPrimary

            return (
              <li key={item.href} className="flex-1">
                <a
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2 px-1 transition-colors",
                    isPrimary && "relative -mt-4"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full transition-all",
                      isPrimary
                        ? "h-14 w-14 bg-primary shadow-lg"
                        : "h-6 w-6",
                      isActive && !isPrimary && "text-primary",
                      !isActive && !isPrimary && "text-muted-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        isPrimary ? "h-7 w-7 text-white" : "h-5 w-5"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] leading-none",
                      isPrimary && "font-semibold text-primary",
                      isActive && !isPrimary && "text-primary font-medium",
                      !isActive && !isPrimary && "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    </footer>
  )
}
