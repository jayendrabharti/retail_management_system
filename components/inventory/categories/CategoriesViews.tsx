"use client";

import { CategoryWithProducts } from "@/actions/categories";
import { useState } from "react";
import DeleteCategory from "@/components/inventory/categories/DeleteCategory";
import EditCategory from "@/components/inventory/categories/EditCategory";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTimestamp } from "@/utils/utils";
import { Button } from "../../ui/button";
import { LayoutGridIcon, ListIcon } from "lucide-react";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from "../../ui/card";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import { Separator } from "../../ui/separator";
import useLocalState from "@/hooks/useLocalState";

export const columns: ColumnDef<CategoryWithProducts>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Category
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <span className="text-lg">{row.getValue("name")}</span>,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => row.getValue("description") || "No description provided",
  },
  {
    accessorKey: "_count.products",
    header: "Products",
    cell: ({ row }) => row.original._count.products,
  },
  {
    accessorKey: "createdAt",
    header: "Created on",
    cell: ({ row }) => formatTimestamp(row.original.createdAt),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated on",
    cell: ({ row }) => formatTimestamp(row.original.updatedAt),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <EditCategory category={row.original} />
        <DeleteCategory categoryId={row.original.id} />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
];

export default function CategoryViews({
  categories,
}: {
  categories: CategoryWithProducts[];
}) {
  const [view, setView] = useLocalState<"table" | "grid">(
    "categories-list-view",
    "table",
  );
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: categories,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  const toggleView = () => {
    setView((prev) => (prev === "table" ? "grid" : "table"));
  };

  if (categories.length === 0) {
    return (
      <div className="text-muted-foreground text-center">
        No categories found. Please create a new category.
      </div>
    );
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={toggleView}
            variant={"outline"}
            className="mx-auto w-max"
          >
            <ListIcon
              className={cn(
                view === "table"
                  ? "text-primary scale-110"
                  : "text-muted-foreground scale-90",
                "transition-all duration-100",
              )}
            />
            <LayoutGridIcon
              className={cn(
                view === "grid"
                  ? "text-primary scale-110"
                  : "text-muted-foreground scale-90",
                "transition-all duration-100",
              )}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Switch to {view === "table" ? "grid" : "table"} view</p>
        </TooltipContent>
      </Tooltip>
      {view === "table" ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:text-primary text-muted-foreground"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardContent>
                <CardTitle className="text-xl font-bold">
                  {category.name}
                </CardTitle>
                <CardDescription className="mt-1">
                  {category.description || "No description provided"}
                </CardDescription>
                <Separator className="mt-2" />
                <p className="mt-2 text-sm">
                  Products: {category._count.products}
                </p>
                <p className="text-muted-foreground text-xs">
                  Created at {formatTimestamp(category.createdAt)}
                </p>
                <p className="text-muted-foreground text-xs">
                  Updated at {formatTimestamp(category.updatedAt)}
                </p>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <EditCategory category={category} />
                <DeleteCategory categoryId={category.id} />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
