'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface PriceHistory {
  id: string;
  ingredient_id: string;
  price: number;
  recorded_at: string;
}

interface IngredientPriceHistoryProps {
  companyId: string;
  ingredientId: string;
}

export default function IngredientPriceHistory({ companyId, ingredientId }: IngredientPriceHistoryProps) {
  const { toast } = useToast();
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPriceHistory = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/companies/${companyId}/ingredients/${ingredientId}/price-history`);
        
        if (!response.ok) {
          throw new Error('가격 이력을 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        setPriceHistory(data.sort((a: PriceHistory, b: PriceHistory) => 
          new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
        ));
      } catch (error) {
        console.error('가격 이력 로드 오류:', error);
        toast({
          title: '오류 발생',
          description: error instanceof Error ? error.message : '가격 이력을 불러오는데 실패했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPriceHistory();
  }, [companyId, ingredientId, toast]);

  // 차트 데이터 형식으로 변환
  const chartData = priceHistory.map(item => ({
    date: format(new Date(item.recorded_at), 'yyyy-MM-dd'),
    price: item.price,
  }));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy년 MM월 dd일 HH:mm', { locale: ko });
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="text-center py-12">로딩 중...</div>
      ) : priceHistory.length === 0 ? (
        <div className="text-center py-12">가격 이력이 없습니다.</div>
      ) : (
        <>
          <div className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip 
                  formatter={(value: number | string) => [formatCurrency(Number(value)), '가격']}
                  labelFormatter={(label: string) => `날짜: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  name="가격" 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead className="text-right">가격</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(item.recorded_at)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.price)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
} 