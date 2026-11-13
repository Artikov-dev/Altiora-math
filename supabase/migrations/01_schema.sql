-- ==============================================================================
-- TestPlatform Database Schema
-- Supabase Postgres Migration
-- ==============================================================================

-- 1. Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Teachers Profile Table
-- Linked to Supabase Auth users
create table if not exists public.teachers (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    full_name text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger to create teacher record automatically on auth.users creation
create or replace function public.handle_new_teacher()
returns trigger as $$
begin
    insert into public.teachers (id, email, full_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_teacher();

-- 3. Tests Table
create table if not exists public.tests (
    id uuid primary key default gen_random_uuid(),
    teacher_id uuid not null references public.teachers(id) on delete cascade,
    code text not null unique,
    title text not null,
    description text default '',
    duration_minutes integer not null default 30 check (duration_minutes > 0),
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    max_violations integer not null default 3 check (max_violations >= 1),
    shuffle_questions boolean not null default true,
    shuffle_options boolean not null default true,
    require_fullscreen boolean not null default true,
    show_results_immediately boolean not null default false,
    is_published boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Questions Table
create table if not exists public.questions (
    id uuid primary key default gen_random_uuid(),
    test_id uuid not null references public.tests(id) on delete cascade,
    type text not null check (type in ('multiple_choice', 'open_auto', 'open_manual')),
    prompt text not null,
    image_url text,
    points numeric not null default 1 check (points >= 0),
    order_index integer not null default 0,
    accepted_answers text[] default '{}',
    numeric_tolerance numeric default 0,
    template_formula text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Question Options Table (For Multiple Choice)
create table if not exists public.question_options (
    id uuid primary key default gen_random_uuid(),
    question_id uuid not null references public.questions(id) on delete cascade,
    text text not null,
    is_correct boolean not null default false,
    order_index integer not null default 0
);

-- 6. Attempts Table
create table if not exists public.attempts (
    id uuid primary key default gen_random_uuid(),
    test_id uuid not null references public.tests(id) on delete cascade,
    student_name text not null,
    device_token text not null,
    seed integer not null default 12345,
    started_at timestamp with time zone default timezone('utc'::text, now()) not null,
    deadline_at timestamp with time zone not null,
    submitted_at timestamp with time zone,
    status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'auto_submitted')),
    score numeric default 0,
    max_score numeric default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Answers Table
create table if not exists public.answers (
    id uuid primary key default gen_random_uuid(),
    attempt_id uuid not null references public.attempts(id) on delete cascade,
    question_id uuid not null references public.questions(id) on delete cascade,
    value text default '',
    photo_url text,
    auto_score numeric default 0,
    manual_score numeric,
    comment text default '',
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint unique_attempt_question unique(attempt_id, question_id)
);

-- 8. Violations Table
create table if not exists public.violations (
    id uuid primary key default gen_random_uuid(),
    attempt_id uuid not null references public.attempts(id) on delete cascade,
    type text not null check (type in ('tab_switch', 'window_blur', 'fullscreen_exit', 'multi_tab', 'clipboard_attempt', 'shortcut_attempt', 'heartbeat_lost', 'page_reload')),
    occurred_at timestamp with time zone default timezone('utc'::text, now()) not null,
    duration_ms integer default 0,
    meta jsonb default '{}'::jsonb
);

-- 9. Performance Indexes
create index if not exists idx_tests_code on public.tests(code);
create index if not exists idx_tests_teacher on public.tests(teacher_id);
create index if not exists idx_questions_test on public.questions(test_id);
create index if not exists idx_question_options_question on public.question_options(question_id);
create index if not exists idx_attempts_test on public.attempts(test_id);
create index if not exists idx_attempts_student_name on public.attempts(test_id, lower(trim(student_name)));
create index if not exists idx_answers_attempt on public.answers(attempt_id);
create index if not exists idx_violations_attempt on public.violations(attempt_id);

-- 10. Enable Row Level Security (RLS)
alter table public.teachers enable row level security;
alter table public.tests enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.attempts enable row level security;
alter table public.answers enable row level security;
alter table public.violations enable row level security;

-- 11. RLS Policies

-- Teachers
create policy "Teachers can view own profile" on public.teachers
    for select using (auth.uid() = id);

create policy "Teachers can update own profile" on public.teachers
    for update using (auth.uid() = id);

-- Tests
create policy "Teachers can view own tests" on public.tests
    for select using (auth.uid() = teacher_id);

create policy "Teachers can insert own tests" on public.tests
    for insert with check (auth.uid() = teacher_id);

create policy "Teachers can update own tests" on public.tests
    for update using (auth.uid() = teacher_id);

create policy "Teachers can delete own tests" on public.tests
    for delete using (auth.uid() = teacher_id);

-- Questions
create policy "Teachers can view questions for own tests" on public.questions
    for select using (
        exists (
            select 1 from public.tests
            where tests.id = questions.test_id
            and tests.teacher_id = auth.uid()
        )
    );

create policy "Teachers can insert questions for own tests" on public.questions
    for insert with check (
        exists (
            select 1 from public.tests
            where tests.id = questions.test_id
            and tests.teacher_id = auth.uid()
        )
    );

create policy "Teachers can update questions for own tests" on public.questions
    for update using (
        exists (
            select 1 from public.tests
            where tests.id = questions.test_id
            and tests.teacher_id = auth.uid()
        )
    );

create policy "Teachers can delete questions for own tests" on public.questions
    for delete using (
        exists (
            select 1 from public.tests
            where tests.id = questions.test_id
            and tests.teacher_id = auth.uid()
        )
    );

-- Question Options
create policy "Teachers can view options for own tests" on public.question_options
    for select using (
        exists (
            select 1 from public.questions
            join public.tests on tests.id = questions.test_id
            where questions.id = question_options.question_id
            and tests.teacher_id = auth.uid()
        )
    );

create policy "Teachers can insert options for own tests" on public.question_options
    for insert with check (
        exists (
            select 1 from public.questions
            join public.tests on tests.id = questions.test_id
            where questions.id = question_options.question_id
            and tests.teacher_id = auth.uid()
        )
    );

create policy "Teachers can update options for own tests" on public.question_options
    for update using (
        exists (
            select 1 from public.questions
            join public.tests on tests.id = questions.test_id
            where questions.id = question_options.question_id
            and tests.teacher_id = auth.uid()
        )
    );

create policy "Teachers can delete options for own tests" on public.question_options
    for delete using (
        exists (
            select 1 from public.questions
            join public.tests on tests.id = questions.test_id
            where questions.id = question_options.question_id
            and tests.teacher_id = auth.uid()
        )
    );

-- Attempts
create policy "Teachers can view attempts for own tests" on public.attempts
    for select using (
        exists (
            select 1 from public.tests
            where tests.id = attempts.test_id
            and tests.teacher_id = auth.uid()
        )
    );

create policy "Teachers can update/reset attempts for own tests" on public.attempts
    for update using (
        exists (
            select 1 from public.tests
            where tests.id = attempts.test_id
            and tests.teacher_id = auth.uid()
        )
    );

create policy "Teachers can delete attempts for own tests" on public.attempts
    for delete using (
        exists (
            select 1 from public.tests
            where tests.id = attempts.test_id
            and tests.teacher_id = auth.uid()
        )
    );

-- Answers
create policy "Teachers can view answers for own tests" on public.answers
    for select using (
        exists (
            select 1 from public.attempts
            join public.tests on tests.id = attempts.test_id
            where attempts.id = answers.attempt_id
            and tests.teacher_id = auth.uid()
        )
    );

create policy "Teachers can update/grade answers for own tests" on public.answers
    for update using (
        exists (
            select 1 from public.attempts
            join public.tests on tests.id = attempts.test_id
            where attempts.id = answers.attempt_id
            and tests.teacher_id = auth.uid()
        )
    );

-- Violations
create policy "Teachers can view violations for own tests" on public.violations
    for select using (
        exists (
            select 1 from public.attempts
            join public.tests on tests.id = attempts.test_id
            where attempts.id = violations.attempt_id
            and tests.teacher_id = auth.uid()
        )
    );

-- Storage bucket for optional student photo answers
insert into storage.buckets (id, name, public)
values ('test-photos', 'test-photos', true)
on conflict (id) do nothing;

create policy "Public upload for test-photos" on storage.objects
    for insert with check (bucket_id = 'test-photos');

create policy "Public read for test-photos" on storage.objects
    for select using (bucket_id = 'test-photos');
