import React, { useState, useEffect } from 'react';
import { PaginationField, SortDirection, EventResponse, EventStatus, EventStatusGroup, HostResponse, EventType, EVENT_TYPE_LABEL } from './api/types';
import EventsPage from './pages/EventsPage';
import HostsPage from './pages/HostsPage';
import UsersPage from './pages/UsersPage';
import CreateEventModal from './components/CreateEventModal';
import UpdateEventModal from './components/UpdateEventModal';
import LoginPage from './components/LoginPage';
import { createEvent, updateEvent } from './api/eventsClient';
import { login, logout, getStoredToken, setStoredToken, validateToken } from './api/authClient';
import { getAllHosts } from './api/hostsClient';

export default function AppFrame() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [page, setPage] = useState<'events' | 'submissions' | 'hosts' | 'users'>('events');
  const [sortField, setSortField] = useState<PaginationField>(PaginationField.ID);
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.DESC);
  const [filterApproved, setFilterApproved] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<EventStatus | ''>('');
  const [statusGroupFilter, setStatusGroupFilter] = useState<EventStatusGroup | ''>(EventStatusGroup.ACTIVE);
  const [hostIdFilter, setHostIdFilter] = useState<number | ''>('');
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType | ''>('');
  const [hosts, setHosts] = useState<HostResponse[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // 로그인 상태 확인 및 토큰 검증
  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // 토큰이 있으면 서버에서 유효성 검증
      try {
        const isValid = await validateToken();
        setIsAuthenticated(isValid);
        if (isValid) {
          // 인증 성공 시 주최 기관 목록 로드
          try {
            const hostList = await getAllHosts();
            setHosts(hostList);
          } catch (error) {
            console.error('주최 기관 목록 로드 실패:', error);
          }
        }
      } catch (error) {
        console.error('토큰 검증 중 오류:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 뷰포트 크기에 따라 모바일 여부 감지
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        // 데스크톱에서는 항상 메뉴 닫기
        setIsMobileMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 페이지 이동 시 토큰 검증
  const handlePageChange = async (newPage: 'events' | 'submissions' | 'hosts' | 'users') => {
    if (isAuthenticated) {
      // 인증된 상태에서 페이지 이동 시 토큰 재검증
      try {
        const isValid = await validateToken();
        if (!isValid) {
          setIsAuthenticated(false);
          return;
        }
      } catch (error) {
        console.error('페이지 이동 시 토큰 검증 실패:', error);
        setIsAuthenticated(false);
        return;
      }
    }
    setPage(newPage);
    // 탭 변경 시 상태 필터 초기화
    if (newPage === 'events') {
      setStatusGroupFilter(EventStatusGroup.ACTIVE);
      setStatusFilter('');
      setFilterApproved(true);
      setEventTypeFilter('');
    } else if (newPage === 'submissions') {
      setStatusFilter(EventStatus.PENDING);
      setStatusGroupFilter('');
      setFilterApproved(false);
      setEventTypeFilter('');
    }
  };

  // 로그인 처리
  const handleLogin = async (username: string, password: string) => {
    try {
      const response = await login({
        adminId: username,
        password: password,
      });

      setStoredToken(response.accessToken);
      setIsAuthenticated(true);
    } catch (error: any) {
      throw new Error(error.message || '로그인에 실패했습니다.');
    }
  };

  // 행사 수정 핸들러
  const handleEditEvent = (event: EventResponse) => {
    setSelectedEvent(event);
    setIsUpdateModalOpen(true);
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
  };

  // 로딩 중이면 로딩 화면 표시
  if (isLoading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid var(--primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <div style={{ color: '#666', fontSize: '14px' }}>로딩 중...</div>
        </div>
      </div>
    );
  }

  // 로그인하지 않은 경우 로그인 페이지 표시
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const content = (() => {
    if (page === 'hosts') return <HostsPage />;
    if (page === 'users') return <UsersPage />;
    if (page === 'submissions') {
      // 제보 행사: 기본 상태그룹 PENDING
      return (
        <EventsPage
          sortField={sortField}
          sortDirection={sortDirection}
          filterApproved={false}
          statusFilter=""
          statusGroupFilter={EventStatusGroup.PENDING}
          eventTypeFilter={eventTypeFilter}
          onEditEvent={handleEditEvent}
          approveMode={true}
        />
      );
    }
    // 행사 관리
    return (
      <EventsPage
        sortField={sortField}
        sortDirection={sortDirection}
        filterApproved={true}
        statusFilter={statusFilter}
        statusGroupFilter={statusGroupFilter}
        eventTypeFilter={eventTypeFilter}
        hostIdFilter={hostIdFilter}
        onEditEvent={handleEditEvent}
      />
    );
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <section className="app-shell">
        <header className="app-header">
          <div className="app-header-inner">
            <div className="app-header-left">
              <div className="app-logo">Du it! Admin</div>
              {/* 데스크톱용 탭 네비게이션 */}
              <div className="app-nav-desktop">
                <button
                  onClick={() => handlePageChange('events')}
                  className={`app-nav-item ${page === 'events' ? 'active' : ''}`}
                >
                  행사 관리
                </button>
                <button
                  onClick={() => handlePageChange('submissions')}
                  className={`app-nav-item ${page === 'submissions' ? 'active' : ''}`}
                >
                  제보 행사
                </button>
                <button
                  onClick={() => handlePageChange('hosts')}
                  className={`app-nav-item ${page === 'hosts' ? 'active' : ''}`}
                >
                  주최기관
                </button>
                <button
                  onClick={() => handlePageChange('users')}
                  className={`app-nav-item ${page === 'users' ? 'active' : ''}`}
                >
                  사용자
                </button>
              </div>
            </div>

            <div className="app-header-right">
              {(page === 'events' || page === 'submissions') && !isMobile && (
                <>
                  <select className="select" value={sortField} onChange={e => setSortField(e.target.value as PaginationField)}>
                    <option value={PaginationField.ID}>기본</option>
                    <option value={PaginationField.START_DATE}>시작일</option>
                    <option value={PaginationField.RECRUITMENT_DEADLINE}>모집 마감</option>
                    <option value={PaginationField.VIEW_COUNT}>조회수</option>
                    <option value={PaginationField.CREATED_AT}>등록일</option>
                  </select>
                  <select
                    className="select"
                    value={eventTypeFilter || ''}
                    onChange={e => {
                      const value = e.target.value as EventType | '';
                      setEventTypeFilter(value);
                    }}
                    style={{ width: 160 }}
                  >
                    <option value="">유형 전체</option>
                    {Object.values(EventType).map(type => (
                      <option key={type} value={type}>
                        {EVENT_TYPE_LABEL[type]}
                      </option>
                    ))}
                  </select>
                  <select
                    className="select"
                    value={statusFilter || ''}
                    onChange={e => {
                      const value = e.target.value as EventStatus | '';
                      setStatusFilter(value);
                      if (value) setStatusGroupFilter('');
                    }}
                    style={{ width: 140 }}
                    disabled={page === 'submissions'}
                  >
                    <option value="">상태 전체</option>
                    <option value={EventStatus.PENDING}>승인 대기</option>
                    <option value={EventStatus.RECRUITING}>모집중</option>
                    <option value={EventStatus.RECRUITMENT_WAITING}>모집 대기</option>
                    <option value={EventStatus.EVENT_WAITING}>행사 대기</option>
                    <option value={EventStatus.ACTIVE}>진행중</option>
                    <option value={EventStatus.FINISHED}>종료</option>
                  </select>
                  <select
                    className="select"
                    value={statusGroupFilter || ''}
                    onChange={e => {
                      const value = e.target.value as EventStatusGroup | '';
                      setStatusGroupFilter(value);
                      if (value) setStatusFilter('');
                    }}
                    style={{ width: 140 }}
                    disabled={page === 'submissions'}
                  >
                    <option value="">상태그룹 전체</option>
                    <option value={EventStatusGroup.PENDING}>승인대기</option>
                    <option value={EventStatusGroup.ACTIVE}>진행</option>
                    <option value={EventStatusGroup.FINISHED}>종료</option>
                  </select>
                  <select
                    className="select"
                    value={hostIdFilter || ''}
                    onChange={e => {
                      const value = e.target.value === '' ? '' : Number(e.target.value);
                      setHostIdFilter(value);
                    }}
                    style={{ width: 180 }}
                    disabled={page === 'submissions'}
                  >
                    <option value="">주최 기관 전체</option>
                    {hosts.map(host => (
                      <option key={host.id} value={host.id}>
                        {host.name}
                      </option>
                    ))}
                  </select>
                  <input className="input" placeholder="검색" style={{ width: 180 }} />
                </>
              )}
              {page === 'events' && (
                <button className="btn primary" onClick={() => setIsCreateModalOpen(true)}>
                  추가
                </button>
              )}
              <button className="btn primary delete" onClick={handleLogout} style={{ whiteSpace: 'nowrap' }}>
                로그아웃
              </button>
            </div>

            {/* 모바일 햄버거 버튼 */}
            {isMobile && (
              <button
                type="button"
                className="app-nav-toggle"
                onClick={() => setIsMobileMenuOpen(open => !open)}
                aria-label="메뉴 열기"
              >
                <span className="app-nav-toggle-label">메뉴</span>
              </button>
            )}
          </div>
        </header>
        {/* 모바일용 펼쳐지는 탭 메뉴 */}
        {isMobile && isMobileMenuOpen && (
          <nav className="app-nav-mobile">
            <button
              className={`app-nav-mobile-item ${page === 'events' ? 'active' : ''}`}
              onClick={() => {
                handlePageChange('events');
                setIsMobileMenuOpen(false);
              }}
            >
              행사 관리
            </button>
            <button
              className={`app-nav-mobile-item ${page === 'submissions' ? 'active' : ''}`}
              onClick={() => {
                handlePageChange('submissions');
                setIsMobileMenuOpen(false);
              }}
            >
              제보 행사
            </button>
            <button
              className={`app-nav-mobile-item ${page === 'hosts' ? 'active' : ''}`}
              onClick={() => {
                handlePageChange('hosts');
                setIsMobileMenuOpen(false);
              }}
            >
              주최기관
            </button>
            <button
              className={`app-nav-mobile-item ${page === 'users' ? 'active' : ''}`}
              onClick={() => {
                handlePageChange('users');
                setIsMobileMenuOpen(false);
              }}
            >
              사용자
            </button>

            {(page === 'events' || page === 'submissions') && (
              <div className="app-nav-mobile-filters">
                <select className="select" value={sortField} onChange={e => setSortField(e.target.value as PaginationField)}>
                  <option value={PaginationField.ID}>기본</option>
                  <option value={PaginationField.START_DATE}>시작일</option>
                  <option value={PaginationField.RECRUITMENT_DEADLINE}>모집 마감</option>
                  <option value={PaginationField.VIEW_COUNT}>조회수</option>
                  <option value={PaginationField.CREATED_AT}>등록일</option>
                </select>

                <select
                  className="select"
                  value={eventTypeFilter || ''}
                  onChange={e => {
                    const value = e.target.value as EventType | '';
                    setEventTypeFilter(value);
                  }}
                >
                  <option value="">유형 전체</option>
                  {Object.values(EventType).map(type => (
                    <option key={type} value={type}>
                      {EVENT_TYPE_LABEL[type]}
                    </option>
                  ))}
                </select>

                <select
                  className="select"
                  value={statusFilter || ''}
                  onChange={e => {
                    const value = e.target.value as EventStatus | '';
                    setStatusFilter(value);
                    if (value) setStatusGroupFilter('');
                  }}
                  disabled={page === 'submissions'}
                >
                  <option value="">상태 전체</option>
                  <option value={EventStatus.PENDING}>승인 대기</option>
                  <option value={EventStatus.RECRUITING}>모집중</option>
                  <option value={EventStatus.RECRUITMENT_WAITING}>모집 대기</option>
                  <option value={EventStatus.EVENT_WAITING}>행사 대기</option>
                  <option value={EventStatus.ACTIVE}>진행중</option>
                  <option value={EventStatus.FINISHED}>종료</option>
                </select>

                <select
                  className="select"
                  value={statusGroupFilter || ''}
                  onChange={e => {
                    const value = e.target.value as EventStatusGroup | '';
                    setStatusGroupFilter(value);
                    if (value) setStatusFilter('');
                  }}
                  disabled={page === 'submissions'}
                >
                  <option value="">상태그룹 전체</option>
                  <option value={EventStatusGroup.PENDING}>승인대기</option>
                  <option value={EventStatusGroup.ACTIVE}>진행</option>
                  <option value={EventStatusGroup.FINISHED}>종료</option>
                </select>

                <select
                  className="select"
                  value={hostIdFilter || ''}
                  onChange={e => {
                    const value = e.target.value === '' ? '' : Number(e.target.value);
                    setHostIdFilter(value);
                  }}
                  disabled={page === 'submissions'}
                >
                  <option value="">주최 기관 전체</option>
                  {hosts.map(host => (
                    <option key={host.id} value={host.id}>
                      {host.name}
                    </option>
                  ))}
                </select>

                <input className="input" placeholder="검색" />
              </div>
            )}
          </nav>
        )}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            padding: '8px 10px',
          }}
        >
          {content}
        </div>
      </section>

      {/* 행사 생성 모달 */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={async eventFormData => {
          try {
            console.log('=== 행사 생성 시작 ===');
            console.log('FormData 전송 시작...');

            const result = await createEvent(eventFormData);
            console.log('행사 생성 성공:', result);

            alert('행사가 성공적으로 생성되었습니다!');
            setIsCreateModalOpen(false);
            // 페이지 새로고침 또는 데이터 다시 로드
            window.location.reload();
          } catch (error: any) {
            console.error('=== 행사 생성 실패 ===');
            console.error('Error type:', error.constructor.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('========================');

            alert(`행사 생성 실패: ${error.message}`);
          }
        }}
      />

      {/* 행사 수정 모달 */}
      <UpdateEventModal
        isOpen={isUpdateModalOpen}
        onClose={() => {
          setIsUpdateModalOpen(false);
          setSelectedEvent(null);
        }}
        onSubmit={async (eventId, formData) => {
          try {
            console.log('=== 행사 수정 시작 ===');
            console.log('FormData 전송 시작...');

            const result = await updateEvent(eventId, formData);
            console.log('행사 수정 성공:', result);

            alert('행사가 성공적으로 수정되었습니다!');
            setIsUpdateModalOpen(false);
            setSelectedEvent(null);
            // 페이지 새로고침 또는 데이터 다시 로드
            window.location.reload();
          } catch (error: any) {
            console.error('=== 행사 수정 실패 ===');
            console.error('Error type:', error.constructor.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('========================');

            alert(`행사 수정 실패: ${error.message}`);
          }
        }}
        eventData={selectedEvent}
      />
    </div>
  );
}
