import { fetchCurriculumSubjects } from '../dashboardService';

jest.mock('../../../../../config/serverUrl', () => ({ __esModule: true, default: 'https://monolith.test' }));
jest.mock('../../../../../config/learningPathsServerUrl', () => ({ __esModule: true, default: 'https://learning-paths.test' }));
jest.mock('../../../../../config/leaderboardServiceUrl', () => ({ __esModule: true, default: 'https://lb.test' }));
jest.mock('../../../../../config/scheduleServerUrl', () => ({ __esModule: true, default: 'https://schedule.test' }));
jest.mock('../../../../../services/authHeader', () => ({ authHeader: jest.fn(async () => ({ Authorization: 'Bearer test-token' })) }));

const ok = (body: unknown) => ({ ok: true, json: async () => body });

describe('fetchCurriculumSubjects', () => {
  beforeEach(() => { global.fetch = jest.fn(); });

  test.each(['NCERT', 'CBSE'])('%s chapter names come from the learning-paths service, not the monolith', async (curriculum) => {
    (global.fetch as jest.Mock).mockResolvedValue(ok({ subjects: [{ subject: 'Science', chapters: [{ title: 'Crop Production and Management' }] }] }));
    const data = await fetchCurriculumSubjects(curriculum, 'Grade 8');
    const url = String((global.fetch as jest.Mock).mock.calls[0][0]);
    expect(url).toContain('learning-paths.test/curriculum/subjects');
    expect(url).not.toContain('monolith.test');
    expect(data.subjects[0].chapters[0].title).toBe('Crop Production and Management');
  });

  test.each([['ICSE', 'Grade 6'], ['Cambridge', 'Grade 3'], ['Cambridge', 'Grade 9']])('%s %s subjects come from the learning-paths service (syllabus-only board)', async (curriculum, grade) => {
    (global.fetch as jest.Mock).mockResolvedValue(ok({ subjects: [] }));
    await fetchCurriculumSubjects(curriculum, grade);
    const url = String((global.fetch as jest.Mock).mock.calls[0][0]);
    expect(url).toContain('learning-paths.test/curriculum/subjects');
    expect(url).not.toContain('monolith.test');
  });

  test('falls back to the monolith when the service is unreachable', async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(ok({ subjects: [] }));
    await fetchCurriculumSubjects('NCERT', 'Grade 8');
    expect(String((global.fetch as jest.Mock).mock.calls[1][0])).toContain('monolith.test');
  });

  test('other curricula are unchanged', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(ok({ subjects: [] }));
    await fetchCurriculumSubjects('IB_PYP', 'Grade 3');
    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain('monolith.test');
  });
});
