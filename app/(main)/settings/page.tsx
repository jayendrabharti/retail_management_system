"use client";

import { useCurrentBusiness } from "@/providers/BusinessProvider";
import { updateBusinessAction } from "@/actions/businesses";
import { getErrorMessage } from "@/utils/utils";
import { useEffect, useState, useRef } from "react";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import RevealHero from "@/components/animations/RevealHero";
import {
  LoaderCircleIcon,
  SaveIcon,
  UploadIcon,
  XIcon,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { uploadImage } from "@/supabase/storage";
import { convertBlobUrlToFile } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Image from "next/image";

const formSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  description: z.string().optional(),
  email: z.string().email("Invalid email").nullable().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().url("Invalid URL").nullable().or(z.literal("")),
  gstNumber: z.string().optional(),
  registrationNo: z.string().optional(),
  panNumber: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  fiscalYear: z.string().min(1, "Fiscal year is required"),
  logoImage: z.string().url("Invalid URL").nullable().or(z.literal("")),
});

export type FormValues = z.infer<typeof formSchema>;

const currencies = [
  { value: "INR", label: "Indian Rupee (₹)" },
  // { value: "USD", label: "US Dollar ($)" },
  // { value: "EUR", label: "Euro (€)" },
  // { value: "GBP", label: "British Pound (£)" },
  // { value: "JPY", label: "Japanese Yen (¥)" },
  // { value: "AUD", label: "Australian Dollar (A$)" },
  // { value: "CAD", label: "Canadian Dollar (C$)" },
];

const fiscalYears = [
  { value: "april-march", label: "April - March" },
  { value: "january-december", label: "January - December" },
  { value: "july-june", label: "July - June" },
  { value: "october-september", label: "October - September" },
];

export default function SettingsPage() {
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { businessId, businesses } = useCurrentBusiness();

  useEffect(() => {
    const currentBusiness = businesses.find((b) => b.id === businessId);
    if (currentBusiness) {
      setBusiness(currentBusiness);
      setLogoPreview(currentBusiness.logoImage || "");
      setLoading(false);
    }
  }, [businessId, businesses]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      email: "",
      phone: "",
      website: "",
      gstNumber: "",
      registrationNo: "",
      panNumber: "",
      currency: "INR",
      fiscalYear: "april-march",
      logoImage: "",
    },
    values: business
      ? {
          name: business.name || "",
          description: business.description || "",
          email: business.email || "",
          phone: business.phone || "",
          website: business.website || "",
          gstNumber: business.gstNumber || "",
          registrationNo: business.registrationNo || "",
          panNumber: business.panNumber || "",
          currency: business.currency || "INR",
          fiscalYear: business.fiscalYear || "april-march",
          logoImage: business.logoImage || "",
        }
      : undefined,
  });

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const { imageUrl, error } = await uploadImage({
        file,
        bucket: "images",
        folder: "business-logos",
      });

      if (error) {
        console.error("Image upload error:", error);
        toast.error("Failed to upload logo");
        return;
      }

      setLogoPreview(imageUrl);
      form.setValue("logoImage", imageUrl);
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Logo upload error:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = () => {
    setLogoPreview("");
    form.setValue("logoImage", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!businessId) {
      toast.error("No business selected");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Convert null values to undefined for the API
      const updateData = {
        id: businessId,
        name: values.name,
        description: values.description,
        email: values.email || undefined,
        phone: values.phone,
        website: values.website || undefined,
        gstNumber: values.gstNumber,
        registrationNo: values.registrationNo,
        panNumber: values.panNumber,
        currency: values.currency,
        fiscalYear: values.fiscalYear,
        logoImage: values.logoImage || undefined,
      };

      const { errorMessage } = await updateBusinessAction(updateData);

      if (errorMessage) {
        toast.error("Failed to update business settings", {
          description: errorMessage,
        });
      } else {
        setBusiness({ ...business, ...values });
        toast.success("Business settings updated successfully!");
      }
    } catch (error) {
      toast.error("Failed to update business settings", {
        description: getErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircleIcon className="size-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center p-6">
      <RevealHero className="mb-8 text-3xl font-bold">
        Business Settings
      </RevealHero>

      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Logo Upload Section */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Business Logo</CardTitle>
            <CardDescription>
              Upload and manage your business logo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {logoPreview ? (
              <div className="relative">
                <div className="relative mx-auto aspect-square w-full max-w-[200px] overflow-hidden rounded-lg border">
                  <Image
                    src={logoPreview}
                    alt="Business Logo"
                    fill
                    className="object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={removeLogo}
                  disabled={uploadingLogo}
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
            ) : (
              <div
                className={cn(
                  "outline-border hover:bg-muted/50 relative flex h-48 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl outline-4 transition-colors outline-dashed",
                  uploadingLogo && "pointer-events-none opacity-50",
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                {uploadingLogo ? (
                  <LoaderCircleIcon className="text-muted-foreground size-16 animate-spin" />
                ) : (
                  <ImageIcon className="text-muted-foreground size-16" />
                )}
                <span className="text-muted-foreground mt-2 text-sm font-medium">
                  {uploadingLogo ? "Uploading..." : "Click to upload logo"}
                </span>
                <span className="text-muted-foreground mt-1 text-xs">
                  Max size: 5MB
                </span>
              </div>
            )}

            {!logoPreview && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                <UploadIcon className="mr-2 size-4" />
                {uploadingLogo ? "Uploading..." : "Upload Logo"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Business Information Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>
              Update your business details and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder="Enter business name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            {...field}
                            value={field.value ?? ""}
                            placeholder="business@example.com"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={3}
                          value={field.value ?? ""}
                          placeholder="Describe your business..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder="+1 (555) 123-4567"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder="https://www.example.com"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="gstNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GST Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder="22AAAAA0000A1Z5"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="registrationNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder="Registration number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="panNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PAN Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder="AAAAA1234A"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {currencies.map((currency) => (
                              <SelectItem
                                key={currency.value}
                                value={currency.value}
                              >
                                {currency.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fiscalYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fiscal Year *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select fiscal year" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {fiscalYears.map((year) => (
                              <SelectItem key={year.value} value={year.value}>
                                {year.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving || uploadingLogo}>
                    {saving ? (
                      <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
                    ) : (
                      <SaveIcon className="mr-2 size-4" />
                    )}
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
