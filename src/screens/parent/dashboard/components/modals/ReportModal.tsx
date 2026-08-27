import React from 'react';
import { View, Text, ScrollView, Modal, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';

export default function ReportModal({
  visible, onClose, loading, reportData, childName, onDownloadPDF, colors, s,
}: {
  visible: boolean; onClose: () => void; loading: boolean; reportData: any;
  childName: string; onDownloadPDF: () => void; colors: AppColors; s: any;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalBox, { maxHeight: '90%' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentYellow + '20', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="file-text" size={16} color={colors.accentYellow} />
              </View>
              <View>
                <Text style={s.modalTitle}>AI Performance Report</Text>
                <Text style={s.modalDesc}>{childName}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
              <ActivityIndicator color={colors.accentYellow} size="large" />
              <Text style={[s.modalDesc, { textAlign: 'center' }]}>Analyzing {childName}&apos;s learning data...</Text>
            </View>
          ) : !reportData ? (
            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
              <Feather name="alert-circle" size={28} color={colors.accentRed} />
              <Text style={[s.modalDesc, { textAlign: 'center' }]}>Could not generate report. Please try again.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'XP', value: reportData.metrics.xp.toLocaleString() },
                  { label: 'Level', value: String(reportData.metrics.level) },
                  { label: 'Streak', value: `${reportData.metrics.currentStreak}d` },
                  { label: 'Topics', value: String(reportData.metrics.topicsCompleted) },
                  { label: 'Assignments', value: String(reportData.metrics.assignmentsDone) },
                  { label: 'Active Days', value: `${reportData.metrics.activeDaysThisWeek}/7` },
                ].map(m => (
                  <View key={m.label} style={{ backgroundColor: colors.bgDark, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 70, borderWidth: 1, borderColor: colors.borderColor }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accentYellow }}>{m.value}</Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{m.label}</Text>
                  </View>
                ))}
              </View>
              {reportData.report.summary ? <View style={s.reportSection}><Text style={s.reportSectionTitle}>Overview</Text><Text style={s.reportBody}>{reportData.report.summary}</Text></View> : null}
              {(reportData.report.strengths || []).length > 0 ? (
                <View style={s.reportSection}>
                  <Text style={s.reportSectionTitle}>Strengths</Text>
                  {reportData.report.strengths.map((str: string, i: number) => (
                    <View key={i} style={s.reportListItem}><Feather name="check-circle" size={13} color={colors.accentYellow} style={{ marginTop: 2 }} /><Text style={[s.reportBody, { flex: 1 }]}>{str}</Text></View>
                  ))}
                </View>
              ) : null}
              {(reportData.report.areas_for_improvement || []).length > 0 ? (
                <View style={s.reportSection}>
                  <Text style={s.reportSectionTitle}>Areas for Improvement</Text>
                  {reportData.report.areas_for_improvement.map((str: string, i: number) => (
                    <View key={i} style={s.reportListItem}><Feather name="arrow-up-circle" size={13} color={colors.accentYellow} style={{ marginTop: 2 }} /><Text style={[s.reportBody, { flex: 1 }]}>{str}</Text></View>
                  ))}
                </View>
              ) : null}
              {(reportData.report.recommendations || []).length > 0 ? (
                <View style={s.reportSection}>
                  <Text style={s.reportSectionTitle}>Recommendations</Text>
                  {reportData.report.recommendations.map((str: string, i: number) => (
                    <View key={i} style={s.reportListItem}><Feather name="star" size={13} color={colors.accentYellow} style={{ marginTop: 2 }} /><Text style={[s.reportBody, { flex: 1 }]}>{str}</Text></View>
                  ))}
                </View>
              ) : null}
              {reportData.report.encouragement ? (
                <View style={[s.reportSection, { backgroundColor: colors.accentYellow + '10', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.accentYellow + '30' }]}>
                  <Text style={[s.reportSectionTitle, { color: colors.accentYellow }]}>Share with {childName}</Text>
                  <Text style={[s.reportBody, { fontStyle: 'italic' }]}>&quot;{reportData.report.encouragement}&quot;</Text>
                </View>
              ) : null}
              <View style={{ height: 8 }} />
            </ScrollView>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <TouchableOpacity style={{ flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: colors.borderColor }} onPress={onClose} activeOpacity={0.8}>
              <Text style={{ color: colors.textMuted, fontWeight: '600', fontSize: 14 }}>Close</Text>
            </TouchableOpacity>
            {reportData && Platform.OS === 'web' ? (
              <TouchableOpacity style={{ flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: 'center', backgroundColor: colors.accentYellow, flexDirection: 'row', justifyContent: 'center', gap: 8 }} onPress={onDownloadPDF} activeOpacity={0.85}>
                <Feather name="download" size={15} color="#0B0B0B" />
                <Text style={{ color: '#0B0B0B', fontWeight: '700', fontSize: 14 }}>Download PDF</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
