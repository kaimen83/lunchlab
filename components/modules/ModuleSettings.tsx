import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModuleHelpers, ModuleSettingDefinition } from '@/lib/modules/module-template';
import { toast } from 'sonner';

interface ModuleSettingsProps {
  moduleId: string;
  companyId: string;
  open: boolean;
  onClose: () => void;
  settingDefinitions: ModuleSettingDefinition[];
  onSettingsChange?: (settings: Record<string, any>) => void;
}

export function ModuleSettings({
  moduleId,
  companyId,
  open,
  onClose,
  settingDefinitions,
  onSettingsChange
}: ModuleSettingsProps) {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 설정 불러오기
  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open, moduleId, companyId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const loadedSettings: Record<string, any> = {};
      
      for (const setting of settingDefinitions) {
        const value = await ModuleHelpers.getSetting(companyId, moduleId, setting.key);
        loadedSettings[setting.key] = value !== null ? value : setting.default_value;
      }
      
      setSettings(loadedSettings);
    } catch (error) {
      console.error('설정 로드 오류:', error);
      toast.error('설정을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 설정 저장
  const saveSettings = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await ModuleHelpers.setSetting(companyId, moduleId, key, value);
      }
      
      toast.success('설정이 저장되었습니다.');
      
      if (onSettingsChange) {
        onSettingsChange(settings);
      }
      
      onClose();
    } catch (error) {
      console.error('설정 저장 오류:', error);
      toast.error('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 설정 값 변경 핸들러
  const handleSettingChange = (key: string, value: any) => {
    setSettings({
      ...settings,
      [key]: value,
    });
  };

  // 설정 그룹화 (나중에 탭으로 분리할 수 있도록)
  const groupedSettings = settingDefinitions.reduce((groups: Record<string, ModuleSettingDefinition[]>, setting) => {
    const group = setting.key.split('.')[0] || '기본';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(setting);
    return groups;
  }, {});

  // 설정 필드 렌더링
  const renderSettingField = (setting: ModuleSettingDefinition) => {
    const value = settings[setting.key];
    
    switch (setting.type) {
      case 'string':
        return (
          <Input
            id={`setting-${setting.key}`}
            value={value || ''}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            placeholder={setting.description}
            disabled={loading}
          />
        );
      
      case 'number':
        return (
          <Input
            id={`setting-${setting.key}`}
            type="number"
            value={value || 0}
            onChange={(e) => handleSettingChange(setting.key, parseFloat(e.target.value))}
            placeholder={setting.description}
            disabled={loading}
          />
        );
      
      case 'boolean':
        return (
          <Switch
            id={`setting-${setting.key}`}
            checked={value || false}
            onCheckedChange={(checked) => handleSettingChange(setting.key, checked)}
            disabled={loading}
          />
        );
      
      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(val) => handleSettingChange(setting.key, val)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder={setting.description} />
            </SelectTrigger>
            <SelectContent>
              {setting.options?.map((option) => (
                <SelectItem key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>모듈 설정</DialogTitle>
          <DialogDescription>이 모듈의 설정을 관리합니다.</DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <p>설정을 불러오는 중...</p>
          </div>
        ) : (
          <>
            {Object.keys(groupedSettings).length > 1 ? (
              <Tabs defaultValue={Object.keys(groupedSettings)[0]}>
                <TabsList className="w-full">
                  {Object.keys(groupedSettings).map((group) => (
                    <TabsTrigger key={group} value={group}>
                      {group}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {Object.entries(groupedSettings).map(([group, settings]) => (
                  <TabsContent key={group} value={group} className="space-y-4 py-4">
                    {settings.map((setting) => (
                      <div key={setting.key} className="grid gap-2">
                        <Label htmlFor={`setting-${setting.key}`}>
                          {setting.label}
                          {setting.required && <span className="text-red-500">*</span>}
                        </Label>
                        {renderSettingField(setting)}
                        {setting.description && (
                          <p className="text-sm text-muted-foreground">{setting.description}</p>
                        )}
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="space-y-4 py-4">
                {settingDefinitions.map((setting) => (
                  <div key={setting.key} className="grid gap-2">
                    <Label htmlFor={`setting-${setting.key}`}>
                      {setting.label}
                      {setting.required && <span className="text-red-500">*</span>}
                    </Label>
                    {renderSettingField(setting)}
                    {setting.description && (
                      <p className="text-sm text-muted-foreground">{setting.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                취소
              </Button>
              <Button onClick={saveSettings} disabled={loading || saving}>
                {saving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
} 