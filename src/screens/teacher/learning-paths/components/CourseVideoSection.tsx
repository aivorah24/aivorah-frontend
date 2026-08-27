import React from 'react';
import { View, Text, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { CourseVideo } from '../types';

interface Props {
  video: CourseVideo;
  vIndex: number;
  isWide: boolean;
  colors: AppColors;
  gold: string;
  styles: any;
}

export default function CourseVideoSection({ video, vIndex, isWide, colors, gold, styles }: Props) {
  return (
    <View testID={`teacher-learning-paths-video-${video.id}`} style={styles.videoSection}>
      <View style={styles.videoIntro}>
        <Text style={styles.videoEyebrow}>{video.eyebrow}</Text>
        <Text style={styles.videoTitle}>{video.title}</Text>
        <Text style={styles.videoDesc}>{video.desc}</Text>
      </View>

      <View style={[styles.videoGrid, !isWide && styles.videoGridStack, vIndex % 2 === 1 && isWide && styles.videoGridReverse]}>
        <View style={styles.videoPlayerPanel}>
          {Platform.OS === 'web'
            ? React.createElement('video', {
                src: video.url,
                controls: true,
                preload: 'metadata',
                style: {
                  width: '100%',
                  aspectRatio: '16 / 9',
                  borderRadius: 16,
                  background: '#050505',
                  display: 'block',
                },
              })
            : (
              <View style={styles.nativeVideoFallback}>
                <Feather name="play-circle" size={44} color={gold} />
                <Text style={styles.nativeVideoText}>Course video available on web</Text>
              </View>
            )}
        </View>

        <View style={styles.videoSidePanel}>
          <Text style={styles.panelTitle}>In this video</Text>
          {video.outcomes.map((item) => (
            <View key={item.title} style={styles.outcomeRow}>
              <View style={styles.outcomeIcon}>
                <Feather name={item.icon as any} size={16} color={gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.outcomeTitle}>{item.title}</Text>
                <Text style={styles.outcomeDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
