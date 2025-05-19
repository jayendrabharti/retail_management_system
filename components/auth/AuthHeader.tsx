import ThemeSwitch from "../ThemeSwitch";

export default function AuthHeader() {
  return (
    <header className="bg-background border-b border-border shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        {/* Logo */}
        <div className="text-foreground text-xl font-bold">Hisaab Kitaab</div>

        <ThemeSwitch />
      </div>
    </header>
  );
}
