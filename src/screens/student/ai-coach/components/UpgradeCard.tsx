import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

interface Props {
  dailyLimit: number;
  onUpgrade: () => void;
  styles: any;
  colors: AppColors;
}

export default function UpgradeCard({ dailyLimit, onUpgrade, styles, colors }: Props) {
  return (
    <View style={styles.upgradeCard}>
      <View style={styles.upgradeIconWrap}>
        <Feather name="zap" size={24} color="#C5A56A" />
      </View>
      <Text style={[styles.upgradeTitle, { color: colors.textMain }]}>
        You've reached your daily limit
      </Text>
      <Text style={[styles.upgradeSub, { color: colors.textMuted }]}>
        You've used all {dailyLimit || 10} free messages for today.{'\n'}
        Upgrade your plan for more AI Coach interactions.
      </Text>
      <View style={styles.upgradePlans}>
        <TouchableOpacity
          style={styles.upgradePlanCard}
          onPress={onUpgrade}
          activeOpacity={0.85}
        >
          <View style={styles.upgradePlanHeader}>
            <Text style={[styles.upgradePlanName, { color: '#C5A56A' }]}>Pro</Text>
            <View style={styles.upgradePlanBadge}>
              <Text style={styles.upgradePlanBadgeText}>POPULAR</Text>
            </View>
          </View>
          <Text style={[styles.upgradePlanPrice, { color: colors.textMain }]}>
            {'₹'}499<Text style={[styles.upgradePlanPeriod, { color: colors.textDim }]}>/mo</Text>
          </Text>
          <View style={styles.upgradePlanFeatures}>
            <View style={styles.upgradePlanFeatureRow}>
              <Feather name="check" size={12} color="#C5A56A" />
              <Text style={[styles.upgradePlanFeatureText, { color: colors.textMuted }]}>Unlimited AI Coach messages</Text>
            </View>
            <View style={styles.upgradePlanFeatureRow}>
              <Feather name="check" size={12} color="#C5A56A" />
              <Text style={[styles.upgradePlanFeatureText, { color: colors.textMuted }]}>All Bedtime Stories</Text>
            </View>
            <View style={styles.upgradePlanFeatureRow}>
              <Feather name="check" size={12} color="#C5A56A" />
              <Text style={[styles.upgradePlanFeatureText, { color: colors.textMuted }]}>Challenges & Daily Habits</Text>
            </View>
          </View>
          <View style={styles.upgradePlanCta}>
            <Text style={styles.upgradePlanCtaText}>Upgrade to Pro</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.upgradePlanCard, { borderColor: '#C9A24E' + '30' }]}
          onPress={onUpgrade}
          activeOpacity={0.85}
        >
          <Text style={[styles.upgradePlanName, { color: '#C9A24E' }]}>Max</Text>
          <Text style={[styles.upgradePlanPrice, { color: colors.textMain }]}>
            {'₹'}999<Text style={[styles.upgradePlanPeriod, { color: colors.textDim }]}>/mo</Text>
          </Text>
          <View style={styles.upgradePlanFeatures}>
            <View style={styles.upgradePlanFeatureRow}>
              <Feather name="check" size={12} color="#C9A24E" />
              <Text style={[styles.upgradePlanFeatureText, { color: colors.textMuted }]}>Everything in Pro</Text>
            </View>
            <View style={styles.upgradePlanFeatureRow}>
              <Feather name="check" size={12} color="#C9A24E" />
              <Text style={[styles.upgradePlanFeatureText, { color: colors.textMuted }]}>Up to 3 child profiles</Text>
            </View>
            <View style={styles.upgradePlanFeatureRow}>
              <Feather name="check" size={12} color="#C9A24E" />
              <Text style={[styles.upgradePlanFeatureText, { color: colors.textMuted }]}>Priority responses</Text>
            </View>
          </View>
          <View style={[styles.upgradePlanCta, { backgroundColor: '#C9A24E' }]}>
            <Text style={styles.upgradePlanCtaText}>Upgrade to Max</Text>
          </View>
        </TouchableOpacity>
      </View>
      <Text style={[styles.upgradeFooter, { color: colors.textDim }]}>
        Your free messages reset daily at midnight
      </Text>
    </View>
  );
}
