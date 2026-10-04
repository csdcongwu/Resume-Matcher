'use client';

import React, { useEffect, useState } from 'react';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/dropdown';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from '@/lib/i18n';
import {
  APPLICATION_STATUS_ORDER,
  createInterviewQuestion,
  listApplications,
  listInterviewQuestions,
  type Application,
  type InterviewQuestion,
} from '@/lib/api/tracker';

interface InterviewQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InterviewQuestionsDialog({
  open,
  onOpenChange,
}: InterviewQuestionsDialogProps) {
  const { t } = useTranslations();
  const [applications, setApplications] = useState<Application[]>([]);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [applicationData, questionData] = await Promise.all([
        listApplications(),
        listInterviewQuestions(),
      ]);
      const nextApplications = APPLICATION_STATUS_ORDER.flatMap(
        (status) => applicationData.columns[status] ?? []
      );
      setApplications(nextApplications);
      setSelectedApplicationId((current) =>
        nextApplications.some((application) => application.application_id === current)
          ? current
          : (nextApplications[0]?.application_id ?? '')
      );
      setQuestions(questionData);
    } catch {
      setError(t('tracker.interviewQuestions.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadData();
    // Reload only when the dialog opens; refreshes after a save call loadData directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const applicationLabel = (application: Application): string => {
    const company = application.company || t('tracker.card.companyUnknown');
    const role = application.role || t('tracker.card.roleUnknown');
    return `${company} - ${role}`;
  };

  const handleSubmit = async () => {
    const question = questionText.trim();
    if (!selectedApplicationId || !question) return;

    setSubmitting(true);
    setError(null);
    try {
      await createInterviewQuestion(selectedApplicationId, question);
      setQuestionText('');
      await loadData();
    } catch {
      setError(t('tracker.interviewQuestions.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('tracker.interviewQuestions.title')}</DialogTitle>
          <DialogDescription>{t('tracker.interviewQuestions.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1.1fr_2fr]">
            <div className="space-y-1">
              <Label>{t('tracker.interviewQuestions.application')}</Label>
              <Dropdown
                options={applications.map((application) => ({
                  id: application.application_id,
                  label: applicationLabel(application),
                }))}
                value={selectedApplicationId}
                onChange={setSelectedApplicationId}
                disabled={applications.length === 0}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="interview-question">
                {t('tracker.interviewQuestions.question')}
              </Label>
              <Textarea
                id="interview-question"
                value={questionText}
                onChange={(event) => setQuestionText(event.target.value)}
                placeholder={t('tracker.interviewQuestions.questionPlaceholder')}
                rows={2}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-xs text-ink-soft">
              {applications.length === 0
                ? t('tracker.interviewQuestions.noApplications')
                : t('tracker.interviewQuestions.applicationHint')}
            </p>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || !selectedApplicationId || !questionText.trim()}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('tracker.interviewQuestions.add')
              )}
            </Button>
          </div>

          {error && <p className="font-mono text-xs text-destructive">{error}</p>}

          <div className="max-h-72 overflow-y-auto border border-black bg-background">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-steel-grey" />
              </div>
            ) : questions.length === 0 ? (
              <p className="px-4 py-8 text-center font-mono text-sm text-steel-grey">
                {t('tracker.interviewQuestions.empty')}
              </p>
            ) : (
              <div>
                {questions.map((question) => (
                  <div
                    key={question.question_id}
                    className="border-b border-black p-4 last:border-b-0"
                  >
                    <div className="font-mono text-xs font-bold uppercase tracking-wide text-primary">
                      {question.company || t('tracker.card.companyUnknown')}
                    </div>
                    <div className="mt-1 font-mono text-xs text-ink-soft">
                      {question.role || t('tracker.card.roleUnknown')}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink">{question.question}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
