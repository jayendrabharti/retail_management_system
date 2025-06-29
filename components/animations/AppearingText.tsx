"use client";
import { motion, useAnimation, useInView } from "framer-motion";
import { useEffect, useRef } from "react";

export default function AppearingText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref);
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    } else {
      controls.set("hidden");
    }
  }, [isInView, controls]);

  return (
    <span ref={ref} className={className}>
      {text.split(" ").map((word, index) => (
        <motion.span
          key={index}
          variants={{
            hidden: { opacity: 0, filter: "blur(4px)", y: 10 },
            visible: { opacity: 1, filter: "blur(0px)", y: 0 },
          }}
          animate={controls}
          transition={{
            duration: 0.3,
            delay: index * 0.1,
            ease: "easeInOut",
          }}
          className="mr-2 inline-block"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}
