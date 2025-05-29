"use client";
import {
  getBusinessesAction,
  setCurrentBusinessId,
} from "@/actions/businesses";
import { Businesses } from "@/prisma/prismaClient";
import { useRouter } from "next/navigation";
import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useState,
} from "react";

type BusinessContextType = {
  businessId: string;
  switchBusinessId: (args: { id: string }) => Promise<void>;
  businesses: Businesses[];
};

const BusinessContext = createContext<BusinessContextType>({
  businessId: "",
  switchBusinessId: async () => {},
  businesses: [],
});

export function BusinessProvider({
  children,
  currentBusinessId,
}: Readonly<{
  children: React.ReactNode;
  currentBusinessId: string;
}>) {
  const [businessId, setBusinessId] = useState<string>(currentBusinessId);
  const [businesses, setBusinesses] = useState<Businesses[]>([]);
  const router = useRouter();

  const getBusinesses = async () => {
    const { data: businesses } = await getBusinessesAction();
    setBusinesses(businesses ?? []);
  };
  useEffect(() => {
    getBusinesses();
  }, [businessId]);

  const switchBusinessId = async ({ id }: { id: string }) => {
    await setCurrentBusinessId({ id: id });
    await getBusinesses();
    setBusinessId(id);
    router.refresh();
  };

  return (
    <BusinessContext.Provider
      value={{ businessId, switchBusinessId, businesses }}
    >
      <Fragment key={businessId}>{children}</Fragment>
    </BusinessContext.Provider>
  );
}

export function useCurrentBusiness() {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error(
      "useCurrentBusiness must be used within a BusinessProvider"
    );
  }
  return context;
}
