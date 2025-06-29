import Image from "next/image";
import Reveal from "../animations/Reveal";
import { useTheme } from "next-themes";

export default function DashboardShowcase() {
  const { theme } = useTheme();

  return (
    <Reveal className="p-5 md:p-10 lg:p-20 overflow-hidden">
      <Image
        src={
          theme === "dark"
            ? "/images/dashboard-showcase-dark.png"
            : "/images/dashboard-showcase-light.png"
        }
        alt="Tilted"
        width={600}
        height={600}
        className="w-full h-full rounded-lg border-4 border-muted"
      />
    </Reveal>
  );
}
