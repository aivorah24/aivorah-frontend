import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SAGE } from '../constants';

interface Props {
  journalText: string;
  cardDark: string;
  borderColor: string;
  textMain: string;
  textMuted: string;
  textDim: string;
  styles: any;
}

export default function HabitJournalCard({ journalText, cardDark, borderColor, textMain, textMuted, textDim, styles }: Props) {
  const [showJournal, setShowJournal] = useState(false);

  if (!journalText) return null;

  return (
    <View style={[styles.journalCard, { backgroundColor: cardDark, borderColor: SAGE + '40' }]}>
      <TouchableOpacity style={styles.journalHeader} onPress={() => setShowJournal(p => !p)} activeOpacity={0.8}>
        <View style={[styles.journalIconWrap, { backgroundColor: SAGE + '20' }]}>
          <Feather name="book" size={16} color={SAGE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.journalTitle, { color: SAGE }]}>My Daily Journal</Text>
          <Text style={[styles.journalSub, { color: textMuted }]}>Auto-generated from today&apos;s habits</Text>
        </View>
        <Feather name={showJournal ? 'chevron-up' : 'chevron-down'} size={16} color={textDim} />
      </TouchableOpacity>
      {showJournal && (
        <View style={[styles.journalBody, { borderTopColor: borderColor }]}>
          <Text style={[styles.journalText, { color: textMain }]}>{journalText}</Text>
        </View>
      )}
    </View>
  );
}
