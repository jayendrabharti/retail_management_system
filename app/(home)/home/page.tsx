"use client";
import DashboardShowcase from "@/components/home/DashboardShowcase";
import HeroSection from "@/components/home/HeroSection";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { CheckCircleIcon, RocketIcon, UsersIcon } from "lucide-react";

export default function Home() {
  return (
    <>
      <HeroSection />
      <DashboardShowcase />
      {/* Features Section */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                Features that empower your business
              </h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Discover how our platform can transform your operations and
                drive success.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-3 lg:gap-12">
            <Card className="flex flex-col items-center text-center p-6">
              <CheckCircleIcon className="w-12 h-12 text-primary mb-4" />
              <CardTitle className="mb-2">Intuitive Interface</CardTitle>
              <CardDescription>
                Easy to use and navigate, ensuring a smooth experience for all
                users.
              </CardDescription>
            </Card>
            <Card className="flex flex-col items-center text-center p-6">
              <RocketIcon className="w-12 h-12 text-primary mb-4" />
              <CardTitle className="mb-2">Blazing Fast Performance</CardTitle>
              <CardDescription>
                Optimized for speed, so you can get more done in less time.
              </CardDescription>
            </Card>
            <Card className="flex flex-col items-center text-center p-6">
              <UsersIcon className="w-12 h-12 text-primary mb-4" />
              <CardTitle className="mb-2">Collaborative Tools</CardTitle>
              <CardDescription>
                Work together seamlessly with built-in features for team
                collaboration.
              </CardDescription>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
