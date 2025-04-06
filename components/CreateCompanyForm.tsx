'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building } from 'lucide-react';

export function CreateCompanyForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // 기본 검증
    if (!formData.name.trim()) {
      setError('회사 이름은 필수 입력항목입니다.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '회사 페이지 생성에 실패했습니다.');
      }

      // 생성된 회사 페이지로 리다이렉트
      router.push(`/companies/${data.company.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Building className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center">새 회사 페이지 생성</h2>
        <p className="text-gray-500 text-center mb-6">
          새로운 회사 페이지를 생성하고 팀원들을 초대하세요.
        </p>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md">{error}</div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">회사 이름</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="회사 이름을 입력하세요"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">회사 설명 (선택사항)</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="회사에 대한 간략한 설명을 입력하세요"
            rows={4}
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? '생성 중...' : '회사 페이지 생성'}
      </Button>
    </form>
  );
} 