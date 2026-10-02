import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useStudentData } from '../../../context/StudentDataContext';
import CalibrationPrompt from './components/CalibrationPrompt';
import PassagePicker from './components/PassagePicker';
import PassagePreview from './components/PassagePreview';
import ReadingView from './components/ReadingView';
import ReviewView from './components/ReviewView';
import { AnalysingView, CountdownView, RecordingPreview } from './components/SessionStatusViews';
import { makeStyles } from './components/styles';
import { useListenFirst } from './hooks/useListenFirst';
import { usePassageLibrary } from './hooks/usePassageLibrary';
import { useReadingSession } from './hooks/useReadingSession';
import type { Passage } from './types';

export default function ReadAloudScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { stats, addXP } = useStudentData();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const grade: string = user?.grade || (stats as any)?.grade || 'Grade 3';

  const [passage, setPassage] = useState<Passage | null>(null);
  const [isCalibration, setIsCalibration] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const library = usePassageLibrary(grade);
  const listen = useListenFirst(passage);
  const session = useReadingSession({
    passage,
    grade,
    isCalibration,
    onCalibrated: library.applyLexile,
    onLexileChanged: library.applyLexile,
    addXP,
  });

  const openPassage = useCallback(async (title?: string) => {
    setOpenError(null);
    try {
      const p = await library.loadPassage(title);
      session.reset();
      setIsCalibration(false);
      setPassage(p);
    } catch {
      setOpenError('Could not load passage. Please try again.');
    }
  }, [library, session]);

  const startCalibration = useCallback(async () => {
    try {
      const p = await library.loadCalibrationPassage();
      session.reset();
      setIsCalibration(true);
      setPassage(p);
      session.startCountdown(p);
    } catch {
      library.cancelCalibration();
    }
  }, [library, session]);

  const startReading = useCallback(() => {
    listen.stop();
    session.startCountdown();
  }, [listen, session]);

  const backToPicker = useCallback(() => {
    listen.stop();
    session.reset();
    setIsCalibration(false);
    setPassage(null);
  }, [listen, session]);

  const handleBack = useCallback(() => {
    if (passage) { backToPicker(); return; }
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Dashboard');
  }, [backToPicker, navigation, passage]);

  const tryAgain = useCallback(() => {
    session.reset();
    setIsCalibration(false);
  }, [session]);

  const renderBody = () => {
    if (!passage) {
      return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollPad}>
          {library.needsCalibration ? (
            <CalibrationPrompt s={s} colors={colors} lexile={library.lexile} onStart={startCalibration} onSkip={library.skipCalibration} />
          ) : (
            <PassagePicker
              s={s}
              colors={colors}
              lexile={library.lexile}
              passages={library.passages}
              hasPassages={library.hasPassages}
              loading={library.loading}
              error={library.error}
              filter={library.filter}
              onFilter={library.setFilter}
              onPick={openPassage}
              onRetry={library.reload}
              busy={library.loadingPassage}
              openError={openError}
            />
          )}
        </ScrollView>
      );
    }
    switch (session.phase) {
      case 'countdown':
        return <CountdownView s={s} colors={colors} count={session.countdownNum} />;
      case 'reading':
        return (
          <ReadingView
            s={s}
            colors={colors}
            words={session.words}
            wordStatuses={session.wordStatuses}
            sourcePos={session.sourcePos}
            waveformBars={session.waveformBars}
            recordingTime={session.recordingTime}
            isPaused={session.isPaused}
            liveSpeechStatus={session.liveSpeechStatus}
            activeEngine={session.activeEngine}
            onPause={session.pauseRecording}
            onResume={session.resumeRecording}
            onDone={session.stopReading}
          />
        );
      case 'preview':
        return (
          <RecordingPreview
            s={s}
            colors={colors}
            text={passage.text}
            gradient={passage.gradient}
            recordingTime={session.recordingTime}
            isPlayingBack={session.isPlayingBack}
            onTogglePlayback={session.togglePlayback}
            onRetry={session.retryRecording}
            onSubmit={session.submitRecording}
          />
        );
      case 'analysing':
        return <AnalysingView s={s} colors={colors} />;
      case 'reviewing':
        return (
          <ReviewView
            s={s}
            colors={colors}
            result={session.result}
            words={session.words}
            wordStatuses={session.wordStatuses}
            starsEarned={session.starsEarned}
            onTryAgain={tryAgain}
            onNewPassage={backToPicker}
          />
        );
      default:
        return (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
            <PassagePreview
              s={s}
              colors={colors}
              isDark={isDark}
              passage={passage}
              words={session.words}
              listen={listen}
              voskStatus={session.voskStatus}
              onStartReading={startReading}
            />
          </ScrollView>
        );
    }
  };

  return (
    <ScreenLayout>
      <Header title="Read Aloud" subtitle={`${grade} · IB PYP Reading Practice`} showBack onBack={handleBack} />
      <View style={{ flex: 1 }}>{renderBody()}</View>
    </ScreenLayout>
  );
}
