"use client";

import { getBusinessAction } from "@/actions/businesses";
import { Businesses } from "@prisma/client";
import { LoaderCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";

export default function Page() {
  const [b, setB] = useState<Businesses | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const get = async () => {
      const { data } = await getBusinessAction();
      setB(data);
      setLoading(false);
    };
    get();
  }, []);

  if (loading)
    return (
      <div className="flex w-full h-full items-center justify-center">
        <LoaderCircleIcon className="animate-spin size-20" />
      </div>
    );

  return (
    <div className="">
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
      <p>{JSON.stringify(b)}</p>
    </div>
  );
}
