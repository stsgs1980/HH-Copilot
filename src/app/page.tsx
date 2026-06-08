"use client";

import dynamic from "next/dynamic";

// Use ssr: false to prevent hydration mismatch —
// auth state differs between server and client
const HomeContent = dynamic(() => import("./home-content"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-neutral-50">
      <div className="text-muted-foreground text-sm">Загрузка...</div>
    </div>
  ),
});

export default function Home() {
  return <HomeContent />;
}
