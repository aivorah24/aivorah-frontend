import React from 'react';
import { View, Text, TouchableOpacity, Platform, Image, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { Message } from '../types';
import { sanitizeDisplayedAIText } from '../utils/textFormatting';
import FormattedAIText from './FormattedAIText';
import type { ReadPosition } from '../../../../hooks/useReplyReader';
import ThinkingIndicator from './ThinkingIndicator';

interface Props {
  messages: Message[];
  streamingMsgId: number | null;
  isTyping: boolean;
  speakingId: number | null;
  readPosition?: ReadPosition | null;
  onSpeak: (msgId: number, text: string) => void;
  failedImages: Set<string>;
  onImageFail: (url: string) => void;
  onZoomImage: (img: { url: string; caption: string }) => void;
  styles: any;
  colors: AppColors;
}

export default function MessageList({
  messages,
  streamingMsgId,
  isTyping,
  speakingId,
  readPosition,
  onSpeak,
  failedImages,
  onImageFail,
  onZoomImage,
  styles,
  colors,
}: Props) {
  return (
    // aria-live="polite" here (not on individual message rows, which get
    // unmounted/remounted per msg.id) lets screen readers announce new
    // content as it's added - loading state appearing, streamed tokens
    // arriving, and the final reply landing.
    // @ts-ignore - aria-live is a valid RN Web prop, not yet in RN's View types
    <View aria-live="polite" aria-atomic="false">
      {messages.map((msg) => {
        const shownText = msg.role === 'ai' ? sanitizeDisplayedAIText(msg.text) : msg.text;
        const isStreaming = msg.id === streamingMsgId;

        return (
          <View key={msg.id} style={[
            styles.messageRow,
            msg.role === 'user' ? styles.messageRowUser : styles.messageRowAI,
          ]}>
            {msg.role === 'ai' && (
              <View style={styles.aiHeader}>
                <View style={[styles.aiAvatar, msg.isError && { backgroundColor: colors.accentRed }]}>
                  <Feather name={msg.isError ? 'alert-circle' : 'zap'} size={12} color="white" />
                </View>
                <Text style={styles.aiName}>Aivorah</Text>
              </View>
            )}

            {msg.role === 'user' ? (
              <View style={[styles.userBubble, msg.role === 'user' && styles.userBubbleStyle]}>
                <Text style={styles.userText}>{shownText}</Text>
              </View>
            ) : (
              <View style={styles.aiBody}>
                {shownText ? (
                  <>
                    {msg.isError ? (
                      <Text style={styles.errorText}>{shownText}</Text>
                    ) : (
                      <FormattedAIText text={shownText} colors={colors} position={speakingId === msg.id ? readPosition : null} />
                    )}
                    {/* Cursor while streaming */}
                    {isStreaming && (
                      <Animated.View style={styles.streamCursor} />
                    )}
                  </>
                ) : isStreaming ? (
                  <ThinkingIndicator colors={colors} />
                ) : null}

                {/* Action buttons — show after streaming done */}
                {msg.role === 'ai' && !msg.isError && !isStreaming && shownText && (
                  <View style={styles.actionRow}>
                    {Platform.OS === 'web' && (
                      <TouchableOpacity
                        style={[styles.actionBtn, speakingId === msg.id && styles.actionBtnActive]}
                        onPress={() => onSpeak(msg.id, shownText)}
                        activeOpacity={0.7}
                        accessible
                        accessibilityRole="button"
                        accessibilityLabel={speakingId === msg.id ? 'Stop reading reply aloud' : 'Read reply aloud'}
                      >
                        <Feather
                          name={speakingId === msg.id ? 'volume-2' : 'volume-1'}
                          size={14}
                          color={speakingId === msg.id ? '#fff' : colors.textDim}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Images — hide any that fail to load */}
                {msg.images && msg.images.filter(img => !failedImages.has(img.url)).length > 0 && (
                  <View style={styles.imageGrid}>
                    {msg.images.filter(img => !failedImages.has(img.url)).map((img, imgIdx) => (
                      <TouchableOpacity
                        key={imgIdx}
                        activeOpacity={0.8}
                        onPress={() => onZoomImage({ url: img.url, caption: (img.caption || '').replace(/\*\*/g, '').replace(/\*/g, '') })}
                      >
                        <View style={[styles.imageCard, { backgroundColor: colors.cardDark, borderColor: colors.borderColor }]}>
                          <Image
                            source={{ uri: img.url }}
                            style={styles.imageThumb}
                            resizeMode="cover"
                            onError={() => onImageFail(img.url)}
                          />
                          {!!img.caption && (
                            <Text style={[styles.imageCaption, { color: colors.textMuted }]} numberOfLines={2}>
                              {img.caption.replace(/\*\*/g, '').replace(/\*/g, '')}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}

      {/* Thinking — only if no streaming placeholder yet */}
      {isTyping && !streamingMsgId && (
        <View style={[styles.messageRow, styles.messageRowAI]}>
          <View style={styles.aiHeader}>
            <View style={styles.aiAvatar}>
              <Feather name="zap" size={12} color="white" />
            </View>
            <Text style={styles.aiName}>Aivorah</Text>
          </View>
          <View style={styles.aiBody}>
            <ThinkingIndicator colors={colors} />
          </View>
        </View>
      )}
    </View>
  );
}
