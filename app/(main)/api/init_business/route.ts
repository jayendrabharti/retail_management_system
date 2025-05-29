import {
  createBusinessAction,
  getBusinessesAction,
  getCurrentBusinessId,
  setCurrentBusinessId,
} from "@/actions/businesses";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const path = searchParams.get("path");

  const businessId = await getCurrentBusinessId();
  let currentBusinessId = businessId;

  if (!currentBusinessId) {
    const { data: businesses } = await getBusinessesAction();

    if (businesses && businesses?.length > 0) {
      currentBusinessId = businesses[0].id;
    } else {
      const { data: newBusiness } = await createBusinessAction({
        name: "My Business",
      });
      if (newBusiness) currentBusinessId = newBusiness?.id;
    }
    if (currentBusinessId)
      await setCurrentBusinessId({ id: currentBusinessId });
  }
  return NextResponse.redirect(`${origin}${path}`);
}
