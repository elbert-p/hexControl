//page.js (in src/app)
"use client";
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/puzzle-select");
}
