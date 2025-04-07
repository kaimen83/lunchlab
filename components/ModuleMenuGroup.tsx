'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModuleMenuGroupProps {
  title: string;
  icon?: LucideIcon;
  iconColor?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export function ModuleMenuGroup({
  title,
  icon: Icon,
  iconColor = "bg-blue-600",
  defaultExpanded = false,
  children
}: ModuleMenuGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <li className="px-2 mb-2">
      <div className="mb-1">
        <div 
          className="flex items-center px-2 py-1.5 rounded cursor-pointer hover:bg-gray-700"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
          )}
          
          <div className={cn(`${iconColor} w-5 h-5 rounded flex items-center justify-center mr-2 flex-shrink-0`)}>
            {Icon && <Icon className="h-3 w-3 text-white" />}
          </div>
          
          <span className="truncate flex-1">{title}</span>
        </div>
      </div>
      
      {isExpanded && (
        <div className="pl-7 space-y-0.5 mb-2">
          {children}
        </div>
      )}
    </li>
  );
} 