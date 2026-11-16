'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import { MathRenderer } from '@/components/MathRenderer';
import { MathKeyboard } from '@/components/MathKeyboard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { compressImage } from '@/lib/imageCompressor';
import { Question, QuestionType, QuestionOption } from '@/types';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Eye,
  CheckCircle2,
  Save,
  HelpCircle,
  FileQuestion,
  ListOrdered,
  FileText,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  FileSpreadsheet,
  X,
} from 'lucide-react';

interface TestEditorProps {
  initialData?: {
    id?: string;
    title: string;
    description: string;
    duration_minutes: number;
    max_violations: number;
    shuffle_questions: boolean;
    shuffle_options: boolean;
    require_fullscreen: boolean;
    show_results_immediately: boolean;
    is_published: boolean;
    questions?: Question[];
  };
  isEdit?: boolean;
}

export function TestEditor({ initialData, isEdit = false }: TestEditorProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [durationMinutes, setDurationMinutes] = useState(initialData?.duration_minutes || 30);
  const [maxViolations, setMaxViolations] = useState(initialData?.max_violations || 3);
  const [shuffleQuestions, setShuffleQuestions] = useState(initialData?.shuffle_questions ?? true);
  const [shuffleOptions, setShuffleOptions] = useState(initialData?.shuffle_options ?? true);
  const [requireFullscreen, setRequireFullscreen] = useState(initialData?.require_fullscreen ?? true);
  const [showResultsImmediately, setShowResultsImmediately] = useState(initialData?.show_results_immediately ?? false);
  const [isPublished, setIsPublished] = useState(initialData?.is_published ?? true);

  const [questions, setQuestions] = useState<Question[]>(
    initialData?.questions && initialData.questions.length > 0
      ? initialData.questions
      : [
          {
            type: 'multiple_choice',
            prompt: 'Tenglamani yeching: $2x + 6 = 14$',
            points: 1,
            order_index: 0,
            options: [
              { text: '$x = 4$', is_correct: true, order_index: 0 },
              { text: '$x = 3$', is_correct: false, order_index: 1 },
              { text: '$x = 5$', is_correct: false, order_index: 2 },
              { text: '$x = 2$', is_correct: false, order_index: 3 },
            ],
          },
        ]
  );

  const [activeMathTarget, setActiveMathTarget] = useState<{ qIndex: number; optIndex?: number } | null>(null);
  const [showMathToolbar, setShowMathToolbar] = useState(false);
  const [uploadingQIndex, setUploadingQIndex] = useState<number | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add a new question
  const handleAddQuestion = (type: QuestionType) => {
    const newQ: Question = {
      type,
      prompt: type === 'multiple_choice'
        ? 'Tenglikni hisoblang: $\\frac{1}{2} + \\frac{1}{4}$'
        : type === 'open_auto'
        ? 'Kasrni hisoblang: $\\frac{3}{4} + \\frac{1}{4}$'
        : 'Ushbu tenglamaning barcha ildizlarini toping va to\'liq yechimini ko\'rsating: $x^2 - 5x + 6 = 0$',
      points: type === 'open_manual' ? 2 : 1,
      order_index: questions.length,
      options:
        type === 'multiple_choice'
          ? [
              { text: '$\\frac{3}{4}$', is_correct: true, order_index: 0 },
              { text: '$\\frac{1}{2}$', is_correct: false, order_index: 1 },
              { text: '$1$', is_correct: false, order_index: 2 },
              { text: '$\\frac{2}{3}$', is_correct: false, order_index: 3 },
            ]
          : undefined,
      accepted_answers: type === 'open_auto' ? ['1', '1.0'] : [],
      numeric_tolerance: 0,
    };

    setQuestions([...questions, newQ]);
  };

  // Reorder questions
  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questions.length - 1)
    ) {
      return;
    }
    const newQuestions = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[targetIndex];
    newQuestions[targetIndex] = temp;
    setQuestions(newQuestions);
  };

  // Duplicate question
  const duplicateQuestion = (index: number) => {
    const q = questions[index];
    const cloned: Question = {
      ...q,
      prompt: `${q.prompt} (Nusxa)`,
      options: q.options ? q.options.map((opt) => ({ ...opt })) : undefined,
      accepted_answers: q.accepted_answers ? [...q.accepted_answers] : [],
    };
    const newQuestions = [...questions];
    newQuestions.splice(index + 1, 0, cloned);
    setQuestions(newQuestions);
  };

  // Delete question
  const deleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      alert("Testda kamida 1 ta savol bo'lishi shart!");
      return;
    }
    setQuestions(questions.filter((_, idx) => idx !== index));
  };

  // Update question field
  const updateQuestion = (index: number, updates: Partial<Question>) => {
    setQuestions(
      questions.map((q, idx) => (idx === index ? { ...q, ...updates } : q))
    );
  };

  // Multiple choice options handlers
  const handleAddOption = (qIndex: number) => {
    const q = questions[qIndex];
    if (!q.options || q.options.length >= 6) return;
    const newOpt: QuestionOption = {
      text: `Variant ${q.options.length + 1}`,
      is_correct: false,
      order_index: q.options.length,
    };
    updateQuestion(qIndex, { options: [...q.options, newOpt] });
  };

  const handleUpdateOption = (
    qIndex: number,
    optIndex: number,
    updates: Partial<QuestionOption>
  ) => {
    const q = questions[qIndex];
    if (!q.options) return;
    const newOptions = q.options.map((opt, idx) =>
      idx === optIndex ? { ...opt, ...updates } : opt
    );
    updateQuestion(qIndex, { options: newOptions });
  };

  const handleSetCorrectOption = (qIndex: number, optIndex: number) => {
    const q = questions[qIndex];
    if (!q.options) return;
    const newOptions = q.options.map((opt, idx) => ({
      ...opt,
      is_correct: idx === optIndex,
    }));
    updateQuestion(qIndex, { options: newOptions });
  };

  const handleDeleteOption = (qIndex: number, optIndex: number) => {
    const q = questions[qIndex];
    if (!q.options || q.options.length <= 2) {
      alert("Variantli savolda kamida 2 ta variant bo'lishi shart!");
      return;
    }
    const newOptions = q.options.filter((_, idx) => idx !== optIndex);
    // If deleted option was correct, make the first one correct
    if (!newOptions.some((o) => o.is_correct) && newOptions.length > 0) {
      newOptions[0].is_correct = true;
    }
    updateQuestion(qIndex, { options: newOptions });
  };

  const handleQuestionImageUpload = async (qIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQIndex(qIndex);
    try {
      const compressedFile = await compressImage(file, 1600, 0.85);
      const formData = new FormData();
      formData.append('file', compressedFile);
      const res = await fetch('/api/teacher/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        updateQuestion(qIndex, { image_url: data.url });
      } else {
        alert(data.error || 'Rasm yuklashda xatolik');
      }
    } catch {
      alert('Rasm yuklashda xatolik yuz berdi');
    } finally {
      setUploadingQIndex(null);
    }
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) return;
    const blocks = bulkText.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    const parsedQuestions: Question[] = [];

    blocks.forEach((block, idx) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      const firstLine = lines[0].replace(/^\d+[\.\)]\s*/, '').trim();
      const optionLines = lines.filter((l) => /^[A-Ea-e][\.\)]\s*/.test(l));
      const answerLine = lines.find((l) => /^(javob|answer|to'g'ri):\s*/i.test(l));

      if (optionLines.length >= 2) {
        const options: QuestionOption[] = optionLines.map((optLine, optIdx) => {
          const isCorrect = /[\*\+]|\(to'g'ri\)|\(correct\)/i.test(optLine);
          const cleanText = optLine
            .replace(/^[A-Ea-e][\.\)]\s*/, '')
            .replace(/[\*\+]|\(to'g'ri\)|\(correct\)/gi, '')
            .trim();
          return {
            text: cleanText,
            is_correct: isCorrect,
            order_index: optIdx,
          };
        });

        if (!options.some((o) => o.is_correct)) {
          options[0].is_correct = true;
        }

        parsedQuestions.push({
          type: 'multiple_choice',
          prompt: firstLine,
          points: 1,
          order_index: questions.length + idx,
          options,
        });
      } else if (answerLine) {
        const cleanAnswer = answerLine.replace(/^(javob|answer|to'g'ri):\s*/i, '').trim();
        parsedQuestions.push({
          type: 'open_auto',
          prompt: firstLine,
          points: 1,
          order_index: questions.length + idx,
          accepted_answers: [cleanAnswer],
        });
      } else {
        parsedQuestions.push({
          type: 'open_manual',
          prompt: lines.join(' ').replace(/^\d+[\.\)]\s*/, '').trim(),
          points: 2,
          order_index: questions.length + idx,
        });
      }
    });

    if (parsedQuestions.length > 0) {
      setQuestions((prev) => [...prev, ...parsedQuestions]);
      setBulkText('');
      setShowBulkModal(false);
      alert(`${parsedQuestions.length} ${t.builder.bulkImportSuccess}`);
    } else {
      alert("Savollar formatini aniqlab bo'lmadi. Namuna bo'yicha kiriting.");
    }
  };

  // Math keyboard insertion
  const handleInsertMath = (symbol: string) => {
    if (!activeMathTarget) return;
    const { qIndex, optIndex } = activeMathTarget;
    if (optIndex !== undefined) {
      const currentText = questions[qIndex]?.options?.[optIndex]?.text || '';
      handleUpdateOption(qIndex, optIndex, { text: currentText + symbol });
    } else {
      const currentPrompt = questions[qIndex]?.prompt || '';
      updateQuestion(qIndex, { prompt: currentPrompt + symbol });
    }
  };

  // Submit test
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError(t.builder.titlePlaceholder);
      return;
    }

    if (questions.length === 0) {
      setError("Kamida bitta savol qo'shilishi shart");
      return;
    }

    // Validate multiple choice options
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) {
        setError(`${i + 1}-savol matni bo'sh bo'lmasligi kerak`);
        return;
      }
      if (q.type === 'multiple_choice') {
        if (!q.options || q.options.length < 2) {
          setError(`${i + 1}-savolda kamida 2 ta variant bo'lishi shart`);
          return;
        }
        if (!q.options.some((o) => o.is_correct)) {
          setError(`${i + 1}-savolda to'g'ri javob belgilanmagan!`);
          return;
        }
      }
    }

    setLoading(true);

    try {
      const payload = {
        title,
        description,
        duration_minutes: Number(durationMinutes),
        max_violations: Number(maxViolations),
        shuffle_questions: shuffleQuestions,
        shuffle_options: shuffleOptions,
        require_fullscreen: requireFullscreen,
        show_results_immediately: showResultsImmediately,
        is_published: isPublished,
        questions: questions.map((q, idx) => ({
          ...q,
          order_index: idx,
          points: Number(q.points) || 1,
        })),
      };

      const url = isEdit
        ? `/api/teacher/tests/${initialData?.id}`
        : '/api/teacher/tests';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Testni saqlashda xatolik yuz berdi');
      }

      router.push('/teacher');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Xatolik yuz berdi';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between py-3 border-b border-border mb-6 safe-pt">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/teacher')}
            className="touch-target p-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all"
            title="Ortga"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg tracking-tight">
              {isEdit ? t.builder.editTitle : t.builder.createTitle}
            </h1>
            <p className="text-xs text-muted-foreground">{t.app.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="touch-target px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground font-semibold flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? t.builder.saving : t.builder.saveTest}</span>
          </button>
        </div>
      </header>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-danger/10 border border-danger/30 text-danger text-sm flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSave} className="space-y-8 flex-1">
        {/* Section 1: Basic Info */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold tracking-tight border-b border-border pb-2.5">
            {t.builder.basicInfo}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-sm font-medium" htmlFor="test-title">
                {t.builder.title} *
              </label>
              <input
                id="test-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.builder.titlePlaceholder}
                className="w-full touch-target px-4 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent text-foreground text-base transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium" htmlFor="test-duration">
                {t.builder.durationLabel} *
              </label>
              <input
                id="test-duration"
                type="number"
                min="1"
                max="300"
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full touch-target px-4 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent text-foreground text-base transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium" htmlFor="test-desc">
              {t.builder.description}
            </label>
            <textarea
              id="test-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.builder.descriptionPlaceholder}
              className="w-full p-3.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent text-foreground text-sm transition-colors"
            />
          </div>
        </div>

        {/* Section 2: Settings & Anti-Cheat */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold tracking-tight border-b border-border pb-2.5">
            {t.builder.settings}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Max Violations */}
            <div className="p-4 rounded-xl border border-border bg-background/50 space-y-1.5">
              <label className="block text-sm font-medium" htmlFor="max-violations">
                {t.builder.maxViolations}
              </label>
              <input
                id="max-violations"
                type="number"
                min="1"
                max="20"
                value={maxViolations}
                onChange={(e) => setMaxViolations(Number(e.target.value))}
                className="w-full touch-target px-4 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-accent text-foreground font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {t.builder.maxViolationsDesc}
              </p>
            </div>

            {/* Checkbox settings */}
            <div className="p-4 rounded-xl border border-border bg-background/50 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="w-5 h-5 rounded text-accent focus:ring-accent accent-violet-600 cursor-pointer"
                />
                <span className="text-sm font-medium">{t.builder.shuffleQuestions}</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="w-5 h-5 rounded text-accent focus:ring-accent accent-violet-600 cursor-pointer"
                />
                <span className="text-sm font-medium">{t.builder.shuffleOptions}</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireFullscreen}
                  onChange={(e) => setRequireFullscreen(e.target.checked)}
                  className="w-5 h-5 rounded text-accent focus:ring-accent accent-violet-600 cursor-pointer"
                />
                <span className="text-sm font-medium">{t.builder.requireFullscreen}</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showResultsImmediately}
                  onChange={(e) => setShowResultsImmediately(e.target.checked)}
                  className="w-5 h-5 rounded text-accent focus:ring-accent accent-violet-600 cursor-pointer"
                />
                <span className="text-sm font-medium">{t.builder.showResultToStudent}</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-5 h-5 rounded text-accent focus:ring-accent accent-violet-600 cursor-pointer"
                />
                <span className="text-sm font-medium">{t.builder.publishImmediately}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Questions Builder */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-accent" />
              <span>{t.builder.questionsSection} ({questions.length})</span>
            </h2>

            {/* Action toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMathToolbar(!showMathToolbar)}
                className={`touch-target px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  showMathToolbar
                    ? 'border-accent bg-accent text-accent-foreground shadow-subtle'
                    : 'border-border bg-card hover:bg-muted text-muted-foreground'
                }`}
              >
                <span>∑ Formulalar</span>
              </button>

              <button
                type="button"
                onClick={() => setShowBulkModal(true)}
                className="touch-target px-3 py-1.5 rounded-xl text-xs font-semibold bg-accent-subtle hover:bg-accent/25 text-accent border border-accent/30 flex items-center gap-1.5 transition-all"
                title="Savollarni matndan ommaviy yuklash"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{t.builder.bulkImport}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddQuestion('multiple_choice')}
                className="touch-target px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-accent-subtle hover:bg-accent/25 text-accent border border-accent/30 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{t.builder.addMultipleChoice}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddQuestion('open_auto')}
                className="touch-target px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-card hover:bg-muted text-foreground border border-border flex items-center gap-1.5 transition-all"
              >
                <ListOrdered className="w-4 h-4" />
                <span>{t.builder.addOpenAuto}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddQuestion('open_manual')}
                className="touch-target px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-card hover:bg-muted text-foreground border border-border flex items-center gap-1.5 transition-all"
              >
                <FileText className="w-4 h-4" />
                <span>{t.builder.addOpenManual}</span>
              </button>
            </div>
          </div>

          {/* Collapsible Math Keyboard Toolbar */}
          {showMathToolbar && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <MathKeyboard onInsert={handleInsertMath} />
            </div>
          )}

          {/* Questions list */}
          <div className="space-y-6">
            {questions.map((q, qIdx) => (
              <div
                key={qIdx}
                className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 relative"
              >
                {/* Question Header & Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm">
                      {qIdx + 1}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {t.builder.questionTypes[q.type]}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Points */}
                    <div className="flex items-center gap-1 mr-2">
                      <span className="text-xs text-muted-foreground">{t.builder.points}:</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={q.points}
                        onChange={(e) =>
                          updateQuestion(qIdx, { points: Number(e.target.value) })
                        }
                        className="w-14 h-8 px-2 rounded-lg border border-border bg-background text-xs font-semibold text-center"
                      />
                    </div>

                    {/* Move Up */}
                    <button
                      type="button"
                      disabled={qIdx === 0}
                      onClick={() => moveQuestion(qIdx, 'up')}
                      className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground disabled:opacity-30"
                      title={t.builder.moveUp}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>

                    {/* Move Down */}
                    <button
                      type="button"
                      disabled={qIdx === questions.length - 1}
                      onClick={() => moveQuestion(qIdx, 'down')}
                      className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground disabled:opacity-30"
                      title={t.builder.moveDown}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {/* Duplicate */}
                    <button
                      type="button"
                      onClick={() => duplicateQuestion(qIdx)}
                      className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground"
                      title={t.builder.duplicate}
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => deleteQuestion(qIdx)}
                      className="p-1.5 rounded-lg border border-border bg-background hover:bg-danger/20 text-danger"
                      title={t.builder.deleteQuestion}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Prompt */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground">
                    {t.builder.questionPrompt}
                  </label>
                  <textarea
                    rows={2}
                    value={q.prompt}
                    onFocus={() => setActiveMathTarget({ qIndex: qIdx })}
                    onChange={(e) => updateQuestion(qIdx, { prompt: e.target.value })}
                    placeholder={t.builder.questionPromptPlaceholder}
                    className="w-full p-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent text-foreground text-sm font-sans"
                  />
                </div>

                {/* Live KaTeX Preview for Prompt */}
                <div className="p-3.5 rounded-xl border border-dashed border-border bg-background/50">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5 font-medium">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t.builder.livePreview}</span>
                  </div>
                  <div className="text-base text-foreground font-serif">
                    <MathRenderer content={q.prompt || '...'} />
                  </div>
                </div>

                {/* Question Image (geometry/diagram) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-accent" />
                      <span>{t.builder.imageUrl}</span>
                    </span>
                    {q.image_url && (
                      <button
                        type="button"
                        onClick={() => updateQuestion(qIdx, { image_url: null })}
                        className="text-xs text-danger hover:underline flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{t.builder.removeImage}</span>
                      </button>
                    )}
                  </div>

                  {q.image_url ? (
                    <div className="relative rounded-2xl overflow-hidden border border-border bg-background/50 p-2 max-w-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={q.image_url}
                        alt="Savol rasmi"
                        className="max-h-48 rounded-xl mx-auto object-contain"
                      />
                    </div>
                  ) : (
                    <label className="touch-target inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-dashed border-border hover:border-accent bg-background hover:bg-muted text-xs font-semibold cursor-pointer transition-all">
                      <Upload className="w-4 h-4 text-accent" />
                      <span>
                        {uploadingQIndex === qIdx ? 'Yuklanmoqda...' : t.builder.uploadImage}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingQIndex === qIdx}
                        onChange={(e) => handleQuestionImageUpload(qIdx, e)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Multiple choice options */}
                {q.type === 'multiple_choice' && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t.builder.options}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddOption(qIdx)}
                        className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t.builder.addOption}</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {q.options?.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className="flex items-center gap-2.5 p-2 rounded-xl border border-border bg-background"
                        >
                          <button
                            type="button"
                            onClick={() => handleSetCorrectOption(qIdx, optIdx)}
                            className={`touch-target w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              opt.is_correct
                                ? 'bg-emerald-500 text-white'
                                : 'border border-border text-muted-foreground hover:border-emerald-500'
                            }`}
                            title={t.builder.markAsCorrect}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>

                          <span className="font-bold text-sm text-muted-foreground w-4 text-center">
                            {String.fromCharCode(65 + optIdx)}
                          </span>

                          <input
                            type="text"
                            value={opt.text}
                            onFocus={() => setActiveMathTarget({ qIndex: qIdx, optIndex: optIdx })}
                            onChange={(e) =>
                              handleUpdateOption(qIdx, optIdx, { text: e.target.value })
                            }
                            placeholder={`Variant ${String.fromCharCode(65 + optIdx)} matni ($...$)`}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-accent text-sm text-foreground"
                          />

                          {/* Quick preview of option KaTeX */}
                          <div className="hidden sm:block min-w-[80px] max-w-[200px] px-2 text-xs truncate text-muted-foreground">
                            <MathRenderer content={opt.text} inline />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteOption(qIdx, optIdx)}
                            className="p-1.5 text-muted-foreground hover:text-danger rounded-lg transition-colors"
                            title="Variantni o'chirish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Open Auto (accepted answers) */}
                {q.type === 'open_auto' && (
                  <div className="space-y-2 pt-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t.builder.acceptedAnswers}
                    </label>
                    <input
                      type="text"
                      value={q.accepted_answers?.join(', ') || ''}
                      onChange={(e) =>
                        updateQuestion(qIdx, {
                          accepted_answers: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder={t.builder.acceptedAnswersPlaceholder}
                      className="w-full touch-target px-4 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent text-foreground text-sm font-mono"
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{t.builder.acceptedAnswersHint}</span>
                    </p>
                  </div>
                )}

                {/* Open Manual (solution instructions) */}
                {q.type === 'open_manual' && (
                  <div className="p-3.5 rounded-xl border border-accent/20 bg-accent-subtle text-accent text-xs">
                    <p>{t.builder.manualSolutionHint}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Save Action */}
        <div className="pt-4 border-t border-border flex justify-end gap-3 safe-pb">
          <button
            type="button"
            onClick={() => router.push('/teacher')}
            className="touch-target px-5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-medium transition-all"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={loading}
            className="touch-target px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground font-semibold flex items-center gap-2 shadow-md active:scale-95 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? t.builder.saving : t.builder.saveTest}</span>
          </button>
        </div>
      </form>

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-5 sm:p-7 max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-accent-subtle text-accent flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base sm:text-lg">{t.builder.bulkImportTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {t.builder.bulkImportDesc}
            </p>

            <div className="p-3 rounded-xl bg-background/80 border border-border text-[11px] font-mono text-muted-foreground space-y-1">
              <div>1. 2x + 6 = 14 tenglamani yeching.</div>
              <div>A) 4 *</div>
              <div>B) 3</div>
              <div>C) 5</div>
              <div className="pt-1">2. Kasrni hisoblang: 3/4 + 1/4</div>
              <div>Javob: 1</div>
            </div>

            <textarea
              rows={8}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="Savollarni shu yerga nusxalab qo'ying..."
              className="w-full p-4 rounded-2xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent text-xs font-mono text-foreground"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground text-xs font-bold shadow-md transition-all active:scale-95"
              >
                {t.builder.bulkImportButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
