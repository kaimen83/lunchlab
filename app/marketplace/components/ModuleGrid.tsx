'use client';

import Link from 'next/link';
import { PackageOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MarketplaceModule } from '@/lib/types';

interface ModuleGridProps {
  modules: MarketplaceModule[];
}

export function ModuleGrid({ modules }: ModuleGridProps) {
  if (modules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <PackageOpen className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium">모듈을 찾을 수 없습니다</h3>
        <p className="text-muted-foreground mt-2">
          이 카테고리에 해당하는 모듈이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {modules.map(module => (
        <Card key={module.id} className="overflow-hidden">
          <CardHeader className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{module.category}</Badge>
              {module.price === 0 ? (
                <Badge variant="secondary">무료</Badge>
              ) : (
                <Badge>유료</Badge>
              )}
            </div>
            <CardTitle className="text-lg">{module.name}</CardTitle>
            <CardDescription className="line-clamp-2 h-10">
              {module.description || '모듈 설명이 없습니다.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-sm text-muted-foreground">
              <p>버전: {module.version}</p>
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-0 flex justify-between">
            <Button asChild variant="outline" size="sm">
              <Link href={`/marketplace/modules/${module.id}`}>
                상세 정보
              </Link>
            </Button>
            <Button size="sm">
              <Link href={`/marketplace/modules/${module.id}/subscribe`}>
                구독 신청
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
} 