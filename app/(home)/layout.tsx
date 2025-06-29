import HomeNavbar from "@/components/home/HomeNavBar";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <HomeNavbar />
      <div className="flex flex-col gap-10 pt-10 h-full w-full z-10">
        {children}
      </div>
    </>
  );
}
