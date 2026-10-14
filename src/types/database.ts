export type UserRole = 'user' | 'moderator' | 'admin';
export type LanguageRelationType = 'native' | 'learning';
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'native';
export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';
export type ConversationMode = 'free' | 'guided';
export type MessageContentType = 'text' | 'voice' | 'correction' | 'system_prompt';
export type MessageDeliveryStatus = 'sent' | 'delivered' | 'read';
export type ReportReasonCategory =
  | 'spam'
  | 'harassment'
  | 'inappropriate_content'
  | 'underage_suspicion'
  | 'scam_or_commercial'
  | 'hate_speech'
  | 'other';
export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';
export type CallType = 'audio' | 'video';
export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed' | 'failed';
export type NotificationType =
  | 'conversation_request'
  | 'request_accepted'
  | 'new_message'
  | 'incoming_call'
  | 'missed_call'
  | 'grammar_correction'
  | 'moderation_notice'
  | 'system';

export interface AvailabilitySlot {
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  window: 'morning' | 'afternoon' | 'evening' | 'weekend';
}

export interface PrivacySettings {
  show_country: boolean;
  show_timezone: boolean;
  allow_calls_from_partners: boolean;
  allow_search_indexing: boolean;
  show_online_status: boolean;
}

export interface LanguageCatalogItem {
  code: string;
  name_es: string;
  name_en: string;
  native_name: string;
  flag_emoji: string;
  is_active: boolean;
}

export interface UserLanguage {
  id: string;
  user_id: string;
  language_code: string;
  relation_type: LanguageRelationType;
  proficiency_level: CefrLevel;
  target_goal: string;
}

export interface InterestCatalogItem {
  id: string;
  slug: string;
  name_es: string;
  name_en: string;
  category: string;
  icon_name: string;
  is_active: boolean;
}

/**
 * Public/Semi-public user profile.
 * NEVER includes email, birth_date, or exact geographic coordinates.
 */
export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  country_code: string;
  timezone: string;
  learning_goals: string;
  availability_slots: AvailabilitySlot[];
  privacy_settings: PrivacySettings;
  role: UserRole;
  is_adult_verified: boolean;
  onboarding_completed: boolean;
  is_suspended: boolean;
  suspension_reason?: string | null;
  last_active_at: string;
  created_at: string;
  updated_at: string;
  languages: UserLanguage[];
  interest_slugs: string[];
  is_demo_account?: boolean;
}

export interface PrivateAccountRecord {
  user_id: string;
  username?: string;
  email: string; // May be empty string if not provided
  email_verified: boolean;
  birth_date: string; // YYYY-MM-DD, validated 18+
  auth_provider: 'credentials' | 'email' | 'google';
  password_hash?: string;
  security_question?: string;
  security_answer_hash?: string;
}

export interface UserConsentRecord {
  id: string;
  user_id: string;
  is_adult_confirmed: boolean;
  age_verified_at: string;
  terms_version: string;
  privacy_version: string;
  ads_personalized_consent: boolean;
  ads_non_personalized_consent: boolean;
  analytics_consent: boolean;
  consent_region: string;
  updated_at: string;
}

export interface ConversationRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: RequestStatus;
  intro_message: string;
  target_language_code: string;
  created_at: string;
  responded_at: string | null;
}

export interface Conversation {
  id: string;
  origin_request_id: string | null;
  mode: ConversationMode;
  active_topic_prompt: string | null;
  last_message_at: string;
  is_active: boolean;
  created_at: string;
  participant_ids: string[];
}

export interface GrammarCorrectionData {
  original_text: string;
  corrected_text: string;
  explanation: string;
  language_code: string;
}

export interface TranslationMetadata {
  translated_text: string;
  target_lang: string;
  provider: string;
  translated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content_type: MessageContentType;
  body: string;
  voice_url?: string | null;
  voice_duration_sec?: number | null;
  voice_size_bytes?: number | null;
  reply_to_message_id?: string | null;
  correction_data?: GrammarCorrectionData | null;
  translation_data?: TranslationMetadata | null;
  delivery_status: MessageDeliveryStatus;
  read_at?: string | null;
  is_flagged: boolean;
  created_at: string;
  deleted_at?: string | null;
}

export interface MessageOrProfileReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  conversation_id: string | null;
  message_id: string | null;
  reason_category: ReportReasonCategory;
  description: string;
  status: ReportStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface UserBlock {
  blocker_id: string;
  blocked_id: string;
  reason: string;
  created_at: string;
}

export interface CallSession {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  room_name: string;
  call_type: CallType;
  status: CallStatus;
  recording_enabled: false;
  started_at: string;
  answered_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  end_reason: string | null;
  reconnect_count: number;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface SavedVocabularyItem {
  id: string;
  user_id: string;
  source_message_id: string | null;
  language_code: string;
  term: string;
  translation: string;
  context_example: string;
  mastery_level: 1 | 2 | 3 | 4 | 5;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_entity: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface PasswordResetRequest {
  id: string;
  username: string;
  contact_email: string;
  notes?: string;
  status: 'pending' | 'resolved';
  temp_password?: string;
  created_at: string;
  resolved_at?: string;
  admin_notes?: string;
}

export interface PlatformSettingsState {
  ads_enabled: boolean;
  ads_require_consent: boolean;
  ads_disable_on_flagged_pages: boolean;
  max_daily_requests: number;
  max_messages_per_minute: number;
  max_calls_per_hour: number;
  max_voice_note_mb: number;
  daily_translation_quota: number;
}
