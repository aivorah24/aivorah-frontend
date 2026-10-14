import React from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { AccessRequest } from '../types';
import { normalizeCurriculum } from '../../../../utils/curriculum';

interface AccessRequestRailProps {
  accessRequests: AccessRequest[];
  actioningId: string | null;
  onSelectRequest: (request: AccessRequest) => void;
  onActionRequest: (id: string, action: 'approve' | 'reject') => void;
  colors: AppColors;
  isMobile?: boolean;
}

export default function AccessRequestRail({
  accessRequests,
  actioningId,
  onSelectRequest,
  onActionRequest,
  colors,
  isMobile,
}: AccessRequestRailProps) {
  if (accessRequests.length === 0) return null;

  return (
    <View style={[styles.rail, isMobile && styles.railMobile]}>
      <Text style={[styles.sectionLabel, { color: colors.accentYellow }]}>
        SCHOOL JOIN REQUESTS ({accessRequests.length})
      </Text>
      <View style={styles.requestList}>
        {accessRequests.map((r) => {
          const reqClass = [r.grade, r.section].filter(Boolean).join(' - ');
          const roleLabel = r.role ? r.role.charAt(0).toUpperCase() + r.role.slice(1) : null;
          const hasParents = r.parents && r.parents.length > 0;
          return (
            <TouchableOpacity
              key={r.id}
              style={[
                styles.requestCard,
                { backgroundColor: colors.cardDark, borderColor: `${colors.accentYellow}66` },
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
              activeOpacity={0.85}
              onPress={() => onSelectRequest(r)}
              accessibilityRole="button"
            >
              <View style={styles.requestTopRow}>
                <Text style={[styles.requestName, { color: colors.textHeading }]} numberOfLines={1}>
                  {r.name || r.user_email}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {r.age !== null && r.age !== undefined && (
                    <View
                      style={[
                        styles.ageTag,
                        r.isUnder14
                          ? { backgroundColor: `${colors.accentRed}20`, borderColor: colors.accentRed }
                          : { backgroundColor: `${colors.accentGreen || '#2E7D5B'}20`, borderColor: colors.accentGreen || '#2E7D5B' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.ageTagText,
                          r.isUnder14 ? { color: colors.accentRed } : { color: colors.accentGreen || '#2E7D5B' },
                        ]}
                      >
                        Age {r.age} · {r.isUnder14 ? '< 14 Consent' : '14+ Student'}
                      </Text>
                    </View>
                  )}
                  {roleLabel && (
                    <View style={[styles.rolePill, { backgroundColor: `${colors.accentYellow}22` }]}>
                      <Text style={[styles.rolePillText, { color: colors.accentYellow }]}>{roleLabel}</Text>
                    </View>
                  )}
                </View>
              </View>
              {r.name && (
                <Text style={[styles.requestMeta, { color: colors.textDim }]} numberOfLines={1}>
                  {r.user_email}
                </Text>
              )}
              {(reqClass || r.curriculum) && (
                <Text style={[styles.requestMeta, { color: colors.textDim }]} numberOfLines={1}>
                  {[reqClass && `Requested: ${reqClass}`, normalizeCurriculum(r.curriculum)].filter(Boolean).join('  ·  ')}
                </Text>
              )}
              <View
                style={[
                  styles.parentPreviewBox,
                  { backgroundColor: `${colors.bgDark}99`, borderColor: colors.borderColor },
                ]}
              >
                {hasParents ? (
                  <Text style={[styles.requestParentLinked, { color: colors.textMuted }]} numberOfLines={2}>
                    <Feather name="users" size={12} color={colors.accentYellow} />{'  '}
                    Parent Verified:{' '}
                    <Text style={{ fontWeight: '700', color: colors.textHeading }}>
                      {r.parents.map((p) => p.name || p.email).join(', ')}
                    </Text>
                  </Text>
                ) : (
                  <Text style={[styles.requestParentDim, { color: colors.textDim }]} numberOfLines={2}>
                    <Feather name="shield" size={12} color={colors.textDim} />{'  '}
                    {r.isUnder14
                      ? 'Parent verification required (< 14). Tap to review & verify.'
                      : 'Parent: Not linked (Age 14+ self-initiated request). Tap for full family check.'}
                  </Text>
                )}
              </View>
              <View style={styles.requestBtns}>
                <TouchableOpacity
                  style={[
                    styles.reqApprove,
                    { backgroundColor: colors.accentYellow },
                    actioningId === r.id && { opacity: 0.5 },
                  ]}
                  disabled={actioningId === r.id}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onActionRequest(r.id, 'approve');
                  }}
                  accessibilityRole="button"
                >
                  <Feather name="check" size={13} color="#0B0B0B" />
                  <Text style={styles.reqApproveText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.reqReject,
                    { borderColor: colors.borderColor },
                    actioningId === r.id && { opacity: 0.5 },
                  ]}
                  disabled={actioningId === r.id}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onActionRequest(r.id, 'reject');
                  }}
                  accessibilityRole="button"
                >
                  <Feather name="x" size={13} color={colors.accentRed} />
                  <Text style={[styles.reqRejectText, { color: colors.accentRed }]}>Reject</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { width: 280 },
  railMobile: { width: '100%', marginTop: 24 /* spacing.xl */ },
  sectionLabel: {
    fontFamily: fonts.serif,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8 /* spacing.sm */,
  },
  requestList: { gap: 10, marginBottom: 16 /* spacing.lg */ },
  requestCard: {
    borderWidth: 1,
    borderRadius: 8 /* radius.md */,
    padding: 14,
    gap: 6,
  },
  requestTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  requestName: { flex: 1, fontFamily: fonts.serif, fontSize: 14.5, fontWeight: '800' },
  ageTag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  ageTagText: { fontFamily: fonts.serif, fontSize: 10.5, fontWeight: '700' },
  rolePill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  rolePillText: {
    fontFamily: fonts.serif,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  requestMeta: { fontFamily: fonts.serif, fontSize: 12 },
  parentPreviewBox: {
    borderRadius: 6 /* radius.sm */,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
    borderWidth: 1,
  },
  requestParentLinked: { fontFamily: fonts.serif, fontSize: 12, lineHeight: 17 },
  requestParentDim: { fontFamily: fonts.serif, fontSize: 11.5, lineHeight: 16 },
  requestBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  reqApprove: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 6 /* radius.sm */,
    paddingVertical: 10,
  },
  reqApproveText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '800', color: '#0B0B0B' },
  reqReject: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 6 /* radius.sm */,
    paddingVertical: 10,
  },
  reqRejectText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700' },
});
