import AuthHeader from "@/components/auth/AuthHeader";
import Main from "@/components/Main";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Main className="w-full h-dvh min-h-dvh grid grid-rows-[auto_1fr] bg-background text-foreground">
      <AuthHeader />
      <main className="flex flex-col gap-2 items-center justify-center h-full w-full">
        {children}
      </main>
    </Main>
  );
}
