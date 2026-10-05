import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import { spacing } from '../../../../../theme';
import LessonRenderer from '../../../lesson/LessonRenderer';
import { buildLessonComponents } from '../../../lesson/lessonComponents';
import { makeStyles } from '../styles';
import BookPane from './BookPane';
import LearningBlocks from './LearningBlocks';

export default function ReadTab({
  topic,
  rawPayload,
  grade,
  subject,
  colors,
  styles,
  onZoomImage,
  onReadFullBook,
  onReachedEnd,
}: {
  topic: any;
  rawPayload: any;
  grade: string;
  subject: string;
  colors: AppColors;
  styles: ReturnType<typeof makeStyles>;
  onZoomImage: (img: { uri: string; caption?: string }) => void;
  onReadFullBook: () => void;
  // Called once the student has scrolled to the end of the lesson (or it fits without scrolling).
  onReachedEnd?: () => void;
}) {
  const hasRealPdf = Platform.OS === 'web' && !!topic.pdfFile && !!topic.pdfPage;
  const viewH = React.useRef(0);
  const reachedEnd = (offset: number, contentH: number, layoutH: number) => {
    if (onReachedEnd && contentH > 0 && offset + layoutH >= contentH - 40) onReachedEnd();
  };
  return (
    <View style={styles.dualPane}>
      <ScrollView
        testID="learn-scroll"
        style={hasRealPdf ? styles.leftPane : styles.leftPaneFull}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={200}
        onLayout={(e) => { viewH.current = e.nativeEvent.layout.height; }}
        onContentSizeChange={(_w, h) => reachedEnd(0, h, viewH.current)}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          reachedEnd(contentOffset.y, contentSize.height, layoutMeasurement.height);
        }}
      >
        <View style={styles.paneLabel}>
          <Feather name="book-open" size={12} color={colors.primary} />
          <Text style={[styles.paneLabelText, { color: colors.textMuted }]}>Learn with Aivorah — simplified</Text>
        </View>
        <View style={{ gap: spacing.md }}>
          {/* A sample module must never be mistaken for real NCERT
              content. Chapters whose textbook text is too sparse to ground
              a lesson (or whose PDF was never shipped) get a placeholder
              so the layout is complete — and it says so, on screen, above
              the content rather than buried in it. */}
          {rawPayload?.isSample && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
              borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark,
            }}>
              <Feather name="info" size={15} color={colors.textMuted} />
              <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: colors.textMuted }}>
                {rawPayload.sampleLabel || 'Interactive Practice Module — Sample Lesson'}
              </Text>
            </View>
          )}
          {/* AI enrichment pilot (Qdrant-only topics — see
              aivorah-learning-paths-service's services/curriculum/
              enrichment.js): when the backend has real structured blocks,
              render those instead of the plain raw-textbook-paragraph
              fallback. Mutually exclusive with LessonRenderer below — a
              topic has one or the other, never both. */}
          {!!rawPayload?.blocks?.length ? (
            <LearningBlocks whatYoullLearn={rawPayload.whatYoullLearn} blocks={rawPayload.blocks} colors={colors} />
          ) : (
            /* Type-driven lesson body: the LessonRenderer composes canonical
               components (poem / story / math / science layouts) from the
               lesson's instructional type — the frontend half of the
               Curriculum Intelligence pipeline contract. */
            rawPayload && (
              <LessonRenderer
                components={buildLessonComponents(rawPayload).components}
                grade={rawPayload?.grade ?? (parseInt((grade || '').replace(/[^0-9]/g, ''), 10) || undefined)}
                colors={colors}
              />
            )
          )}
          {!!(topic.readText as any).mathHelper && (() => {
            const mh = (topic.readText as any).mathHelper;
            return (
              <View style={[styles.card, { borderColor: colors.accentGreen + '40', backgroundColor: colors.accentGreen + '0d', marginTop: 12 }]}>
                <Text style={[styles.activityLabel, { color: colors.accentGreen, marginBottom: 6 }]}>Math Helper — step by step</Text>
                {!!mh.formula && <Text style={[styles.bodyText, { color: colors.textMain, fontWeight: '600' }]}>Rule: {mh.formula}</Text>}
                {(mh.keyIdeas || []).map((k: string, i: number) => (
                  <Text key={i} style={[styles.bodyText, { color: colors.textMuted }]}>{'•'} {k}</Text>
                ))}
                {!!mh.example && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={[styles.bodyText, { color: colors.textMain, fontWeight: '600' }]}>{mh.example.problem}</Text>
                    {(mh.example.steps || []).map((s: string, i: number) => (
                      <Text key={i} style={[styles.bodyText, { color: colors.textMuted, marginTop: 2 }]}>{s}</Text>
                    ))}
                    {!!mh.example.answer && <Text style={[styles.bodyText, { color: colors.accentGreen, fontWeight: '600', marginTop: 4 }]}>{mh.example.answer}</Text>}
                  </View>
                )}
              </View>
            );
          })()}
          {(() => {
            // Prefer the multi-image gallery; fall back to the single
            // figureUrl for older content that predates `figures`.
            const gallery = (topic.readText.figures && topic.readText.figures.length > 0)
              ? topic.readText.figures
              : (topic.readText.figureUrl ? [{ url: topic.readText.figureUrl, caption: topic.readText.figureCaption }] : []);
            if (gallery.length === 0) return null; // no blank placeholder box when there's genuinely no image
            return gallery.map((fig: any, i: number) => (
              <View key={i} style={[styles.figure, { borderColor: colors.borderColor, backgroundColor: colors.bgDark }]}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => onZoomImage({ uri: fig.url, caption: fig.caption || topic.readText.figureCaption })}
                >
                  <Image source={{ uri: fig.url }} style={styles.figureImg} resizeMode="contain" />
                  <View style={styles.zoomHint}>
                    <Feather name="maximize-2" size={11} color="#fff" />
                  </View>
                </TouchableOpacity>
                {!!(fig.caption || topic.readText.figureCaption) && (
                  <Text style={[styles.figureCaption, { color: colors.textMuted }]}>
                    {fig.caption || topic.readText.figureCaption}
                  </Text>
                )}
              </View>
            ));
          })()}
          {/* Bug: this used to render unconditionally, showing an empty box
              whenever there was no real activity text (see BUGS_AND_FIXES.md
              — reported directly from a screenshot of this exact state).
              Also skipped when the AI-enrichment blocks above already
              rendered their own "activity" block, so it's never duplicated. */}
          {!!topic.readText.activity && !rawPayload?.blocks?.some((b: any) => b.type === 'activity') && (
            <View style={[styles.activityBox, { borderColor: colors.primary + '55', backgroundColor: colors.primary + '14' }]}>
              <Text style={[styles.activityLabel, { color: colors.primary }]}>Try this yourself</Text>
              <Text style={[styles.activityText, { color: colors.textMain }]}>{topic.readText.activity}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {hasRealPdf && (
        <BookPane topic={topic} grade={grade} subject={subject} colors={colors} styles={styles} onReadFullBook={onReadFullBook} />
      )}
    </View>
  );
}
