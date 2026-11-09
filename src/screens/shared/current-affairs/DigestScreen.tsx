import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useResponsive } from '../../../hooks/useResponsive';
import { spacing } from '../../../theme';
import type { AppColors } from '../../../theme';
import { GOLD } from './constants';
import { useDigest } from './hooks/useDigest';
import DigestContent from './components/DigestContent';

// Stand-alone Current Affairs page (/current-affairs). Students normally reach
// the same content through The World & You → Current Affairs tab.
export default function DigestScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isMobile } = useResponsive();
  const styles = useMemo(() => makeStyles(colors, isMobile), [colors, isMobile]);
  const state = useDigest();

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Current Affairs"
          subtitle="Read, understand and remember the news"
          showBack={true}
          showSearch={false}
          onMenuPress={() => navigation.openDrawer?.()}
        />
        <ScrollView
          testID="digest-scroll"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={() => state.load('refresh')} tintColor={GOLD} />}
        >
          <DigestContent state={state} navigation={navigation} />
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}

const makeStyles = (c: AppColors, isMobile: boolean) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  content: { padding: isMobile ? spacing.lg : spacing.xl, paddingBottom: 56 },
});
