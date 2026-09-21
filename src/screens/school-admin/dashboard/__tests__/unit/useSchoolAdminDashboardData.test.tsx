import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useSchoolAdminDashboardData } from '../../hooks/useSchoolAdminDashboardData';
import SCHOOL_ADMIN_SERVER_URL from '../../../../../config/schoolAdminServerUrl';

function Harness({ email }: { email: string }) {
  const h = useSchoolAdminDashboardData(email);
  
  React.useEffect(() => {
    h.load();
  }, []);

  return (
    <>
      <Text testID="loading">{String(h.loading)}</Text>
      <Text testID="error">{h.error}</Text>
      <Text testID="schoolName">{h.overview?.school?.name}</Text>
    </>
  );
}

global.fetch = jest.fn();

describe('useSchoolAdminDashboardData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads overview data correctly', async () => {
    const mockOverview = {
      school: { id: 's1', name: 'Test School' },
      counts: { students: 100, teachers: 10, parents: 50, publishedAnnouncements: 2, scheduledAnnouncements: 0, draftAnnouncements: 0 },
      recentAnnouncements: []
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOverview
    });

    await render(<Harness email="admin@test.com" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(global.fetch).toHaveBeenCalledWith(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/overview?adminEmail=admin%40test.com`);
    expect(screen.getByTestId('schoolName').props.children).toBe('Test School');
    expect(screen.getByTestId('error').props.children).toBe('');
  });

  it('handles overview API error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Not Found' })
    });

    await render(<Harness email="admin@test.com" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('error').props.children).toBe('Not Found');
  });
});

