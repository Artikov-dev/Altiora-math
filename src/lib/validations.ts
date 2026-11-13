import { z } from 'zod';

export const questionOptionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "Variant matni bo'sh bo'lmasligi kerak"),
  is_correct: z.boolean(),
  order_index: z.number().int().nonnegative(),
});

export const questionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['multiple_choice', 'open_auto', 'open_manual']),
  prompt: z.string().min(1, "Savol matni bo'sh bo'lmasligi kerak"),
  image_url: z.string().nullable().optional(),
  points: z.number().nonnegative().default(1),
  order_index: z.number().int().nonnegative(),
  accepted_answers: z.array(z.string()).optional().default([]),
  numeric_tolerance: z.number().nonnegative().optional().default(0),
  template_formula: z.string().nullable().optional(),
  options: z.array(questionOptionSchema).optional(),
});

export const createTestSchema = z.object({
  title: z.string().min(3, "Test nomi kamida 3 ta belgidan iborat bo'lishi kerak"),
  description: z.string().optional().default(''),
  duration_minutes: z.number().int().positive().default(30),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  max_violations: z.number().int().min(1).default(3),
  shuffle_questions: z.boolean().default(true),
  shuffle_options: z.boolean().default(true),
  require_fullscreen: z.boolean().default(true),
  show_results_immediately: z.boolean().default(false),
  is_published: z.boolean().default(true),
  questions: z.array(questionSchema).min(1, "Kamida bitta savol qo'shilishi shart"),
});
