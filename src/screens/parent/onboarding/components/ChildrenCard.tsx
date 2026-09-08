import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AutocompleteField, CardHeader, fetchCitySuggestions, locateCity } from '../../../onboarding/OnboardingSharedFields';
import type { ChildEntry } from '../types';

const TEAL = '#5F8A86';
const FOREST = '#5A8A70';

export function ChildrenCard({
  colors, styles, teal = TEAL, forest = FOREST,
  childrenList, activeChildIdx, activeChild, selectChild, removeChild, updateChild, addAnotherChild,
  schoolLocating, setSchoolLocating,
}: {
  colors: any; styles: any; teal?: string; forest?: string;
  childrenList: ChildEntry[]; activeChildIdx: number; activeChild: ChildEntry;
  selectChild: (idx: number) => void; removeChild: (idx: number) => void;
  updateChild: (field: keyof ChildEntry, value: string) => void;
  addAnotherChild: () => void;
  schoolLocating: boolean; setSchoolLocating: (v: boolean) => void;
}) {
  return (
    <View style={[styles.card, styles.card3]}>
      <CardHeader icon="users" title="2. Your Children" badge="Optional" subtitle="Add now, or skip and add them anytime from your dashboard." done={true} styles={styles} subtitleColor={teal} />

      {childrenList.length > 1 && (
        <View style={styles.chipRow}>
          {childrenList.map((c, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.chip, activeChildIdx === i && styles.chipActive, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
              onPress={() => selectChild(i)}
              activeOpacity={0.8}>
              <Text style={[styles.chipTxt, activeChildIdx === i && styles.chipTxtActive]}>
                {c.name.trim() || `Child ${i + 1}`}
              </Text>
              <TouchableOpacity onPress={() => removeChild(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={12} color={activeChildIdx === i ? '#fff' : colors.textDim} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.fieldGroup}>
        <Text style={styles.lbl}>Child&apos;s Full Name</Text>
        <TextInput style={styles.input} value={activeChild.name} onChangeText={(v) => updateChild('name', v)}
          placeholder="Enter your child's name" placeholderTextColor={colors.textDim} autoCapitalize="words" />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.lbl}>Child&apos;s Age</Text>
        <TextInput style={styles.input} value={activeChild.age} onChangeText={(v) => updateChild('age', v)}
          placeholder="e.g. 9" placeholderTextColor={colors.textDim} keyboardType="numeric" maxLength={2} />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.lbl}>{childrenList.length > 1 ? `${activeChild.name || 'Child'}'s School` : "Child's School"}</Text>
        <TextInput style={styles.input} value={activeChild.school} onChangeText={(v) => updateChild('school', v)}
          placeholder="e.g. Hyderabad International School" placeholderTextColor={colors.textDim} />
      </View>
      <View style={styles.fieldGroup}>
        <View style={styles.lblRow}>
          <Text style={styles.lbl}>School Location</Text>
          {Platform.OS === 'web' && (
            <TouchableOpacity style={styles.locateBtn} onPress={() => locateCity((v) => updateChild('schoolCity', v), setSchoolLocating)} disabled={schoolLocating} activeOpacity={0.8}>
              <Feather name="crosshair" size={12} color={teal} />
              <Text style={styles.locateTxt}>{schoolLocating ? 'Locating...' : 'Use my location'}</Text>
            </TouchableOpacity>
          )}
        </View>
        <AutocompleteField
          value={activeChild.schoolCity}
          onChange={(v) => updateChild('schoolCity', v)}
          fetchSuggestions={fetchCitySuggestions}
          placeholder="Search for the school's city"
          colors={colors}
          styles={styles}
        />
      </View>

      {activeChild.age.length > 0 && (
        <View style={[styles.hintBox, { backgroundColor: (parseInt(activeChild.age, 10) >= 14 ? teal : forest) + '15', borderColor: (parseInt(activeChild.age, 10) >= 14 ? teal : forest) + '40' }]}>
          <Text style={{ fontSize: 12, color: parseInt(activeChild.age, 10) >= 14 ? teal : forest, lineHeight: 17 }}>
            {parseInt(activeChild.age, 10) >= 14
              ? 'Students 14 and older should have their own account. Enter their registered Aivorah email in the Account box to link it.'
              : 'Aivorah will create a login ID and password for your child in the Account box.'}
          </Text>
        </View>
      )}

      <View style={styles.fillCenter}>
        <TouchableOpacity style={styles.addChildBtn} onPress={addAnotherChild} activeOpacity={0.7}>
          <Feather name="plus-circle" size={16} color={teal} />
          <Text style={styles.addChildTxt}>Add Another Child</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
