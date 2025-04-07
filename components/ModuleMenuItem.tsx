'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModuleMenuItemProps {
  label: string;
  icon?: LucideIcon;
  path: string;
  companyId: string;
  isActive?: boolean;
  companyPath?: boolean;
}

export function ModuleMenuItem({ 
  label, 
  icon: Icon, 
  path, 
  companyId, 
  isActive,
  companyPath = true
}: ModuleMenuItemProps) {
  const pathname = usePathname();
  const fullPath = companyPath ? `/companies/${companyId}${path}` : path;
  const active = isActive ?? pathname === fullPath;

  return (
    <Link 
      href={fullPath} 
      className={cn(
        "flex items-center px-2 py-1.5 text-sm rounded",
        active ? "bg-[#1164A3] text-white" : "hover:bg-gray-700"
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 mr-2 text-gray-400" />}
      <span>{label}</span>
    </Link>
  );
} 