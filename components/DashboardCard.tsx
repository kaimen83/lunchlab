import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface DashboardCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
}

export function DashboardCard({ title, description, icon, href }: DashboardCardProps) {
  return (
    <Link href={href} className="block">
      <Card className="hover:shadow-md transition-shadow duration-200 h-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-muted p-2">{icon}</div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
} 