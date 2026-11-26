/**
 * TypeScript mirror of docs/06-api-reference.md.
 * No shape here may be invented for production paths; every field corresponds to
 * a documented resource, request body or error envelope.
 */

export type GameStatus = "draft" | "published" | "disabled" | "archived";
export type UploadStatus = "pending" | "processing" | "published" | "failed";
export type EventType = "start" | "end" | "score" | "level_complete" | "custom";
export type Orientation = "landscape" | "portrait" | "any";
export type SortOption = "popular" | "newest" | "title";
export type UserRole = "admin" | "player";

export interface NamedRef {
  id: number;
  name: string;
  slug: string;
}

export interface Category extends NamedRef {
  description: string | null;
  icon: string | null;
  game_count: number;
  /** Admin listing includes inactive categories and their ordering. */
  is_active?: boolean;
  sort_order?: number;
}

export interface Tag extends NamedRef {
  game_count: number;
}

export interface GameLicense {
  name: string | null;
  url: string | null;
  attribution: string | null;
}

/** Allowlisted keys from config/game-settings.schema.json. */
export interface GameSettings {
  requireFullscreen?: boolean;
  backgroundColor?: string;
  publisherId?: string;
  customCss?: string;
  muteByDefault?: boolean;
  showFps?: boolean;
  controlsHint?: string;
  targetScore?: number;
}

export interface GameResource {
  id: number;
  uuid: string;
  title: string;
  slug: string;
  description: string | null;
  instructions: string | null;
  category: NamedRef | null;
  tags: NamedRef[];
  thumbnail_url: string | null;
  status: GameStatus;
  featured: boolean;
  orientation: Orientation;
  width: number | null;
  height: number | null;
  version: string;
  developer: string | null;
  release_year: number | null;
  license: GameLicense;
  settings: GameSettings;
  player_url: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GameFile {
  id: number;
  path: string;
  mime: string;
  size: number;
  is_entry: boolean;
}

export interface GameUpload {
  id: number;
  game_id: number;
  status: UploadStatus;
  original_filename: string;
  error_message: string | null;
  file_count: number;
  total_size: number;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminGame extends GameResource {
  entry_file: string | null;
  deleted_at: string | null;
  uploads: GameUpload[];
  files: GameFile[];
  created_by: number | null;
  updated_by: number | null;
}

export interface PaginatorLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export interface PaginatorMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  total: number;
}

export interface Paginator<T> {
  data: T[];
  links: PaginatorLinks;
  meta: PaginatorMeta;
}

export interface HealthResponse {
  status: "ok";
  version: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  user: AdminUser;
}

export interface GameSession {
  id: number;
  session_token: string;
  started_at: string;
}

export interface SessionSummary extends GameSession {
  game_id: number;
  ended_at: string | null;
  duration_seconds: number;
  referrer: string | null;
}

export interface CreateSessionRequest {
  referrer?: string;
}

export interface PatchSessionRequest {
  duration_seconds: number;
  ended_at: string;
}

export interface GameEventRequest {
  type: EventType;
  metadata: JsonObject;
  occurred_at: string;
}

export interface GameEventResponse {
  id: number;
  type: EventType;
  occurred_at: string;
}

export interface TimeSeriesPoint {
  date: string;
  plays: number;
}

export interface TopGame {
  id: number;
  title: string;
  plays: number;
}

export interface AnalyticsOverview {
  plays: number;
  unique_players: number;
  sessions: number;
  avg_duration_seconds: number;
  timeseries: TimeSeriesPoint[];
  top_games: TopGame[];
}

export interface RecentEvent {
  id: number;
  type: EventType;
  metadata: JsonObject;
  occurred_at: string;
}

/** Per-game analytics: the overview metrics scoped to one game. */
export interface GameAnalytics {
  game: NamedRef & { title: string };
  plays: number;
  unique_players: number;
  sessions: number;
  avg_duration_seconds: number;
  timeseries: TimeSeriesPoint[];
  recent_events: RecentEvent[];
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  subject_type: string;
  subject_id: number | null;
  metadata: JsonObject;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = Record<string, JsonValue>;

export type FieldErrors = Record<string, string[]>;

export interface ApiErrorEnvelope {
  message: string;
  errors?: FieldErrors;
  code?: string;
}

export interface MessageResponse<T = undefined> {
  message: string;
  data: T;
}

export interface GamePayload {
  title?: string;
  slug?: string;
  description?: string | null;
  instructions?: string | null;
  category_id?: number | null;
  tag_ids?: number[];
  orientation?: Orientation;
  width?: number | null;
  height?: number | null;
  version?: string;
  developer?: string | null;
  release_year?: number | null;
  license_name?: string | null;
  license_url?: string | null;
  attribution?: string | null;
  featured?: boolean;
  settings?: GameSettings;
  thumbnail?: Blob;
}

export interface CategoryPayload {
  name: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export interface TagPayload {
  name: string;
  slug?: string;
}

export interface GameQuery {
  q?: string;
  category?: string;
  tag?: string;
  sort?: SortOption;
  per_page?: number;
  page?: number;
}

export interface AdminGameQuery {
  status?: GameStatus;
  q?: string;
  category?: string;
  per_page?: number;
  page?: number;
}

export interface AuditQuery {
  per_page?: number;
  page?: number;
}

export interface AnalyticsQuery {
  days?: 7 | 30 | 90;
}
