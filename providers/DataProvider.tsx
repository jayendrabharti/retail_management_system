"use client";
import useLocalState from "@/hooks/useLocalState";
import { LoaderCircleIcon } from "lucide-react";
import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";

type DataContextType = {
  expanded: boolean;
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [expanded, setExpanded] = useLocalState<boolean>(
    "navbar_expanded",
    false
  );
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <LoaderCircleIcon className="animate-spin size-20" />
      </div>
    );
  }

  return (
    <DataContext.Provider value={{ expanded, setExpanded }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
