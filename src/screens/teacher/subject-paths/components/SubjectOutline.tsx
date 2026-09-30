import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import {
  renameChapter, toggleChapterHidden, moveChapter, addChapter, renameTopic, toggleTopicHidden, moveTopic, addTopic, removeAdded,
  type EditedChapter, type SubjectEdits,
} from '../../../student/learning-paths/subject-syllabus/subjectEdits';

type Apply = (op: (base: any[], edits: SubjectEdits) => SubjectEdits) => void;

function InlineName({ value, colors, onDone, testID }: { value: string; colors: AppColors; onDone: (v: string | null) => void; testID: string }) {
  const [text, setText] = useState(value);
  return (
    <TextInput
      testID={testID}
      autoFocus
      value={text}
      onChangeText={setText}
      onSubmitEditing={() => onDone(text.trim() || null)}
      onBlur={() => onDone(text.trim() || null)}
      style={{ flex: 1, fontSize: 13.5, fontWeight: '700', color: colors.textMain, borderWidth: 1, borderColor: colors.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4 }}
    />
  );
}

function Icon({ name, onPress, colors, testID, disabled }: { name: any; onPress: () => void; colors: AppColors; testID: string; disabled?: boolean }) {
  return (
    <TouchableOpacity testID={testID} onPress={onPress} disabled={disabled} style={{ padding: 4, opacity: disabled ? 0.25 : 1 }}>
      <Feather name={name} size={13} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// The subject's chapters and topics as the teacher's students will get them: rename, reorder, hide, add.
export default function SubjectOutline({
  chapters, selectedKey, colors, apply, onSelect,
}: {
  chapters: EditedChapter[];
  selectedKey: string | null;
  colors: AppColors;
  apply: Apply;
  onSelect: (chapterKey: string, topicKey: string) => void;
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(chapters[0] ? [chapters[0].editKey] : []));
  const [renaming, setRenaming] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  return (
    <View testID="subject-outline" style={{ gap: 8 }}>
      {chapters.map((ch, ci) => {
        const isOpen = open.has(ch.editKey);
        const edits = ch.topics.filter((t) => t.lessonEdit || t.added || t.renamed || t.hidden).length;
        return (
          <View key={ch.editKey} style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark, opacity: ch.hidden ? 0.55 : 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10 }}>
              <TouchableOpacity testID={`chapter-toggle-${ci}`} onPress={() => toggle(ch.editKey)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: colors.primary + '1A', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.primary }}>{ci + 1}</Text>
                </View>
                {renaming === ch.editKey ? (
                  <InlineName testID={`chapter-name-input-${ci}`} value={ch.title} colors={colors} onDone={(v) => { if (v && v !== ch.title) apply(renameChapter(ch.editKey, v)); setRenaming(null); }} />
                ) : (
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.textMain, textDecorationLine: ch.hidden ? 'line-through' : 'none' }} numberOfLines={2}>{ch.title}</Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>
                      {ch.topics.length} topics{ch.hidden ? ' · hidden from students' : ''}{ch.added ? ' · your chapter' : ''}{edits ? ` · ${edits} changed` : ''}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <Icon testID={`chapter-rename-${ci}`} name="edit-2" colors={colors} onPress={() => setRenaming(ch.editKey)} />
              <Icon testID={`chapter-up-${ci}`} name="arrow-up" colors={colors} disabled={ci === 0} onPress={() => apply(moveChapter(ch.editKey, -1))} />
              <Icon testID={`chapter-down-${ci}`} name="arrow-down" colors={colors} disabled={ci === chapters.length - 1} onPress={() => apply(moveChapter(ch.editKey, 1))} />
              {ch.added
                ? <Icon testID={`chapter-delete-${ci}`} name="trash-2" colors={colors} onPress={() => apply(removeAdded(ch.editKey))} />
                : <Icon testID={`chapter-hide-${ci}`} name={ch.hidden ? 'eye-off' : 'eye'} colors={colors} onPress={() => apply(toggleChapterHidden(ch.editKey))} />}
            </View>

            {isOpen && (
              <View style={{ paddingHorizontal: 8, paddingBottom: 8, gap: 2 }}>
                {ch.topics.map((t, ti) => {
                  const sel = selectedKey === t.editKey;
                  const renameKey = `${ch.editKey}|${t.editKey}`;
                  return (
                    <View key={t.editKey} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 8, paddingRight: 2, paddingVertical: 6, borderRadius: 8, backgroundColor: sel ? colors.primary + '1F' : 'transparent', opacity: t.hidden ? 0.5 : 1 }}>
                      {renaming === renameKey ? (
                        <InlineName testID={`topic-name-input-${ci}-${ti}`} value={t.name} colors={colors} onDone={(v) => { if (v && v !== t.name) apply(renameTopic(ch.editKey, t.editKey, v)); setRenaming(null); }} />
                      ) : (
                        <TouchableOpacity testID={`topic-${ci}-${ti}`} style={{ flex: 1 }} onPress={() => onSelect(ch.editKey, t.editKey)}>
                          <Text style={{ fontSize: 13, fontWeight: sel ? '700' : '500', color: sel ? colors.primary : colors.textMain, textDecorationLine: t.hidden ? 'line-through' : 'none' }} numberOfLines={2}>{t.name}</Text>
                          {(t.lessonEdit || t.added || t.hidden) && (
                            <Text style={{ fontSize: 10.5, fontWeight: '700', color: t.hidden ? colors.textMuted : colors.primary }}>
                              {t.hidden ? 'Hidden' : t.added ? 'Your topic' : 'Edited'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}
                      <Icon testID={`topic-rename-${ci}-${ti}`} name="edit-2" colors={colors} onPress={() => setRenaming(renameKey)} />
                      <Icon testID={`topic-up-${ci}-${ti}`} name="arrow-up" colors={colors} disabled={ti === 0} onPress={() => apply(moveTopic(ch.editKey, t.editKey, -1))} />
                      <Icon testID={`topic-down-${ci}-${ti}`} name="arrow-down" colors={colors} disabled={ti === ch.topics.length - 1} onPress={() => apply(moveTopic(ch.editKey, t.editKey, 1))} />
                      {t.added
                        ? <Icon testID={`topic-delete-${ci}-${ti}`} name="trash-2" colors={colors} onPress={() => apply(removeAdded(ch.editKey, t.editKey))} />
                        : <Icon testID={`topic-hide-${ci}-${ti}`} name={t.hidden ? 'eye-off' : 'eye'} colors={colors} onPress={() => apply(toggleTopicHidden(ch.editKey, t.editKey))} />}
                    </View>
                  );
                })}
                {adding === ch.editKey ? (
                  <View style={{ flexDirection: 'row', paddingLeft: 8 }}>
                    <InlineName testID={`topic-add-input-${ci}`} value="" colors={colors} onDone={(v) => { if (v) apply(addTopic(ch.editKey, v)); setAdding(null); }} />
                  </View>
                ) : (
                  <TouchableOpacity testID={`topic-add-${ci}`} onPress={() => setAdding(ch.editKey)} style={{ paddingLeft: 8, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.primary }}>+ Add topic</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}
      {adding === '__chapter' ? (
        <InlineName testID="chapter-add-input" value="" colors={colors} onDone={(v) => { if (v) apply(addChapter(v)); setAdding(null); }} />
      ) : (
        <TouchableOpacity testID="chapter-add" onPress={() => setAdding('__chapter')} style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary + '66', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>+ Add chapter</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
