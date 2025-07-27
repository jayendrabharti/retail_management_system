"use client";

import { ProductWithInventory } from "@/actions/products";
import { useState } from "react";
import DeleteProduct from "@/components/inventory/products/DeleteProduct";
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
import { Badge } from "../../ui/badge";
import useLocalState from "@/hooks/useLocalState";
import { CategoryWithProducts } from "@/actions/categories";
import Image from "next/image";

// Helper function to get stock status
const getStockStatus = (product: ProductWithInventory) => {
  if (product.availableQty <= 0)
    return { status: "Out of Stock", color: "destructive" };
  if (product.minStockLevel && product.availableQty <= product.minStockLevel) {
    return { status: "Low Stock", color: "warning" };
  }
  return { status: "In Stock", color: "success" };
};

export default function ProductsViews({
  products,
  categories,
}: {
  products: ProductWithInventory[];
  categories?: CategoryWithProducts[];
}) {
  const [view, setView] = useLocalState<"table" | "grid">(
    "products-list-view",
    "table",
  );
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns: ColumnDef<ProductWithInventory>[] = [
    {
      accessorKey: "productImage",
      header: "",
      cell: ({ row }) => (
        <Image
          src={row.original.image || "/images/product-image-placeholder.png"}
          alt={row.original.name}
          width={50}
          height={50}
          className="rounded-full object-cover"
        />
      ),
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Product
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">{row.getValue("name")}</div>
          <div className="text-muted-foreground text-sm">
            {row.original.sku}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "category.name",
      header: "Category",
      cell: ({ row }) => row.original.category?.name || "No Category",
    },
    {
      accessorKey: "sellingPrice",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const price = row.original.sellingPrice;
        // Handle both number and Decimal types
        const priceValue = (price as any).toString();
        return <span className="font-medium">₹{priceValue}</span>;
      },
    },
    {
      accessorKey: "inventory",
      header: "Stock",
      cell: ({ row }) => {
        const stockInfo = getStockStatus(row.original);

        return (
          <div className="space-y-1">
            <Badge variant={stockInfo.color as any} className="text-xs">
              {stockInfo.status}
            </Badge>

            <div className="text-muted-foreground text-sm">
              Qty: {row.original.availableQty}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "isService",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant={row.original.isService ? "secondary" : "outline"}>
          {row.original.isService ? "Service" : "Product"}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => formatTimestamp(row.original.createdAt),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {/* <EditProduct product={row.original} categories={categories} /> */}
          <DeleteProduct productId={row.original.id} />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
  const table = useReactTable({
    data: products,
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

  if (products.length === 0) {
    return (
      <div className="text-muted-foreground text-center">
        No products found. Please create a new product.
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
          {products.map((product) => {
            const stockInfo = getStockStatus(product);

            return (
              <Card key={product.id}>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-bold">
                          {product.name}
                        </CardTitle>
                        <div className="text-muted-foreground text-sm">
                          SKU: {product.sku || "N/A"}
                        </div>
                      </div>
                      <Badge
                        variant={stockInfo.color as any}
                        className="text-xs"
                      >
                        {stockInfo.status}
                      </Badge>
                    </div>

                    <CardDescription className="line-clamp-2">
                      {product.description || "No description provided"}
                    </CardDescription>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Category</p>
                        <p className="font-medium">
                          {product.category?.name || "No Category"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Price</p>
                        <p className="text-lg font-medium">
                          ₹{(product.sellingPrice as any).toString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Available</p>
                        <p className="font-medium">{product.availableQty}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Reserved</p>
                        <p className="font-medium">{product.reservedQty}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={product.isService ? "secondary" : "outline"}
                      >
                        {product.isService ? "Service" : "Product"}
                      </Badge>
                      {product.brand && (
                        <Badge variant="outline">{product.brand}</Badge>
                      )}
                    </div>

                    <Separator />

                    <div className="text-muted-foreground space-y-1 text-xs">
                      <p>Created: {formatTimestamp(product.createdAt)}</p>
                      <p>Updated: {formatTimestamp(product.updatedAt)}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  {/* <EditProduct product={product} categories={categories} /> */}
                  <DeleteProduct productId={product.id} />
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
