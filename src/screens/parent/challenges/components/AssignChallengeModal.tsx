import React from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import type { Challenge, Child } from '../services/parentChallengesService';
import type { ParentChallengesStyles } from '../styles';

export default function AssignChallengeModal({
  visible, onClose, colors, styles,
  challenge, child,
  assigning, assignError, assignSuccess,
  assignDueDate, setAssignDueDate, getDueDateLabel,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  colors: AppColors;
  styles: ParentChallengesStyles;
  challenge: Challenge | null;
  child: Child | null;
  assigning: boolean;
  assignError: string;
  assignSuccess: string;
  assignDueDate: string;
  setAssignDueDate: (d: string) => void;
  getDueDateLabel: (offset: number) => string;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          {assignSuccess ? (
            <>
              <View style={styles.successIcon}>
                <Feather name="check-circle" size={28} color={colors.accentGreen} />
              </View>
              <Text style={styles.successTitle}>Challenge Assigned!</Text>
              <Text style={styles.successSub}>{assignSuccess}</Text>
              <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.confirmTitle}>Assign Challenge</Text>
              <Text style={styles.confirmDesc}>
                Assign <Text style={{ fontWeight: '700', color: colors.textMain }}>{challenge?.title}</Text> to{' '}
                <Text style={{ fontWeight: '700', color: colors.accentYellow }}>{child?.name}</Text>?
              </Text>

              <View style={styles.confirmMeta}>
                <Feather name="star" size={13} color={colors.accentYellow} />
                <Text style={[styles.confirmMetaText, { color: colors.accentYellow }]}>{challenge?.xpReward} XP reward</Text>
                <View style={styles.dot} />
                <Text style={styles.confirmMetaText}>{challenge?.questionCount} questions</Text>
                <View style={styles.dot} />
                <Text style={styles.confirmMetaText}>{challenge?.timeLimitMinutes} min</Text>
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={[styles.confirmMetaText, { marginBottom: 8, fontWeight: '600', color: colors.textMain }]}>
                  <Feather name="flag" size={13} color={colors.accentYellow} /> Due Date
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { label: 'Tomorrow', date: getDueDateLabel(1) },
                    { label: '3 Days',   date: getDueDateLabel(3) },
                    { label: '1 Week',   date: getDueDateLabel(7) },
                    { label: '2 Weeks',  date: getDueDateLabel(14) },
                  ].map(opt => (
                    <TouchableOpacity
                      key={opt.label}
                      onPress={() => setAssignDueDate(opt.date)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: assignDueDate === opt.date ? colors.accentYellow : colors.borderColor,
                        backgroundColor: assignDueDate === opt.date ? colors.accentYellow + '22' : 'transparent',
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontFamily: fonts.serif, fontSize: 12, color: assignDueDate === opt.date ? colors.accentYellow : colors.textMuted }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{ fontFamily: fonts.serif, fontSize: 11, color: colors.textDim, marginTop: 6 }}>
                  Due: {assignDueDate || 'Not set'}
                </Text>
              </View>

              {assignError ? (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={13} color={colors.accentRed} />
                  <Text style={[styles.errorText, { color: colors.accentRed }]}>{assignError}</Text>
                </View>
              ) : null}

              <View style={styles.confirmBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, assigning && styles.confirmBtnDisabled]}
                  onPress={onConfirm} disabled={assigning} activeOpacity={0.85}
                >
                  {assigning ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Assign</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
