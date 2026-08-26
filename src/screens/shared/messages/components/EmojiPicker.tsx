import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { EMOJI_CATEGORIES } from '../constants';

interface Props {
  onClose: () => void;
  styles: any;
  emojiCategory: number;
  setEmojiCategory: (i: number) => void;
  onPickEmoji: (emoji: string) => void;
}

export default function EmojiPicker({ onClose, styles, emojiCategory, setEmojiCategory, onPickEmoji }: Props) {
  return (
    <View style={styles.emojiPickerFloating}>
      <View style={styles.emojiCategoryTabs}>
        {EMOJI_CATEGORIES.map((cat, i) => (
          <TouchableOpacity
            key={cat.label}
            style={[styles.emojiCategoryTab, emojiCategory === i && styles.emojiCategoryTabActive]}
            onPress={() => setEmojiCategory(i)}
            activeOpacity={0.7}
          >
            <Text style={styles.emojiCategoryIcon}>{cat.icon}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={styles.emojiPanel} contentContainerStyle={styles.emojiPanelContent} nestedScrollEnabled>
        {EMOJI_CATEGORIES[emojiCategory].emojis.map((e, i) => (
          <TouchableOpacity key={`${e}-${i}`} onPress={() => onPickEmoji(e)} activeOpacity={0.6} style={styles.emojiCell}>
            <Text style={styles.emojiItem}>{e}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
