import React, { useState, useEffect } from "react";
import { EventType, EventResponse, HostResponse } from "../api/types";
import { getAllHosts } from "../api/hostsClient";

interface EventFormData {
  title: string;
  startAt: string;
  endAt: string | null;
  recruitmentStartAt: string | null;
  recruitmentEndAt: string | null;
  uri: string;
  eventType: EventType;
  hostMode: "select" | "create"; // 주최기관 선택 방식
  hostId: number; // 기존 주최기관 선택 시
  hostName: string; // 새 주최기관 생성 시
  eventThumbnail: File | null;
  hostThumbnail: File | null;
  deleteEventThumbnail: boolean;
  deleteHostThumbnail: boolean;
}

interface UpdateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventId: number, formData: FormData) => Promise<void>;
  eventData: EventResponse | null;
}

export default function UpdateEventModal({
  isOpen,
  onClose,
  onSubmit,
  eventData,
}: UpdateEventModalProps) {
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    startAt: "",
    endAt: null,
    recruitmentStartAt: null,
    recruitmentEndAt: null,
    uri: "",
    eventType: EventType.CONFERENCE,
    hostMode: "select",
    hostId: 0,
    hostName: "",
    eventThumbnail: null,
    hostThumbnail: null,
    deleteEventThumbnail: false,
    deleteHostThumbnail: false,
  });

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
        console.error("주최기관 목록 로드 실패:", error);
        alert("주최기관 목록을 불러오는데 실패했습니다.");
      } finally {
        setLoadingHosts(false);
      }
    };

    loadHosts();
  }, [isOpen]);

  // 이벤트 데이터가 변경될 때 폼 데이터 업데이트
  useEffect(() => {
    if (eventData) {
      setFormData({
        title: eventData.title,
        startAt: eventData.startAt,
        endAt: eventData.endAt,
        recruitmentStartAt: eventData.recruitmentStartAt,
        recruitmentEndAt: eventData.recruitmentEndAt,
        uri: eventData.uri,
        eventType: eventData.eventType,
        hostMode: "select",
        hostId: eventData.host.id,
        hostName: "",
        eventThumbnail: null, // 새로 업로드할 파일
        hostThumbnail: null, // 새로 업로드할 파일
        deleteEventThumbnail: false,
        deleteHostThumbnail: false,
      });
    }
  }, [eventData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const { name, value, type } = target;

    // 체크박스는 boolean으로 처리
    if (type === "checkbox") {
      const checked = (target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "hostId"
          ? Number(value)
          : name === "hostMode"
          ? (value as "select" | "create")
          : name === "eventType"
          ? (value as EventType)
          : value === ""
          ? null
          : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files?.[0] || null,
      // 새로운 파일을 선택하면 삭제 플래그는 자동으로 해제
      ...(name === "eventThumbnail" ? { deleteEventThumbnail: false } : {}),
      ...(name === "hostThumbnail" ? { deleteHostThumbnail: false } : {}),
    }));
  };

  const validateDates = (): boolean => {
    const start = new Date(formData.startAt);
    const end = formData.endAt ? new Date(formData.endAt) : null;
    const recruitmentStart = formData.recruitmentStartAt
      ? new Date(formData.recruitmentStartAt)
      : null;
    const recruitmentEnd = formData.recruitmentEndAt
      ? new Date(formData.recruitmentEndAt)
      : null;

    if (end && start >= end) {
      alert("행사 종료일은 시작일보다 늦어야 합니다.");
      return false;
    }

    if (
      recruitmentStart &&
      recruitmentEnd &&
      recruitmentStart >= recruitmentEnd
    ) {
      alert("모집 종료일은 모집 시작일보다 늦어야 합니다.");
      return false;
    }

    if (recruitmentEnd && start && recruitmentEnd >= start) {
      alert("모집 종료일은 행사 시작일보다 빨라야 합니다.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!eventData) return;

    if (!validateDates()) {
      return;
    }

    // 파일 크기 및 타입 검증
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif"];

    if (formData.eventThumbnail && formData.eventThumbnail.size > 0) {
      if (formData.eventThumbnail.size > MAX_FILE_SIZE) {
        alert("행사 썸네일 파일 크기는 10MB를 초과할 수 없습니다.");
        return;
      }
      if (!ALLOWED_TYPES.includes(formData.eventThumbnail.type)) {
        alert("행사 썸네일은 JPG, PNG, GIF 파일만 업로드 가능합니다.");
        return;
      }
    }

    if (formData.hostThumbnail && formData.hostThumbnail.size > 0) {
      if (formData.hostThumbnail.size > MAX_FILE_SIZE) {
        alert("주최기관 로고 파일 크기는 10MB를 초과할 수 없습니다.");
        return;
      }
      if (!ALLOWED_TYPES.includes(formData.hostThumbnail.type)) {
        alert("주최기관 로고는 JPG, PNG, GIF 파일만 업로드 가능합니다.");
        return;
      }
    }

    // FormData 생성
    const submitData = new FormData();

    // JSON 데이터 추가
    const eventUpdateData = {
      title: formData.title,
      startAt: formData.startAt,
      endAt: formData.endAt,
      recruitmentStartAt: formData.recruitmentStartAt,
      recruitmentEndAt: formData.recruitmentEndAt,
      uri: formData.uri,
      eventType: formData.eventType,
      ...(formData.hostMode === "select"
        ? { hostId: formData.hostId }
        : { hostName: formData.hostName }),
      deleteEventThumbnail: formData.deleteEventThumbnail,
      deleteHostThumbnail: formData.deleteHostThumbnail,
    };

    submitData.append("data", JSON.stringify(eventUpdateData));

    // 파일 추가 (새로 업로드한 파일만)
    if (formData.eventThumbnail) {
      submitData.append("eventThumbnail", formData.eventThumbnail);
    }
    // 새 주최기관 생성 시에만 주최기관 로고 업로드 가능
    if (formData.hostMode === "create" && formData.hostThumbnail) {
      submitData.append("hostThumbnail", formData.hostThumbnail);
    }

    setIsSubmitting(true);
    try {
      await onSubmit(eventData.id, submitData);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !eventData) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}>
            행사 수정
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-disabled={isSubmitting}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              color: isSubmitting ? "#9ca3af" : "#666",
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-grid-2" style={{ marginBottom: 20 }}>
            {/* 행사 제목 */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                htmlFor="update-event-title"
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                행사 제목 *
              </label>
              <input
                id="update-event-title"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* 행사 시작일 */}
            <div>
              <label
                htmlFor="update-event-start-at"
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                행사 시작일 *
              </label>
              <input
                id="update-event-start-at"
                type="datetime-local"
                name="startAt"
                value={formData.startAt}
                onChange={handleInputChange}
                required
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: "border-box",
                  minWidth: "200px",
                }}
              />
            </div>

            {/* 행사 종료일 */}
            <div>
              <label
                htmlFor="update-event-end-at"
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                행사 종료일
              </label>
              <input
                id="update-event-end-at"
                type="datetime-local"
                name="endAt"
                value={formData.endAt || ""}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: "border-box",
                  minWidth: "200px",
                }}
              />
            </div>

            {/* 모집 시작일 */}
            <div>
              <label
                htmlFor="update-event-recruitment-start-at"
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                모집 시작일
              </label>
              <input
                id="update-event-recruitment-start-at"
                type="datetime-local"
                name="recruitmentStartAt"
                value={formData.recruitmentStartAt || ""}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: "border-box",
                  minWidth: "200px",
                }}
              />
            </div>

            {/* 모집 종료일 */}
            <div>
              <label
                htmlFor="update-event-recruitment-end-at"
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                모집 종료일
              </label>
              <input
                id="update-event-recruitment-end-at"
                type="datetime-local"
                name="recruitmentEndAt"
                value={formData.recruitmentEndAt || ""}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: "border-box",
                  minWidth: "200px",
                }}
              />
            </div>

            {/* 행사 URL */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                htmlFor="update-event-uri"
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                행사 URL *
              </label>
              <input
                id="update-event-uri"
                type="url"
                name="uri"
                value={formData.uri}
                onChange={handleInputChange}
                required
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* 행사 유형 */}
            <div>
              <label
                htmlFor="update-event-type"
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                행사 유형 *
              </label>
              <select
                id="update-event-type"
                name="eventType"
                value={formData.eventType}
                onChange={handleInputChange}
                required
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              >
                <option value={EventType.CONFERENCE}>컨퍼런스/학술대회</option>
                <option value={EventType.SEMINAR}>세미나</option>
                <option value={EventType.WEBINAR}>웨비나</option>
                <option value={EventType.WORKSHOP}>워크숍</option>
                <option value={EventType.CONTEST}>공모전</option>
                <option value={EventType.CONTINUING_EDUCATION}>보수교육</option>
                <option value={EventType.EDUCATION}>교육</option>
                <option value={EventType.VOLUNTEER}>봉사</option>
                <option value={EventType.TRAINING}>연수</option>
                <option value={EventType.ETC}>기타</option>
              </select>
            </div>

            {/* 주최기관 선택 방식 */}
            <div style={{ gridColumn: "1 / -1" }}>
              <div
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                주최기관 *
              </div>
              <div
                style={{ display: "flex", gap: "12px", marginBottom: "12px" }}
              >
                <label
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <input
                    type="radio"
                    name="hostMode"
                    value="select"
                    checked={formData.hostMode === "select"}
                    onChange={(e) => handleInputChange(e)}
                  />
                  기존 주최기관 선택
                </label>
                <label
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <input
                    type="radio"
                    name="hostMode"
                    value="create"
                    checked={formData.hostMode === "create"}
                    onChange={(e) => handleInputChange(e)}
                  />
                  새 주최기관 생성
                </label>
              </div>

              {/* 기존 주최기관 선택 */}
              {formData.hostMode === "select" && (
                <select
                  id="update-event-host-id"
                  name="hostId"
                  value={formData.hostId}
                  onChange={(e) => handleInputChange(e)}
                  required
                  disabled={loadingHosts}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: 6,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                >
                  <option value={0}>
                    {loadingHosts ? "로딩 중..." : "주최기관을 선택하세요"}
                  </option>
                  {hosts.map((host) => (
                    <option key={host.id} value={host.id}>
                      {host.name}
                    </option>
                  ))}
                </select>
              )}

              {/* 새 주최기관 생성 */}
              {formData.hostMode === "create" && (
                <input
                  id="update-event-host-name"
                  type="text"
                  name="hostName"
                  value={formData.hostName}
                  onChange={(e) => handleInputChange(e)}
                  placeholder="새 주최기관명을 입력하세요"
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: 6,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              )}
            </div>

            {/* 행사 썸네일 */}
            <div>
              <label
                htmlFor="update-event-thumbnail"
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                행사 썸네일
              </label>
              <input
                id="update-event-thumbnail"
                type="file"
                name="eventThumbnail"
                accept="image/jpeg,image/jpg,image/png,image/gif"
                onChange={handleFileChange}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: "border-box",
                  lineHeight: "34px",
                }}
              />
              {eventData.thumbnail && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                  현재 썸네일: {eventData.thumbnail.split("/").pop()}
                </div>
              )}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 8,
                  fontSize: 13,
                }}
              >
                <input
                  type="checkbox"
                  name="deleteEventThumbnail"
                  checked={formData.deleteEventThumbnail}
                  onChange={handleInputChange}
                />
                행사 썸네일 삭제
              </label>
            </div>

            {/* 새 주최기관 생성 시에만 주최기관 로고 업로드 표시 */}
            {formData.hostMode === "create" && (
              <div>
                <label
                  htmlFor="update-event-host-thumbnail"
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontSize: 14,
                    fontWeight: "500",
                  }}
                >
                  주최 기관 로고
                </label>
                <input
                  id="update-event-host-thumbnail"
                  type="file"
                  name="hostThumbnail"
                  accept="image/jpeg,image/jpg,image/png,image/gif"
                  onChange={handleFileChange}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: 6,
                    fontSize: 14,
                    boxSizing: "border-box",
                    lineHeight: "34px",
                  }}
                />
                {eventData.host.thumbnail && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                    현재 로고: {eventData.host.thumbnail.split("/").pop()}
                  </div>
                )}
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 8,
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    name="deleteHostThumbnail"
                    checked={formData.deleteHostThumbnail}
                    onChange={handleInputChange}
                  />
                  주최 기관 로고 삭제
                </label>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "flex-end",
              marginTop: 24,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              aria-disabled={isSubmitting}
              style={{
                padding: "10px 20px",
                border: "1px solid #ddd",
                borderRadius: 6,
                background: "white",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: "500",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              style={{
                padding: "10px 20px",
                border: "none",
                borderRadius: 6,
                background: isSubmitting ? "#9ca3af" : "var(--primary)",
                color: "white",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: "500",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {isSubmitting && (
                <span
                  aria-hidden="true"
                  style={{
                    width: "14px",
                    height: "14px",
                    border: "2px solid rgba(255, 255, 255, 0.45)",
                    borderTop: "2px solid #ffffff",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
              )}
              <span>{isSubmitting ? "수정 중..." : "수정"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
