"use client";
import {
  deleteBusinessAction,
  getBusinessesAction,
  setCurrentBusinessId,
  updateBusinessAction,
} from "@/actions/businesses";
import { Businesses } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSession } from "./SessionProvider";
import { toast } from "sonner";

type BusinessContextType = {
  businessId: string;
  switchBusinessId: (args: { id: string }) => Promise<void>;
  businesses: Businesses[];
  deleteBusiness: (args: { id: string }) => Promise<void>;
  updateBusiness: (args: { id: string; name: string }) => Promise<void>;
};

const BusinessContext = createContext<BusinessContextType>({
  businessId: "",
  switchBusinessId: async () => {},
  businesses: [],
  deleteBusiness: async () => {},
  updateBusiness: async () => {},
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
  const { user } = useSession();

  useEffect(() => {
    const getBusinesses = async () => {
      const data = await getBusinessesAction();
      if (!data) return;

      const businesses = data.data;
      const userBusinesses = businesses?.map((b) => {
        if (user?.id) {
          return {
            ...b,
            owner: "(You)",
          };
        } else {
          return {
            ...b,
            owner: "(unknown)",
          };
        }
      });
      setBusinesses(userBusinesses ?? []);
    };
    getBusinesses();
  }, [businessId, user]);

  const switchBusinessId = async ({ id }: { id: string }) => {
    await setCurrentBusinessId({ id: id });
    setBusinessId(id);
    router.refresh();
  };

  const deleteBusiness = async ({ id }: { id: string }) => {
    if (businesses.length == 1) {
      toast.error("You must have atleat one business.");
      return;
    }

    const { errorMessage } = await deleteBusinessAction({ id: id });
    if (errorMessage) {
      toast.error(errorMessage);
    } else {
      toast.success("Deleted Business Successfully !!");
    }

    if (id == businesses[0].id) {
      await switchBusinessId({ id: businesses[1].id });
    } else {
      await switchBusinessId({ id: businesses[0].id });
    }
    setBusinesses((prev) => prev.filter((b) => b.id != id));
  };

  const updateBusiness = async ({ id, name }: { id: string; name: string }) => {
    const { errorMessage } = await updateBusinessAction({ id: id, name: name });
    if (errorMessage) {
      toast.error(errorMessage);
    } else {
      toast.success("Updated Business Successfully !!");
    }

    setBusinesses((prev) =>
      prev.map((b) => {
        if (b.id == id) {
          return { ...b, name: name };
        }
        return b;
      })
    );
  };

  return (
    <BusinessContext.Provider
      value={{
        businessId,
        switchBusinessId,
        businesses,
        deleteBusiness,
        updateBusiness,
      }}
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
