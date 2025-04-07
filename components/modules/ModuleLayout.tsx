import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Settings } from 'lucide-react';

interface ModuleLayoutProps {
  title: string;
  description?: string;
  moduleId: string;
  tabs?: {
    id: string;
    label: string;
    content: React.ReactNode;
  }[];
  defaultTab?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  showSettings?: boolean;
  onSettingsClick?: () => void;
}

export function ModuleLayout({
  title,
  description,
  moduleId,
  tabs,
  defaultTab,
  actions,
  children,
  showSettings = false,
  onSettingsClick
}: ModuleLayoutProps) {
  return (
    <div className="flex flex-col w-full h-full p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {showSettings && (
            <button 
              onClick={onSettingsClick}
              className="p-2 rounded-full hover:bg-secondary"
              aria-label="모듈 설정"
            >
              <Settings className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      
      {tabs ? (
        <Tabs defaultValue={defaultTab || tabs[0].id} className="w-full">
          <TabsList className="mb-4">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id}>
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        children
      )}
    </div>
  );
}

interface ModuleCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function ModuleCard({ title, description, children, footer, className }: ModuleCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && (
        <>
          <Separator />
          <div className="p-4">{footer}</div>
        </>
      )}
    </Card>
  );
}

interface ModuleSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function ModuleSection({ title, description, children, actions, className }: ModuleSectionProps) {
  return (
    <div className={`mb-8 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {actions && <div>{actions}</div>}
      </div>
      {children}
    </div>
  );
} 