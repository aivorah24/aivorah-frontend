export interface ChildEntry {
  name: string;
  age: string;
  grade: string;
  curriculum: string;
  school: string;
  schoolCity: string;
  email: string;
  linkEmail: string;
  password: string;
  verifiedEmail: string; // the child email that has been OTP-verified (must equal `email`)
}

export function emptyChild(): ChildEntry {
  return {
    name: '', age: '', grade: '', curriculum: '', school: '', schoolCity: '',
    email: '', linkEmail: '', password: '', verifiedEmail: '',
  };
}

export interface ChildCredential {
  name: string;
  loginId: string;
  password: string;
  studentId: string;
  verificationRequired: boolean;
}
