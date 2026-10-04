import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InterviewQuestionsDialog } from '@/components/tracker/interview-questions-dialog';
import {
  APPLICATION_STATUS_ORDER,
  createInterviewQuestion,
  listApplications,
  listInterviewQuestions,
  type Application,
  type ApplicationColumns,
  type InterviewQuestion,
} from '@/lib/api/tracker';

vi.mock('@/lib/i18n', () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/api/tracker', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/tracker')>('@/lib/api/tracker');
  return {
    ...actual,
    listApplications: vi.fn(),
    listInterviewQuestions: vi.fn(),
    createInterviewQuestion: vi.fn(),
  };
});

const application: Application = {
  application_id: 'app-1',
  job_id: 'job-1',
  resume_id: 'resume-1',
  master_resume_id: null,
  status: 'applied',
  company: 'Acme Corp',
  role: 'Backend Engineer',
  applied_at: null,
  notes: null,
  position: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const question: InterviewQuestion = {
  question_id: 'question-1',
  application_id: 'app-1',
  company: 'Acme Corp',
  role: 'Backend Engineer',
  question: 'How do you diagnose a production incident?',
};

function columnsFixture(): ApplicationColumns {
  const columns = APPLICATION_STATUS_ORDER.reduce((acc, status) => {
    acc[status] = [];
    return acc;
  }, {} as ApplicationColumns);
  columns.applied = [application];
  return columns;
}

describe('InterviewQuestionsDialog', () => {
  beforeEach(() => {
    vi.mocked(listApplications).mockResolvedValue({ columns: columnsFixture() });
    vi.mocked(listInterviewQuestions).mockResolvedValue([]);
    vi.mocked(createInterviewQuestion).mockResolvedValue(question);
  });

  it('loads all questions and shows their company', async () => {
    vi.mocked(listInterviewQuestions).mockResolvedValueOnce([question]);

    render(<InterviewQuestionsDialog open onOpenChange={vi.fn()} />);

    expect(await screen.findByText(question.question)).toBeInTheDocument();
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
  });

  it('disables adding until a question is entered', async () => {
    render(<InterviewQuestionsDialog open onOpenChange={vi.fn()} />);

    const addButton = await screen.findByRole('button', {
      name: 'tracker.interviewQuestions.add',
    });
    expect(addButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('tracker.interviewQuestions.question'), {
      target: { value: 'Tell me about a difficult migration.' },
    });

    expect(addButton).not.toBeDisabled();
  });

  it('creates a question for the selected application and refreshes the list', async () => {
    vi.mocked(listInterviewQuestions)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...question, question: 'Tell me about a difficult migration.' }]);

    render(<InterviewQuestionsDialog open onOpenChange={vi.fn()} />);

    const input = await screen.findByLabelText('tracker.interviewQuestions.question');
    fireEvent.change(input, {
      target: { value: 'Tell me about a difficult migration.' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'tracker.interviewQuestions.add' })
    );

    await waitFor(() => {
      expect(createInterviewQuestion).toHaveBeenCalledWith(
        'app-1',
        'Tell me about a difficult migration.'
      );
    });
    expect(
      await screen.findByText('Tell me about a difficult migration.')
    ).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('shows a load error when the question collection cannot be read', async () => {
    vi.mocked(listInterviewQuestions).mockRejectedValueOnce(new Error('boom'));

    render(<InterviewQuestionsDialog open onOpenChange={vi.fn()} />);

    expect(
      await screen.findByText('tracker.interviewQuestions.loadFailed')
    ).toBeInTheDocument();
  });
});
