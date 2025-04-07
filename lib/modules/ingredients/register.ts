import { registerModule } from "@/lib/modules/module-template";
import { ingredientsModuleConfig } from "./config";

/**
 * 식재료 모듈을 마켓플레이스에 등록합니다.
 * 이 함수는 서버 시작 시 한 번 실행하거나 관리자 패널에서 호출할 수 있습니다.
 */
export async function registerIngredientsModule() {
  try {
    const result = await registerModule(ingredientsModuleConfig);
    console.log("식재료 모듈이 마켓플레이스에 등록되었습니다:", result);
    return { success: true, module: result };
  } catch (error) {
    console.error("식재료 모듈 등록 실패:", error);
    return { success: false, error };
  }
}

// 모듈 자동 등록을 원하면 아래 코드의 주석을 해제하세요
// registerIngredientsModule().catch(console.error); 