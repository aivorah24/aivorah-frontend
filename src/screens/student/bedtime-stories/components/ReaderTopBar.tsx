import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PASTEL_GOLD } from '../constants';
import type { Story } from '../types';

interface Props {
  story: Story;
  currentPage: number;
  pastelGrad: [string, string];
  pastelAccent: string;
  donePages: Set<number>;
  resumedFrom: number | null;
  setResumedFrom: (v: number | null) => void;
  totalDone: number;
  onBack: () => void;
  onGoToPage: (idx: number) => void;
  textMain: string;
  textDim: string;
  cardDark: string;
  styles: any;
}

export default function ReaderTopBar({
  story, currentPage, pastelGrad, pastelAccent, donePages, resumedFrom, setResumedFrom,
  totalDone, onBack, onGoToPage, textMain, textDim, cardDark, styles,
}: Props) {
  const progress = (currentPage + 1) / story.pages.length;

  return (
    <>
      <LinearGradient colors={pastelGrad} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.topBar}>
        <TouchableOpacity testID="readerBack" onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={16} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle} numberOfLines={1}>{story.title}</Text>
          <Text style={styles.topSub}>{story.collection}</Text>
        </View>
        {/* Progress dots — green=done, white=current, dim=unread */}
        <View style={styles.dotRow}>
          {story.pages.map((p, i) => {
            const done    = donePages.has(p.pageNumber);
            const current = i === currentPage;
            return (
              <TouchableOpacity key={i} onPress={() => onGoToPage(i)}>
                <View style={[
                  styles.dot,
                  current ? styles.dotActive :
                  done    ? styles.dotDone   : styles.dotEmpty,
                ]} />
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: pastelAccent }]} />
      </View>

      {/* Resumed banner — YouTube-style "continue where you left off" with a Start-over escape hatch */}
      {resumedFrom != null && (
        <View style={[styles.resumeBar, { backgroundColor: pastelAccent + '1A', borderColor: pastelAccent + '40' }]}>
          <Feather name="rotate-ccw" size={13} color={pastelAccent} />
          <Text style={[styles.resumeText, { color: textMain }]} numberOfLines={1}>
            Continuing from page {resumedFrom}
          </Text>
          <TouchableOpacity
            style={[styles.startOverBtn, { borderColor: pastelAccent + '66' }]}
            onPress={() => { setResumedFrom(null); onGoToPage(0); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.startOverText, { color: pastelAccent }]}>Start over</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setResumedFrom(null)} activeOpacity={0.7} style={styles.resumeClose}>
            <Feather name="x" size={14} color={textDim} />
          </TouchableOpacity>
        </View>
      )}

      {/* Completion badge */}
      {totalDone > 0 && (
        <View style={[styles.completionBar, { backgroundColor: cardDark }]}>
          <Feather name="check-circle" size={12} color={PASTEL_GOLD} />
          <Text style={[styles.completionText, { color: PASTEL_GOLD }]}>
            {totalDone} of {story.pages.length} pages completed
          </Text>
        </View>
      )}
    </>
  );
}
