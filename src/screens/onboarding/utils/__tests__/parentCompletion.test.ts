import { computeParentCompletion, ChildEntry } from '../parentCompletion';

const emptyChild = (): ChildEntry => ({
  name: '', age: '', grade: '', curriculum: '', school: '', schoolCity: '',
  email: '', linkEmail: '', password: '', verifiedEmail: '',
});

const base = {
  fullName: '',
  city: '',
  dob: '',
  mobile: '',
  children: [emptyChild()] as ChildEntry[],
  avatarStyle: '',
};

const validParent = { fullName: 'A Parent', city: 'Hyderabad', dob: '01/01/1980', mobile: '9999999999' };

describe('computeParentCompletion — personalDone', () => {
  test('missing any field -> not done', () => {
    expect(computeParentCompletion({ ...base, ...validParent, mobile: '' }).personalDone).toBe(false);
  });

  test('all four filled -> done', () => {
    expect(computeParentCompletion({ ...base, ...validParent }).personalDone).toBe(true);
  });
});

describe('computeParentCompletion — children are optional', () => {
  test('no children started -> requiredDone can be true from personal info alone', () => {
    const result = computeParentCompletion({ ...base, ...validParent });
    expect(result.addingChildren).toBe(false);
    expect(result.requiredDone).toBe(true);
  });

  test('a child with only a name started -> addingChildren true, curriculum/grade required', () => {
    const children = [{ ...emptyChild(), name: 'Kid' }];
    const result = computeParentCompletion({ ...base, ...validParent, children });
    expect(result.addingChildren).toBe(true);
    expect(result.curriculumDone).toBe(false);
    expect(result.requiredDone).toBe(false);
  });

  test('child under 14 needs school (not link email)', () => {
    const children = [{ ...emptyChild(), name: 'Kid', age: '10', curriculum: 'IB PYP', grade: 'Grade 4', school: '' }];
    const result = computeParentCompletion({ ...base, ...validParent, children });
    expect(result.accountDone).toBe(false);
  });

  test('child under 14 with a valid school -> accountDone true', () => {
    const children = [{ ...emptyChild(), name: 'Kid', age: '10', curriculum: 'IB PYP', grade: 'Grade 4', school: 'HIS' }];
    const result = computeParentCompletion({ ...base, ...validParent, children });
    expect(result.accountDone).toBe(true);
    expect(result.requiredDone).toBe(true);
  });

  test('child 14+ needs a valid link email, not school', () => {
    const teen = { ...emptyChild(), name: 'Teen', age: '15', curriculum: 'IB PYP', grade: 'Grade 9' };
    expect(computeParentCompletion({ ...base, ...validParent, children: [{ ...teen, linkEmail: 'not-an-email' }] }).accountDone).toBe(false);
    expect(computeParentCompletion({ ...base, ...validParent, children: [{ ...teen, linkEmail: 'teen@a.com' }] }).accountDone).toBe(true);
  });

  test('a child email provided must be OTP-verified (verifiedEmail must match)', () => {
    const child = { ...emptyChild(), name: 'Kid', age: '10', curriculum: 'IB PYP', grade: 'Grade 4', school: 'HIS', email: 'kid@a.com', verifiedEmail: '' };
    expect(computeParentCompletion({ ...base, ...validParent, children: [child] }).accountDone).toBe(false);
    expect(computeParentCompletion({ ...base, ...validParent, children: [{ ...child, verifiedEmail: 'kid@a.com' }] }).accountDone).toBe(true);
  });

  test('a short (but non-empty) password fails, empty password is fine (auto-generated)', () => {
    const base2 = { ...emptyChild(), name: 'Kid', age: '10', curriculum: 'IB PYP', grade: 'Grade 4', school: 'HIS' };
    expect(computeParentCompletion({ ...base, ...validParent, children: [{ ...base2, password: '123' }] }).accountDone).toBe(false);
    expect(computeParentCompletion({ ...base, ...validParent, children: [{ ...base2, password: '' }] }).accountDone).toBe(true);
  });
});

describe('computeParentCompletion — completionPct', () => {
  test('nothing filled -> 0%', () => {
    expect(computeParentCompletion(base).completionPct).toBe(0);
  });

  test('all 4 personal fields filled, no children -> 100% (children steps not counted when skipped)', () => {
    expect(computeParentCompletion({ ...base, ...validParent }).completionPct).toBe(100);
  });

  test('personal done + a fully valid child -> 100%', () => {
    const children = [{ ...emptyChild(), name: 'Kid', age: '10', curriculum: 'IB PYP', grade: 'Grade 4', school: 'HIS' }];
    expect(computeParentCompletion({ ...base, ...validParent, children }).completionPct).toBe(100);
  });

  test('personal done + a partially-started child -> partial percentage', () => {
    const children = [{ ...emptyChild(), name: 'Kid' }]; // started, but nothing else filled
    const result = computeParentCompletion({ ...base, ...validParent, children });
    expect(result.completionPct).toBeGreaterThan(0);
    expect(result.completionPct).toBeLessThan(100);
  });
});
