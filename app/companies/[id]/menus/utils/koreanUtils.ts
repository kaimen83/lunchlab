/**
 * 한글 초성 추출 유틸리티 함수
 * 문자열의 첫 글자가 한글인 경우 초성을 반환합니다.
 */
export const getKoreanInitial = (text: string): string => {
  const firstChar = text.charAt(0);
  const unicodeValue = firstChar.charCodeAt(0);
  
  // 한글 범위 확인 (유니코드: AC00-D7A3)
  if (unicodeValue >= 44032 && unicodeValue <= 55203) {
    const idx = Math.floor((unicodeValue - 44032) / 588);
    const initials = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    return initials[idx] || firstChar;
  }
  
  // 영문자인 경우
  if (/[a-zA-Z]/.test(firstChar)) {
    return firstChar.toUpperCase();
  }
  
  // 숫자나 기타 문자인 경우
  return /[0-9]/.test(firstChar) ? '#' : '기타';
}; 