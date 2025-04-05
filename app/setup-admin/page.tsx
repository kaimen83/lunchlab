'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

export default function SetupAdminPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [secretKey, setSecretKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/set-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ secretKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '관리자 권한 설정에 실패했습니다.');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return <div className="flex min-h-screen items-center justify-center">로딩 중...</div>;
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">접근 권한 없음</h1>
          <p>이 페이지에 접근하려면 로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h1 className="text-2xl font-bold">관리자 권한 설정</h1>
          <p className="text-gray-600 mt-2">
            관리자 시크릿 키를 입력하여 {user?.primaryEmailAddress?.emailAddress} 계정에 관리자 권한을 부여합니다.
          </p>
        </div>

        {success ? (
          <div className="bg-green-100 p-4 rounded text-green-700 text-center">
            관리자 권한이 성공적으로 설정되었습니다. 관리자 페이지로 이동합니다...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="bg-red-100 p-4 rounded text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="secretKey" className="block text-sm font-medium text-gray-700">
                관리자 시크릿 키
              </label>
              <input
                id="secretKey"
                name="secretKey"
                type="password"
                autoComplete="off"
                required
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="관리자 시크릿 키를 입력하세요"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? '처리 중...' : '관리자 권한 설정'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 