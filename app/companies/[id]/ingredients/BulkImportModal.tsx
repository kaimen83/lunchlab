'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { FileSpreadsheet, AlertCircle, CheckCircle, ServerCrash } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';

interface BulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onImportComplete?: () => void;
  onSuccess?: () => void;
}

export default function BulkImportModal({ 
  open, 
  onOpenChange, 
  companyId, 
  onImportComplete, 
  onSuccess
}: BulkImportModalProps) {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors?: string[];
  } | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // URL 유효성 검사 함수
  const isValidGoogleSheetUrl = (url: string) => {
    return url.includes('docs.google.com/spreadsheets');
  };

  // 데이터 가져오기 및 저장
  const handleImport = async () => {
    if (!isValidGoogleSheetUrl(url)) {
      toast({
        title: '유효하지 않은 URL',
        description: '구글 스프레드시트 URL을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setProgress(10);
    setImportResult(null);
    setErrorMessage(null);

    try {
      // 진행 상태 시뮬레이션 - 더 느리게 진행하도록 조정
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          // 90%에 도달하면 더 이상 증가하지 않음 (서버 응답 대기 중)
          if (prev >= 90) return 90;
          // 처음에는 빠르게, 나중에는 천천히 증가
          const increment = prev < 30 ? 8 : prev < 60 ? 5 : 2;
          return Math.min(prev + increment, 90);
        });
      }, 800);

      // 타임아웃 설정 (60초로 변경 - Vercel Hobby 플랜 최대 한도에 맞춤)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const response = await fetch(`/api/companies/${companyId}/ingredients/bulk-import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ spreadsheetUrl: url }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        clearInterval(progressInterval);
        setProgress(100);

        if (!response.ok) {
          let errorText = '';
          try {
            // 응답이 JSON인지 확인 후 파싱
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const errorData = await response.json();
              errorText = errorData.message || '식재료 일괄 추가 중 오류가 발생했습니다.';
            } else {
              // JSON이 아닌 경우 텍스트로 처리
              errorText = await response.text();
              
              // 텍스트가 너무 길면 자르기
              if (errorText.length > 150) {
                errorText = errorText.substring(0, 150) + '...';
              }
              
              // 상태 코드에 따른 메시지 추가
              if (response.status === 504) {
                errorText = '서버 처리 시간이 초과되었습니다. 스프레드시트의 데이터 양을 줄이고 다시 시도해주세요.';
              } else {
                errorText = `서버 오류가 발생했습니다 (${response.status}). 잠시 후 다시 시도해주세요.`;
              }
            }
          } catch (jsonError) {
            // JSON 파싱 실패 시 상태 코드 기반 오류 메시지
            if (response.status === 504) {
              errorText = '서버 처리 시간이 초과되었습니다. 스프레드시트의 데이터 양을 줄이고 다시 시도해주세요.';
            } else {
              errorText = `서버 오류가 발생했습니다 (${response.status}). 잠시 후 다시 시도해주세요.`;
            }
          }
          setErrorMessage(errorText);
          throw new Error(errorText);
        }

        // 응답이 JSON인지 확인 후 파싱
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('서버에서 유효한 JSON 응답을 받지 못했습니다.');
        }

        const result = await response.json();
        setImportResult(result);
        
        toast({
          title: '식재료 일괄 추가 완료',
          description: `성공: ${result.success}개, 실패: ${result.failed}개`,
          variant: result.failed === 0 ? 'default' : 'destructive',
        });

        if (result.success > 0) {
          // 데이터가 추가되었을 경우에만 목록 갱신
          onImportComplete?.();
        }

        if (onSuccess) {
          onSuccess();
        }
      } catch (abortError) {
        clearTimeout(timeoutId);
        clearInterval(progressInterval);
        
        if (abortError instanceof Error && abortError.name === 'AbortError') {
          setProgress(100);
          setErrorMessage('처리 시간이 너무 오래 걸립니다. 스프레드시트의 데이터 양이 너무 많을 수 있습니다.');
          toast({
            title: '처리 시간 초과',
            description: '스프레드시트 데이터가 너무 많아 처리가 중단되었습니다. 더 작은 단위로 나누어 시도해보세요.',
            variant: 'destructive',
          });
        } else {
          throw abortError;
        }
      }
    } catch (error) {
      console.error('식재료 일괄 추가 오류:', error);
      // 이미 설정된 errorMessage가 없는 경우에만 기본 메시지 설정
      if (!errorMessage) {
        setErrorMessage(error instanceof Error ? error.message : '데이터를 가져오는데 실패했습니다.');
      }
      
      toast({
        title: '일괄 추가 실패',
        description: error instanceof Error ? error.message : '데이터를 가져오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setUrl('');
    setImportResult(null);
    setErrorMessage(null);
    setProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            <span>구글 스프레드시트로 식재료 일괄 추가</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              구글 스프레드시트 URL을 입력하면 시트의 데이터를 식재료로 일괄 추가합니다.
            </p>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="format">
                <AccordionTrigger className="text-sm font-medium">
                  스프레드시트 형식 안내
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p>데이터는 4행부터 시작해야 합니다. (1-3행은 헤더)</p>
                    <p className="font-medium mt-2">열 매핑:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>B열: 식재료명 (필수)</li>
                      <li>C열: 메모</li>
                      <li>D열: 코드명</li>
                      <li>E열: 식재료업체</li>
                      <li>F열: 포장당 식재료 양 (필수)</li>
                      <li>G열: 단위 (필수)</li>
                      <li>J열: 가격 (필수)</li>
                      <li>L열: 박스당 포장갯수</li>
                      <li>M열: 재고관리 등급</li>
                      <li>N열: 원산지</li>
                      <li>O열: 칼로리</li>
                      <li>P열: 탄수화물</li>
                      <li>Q열: 단백질</li>
                      <li>R열: 지방</li>
                      <li>S열: 알러지 유발물질</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                스프레드시트가 <strong>공개 접근 가능</strong>하도록 설정되어 있어야 합니다.
                <br />
                공유시 "링크가 있는 모든 사용자가 보기 가능"으로 설정해야 합니다.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-1">
              <Input
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-amber-700">
                대용량 데이터의 경우 처리 시간이 오래 걸릴 수 있습니다.
              </p>
            </div>
          </div>

          {isLoading && (
            <div className="space-y-2">
              <p className="text-sm text-center">데이터를 가져오는 중...</p>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                데이터 양에 따라 최대 1분까지 소요될 수 있습니다
              </p>
            </div>
          )}
          
          {errorMessage && (
            <div className="p-4 bg-red-50 rounded-md border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <ServerCrash className="h-5 w-5 text-red-500" />
                <span className="font-medium text-red-800">오류 발생</span>
              </div>
              <p className="text-sm text-red-700">{errorMessage}</p>
              {(errorMessage.includes('시간이 초과') || errorMessage.includes('처리 시간')) && (
                <p className="text-xs mt-2 text-red-600">
                  스프레드시트의 데이터 양이 너무 많습니다. 데이터를 더 작은 단위로 나누어 시도해보세요.
                </p>
              )}
            </div>
          )}

          {importResult && (
            <div className="space-y-2 p-4 bg-gray-50 rounded-md">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">가져오기 결과</span>
              </div>
              <p className="text-sm">성공: {importResult.success}개, 실패: {importResult.failed}개</p>
              
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium text-red-500">오류 항목:</p>
                  <ul className="text-xs text-red-500 list-disc list-inside">
                    {importResult.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li>... 외 {importResult.errors.length - 5}개</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {importResult || errorMessage ? (
            <>
              <Button variant="outline" onClick={handleReset}>
                재시도
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                닫기
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                취소
              </Button>
              <Button onClick={handleImport} disabled={isLoading || !url}>
                {isLoading ? '가져오는 중...' : '가져오기'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 