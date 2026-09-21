import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

export function HeroSearch({
  colors, styles, search, setSearch, resultCount,
}: {
  colors: any; styles: any; search: string; setSearch: (v: string) => void; resultCount: number;
}) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroIconWrap}>
        <Feather name="help-circle" size={32} color={colors.accentYellow} />
      </View>
      <Text style={styles.heroTitle}>How can we help you?</Text>
      <Text style={styles.heroSub}>Find answers instantly or reach our support team.</Text>
      <View style={styles.searchBox}>
        <Feather name="search" size={16} color={colors.textDim} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search questions..."
          placeholderTextColor={colors.textDim}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')}>
            <Feather name="x" size={16} color={colors.textDim} />
          </TouchableOpacity>
        )}
      </View>
      {search.length > 0 && (
        <Text style={styles.searchResultCount}>{resultCount} result{resultCount !== 1 ? 's' : ''}</Text>
      )}
    </View>
  );
}
