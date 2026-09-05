import * as onboardingService from '../../services/onboardingService';
import PROFILE_SERVER_URL from '../../../../../config/profileServerUrl';
import STUDENTS_SERVER_URL from '../../../../../config/studentsServerUrl';

jest.mock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})), deleteApp: jest.fn() }));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
}));
jest.mock('../../../../../config/firebase', () => ({ options: {} }));

global.fetch = jest.fn();

describe('onboardingService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateStudentId', () => {
    it('uses up to 4 initials from the name', () => {
      expect(onboardingService.generateStudentId('Anaya Reddy')).toMatch(/^STU-AR-\d{6}$/);
    });

    it('falls back to STU when the name has no usable initials', () => {
      expect(onboardingService.generateStudentId('   ')).toMatch(/^STU-STU-\d{6}$/);
    });
  });

  describe('saveProfile', () => {
    it('PATCHes profile-service and returns the parsed body', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ onboardingComplete: true }) });
      const result = await onboardingService.saveProfile({ email: 'p@test.com' });
      expect(fetch).toHaveBeenCalledWith(`${PROFILE_SERVER_URL}/user/profile`, expect.objectContaining({ method: 'PATCH' }));
      expect(result).toEqual({ onboardingComplete: true });
    });

    it('throws with the status and response body on failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500, text: jest.fn().mockResolvedValue('boom') });
      await expect(onboardingService.saveProfile({ email: 'p@test.com' })).rejects.toThrow('Profile save failed (500): boom');
    });
  });

  describe('sendChildOtp / verifyChildOtp', () => {
    it('sends to the students-service child-otp endpoint', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ ok: true }) });
      await onboardingService.sendChildOtp('child@x.com', 'Kid');
      expect(fetch).toHaveBeenCalledWith(`${STUDENTS_SERVER_URL}/parent/children/email-otp/send`, expect.objectContaining({ method: 'POST' }));
    });

    it('throws the server error when verification fails', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: jest.fn().mockResolvedValue({ error: 'Incorrect code' }) });
      await expect(onboardingService.verifyChildOtp('child@x.com', '000000')).rejects.toThrow('Incorrect code');
    });
  });

  describe('linkExistingChild', () => {
    it('POSTs the lowercased child email to the parent link endpoint', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ success: true }) });
      await onboardingService.linkExistingChild('parent@x.com', 'Child@X.com');
      expect(fetch).toHaveBeenCalledWith(
        `${STUDENTS_SERVER_URL}/parent/${encodeURIComponent('parent@x.com')}/children`,
        expect.objectContaining({ body: JSON.stringify({ childEmail: 'child@x.com' }) }),
      );
    });

    it('throws a helpful error when no matching account exists', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: jest.fn().mockResolvedValue({}) });
      await expect(onboardingService.linkExistingChild('parent@x.com', 'nope@x.com'))
        .rejects.toThrow('registered Aivorah account');
    });
  });

  describe('processChild', () => {
    it('links an existing account for a 14+ child with a linkEmail, without creating anything', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ success: true }) });
      const cred = await onboardingService.processChild('parent@x.com', {
        name: 'Teen', age: '15', grade: '', curriculum: '', school: '', schoolCity: '',
        email: '', linkEmail: 'teen@x.com', password: '', verifiedEmail: '',
      });
      expect(cred).toBeNull();
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});
