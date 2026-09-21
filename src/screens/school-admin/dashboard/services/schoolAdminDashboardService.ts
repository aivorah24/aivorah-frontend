import SCHOOL_ADMIN_SERVER_URL from '../../../../config/schoolAdminServerUrl';
import { Overview, AccessRequest } from '../types';

export const fetchOverview = async (userEmail: string): Promise<Overview> => {
  const url = `${SCHOOL_ADMIN_SERVER_URL}/school-admin/overview?adminEmail=${encodeURIComponent(userEmail)}`;
  const res = await fetch(url);
  
  if (!res.ok) {
    let errorMsg = 'Failed to load dashboard data';
    try {
      const errData = await res.json();
      errorMsg = errData.error || errorMsg;
    } catch (e) {
      // Ignore JSON parse errors
    }
    throw new Error(errorMsg);
  }
  
  return res.json();
};

export const fetchAccessRequests = async (userEmail: string): Promise<AccessRequest[]> => {
  const url = `${SCHOOL_ADMIN_SERVER_URL}/school-admin/access-requests?adminEmail=${encodeURIComponent(userEmail)}`;
  const res = await fetch(url);
  
  if (!res.ok) {
    let errorMsg = 'Failed to load access requests';
    try {
      const errData = await res.json();
      errorMsg = errData.error || errorMsg;
    } catch (e) {
      // Ignore JSON parse errors
    }
    throw new Error(errorMsg);
  }
  
  return res.json();
};

export const actionAccessRequest = async (id: string, action: 'approve' | 'reject', userEmail: string): Promise<void> => {
  const res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/access-requests/${id}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminEmail: userEmail }),
  });
  
  if (!res.ok) {
    throw new Error('Failed to action request');
  }
};
