"use client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { MdOutlineBusiness } from "react-icons/md";
import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import Link from "next/link";

export default function BreadCrumb() {
  const pathname = usePathname();
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <Link href={"/businesses"}>
            <Button variant={"ghost"} size={"icon"}>
              <MdOutlineBusiness />
            </Button>
          </Link>
        </BreadcrumbItem>
        {pathname
          .split("/")
          .filter(Boolean)
          .map((segment, idx, arr) => {
            const href = "/" + arr.slice(0, idx + 1).join("/");
            const isLast = idx === arr.length - 1;
            return (
              <Fragment key={href}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>
                      {segment
                        .replace(/_/g, " ")
                        .replace(/^./, (c) => c.toUpperCase())}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={href}>
                      {segment
                        .replace(/_/g, " ")
                        .replace(/^./, (c) => c.toUpperCase())}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
