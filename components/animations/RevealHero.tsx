"use client";
import { motion, useAnimation, useInView } from "framer-motion";
import { useEffect, useRef } from "react";

import { ReactNode } from "react";

export default function RevealHero({
  children,
  width = "fit-content",
  className = "",
  bgColor = "bg-primary",
}: {
  children: ReactNode;
  width?: string;
  className?: string;
  bgColor?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref);
  const slideControls = useAnimation();
  const contentControls = useAnimation();

  useEffect(() => {
    if (isInView) {
      slideControls.start("visible");
      contentControls.start("visible");
    } else {
      slideControls.set("hidden");
      contentControls.set("hidden");
    }
  }, [isInView, slideControls, contentControls]);

  return (
    <div
      ref={ref}
      style={{ width }}
      className={`${className} relative overflow-hidden`}
    >
      <motion.div
        className={`slide absolute top-0 left-0 bottom-0 right-0 z-20 ${bgColor}`}
        variants={{
          hidden: { left: 0 },
          visible: { left: "100%" },
        }}
        initial="hidden"
        animate={slideControls}
        transition={{ duration: 0.6, delay: 0, ease: "easeIn" }}
      />
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 100 },
          visible: { opacity: 1, y: 0 },
        }}
        initial="hidden"
        animate={contentControls}
        transition={{ duration: 0.6, delay: 0 }}
        className="relative z-10 py-2"
      >
        {children}
      </motion.div>
    </div>
  );
}
