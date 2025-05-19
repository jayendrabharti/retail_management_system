"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import ScrollToTop from "./ScrollToTop";

import { ReactNode } from "react";

export default function Main({
  children,
  ...props
}: {
  children: ReactNode;
  [key: string]: unknown;
}) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [pathname]);

  return (
    <main ref={mainRef} {...props}>
      {children}
      <ScrollToTop mainRef={mainRef} />
    </main>
  );
}
