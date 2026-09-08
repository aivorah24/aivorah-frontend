import { useEffect, useState } from 'react';
import { useAuth, getPendingReturnRole } from '../../../../context/AuthContext';
import { useMobileOtpVerification } from '../../../onboarding/mobileOtpVerification';
import { fetchPreferences } from '../services/onboardingService';

// Personal Info card's form state, plus the two hydration effects that fill
// it from the server: one for anyone reopening onboarding after a partial
// save, one specifically for a teacher who's mid-way through adding a
// parent profile (pre-fills from their own teacher profile/preferences).
export function usePersonalInfo() {
  const { user } = useAuth();

  const [fullName, setFullName] = useState(user?.name || '');
  const [dob, setDob] = useState('');
  const [mobile, setMobile] = useState('');
  const [mobileCode, setMobileCode] = useState('+91');
  const [city, setCity] = useState((user as any)?.location || '');
  const [stateProv, setStateProv] = useState((user as any)?.state || '');
  const [country, setCountry] = useState((user as any)?.country || 'India');
  const [avatarStyle, setAvatarStyle] = useState('default');
  const [locating, setLocating] = useState(false);

  // Hydrate fields not carried on the `user` object (dob, mobile, avatar) from
  // previously saved preferences — otherwise reopening onboarding after a
  // partial/complete save shows these as blank even though they're saved server-side.
  useEffect(() => {
    if (!user?.email) return;
    fetchPreferences(user.email)
      .then((p) => {
        if (!p) return;
        if (p.dob) setDob(p.dob);
        if (p.phone) {
          const m = String(p.phone).match(/^(\+\d+)\s*(.*)$/);
          if (m) { setMobileCode(m[1]); setMobile(m[2]); } else setMobile(String(p.phone));
        }
        if (p.avatarStyle) setAvatarStyle(p.avatarStyle);
      })
      .catch(() => {});
  }, [user?.email]);

  // Pre-fill from teacher profile when a teacher is adding a parent profile.
  // One-time hydration from an external source (user object / server
  // fetch), not a value derivable from props/state at render time.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const isTeacherAddingParent = getPendingReturnRole() === 'teacher'
      || (user as any)?.roles?.includes('teacher');
    if (!isTeacherAddingParent || !user?.email) return;

    function applyMobile(raw: string) {
      const parts = raw.match(/^(\+\d+)\s(.+)$/);
      if (parts) { setMobileCode(parts[1]); setMobile(parts[2]); }
      else setMobile(raw);
    }

    const u = user as any;
    if (u?.name && !fullName)     setFullName(u.name);
    if (u?.dob)                   setDob(u.dob);
    if (u?.mobile)                applyMobile(u.mobile);
    if (u?.phone)                 applyMobile(u.phone);
    if (u?.state)                 setStateProv(u.state);
    if (u?.country)               setCountry(u.country);
    if (u?.location)              setCity(u.location);

    fetchPreferences(user.email)
      .then((prefs) => {
        if (!prefs) return;
        if (prefs.name)    setFullName(prefs.name);
        if (prefs.dob)     setDob(prefs.dob);
        const phoneRaw = prefs.mobile || prefs.phone;
        if (phoneRaw)      applyMobile(phoneRaw);
        if (prefs.state)   setStateProv(prefs.state);
        if (prefs.country) setCountry(prefs.country);
        if (prefs.location) setCity(prefs.location);
        else if (u?.location) setCity(u.location);
      })
      .catch(() => {});
    // Deliberately run once on mount only, matching the original.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const mobileOtp = useMobileOtpVerification(mobile, setMobile, mobileCode);
  // Editing the number after verifying invalidates the previous verification.
  const onMobileChange = (v: string) => {
    setMobile(v);
    if (mobileOtp.mobileVerified) mobileOtp.setMobileVerified(false);
  };

  return {
    fullName, setFullName,
    dob, setDob,
    mobile, onMobileChange,
    mobileCode, setMobileCode,
    city, setCity,
    stateProv, setStateProv,
    country, setCountry,
    avatarStyle, setAvatarStyle,
    locating, setLocating,
    mobileOtp,
  };
}
