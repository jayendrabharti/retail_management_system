import { getBusinessesAction } from "@/actions/businesses";
import AddNewBusiness from "@/components/AddNewBusiness";
import BusinessCard from "@/components/BusinessCard";

export default async function BusinessesPage() {
  const { data: Businesses } = await getBusinessesAction();

  return (
    <div className="flex flex-col">
      <AddNewBusiness className="w-max ml-auto" />
      {!Businesses || Businesses.length == 0 ? (
        <div className="w-full flex">
          <span className="mx-auto text-2xl text-muted-foreground mt-5">
            No businesses yet
          </span>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-4">
          {Businesses.map((business) => (
            <BusinessCard key={business.id} business={business} />
          ))}
        </div>
      )}
    </div>
  );
}
