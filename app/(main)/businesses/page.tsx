import { getBusinessesAction } from "@/actions/businesses";
import AddNewBusiness from "@/components/AddNewBusiness";
import BusinessCard from "@/components/BusinessCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function BusinessesPage() {
  const { data: businesses, errorMessage } = await getBusinessesAction();

  if (errorMessage) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">
              Error Loading Businesses
            </CardTitle>
            <CardDescription>
              There was an error loading your businesses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">{errorMessage}</p>
            <div className="flex gap-2">
              <Button size="sm" asChild>
                <Link href="/businesses">Retry</Link>
              </Button>
              <AddNewBusiness className="text-sm" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <AddNewBusiness className="ml-auto w-max" />
      {!businesses || businesses.length == 0 ? (
        <div className="flex w-full">
          <span className="text-muted-foreground mx-auto mt-5 text-2xl">
            No businesses yet
          </span>
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-1 gap-6 p-4 sm:grid-cols-2 md:grid-cols-3">
          {businesses.map((business) => (
            <BusinessCard key={business.id} business={business} />
          ))}
        </div>
      )}
    </div>
  );
}
