"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import {
  Sprout,
  MapPin,
  CheckCircle2,
  Flame,
  Star,
  TrendingUp,
  Sparkles,
  Leaf,
  Flower2,
  Apple,
  Coffee,
  Fish,
  ShoppingCart
} from "lucide-react"

interface AgriculturalProduct {
  id: string
  name: string
  location: string
  price: string
  piPrice?: string
  originalPrice?: string
  discount?: number
  verified: boolean
  rating?: number
  sold?: number
  category: string
}

const flashSaleProducts: AgriculturalProduct[] = [
  {
    id: "NS001",
    name: "Dâu Tây Đà Lạt",
    location: "Đà Lạt, Lâm Đồng",
    price: "99.000đ/kg",
    piPrice: "0.5 Pi/kg",
    originalPrice: "150.000đ/kg",
    discount: 34,
    verified: true,
    rating: 4.8,
    sold: 120,
    category: "Rau củ quả"
  },
  {
    id: "NS002",
    name: "Cà Phê Arabica",
    location: "Buôn Ma Thuột",
    price: "180.000đ/kg",
    piPrice: "1.2 Pi/kg",
    originalPrice: "250.000đ/kg",
    discount: 28,
    verified: true,
    rating: 4.9,
    sold: 85,
    category: "Cây công nghiệp"
  }
]

const popularProducts: AgriculturalProduct[] = [
  {
    id: "NS003",
    name: "Rau Xà Lách Hữu Cơ",
    location: "Đà Lạt",
    price: "25.000đ/bó",
    verified: true,
    rating: 4.7,
    sold: 250,
    category: "Rau củ quả"
  },
  {
    id: "NS004",
    name: "Hoa Hồng Đà Lạt",
    location: "Đà Lạt, Lâm Đồng",
    price: "150.000đ/bó",
    verified: true,
    rating: 4.9,
    sold: 180,
    category: "Hoa – cây cảnh"
  }
]

const bestSellingProducts: AgriculturalProduct[] = [
  {
    id: "NS005",
    name: "Cà Chua Cherry",
    location: "Lâm Đồng",
    price: "35.000đ/kg",
    verified: true,
    rating: 4.6,
    sold: 320,
    category: "Rau củ quả"
  },
  {
    id: "NS006",
    name: "Cá Tươi Sạch",
    location: "Vũng Tàu",
    price: "120.000đ/kg",
    verified: true,
    rating: 4.8,
    sold: 150,
    category: "Động vật"
  }
]

const newProducts: AgriculturalProduct[] = [
  {
    id: "NS007",
    name: "Bưởi Da Xanh",
    location: "Bến Tre",
    price: "45.000đ/kg",
    verified: true,
    category: "Cây ăn quả"
  },
  {
    id: "NS008",
    name: "Trà Oolong Cao Cấp",
    location: "Thái Nguyên",
    price: "200.000đ/hộp",
    verified: true,
    category: "Cây công nghiệp"
  }
]

const categoryProducts = {
  "Rau củ quả": [
    { id: "NS009", name: "Súp Lơ Xanh", location: "Đà Lạt", price: "30.000đ/kg", verified: true },
    { id: "NS010", name: "Cà Rót Tím", location: "Lâm Đồng", price: "20.000đ/kg", verified: true },
    { id: "NS011", name: "Cải Bó Xôi", location: "Đà Lạt", price: "18.000đ/bó", verified: true },
    { id: "NS012", name: "Dưa Leo Mini", location: "Lâm Đồng", price: "25.000đ/kg", verified: true }
  ],
  "Hoa – cây cảnh": [
    { id: "NS013", name: "Hoa Cẩm Chướng", location: "Đà Lạt", price: "80.000đ/bó", verified: true },
    { id: "NS014", name: "Sen Đá", location: "Đà Lạt", price: "35.000đ/chậu", verified: true },
    { id: "NS015", name: "Lan Hồ Điệp", location: "Đà Lạt", price: "250.000đ/chậu", verified: true },
    { id: "NS016", name: "Cây Phát Tài", location: "Lâm Đồng", price: "120.000đ/chậu", verified: true }
  ],
  "Cây ăn quả": [
    { id: "NS017", name: "Cam Canh", location: "Vĩnh Long", price: "40.000đ/kg", verified: true },
    { id: "NS018", name: "Sầu Riêng", location: "Đắk Lắk", price: "120.000đ/kg", verified: true },
    { id: "NS019", name: "Xoài Cát Chu", location: "Đồng Tháp", price: "55.000đ/kg", verified: true },
    { id: "NS020", name: "Vải Thiều", location: "Bắc Giang", price: "80.000đ/kg", verified: true }
  ],
  "Cây công nghiệp": [
    { id: "NS021", name: "Cà Phê Robusta", location: "Đắk Lắk", price: "150.000đ/kg", verified: true },
    { id: "NS022", name: "Tiêu Đen", location: "Bình Phước", price: "200.000đ/kg", verified: true },
    { id: "NS023", name: "Điều Rang", location: "Bình Phước", price: "180.000đ/kg", verified: true },
    { id: "NS024", name: "Trà Xanh", location: "Thái Nguyên", price: "150.000đ/hộp", verified: true }
  ],
  "Động vật": [
    { id: "NS025", name: "Gà Ta Sạch", location: "Hà Nội", price: "150.000đ/kg", verified: true },
    { id: "NS026", name: "Heo Rừng", location: "Sơn La", price: "180.000đ/kg", verified: true },
    { id: "NS027", name: "Bò Wagyu", location: "Đà Lạt", price: "500.000đ/kg", verified: true },
    { id: "NS028", name: "Tôm Sú", location: "Cà Mau", price: "250.000đ/kg", verified: true }
  ]
}

export default function NongSanPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const CategoryIcon = ({ category }: { category: string }) => {
    switch (category) {
      case "Rau củ quả":
        return <Leaf className="h-4 w-4" />
      case "Hoa – cây cảnh":
        return <Flower2 className="h-4 w-4" />
      case "Cây ăn quả":
        return <Apple className="h-4 w-4" />
      case "Cây công nghiệp":
        return <Coffee className="h-4 w-4" />
      case "Động vật":
        return <Fish className="h-4 w-4" />
      default:
        return <Sprout className="h-4 w-4" />
    }
  }

  const ProductCard = ({ product, showDiscount = false }: { product: AgriculturalProduct, showDiscount?: boolean }) => (
    <Link href={`/nong-san/chi-tiet?id=${product.id}`}>
      <Card className="bg-white border-border overflow-hidden hover:border-primary/50 transition-colors cursor-pointer">
        <div className="aspect-square bg-secondary/50 flex items-center justify-center relative">
          <Sprout className="h-12 w-12 text-muted-foreground/30" />
          {product.verified && (
            <Badge className="absolute top-1.5 right-1.5 bg-primary text-white text-[9px] h-4 px-1.5">
              <CheckCircle2 className="mr-0.5 h-2 w-2" />
              Verified
            </Badge>
          )}
          {showDiscount && product.discount && (
            <Badge className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[9px] h-4 px-1.5">
              -{product.discount}%
            </Badge>
          )}
        </div>
        <CardContent className="p-2.5 space-y-2">
          <div className="space-y-1">
            <h3 className="font-semibold text-xs leading-tight line-clamp-1">{product.name}</h3>
            <div className="flex items-start gap-1">
              <MapPin className="h-2.5 w-2.5 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-[10px] text-muted-foreground leading-tight line-clamp-1">{product.location}</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-primary">{product.price}</p>
                {product.piPrice && (
                  <p className="text-[9px] text-accent font-medium">π {product.piPrice}</p>
                )}
                {product.originalPrice && !product.piPrice && (
                  <p className="text-[9px] text-muted-foreground line-through">{product.originalPrice}</p>
                )}
              </div>
              {product.rating && (
                <div className="flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                  <span className="text-[10px] font-medium">{product.rating}</span>
                </div>
              )}
            </div>
            {product.sold && (
              <p className="text-[9px] text-muted-foreground">Đã bán {product.sold}</p>
            )}
          </div>

          <Button className="w-full h-7 bg-primary hover:bg-primary/90 text-white text-[11px]">
            <ShoppingCart className="h-3 w-3 mr-1" />
            Mua ngay
          </Button>
        </CardContent>
      </Card>
    </Link>
  )

  return (
    <div className="min-h-screen bg-white pb-20">
      <AppHeader />

      <main className="px-4 py-4 space-y-5 max-w-screen-sm mx-auto">
        {/* Page Title */}
        <div>
          <h1 className="text-lg font-bold text-foreground">Nông sản</h1>
          <p className="text-xs text-muted-foreground">Sản phẩm nông nghiệp uy tín, chất lượng</p>
        </div>

        {/* Flash Sale Section */}
        <section className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500">
                <Flame className="h-3.5 w-3.5 text-white" />
              </div>
              <h2 className="text-sm font-bold text-foreground">Flash Sale</h2>
            </div>
            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[10px] h-5 bg-transparent">
              Kết thúc trong 2:45:30
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {flashSaleProducts.map((product) => (
              <ProductCard key={product.id} product={product} showDiscount={true} />
            ))}
          </div>
        </section>

        {/* Popular Products */}
        <section className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500">
              <Star className="h-3.5 w-3.5 text-white fill-white" />
            </div>
            <h2 className="text-sm font-bold text-foreground">Sản phẩm bình chọn</h2>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {popularProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {/* Best Selling */}
        <section className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </div>
            <h2 className="text-sm font-bold text-foreground">Bán chạy</h2>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {bestSellingProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {/* New Products */}
        <section className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <h2 className="text-sm font-bold text-foreground">Sản phẩm mới</h2>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {newProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {/* Categories Tabs */}
        <section className="space-y-2.5">
          <h2 className="text-sm font-bold text-foreground">Danh mục sản phẩm</h2>
          <Tabs defaultValue="Rau củ quả" className="w-full">
            <TabsList className="w-full h-auto bg-secondary p-1 flex-wrap justify-start">
              {Object.keys(categoryProducts).map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="text-[11px] h-7 data-[state=active]:bg-white px-2.5 flex items-center gap-1"
                >
                  <CategoryIcon category={category} />
                  <span className="hidden sm:inline">{category}</span>
                  <span className="sm:hidden">{category.split(' ')[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(categoryProducts).map(([category, products]) => (
              <TabsContent key={category} value={category} className="mt-3">
                <div className="grid grid-cols-2 gap-2.5">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product as AgriculturalProduct} />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </section>
      </main>

      <AppFooter />
    </div>
  )
}
