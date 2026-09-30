import React, { useMemo, useState } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import ScreenLayout from '../../../components/common/ScreenLayout';
import Header from '../../../components/common/Header';
import { TEACHER_COURSES, TeacherCourse } from '../../../data/teacherCourses';

import { COURSE_VIDEOS } from './constants';
import { makeStyles } from './styles';
import { computeCourseStats } from './utils/courseStats';
import CourseVideoSection from './components/CourseVideoSection';
import CoursePathList from './components/CoursePathList';
import CourseDetailModal from './components/CourseDetailModal';

export default function TeacherLearningPathsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const gold = colors.accentYellow;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [active, setActive] = useState<TeacherCourse | null>(null);

  const { totalLessons, totalMinutes } = computeCourseStats(TEACHER_COURSES);
  const isWide = width >= 980;

  return (
    <ScreenLayout hideAIPanel>
      <View style={styles.screen}>
        <Header
          title="Professional Development"
          subtitle="Professional development for educators"
          onMenuPress={() => navigation.openDrawer()}
        />
        <ScrollView testID="teacher-learning-paths-scroll" style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {COURSE_VIDEOS.map((video, vIndex) => (
            <CourseVideoSection
              key={video.id}
              video={video}
              vIndex={vIndex}
              isWide={isWide}
              colors={colors}
              gold={gold}
              styles={styles}
            />
          ))}

          <View style={[styles.overviewGrid, !isWide && styles.overviewGridStack]}>
            <CoursePathList
              courses={TEACHER_COURSES}
              totalLessons={totalLessons}
              totalMinutes={totalMinutes}
              colors={colors}
              gold={gold}
              styles={styles}
              onSelectCourse={setActive}
            />
          </View>

        </ScrollView>
      </View>

      <CourseDetailModal
        active={active}
        colors={colors}
        gold={gold}
        styles={styles}
        onClose={() => setActive(null)}
      />
    </ScreenLayout>
  );
}
