import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { TeacherCourse } from '../../../../data/teacherCourses';

interface Props {
  courses: TeacherCourse[];
  totalLessons: number;
  totalMinutes: number;
  colors: AppColors;
  gold: string;
  styles: any;
  onSelectCourse: (course: TeacherCourse) => void;
}

export default function CoursePathList({ courses, totalLessons, totalMinutes, colors, gold, styles, onSelectCourse }: Props) {
  return (
    <View style={styles.coursePanel}>
      <View style={styles.sectionHead}>
        <View>
          <Text style={styles.sectionTitle}>Learning Path Overview</Text>
          <Text style={styles.sectionSub}>
            {courses.length} courses • {totalLessons} lessons • about {totalMinutes} minutes
          </Text>
        </View>
      </View>

      <View style={styles.pathList}>
        {courses.map((course, index) => (
          <TouchableOpacity
            key={course.id}
            testID={`teacher-learning-paths-course-${course.id}`}
            style={[styles.pathCard, index === 0 && styles.pathCardActive]}
            activeOpacity={0.76}
            onPress={() => onSelectCourse(course)}
          >
            <View style={[styles.pathStep, index === 0 && styles.pathStepActive]}>
              <Text style={[styles.pathStepText, index === 0 && styles.pathStepTextActive]}>{index + 1}</Text>
            </View>
            <View style={styles.pathInfo}>
              <Text style={styles.pathLabel}>{course.title}</Text>
              <Text style={styles.pathDesc}>{course.desc}</Text>
              <Text style={styles.pathMeta}>{course.lessons.length} lessons</Text>
            </View>
            <View style={styles.pathAction}>
              <Feather name={course.icon as any} size={16} color={index === 0 ? gold : colors.textDim} />
              <Feather name="chevron-right" size={18} color={colors.textDim} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
