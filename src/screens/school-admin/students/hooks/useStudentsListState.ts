import { useState, useCallback, useMemo, useRef } from 'react';
import React from 'react';
import { schoolAdminStudentsService, type StudentRow } from '../services/schoolAdminStudentsService';
import { normalizeCurriculum } from '../../../../utils/curriculum';

export type StatusFilter = 'all' | 'invited' | 'active' | 'inactive' | 'archived';
export type SortKey = 'name' | 'grade' | 'admissionNumber';

// Same list/ranges as the student/parent onboarding flow (getGradesForCurriculum
// in OnboardingScreen.tsx) and SchoolAdminAddStudentScreen.tsx's own copy —
// this is a fixed STRUCTURAL fact (an IB school always has exactly PYP/MYP/DP,
// each spanning a fixed grade range), not something derived from who happens
// to be enrolled. Used here to narrow the Grade filter once a specific IB
// program is chosen in the Curriculum filter — e.g. picking "IB PYP" should
// offer Grade 1-5 even if today's roster only has PYP students in Grade 1-3.
export function getGradesForCurriculum(curr: string): string[] | null {
  if (curr === 'IB PYP') return ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
  if (curr === 'IB MYP') return ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
  if (curr === 'IB DP') return ['Grade 11', 'Grade 12'];
  return null; // non-IB curricula don't partition grades — use the school's real facet data instead
}

// List/query state for the Students screen — fetch, search, filters, sort,
// and the facets that populate the filter dropdowns. Selection/bulk-action
// state and the detail drawer stay in the screen (Phase A extraction only).
export function useStudentsListState(
  userEmail: string | undefined | null,
  isArchivedRoute: boolean,
  initialStatus: StatusFilter
) {
  const [items, setItems] = useState<StudentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [curriculumFilter, setCurriculumFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('admissionNumber');
  const [sortAsc, setSortAsc] = useState(true);

  // The FULL set of Grade/Section/Curriculum values that exist anywhere in
  // the school — fetched from a dedicated facets endpoint, NOT derived from
  // `items`. `items` is one paginated (and possibly filtered) page of the
  // list, so deriving filter options from it silently hides values that
  // exist outside the current page or filter (e.g. "All grades" only showing
  // Grade 6 because that's all that happened to be loaded). Curriculum is a
  // SEPARATE field from Grade (e.g. grade="Grade 3", curriculum="IB PYP") —
  // IB in particular spans PYP/MYP/DP by grade range within one school — so
  // it's its own filter, not folded into the Grade dropdown.
  const [facetGrades, setFacetGrades] = useState<string[]>([]);
  const [facetSections, setFacetSections] = useState<string[]>([]);
  const [facetCurriculums, setFacetCurriculums] = useState<string[]>([]);

  const loadFacets = useCallback(async () => {
    if (!userEmail) return;
    try {
      const data = await schoolAdminStudentsService.getFacets(userEmail);
      setFacetGrades(data.grades);
      setFacetSections(data.sections);
      setFacetCurriculums([...new Set<string>((data.curriculums || []).map((c: string) => normalizeCurriculum(c)))]);
    } catch { /* filter dropdowns just stay at their previous values */ }
  }, [userEmail]);

  const loadSeq = useRef(0);
  const load = useCallback(async () => {
    if (!userEmail) return;
    const seq = ++loadSeq.current;
    setError('');
    try {
      // The archived route always queries status=archived regardless of
      // local statusFilter state — the URL is what decides this, not a
      // dropdown value that could drift from it.
      const effectiveStatus = isArchivedRoute ? 'archived' : statusFilter;

      const data = await schoolAdminStudentsService.getStudents({
        adminEmail: userEmail,
        status: effectiveStatus,
        sort: sortKey,
        dir: sortAsc ? 'asc' : 'desc',
        search: query,
        curriculum: curriculumFilter,
        grade: gradeFilter,
        section: sectionFilter,
        limit: 100
      });

      if (seq !== loadSeq.current) return;
      setItems(data.items);
      setTotal(data.total);
    } catch (err: any) {
      if (seq !== loadSeq.current) return;
      setError(err.message || 'Failed to load students. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userEmail, query, statusFilter, curriculumFilter, gradeFilter, sectionFilter, sortKey, sortAsc, isArchivedRoute]);

  // Once a specific IB program is chosen in the Curriculum filter, Grade
  // narrows to that program's fixed range (e.g. IB PYP -> Grade 1-5)
  // regardless of which of those grades already has enrolled students — same
  // reasoning as why Curriculum itself no longer disappears for an empty
  // program (see facets endpoint comment). Declared here (before the effect
  // below that depends on it) rather than down by gradeOptions — a `const`
  // referenced in an earlier statement's dependency array throws
  // "Cannot access before initialization" at render time, not just a lint
  // warning.
  const curriculumGradeRange = useMemo(() => getGradesForCurriculum(curriculumFilter), [curriculumFilter]);

  // If switching the Curriculum filter makes the current Grade selection
  // fall outside that program's range (e.g. Grade 8 selected, then Curriculum
  // switches to "IB PYP" which only spans Grade 1-5), clear it back to "All
  // grades" rather than silently keeping a filter combo with no possible
  // results.
  React.useEffect(() => {
    if (curriculumGradeRange && gradeFilter !== 'all' && !curriculumGradeRange.includes(gradeFilter)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets an invalidated filter combo, external sync
      setGradeFilter('all');
    }
  }, [curriculumGradeRange, gradeFilter]);

  const statusOptions = useMemo(() => ([
    { value: 'all', label: 'All statuses' },
    { value: 'invited', label: 'Invited' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'archived', label: 'Archived' },
  ]), []);
  // Grade options normally come from the server, already sorted with
  // curriculum-aware natural order (Grade 2 before Grade 10) — see
  // sortGradeNames in server/services/academicStructure.js. curriculumGradeRange
  // (declared above, near the effect that depends on it) overrides this list
  // once a specific IB program is chosen in the Curriculum filter.
  const gradeOptions = useMemo(() => {
    const list = curriculumGradeRange || facetGrades;
    return [{ value: 'all', label: 'All grades' }, ...list.map((g) => ({ value: g, label: g }))];
  }, [facetGrades, curriculumGradeRange]);
  const sectionOptions = useMemo(() => ([{ value: 'all', label: 'All sections' }, ...facetSections.map((s) => ({ value: s, label: s }))]), [facetSections]);
  // Curriculum (IB PYP / IB MYP / IB DP / CBSE / ...) — a separate filter
  // from Grade, sorted server-side with sortCurriculumNames.
  const curriculumOptions = useMemo(() => ([{ value: 'all', label: 'All curricula' }, ...facetCurriculums.map((c) => ({ value: c, label: c }))]), [facetCurriculums]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  return {
    items, total, loading, setLoading, refreshing, setRefreshing, error, setError,
    query, setQuery,
    statusFilter, setStatusFilter,
    curriculumFilter, setCurriculumFilter,
    gradeFilter, setGradeFilter,
    sectionFilter, setSectionFilter,
    sortKey, sortAsc, toggleSort,
    facetGrades, facetSections, facetCurriculums,
    statusOptions, gradeOptions, sectionOptions, curriculumOptions,
    load, loadFacets,
  };
}
