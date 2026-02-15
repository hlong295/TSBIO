import { redirect } from "next/navigation"

// TSBIO: "Nông sản" uses the same stable exchange feed for now.
export default function MarketPage() {
  redirect("/exchange")
}
