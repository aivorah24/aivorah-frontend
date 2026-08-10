import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import { ASSIGNMENT_TAGS, EVENT_TAGS } from '../constants';

interface Props {
  showTagPanel: boolean;
  setShowTagPanel: (v: boolean) => void;
  enabledAssignmentTags: Set<string>;
  enabledEventTags: Set<string>;
  allAssignmentOn: boolean;
  allEventOn: boolean;
  toggleAssignmentTag: (key: string) => void;
  toggleEventTag: (key: string) => void;
  toggleAllAssignment: (on: boolean) => void;
  toggleAllEvent: (on: boolean) => void;
  styles: any;
  colors: AppColors;
}

export default function TagFilterPanel({
  showTagPanel, setShowTagPanel,
  enabledAssignmentTags, enabledEventTags,
  allAssignmentOn, allEventOn,
  toggleAssignmentTag, toggleEventTag, toggleAllAssignment, toggleAllEvent,
  styles, colors,
}: Props) {
  return (
    <View style={styles.sideCard}>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: showTagPanel ? 16 : 0 }}
        onPress={() => setShowTagPanel(!showTagPanel)}
        activeOpacity={0.7}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Tag Filters"
        accessibilityState={{ expanded: showTagPanel }}
        testID="schedule-tag-filters-toggle"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="filter" size={14} color={colors.accentYellow} />
          <Text style={styles.sideTitle}>Tag Filters</Text>
        </View>
        <Feather name={showTagPanel ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textDim} />
      </TouchableOpacity>

      {showTagPanel && (
        <View>
          {/* Assignment Tags */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}
            onPress={() => toggleAllAssignment(!allAssignmentOn)}
            activeOpacity={0.7}
          >
            <View style={{
              width: 18, height: 18, borderRadius: 4,
              backgroundColor: allAssignmentOn ? colors.accentYellow : 'transparent',
              borderWidth: 1.5, borderColor: allAssignmentOn ? colors.accentYellow : colors.textDim,
              alignItems: 'center', justifyContent: 'center',
            }}>
              {allAssignmentOn && <Feather name="check" size={12} color="white" />}
            </View>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textHeading, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              ASSIGNMENT TAGS
            </Text>
          </TouchableOpacity>
          {ASSIGNMENT_TAGS.map(tag => {
            const on = enabledAssignmentTags.has(tag.key);
            return (
              <TouchableOpacity
                key={tag.key}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingLeft: 4 }}
                onPress={() => toggleAssignmentTag(tag.key)}
                activeOpacity={0.7}
                accessible
                accessibilityRole="checkbox"
                accessibilityLabel={`Tag filter: ${tag.key}`}
                accessibilityState={{ checked: on }}
                testID={`schedule-tag-filter-${tag.key}`}
              >
                <View style={{
                  width: 18, height: 18, borderRadius: 4,
                  backgroundColor: on ? tag.color : 'transparent',
                  borderWidth: 1.5, borderColor: on ? tag.color : colors.textDim + '60',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {on && <Feather name="check" size={12} color="white" />}
                </View>
                <Text style={{ fontSize: 13, color: colors.textMain, fontWeight: '500' }}>{tag.key}</Text>
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 1, backgroundColor: colors.borderColor, marginVertical: 14 }} />

          {/* Event Tags */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}
            onPress={() => toggleAllEvent(!allEventOn)}
            activeOpacity={0.7}
          >
            <View style={{
              width: 18, height: 18, borderRadius: 4,
              backgroundColor: allEventOn ? colors.accentYellow : 'transparent',
              borderWidth: 1.5, borderColor: allEventOn ? colors.accentYellow : colors.textDim,
              alignItems: 'center', justifyContent: 'center',
            }}>
              {allEventOn && <Feather name="check" size={12} color="white" />}
            </View>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textHeading, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              EVENT TAGS
            </Text>
          </TouchableOpacity>
          {EVENT_TAGS.map(tag => {
            const on = enabledEventTags.has(tag.key);
            return (
              <TouchableOpacity
                key={tag.key}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingLeft: 4 }}
                onPress={() => toggleEventTag(tag.key)}
                activeOpacity={0.7}
                accessible
                accessibilityRole="checkbox"
                accessibilityLabel={`Tag filter: ${tag.key}`}
                accessibilityState={{ checked: on }}
                testID={`schedule-tag-filter-${tag.key}`}
              >
                <View style={{
                  width: 18, height: 18, borderRadius: 4,
                  backgroundColor: on ? tag.color : 'transparent',
                  borderWidth: 1.5, borderColor: on ? tag.color : colors.textDim + '60',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {on && <Feather name="check" size={12} color="white" />}
                </View>
                <Text style={{ fontSize: 13, color: colors.textMain, fontWeight: '500' }}>{tag.key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}
