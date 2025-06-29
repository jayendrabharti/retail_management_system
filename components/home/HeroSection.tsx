"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import Reveal from "../animations/Reveal";
import { RainbowButton } from "../magicui/rainbow-button";
import AppearingText from "../animations/AppearingText";

export default function HeroSection({
  className = "",
}: {
  className?: string;
}) {
  return (
    <section
      id="home"
      className={cn(
        "h-auto md:h-full p-2 flex flex-col gap-5 items-center justify-center",
        className
      )}
    >
      <Reveal delay={0.3}>
        <RainbowButton
          className="rounded-full px-5 py-0"
          size={"sm"}
          variant={"outline"}
        >
          Get Started
          <ArrowRight className="group-hover:ml-2 transition-all duration-150" />
        </RainbowButton>
      </Reveal>

      <AppearingText
        className="relative mx-auto max-w-4xl text-center font-bold text-foreground text-4xl md:text-5xl lg:text-7xl"
        text={"Supercharge your business with SEED."}
      />

      <Reveal delay={0.5}>
        <span className="relative mx-auto max-w-xl py-4 text-center font-normal text-muted-foreground text-wrap text-sm md:text-base">
          {"The Smarter Way to Manage, Grow, and Scale Your Retail Business."}
        </span>
      </Reveal>

      <Reveal delay={0.5} className="flex flex-row gap-2">
        <Button>
          Start free trial <ArrowRight />
        </Button>
        <Button variant={"outline"}>Explore</Button>
      </Reveal>
    </section>
  );
}
