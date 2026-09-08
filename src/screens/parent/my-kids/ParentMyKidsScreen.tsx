import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { ChildCard } from './components/ChildCard';
import { useMyKids } from './hooks/useMyKids';
import { makeStyles } from './styles';

export default function ParentMyKidsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const k = useMyKids();

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="My Kids"
          subtitle="Managed Accounts"
          searchPlaceholder="Search kids..."
          onMenuPress={() => navigation.openDrawer()}
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={k.refreshing} onRefresh={() => { k.setRefreshing(true); k.fetchChildren(); }} tintColor={colors.accentYellow} />}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>Managed Accounts</Text>
              <Text style={styles.pageSubtitle}>View progress, manage controls, and update settings for your children.</Text>
            </View>
            <TouchableOpacity style={styles.addChildBtn} activeOpacity={0.85} onPress={() => k.openModal('create')}>
              <Feather name="user-plus" size={16} color="#fff" />
              <Text style={styles.addChildBtnTxt}>Add Child</Text>
            </TouchableOpacity>
          </View>

          {k.loading ? (
            <ActivityIndicator color={colors.accentYellow} style={{ paddingVertical: 48 }} />
          ) : (
            <View style={styles.cardsRow}>
              {k.children.map((child: any) => (
                <ChildCard
                  key={child.id}
                  child={child}
                  colors={colors}
                  styles={styles}
                  navigation={navigation}
                  onRemove={k.confirmRemove}
                  onEdit={k.openEdit}
                  onManageTasks={k.openTaskModal}
                  onViewCreds={k.fetchChildCreds}
                />
              ))}

              {k.children.length === 0 && (
                <TouchableOpacity style={styles.emptyState} activeOpacity={0.7} onPress={() => k.openModal('create')}>
                  <Feather name="user-plus" size={40} color={colors.textDim} />
                  <Text style={styles.emptyTitle}>No children linked yet</Text>
                  <Text style={styles.emptySub}>Tap here, or use &quot;Add Child&quot; above, to create a new account or link an existing one.</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Daily Tasks Modal */}
      <Modal visible={k.showTaskModal} transparent animationType="fade" onRequestClose={() => k.setShowTaskModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Daily Tasks</Text>
                <Text style={[styles.modalDesc, { marginBottom: 0 }]}>{k.taskModalChild?.name}&apos;s tasks</Text>
              </View>
              <TouchableOpacity onPress={() => k.setShowTaskModal(false)}>
                <Feather name="x" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
              {k.childTasks.length === 0 ? (
                <Text style={[styles.modalDesc, { textAlign: 'center', paddingVertical: 16 }]}>No tasks assigned yet.</Text>
              ) : k.childTasks.map((task: any) => (
                <View key={task.id} style={styles.taskRow}>
                  <View style={styles.taskIconCircle}>
                    <Feather name={(task.icon as any) || 'check-circle'} size={14} color="#B8860B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskLabel}>{task.label}</Text>
                    <Text style={styles.taskCoinsText}>{task.coins} coins</Text>
                  </View>
                  <TouchableOpacity onPress={() => k.deleteTask(task.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="trash-2" size={15} color={colors.accentRed} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={{ height: 1, backgroundColor: colors.borderColor }} />

            <Text style={[styles.modalTitle, { fontSize: 14 }]}>Add New Task</Text>

            <TextInput
              style={styles.input}
              placeholder="Task description (e.g. Read for 20 mins)"
              placeholderTextColor={colors.textMuted}
              value={k.taskLabel}
              onChangeText={t => { k.setTaskLabel(t); k.setTaskError(''); }}
            />

            <View>
              <Text style={[styles.modalDesc, { marginBottom: 8 }]}>Icon</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['check-circle','book-open','sun','moon','droplet','activity','shield','smile','star','coffee'] as const).map(ic => (
                  <TouchableOpacity
                    key={ic}
                    onPress={() => k.setTaskIcon(ic)}
                    style={[styles.iconChip, k.taskIcon === ic && { backgroundColor: '#B8860B20', borderColor: '#B8860B' }]}
                    activeOpacity={0.7}
                  >
                    <Feather name={ic} size={16} color={k.taskIcon === ic ? '#B8860B' : colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text style={[styles.modalDesc, { marginBottom: 8 }]}>Coins reward</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['5','10','15','20'].map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => k.setTaskCoins(c)}
                    style={[styles.coinChip, k.taskCoins === c && { backgroundColor: colors.accentYellow + '20', borderColor: colors.accentYellow }]}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: k.taskCoins === c ? colors.accentYellow : colors.textMuted }}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {k.taskError ? (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={13} color={colors.accentRed} />
                <Text style={[styles.errorText, { color: colors.accentRed }]}>{k.taskError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.linkBtn, { backgroundColor: '#B8860B' }, (!k.taskLabel.trim() || k.savingTask) && { opacity: 0.5 }]}
              onPress={k.createTask}
              disabled={!k.taskLabel.trim() || k.savingTask}
              activeOpacity={0.8}
            >
              {k.savingTask
                ? <ActivityIndicator color="white" size="small" />
                : <><Feather name="plus" size={15} color="#fff" /><Text style={styles.linkBtnText}>Add Task</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Child Modal */}
      <Modal visible={k.showModal} transparent animationType="fade" onRequestClose={() => { k.setShowModal(false); k.setShowOtpInput(false); k.setOtpCode(''); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Child Account</Text>
              <TouchableOpacity onPress={() => { k.setShowModal(false); k.setShowOtpInput(false); k.setOtpCode(''); }}>
                <Feather name="x" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, k.modalTab === 'create' && styles.tabActive]}
                onPress={() => { k.setModalTab('create'); k.setCreateError(''); }}
                activeOpacity={0.8}>
                <Feather name="user-plus" size={14} color={k.modalTab === 'create' ? colors.accentYellow : colors.textMuted} />
                <Text style={[styles.tabText, k.modalTab === 'create' && { color: colors.accentYellow, fontWeight: '700' }]}>Create New</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, k.modalTab === 'link' && styles.tabActive]}
                onPress={() => { k.setModalTab('link'); k.setLinkError(''); }}
                activeOpacity={0.8}>
                <Feather name="link" size={14} color={k.modalTab === 'link' ? colors.accentYellow : colors.textMuted} />
                <Text style={[styles.tabText, k.modalTab === 'link' && { color: colors.accentYellow, fontWeight: '700' }]}>Link Existing</Text>
              </TouchableOpacity>
            </View>

            {k.modalTab === 'create' && (
              k.showOtpInput && k.otpPurpose === 'create' ? (
                <View style={{ gap: 15, paddingVertical: 10 }}>
                  <Text style={styles.modalDesc}>
                    We have sent a 6-digit OTP verification code to <Text style={{ fontWeight: '700' }}>{k.otpSentEmail}</Text> to verify this child account email.
                  </Text>
                  <TextInput
                    style={[styles.input, { textAlign: 'center', fontSize: 20, letterSpacing: 5 }]}
                    placeholder="000000"
                    placeholderTextColor={colors.textMuted}
                    maxLength={6}
                    keyboardType="number-pad"
                    value={k.otpCode}
                    onChangeText={k.setOtpCode}
                  />
                  {k.createError ? (
                    <View style={styles.errorRow}>
                      <Feather name="alert-circle" size={13} color={colors.accentRed} />
                      <Text style={[styles.errorText, { color: colors.accentRed }]}>{k.createError}</Text>
                    </View>
                  ) : null}
                  <TouchableOpacity
                    style={[styles.linkBtn, k.isVerifyingOtp && { opacity: 0.6 }]}
                    onPress={k.handleVerifyOtp}
                    disabled={k.isVerifyingOtp}
                    activeOpacity={0.8}
                  >
                    {k.isVerifyingOtp ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={styles.linkBtnText}>Verify & Create Account</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.linkBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.textMuted }]}
                    onPress={() => { k.setShowOtpInput(false); k.setOtpCode(''); k.setCreateError(''); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.linkBtnText, { color: colors.textMuted }]}>Go Back</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <Text style={styles.modalDesc}>
                    Create a student account for your child. Only name and grade are required.
                  </Text>

                  <TextInput style={styles.input} placeholder="Child's full name *" placeholderTextColor={colors.textMuted}
                    value={k.newName} onChangeText={t => { k.setNewName(t); k.setCreateError(''); }} autoCapitalize="words" />

                  <View>
                    <TextInput style={styles.input} placeholder="Email address (optional)" placeholderTextColor={colors.textMuted}
                      value={k.newEmail} onChangeText={t => { k.setNewEmail(t); k.setCreateError(''); }}
                      keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                    <Text style={[styles.modalDesc, { marginTop: 3, fontSize: 11, opacity: 0.7 }]}>
                      Leave blank — we&apos;ll auto-generate a login ID
                    </Text>
                  </View>

                  <Text style={[styles.modalDesc, { marginTop: -4, fontSize: 11, opacity: 0.8 }]}>
                    Aivorah generates the child password securely. Real email accounts must be verified before login.
                  </Text>

                  <View style={styles.rowInputs}>
                    <View style={[styles.input, styles.pickerWrap, { flex: 1 }]}>
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4 }}>Curriculum</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {k.CURRICULA.map((c: string) => (
                          <TouchableOpacity key={c} onPress={() => {
                            k.setNewCurriculum(c);
                            if (!k.getGradesForCurriculum(c).includes(k.newGrade)) k.setNewGrade('');
                          }} activeOpacity={0.8}
                            style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
                              backgroundColor: k.newCurriculum === c ? colors.accentYellow + '20' : colors.bgDark,
                              borderWidth: 1, borderColor: k.newCurriculum === c ? colors.accentYellow : colors.accentYellow + '25' }}>
                            <Text style={{ fontSize: 12, color: k.newCurriculum === c ? colors.accentYellow : colors.textMuted, fontWeight: k.newCurriculum === c ? '700' : '400' }}>{c}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  <View style={styles.rowInputs}>
                    <View style={[styles.input, styles.pickerWrap, { flex: 1 }]}>
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4 }}>Grade</Text>
                      {k.newCurriculum ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {k.getGradesForCurriculum(k.newCurriculum).map((g: string) => (
                            <TouchableOpacity key={g} onPress={() => k.setNewGrade(g)} activeOpacity={0.8}
                              style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
                                backgroundColor: k.newGrade === g ? colors.accentYellow + '20' : colors.bgDark,
                                borderWidth: 1, borderColor: k.newGrade === g ? colors.accentYellow : colors.accentYellow + '25' }}>
                              <Text style={{ fontSize: 12, color: k.newGrade === g ? colors.accentYellow : colors.textMuted, fontWeight: k.newGrade === g ? '700' : '400' }}>{g}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic' }}>Select a curriculum first</Text>
                      )}
                    </View>
                  </View>

                  <TextInput style={styles.input} placeholder="School name (optional)" placeholderTextColor={colors.textMuted}
                    value={k.newSchool} onChangeText={k.setNewSchool} autoCapitalize="words" />

                  {k.createError ? (
                    <View style={styles.errorRow}>
                      <Feather name="alert-circle" size={13} color={colors.accentRed} />
                      <Text style={[styles.errorText, { color: colors.accentRed }]}>{k.createError}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.linkBtn, (!k.newName.trim() || !k.newCurriculum || !k.newGrade || k.creating) && { opacity: 0.5 }]}
                    onPress={k.handleCreateSubmit}
                    disabled={!k.newName.trim() || !k.newCurriculum || !k.newGrade || k.creating}
                    activeOpacity={0.8}>
                    {k.creating
                      ? <ActivityIndicator color="white" size="small" />
                      : <><Feather name="user-plus" size={15} color="#fff" /><Text style={styles.linkBtnText}>Create Student Account</Text></>}
                  </TouchableOpacity>
                </View>
              )
            )}

            {k.modalTab === 'link' && (
              <View style={{ gap: 10 }}>
                <Text style={styles.modalDesc}>
                  If your child already has an Aivorah account, enter their registered email to link it.
                </Text>

                <TextInput
                  style={[styles.input, k.linkError ? { borderColor: colors.accentRed } : {}]}
                  placeholder="child@example.com"
                  placeholderTextColor={colors.textMuted}
                  value={k.childEmail}
                  onChangeText={t => { k.setChildEmail(t); k.setLinkError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {k.linkError ? (
                  <View style={styles.errorRow}>
                    <Feather name="alert-circle" size={13} color={colors.accentRed} />
                    <Text style={[styles.errorText, { color: colors.accentRed }]}>{k.linkError}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.linkBtn, (!k.childEmail.trim() || k.linking) && { opacity: 0.5 }]}
                  onPress={k.addChild}
                  disabled={!k.childEmail.trim() || k.linking}
                  activeOpacity={0.8}>
                  {k.linking
                    ? <ActivityIndicator color="white" size="small" />
                    : <><Feather name="link" size={15} color="#fff" /><Text style={styles.linkBtnText}>Link Account</Text></>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Auto-generated Credentials Modal */}
      <Modal visible={k.credsModal} transparent animationType="fade" onRequestClose={() => k.setCredsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentGreen + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="key" size={17} color={colors.accentGreen} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Account Created</Text>
                  <Text style={styles.modalDesc}>{k.credsName}&apos;s login details</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => k.setCredsModal(false)}>
                <Feather name="x" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: colors.bgDark, borderRadius: 12, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.borderColor }}>
              <Text style={[styles.modalDesc, { textAlign: 'center', lineHeight: 20 }]}>
                Save these — your child uses them to log in as a Student on any device.</Text>

              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Login ID (Email)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: k.copiedField === 'cemail' ? colors.accentGreen : colors.borderColor, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: colors.cardDark }}>
                  <Text style={{ flex: 1, color: colors.textMain, fontSize: 13, fontFamily: 'monospace' }} selectable>{k.credsEmail}</Text>
                  <TouchableOpacity onPress={() => k.copyToClipboard(k.credsEmail, 'cemail')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name={k.copiedField === 'cemail' ? 'check' : 'copy'} size={14} color={k.copiedField === 'cemail' ? colors.accentGreen : colors.textDim} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => k.shareCredentials(k.credsName, k.credsEmail)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="share-2" size={14} color={colors.textDim} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ backgroundColor: colors.accentGreen + '15', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: colors.accentGreen + '30' }}>
                <Text style={{ fontSize: 12, color: colors.accentGreen, fontWeight: '700', marginBottom: 2 }}>Login details sent</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 18 }}>
                  {k.credsEmail && !k.credsEmail.endsWith('@aivorah.student')
                    ? 'The full login details, including the password, have been sent to your email and to your child\'s email for safekeeping.'
                    : 'The full login details, including the password, have been sent to your email for safekeeping.'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.linkBtn, { backgroundColor: colors.accentGreen }]}
              onPress={() => k.setCredsModal(false)} activeOpacity={0.8}
            >
              <Feather name="check" size={15} color="#fff" />
              <Text style={styles.linkBtnText}>Got it, I&apos;ve saved these</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Remove Child Confirmation Modal */}
      <Modal visible={!!k.removeConfirmChild} transparent animationType="fade" onRequestClose={() => { k.setRemoveConfirmChild(null); k.setRemoveError(''); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 360 }]}>
            <View style={{ alignItems: 'center', gap: 12 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#ef444420', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="user-x" size={22} color="#ef4444" />
              </View>
              <Text style={[styles.modalTitle, { textAlign: 'center' }]}>Remove {k.removeConfirmChild?.name}?</Text>
              <Text style={[styles.modalDesc, { textAlign: 'center' }]}>
                This unlinks {k.removeConfirmChild?.name} from your account. Their learning progress and data will not be deleted.
              </Text>
            </View>

            {k.removeError ? (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={13} color={colors.accentRed} />
                <Text style={[styles.errorText, { color: colors.accentRed }]}>{k.removeError}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.linkBtn, { flex: 1, backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor }]}
                onPress={() => { k.setRemoveConfirmChild(null); k.setRemoveError(''); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.linkBtnText, { color: colors.textMain }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.linkBtn, { flex: 1, backgroundColor: '#ef4444' }, k.removing && { opacity: 0.6 }]}
                onPress={k.removeChild}
                disabled={k.removing}
                activeOpacity={0.8}
              >
                {k.removing
                  ? <ActivityIndicator color="white" size="small" />
                  : <><Feather name="user-x" size={15} color="#fff" /><Text style={styles.linkBtnText}>Remove</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Child Modal */}
      <Modal visible={!!k.editChild} transparent animationType="fade" onRequestClose={() => { k.setEditChild(null); k.setShowOtpInput(false); k.setOtpCode(''); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Child</Text>
                <Text style={styles.modalDesc}>{k.editChild?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => { k.setEditChild(null); k.setShowOtpInput(false); k.setOtpCode(''); }}>
                <Feather name="x" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {k.showOtpInput && k.otpPurpose === 'edit' ? (
              <View style={{ gap: 15, paddingVertical: 10 }}>
                <Text style={styles.modalDesc}>
                  We have sent a 6-digit OTP verification code to <Text style={{ fontWeight: '700' }}>{k.otpSentEmail}</Text> to verify the child&apos;s email address change.
                </Text>
                <TextInput
                  style={[styles.input, { textAlign: 'center', fontSize: 20, letterSpacing: 5 }]}
                  placeholder="000000"
                  placeholderTextColor={colors.textMuted}
                  maxLength={6}
                  keyboardType="number-pad"
                  value={k.otpCode}
                  onChangeText={k.setOtpCode}
                />
                {k.editError ? (
                  <View style={styles.errorRow}>
                    <Feather name="alert-circle" size={13} color={colors.accentRed} />
                    <Text style={[styles.errorText, { color: colors.accentRed }]}>{k.editError}</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={[styles.linkBtn, k.isVerifyingOtp && { opacity: 0.6 }]}
                  onPress={k.handleVerifyOtp}
                  disabled={k.isVerifyingOtp}
                  activeOpacity={0.8}
                >
                  {k.isVerifyingOtp ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.linkBtnText}>Verify & Save Changes</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.linkBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.textMuted }]}
                  onPress={() => { k.setShowOtpInput(false); k.setOtpCode(''); k.setEditError(''); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.linkBtnText, { color: colors.textMuted }]}>Go Back</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <Text style={[styles.modalDesc, { marginBottom: 0, fontWeight: '600', color: colors.textMuted }]}>Full Name</Text>
                <TextInput style={styles.input} value={k.editName} onChangeText={t => { k.setEditName(t); k.setEditError(''); }}
                  placeholder="Child's name" placeholderTextColor={colors.textMuted} autoCapitalize="words" />

                <Text style={[styles.modalDesc, { marginBottom: 0, fontWeight: '600', color: colors.textMuted }]}>Email Address</Text>
                <TextInput style={styles.input} value={k.editEmail} onChangeText={t => { k.setEditEmail(t); k.setEditError(''); }}
                  placeholder="Child's email" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" />

                <Text style={[styles.modalDesc, { marginBottom: 0, fontWeight: '600', color: colors.textMuted }]}>Curriculum</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {k.CURRICULA.map((c: string) => (
                    <TouchableOpacity key={c} onPress={() => { k.setEditCurriculum(c); if (!k.getGradesForCurriculum(c).includes(k.editGrade)) k.setEditGrade(k.getGradesForCurriculum(c)[0]); }} activeOpacity={0.8}
                      style={[styles.chip, k.editCurriculum === c && { backgroundColor: colors.accentYellow + '20', borderColor: colors.accentYellow }]}
                    >
                      <Text style={[styles.chipText, k.editCurriculum === c && { color: colors.accentYellow }]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.modalDesc, { marginBottom: 0, fontWeight: '600', color: colors.textMuted }]}>Grade</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {k.getGradesForCurriculum(k.editCurriculum).map((g: string) => (
                    <TouchableOpacity key={g} onPress={() => k.setEditGrade(g)} activeOpacity={0.8}
                      style={[styles.chip, k.editGrade === g && { backgroundColor: colors.accentYellow + '20', borderColor: colors.accentYellow }]}
                    >
                      <Text style={[styles.chipText, k.editGrade === g && { color: colors.accentYellow }]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.modalDesc, { marginBottom: 0, fontWeight: '600', color: colors.textMuted }]}>School (optional)</Text>
                <TextInput style={styles.input} value={k.editSchool} onChangeText={k.setEditSchool}
                  placeholder="School name" placeholderTextColor={colors.textMuted} />

                {k.editError ? (
                  <View style={styles.errorRow}>
                    <Feather name="alert-circle" size={13} color={colors.accentRed} />
                    <Text style={[styles.errorText, { color: colors.accentRed }]}>{k.editError}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.linkBtn, k.saving && { opacity: 0.6 }]}
                  onPress={k.handleEditSubmit} disabled={k.saving} activeOpacity={0.8}
                >
                  {k.saving
                    ? <ActivityIndicator color="white" size="small" />
                    : <><Feather name="check" size={15} color="#fff" /><Text style={styles.linkBtnText}>Save Changes</Text></>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* View Login Info Modal */}
      <Modal visible={!!k.viewCredsChild} transparent animationType="fade" onRequestClose={() => { k.setViewCredsChild(null); k.setViewCreds(null); k.setResetPasswordSuccess(false); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#5F8A8620', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="key" size={17} color="#5F8A86" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Login Info</Text>
                  <Text style={styles.modalDesc}>{k.viewCredsChild?.name}&apos;s credentials</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => { k.setViewCredsChild(null); k.setViewCreds(null); k.setResetPasswordSuccess(false); }}>
                <Feather name="x" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {k.loadingCreds ? (
              <ActivityIndicator color="#5F8A86" style={{ paddingVertical: 24 }} />
            ) : (
              <View style={{ backgroundColor: colors.bgDark, borderRadius: 12, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.borderColor }}>
                <Text style={[styles.modalDesc, { textAlign: 'center' }]}>
                  Your child uses these to log in as a Student.
                </Text>

                {k.viewCreds?.loginId && (
                  <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Login ID (Email)</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: k.copiedField === 'vlogin' ? '#5F8A86' : colors.borderColor, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: colors.cardDark }}>
                      <Text style={{ flex: 1, color: colors.textMain, fontSize: 13, fontFamily: 'monospace' }} selectable>{k.viewCreds.loginId}</Text>
                      <TouchableOpacity onPress={() => k.copyToClipboard(k.viewCreds.loginId, 'vlogin')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Feather name={k.copiedField === 'vlogin' ? 'check' : 'copy'} size={14} color={k.copiedField === 'vlogin' ? '#5F8A86' : colors.textDim} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => k.shareCredentials(k.viewCredsChild?.name || 'Your child', k.viewCreds.loginId)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Feather name="share-2" size={14} color={colors.textDim} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                <View style={{ backgroundColor: '#5F8A8612', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#5F8A8630' }}>
                  <Text style={{ fontSize: 12, color: '#5F8A86', fontWeight: '700', marginBottom: 2 }}>Password not shown for security</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 18 }}>
                    {k.viewCreds?.initialPassword
                      ? 'Use the button below to send the full login credentials to your email.'
                      : 'The password was last changed via a reset link, so we no longer have a copy to resend. Use "Reset Child\'s Password" below to send a fresh reset link.'}
                  </Text>
                </View>

              </View>
            )}

            {k.viewCreds?.initialPassword && (
              <TouchableOpacity
                style={[styles.linkBtn, { backgroundColor: k.resendSuccess ? colors.accentGreen : colors.accentYellow }, k.resendingCreds && { opacity: 0.6 }]}
                onPress={() => k.resendCredsEmail(k.viewCredsChild)}
                disabled={k.resendingCreds || k.resendSuccess}
                activeOpacity={0.8}
              >
                {k.resendingCreds
                  ? <ActivityIndicator color="white" size="small" />
                  : k.resendSuccess
                    ? <><Feather name="check" size={15} color="#fff" /><Text style={styles.linkBtnText}>Email Sent!</Text></>
                    : <><Feather name="send" size={15} color="#fff" /><Text style={styles.linkBtnText}>Resend Login Info to My Email</Text></>}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.linkBtn, { backgroundColor: k.resetPasswordSuccess ? colors.accentGreen : colors.accentRed + 'CC' }, k.resettingPassword && { opacity: 0.6 }]}
              onPress={() => k.resetChildPassword(k.viewCredsChild)}
              disabled={k.resettingPassword || k.resetPasswordSuccess}
              activeOpacity={0.8}
            >
              {k.resettingPassword
                ? <ActivityIndicator color="white" size="small" />
                : k.resetPasswordSuccess
                  ? <><Feather name="check" size={15} color="#fff" /><Text style={styles.linkBtnText}>Reset Link Sent to Your Email!</Text></>
                  : <><Feather name="lock" size={15} color="#fff" /><Text style={styles.linkBtnText}>Reset Child&apos;s Password</Text></>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.linkBtn, { backgroundColor: '#5F8A86' }]}
              onPress={() => { k.setViewCredsChild(null); k.setViewCreds(null); k.setResetPasswordSuccess(false); }}
              activeOpacity={0.8}
            >
              <Text style={styles.linkBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}
