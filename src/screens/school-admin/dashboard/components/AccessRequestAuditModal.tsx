import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Platform, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts, radius } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { AccessRequest } from '../types';
import { normalizeCurriculum } from '../../../../utils/curriculum';

interface AccessRequestAuditModalProps {
  selectedAuditRequest: AccessRequest | null;
  onClose: () => void;
  actioningId: string | null;
  onActionRequest: (id: string, action: 'approve' | 'reject') => void;
  colors: AppColors;
}

export default function AccessRequestAuditModal({
  selectedAuditRequest,
  onClose,
  actioningId,
  onActionRequest,
  colors,
}: AccessRequestAuditModalProps) {
  if (!selectedAuditRequest) return null;

  return (
    <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.auditOverlay}>
        <View
          style={[
            styles.auditCard,
            { backgroundColor: colors.cardDark, borderColor: colors.borderColor },
            Platform.OS === 'web' && ({ maxHeight: '88vh' } as any),
          ]}
        >
          <View style={[styles.auditHeaderRow, { borderBottomColor: colors.borderColor }]}>
            <View style={[styles.auditHeaderIcon, { backgroundColor: `${colors.accentYellow}22` }]}>
              <Feather name="shield" size={18} color={colors.accentYellow} />
            </View>
            <Text style={[styles.auditHeaderTitle, { color: colors.textHeading }]}>
              Access Verification Audit
            </Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            <View style={styles.auditSection}>
              <Text style={[styles.auditSectionTitle, { color: colors.textDim }]}>STUDENT APPLICANT PROFILE</Text>
              <View style={[styles.auditDataBox, { backgroundColor: colors.bgDark, borderColor: colors.borderColor }]}>
                <Text style={[styles.auditDataName, { color: colors.textHeading }]}>
                  {selectedAuditRequest.name || selectedAuditRequest.user_email}
                </Text>
                <Text style={[styles.auditDataEmail, { color: colors.textMuted }]}>
                  {selectedAuditRequest.user_email}
                </Text>
                <View style={[styles.auditDataGrid, { borderTopColor: colors.borderColor }]}>
                  <View style={styles.auditGridItem}>
                    <Text style={[styles.auditGridLabel, { color: colors.textDim }]}>AGE & CONSENT</Text>
                    <Text
                      style={[
                        styles.auditGridVal,
                        selectedAuditRequest.isUnder14
                          ? { color: colors.accentRed }
                          : { color: colors.accentGreen || '#2E7D5B' },
                      ]}
                    >
                      {selectedAuditRequest.age ? `Age ${selectedAuditRequest.age}` : 'Unknown'} ·{' '}
                      {selectedAuditRequest.isUnder14 ? 'Under 14 Consent' : '14+ Independent'}
                    </Text>
                  </View>
                  <View style={styles.auditGridItem}>
                    <Text style={[styles.auditGridLabel, { color: colors.textDim }]}>REQUESTED PLACEMENT</Text>
                    <Text style={[styles.auditGridVal, { color: colors.textHeading }]}>
                      {[selectedAuditRequest.grade, selectedAuditRequest.section].filter(Boolean).join(' - ') || 'Any / Unspecified'}
                    </Text>
                  </View>
                  <View style={styles.auditGridItem}>
                    <Text style={[styles.auditGridLabel, { color: colors.textDim }]}>CURRICULUM</Text>
                    <Text style={[styles.auditGridVal, { color: colors.textHeading }]}>
                      {normalizeCurriculum(selectedAuditRequest.curriculum) || 'Standard IB/CBSE'}
                    </Text>
                  </View>
                  <View style={styles.auditGridItem}>
                    <Text style={[styles.auditGridLabel, { color: colors.textDim }]}>PHONE</Text>
                    <Text style={[styles.auditGridVal, { color: colors.textHeading }]}>
                      {selectedAuditRequest.phone || 'Not provided'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={[styles.auditSection, { marginTop: 16 }]}>
              <Text style={[styles.auditSectionTitle, { color: colors.textDim }]}>
                LINKED PARENT / GUARDIAN VERIFICATION
              </Text>
              {selectedAuditRequest.parents && selectedAuditRequest.parents.length > 0 ? (
                selectedAuditRequest.parents.map((p, i) => (
                  <View
                    key={i}
                    style={[
                      styles.auditParentRow,
                      { backgroundColor: colors.bgDark, borderColor: `${colors.accentYellow}44` },
                    ]}
                  >
                    <View style={[styles.auditParentIcon, { backgroundColor: `${colors.accentYellow}18` }]}>
                      <Feather name="users" size={16} color={colors.accentYellow} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.auditParentName, { color: colors.textHeading }]}>
                        {p.name || 'Verified Family Guardian'}
                      </Text>
                      <Text style={[styles.auditParentEmail, { color: colors.textMuted }]}>{p.email}</Text>
                      <Text style={[styles.auditParentStatus, { color: colors.accentYellow }]}>
                        Status: Linked · B2B Welcome Notification Queued
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View
                  style={[
                    styles.auditNoParentBox,
                    { backgroundColor: colors.bgDark, borderColor: colors.borderColor },
                  ]}
                >
                  <Feather
                    name="alert-circle"
                    size={18}
                    color={selectedAuditRequest.isUnder14 ? colors.accentRed : colors.textDim}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.auditNoParentTitle,
                        { color: colors.textHeading },
                        selectedAuditRequest.isUnder14 && { color: colors.accentRed },
                      ]}
                    >
                      {selectedAuditRequest.isUnder14
                        ? 'Under 14: Parent Verification Required'
                        : 'Student 14+ Self-Initiated Application'}
                    </Text>
                    <Text style={[styles.auditNoParentDesc, { color: colors.textMuted }]}>
                      {selectedAuditRequest.isUnder14
                        ? 'This student is under 14 and currently has no parent email linked in our family registry. Ensure parental consent before approving.'
                        : 'Students aged 14 and above can request school membership directly. No parent account is linked right now, but they can link one anytime.'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={[styles.auditFooterRow, { borderTopColor: colors.borderColor }]}>
            <TouchableOpacity
              style={[
                styles.auditRejectBtn,
                { borderColor: colors.borderColor },
                actioningId === selectedAuditRequest.id && { opacity: 0.5 },
              ]}
              disabled={actioningId === selectedAuditRequest.id}
              onPress={() => onActionRequest(selectedAuditRequest.id, 'reject')}
              accessibilityRole="button"
            >
              <Feather name="x" size={15} color={colors.accentRed} />
              <Text style={[styles.auditRejectText, { color: colors.accentRed }]}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.auditApproveBtn,
                { backgroundColor: colors.accentYellow },
                actioningId === selectedAuditRequest.id && { opacity: 0.5 },
              ]}
              disabled={actioningId === selectedAuditRequest.id}
              onPress={() => onActionRequest(selectedAuditRequest.id, 'approve')}
              accessibilityRole="button"
            >
              <Feather name="check" size={15} color="#0B0B0B" />
              <Text style={styles.auditApproveText}>Approve & Link Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  auditOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  auditCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    width: '100%',
    maxWidth: 520,
    gap: 14,
  },
  auditHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
  },
  auditHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditHeaderTitle: { flex: 1, fontFamily: fonts.serif, fontSize: 17, fontWeight: '800' },
  auditSection: { gap: 8 },
  auditSectionTitle: {
    fontFamily: fonts.serif,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  auditDataBox: {
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  auditDataName: { fontFamily: fonts.serif, fontSize: 16, fontWeight: '800' },
  auditDataEmail: { fontFamily: fonts.serif, fontSize: 13, marginBottom: 10 },
  auditDataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  auditGridItem: { width: '46%', gap: 3 },
  auditGridLabel: { fontFamily: fonts.serif, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  auditGridVal: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700' },
  auditParentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  auditParentIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  auditParentName: { fontFamily: fonts.serif, fontSize: 13.5, fontWeight: '700' },
  auditParentEmail: { fontFamily: fonts.serif, fontSize: 12 },
  auditParentStatus: { fontFamily: fonts.serif, fontSize: 11, marginTop: 4, fontWeight: '600' },
  auditNoParentBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
  },
  auditNoParentTitle: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  auditNoParentDesc: { fontFamily: fonts.serif, fontSize: 12, lineHeight: 18 },
  auditFooterRow: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
  },
  auditRejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 12,
  },
  auditRejectText: { fontFamily: fonts.serif, fontSize: 13.5, fontWeight: '700' },
  auditApproveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.sm,
    paddingVertical: 12,
  },
  auditApproveText: { fontFamily: fonts.serif, fontSize: 13.5, fontWeight: '800', color: '#0B0B0B' },
});
