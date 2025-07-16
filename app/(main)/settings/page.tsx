"use client";

import { useCurrentBusiness } from "@/providers/BusinessProvider";
import { createSupabaseClient } from "@/supabase/client";
import { getErrorMessage } from "@/utils/utils";
import { useEffect, useState } from "react";
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
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import RevealHero from "@/components/animations/RevealHero";
import { LoaderCircleIcon, SaveIcon } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  email: z.string().email("Invalid email").nullable().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().url("Invalid URL").nullable().or(z.literal("")),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  logoImage: z.string().url("Invalid URL").nullable().or(z.literal("")),
});

export type FormValues = z.infer<typeof formSchema>;

export default function SettingsPage() {
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createSupabaseClient();
  const { businessId } = useCurrentBusiness();

  useEffect(() => {
    const fetchBusinesses = async () => {
      const { data: business, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .single();

      if (error) {
        setError(getErrorMessage(error));
      } else {
        setBusiness(business);
      }
      setLoading(false);
    };

    fetchBusinesses();
  }, [businessId, supabase]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: business?.name || "",
      description: business?.description || "",
      email: business?.email || "",
      phone: business?.phone || "",
      website: business?.website || "",
      gstNumber: business?.gstNumber || "",
      panNumber: business?.panNumber || "",
      logoImage: business?.logoImage || "",
    },
    values: business
      ? {
          name: business.name || "",
          description: business.description || "",
          email: business.email || "",
          phone: business.phone || "",
          website: business.website || "",
          gstNumber: business.gstNumber || "",
          panNumber: business.panNumber || "",
          logoImage: business.logoImage || "",
        }
      : undefined,
  });

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        name: values.name,
        description: values.description,
        email: values.email || null,
        phone: values.phone,
        website: values.website || null,
        gstNumber: values.gstNumber,
        panNumber: values.panNumber,
        logoImage: values.logoImage || null,
      })
      .eq("id", businessId);

    if (updateError) {
      toast.error("Failed to update business settings", {
        description: getErrorMessage(updateError),
      });
    } else {
      setBusiness({ ...business, ...values });
      toast.success("Updated successfully!!");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
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
    <div className="flex flex-col items-center">
      <RevealHero className="text-3xl font-bold">Business Settings</RevealHero>
      <Card className="w-full max-w-xl">
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex w-full flex-col space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Enter your name"
                      />
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        value={field.value ?? ""}
                        placeholder="Enter a description"
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Enter your email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Enter your phone number"
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
                        placeholder="Enter your website URL"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                        placeholder="Enter your GST Number"
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
                        placeholder="Enter your PAN Number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="logoImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo Image URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Enter your Logo Image URL"
                      />
                    </FormControl>
                    <FormDescription>
                      Paste a direct image URL here.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={saving} className="ml-auto">
                {saving ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <SaveIcon />
                )}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
