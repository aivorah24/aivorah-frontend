import { fetchLearningSubjects } from '../../services/parentProgressService';
import * as learning from '../../../learning/services/parentLearningService';

jest.mock('../../../learning/services/parentLearningService');

describe('fetchLearningSubjects', () => {
  beforeEach(() => jest.clearAllMocks());

  test('lists the child’s real learning-path subjects with their syllabus topics', async () => {
    (learning.fetchCurriculumSubjects as jest.Mock).mockResolvedValue([
      { subject: 'English', topicCount: 25, topics: [] },
      { subject: 'Hindi', topicCount: 39, topics: [] },
    ]);
    (learning.fetchSubjectTopics as jest.Mock).mockImplementation(async (_c: string, _g: string, subject: string) =>
      subject === 'English' ? [{ topic: 'Poem', unit: 'Chapter 1' }] : []);

    const subs = await fetchLearningSubjects({ id: 'c1', grade: 'Grade 10', curriculum: 'NCERT' });

    expect(learning.fetchCurriculumSubjects).toHaveBeenCalledWith('Grade 10', 'CBSE');
    expect(subs).toEqual([
      { subject: 'English', topics: ['Poem'], topicCount: 25 },
      { subject: 'Hindi', topics: [], topicCount: 39 },
    ]);
  });

  test('no curriculum or grade on the child → no subjects (never a made-up list)', async () => {
    expect(await fetchLearningSubjects({ id: 'c1', grade: 'Grade 10' })).toEqual([]);
    expect(learning.fetchCurriculumSubjects).not.toHaveBeenCalled();
  });
});
