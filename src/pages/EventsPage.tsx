import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EventResponse, PaginationField, SortDirection, EventType, EventStatus, EventStatusGroup } from '../api/types';
import { getEvents, deleteEventsBatch, approveEvent, getEventsCount } from '../api/eventsClient';

// 이미지 URL을 절대 경로로 변환하는 함수
function getImageUrl(thumbnail: string | null): string | null {
  if (!thumbnail) return null;

  // 이미 절대 URL인 경우 그대로 반환
  if (thumbnail.startsWith('http://') || thumbnail.startsWith('https://')) {
    return thumbnail;
  }

  // 상대 경로인 경우 API_BASE와 결합
  const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : 'https://klaus9267.duckdns.org');

  // 상대 경로가 /로 시작하지 않으면 / 추가
  const normalizedPath = thumbnail.startsWith('/') ? thumbnail : `/${thumbnail}`;

  return `${API_BASE}${normalizedPath}`;
}

const MOCK_EVENTS: EventResponse[] = [
  {
    id: 1,
    title: '행사 제목 예시',
    startAt: '2025-05-01T00:00:00',
    endAt: '2025-05-03T00:00:00',
    recruitmentStartAt: '2025-04-10T00:00:00',
    recruitmentEndAt: '2025-04-25T00:00:00',
    uri: '#',
    thumbnail: null,
    isApproved: true,
    eventType: EventType.CONFERENCE,
    host: { id: 1, name: '가나다 대학병원', thumbnail: null },
    viewCount: 123,
    isBookmarked: false,
  },
  {
    id: 2,
    title: '간호 세미나 A',
    startAt: '2025-06-25T00:00:00',
    endAt: '2025-06-26T00:00:00',
    recruitmentStartAt: '2025-06-12T00:00:00',
    recruitmentEndAt: '2025-06-20T00:00:00',
    uri: '#',
    thumbnail: null,
    isApproved: true,
    eventType: EventType.SEMINAR,
    host: { id: 2, name: '초록 병원', thumbnail: null },
    viewCount: 87,
    isBookmarked: false,
  },
  {
    id: 3,
    title: '워크숍 B',
    startAt: '2025-07-10T00:00:00',
    endAt: '2025-07-11T00:00:00',
    recruitmentStartAt: '2025-07-01T00:00:00',
    recruitmentEndAt: '2025-07-05T00:00:00',
    uri: '#',
    thumbnail: null,
    isApproved: true,
    eventType: EventType.WORKSHOP,
    host: { id: 3, name: '파란 연구소', thumbnail: null },
    viewCount: 45,
    isBookmarked: false,
  },
  {
    id: 4,
    title: '웨비나 C',
    startAt: '2025-08-15T00:00:00',
    endAt: '2025-08-15T00:00:00',
    recruitmentStartAt: '2025-08-03T00:00:00',
    recruitmentEndAt: '2025-08-08T00:00:00',
    uri: '#',
    thumbnail: null,
    isApproved: true,
    eventType: EventType.WEBINAR,
    host: { id: 4, name: '단국대학교 IT 대학', thumbnail: null },
    viewCount: 210,
    isBookmarked: false,
  },
];

type Props = {
  sortField: PaginationField;
  sortDirection: SortDirection;
  filterApproved: boolean;
  statusFilter: EventStatus | '';
  statusGroupFilter: EventStatusGroup | '';
  eventTypeFilter?: EventType | '';
  hostIdFilter?: number | '';
  onEditEvent?: (event: EventResponse) => void;
  approveMode?: boolean; // 제보 탭에서 승인 버튼 사용
};

export default function EventsPage({
  sortField,
  sortDirection: _sortDirection,
  filterApproved,
  statusFilter,
  statusGroupFilter,
  eventTypeFilter,
  hostIdFilter,
  onEditEvent,
  approveMode,
}: Props) {
  const [items, setItems] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [approvingIds, setApprovingIds] = useState<Set<number>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);
  const observerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const formatDateTime = (iso: string | null): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  };

  const formatStatus = (status?: EventStatus) => {
    switch (status) {
      case EventStatus.FINISHED:
        return '종료';
      case EventStatus.ACTIVE:
        return '진행중';
      case EventStatus.EVENT_WAITING:
        return '행사 대기';
      case EventStatus.RECRUITING:
        return '모집중';
      case EventStatus.RECRUITMENT_WAITING:
        return '모집 대기';
      case EventStatus.PENDING:
        return '승인 대기';
      default:
        return '—';
    }
  };

  const formatStatusGroup = (group?: EventStatusGroup) => {
    switch (group) {
      case EventStatusGroup.ACTIVE:
        return '진행';
      case EventStatusGroup.FINISHED:
        return '종료';
      case EventStatusGroup.PENDING:
        return '승인대기';
      default:
        return '—';
    }
  };

  // 무한 스크롤을 위한 데이터 로딩 (커서 기반)
  const loadMore = useCallback(
    async (cursor: string | null, reset: boolean = false) => {
      if (loadingRef.current) return;

      loadingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const data = await getEvents({
          cursor: cursor || undefined,
          size: 20,
          field: sortField,
          statusGroup: statusGroupFilter || undefined,
          status: statusFilter || undefined,
          hostId: hostIdFilter || undefined,
          types: eventTypeFilter ? [eventTypeFilter] : undefined,
        });

        if (reset) {
          setItems(data.content);
        } else {
          // 중복 제거를 위해 ID 기준으로 필터링
          setItems(prev => {
            const existingIds = new Set(prev.map(item => item.id));
            const newItems = data.content.filter(item => !existingIds.has(item.id));
            return [...prev, ...newItems];
          });
        }

        // v2 커서 기반 페이지네이션
        setHasMore(data.pageInfo.hasNext);
        setNextCursor(data.pageInfo.nextCursor ?? null);
      } catch (e: any) {
        setError(e?.message ?? '오류가 발생했습니다');
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [sortField, statusGroupFilter, statusFilter, eventTypeFilter, hostIdFilter]
  );

  // 전체 행사 개수 조회
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const count = await getEventsCount();
        setTotalCount(count);
      } catch (e: any) {
        console.error('전체 행사 개수 조회 실패:', e);
        setTotalCount(null);
      }
    };
    fetchCount();
  }, []);

  // 필터 변경 시 초기화
  useEffect(() => {
    setItems([]);
    setHasMore(true);
    setNextCursor(null);
    setSelected(new Set());
    // 초기 로드
    loadMore(null, true);
  }, [loadMore]);

  useEffect(() => {
    setSelected(prev => {
      const itemIds = new Set(items.map(item => item.id));
      const next = new Set(Array.from(prev).filter(id => itemIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  // 무한 스크롤 옵저버
  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          loadMore(nextCursor, false);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px 100px 0px' } // 스크롤 끝에서 100px 전에 트리거
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadMore, loading, nextCursor]);

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectableIds = items.map(item => item.id);
  const selectableIdSet = new Set(selectableIds);
  const selectedLoadedCount = selectableIds.filter(id => selected.has(id)).length;
  const isAllSelected = selectableIds.length > 0 && selectedLoadedCount === selectableIds.length;
  const isIndeterminate = selectedLoadedCount > 0 && selectedLoadedCount < selectableIds.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const toggleSelectAll = () => {
    setSelected(prev => {
      if (isAllSelected) {
        return new Set(Array.from(prev).filter(id => !selectableIdSet.has(id)));
      }

      const next = new Set(prev);
      selectableIds.forEach(id => {
        next.add(id);
      });
      return next;
    });
  };

  const approveSelected = useCallback(
    async (eventIds: number[]) => {
      const pendingIds = eventIds.filter(id => !approvingIds.has(id));
      if (pendingIds.length === 0) return;

      setApprovingIds(prev => {
        const next = new Set(prev);
        pendingIds.forEach(id => {
          next.add(id);
        });
        return next;
      });

      const results = await Promise.allSettled(pendingIds.map(id => approveEvent(id)));
      const succeededIds: number[] = [];
      const failedIds: number[] = [];
      let firstErrorMessage: string | null = null;

      results.forEach((result, index) => {
        const id = pendingIds[index];
        if (result.status === 'fulfilled') {
          succeededIds.push(id);
          return;
        }

        failedIds.push(id);
        if (!firstErrorMessage) {
          firstErrorMessage = result.reason instanceof Error ? result.reason.message : '승인에 실패했습니다';
        }
      });

      if (succeededIds.length > 0) {
        setItems(prev => prev.filter(item => !succeededIds.includes(item.id)));
      }

      setSelected(prev => {
        const next = new Set(prev);
        succeededIds.forEach(id => {
          next.delete(id);
        });
        return next;
      });

      setApprovingIds(prev => {
        const next = new Set(prev);
        pendingIds.forEach(id => {
          next.delete(id);
        });
        return next;
      });

      if (failedIds.length === 0) {
        alert(pendingIds.length === 1 ? '승인 완료' : `${succeededIds.length}개의 행사를 승인했습니다.`);
        return;
      }

      const summary = `${succeededIds.length}개 승인, ${failedIds.length}개 실패`;
      alert(firstErrorMessage ? `${summary}\n${firstErrorMessage}` : summary);
    },
    [approvingIds]
  );

  const onApproveSelected = async () => {
    const selectedIds = selectableIds.filter(id => selected.has(id));
    if (selectedIds.length === 0) return;

    if (!confirm(`선택된 ${selectedIds.length}개의 행사를 승인하시겠습니까?`)) {
      return;
    }

    await approveSelected(selectedIds);
  };

  const onDeleteSelected = async () => {
    if (selected.size === 0) return;

    if (!confirm(`선택된 ${selected.size}개의 행사를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      // 배치 삭제 API 호출
      await deleteEventsBatch(Array.from(selected));

      // 성공 시 로컬 상태에서도 제거
      setItems(prev => prev.filter(ev => !selected.has(ev.id)));
      setSelected(new Set());

      alert('선택된 행사가 성공적으로 삭제되었습니다.');
    } catch (error: any) {
      alert(`삭제 실패: ${error.message}`);
    }
  };

  return (
    <div
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'auto',
        maxHeight: 'calc(100vh - 120px)', // 더 많은 공간 활용
        display: 'flex',
        flexDirection: 'column',
        margin: 0,
        padding: 0,
      }}
    >
      {error ? <div style={{ padding: 12, color: '#b91c1c' }}>오류: {error}</div> : null}

      {/* 전체 개수 표시 */}
      <div
        style={{
          padding: '8px 12px',
          background: '#f8f9fa',
          borderBottom: '1px solid var(--border)',
          fontSize: '14px',
          color: '#666',
        }}
      >
        현재 {items.length}
        {totalCount !== null ? `/${totalCount}` : ''} 개 로드됨
      </div>

      <div
        style={{
          padding: '8px 12px',
          background: '#fff',
          borderBottom: '1px solid var(--border)',
          fontSize: '13px',
          color: '#666',
        }}
      >
        💡 제목을 클릭하면 행사 링크가 새 탭에서 열립니다.
      </div>

      {approveMode ? (
        <div
          style={{
            padding: '8px 12px',
            background: '#fff7ed',
            borderBottom: '1px solid var(--border)',
            fontSize: '13px',
            color: '#9a3412',
          }}
        >
          💡 전체 선택은 현재 화면에 로드된 제보 행사에만 적용됩니다.
        </div>
      ) : null}

      <div style={{ overflow: 'auto', flex: 1, position: 'relative' }}>
        <table className="grid-table">
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f6f8fb' }}>
            <tr>
              <th style={{ width: 44, textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    disabled={selectableIds.length === 0 || approvingIds.size > 0}
                    aria-label="전체 선택"
                  />
                  {approveMode ? (
                    <button type="button" className={selected.size > 0 ? 'btn primary' : 'btn'} onClick={onApproveSelected} disabled={selected.size === 0 || approvingIds.size > 0}>
                      승인
                    </button>
                  ) : null}
                  <button type="button" className={selected.size > 0 ? 'btn primary' : 'btn'} onClick={onDeleteSelected} disabled={selected.size === 0 || approvingIds.size > 0}>
                    삭제
                  </button>
                </div>
              </th>
              <th style={{ width: 28 }}>ID</th>
              <th style={{ width: 60 }}>썸네일</th>
              <th style={{ width: 360 }}>제목</th>
              <th style={{ width: 36 }}>주최ID</th>
              <th style={{ width: 120 }}>유형</th>
              <th style={{ width: 100 }}>상태</th>
              <th style={{ width: 90 }}>상태그룹</th>
              <th style={{ width: 140 }}>모집 시작</th>
              <th style={{ width: 140 }}>모집 종료</th>
              <th style={{ width: 140 }}>시작</th>
              <th style={{ width: 140 }}>종료</th>
              <th style={{ width: 80 }}>조회수</th>
              <th style={{ width: 60, textAlign: 'center' }}>{approveMode ? '승인' : '수정'}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading ? (
              <tr>
                  <td colSpan={14}>데이터가 없습니다</td>
              </tr>
            ) : (
              items.map(ev => (
                <tr key={ev.id}>
                  <td style={{ width: 44, textAlign: 'center' }}>
                    <input type="checkbox" checked={selected.has(ev.id)} onChange={() => toggleSelect(ev.id)} disabled={approvingIds.has(ev.id)} />
                  </td>
                  <td>{ev.id}</td>
                  <td>
                    {ev.thumbnail ? (
                      <img
                        src={getImageUrl(ev.thumbnail) || ev.thumbnail}
                        alt=""
                        style={{
                          width: 40,
                          height: 28,
                          objectFit: 'cover',
                          border: '1px solid #ddd',
                          borderRadius: 4,
                        }}
                        onError={e => {
                          console.error('이미지 로딩 실패:', ev.thumbnail);
                          console.error('이미지 URL:', ev.thumbnail);
                          console.error('현재 도메인:', window.location.origin);
                          try {
                            console.error('이미지 도메인:', new URL(ev.thumbnail).origin);
                          } catch (urlError) {
                            console.error('URL 파싱 실패:', urlError);
                          }

                          // 이미지 로딩 실패 시 빈 div로 대체
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const fallbackDiv = document.createElement('div');
                            fallbackDiv.style.cssText = `
                            width: 40px;
                            height: 28px;
                            background: #f0f0f0;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 10px;
                            color: #999;
                          `;
                            fallbackDiv.textContent = 'X';
                            parent.appendChild(fallbackDiv);
                          }
                        }}
                        onLoad={() => {}}
                      />
                    ) : (
                      <div
                        style={{
                          width: 40,
                          height: 28,
                          background: '#eee',
                          border: '1px solid #ddd',
                          borderRadius: 4,
                        }}
                      />
                    )}
                  </td>
                  <td>
                    <a
                      href={ev.uri}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate"
                      title={ev.title}
                      style={{
                        color: '#000',
                        textDecoration: 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.textDecoration = 'underline';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.textDecoration = 'none';
                      }}
                    >
                      {ev.title}
                    </a>
                  </td>
                  <td>{ev.host.id}</td>
                  <td>
                    {((): string => {
                      switch (ev.eventType) {
                        case EventType.CONFERENCE:
                          return '컨퍼런스/학술대회';
                        case EventType.SEMINAR:
                          return '세미나';
                        case EventType.WEBINAR:
                          return '웨비나';
                        case EventType.WORKSHOP:
                          return '워크숍';
                        case EventType.CONTEST:
                          return '공모전';
                        case EventType.CONTINUING_EDUCATION:
                          return '보수교육';
                        case EventType.EDUCATION:
                          return '교육';
                        case EventType.VOLUNTEER:
                          return '봉사';
                        case EventType.TRAINING:
                          return '연수';
                        case EventType.ETC:
                        default:
                          return '기타';
                      }
                    })()}
                  </td>
                  <td>{formatStatus(ev.eventStatus)}</td>
                  <td>{formatStatusGroup(ev.eventStatusGroup)}</td>
                  <td>{formatDateTime(ev.recruitmentStartAt)}</td>
                  <td>{formatDateTime(ev.recruitmentEndAt)}</td>
                  <td>{formatDateTime(ev.startAt)}</td>
                  <td>{formatDateTime(ev.endAt)}</td>
                  <td>{ev.viewCount}</td>
                  <td style={{ textAlign: 'center' }}>
                    {approveMode ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await approveSelected([ev.id]);
                        }}
                        disabled={approvingIds.has(ev.id)}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid var(--primary)',
                          borderRadius: 4,
                          background: approvingIds.has(ev.id) ? '#94a3b8' : 'var(--primary)',
                          color: 'white',
                          cursor: approvingIds.has(ev.id) ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        {approvingIds.has(ev.id) ? '승인중' : '승인'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onEditEvent?.(ev)}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid var(--primary)',
                          borderRadius: 4,
                          background: 'white',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        수정
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 무한 스크롤 트리거 - 테이블 맨 아래에 위치 */}
        <div ref={observerRef} style={{ height: '1px', margin: 0 }} />
      </div>

      {/* 로딩 스피너 */}
      {loading && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              border: '2px solid #f3f3f3',
              borderTop: '2px solid var(--primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      )}
    </div>
  );
}
