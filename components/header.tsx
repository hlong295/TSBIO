"use client"

import type React from "react"
import { Search, User, Globe, Bell, Menu } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { useState, useRef, useEffect } from "react"
import Image from "next/image"

export function Header() {
  const { language, setLanguage, t } = useLanguage()
  const { user } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // TSBIO: keep UX stable, do not touch auth/session logic here.
  const hasNotification = false

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLanguageDropdownOpen(false)
      }
    }

    if (isLanguageDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isLanguageDropdownOpen])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Reuse existing stable search endpoint/page
      router.push(`/exchange?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleLanguageSelect = (lang: string) => {
    setLanguage(lang as any)
    setIsLanguageDropdownOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-green-100 bg-white/95 backdrop-blur-md">
      <div className="container mx-auto px-3">
        <div className="flex h-11 items-center justify-between gap-2">
          {/* Left: Menu + Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                // Placeholder (no sidebar yet). Keep stable: do not change routing.
              }}
              className="flex items-center justify-center h-9 w-9 rounded-full bg-green-50 hover:bg-green-100 transition"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5 text-green-700" />
            </button>

            <button onClick={() => router.push("/")} className="flex items-center gap-1.5">
              <div className="h-7 w-7 rounded-xl overflow-hidden shadow-sm bg-white flex items-center justify-center border border-green-100">
                <Image src="/pitodo-logo.png" alt="TSBIO" width={28} height={28} className="h-full w-full object-contain" />
              </div>
              <span className="font-bold text-base text-green-800">TRƯỜNG SƠN bio</span>
            </button>
          </div>

          {/* Right: Search icon is in bar; here: Globe + Bell + Account */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                className="flex items-center justify-center h-9 w-9 bg-green-50 rounded-full hover:bg-green-100 transition"
                aria-label="Select Language"
              >
                <Globe className="h-5 w-5 text-green-700" />
              </button>

              {isLanguageDropdownOpen && (
                <div className="absolute top-full mt-1 right-0 w-40 bg-white rounded-xl shadow-lg border border-green-100 overflow-hidden z-50">
                  <button
                    onClick={() => handleLanguageSelect("vi")}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-green-50 transition-colors ${
                      language === "vi" ? "bg-green-100 font-semibold" : ""
                    }`}
                  >
                    <span>🇻🇳</span>
                    <span>Việt</span>
                  </button>
                  <button
                    onClick={() => handleLanguageSelect("en")}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-green-50 transition-colors ${
                      language === "en" ? "bg-green-100 font-semibold" : ""
                    }`}
                  >
                    <span>🇬🇧</span>
                    <span>English</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => router.push("/activity")}
              className="relative flex items-center justify-center h-9 w-9 bg-green-50 rounded-full hover:bg-green-100 transition"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-green-700" />
              {hasNotification && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-red-500 border-2 border-white rounded-full" />
              )}
            </button>

            <button
              onClick={() => router.push("/account")}
              className="flex items-center justify-center h-9 w-9 bg-gradient-to-br from-green-700 to-emerald-700 rounded-full shadow-sm hover:shadow-md transition"
              aria-label="Account"
            >
              <User className="h-5 w-5 text-white stroke-[2.5]" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="pb-2 pt-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-green-700" />
            <Input
              type="search"
              placeholder={t("search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm rounded-full border-green-100 bg-white focus-visible:ring-green-200 focus-visible:border-green-200 shadow-sm placeholder:text-gray-400 text-gray-900"
            />
          </div>
        </form>

        {/* Keep header compact; no lucky-spin banners here in TSBIO */}
      </div>
    </header>
  )
}
