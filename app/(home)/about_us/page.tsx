import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function AboutUsPage() {
  return (
    <div className="flex flex-col min-h-[100dvh]">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  About Our Company
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed">
                  We are a passionate team dedicated to building innovative
                  software solutions that empower businesses to thrive in the
                  digital age. Our mission is to simplify complex tasks and
                  provide tools that make a real difference.
                </p>
                <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed">
                  Founded in 2020, we started with a vision to create a platform
                  that is not only powerful but also incredibly user-friendly.
                  We believe in continuous improvement and are always listening
                  to our users to evolve our product.
                </p>
                <Button asChild>
                  <Link href="/pricing">Join Our Journey</Link>
                </Button>
              </div>
              <Image
                src="/placeholder.svg?height=400&width=600"
                width={600}
                height={400}
                alt="About Us Image"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
