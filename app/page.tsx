"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Fast path: avoid network/auth calls on first load (makes the site feel much snappier).
    // We use the same localStorage keys the rest of the app uses.
    const hasSession =
      !!localStorage.getItem("mediscan_user") ||
      !!localStorage.getItem("mediscan_user_data");

    router.replace(hasSession ? "/dashboard" : "/auth/login");
  }, [router]);

  return <div>Loading...</div>;
}