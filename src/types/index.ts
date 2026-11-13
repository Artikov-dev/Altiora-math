export type QuestionType = 'multiple_choice' | 'open_auto' | 'open_manual';

export interface QuestionOption {
  id?: string;
  question_id?: string;
  text: string;
  is_correct: boolean;
  order_index: number;
}

export interface Question {
  id?: string;
  test_id?: string;
  type: QuestionType;
  prompt: string;
  image_url?: string | null;
  points: number;
  order_index: number;
  accepted_answers?: string[];
  numeric_tolerance?: number;
  template_formula?: string | null;
  options?: QuestionOption[];
}

export interface TestSettings {
  max_violations: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  require_fullscreen: boolean;
  show_results_immediately: boolean;
}

export interface Test {
  id: string;
  teacher_id: string;
  code: string;
  title: string;
  description: string;
  duration_minutes: number;
  start_time: string | null;
  end_time: string | null;
  max_violations: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  require_fullscreen: boolean;
  show_results_immediately: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  questions?: Question[];
  submissions_count?: number;
}

export type AttemptStatus = 'in_progress' | 'submitted' | 'auto_submitted';

export interface Attempt {
  id: string;
  test_id: string;
  student_name: string;
  device_token: string;
  seed: number;
  started_at: string;
  deadline_at: string;
  submitted_at: string | null;
  status: AttemptStatus;
  score: number;
  max_score: number;
  created_at: string;
  violations_count?: number;
}

export interface Answer {
  id: string;
  attempt_id: string;
  question_id: string;
  value: string;
  photo_url?: string | null;
  auto_score: number;
  manual_score?: number | null;
  comment?: string;
  updated_at: string;
  question?: Question;
}

export type ViolationType =
  | 'tab_switch'
  | 'window_blur'
  | 'fullscreen_exit'
  | 'multi_tab'
  | 'clipboard_attempt'
  | 'shortcut_attempt'
  | 'heartbeat_lost'
  | 'page_reload';

export interface Violation {
  id: string;
  attempt_id: string;
  type: ViolationType;
  occurred_at: string;
  duration_ms: number;
  meta: Record<string, unknown>;
}
