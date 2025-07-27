"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  PlusIcon,
  Loader2,
  InfoIcon,
  Trash2Icon,
  RotateCcwIcon,
} from "lucide-react";
import { use, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createProductAction } from "@/actions/products";
import { toast } from "sonner";
import NewCategory from "../categories/NewCategory";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Check, ChevronsUpDown } from "lucide-react";
import { WiStars } from "react-icons/wi";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Category } from "@prisma/client";
import ProductImage from "./ProductImage";

// Form validation schema
const createProductSchema = z.object({
  name: z
    .string()
    .min(1, "Product name is required")
    .max(100, "Name must be 100 characters or less"),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  weight: z.number().optional(),
  dimensions: z.string().optional(),
  image: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  unit: z.string().optional(),
  secondaryUnit: z.string().optional(),
  unitConvertion: z.number().optional(),
  minStockLevel: z.number().optional(),
  maxStockLevel: z.number().optional(),
  reorderLevel: z.number().optional(),
  costPrice: z.number().min(0, "Cost price must be 0 or greater"),
  sellingPrice: z.number().min(0, "Selling price must be 0 or greater"),
  mrp: z.number().optional(),
  taxRate: z
    .number()
    .min(0, "Tax rate must be 0 or greater")
    .max(100, "Tax rate cannot exceed 100%"),
  discountRate: z
    .number()
    .min(0, "Discount rate must be 0 or greater")
    .max(100, "Discount rate cannot exceed 100%"),
  isService: z.boolean().optional(),
  quantity: z.number().min(0, "Quantity must be 0 or greater"),
  reservedQty: z.number().min(0, "Reserved quantity must be 0 or greater"),
  availableQty: z.number().min(0, "Available quantity must be 0 or greater"),
});

type CreateProductFormData = z.infer<typeof createProductSchema>;

export default function NewProducts({
  categories,
}: {
  categories: Category[];
}) {
  const [open, setOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [categoryPopupOpen, setCategoryPopupOpen] = useState<boolean>(false);
  const [categoryOptions, setCategoryOptions] =
    useState<Category[]>(categories);
  const [categoryInputValue, setCategoryInputValue] = useState<string>("");
  const categoryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => {
      if (categoryPopupOpen) {
        categoryInputRef.current?.focus();
      }
    }, 100);
  }, [categoryPopupOpen]);

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open]);

  const form = useForm<CreateProductFormData>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: "",
      description: "",
      sku: "",
      barcode: "",
      categoryId: "",
      brand: "",
      model: "",
      color: "",
      size: "",
      weight: undefined,
      dimensions: "",
      image: "",
      attachments: [],
      unit: "pcs",
      secondaryUnit: "",
      unitConvertion: undefined,
      minStockLevel: undefined,
      maxStockLevel: undefined,
      reorderLevel: undefined,
      costPrice: 0,
      sellingPrice: 0,
      mrp: undefined,
      taxRate: 0,
      discountRate: 0,
      isService: false,
      quantity: 0,
      reservedQty: 0,
      availableQty: 0,
    },
  });

  // Watch quantity and reserved quantity to calculate available quantity
  const quantity = form.watch("quantity");
  const reservedQty = form.watch("reservedQty");

  useEffect(() => {
    const availableQty = Math.max(0, quantity - reservedQty);
    form.setValue("availableQty", availableQty);
  }, [quantity, reservedQty, form]);

  const onSubmit = async (data: CreateProductFormData) => {
    try {
      setIsSubmitting(true);
      const result = await createProductAction(data);
      if (result.errorMessage) {
        throw new Error(result.errorMessage);
      }
      if (result.data) {
        toast.success(`Product "${result.data.name}" created successfully!`);
        form.reset();
        setOpen(false);
      }
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create product",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setOpen(false);
    setCategoryPopupOpen(false);
  };

  const generateSKU = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const sku = `SKU-${timestamp}-${random}`;
    form.setValue("sku", sku);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="ml-auto w-max">
          <PlusIcon className="mr-2 h-4 w-4" />
          Add New Product
        </Button>
      </SheetTrigger>
      <SheetContent className="grid w-full max-w-2xl grid-rows-[auto_1fr_auto]">
        <SheetHeader>
          <SheetTitle>Add New Product</SheetTitle>
          <SheetDescription>
            Use this form to create a new product in your inventory. Fill in the
            details and save to add it to your catalog.
          </SheetDescription>
        </SheetHeader>
        <div className="h-full overflow-y-auto">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 p-4"
            >
              {/* is service? */}
              <FormField
                control={form.control}
                name="isService"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-end space-y-0 space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>

                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-1">
                        Is Service
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger type="button">
                              <InfoIcon className="h-3 w-3" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                This product is a service and not a physical
                                item.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <Separator />

              <h3 className="text-lg font-medium">Product Image (optional)</h3>
              <ProductImage
                setImageUrl={(url) => form.setValue("image", url)}
                isNew={true}
              />

              <Separator />

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter product name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter product description"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!form.watch("isService") && (
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>SKU (optional)</FormLabel>
                        <div className="flex flex-row items-end gap-2">
                          <FormControl>
                            <Input
                              placeholder="Auto-generated if empty"
                              {...field}
                            />
                          </FormControl>
                          <Button type="button" onClick={generateSKU}>
                            <WiStars className="scale-200" />
                            Auto-Generate
                          </Button>
                        </div>
                        <FormDescription>
                          Leave empty to auto-generate
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {!form.watch("isService") && (
                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter barcode" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Category (optional)</FormLabel>
                      <div className="flex flex-row gap-2">
                        <Popover
                          modal
                          open={categoryPopupOpen}
                          onOpenChange={setCategoryPopupOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                aria-expanded={categoryPopupOpen}
                                className="flex-1 justify-between bg-transparent"
                              >
                                {field.value
                                  ? categoryOptions.find(
                                      (category) => category.id === field.value,
                                    )?.name || "Select category..."
                                  : "Select category..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="z-[999] w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                              <CommandInput
                                ref={categoryInputRef}
                                placeholder="Search category..."
                                className="h-9"
                                value={categoryInputValue}
                                onValueChange={(value) =>
                                  setCategoryInputValue(value)
                                }
                              />
                              <CommandList>
                                <CommandEmpty>No category found.</CommandEmpty>
                                <CommandGroup className="max-h-60 overflow-y-auto">
                                  {(() => {
                                    const currentCategory =
                                      categoryOptions.find(
                                        (category) =>
                                          category.id === field.value,
                                      );
                                    if (currentCategory)
                                      return (
                                        <CommandItem
                                          value={currentCategory.name}
                                          key={currentCategory.id}
                                          onSelect={() => {
                                            form.setValue(
                                              "categoryId",
                                              currentCategory.id,
                                            );
                                            setCategoryPopupOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              currentCategory.id === field.value
                                                ? "opacity-100"
                                                : "opacity-0",
                                            )}
                                          />
                                          {currentCategory.name}
                                        </CommandItem>
                                      );
                                    return null;
                                  })()}
                                  {categoryOptions.map((category) => {
                                    if (category.id === field.value) return;

                                    return (
                                      <CommandItem
                                        value={category.name}
                                        key={category.id}
                                        onSelect={() => {
                                          form.setValue(
                                            "categoryId",
                                            category.id,
                                          );
                                          setCategoryPopupOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            category.id === field.value
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                        {category.name}
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                                <Separator />
                                <CommandGroup className="sticky bottom-0">
                                  <CommandItem>
                                    <NewCategory
                                      className="w-full"
                                      onCategoryCreated={(category) => {
                                        setCategoryOptions((prev) => [
                                          ...prev,
                                          category,
                                        ]);
                                        setCategoryPopupOpen(false);
                                        form.setValue(
                                          "categoryId",
                                          category.id,
                                        );
                                      }}
                                    />
                                  </CommandItem>
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <Button
                          variant={"destructive"}
                          type="button"
                          onClick={() => form.resetField("categoryId")}
                          disabled={!field.value}
                        >
                          <Trash2Icon />
                          Clear
                        </Button>
                      </div>
                      <FormDescription>
                        Select the category for this item.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {!form.watch("isService") && (
                <>
                  <Separator />
                  {/* Product Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">
                      Product Details (optional)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="brand"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Brand</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter brand" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="model"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Model</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter model" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Color</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter color" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="size"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Size</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter size" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weight</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Enter weight"
                                value={field.value || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(
                                    value === ""
                                      ? undefined
                                      : Number.parseFloat(value),
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="dimensions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dimensions</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 10x5x3 cm" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              <Separator />

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Pricing</h3>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="costPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Price *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(
                                value === "" ? 0 : Number.parseFloat(value),
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sellingPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selling Price *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(
                                value === "" ? 0 : Number.parseFloat(value),
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mrp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>MRP</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(
                                value === ""
                                  ? undefined
                                  : Number.parseFloat(value),
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="taxRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(
                                value === "" ? 0 : Number.parseFloat(value),
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discountRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(
                                value === "" ? 0 : Number.parseFloat(value),
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {!form.watch("isService") && (
                <>
                  <Separator />
                  {/* Units */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Units</h3>
                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Unit</FormLabel>
                          <FormControl>
                            <Input placeholder="pcs" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="secondaryUnit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Secondary Unit</FormLabel>
                            <FormControl>
                              <Input placeholder="box, kg, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="unitConvertion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Conversion</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="1.00"
                                value={field.value || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(
                                    value === ""
                                      ? undefined
                                      : Number.parseFloat(value),
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </>
              )}

              {!form.watch("isService") && (
                <>
                  <Separator />
                  {/* Stock Management */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Stock Management</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="minStockLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Stock Level</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                value={field.value || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(
                                    value === ""
                                      ? undefined
                                      : Number.parseInt(value),
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="maxStockLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Stock Level</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                value={field.value || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(
                                    value === ""
                                      ? undefined
                                      : Number.parseInt(value),
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="reorderLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reorder Level</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                value={field.value || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(
                                    value === ""
                                      ? undefined
                                      : Number.parseInt(value),
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Initial Quantity</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                value={field.value || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(
                                    value === "" ? 0 : Number.parseInt(value),
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="reservedQty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reserved Quantity</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                value={field.value || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(
                                    value === "" ? 0 : Number.parseInt(value),
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="availableQty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Available Quantity</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                disabled
                                value={form.watch("availableQty") || 0}
                                onChange={() => {}} // Disabled field, no onChange needed
                              />
                            </FormControl>
                            <FormDescription>
                              Automatically calculated: Initial - Reserved
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </>
              )}
            </form>
          </Form>
        </div>
        <SheetFooter className="flex flex-col gap-2">
          <Button variant={"outline"}>
            <RotateCcwIcon />
            Reset Form
          </Button>
          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant={"destructive"}
              className="flex-1 bg-transparent"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Create Product
                </>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
