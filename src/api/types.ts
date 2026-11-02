// API 타입 및 enum 정의

export enum EventType {
  CONFERENCE = "CONFERENCE",
  SEMINAR = "SEMINAR",
  WEBINAR = "WEBINAR",
  WORKSHOP = "WORKSHOP",
  CONTEST = "CONTEST",
  CONTINUING_EDUCATION = "CONTINUING_EDUCATION",
  EDUCATION = "EDUCATION",
  VOLUNTEER = "VOLUNTEER",
  TRAINING = "TRAINING",
  SUPPORTERS = "SUPPORTERS",
  ETC = "ETC",
}

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  [EventType.CONFERENCE]: "컨퍼런스/학술대회",
  [EventType.SEMINAR]: "세미나",
  [EventType.WEBINAR]: "웨비나",
  [EventType.WORKSHOP]: "워크숍",
  [EventType.CONTEST]: "공모전",
  [EventType.CONTINUING_EDUCATION]: "보수교육",
  [EventType.EDUCATION]: "교육",
  [EventType.VOLUNTEER]: "봉사",
  [EventType.TRAINING]: "연수",
  [EventType.SUPPORTERS]: "서포터즈",
  [EventType.ETC]: "기타",
};

export enum PaginationField {
  ID = "ID",
  NAME = "NAME",
  START_DATE = "START_DATE",
  RECRUITMENT_DEADLINE = "RECRUITMENT_DEADLINE",
  VIEW_COUNT = "VIEW_COUNT",
  CREATED_AT = "CREATED_AT",
}

export enum SortDirection {
  ASC = "ASC",
  DESC = "DESC",
}

// V2 이벤트 상태
export enum EventStatus {
  FINISHED = "FINISHED",
  ACTIVE = "ACTIVE",
  EVENT_WAITING = "EVENT_WAITING",
  RECRUITING = "RECRUITING",
  RECRUITMENT_WAITING = "RECRUITMENT_WAITING",
  PENDING = "PENDING",
}

export enum EventStatusGroup {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

export interface HostResponse {
  id: number;
  name: string;
  thumbnail: string | null;
}

export interface EventResponse {
  id: number;
  title: string;
  startAt: string;
  endAt: string | null;
  recruitmentStartAt: string | null;
  recruitmentEndAt: string | null;
  uri: string;
  thumbnail: string | null;
  eventType: EventType;
  eventStatus?: EventStatus;
  eventStatusGroup?: EventStatusGroup;
  isApproved?: boolean;
  host: HostResponse;
  // 전체 주최 목록 (첫 번째가 host). 다중 주최 이전 API 에는 없음
  hosts?: HostResponse[];
  viewCount: number;
  isBookmarked: boolean;
  supporters?: number;
}

export interface PageInfo {
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
}

export interface EventListResponse {
  content: EventResponse[];
  pageInfo: PageInfo;
}

// V2 커서 기반 페이지 정보
export interface CursorPageInfo {
  hasNext: boolean;
  nextCursor: string | null;
  pageSize: number;
}

export interface CursorEventListResponse {
  content: EventResponse[];
  pageInfo: CursorPageInfo;
}

export interface EventListParams {
  page?: number;
  size?: number;
  sortDirection?: SortDirection;
  field?: PaginationField;
  isApproved?: boolean;
  includeFinished?: boolean;
  isBookmarked?: boolean;
  type?: EventType[];
  hostId?: number;
  searchKeyword?: string;
}

// V2 커서 기반 파라미터
export interface CursorEventListParams {
  cursor?: string | null;
  size?: number;
  field?: PaginationField;
  types?: EventType[];
  status?: EventStatus;
  statusGroup?: EventStatusGroup;
  bookmarked?: boolean;
  searchKeyword?: string;
  hostId?: number;
}

export interface HostListResponse {
  content: HostResponse[];
  pageInfo: PageInfo;
}

export interface HostListParams {
  page?: number;
  size?: number;
  sortDirection?: SortDirection;
  field: PaginationField; // e.g., NAME
}

// 사용자
export interface AlarmSettings {
  push: boolean;
  bookmark: boolean;
  calendar: boolean;
  marketing: boolean;
}

export interface UserResponse {
  id: number;
  email: string;
  nickname: string;
  providerId: string;
  autoAddBookmarkToCalendar: boolean;
  alarmSettings: AlarmSettings;
}

export interface UserListResponse {
  content: UserResponse[];
  pageInfo: PageInfo;
}

export interface UserListParams {
  page?: number;
  size?: number;
  sortDirection?: SortDirection;
  field?: PaginationField;
}
