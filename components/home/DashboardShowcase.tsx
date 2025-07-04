import Image from "next/image";
import Reveal from "../animations/Reveal";
import { useTheme } from "next-themes";

export default function DashboardShowcase() {
  const { theme } = useTheme();

  return (
    <Reveal className="p-5 h-max md:p-10 lg:p-20">
      <Image
        suppressHydrationWarning
        src={
          theme === "dark"
            ? "/images/dashboard-showcase-dark.png"
            : "/images/dashboard-showcase-light.png"
        }
        alt="Tilted"
        width={1000}
        height={1000}
        className="w-full h-max rounded-lg border-4 border-muted"
      />
    </Reveal>
  );
}
