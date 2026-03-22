import React, { useState, useEffect } from 'react';
import { EventType, HostResponse } from '../api/types';
import { getAllHosts } from '../api/hostsClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
}

interface EventFormData {
  title: string;
  startAt: string;
  endAt: string | null; // null 허용
  recruitmentStartAt: string | null; // null 허용
  recruitmentEndAt: string | null; // null 허용
  uri: string;
  eventType: EventType;
  hostMode: 'select' | 'create'; // 주최기관 선택 방식
  hostId: number; // 기존 주최기관 선택 시
  hostName: string; // 새 주최기관 생성 시
  eventThumbnail?: File;
  hostThumbnail?: File;
}

const EVENT_TYPE_OPTIONS = [
  { value: EventType.CONFERENCE, label: '컨퍼런스/학술대회' },
  { value: EventType.SEMINAR, label: '세미나' },
  { value: EventType.WEBINAR, label: '웨비나' },
  { value: EventType.WORKSHOP, label: '워크숍' },
  { value: EventType.CONTEST, label: '공모전' },
  { value: EventType.CONTINUING_EDUCATION, label: '보수교육' },
  { value: EventType.EDUCATION, label: '교육' },
  { value: EventType.VOLUNTEER, label: '봉사' },
  { value: EventType.TRAINING, label: '연수' },
  { value: EventType.ETC, label: '기타' },
];

export default function CreateEventModal({ isOpen, onClose, onSubmit }: Props) {
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    startAt: '',
    endAt: null, // null로 초기화
    recruitmentStartAt: null, // null로 초기화
    recruitmentEndAt: null, // null로 초기화
    uri: '',
    eventType: EventType.CONFERENCE,
    hostMode: 'select',
    hostId: 0,
    hostName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hosts, setHosts] = useState<HostResponse[]>([]);
  const [loadingHosts, setLoadingHosts] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 주최기관 목록 로드
  useEffect(() => {
    const loadHosts = async () => {
      if (!isOpen) return;

      setLoadingHosts(true);
      try {
        const hostList = await getAllHosts();
        setHosts(hostList);
      } catch (error) {
        console.error('주최기관 목록 로드 실패:', error);
        alert('주최기관 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoadingHosts(false);
      }
    };

    loadHosts();
  }, [isOpen]);

  const validateDates = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 모집 시작일 < 모집 종료일
    if (formData.recruitmentStartAt && formData.recruitmentEndAt) {
      if (new Date(formData.recruitmentStartAt) >= new Date(formData.recruitmentEndAt)) {
        newErrors.recruitmentEndAt = '모집 종료일은 모집 시작일보다 늦어야 합니다';
      }
    }

    // 행사 시작일 < 행사 종료일
    if (formData.startAt && formData.endAt) {
      if (new Date(formData.startAt) >= new Date(formData.endAt)) {
        newErrors.endAt = '행사 종료일은 행사 시작일보다 늦어야 합니다';
      }
    }

    // 모집 종료일 < 행사 시작일
    if (formData.recruitmentEndAt && formData.startAt) {
      if (new Date(formData.recruitmentEndAt) >= new Date(formData.startAt)) {
        newErrors.startAt = '행사 시작일은 모집 종료일보다 늦어야 합니다';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!validateDates()) {
      return;
    }

    // 파일 크기 및 타입 검증
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

    if (formData.eventThumbnail && formData.eventThumbnail.size > 0) {
      if (formData.eventThumbnail.size > MAX_FILE_SIZE) {
        alert('행사 썸네일 파일 크기는 10MB를 초과할 수 없습니다.');
        return;
      }
      if (!ALLOWED_TYPES.includes(formData.eventThumbnail.type)) {
        alert('행사 썸네일은 JPG, PNG, GIF 파일만 업로드 가능합니다.');
        return;
      }
    }

    if (formData.hostThumbnail && formData.hostThumbnail.size > 0) {
      if (formData.hostThumbnail.size > MAX_FILE_SIZE) {
        alert('주최기관 로고 파일 크기는 10MB를 초과할 수 없습니다.');
        return;
      }
      if (!ALLOWED_TYPES.includes(formData.hostThumbnail.type)) {
        alert('주최기관 로고는 JPG, PNG, GIF 파일만 업로드 가능합니다.');
        return;
      }
    }

    const submitData = new FormData();

    // JSON 데이터를 "data" 키로 추가 (백엔드 @RequestPart("data")와 매칭)
    submitData.append(
      'data',
      JSON.stringify({
        title: formData.title,
        startAt: formData.startAt,
        endAt: formData.endAt,
        recruitmentStartAt: formData.recruitmentStartAt,
        recruitmentEndAt: formData.recruitmentEndAt,
        uri: formData.uri,
        eventType: formData.eventType,
        ...(formData.hostMode === 'select' ? { hostId: formData.hostId } : { hostName: formData.hostName }),
      })
    );

    // 파일이 실제로 선택되었을 때만 추가 (백엔드 @RequestPart와 매칭)
    if (formData.eventThumbnail && formData.eventThumbnail.size > 0) {
      submitData.append('eventThumbnail', formData.eventThumbnail);
    }
    // 새 주최기관 생성 시에만 주최기관 로고 업로드 가능
    if (formData.hostMode === 'create' && formData.hostThumbnail && formData.hostThumbnail.size > 0) {
      submitData.append('hostThumbnail', formData.hostThumbnail);
    }

    setIsSubmitting(true);
    try {
      await onSubmit(submitData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof EventFormData, value: string | File) => {
    let processedValue: string | File | null | number = value;
    // 날짜/시간 필드가 비어있으면 null로 처리
    if (typeof value === 'string' && (field === 'endAt' || field === 'recruitmentStartAt' || field === 'recruitmentEndAt')) {
      processedValue = value === '' ? null : value;
    }
    // hostId 필드는 숫자로 변환
    if (field === 'hostId' && typeof value === 'string') {
      processedValue = Number(value);
    }
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    // 해당 필드의 에러 제거
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>행사 생성</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: isSubmitting ? '#9ca3af' : '#666',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '16px' }}>
            {/* 제목 */}
            <div>
              <label
                htmlFor="create-event-title"
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '500',
                  fontSize: '14px',
                }}
              >
                제목 *
              </label>
              <input
                id="create-event-title"
                type="text"
                value={formData.title}
                onChange={e => handleInputChange('title', e.target.value)}
                className="input"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>

            {/* 행사 시작일/종료일 */}
            <div className="modal-grid-2" style={{ gap: '20px' }}>
              <div style={{ minWidth: '0' }}>
                <label
                  htmlFor="create-event-start-at"
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: '500',
                    fontSize: '14px',
                  }}
                >
                  행사 시작일 *
                </label>
                <input
                  id="create-event-start-at"
                  type="datetime-local"
                  value={formData.startAt}
                  onChange={e => handleInputChange('startAt', e.target.value)}
                  className="input"
                  style={{
                    width: '100%',
                    minWidth: '200px',
                    boxSizing: 'border-box',
                  }}
                  required
                />
                {errors.startAt && (
                  <div
                    style={{
                      color: '#dc2626',
                      fontSize: '12px',
                      marginTop: '4px',
                    }}
                  >
                    {errors.startAt}
                  </div>
                )}
              </div>
              <div style={{ minWidth: '0' }}>
                <label
                  htmlFor="create-event-end-at"
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: '500',
                    fontSize: '14px',
                  }}
                >
                  행사 종료일
                </label>
                <input
                  id="create-event-end-at"
                  type="datetime-local"
                  value={formData.endAt || ''} // null일 경우 빈 문자열
                  onChange={e => handleInputChange('endAt', e.target.value)}
                  className="input"
                  style={{
                    width: '100%',
                    minWidth: '200px',
                    boxSizing: 'border-box',
                  }}
                  // required 속성 제거
                />
                {errors.endAt && (
                  <div
                    style={{
                      color: '#dc2626',
                      fontSize: '12px',
                      marginTop: '4px',
                    }}
                  >
                    {errors.endAt}
                  </div>
                )}
              </div>
            </div>

            {/* 모집 시작일/종료일 */}
            <div className="modal-grid-2" style={{ gap: '20px' }}>
              <div style={{ minWidth: '0' }}>
                <label
                  htmlFor="create-event-recruitment-start-at"
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: '500',
                    fontSize: '14px',
                  }}
                >
                  모집 시작일
                </label>
                <input
                  id="create-event-recruitment-start-at"
                  type="datetime-local"
                  value={formData.recruitmentStartAt || ''} // null일 경우 빈 문자열
                  onChange={e => handleInputChange('recruitmentStartAt', e.target.value)}
                  className="input"
                  style={{
                    width: '100%',
                    minWidth: '200px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ minWidth: '0' }}>
                <label
                  htmlFor="create-event-recruitment-end-at"
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: '500',
                    fontSize: '14px',
                  }}
                >
                  모집 종료일
                </label>
                <input
                  id="create-event-recruitment-end-at"
                  type="datetime-local"
                  value={formData.recruitmentEndAt || ''} // null일 경우 빈 문자열
                  onChange={e => handleInputChange('recruitmentEndAt', e.target.value)}
                  className="input"
                  style={{
                    width: '100%',
                    minWidth: '200px',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.recruitmentEndAt && (
                  <div
                    style={{
                      color: '#dc2626',
                      fontSize: '12px',
                      marginTop: '4px',
                    }}
                  >
                    {errors.recruitmentEndAt}
                  </div>
                )}
              </div>
            </div>

            {/* 행사 URL */}
            <div>
              <label
                htmlFor="create-event-uri"
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '500',
                  fontSize: '14px',
                }}
              >
                행사 URL *
              </label>
              <input
                id="create-event-uri"
                type="url"
                value={formData.uri}
                onChange={e => handleInputChange('uri', e.target.value)}
                className="input"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                placeholder="https://example.com/event"
                required
              />
            </div>

            {/* 행사 유형 */}
            <div>
              <label
                htmlFor="create-event-type"
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '500',
                  fontSize: '14px',
                }}
              >
                행사 유형 *
              </label>
              <select
                id="create-event-type"
                value={formData.eventType}
                onChange={e => handleInputChange('eventType', e.target.value as EventType)}
                className="select"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                required
              >
                {EVENT_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 주최기관 선택 방식 */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '500',
                  fontSize: '14px',
                }}
              >
                주최기관 *
              </div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="radio" name="hostMode" value="select" checked={formData.hostMode === 'select'} onChange={e => handleInputChange('hostMode', e.target.value)} />
                  기존 주최기관 선택
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="radio" name="hostMode" value="create" checked={formData.hostMode === 'create'} onChange={e => handleInputChange('hostMode', e.target.value)} />새 주최기관 생성
                </label>
              </div>

              {/* 기존 주최기관 선택 */}
              {formData.hostMode === 'select' && (
                <select
                  id="create-event-host-id"
                  value={formData.hostId}
                  onChange={e => handleInputChange('hostId', e.target.value)}
                  className="select"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                  required
                  disabled={loadingHosts}
                >
                  <option value={0}>{loadingHosts ? '로딩 중...' : '주최기관을 선택하세요'}</option>
                  {hosts.map(host => (
                    <option key={host.id} value={host.id}>
                      {host.name}
                    </option>
                  ))}
                </select>
              )}

              {/* 새 주최기관 생성 */}
              {formData.hostMode === 'create' && (
                <input
                  id="create-event-host-name"
                  type="text"
                  value={formData.hostName}
                  onChange={e => handleInputChange('hostName', e.target.value)}
                  placeholder="새 주최기관명을 입력하세요"
                  className="input"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              )}
            </div>

            {/* 파일 업로드 */}
            <div className="modal-grid-2" style={{ gap: '20px' }}>
              <div style={{ minWidth: '0' }}>
                <label
                  htmlFor="create-event-thumbnail"
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: '500',
                    fontSize: '14px',
                  }}
                >
                  행사 썸네일
                </label>
                <input
                  id="create-event-thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={e => handleInputChange('eventThumbnail', e.target.files?.[0] || new File([], ''))}
                  className="input"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    lineHeight: '34px',
                  }}
                />
              </div>
              {/* 새 주최기관 생성 시에만 주최기관 로고 업로드 표시 */}
              {formData.hostMode === 'create' && (
                <div style={{ minWidth: '0' }}>
                  <label
                    htmlFor="create-event-host-thumbnail"
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontWeight: '500',
                      fontSize: '14px',
                    }}
                  >
                    주최기관 로고
                  </label>
                  <input
                    id="create-event-host-thumbnail"
                    type="file"
                    accept="image/*"
                    onChange={e => handleInputChange('hostThumbnail', e.target.files?.[0] || new File([], ''))}
                    className="input"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      lineHeight: '34px',
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 버튼 */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginTop: '20px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn"
              disabled={isSubmitting}
              aria-disabled={isSubmitting}
              style={{
                cursor: isSubmitting ? 'not-allowed' : undefined,
                opacity: isSubmitting ? 0.7 : undefined,
              }}
            >
              취소
            </button>
            <button
              type="submit"
              className="btn primary"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              style={{
                background: isSubmitting ? '#9ca3af' : undefined,
                borderColor: isSubmitting ? '#9ca3af' : undefined,
                cursor: isSubmitting ? 'not-allowed' : undefined,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isSubmitting && (
                <span
                  aria-hidden="true"
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255, 255, 255, 0.45)',
                    borderTop: '2px solid #ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
              )}
              <span>{isSubmitting ? '생성 중...' : '생성'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
