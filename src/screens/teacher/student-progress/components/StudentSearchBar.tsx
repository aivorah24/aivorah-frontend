import { View, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

interface Props {
  colors: AppColors;
  value: string;
  onChangeText: (text: string) => void;
}

// One shared search box, scoping BOTH Topic Exploration and Activity &
// Performance below it — same "single filter state drives every section"
// principle as the top Curriculum/Grade/Section/Subject filters. Useful
// once a class has ~30 students and scrolling/paging to find one gets slow.
export default function StudentSearchBar({ colors, value, onChangeText }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        alignSelf: 'flex-start', width: 220,
        borderWidth: 1, borderColor: colors.borderColor, borderRadius: 8,
        backgroundColor: colors.cardDark, paddingHorizontal: 10, paddingVertical: 6,
      }}
    >
      <Feather name="search" size={12} color={colors.textMuted} />
      <TextInput
        testID="student-progress-search"
        value={value}
        onChangeText={onChangeText}
        placeholder="Search students…"
        placeholderTextColor={colors.textDim}
        // react-native-web renders TextInput as a real <input>, which picks
        // up the browser's default black focus outline — `outlineStyle`
        // is a react-native-web-specific style prop that suppresses it.
        style={{ flex: 1, fontSize: 12, color: colors.textMain, padding: 0, outlineStyle: 'none' } as any}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="words"
      />
    </View>
  );
}
