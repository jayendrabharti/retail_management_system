"use client";
import { BsFullscreen, BsFullscreenExit } from "react-icons/bs";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";

export default function FullScreenButton({
  className = "",
}: {
  className?: string;
}) {
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined")
      return;

    const handleChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleChange);
    setIsFullScreen(!!document.fullscreenElement);

    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
    };
  }, []);

  const handleFullScreen = () => {
    if (typeof window === "undefined" || typeof document === "undefined")
      return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.body.requestFullscreen();
    }
  };

  return (
    <Button variant={"ghost"} className={className} onClick={handleFullScreen}>
      {isFullScreen ? <BsFullscreenExit /> : <BsFullscreen />}
    </Button>
  );
}
