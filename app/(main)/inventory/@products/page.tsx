import { getCategoriesAction } from "@/actions/categories";
import { getProductsAction } from "@/actions/products";
import NewProducts from "@/components/inventory/products/NewProducts";
import ProductsViews from "@/components/inventory/products/ProductsViews";

export default async function ProductsTab() {
  const { data: products } = await getProductsAction();
  const { data: categories } = await getCategoriesAction();
  return (
    <div className="flex w-full flex-col gap-2">
      <NewProducts categories={categories || []} />
      <ProductsViews products={products || []} categories={categories || []} />
    </div>
  );
}
