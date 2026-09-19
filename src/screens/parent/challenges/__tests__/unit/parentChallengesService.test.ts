import * as parentChallengesService from '../../services/parentChallengesService';
import STUDENTS_SERVER_URL from '../../../../../config/studentsServerUrl';
import CHALLENGES_SERVER_URL from '../../../../../config/challengesServerUrl';
import PARENT_SERVER_URL from '../../../../../config/parentServerUrl';

global.fetch = jest.fn();

describe('parentChallengesService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchChildren', () => {
    it('calls the monolith children endpoint and returns list', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce([{ id: 'c1', name: 'Kid' }]),
      });
      const res = await parentChallengesService.fetchChildren('parent@test.com');
      expect(fetch).toHaveBeenCalledWith(`${PARENT_SERVER_URL}/parent/parent%40test.com/children`);
      expect(res).toEqual([{ id: 'c1', name: 'Kid' }]);
    });

    it('returns an empty array when payload is not a non-empty array', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ error: 'invalid' }),
      });
      const res = await parentChallengesService.fetchChildren('parent@test.com');
      expect(res).toEqual([]);
    });
  });

  describe('fetchChildStats', () => {
    it('calls aivorah-students-service /student/:id', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ xpPoints: 100 }),
      });
      const res = await parentChallengesService.fetchChildStats('c1');
      expect(fetch).toHaveBeenCalledWith(`${STUDENTS_SERVER_URL}/student/c1`);
      expect(res).toEqual({ xpPoints: 100 });
    });

    it('returns null on non-ok response', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
      const res = await parentChallengesService.fetchChildStats('c1');
      expect(res).toBeNull();
    });
  });

  describe('fetchChallenges', () => {
    it('calls aivorah-challenges-service with grade/curriculum/studentId', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce([{ id: 'ch1', type: 'school_challenge' }]),
      });
      const res = await parentChallengesService.fetchChallenges({ id: 'c1', grade: 'Grade 3', curriculum: 'CBSE' }, 'parent@x.com');
      expect(fetch).toHaveBeenCalledWith(
        `${CHALLENGES_SERVER_URL}/challenges?grade=Grade%203&curriculum=CBSE&studentId=c1&parentEmail=parent%40x.com`,
      );
      expect(res).toEqual([{ id: 'ch1', type: 'school_challenge' }]);
    });

    it('defaults curriculum to IB PYP when missing', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce([]) });
      await parentChallengesService.fetchChallenges({ id: 'c1', grade: 'Grade 3' } as any, 'parent@x.com');
      expect(fetch).toHaveBeenCalledWith(
        `${CHALLENGES_SERVER_URL}/challenges?grade=Grade%203&curriculum=IB%20PYP&studentId=c1&parentEmail=parent%40x.com`,
      );
    });

    it('returns an empty array on non-ok response', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
      const res = await parentChallengesService.fetchChallenges({ id: 'c1', grade: 'Grade 3', curriculum: 'CBSE' }, 'parent@x.com');
      expect(res).toEqual([]);
    });

    it('returns an empty array when the payload is ok but not an array', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce({ error: 'unexpected shape' }) });
      const res = await parentChallengesService.fetchChallenges({ id: 'c1', grade: 'Grade 3', curriculum: 'CBSE' }, 'parent@x.com');
      expect(res).toEqual([]);
    });
  });

  describe('assignChallenge', () => {
    it('POSTs to /challenges/assign with assignedByRole "parent"', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce({}) });
      const res = await parentChallengesService.assignChallenge({
        challengeId: 'ch1', studentId: 'c1', parentEmail: 'p@test.com', dueDate: '2026-09-09',
      });
      expect(fetch).toHaveBeenCalledWith(`${CHALLENGES_SERVER_URL}/challenges/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: 'ch1', studentId: 'c1',
          assignedById: 'p@test.com', assignedByRole: 'parent', dueDate: '2026-09-09',
        }),
      });
      expect(res).toEqual({ ok: true, alreadyAssigned: false });
    });

    // Regression: re-assigning an already-pending challenge used to look
    // identical to a fresh assign — the server now flags it explicitly.
    it('surfaces alreadyAssigned when the server reports a no-op re-assign', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce({ alreadyAssigned: true }) });
      const res = await parentChallengesService.assignChallenge({
        challengeId: 'ch1', studentId: 'c1', parentEmail: 'p@test.com', dueDate: '2026-09-09',
      });
      expect(res).toEqual({ ok: true, alreadyAssigned: true });
    });

    it('returns the server error message on failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'This challenge is for Grade 4, but the student is in Grade 6.' }),
      });
      const res = await parentChallengesService.assignChallenge({
        challengeId: 'ch1', studentId: 'c1', parentEmail: 'p@test.com', dueDate: '2026-09-09',
      });
      expect(res).toEqual({ ok: false, error: 'This challenge is for Grade 4, but the student is in Grade 6.' });
    });

    it('falls back to a generic error message when the error body is unparseable', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockRejectedValueOnce(new Error('bad json')),
      });
      const res = await parentChallengesService.assignChallenge({
        challengeId: 'ch1', studentId: 'c1', parentEmail: 'p@test.com', dueDate: '2026-09-09',
      });
      expect(res).toEqual({ ok: false, error: 'Failed to assign. Try again.' });
    });
  });
});
