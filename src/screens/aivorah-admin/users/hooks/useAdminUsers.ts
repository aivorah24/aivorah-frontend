import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAdminUsers, bulkSetBlocked } from '../services/usersService';
import type { AdminUser, AdminUserFilters } from '../types';

const SEARCH_DEBOUNCE_MS = 300;

export function useAdminUsers() {
  const [filters, setFilters] = useState<AdminUserFilters>({ q: '', role: '', status: '', page: 1 });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState('');
  const reqId = useRef(0);

  const load = useCallback(async (f: AdminUserFilters) => {
    const id = ++reqId.current;
    setLoading(true);
    setError('');
    try {
      const page = await fetchAdminUsers(f);
      if (id !== reqId.current) return; // a newer filter change already started
      setUsers(page.users);
      setTotal(page.total);
      setPageSize(page.pageSize);
    } catch (e: any) {
      if (id === reqId.current) setError(e?.message || 'Could not load users.');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  // Search is debounced; role/status/page changes load immediately.
  const searchMounted = useRef(false);
  const filtersMounted = useRef(false);
  useEffect(() => {
    const delay = searchMounted.current ? SEARCH_DEBOUNCE_MS : 0;
    searchMounted.current = true;
    const t = setTimeout(() => load(filters), delay);
    return () => clearTimeout(t);
  }, [filters.q]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (filtersMounted.current) load(filters);
    filtersMounted.current = true;
  }, [filters.role, filters.status, filters.page]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => load(filters), [load, filters]);
  const setFilter = (patch: Partial<AdminUserFilters>) => {
    setSelected(new Set());
    setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  };

  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function toggleAll() {
    setSelected((s) => (users.length && users.every((u) => s.has(u.id)) ? new Set() : new Set(users.map((u) => u.id))));
  }

  async function bulk(blocked: boolean) {
    const ids = [...selected];
    if (!ids.length) return;
    try {
      const { results } = await bulkSetBlocked(ids, blocked);
      const failed = results.filter((r) => !r.ok);
      const done = results.length - failed.length;
      setNotice(`${done} user${done !== 1 ? 's' : ''} ${blocked ? 'blocked' : 'unblocked'}${failed.length ? ` · ${failed.length} skipped (${failed[0].error})` : ''}.`);
      setSelected(new Set());
      await reload();
    } catch (e: any) {
      setNotice(e?.message || 'Bulk action failed.');
    }
  }

  return {
    filters, setFilter, users, total, pageSize, loading, error, reload,
    selected, toggle, toggleAll, clearSelection: () => setSelected(new Set()),
    bulkBlock: () => bulk(true), bulkUnblock: () => bulk(false),
    notice, setNotice,
  };
}
