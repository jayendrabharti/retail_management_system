"use client";
import HomeNavbar from "@/components/home/HomeNavBar";
import Main from "@/components/Main";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Main className="w-full h-dvh min-h-dvh grid grid-rows-[auto_1fr] bg-background text-foreground">
      <HomeNavbar />
      <div
        id="landing-div"
        className="flex flex-col pt-10 h-full w-full z-10 overflow-y-auto"
      >
        {children}
      </div>
    </Main>
  );
}
