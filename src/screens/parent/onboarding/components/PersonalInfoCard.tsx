import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  AutocompleteField, CardHeader, fetchCitySuggestions, locateFull,
  SelectField, COUNTRIES, INDIA_STATES, INDIA_CITIES, PhoneCodeSelect,
} from '../../../onboarding/OnboardingSharedFields';
import { DatePickerInput } from '../../../onboarding/OnboardingScreen';
import { MOBILE_VERIFICATION_ENABLED } from '../../../onboarding/mobileOtpVerification';

const TEAL = '#5F8A86';

export function PersonalInfoCard({
  colors, styles, teal = TEAL, done,
  fullName, setFullName,
  country, setCountry,
  stateProv, setStateProv,
  city, setCity,
  dob, setDob,
  mobile, mobileCode, setMobileCode, onMobileChange,
  mobileOtp,
  locating, setLocating,
}: {
  colors: any; styles: any; teal?: string; done: boolean;
  fullName: string; setFullName: (v: string) => void;
  country: string; setCountry: (v: string) => void;
  stateProv: string; setStateProv: (v: string) => void;
  city: string; setCity: (v: string) => void;
  dob: string; setDob: (v: string) => void;
  mobile: string; mobileCode: string; setMobileCode: (v: string) => void; onMobileChange: (v: string) => void;
  mobileOtp: any;
  locating: boolean; setLocating: (v: boolean) => void;
}) {
  return (
    <View style={[styles.card, styles.card3, { zIndex: 10 }]}>
      <CardHeader icon="user" title="1. Personal Info" subtitle="Tell us about yourself." done={done} styles={styles} />
      <View style={styles.fieldGroup}>
        <Text style={styles.lbl}>Full Name</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName}
          placeholder="Your name" placeholderTextColor={colors.textDim} autoCapitalize="words" />
      </View>
      {Platform.OS === 'web' && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 2 }}>
          <TouchableOpacity style={styles.locateBtn} onPress={() => locateFull(({ city: c, state: s, country: co }) => { if (co) setCountry(co); if (s) setStateProv(s); if (c) setCity(c); }, setLocating)} disabled={locating} activeOpacity={0.8}>
            <Feather name="crosshair" size={12} color={teal} />
            <Text style={styles.locateTxt}>{locating ? 'Locating...' : 'Use my location'}</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={[styles.fieldRow, { zIndex: 10 }]}>
        <View style={[styles.fieldGroup, { flex: 1, minWidth: 140, zIndex: 20 }]}>
          <Text style={styles.lbl}>Country</Text>
          <SelectField
            value={country}
            onChange={(c) => { setCountry(c); if (c !== 'India') setStateProv(''); setCity(''); }}
            options={COUNTRIES}
            placeholder="Select your country"
            searchPlaceholder="Search country..."
            colors={colors}
            styles={styles}
          />
        </View>
        <View style={[styles.fieldGroup, { flex: 1, minWidth: 140, zIndex: 15 }]}>
          <Text style={styles.lbl}>State / Province</Text>
          <SelectField
            value={stateProv}
            onChange={(s) => { setStateProv(s); setCity(''); }}
            options={country === 'India' ? INDIA_STATES : []}
            placeholder="Select your state"
            searchPlaceholder="Search state..."
            colors={colors}
            styles={styles}
          />
        </View>
      </View>
      <View style={[styles.fieldGroup, { zIndex: 9 }]}>
        <Text style={styles.lbl}>City</Text>
        {country === 'India' && INDIA_CITIES[stateProv] ? (
          <SelectField
            value={city}
            onChange={setCity}
            options={[...INDIA_CITIES[stateProv]].sort()}
            placeholder="Select your city"
            searchPlaceholder="Search city..."
            colors={colors}
            styles={styles}
          />
        ) : (
          <AutocompleteField
            value={city}
            onChange={setCity}
            fetchSuggestions={(q) => fetchCitySuggestions(q, { state: stateProv, country })}
            placeholder={stateProv || country ? 'Search for your city' : 'Select country & state first'}
            colors={colors}
            styles={styles}
          />
        )}
      </View>
      <View style={[styles.fieldRow, { zIndex: 8 }]}>
        <View style={[styles.fieldGroup, { flex: 1, minWidth: 140 }]}>
          <Text style={styles.lbl}>Date of Birth</Text>
          {Platform.OS === 'web' ? (
            <DatePickerInput value={dob} onChange={setDob} colors={colors} />
          ) : (
            <TextInput style={styles.input} value={dob} onChangeText={setDob}
              placeholder="DD/MM/YYYY" placeholderTextColor={colors.textDim} keyboardType="numeric" />
          )}
        </View>
        <View style={[styles.fieldGroup, { flex: 1, minWidth: 200 }]}>
          <Text style={styles.lbl}>Mobile Number</Text>
          <View style={styles.phoneRow}>
            <PhoneCodeSelect value={mobileCode} onChange={setMobileCode} colors={colors} styles={styles} />
            <TextInput style={[styles.input, styles.phoneInput]} value={mobile}
              onChangeText={onMobileChange}
              placeholder="98765 43210" placeholderTextColor={colors.textDim} keyboardType="phone-pad" />
            {MOBILE_VERIFICATION_ENABLED && (
              mobileOtp.mobileVerified && mobile === mobileOtp.verifiedMobile ? (
              <View style={styles.verifiedBadge}>
                <Feather name="check-circle" size={14} color={teal} />
                <Text style={styles.verifiedTxt}>Verified</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={mobileOtp.handleSendOtp}
                disabled={mobileOtp.otpSending || !mobile.trim()}
                activeOpacity={0.8}
              >
                <Text style={styles.verifyBtnTxt}>{mobileOtp.otpSending ? 'Sending...' : 'Verify'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {MOBILE_VERIFICATION_ENABLED && mobileOtp.otpError ? <Text style={styles.warnTxt}>{mobileOtp.otpError}</Text> : null}
        </View>
      </View>

      <View style={[styles.hintBox, styles.hintBoxRow, { backgroundColor: teal + '10', borderColor: teal + '25' }]}>
        <Feather name="shield" size={16} color={teal} />
        <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17, flex: 1 }}>
          The details you provide are used to create and secure your account. Your information is stored securely and treated as strictly confidential.
        </Text>
      </View>
    </View>
  );
}
