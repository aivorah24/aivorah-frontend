import type { Timetable } from '../../services/timetableApi';

const mockDoc = {
  setFont: jest.fn(), setFontSize: jest.fn(), setTextColor: jest.fn(), setFillColor: jest.fn(),
  setDrawColor: jest.fn(), setLineWidth: jest.fn(),
  text: jest.fn(), rect: jest.fn(), circle: jest.fn(), addImage: jest.fn(),
  splitTextToSize: jest.fn((s: string) => [s]),
  addPage: jest.fn(), save: jest.fn(),
};
jest.mock('../../../../../services/timetableResourcesClient', () => ({ trRequest: jest.fn() }));
jest.mock('jspdf', () => ({ jsPDF: jest.fn().mockImplementation(() => mockDoc) }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { downloadTimetablePdf } = require('../../utils/timetablePdf');

function tt(overrides: Partial<Timetable> = {}): Timetable {
  return {
    grade: 'Grade 4', section: 'A', title: '', days: ['MON', 'TUE'],
    periodDefs: [
      { code: 'P1', start: '08:50', end: '09:40', isBreak: false },
      { code: 'BRK', start: '10:30', end: '10:40', isBreak: true },
    ],
    slots: [
      { id: 's1', day: 'MON', periodCode: 'P1', subject: 'Math', room: 'R1', teacherId: null, teacherName: null, materialUrl: null, materialName: null, color: '#E0F7FA' },
    ],
    permissions: { canManageTemplate: true, canEditSlot: true },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockRejectedValue(new Error('logo fetch failed')) as any;
});

describe('downloadTimetablePdf', () => {
  test('builds the PDF and saves without throwing, using the class label in the filename', async () => {
    await expect(downloadTimetablePdf({
      tt: tt(), classLabel: 'Grade 4 A', schoolName: 'Test School', studentSubtitle: 'Grade 4 A — Timetable',
    })).resolves.not.toThrow();

    expect(mockDoc.save).toHaveBeenCalledWith('Grade 4 A Timetable.pdf');
  });

  test('logo fetch failure falls back to the crest badge, not a crash', async () => {
    await downloadTimetablePdf({ tt: tt(), classLabel: 'Grade 4 A', schoolName: 'Test School', studentSubtitle: 'sub' });
    expect(mockDoc.addImage).not.toHaveBeenCalled();
    expect(mockDoc.circle).toHaveBeenCalled();
    expect(mockDoc.save).toHaveBeenCalled();
  });

  test('draws a break-row strip distinct from normal period rows', async () => {
    await downloadTimetablePdf({ tt: tt(), classLabel: 'Grade 4 A', schoolName: 'Test School', studentSubtitle: 'sub' });
    // Break code drawn as its own centered text
    expect(mockDoc.text).toHaveBeenCalledWith('BRK', expect.any(Number), expect.any(Number), { align: 'center' });
  });

  test('an empty slot list still renders the grid and saves', async () => {
    await expect(downloadTimetablePdf({
      tt: tt({ slots: [] }), classLabel: 'Grade 4 A', schoolName: 'Test School', studentSubtitle: 'sub',
    })).resolves.not.toThrow();
    expect(mockDoc.save).toHaveBeenCalled();
  });

  test('many period rows triggers pagination (addPage) rather than crashing', async () => {
    const manyPeriods = Array.from({ length: 12 }, (_, i) => ({ code: `P${i}`, start: '08:00', end: '08:50', isBreak: false }));
    await downloadTimetablePdf({
      tt: tt({ periodDefs: manyPeriods }), classLabel: 'Grade 4 A', schoolName: 'Test School', studentSubtitle: 'sub',
    });
    expect(mockDoc.addPage).toHaveBeenCalled();
  });

  test('a jsPDF construction failure is swallowed, never throws', async () => {
    const { jsPDF } = require('jspdf');
    (jsPDF as jest.Mock).mockImplementationOnce(() => { throw new Error('boom'); });
    await expect(downloadTimetablePdf({
      tt: tt(), classLabel: 'Grade 4 A', schoolName: 'Test School', studentSubtitle: 'sub',
    })).resolves.not.toThrow();
  });
});
