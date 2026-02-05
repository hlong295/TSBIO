"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

interface PiUser {
  uid: string
  username: string
  accessToken: string
  displayName?: string
  role?: "admin" | "user"
  createdAt?: string
}

interface AuthContextType {
  isAuthenticated: boolean
  piUser: PiUser | null
  login: (user: PiUser) => void
  logout: () => void
  updateDisplayName: (displayName: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [piUser, setPiUser] = useState<PiUser | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("tsbio_pi_user")
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        setPiUser(user)
        setIsAuthenticated(true)
      } catch (error) {
        console.error("[v0] Failed to parse stored user:", error)
        localStorage.removeItem("tsbio_pi_user")
      }
    }
  }, [])

  const login = (user: PiUser) => {
    setPiUser(user)
    setIsAuthenticated(true)
    localStorage.setItem("tsbio_pi_user", JSON.stringify(user))
  }

  const logout = () => {
    setPiUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem("tsbio_pi_user")
  }

  const updateDisplayName = (displayName: string) => {
    if (piUser) {
      const updatedUser = { ...piUser, displayName }
      setPiUser(updatedUser)
      localStorage.setItem("tsbio_pi_user", JSON.stringify(updatedUser))
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, piUser, login, logout, updateDisplayName }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
