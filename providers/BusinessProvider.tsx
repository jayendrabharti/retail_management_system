"use client";
import {
  createBusinessAction,
  deleteBusinessAction,
  getBusinessesAction,
  getCurrentBusinessId,
  setCurrentBusinessId,
  updateBusinessAction,
} from "@/actions/businesses";
import { Business } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";
import Loading from "@/app/loading";
import { set } from "react-hook-form";

type BusinessContextType = {
  businessId: string | null;
  switchBusinessId: (args: { id: string }) => Promise<void>;
  businesses: Business[];
  deleteBusiness: (args: { id: string }) => Promise<void>;
  updateBusiness: (args: { id: string; name: string }) => Promise<void>;
};

const BusinessContext = createContext<BusinessContextType>({
  businessId: null,
  switchBusinessId: async () => {},
  businesses: [],
  deleteBusiness: async () => {},
  updateBusiness: async () => {},
});

export function BusinessProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [loading, setLoading] = useState<boolean>(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const router = useRouter();

  useEffect(() => {
    const getBusinesses = async () => {
      try {
        // Add timeout protection for the entire operation
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Business initialization timeout")),
            20000,
          ),
        );

        const operationPromise = async () => {
          // get businessId saved in cookies
          const currentBusinessId = await getCurrentBusinessId();

          // get all businesses for current user
          const { data: businesses, errorMessage: businessesError } =
            await getBusinessesAction();

          if (businessesError) {
            console.error("Error fetching businesses:", businessesError);
            toast.error(`Failed to load businesses: ${businessesError}`);
            setLoading(false);
            return;
          }

          if (!businesses) {
            console.error("No businesses data received");
            toast.error("Failed to load business data");
            setLoading(false);
            return;
          }

          setBusinesses(businesses);

          if (businesses.length === 0) {
            const { data: newBusiness, errorMessage } =
              await createBusinessAction({
                name: "My Business",
              });

            if (errorMessage) {
              console.error("Error creating business:", errorMessage);
              toast.error(`Failed to create business: ${errorMessage}`);
              setLoading(false);
              return;
            }

            if (!newBusiness) {
              console.error("No business data returned from create action");
              toast.error("Failed to create business");
              setLoading(false);
              return;
            }

            setBusinesses([newBusiness]);
            setBusinessId(newBusiness.id);

            try {
              await setCurrentBusinessId({ id: newBusiness.id });
            } catch (error) {
              console.error("Error setting current business ID:", error);
              // Continue anyway - the business was created successfully
            }
          } else {
            if (currentBusinessId) {
              const validBusinessId = businesses.some(
                (b) => b.id === currentBusinessId,
              );
              if (validBusinessId) {
                setBusinessId(currentBusinessId);
              } else {
                // Current business ID is invalid, switch to first available
                setBusinessId(businesses[0]?.id);
                try {
                  await setCurrentBusinessId({ id: businesses[0]?.id });
                } catch (error) {
                  console.error("Error setting current business ID:", error);
                }
              }
            } else {
              setBusinessId(businesses[0]?.id);
              try {
                await setCurrentBusinessId({ id: businesses[0]?.id });
              } catch (error) {
                console.error("Error setting current business ID:", error);
              }
            }
          }

          // stop loading and render business pages
          setLoading(false);
        };

        await Promise.race([operationPromise(), timeoutPromise]);
      } catch (error) {
        console.error("Error in BusinessProvider initialization:", error);

        const errorMessage =
          error instanceof Error
            ? error.message.includes("timeout")
              ? "Business initialization timed out. Please refresh the page."
              : error.message
            : "Failed to initialize business data";

        toast.error(errorMessage);
        setLoading(false);
      }
    };

    getBusinesses();
  }, []);

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
      }),
    );
  };

  if (loading) return <Loading />;

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
      "useCurrentBusiness must be used within a BusinessProvider",
    );
  }
  return context;
}
