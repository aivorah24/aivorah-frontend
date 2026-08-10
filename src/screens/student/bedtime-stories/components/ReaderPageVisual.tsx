import React from 'react';
import { View, Text, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { Page } from '../types';

interface Props {
  page: Page;
  pageImg: string | null;
  pastelGrad: [string, string];
  pastelAccent: string;
  currentPage: number;
  totalPages: number;
  isDone: boolean;
  isWide: boolean;
  styles: any;
}

export default function ReaderPageVisual({ page, pageImg, pastelGrad, pastelAccent, currentPage, totalPages, isDone, isWide, styles }: Props) {
  return (
    <View style={isWide ? styles.imageColWide : undefined}>
      {pageImg ? (
        <View style={[styles.imageContainer, isWide && styles.imageContainerWide]}>
          <Image source={{ uri: pageImg }} style={styles.imageBg} resizeMode="cover" blurRadius={18} />
          <View style={styles.imageBgTint} />
          <Image source={{ uri: pageImg }} style={styles.storyImage} resizeMode="contain" />
          <LinearGradient colors={['transparent','rgba(0,0,0,0.70)']} style={styles.imageOverlay}>
            <View style={styles.sceneLabelRow}>
              <Feather name={page.sceneIcon as any} size={13} color="rgba(255,255,255,0.9)" />
              <Text style={styles.sceneLabelText}>{page.sceneLabel}</Text>
              {isDone && (
                <View style={styles.doneBadge}>
                  <Feather name="check" size={10} color="#fff" />
                  <Text style={styles.doneBadgeText}>Done</Text>
                </View>
              )}
              <View style={[styles.pageChip, { backgroundColor: pastelAccent + 'AA' }]}>
                <Text style={styles.pageChipText}>{currentPage + 1} / {totalPages}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      ) : (
        <LinearGradient colors={[pastelGrad[0]+'E0', pastelGrad[1]+'B0']} style={[styles.sceneBanner, isWide && styles.sceneBannerWide]}>
          <View style={styles.sceneIconOuter}>
            <View style={styles.sceneIconInner}>
              <Feather name={page.sceneIcon as any} size={36} color="#fff" />
            </View>
          </View>
          <Text style={styles.sceneLabelFallback}>{page.sceneLabel}</Text>
        </LinearGradient>
      )}
    </View>
  );
}
