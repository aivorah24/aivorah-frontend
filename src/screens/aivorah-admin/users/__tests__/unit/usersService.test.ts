jest.mock('../../../../../config/platformAdminServerUrl', () => ({ __esModule: true, default: 'http://admin.test' }));
jest.mock('../../../../../services/authHeader', () => ({ authHeader: jest.fn(async () => ({ Authorization: 'Bearer tok' })) }));
import { fetchAdminUsers, updateAdminUser, bulkSetBlocked } from '../../services/usersService';

const ok = (body: any) => ({ ok: true, json: async () => body });

describe('usersService', () => {
  beforeEach(() => { (global as any).fetch = jest.fn(async () => ok({ users: [], total: 0, pageSize: 50 })); });

  test('list builds query string from filters and sends the token', async () => {
    await fetchAdminUsers({ q: ' asha ', role: 'teacher', status: '', page: 2 });
    const [url, init] = (fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://admin.test/admin/users?q=asha&role=teacher&page=2');
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  test('update PATCHes JSON body', async () => {
    await updateAdminUser('u1', { name: 'New' });
    const [url, init] = (fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://admin.test/admin/users/u1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ name: 'New' });
  });

  test('bulk unblock posts ids only; server error message surfaces', async () => {
    await bulkSetBlocked(['a', 'b'], false);
    expect((fetch as jest.Mock).mock.calls[0][0]).toBe('http://admin.test/admin/users/bulk-unblock');
    expect(JSON.parse((fetch as jest.Mock).mock.calls[0][1].body)).toEqual({ ids: ['a', 'b'] });

    (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Cannot block a platform admin' }) });
    await expect(bulkSetBlocked(['a'], true)).rejects.toThrow('Cannot block a platform admin');
  });
});
