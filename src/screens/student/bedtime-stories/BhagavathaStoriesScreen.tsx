import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image, useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../context/ThemeContext';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { spacing, radius, fonts } from '../../../theme';
import SERVER_URL from '../../../config/bedtimeStoriesServerUrl';
import { TEAL, FOREST, PASTEL_GRAD, COLLECTION_PASTEL, safeIcon } from './constants';
import { useStoryList } from './hooks/useStoryList';

export default function BhagavathaStoriesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const isWide = width >= 700;   // desktop / tablet → 2-column grid

  const { loading, error, grouped } = useStoryList();

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Bedtime Stories"
          subtitle="Bhagavatam · Ramayana · Bhagavad Gita"
          showBack={true}
          onMenuPress={() => navigation.openDrawer()}
          showSearch={false}
        />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Hero banner */}
          <LinearGradient
            colors={[TEAL + '30', FOREST + '18']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={[styles.heroIcon, { backgroundColor: TEAL + '30', borderColor: TEAL + '50' }]}>
              <Feather name="book-open" size={26} color={TEAL} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: TEAL }]}>Bedtime Stories for Children</Text>
              <Text style={[styles.heroSub, { color: colors.textMuted }]}>
                Stories of devotion, courage and wisdom — narrated with love.
              </Text>
            </View>
          </LinearGradient>

          {loading && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={TEAL} />
              <Text style={[styles.hint, { color: colors.textMuted }]}>Loading stories…</Text>
            </View>
          )}

          {!!error && (
            <View style={styles.center}>
              <Feather name="alert-circle" size={28} color={colors.accentRed} />
              <Text style={[styles.hint, { color: colors.textMuted }]}>{error}</Text>
            </View>
          )}

          {/* Grouped by collection */}
          {!loading && !error && Object.entries(grouped).map(([collection, items]) => {
            const collColor = COLLECTION_PASTEL[collection] ?? TEAL;
            return (
              <View key={collection} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: collColor }]} />
                  <Text style={[styles.sectionTitle, { color: collColor }]}>{collection}</Text>
                  <View style={[styles.sectionLine, { backgroundColor: collColor + '30' }]} />
                </View>

                <View style={isWide ? styles.grid : styles.list}>
                {items.map(story => {
                  const grad = PASTEL_GRAD[story.coverColor] ?? ['#9FB2A4', '#C5BD96'];
                  return (
                    <TouchableOpacity
                      key={story.id}
                      style={[styles.card, isWide && styles.cardWide, {
                        backgroundColor: colors.cardDark,
                        borderColor: colors.borderColor,
                      }]}
                      onPress={() => navigation.navigate('StoryReader', { storyId: story.id, storyTitle: story.title })}
                      activeOpacity={0.88}
                    >
                      {/* Cover image or gradient */}
                      {story.coverImageUrl ? (
                        <Image
                          source={{ uri: story.coverImageUrl.startsWith('http') ? story.coverImageUrl : `${SERVER_URL}${story.coverImageUrl}` }}
                          style={styles.cardIcon}
                          resizeMode="cover"
                        />
                      ) : (
                        <LinearGradient
                          colors={grad}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={styles.cardIcon}
                        >
                          <View style={styles.cardIconInner}>
                            <Feather
                              name={safeIcon(story.coverIcon) as any}
                              size={26}
                              color="#fff"
                            />
                          </View>
                        </LinearGradient>
                      )}

                      {/* Info */}
                      <View style={styles.cardInfo}>
                        <Text style={[styles.cardTitle, { color: colors.textMain }]} numberOfLines={1}>
                          {story.title}
                        </Text>
                        <Text style={[styles.cardSub, { color: colors.textMuted }]} numberOfLines={2}>
                          {story.subtitle}
                        </Text>
                        <View style={styles.cardMeta}>
                          <View style={[styles.metaBadge, { backgroundColor: grad[0] + '20', borderColor: grad[0] + '50' }]}>
                            <Feather name="book" size={9} color={grad[0]} />
                            <Text style={[styles.metaText, { color: grad[0] }]}>{story.pageCount} pages</Text>
                          </View>
                          <View style={[styles.metaBadge, { backgroundColor: colors.borderColor, borderColor: 'transparent' }]}>
                            <Feather name="users" size={9} color={colors.textDim} />
                            <Text style={[styles.metaText, { color: colors.textDim }]}>Age {story.ageGroup}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Arrow */}
                      <View style={[styles.cardArrow, { backgroundColor: grad[0] + '18' }]}>
                        <Feather name="chevron-right" size={18} color={grad[0]} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
                </View>
              </View>
            );
          })}

        </ScrollView>
      </View>
    </ScreenLayout>
  );
}

const makeStyles = (c: any) => StyleSheet.create({
  screen:   { flex: 1, backgroundColor: c.bgDark },
  content:  { padding: spacing.lg, paddingBottom: 48, gap: spacing.lg },
  center:   { alignItems: 'center', paddingVertical: 40, gap: 12 },
  hint:     { fontSize: 13, textAlign: 'center' },

  hero: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: TEAL + '30',
  },
  heroIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  heroTitle: { fontSize: 15, fontWeight: '800', marginBottom: 3, fontFamily: fonts.serif },
  heroSub:   { fontSize: 12, lineHeight: 18 },

  section:       { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  sectionDot:    { width: 8, height: 8, borderRadius: 4 },
  sectionTitle:  { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionLine:   { flex: 1, height: 1 },

  list:     { gap: spacing.sm },
  grid:     { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  cardWide: { width: '48.8%' },

  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden',
  },
  cardIcon:     { width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
  cardIconInner: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.30)',
  },
  cardInfo:  { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: 4 },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  cardSub:   { fontSize: 12, lineHeight: 17 },
  cardMeta:  { flexDirection: 'row', gap: 6, marginTop: 2 },
  metaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 12, borderWidth: 1,
  },
  metaText:  { fontSize: 10, fontWeight: '600' },
  cardArrow: { width: 36, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
});
