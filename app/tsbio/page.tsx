import { redirect } from "next/navigation"

// TSBIO: center tab. Reuse existing exchange feed for now.
export default function TsbioPage() {
  redirect("/exchange")
}
