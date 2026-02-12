"use client"

import { Card, CardContent } from "@/components/ui/card"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { Leaf, Droplet, Fish, Beaker } from "lucide-react"

interface TSBIOProduct {
  id: string
  name: string
  function: string
  category: string
}

const productCategories = [
  {
    id: "agricultural",
    name: "Vi sinh nông nghiệp",
    icon: Leaf,
    products: [
      {
        id: "TS-AG-001",
        name: "TSBIO Nông Nghiệp 1",
        function: "Cải thiện cấu trúc đất, tăng độ phì nhiêu",
        category: "agricultural"
      },
      {
        id: "TS-AG-002",
        name: "TSBIO Nông Nghiệp 2",
        function: "Phân hủy chất hữu cơ, cung cấp dinh dưỡng",
        category: "agricultural"
      },
      {
        id: "TS-AG-003",
        name: "TSBIO Nông Nghiệp 3",
        function: "Chống nấm bệnh, tăng sức đề kháng cây trồng",
        category: "agricultural"
      },
      {
        id: "TS-AG-004",
        name: "TSBIO Nông Nghiệp 4",
        function: "Kích thích sinh trưởng, phát triển rễ",
        category: "agricultural"
      }
    ]
  },
  {
    id: "organic",
    name: "Vi sinh hữu cơ (phân bón)",
    icon: Beaker,
    products: [
      {
        id: "TS-OR-001",
        name: "TSBIO Phân Bón Hữu Cơ 1",
        function: "Phân hủy phế phẩm nông nghiệp thành phân bón",
        category: "organic"
      },
      {
        id: "TS-OR-002",
        name: "TSBIO Phân Bón Hữu Cơ 2",
        function: "Tăng hàm lượng chất dinh dưỡng trong đất",
        category: "organic"
      },
      {
        id: "TS-OR-003",
        name: "TSBIO Compost",
        function: "Ủ phân hữu cơ nhanh, không mùi",
        category: "organic"
      }
    ]
  },
  {
    id: "livestock",
    name: "Vi sinh thức ăn cho vật nuôi",
    icon: Leaf,
    products: [
      {
        id: "TS-LS-001",
        name: "TSBIO Vật Nuôi 1",
        function: "Cải thiện tiêu hóa, tăng trọng nhanh",
        category: "livestock"
      },
      {
        id: "TS-LS-002",
        name: "TSBIO Vật Nuôi 2",
        function: "Giảm mùi hôi chuồng trại, phòng bệnh",
        category: "livestock"
      },
      {
        id: "TS-LS-003",
        name: "TSBIO Probiotics",
        function: "Bổ sung lợi khuẩn, tăng sức đề kháng",
        category: "livestock"
      }
    ]
  },
  {
    id: "water",
    name: "Xử lý nước",
    icon: Droplet,
    products: [
      {
        id: "TS-WT-001",
        name: "TSBIO Xử Lý Nước 1",
        function: "Phân hủy chất hữu cơ trong nước thải",
        category: "water"
      },
      {
        id: "TS-WT-002",
        name: "TSBIO Xử Lý Nước 2",
        function: "Khử mùi, làm trong nước ao hồ",
        category: "water"
      },
      {
        id: "TS-WT-003",
        name: "TSBIO Ao Nuôi",
        function: "Cải thiện môi trường nước nuôi trồng thủy sản",
        category: "water"
      }
    ]
  },
  {
    id: "supplement",
    name: "Sản phẩm bổ sung",
    icon: Fish,
    products: [
      {
        id: "TS-SP-001",
        name: "TSBIO Đạm Cá",
        function: "Bổ sung đạm protein từ cá, tăng năng suất",
        category: "supplement"
      },
      {
        id: "TS-SP-002",
        name: "TSBIO Vi Sinh Đa Năng",
        function: "Kết hợp nhiều chủng vi sinh có lợi",
        category: "supplement"
      },
      {
        id: "TS-SP-003",
        name: "TSBIO Enzyme",
        function: "Enzyme sinh học hỗ trợ phân hủy",
        category: "supplement"
      }
    ]
  }
]

export default function TSBIOProductsPage() {
  return (
    <div className="min-h-screen bg-white pb-20">
      <AppHeader />

      <main className="px-4 py-4 space-y-5 max-w-screen-sm mx-auto">
        {/* Page Title */}
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-foreground">Sản phẩm TSBIO</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Các sản phẩm vi sinh sinh học cho nông nghiệp bền vững
          </p>
        </div>

        {/* Product Categories */}
        {productCategories.map((category) => {
          const CategoryIcon = category.icon
          return (
            <section key={category.id} className="space-y-2.5">
              {/* Category Header */}
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                  <CategoryIcon className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">{category.name}</h2>
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {category.products.map((product) => (
                  <Card 
                    key={product.id} 
                    className="bg-white border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    {/* Product Image Placeholder */}
                    <div className="aspect-square bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center relative">
                      <Leaf className="h-12 w-12 text-primary/20" />
                    </div>

                    {/* Product Info */}
                    <CardContent className="p-2.5">
                      <h3 className="font-semibold text-xs leading-tight mb-1.5 line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                        {product.function}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )
        })}
      </main>

      <AppFooter />
    </div>
  )
}
