import { GoSidebarExpand } from "react-icons/go";
import { GoSidebarCollapse } from "react-icons/go";
import { Button } from "./ui/button";
import { useData } from "@/providers/DataProvider";

export default function NavExpandToggle({ className }: { className?: string }) {
  const { expanded, setExpanded } = useData();

  return (
    <Button
      variant={"ghost"}
      size={"icon"}
      onClick={() => setExpanded((prev) => !prev)}
      className={className}
    >
      {expanded ? <GoSidebarExpand /> : <GoSidebarCollapse />}
    </Button>
  );
}
