import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckIcon } from "lucide-react";

export default function PricingPage() {
  const pricingTiers = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      description: "Perfect for individuals getting started.",
      features: [
        "Up to 5 projects",
        "Basic analytics",
        "Community support",
        "1GB storage",
      ],
      buttonText: "Sign up for Free",
      highlight: false,
    },
    {
      name: "Pro",
      price: "$29",
      period: "/month",
      description: "Ideal for growing teams and small businesses.",
      features: [
        "Unlimited projects",
        "Advanced analytics",
        "Priority email support",
        "100GB storage",
        "Custom domains",
      ],
      buttonText: "Start 14-day Free Trial",
      highlight: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "Tailored solutions for large organizations.",
      features: [
        "All Pro features",
        "Dedicated account manager",
        "SLA & Uptime guarantee",
        "On-premise deployment",
        "24/7 phone support",
      ],
      buttonText: "Contact Sales",
      highlight: false,
    },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6 text-center">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                Simple, Transparent Pricing
              </h2>
              <p className="max-w-[700px] mx-auto text-muted-foreground md:text-xl/relaxed">
                Choose the plan that's right for you. No hidden fees, no
                surprises.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 mt-12 md:grid-cols-3 lg:gap-8">
              {pricingTiers.map((tier) => (
                <Card
                  key={tier.name}
                  className={tier.highlight ? "border-primary shadow-lg" : ""}
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl font-bold">
                      {tier.name}
                    </CardTitle>
                    <CardDescription>{tier.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="flex items-baseline justify-center">
                      <span className="text-5xl font-bold">{tier.price}</span>
                      {tier.period && (
                        <span className="text-muted-foreground text-xl">
                          {tier.period}
                        </span>
                      )}
                    </div>
                    <ul className="grid gap-2 text-left text-muted-foreground">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <CheckIcon className="w-4 h-4 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      variant={tier.highlight ? "default" : "outline"}
                      asChild
                    >
                      <Link href="#">{tier.buttonText}</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
