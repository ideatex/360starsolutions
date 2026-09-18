"use client";

import { useTheme } from "@/context/ThemeContext";
import React from "react";
import { Sun, Moon } from "lucide-react";

export const ThemeToggleButton: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle Theme"
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white cursor-pointer shadow-theme-xs"
    >
      <Sun className="hidden dark:block w-4.5 h-4.5 text-amber-400 transition-transform duration-200 hover:rotate-45" />
      <Moon className="block dark:hidden w-4.5 h-4.5 text-gray-700 transition-transform duration-200 hover:-rotate-12" />
    </button>
  );
};
