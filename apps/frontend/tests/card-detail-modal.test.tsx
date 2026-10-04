import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CardDetailModal } from '@/components/tracker/card-detail-modal';
import { getApplicationDetail, updateApplication, type ApplicationDetail } from '@/lib/api/tracker';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/api/tracker', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/tracker')>('@/lib/api/tracker');
  return { ...actual, getApplicationDetail: vi.fn(), updateApplication: vi.fn() };
});

function applicationDetail(overrides: Partial<ApplicationDetail> = {}): ApplicationDetail {
  return {
    application_id: 'app-1',
    job_id: 'job-1',
    resume_id: 'res-1',
    master_resume_id: null,
    status: 'interview',
    company: 'ACME',
    role: 'Engineer',
    applied_at: null,
    interview_at: null,
    notes: null,
    position: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    job_content: 'JD',
    resume: {},
    ...overrides,
  };
}

describe('CardDetailModal interview time', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the existing interview time and saves a new value as ISO', async () => {
    const existing = applicationDetail({ interview_at: '2026-10-08T06:30:00.000Z' });
    vi.mocked(getApplicationDetail).mockResolvedValue(existing);
    vi.mocked(updateApplication).mockResolvedValue({
      ...existing,
      interview_at: '2026-10-09T01:15:00.000Z',
    });

    render(
      <CardDetailModal applicationId="app-1" open onOpenChange={vi.fn()} onUpdated={vi.fn()} />
    );

    const input = await screen.findByLabelText('tracker.modal.interviewTime');
    expect(input).toHaveAttribute('type', 'datetime-local');
    expect(new Date((input as HTMLInputElement).value).toISOString()).toBe(existing.interview_at);

    fireEvent.change(input, { target: { value: '2026-10-09T09:15' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    await waitFor(() => {
      expect(updateApplication).toHaveBeenCalledWith('app-1', {
        interview_at: new Date('2026-10-09T09:15').toISOString(),
      });
    });
  });

  it('does not show the interview time field outside the interview stage', async () => {
    vi.mocked(getApplicationDetail).mockResolvedValue(
      applicationDetail({ status: 'applied', interview_at: '2026-10-08T06:30:00.000Z' })
    );

    render(
      <CardDetailModal applicationId="app-1" open onOpenChange={vi.fn()} onUpdated={vi.fn()} />
    );

    await screen.findByText('JD');
    expect(screen.queryByLabelText('tracker.modal.interviewTime')).not.toBeInTheDocument();
  });
});
