// 이메일 알림 기능 테스트 스크립트
// 실행 방법: node __tests__/email-test.js

const { sendFeedbackNotificationEmail } = require('../lib/email')

// 테스트용 피드백 데이터
const testFeedback = {
  id: 'test-feedback-123',
  content: '이것은 테스트 피드백입니다. 이메일 알림 기능이 제대로 작동하는지 확인하기 위한 테스트 메시지입니다.',
  user_id: 'test-user-456',
  user_email: 'test@example.com',
  created_at: new Date().toISOString()
}

async function testEmailNotification() {
  try {
    console.log('📧 이메일 알림 테스트 시작...')
    console.log('테스트 피드백 데이터:', testFeedback)
    
    await sendFeedbackNotificationEmail(testFeedback)
    
    console.log('✅ 이메일 알림 테스트 완료!')
  } catch (error) {
    console.error('❌ 이메일 알림 테스트 실패:', error)
  }
}

// 테스트 실행
testEmailNotification() 