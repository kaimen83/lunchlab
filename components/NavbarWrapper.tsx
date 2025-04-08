'use client';

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";

export function NavbarWrapper() {
  const pathname = usePathname();
  const isCompaniesRoute = pathname?.startsWith('/companies');
  
  return !isCompaniesRoute ? <Navbar /> : null;
} 