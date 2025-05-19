import AuthHeader from "@/components/auth/AuthHeader";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthHeader />
      <main className="flex flex-col gap-2 items-center justify-center h-full w-full">
        {children}
      </main>
    </>
  );
}
