"use client";
import useLocalState from "@/hooks/useLocalState";
import React, { createContext, useContext, useState, ReactNode } from "react";

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
