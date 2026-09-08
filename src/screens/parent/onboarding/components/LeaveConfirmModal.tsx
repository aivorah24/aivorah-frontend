import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';

const TEAL = '#5F8A86';

export function LeaveConfirmModal({
  styles, teal = TEAL, visible, onClose,
  isAddingParent, saving,
  onSaveAndGoBack, onDiscardAndGoBack,
}: {
  styles: any; teal?: string; visible: boolean; onClose: () => void;
  isAddingParent: boolean; saving: boolean;
  onSaveAndGoBack: () => void; onDiscardAndGoBack: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.confirmOverlay}>
        <View style={styles.confirmBox}>
          <View style={styles.confirmIcon}>
            <Feather name="log-out" size={22} color={teal} />
          </View>
          <Text style={styles.confirmTitle}>
            {isAddingParent ? 'Save this parent profile before going back?' : 'Return to the home page?'}
          </Text>
          <Text style={styles.confirmBody}>
            {isAddingParent
              ? "You'll return to your teacher dashboard. Save what you've entered so far, or discard it and go back without saving."
              : "You'll be signed out and taken back to the Aivorah home page. Any details you haven't saved on this page won't be kept."}
          </Text>
          <TouchableOpacity
            style={styles.confirmPrimary}
            activeOpacity={0.85}
            disabled={saving}
            onPress={onSaveAndGoBack}
          >
            <Text style={styles.confirmPrimaryTxt}>
              {saving ? 'Saving...' : (isAddingParent ? 'Save & go back' : 'Save draft & sign out')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmSecondary, { marginBottom: 10 }]}
            activeOpacity={0.7}
            onPress={onDiscardAndGoBack}
          >
            <Text style={styles.confirmSecondaryTxt}>
              {isAddingParent ? 'Discard & go back' : 'Discard draft & sign out'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmSecondary}
            activeOpacity={0.7}
            onPress={onClose}
          >
            <Text style={styles.confirmSecondaryTxt}>Stay here</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
