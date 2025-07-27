import { getCategoriesAction } from "@/actions/categories";
import CategoryViews from "@/components/inventory/categories/CategoriesViews";
import NewCategory from "@/components/inventory/categories/NewCategory";

export default async function CategoriesTab() {
  const { data: categories } = await getCategoriesAction();

  return (
    <div className="flex w-full flex-col gap-2">
      <NewCategory />
      <CategoryViews categories={categories || []} />
    </div>
  );
}
