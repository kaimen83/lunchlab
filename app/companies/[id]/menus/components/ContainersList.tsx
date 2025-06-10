'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Package, 
  Search, 
  AlertTriangle, 
  LayoutGrid, 
  List,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
  ChevronDown as ChevronDownIcon
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CompanyMemberRole } from '@/lib/types';
import ContainerModal, { Container } from './ContainerModal';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow
} from '@/components/ui/table';

interface ContainersListProps {
  companyId: string;
  userRole: CompanyMemberRole;
}

export default function ContainersList({ companyId, userRole }: ContainersListProps) {
  const { toast } = useToast();
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<Container | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [containerToDelete, setContainerToDelete] = useState<Container | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [parentGroupId, setParentGroupId] = useState<string | undefined>(undefined);
  
  // 권한 체크: 소유자 또는 관리자인지 확인
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';
  
  // 용기 목록 불러오기 (트리 구조)
  const fetchContainers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/containers`);
      
      if (!response.ok) {
        throw new Error('용기 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setContainers(data);
      
      // 기본적으로 모든 그룹을 펼쳐놓기
      const groupIds = data
        .filter((container: Container) => container.container_type === 'group')
        .map((group: Container) => group.id);
      setExpandedGroups(new Set(groupIds));
    } catch (error) {
      console.error('용기 불러오기 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '용기 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // 초기 데이터 로딩
  useEffect(() => {
    fetchContainers();
  }, [companyId]);

  // 그룹 펼치기/접기 토글
  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // 용기 편집 버튼 클릭
  const handleEditClick = (container: Container) => {
    setSelectedContainer(container);
    setParentGroupId(undefined);
    setModalOpen(true);
  };

  // 용기 삭제 버튼 클릭 
  const handleDeleteClick = (container: Container) => {
    // 권한 체크: 소유자 또는 관리자만 삭제 가능
    if (!isOwnerOrAdmin) {
      toast({
        title: '권한 없음',
        description: '용기 삭제는 관리자 이상의 권한이 필요합니다.',
        variant: 'destructive',
      });
      return;
    }
    
    setContainerToDelete(container);
    setDeleteDialogOpen(true);
  };

  // 용기 삭제 처리
  const confirmDelete = async () => {
    if (!containerToDelete) return;
    
    // 권한 재확인
    if (!isOwnerOrAdmin) {
      toast({
        title: '권한 없음',
        description: '용기 삭제는 관리자 이상의 권한이 필요합니다.',
        variant: 'destructive',
      });
      setDeleteDialogOpen(false);
      setContainerToDelete(null);
      return;
    }
    
    try {
      const response = await fetch(`/api/companies/${companyId}/containers/${containerToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '용기 삭제 중 오류가 발생했습니다.');
      }
      
      toast({
        title: '용기 삭제 완료',
        description: `${containerToDelete.name} ${containerToDelete.container_type === 'group' ? '그룹' : '용기'}가 삭제되었습니다.`,
      });
      
      // 목록 새로고침
      fetchContainers();
    } catch (error) {
      console.error('용기 삭제 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '용기 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setContainerToDelete(null);
    }
  };

  // 새 그룹 추가
  const handleAddGroup = () => {
    setSelectedContainer(undefined);
    setParentGroupId(undefined);
    setModalOpen(true);
  };

  // 새 용기 추가
  const handleAddItem = () => {
    setSelectedContainer(undefined);
    setParentGroupId(undefined);
    setModalOpen(true);
  };

  // 그룹에 하위 용기 추가
  const handleAddToGroup = (groupId: string) => {
    setSelectedContainer(undefined);
    setParentGroupId(groupId);
    setModalOpen(true);
  };

  // 플랫한 배열로 변환 (검색용)
  const flattenContainers = (containers: Container[]): Container[] => {
    const result: Container[] = [];
    
    const addContainer = (container: Container, level: number = 0) => {
      result.push({ ...container, level });
      if (container.children) {
        container.children.forEach(child => addContainer(child, level + 1));
      }
    };
    
    containers.forEach(container => addContainer(container));
    return result;
  };

  // 필터링된 용기 목록 (검색 시 플랫 구조 사용)
  const getFilteredContainers = () => {
    if (!searchQuery.trim()) {
      return containers; // 검색어가 없으면 트리 구조 그대로
    }
    
    // 검색어가 있으면 플랫 구조로 변환해서 필터링
    const flatContainers = flattenContainers(containers);
    return flatContainers.filter(container =>
      container.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (container.description && container.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (container.code_name && container.code_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (container.path && container.path.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  // 보기 모드 변경 핸들러
  const handleViewModeChange = (value: string) => {
    if (value === 'grid' || value === 'list') {
      setViewMode(value);
    }
  };

  // 그룹 목록 (모달에서 사용)
  const availableGroups = flattenContainers(containers).filter(c => c.container_type === 'group');

  // 컨테이너 렌더링 (트리 구조)
  const renderContainer = (container: Container, level: number = 0) => {
    const isGroup = container.container_type === 'group';
    const isExpanded = expandedGroups.has(container.id);
    const hasChildren = container.children && container.children.length > 0;
    
    if (viewMode === 'grid') {
      return (
        <div key={container.id} className={`${level > 0 ? 'ml-8' : ''}`}>
          <Card className={`overflow-hidden border transition-colors ${
            isGroup 
              ? 'border-blue-200 bg-blue-50/30 hover:border-blue-300' 
              : 'border-slate-200 hover:border-slate-300'
          }`}>
            <CardHeader className={`pb-2 ${
              isGroup 
                ? 'bg-gradient-to-r from-blue-50 to-blue-100/50' 
                : 'bg-gradient-to-r from-slate-50 to-white'
            }`}>
              <div className="flex justify-between items-start">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-lg flex items-center">
                    {isGroup && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-auto mr-2 hover:bg-transparent"
                        onClick={() => toggleGroup(container.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-blue-600" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-blue-600" />
                        )}
                      </Button>
                    )}
                    {isGroup ? (
                      isExpanded ? (
                        <FolderOpen className="h-4 w-4 mr-2 text-blue-600" />
                      ) : (
                        <Folder className="h-4 w-4 mr-2 text-blue-600" />
                      )
                    ) : (
                      <Package className="h-4 w-4 mr-2 text-primary" />
                    )}
                    {container.name}
                    {isGroup && (
                      <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-700 border-blue-300">
                        그룹
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 items-center">
                    {container.code_name && (
                      <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-50">
                        {container.code_name}
                      </Badge>
                    )}
                    {container.price !== null && container.price !== undefined && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                        {container.price.toLocaleString()}원
                      </Badge>
                    )}
                    {hasChildren && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        {container.children!.length}개 항목
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex space-x-1">
                  {isGroup && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleAddToGroup(container.id)}
                      className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-100"
                      title="하위 용기 추가"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditClick(container)}
                    className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(container)}
                    className={`h-8 w-8 ${isOwnerOrAdmin 
                      ? "text-red-500 hover:text-red-700 hover:bg-red-50" 
                      : "text-gray-300 cursor-not-allowed"}`}
                    disabled={!isOwnerOrAdmin}
                    title={isOwnerOrAdmin ? `${isGroup ? '그룹' : '용기'} 삭제` : '삭제는 관리자 이상 권한이 필요합니다'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            {container.description && (
              <CardContent className="py-3">
                <p className="text-sm text-slate-600">{container.description}</p>
              </CardContent>
            )}
          </Card>
          
          {/* 하위 용기들 렌더링 */}
          {isGroup && isExpanded && hasChildren && (
            <div className="mt-4 space-y-4">
              {container.children!.map(child => renderContainer(child, level + 1))}
            </div>
          )}
        </div>
      );
    } else {
      // 리스트 뷰는 플랫 구조로 표시
      return null; // 리스트 뷰는 별도로 처리
    }
  };

  // 리스트 뷰용 플랫 렌더링
  const renderFlatContainer = (container: Container) => {
    const isGroup = container.container_type === 'group';
    const levelIndent = (container.level || 0) * 20;
    
    return (
      <TableRow key={container.id} className="hover:bg-muted/50">
        <TableCell className="font-medium">
          <div className="flex items-center" style={{ paddingLeft: `${levelIndent}px` }}>
            {isGroup ? (
              isGroup ? (
                <Folder className="h-4 w-4 mr-2 text-blue-600" />
              ) : (
                <FolderOpen className="h-4 w-4 mr-2 text-blue-600" />
              )
            ) : (
              <Package className="h-4 w-4 mr-2 text-primary" />
            )}
            {container.name}
            {isGroup && (
              <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-700 border-blue-300 text-xs">
                그룹
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          {container.code_name ? (
            <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-50">
              {container.code_name}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          )}
        </TableCell>
        <TableCell>
          {container.price !== null && container.price !== undefined ? 
            `${container.price.toLocaleString()}원` : 
            <span className="text-muted-foreground text-xs">-</span>
          }
        </TableCell>
        <TableCell className="max-w-[200px] truncate">
          {container.description || <span className="text-muted-foreground text-xs">-</span>}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end space-x-1">
            {isGroup && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleAddToGroup(container.id)}
                className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-100"
                title="하위 용기 추가"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEditClick(container)}
              className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteClick(container)}
              className={`h-8 w-8 ${isOwnerOrAdmin 
                ? "text-red-500 hover:text-red-700 hover:bg-red-50" 
                : "text-gray-300 cursor-not-allowed"}`}
              disabled={!isOwnerOrAdmin}
              title={isOwnerOrAdmin ? `${isGroup ? '그룹' : '용기'} 삭제` : '삭제는 관리자 이상 권한이 필요합니다'}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const filteredContainers = getFilteredContainers();
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* 상단 검색 및 추가 버튼 영역 */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="용기 검색 (이름, 설명, 코드명, 경로)..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange} className="border rounded-md">
            <ToggleGroupItem value="grid" aria-label="그리드 보기" className="data-[state=on]:bg-primary/10">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="리스트 보기" className="data-[state=on]:bg-primary/10">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          
          {/* 드롭다운 추가 버튼 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                용기 추가
                <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleAddGroup}>
                <Folder className="mr-2 h-4 w-4 text-blue-600" />
                그룹 추가
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddItem}>
                <Package className="mr-2 h-4 w-4 text-primary" />
                용기 추가
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 컨테이너 목록 */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">로딩 중...</div>
      ) : filteredContainers.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="space-y-4">
            {isSearching ? (
              // 검색 중일 때는 플랫 구조로 표시
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {(filteredContainers as Container[]).map((container) => (
                  <Card key={container.id} className={`overflow-hidden border transition-colors ${
                    container.container_type === 'group'
                      ? 'border-blue-200 bg-blue-50/30 hover:border-blue-300' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}>
                    <CardHeader className={`pb-2 ${
                      container.container_type === 'group'
                        ? 'bg-gradient-to-r from-blue-50 to-blue-100/50' 
                        : 'bg-gradient-to-r from-slate-50 to-white'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-lg flex items-center">
                            {container.container_type === 'group' ? (
                              <Folder className="h-4 w-4 mr-2 text-blue-600" />
                            ) : (
                              <Package className="h-4 w-4 mr-2 text-primary" />
                            )}
                            {container.name}
                            {container.container_type === 'group' && (
                              <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-700 border-blue-300">
                                그룹
                              </Badge>
                            )}
                          </CardTitle>
                          {container.path && container.level && container.level > 0 && (
                            <div className="text-xs text-muted-foreground">
                              경로: {container.path}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 items-center">
                            {container.code_name && (
                              <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-50">
                                {container.code_name}
                              </Badge>
                            )}
                            {container.price !== null && container.price !== undefined && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                                {container.price.toLocaleString()}원
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          {container.container_type === 'group' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleAddToGroup(container.id)}
                              className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-100"
                              title="하위 용기 추가"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(container)}
                            className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(container)}
                            className={`h-8 w-8 ${isOwnerOrAdmin 
                              ? "text-red-500 hover:text-red-700 hover:bg-red-50" 
                              : "text-gray-300 cursor-not-allowed"}`}
                            disabled={!isOwnerOrAdmin}
                            title={isOwnerOrAdmin ? `${container.container_type === 'group' ? '그룹' : '용기'} 삭제` : '삭제는 관리자 이상 권한이 필요합니다'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {container.description && (
                      <CardContent className="py-3">
                        <p className="text-sm text-slate-600">{container.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              // 일반 트리 구조 표시
              filteredContainers.map(container => renderContainer(container))
            )}
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>용기명</TableHead>
                  <TableHead>코드명</TableHead>
                  <TableHead>가격</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead className="w-[120px] text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isSearching ? (
                  (filteredContainers as Container[]).map(container => renderFlatContainer(container))
                ) : (
                  flattenContainers(filteredContainers as Container[]).map(container => renderFlatContainer(container))
                )}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        <div className="py-12 text-center border rounded-md bg-slate-50">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium mb-1">
            {isSearching ? '검색 결과가 없습니다' : '등록된 용기가 없습니다'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {isSearching 
              ? '다른 검색어로 시도해보세요.' 
              : '그룹을 만들어서 용기들을 분류하거나, 개별 용기를 바로 추가할 수 있습니다.'
            }
          </p>
          {!isSearching && (
            <div className="flex justify-center gap-2">
              <Button onClick={handleAddGroup} variant="outline">
                <Folder className="mr-2 h-4 w-4 text-blue-600" />
                그룹 추가
              </Button>
              <Button onClick={handleAddItem}>
                <Package className="mr-2 h-4 w-4" />
                용기 추가
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 권한 없음 알림 - 관리자 이상만 사용 가능 설명 */}
      {!isOwnerOrAdmin && (
        <div className="p-4 mt-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-700">알림: 제한된 권한</h4>
            <p className="text-sm text-yellow-600 mt-1">
              용기 삭제 기능은 관리자 또는 소유자 권한이 필요합니다. 현재 일반 멤버로 접속 중이므로 
              삭제 기능을 사용할 수 없습니다.
            </p>
          </div>
        </div>
      )}

      {/* 용기 추가/수정 모달 */}
      <ContainerModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        companyId={companyId}
        container={selectedContainer}
        onSuccess={fetchContainers}
        parentGroupId={parentGroupId}
        availableGroups={availableGroups}
      />

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {containerToDelete?.container_type === 'group' ? '그룹' : '용기'} 삭제
            </AlertDialogTitle>
            <AlertDialogDescription>
              {containerToDelete?.name} {containerToDelete?.container_type === 'group' ? '그룹' : '용기'}을 삭제하시겠습니까? 
              {containerToDelete?.container_type === 'group' && ' 그룹 내의 용기들은 최상위 레벨로 이동됩니다.'} 
              이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 