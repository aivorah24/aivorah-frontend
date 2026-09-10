import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useIBGeneration } from '../useIBGeneration';

// generateIBAssignment previously called SERVER_URL (the ai-mentor monolith),
// whose /assignments/generate-ibpyp 404'd with model_not_found
// (llama-3.3-70b-versatile decommissioned by Groq). Migrated to
// aivorah-assignments-service, which already has a working copy of this
// route (services/qdrant.js + services/embeddings.js already ported there).

function Harness() {
  const h = useIBGeneration({
    title: 'Fractions', chapter: '', unitOfInquiry: '', subject: 'Mathematics',
    effectiveGrade: 'Grade 4', effectiveCurriculum: 'IB PYP', selectedLanguage: '',
    setFormError: () => {}, setIbPurpose: () => {}, setIbCentralIdea: () => {},
    setIbLinesOfInquiry: () => {}, setIbLearnerProfile: () => {}, setIbAtlSkill: () => {},
    setIbKeyConcept: () => {}, setIbLearningOutcomes: () => {}, setTaskSteps: () => {},
    setSuccessCriteria: () => {}, setIbWordBank: () => {}, setIbStamps: () => {},
  });
  return (
    <View>
      <Text testID="generating">{String(h.generatingIB)}</Text>
      <TouchableOpacity testID="generate" onPress={() => h.generateIBAssignment()} />
    </View>
  );
}

test('generateIBAssignment calls aivorah-assignments-service, not the ai-mentor monolith', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ purpose: 'p', taskSteps: [] }) }) as any;
  const user = userEvent.setup();
  await render(<Harness />);

  await user.press(screen.getByTestId('generate'));
  await waitFor(() => expect(screen.getByTestId('generating').props.children).toBe('false'));

  expect(global.fetch).toHaveBeenCalledTimes(1);
  const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
  expect(calledUrl).toContain('/assignments/generate-ibpyp');
  expect(calledUrl).not.toContain('aivorah.ai');
  expect(calledUrl).toMatch(/aivorah-assignments-service|localhost:3015/);
});
