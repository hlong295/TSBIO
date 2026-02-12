"use client"

import React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { 
  ShieldCheck, 
  Sprout, 
  MapPin,
  CheckCircle2,
  Package,
  Store,
  Home as HomeIcon,
  Leaf,
  ChevronRight,
  Star
} from "lucide-react"

interface FeaturedProduct {
  id: string
  name: string
  location: string
  price: string
  verified: boolean
  image?: string
}

const featuredProducts: FeaturedProduct[] = [
  {
    id: "TS001",
    name: "Rau Xanh Hữu Cơ",
    location: "Đà Lạt, Lâm Đồng",
    price: "25.000đ/kg",
    verified: true
  },
  {
    id: "TS002",
    name: "Cà Chua Cherry",
    location: "Lâm Đồng",
    price: "35.000đ/kg",
    verified: true
  },
  {
    id: "TS003",
    name: "Dâu Tây Sạch",
    location: "Đà Lạt",
    price: "120.000đ/kg",
    verified: true
  },
  {
    id: "TS004",
    name: "Xà Lách Frillice",
    location: "Đà Lạt",
    price: "30.000đ/kg",
    verified: true
  }
]

interface QuickAccessItem {
  icon: React.ReactNode
  label: string
  color: string
  bgColor: string
}

const quickAccessItems: QuickAccessItem[] = [
  {
    icon: <Package className="h-5 w-5" />,
    label: "Sản phẩm TSBIO",
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  {
    icon: <Store className="h-5 w-5" />,
    label: "Nông sản đầu ra",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50"
  },
  {
    icon: <HomeIcon className="h-5 w-5" />,
    label: "Nhà vườn mẫu",
    color: "text-blue-600",
    bgColor: "bg-blue-50"
  },
  {
    icon: <Leaf className="h-5 w-5" />,
    label: "Cứu vườn – cứu đất",
    color: "text-amber-600",
    bgColor: "bg-amber-50"
  }
]

export default function TSBIOApp() {
  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <AppHeader />

      {/* Main Content */}
      <main className="px-4 py-4 space-y-5 max-w-screen-sm mx-auto">
        {/* Intro Banner */}
        <section className="rounded-xl bg-primary p-5 text-white">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold leading-tight">Nông nghiệp<br/>minh bạch</h2>
              <p className="text-xs opacity-90 max-w-[200px] leading-relaxed">
                Kết nối TSBIO với nông sản đầu ra, kiểm chứng nguồn gốc minh bạch
              </p>
            </div>
            <Sprout className="h-14 w-14 opacity-90" />
          </div>
        </section>

        {/* Quick Access Blocks */}
        <section className="space-y-2.5">
          <h2 className="text-sm font-semibold text-foreground">Truy cập nhanh</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {quickAccessItems.map((item, index) => (
              <Card key={index} className="bg-white border-border hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-3.5">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${item.bgColor}`}>
                      <div className={item.color}>{item.icon}</div>
                    </div>
                    <span className="text-xs font-medium leading-tight">{item.label}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Sản phẩm nổi bật</h2>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary/80 hover:bg-transparent px-2 bg-transparent">
              Xem tất cả
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {featuredProducts.map((product) => (
              <Card key={product.id} className="bg-white border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-colors">
                <div className="aspect-square bg-secondary/50 flex items-center justify-center relative">
                  <Sprout className="h-12 w-12 text-muted-foreground/30" />
                  {product.verified && (
                    <Badge className="absolute top-1.5 right-1.5 bg-primary text-white text-[9px] h-4 px-1.5">
                      <CheckCircle2 className="mr-0.5 h-2 w-2" />
                      Verified
                    </Badge>
                  )}
                </div>
                <CardContent className="p-2.5">
                  <h3 className="font-semibold text-xs leading-tight mb-1">{product.name}</h3>
                  <div className="flex items-start gap-1 mb-1.5">
                    <MapPin className="h-2.5 w-2.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-[10px] text-muted-foreground leading-tight">{product.location}</span>
                  </div>
                  <p className="text-xs font-bold text-primary">{product.price}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* TSBIO Verified Introduction */}
        <section className="space-y-2.5">
          <h2 className="text-sm font-semibold text-foreground">TSBIO Verified</h2>
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm mb-1 text-foreground">Chứng nhận uy tín</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    TSBIO Verified là hệ thống xác thực nguồn gốc và quy trình canh tác minh bạch, đảm bảo chất lượng từ trang trại đến người tiêu dùng.
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground">Xác thực nguồn gốc rõ ràng</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground">Quy trình canh tác minh bạch</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground">Kết nối trực tiếp nông dân</p>
                </div>
              </div>

              <Button className="w-full mt-4 h-9 bg-primary hover:bg-primary/90 text-white text-xs">
                Tìm hiểu thêm
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer Navigation */}
      <AppFooter />
    </div>
  )
}
