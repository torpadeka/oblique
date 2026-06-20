"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle color theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="cursor-pointer"
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
