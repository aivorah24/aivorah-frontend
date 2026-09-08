import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import { spacing } from '../../../../../theme';
import { makeStyles } from '../styles';

// Generic renderer for the AI enrichment pilot's structured Learn-tab
// content (see aivorah-learning-paths-service's services/curriculum/
// blockSchema.js for the matching server-side validator — this file's
// switch cases are the frontend half of that same block-type contract).
//
// Deliberately switches on `block.type`, never on subject — a new subject
// just needs its prompt to emit existing block types, not new rendering
// logic here.
//
// Math/science notation note: this project has no KaTeX/MathJax dependency
// yet (checked before writing this), so equation strings are rendered as
// monospace text rather than true LaTeX typesetting. They ARE stored as
// LaTeX-compatible strings (see enrichment.js's prompt), so swapping in a
// real KaTeX renderer later is a rendering-only change, not a schema change.

type Block = { type: string; [key: string]: any };

function Heading({ children, colors }: { children: React.ReactNode; colors: AppColors }) {
  return <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMain, marginBottom: 4 }}>{children}</Text>;
}

function Card({ children, colors, accent }: { children: React.ReactNode; colors: AppColors; accent?: string }) {
  return (
    <View style={{
      borderWidth: 1, borderColor: (accent || colors.borderColor) + (accent ? '55' : ''), backgroundColor: accent ? accent + '10' : colors.cardDark,
      borderRadius: 10, padding: 12, gap: 6,
    }}>
      {children}
    </View>
  );
}

function BodyText({ children, colors }: { children: React.ReactNode; colors: AppColors }) {
  return <Text style={{ fontSize: 13.5, lineHeight: 20, color: colors.textMain }}>{children}</Text>;
}

function renderBlock(block: Block, i: number, colors: AppColors): React.ReactNode {
  switch (block.type) {
    case 'overview':
    case 'explanation':
      return (
        <Card key={i} colors={colors}>
          <BodyText colors={colors}>{block.text}</BodyText>
        </Card>
      );

    case 'key_terms':
      return (
        <Card key={i} colors={colors}>
          <Heading colors={colors}>Key terms</Heading>
          {(block.items || []).map((it: any, j: number) => (
            <Text key={j} style={{ fontSize: 13, color: colors.textMain, marginTop: 2 }}>
              <Text style={{ fontWeight: '700' }}>{it.term}</Text>{' — '}{it.definition}
            </Text>
          ))}
        </Card>
      );

    case 'key_points':
      return (
        <Card key={i} colors={colors}>
          <Heading colors={colors}>Important points</Heading>
          {(block.items || []).map((it: string, j: number) => (
            <Text key={j} style={{ fontSize: 13, color: colors.textMain, marginTop: 2 }}>{'•'} {it}</Text>
          ))}
        </Card>
      );

    case 'example':
      return (
        <Card key={i} colors={colors} accent={colors.accentGreen}>
          <Heading colors={colors}>Example</Heading>
          <BodyText colors={colors}>{block.text}</BodyText>
        </Card>
      );

    case 'worked_example':
      return (
        <Card key={i} colors={colors} accent={colors.primary}>
          <Heading colors={colors}>Worked example</Heading>
          <Text style={{ fontSize: 13.5, color: colors.textMain, fontWeight: '600' }}>{block.problem}</Text>
          {!!block.concept && <Text style={{ fontSize: 12.5, color: colors.textMuted, fontStyle: 'italic' }}>Using: {block.concept}</Text>}
          {(block.steps || []).map((s: any, j: number) => (
            <View key={j} style={{ marginTop: 6 }}>
              <Text style={{ fontSize: 13, color: colors.textMain, fontWeight: '600' }}>Step {s.step ?? j + 1}: {s.action}</Text>
              {!!s.equation && <Text style={{ fontSize: 13, color: colors.primary, fontFamily: 'monospace' as any, marginTop: 2 }}>{s.equation}</Text>}
              {!!s.why && <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>Why: {s.why}</Text>}
            </View>
          ))}
          {!!block.check && (
            <Text style={{ fontSize: 12.5, color: colors.textMuted, marginTop: 6 }}>
              Check: {typeof block.check === 'string' ? block.check : JSON.stringify(block.check)}
            </Text>
          )}
          <Text style={{ fontSize: 13.5, color: colors.accentGreen, fontWeight: '700', marginTop: 6 }}>Answer: {block.finalAnswer}</Text>
        </Card>
      );

    case 'formula':
      return (
        <Card key={i} colors={colors} accent={colors.primary}>
          <Heading colors={colors}>{block.name}</Heading>
          <Text style={{ fontSize: 14, color: colors.primary, fontFamily: 'monospace' as any }}>{block.expression}</Text>
          {(block.variables || []).map((v: any, j: number) => (
            <Text key={j} style={{ fontSize: 12.5, color: colors.textMuted }}>{v.symbol} = {v.meaning}{v.unit ? ` (${v.unit})` : ''}</Text>
          ))}
        </Card>
      );

    case 'chemical_equation':
      return (
        <Card key={i} colors={colors} accent={colors.accentGreen}>
          <Text style={{ fontSize: 14, color: colors.textMain, fontFamily: 'monospace' as any, fontWeight: '600' }}>{block.equation}</Text>
          {!!block.explanation && <BodyText colors={colors}>{block.explanation}</BodyText>}
        </Card>
      );

    case 'process':
      return (
        <Card key={i} colors={colors}>
          <Heading colors={colors}>{block.title || 'Process'}</Heading>
          {(block.steps || []).map((s: string, j: number) => (
            <Text key={j} style={{ fontSize: 13, color: colors.textMain, marginTop: 2 }}>{j + 1}. {s}</Text>
          ))}
        </Card>
      );

    case 'comparison':
      return (
        <Card key={i} colors={colors}>
          <Heading colors={colors}>{block.title || 'Comparison'}</Heading>
          {(block.items || []).map((it: any, j: number) => (
            <Text key={j} style={{ fontSize: 13, color: colors.textMain, marginTop: 2 }}>
              <Text style={{ fontWeight: '700' }}>{it.name || it.label}</Text>{' — '}{it.description || it.value}
            </Text>
          ))}
        </Card>
      );

    // Poem/prose excerpts must stay visually distinct from the AI's own
    // explanation — the original text is never a rewrite (see enrichment.js's
    // language-subject prompt rule).
    case 'poem_line':
    case 'prose_excerpt':
      return (
        <Card key={i} colors={colors}>
          <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, color: colors.textMuted, marginBottom: 2 }}>
            {block.type === 'poem_line' ? 'ORIGINAL POEM / SOURCE LINE' : 'ORIGINAL TEXT'}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textMain, fontStyle: 'italic', marginBottom: 6 }}>{block.sourceText}</Text>
          <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, color: colors.primary, marginBottom: 2 }}>SIMPLE EXPLANATION</Text>
          <BodyText colors={colors}>{block.explanation}</BodyText>
        </Card>
      );

    case 'vocabulary':
      return (
        <Card key={i} colors={colors}>
          <Heading colors={colors}>Vocabulary</Heading>
          {(block.items || []).map((it: any, j: number) => (
            <Text key={j} style={{ fontSize: 13, color: colors.textMain, marginTop: 2 }}>
              <Text style={{ fontWeight: '700' }}>{it.term}</Text>{' — '}{it.meaning}
            </Text>
          ))}
        </Card>
      );

    case 'activity':
      return (
        <Card key={i} colors={colors} accent={colors.primary}>
          <Heading colors={colors}>Try this yourself</Heading>
          <BodyText colors={colors}>{block.text}</BodyText>
        </Card>
      );

    case 'tip':
      return (
        <View key={i} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
          <Feather name="info" size={13} color={colors.accentGreen} style={{ marginTop: 2 }} />
          <BodyText colors={colors}>{block.text}</BodyText>
        </View>
      );

    case 'common_mistake':
      return (
        <View key={i} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
          <Feather name="alert-triangle" size={13} color="#C97A4E" style={{ marginTop: 2 }} />
          <BodyText colors={colors}>{block.text}</BodyText>
        </View>
      );

    default:
      // An unrecognized/optional block type is skipped, never rendered as
      // an empty or broken box.
      return null;
  }
}

export default function LearningBlocks({
  whatYoullLearn,
  blocks,
  colors,
}: {
  whatYoullLearn?: string[];
  blocks: Block[];
  colors: AppColors;
}) {
  return (
    <View style={{ gap: spacing.md }}>
      {!!whatYoullLearn?.length && (
        <View style={[{ borderRadius: 10, padding: 12, gap: 4 }, { backgroundColor: colors.primary + '14', borderWidth: 1, borderColor: colors.primary + '40' }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: colors.primary }}>WHAT YOU&apos;LL LEARN</Text>
          {whatYoullLearn.map((w, i) => (
            <Text key={i} style={{ fontSize: 13, color: colors.textMain }}>{'•'} {w}</Text>
          ))}
        </View>
      )}
      {blocks.map((b, i) => renderBlock(b, i, colors)).filter(Boolean)}
    </View>
  );
}
