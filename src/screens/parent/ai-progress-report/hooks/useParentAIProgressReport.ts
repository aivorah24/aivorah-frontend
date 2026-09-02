import { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { fetchChildren, generateAIReport, type ChildOption } from '../services/parentAIProgressReportService';

export function useParentAIProgressReport(incomingChildId?: string) {
  const { user } = useAuth();
  const parentEmail = user?.email || '';

  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildOption | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(true);

  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');

  async function generateReportFor(child: ChildOption, email: string) {
    setReportData(null);
    setError('');
    setLoadingReport(true);
    try {
      const data = await generateAIReport(email, child.id);
      setReportData(data);
    } catch (e: any) {
      setError(e.message || 'Could not generate report. Please try again.');
    } finally {
      setLoadingReport(false);
    }
  }

  // Load children on mount, then auto-generate if childId was passed
  useEffect(() => {
    fetchChildren(parentEmail)
      .then(opts => {
        if (opts.length > 0) {
          setChildren(opts);
          const target = incomingChildId ? (opts.find(c => c.id === incomingChildId) ?? opts[0]) : opts[0];
          setSelectedChild(target);
          if (incomingChildId) {
            // auto-kick report generation when navigated from dashboard
            generateReportFor(target, parentEmail);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingChildren(false));
  }, [parentEmail]);

  function generateReport(child: ChildOption) {
    setSelectedChild(child);
    generateReportFor(child, parentEmail);
  }

  function selectChild(child: ChildOption) {
    setSelectedChild(child);
    setReportData(null);
    setError('');
  }

  return {
    children,
    selectedChild,
    loadingChildren,
    reportData,
    loadingReport,
    error,
    generateReport,
    selectChild,
  };
}
