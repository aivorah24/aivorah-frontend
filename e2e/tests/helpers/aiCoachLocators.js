// AICoachScreen.tsx's send/mic/clear-chat buttons now have real
// accessibilityLabel + accessibilityRole="button" props (added to fix the
// a11y gap documented in ai-coach-a11y.spec.js - they used to be bare icon
// TouchableOpacitys with no accessible name at all). Use normal role-based
// selectors, same as the rest of the app.
export function inputBarButtons(page) {
  return {
    send: page.getByRole('button', { name: 'Send message' }),
    mic: page.getByRole('button', { name: /voice input/i }),
    clearChat: page.getByRole('button', { name: 'Clear chat' }), // only exists once messages.length > 1
  };
}

export function messageInput(page) {
  return page.getByPlaceholder('Message Aivorah...');
}

// Replaces the browser's real SpeechRecognition with a fake one that always
// "hears" the given transcript, so mic tests don't depend on Google's real
// cloud STT service (non-deterministic, needs real Chrome + network - see
// ai-coach-mic.spec.js's real-STT test for why that one is kept separate
// and not treated as a product-regression signal).
//
// The event shape matches exactly what AICoachScreen.tsx's toggleVoice()
// reads: event.results[i][0].transcript and event.results[i].isFinal
// (see recognition.onresult in that file).
//
// Must run AFTER the page has loaded (plain page.evaluate, not
// addInitScript) - this is a single-page app that never reloads once
// logged in, and toggleVoice() reads window.SpeechRecognition fresh on
// every click, so there's no need to survive a navigation.
export async function mockSpeechRecognition(page, transcript) {
  await page.evaluate((text) => {
    class MockSpeechRecognition {
      start() {
        // Wide enough gaps that the "Listening..." state (onstart -> onend)
        // has a real window to observe - it used to be ~40ms end-to-end,
        // which occasionally finished between two Playwright assertion
        // polls entirely (a flaky "never saw it" failure, not a slow one).
        setTimeout(() => this.onstart?.(), 50);
        setTimeout(() => {
          const result = [{ transcript: text }];
          result.isFinal = true;
          this.onresult?.({ resultIndex: 0, results: [result] });
        }, 400);
        setTimeout(() => this.onend?.(), 800);
      }
      stop() {
        this.onend?.();
      }
    }
    // @ts-ignore - test-only global override
    window.SpeechRecognition = MockSpeechRecognition;
    // @ts-ignore
    window.webkitSpeechRecognition = MockSpeechRecognition;
  }, transcript);
}
