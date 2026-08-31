import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth, getPendingReturnRole } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { AppColors } from '../../theme';
import { spacing, radius } from '../../theme';

interface SwitchProfileProps {
  collapsed?: boolean;
  onNavigate: (screen: string) => void;
  // Sidebar.tsx (always-mounted web nav) and DrawerContent.tsx (React
  // Navigation's Drawer, which keeps its content mounted off-screen for
  // slide animations even when closed) both render this component at the
  // same time — a single testID would exist twice in the DOM at once,
  // which breaks strict-mode E2E locators and can even intercept clicks
  // meant for the other copy. Each consumer passes its own prefix so the
  // two copies never collide. Defaults to 'sidebar' (Sidebar.tsx's original
  // testIDs, which existing E2E tests already depend on).
  testIDPrefix?: string;
}

const ROLE_DASH: Record<string, string> = {
  super_admin: 'TeacherDashboard',
  school_admin: 'SchoolAdminDashboard',
  teacher: 'TeacherDashboard',
  parent: 'ParentDashboard',
  student: 'Dashboard',
};

export function SwitchProfile({ collapsed = false, onNavigate, testIDPrefix = 'sidebar' }: SwitchProfileProps) {
  const { user, switchRole, beginAddParentProfile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (collapsed) return null;

  const pendingReturn = getPendingReturnRole();
  const isDualRole = (user?.roles?.length ?? 0) > 1 || Boolean(pendingReturn);

  const effectiveRoles: string[] = (user?.roles?.length ?? 0) > 1
    ? user!.roles!
    : pendingReturn === 'teacher' ? ['teacher', 'parent'] : [];

  // Dual-role: show the pills to switch between Teacher/Parent dashboards.
  if (isDualRole && effectiveRoles.length > 0) {
    return (
      <View style={styles.roleSwitcher} testID={`${testIDPrefix}-switch-profile-container`}>
        <Text style={styles.roleSwitcherLabel}>Switch Profile</Text>
        <View style={styles.roleSwitcherRow}>
          {effectiveRoles.map((r) => {
            const isActive = user?.role === r;
            return (
              <TouchableOpacity
                key={r}
                testID={`${testIDPrefix}-role-pill-${r}`}
                style={[styles.rolePill, isActive && styles.rolePillActive]}
                onPress={() => {
                  switchRole(r as any);
                  setTimeout(() => {
                    try {
                      onNavigate(ROLE_DASH[r] ?? 'Dashboard');
                    } catch (_) {}
                  }, 50);
                }}
                activeOpacity={0.75}
              >
                <Feather
                  name={r === 'teacher' ? 'briefcase' : 'home'}
                  size={12}
                  color={isActive ? colors.accentYellow : colors.textMuted}
                />
                <Text style={[styles.rolePillText, isActive && styles.rolePillTextActive]}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  // Single-role teacher: show the "Also a parent?" hint to start the
  // add-parent-profile onboarding flow. Not shown for any other role.
  if (user?.role === 'teacher') {
    return (
      <TouchableOpacity
        testID={`${testIDPrefix}-add-parent-hint`}
        style={styles.addParentHint}
        onPress={() => {
          // Start add-parent flow IN MEMORY only — no premature persistence.
          // Backing out leaves no half-created parent profile. The top-level
          // onboarding gate renders the parent steps from in-memory state.
          beginAddParentProfile();
        }}
        activeOpacity={0.8}
      >
        <View style={styles.addParentHintIcon}>
          <Feather name="home" size={11} color={colors.accentYellow} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.addParentHintTitle}>Also a parent?</Text>
          <Text style={styles.addParentHintSub}>Add your parent profile</Text>
        </View>
        <Feather name="chevron-right" size={12} color={colors.textDim} />
      </TouchableOpacity>
    );
  }

  return null;
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  roleSwitcher: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  roleSwitcherLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: c.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  roleSwitcherRow: {
    flexDirection: 'row',
    gap: 6,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.borderColor,
    backgroundColor: c.cardDark,
  },
  rolePillActive: {
    borderColor: c.accentYellow,
    backgroundColor: c.accentYellow + '18',
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textMuted,
  },
  rolePillTextActive: {
    color: c.accentYellow,
    fontWeight: '700',
  },
  addParentHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.accentYellow + '50',
    backgroundColor: c.accentYellow + '10',
  },
  addParentHintIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.accentYellow + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addParentHintTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: c.accentYellow,
  },
  addParentHintSub: {
    fontSize: 10,
    color: c.textDim,
    marginTop: 1,
  },
});
