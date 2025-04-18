import React from "react";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Mail,
  Plus,
  Trash,
  Settings,
  Save,
  Home,
  Search,
  Bell,
  Menu
} from "lucide-react";

interface IconButtonProps {
  label?: string;
}

export const IconButtonExample: React.FC<IconButtonProps> = ({ label }) => {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-4">{label || "아이콘 버튼 예제"}</h2>
      
      {/* 기본 아이콘 버튼 */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium">기본 아이콘 버튼</h3>
        <div className="flex flex-wrap gap-4">
          <Button>
            <Plus />
            추가하기
          </Button>
          <Button>
            <Save />
            저장하기
          </Button>
          <Button>
            <Mail />
            메일 보내기
          </Button>
        </div>
      </div>
      
      {/* 아이콘만 있는 버튼 */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium">아이콘만 있는 버튼</h3>
        <div className="flex flex-wrap gap-4">
          <Button size="icon" aria-label="홈">
            <Home />
          </Button>
          <Button size="icon" aria-label="검색">
            <Search />
          </Button>
          <Button size="icon" aria-label="알림">
            <Bell />
          </Button>
          <Button size="icon" aria-label="메뉴">
            <Menu />
          </Button>
        </div>
      </div>
      
      {/* 다양한 variant의 아이콘 버튼 */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium">다양한 스타일의 아이콘 버튼</h3>
        <div className="flex flex-wrap gap-4">
          <Button variant="default">
            <Heart />
            좋아요
          </Button>
          <Button variant="secondary">
            <Settings />
            설정
          </Button>
          <Button variant="destructive">
            <Trash />
            삭제
          </Button>
          <Button variant="outline">
            <Mail />
            메시지
          </Button>
          <Button variant="ghost">
            <Search />
            검색
          </Button>
          <Button variant="link">
            <Plus />
            더보기
          </Button>
        </div>
      </div>
      
      {/* 다양한 크기의 아이콘 버튼 */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium">다양한 크기의 아이콘 버튼</h3>
        <div className="flex flex-wrap gap-4 items-center">
          <Button size="sm">
            <Plus />
            작게
          </Button>
          <Button size="default">
            <Plus />
            기본
          </Button>
          <Button size="lg">
            <Plus />
            크게
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IconButtonExample; 