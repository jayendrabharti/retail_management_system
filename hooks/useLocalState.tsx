"use client";

import { useState, useEffect } from "react";

function useLocalState<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(initialValue);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const storedValue = localStorage.getItem(key);
      if (storedValue !== null) {
        setState(JSON.parse(storedValue) as T);
      } else {
        setState(initialValue);
      }
    } catch (error) {
      console.error("Error reading localStorage key “" + key + "”: ", error);
      setState(initialValue);
    }
  }, [key, initialValue]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error("Error setting localStorage key “" + key + "”: ", error);
    }
  }, [key, state]);

  return [state, setState];
}

export default useLocalState;
