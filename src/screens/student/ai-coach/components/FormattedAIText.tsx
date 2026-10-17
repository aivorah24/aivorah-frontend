import React from 'react';
import type { AppColors } from '../../../../theme';
import AIReplyText from '../../../../components/common/AIReplyText';
import type { ReadPosition } from '../../../../hooks/useReplyReader';

export default function FormattedAIText({ text, colors, position }: { text: string; colors: AppColors; position?: ReadPosition | null }) {
  return <AIReplyText text={text} colors={colors} position={position} />;
}
