import RevealHero from "@/components/animations/RevealHero";
import { Separator } from "@/components/ui/separator";
import { Fragment } from "react";
import { MdInventory } from "react-icons/md";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function InventoryPage({
  products,
  categories,
}: {
  products: React.ReactNode;
  categories: React.ReactNode;
}) {
  return (
    <Fragment>
      <RevealHero>
        <span className="flex items-center gap-2 text-2xl font-bold">
          <MdInventory />
          Inventory
        </span>
      </RevealHero>
      <Separator />
      <Tabs defaultValue="products" className="mt-2 w-full">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="products">{products}</TabsContent>
        <TabsContent value="categories">{categories}</TabsContent>
      </Tabs>
    </Fragment>
  );
}
