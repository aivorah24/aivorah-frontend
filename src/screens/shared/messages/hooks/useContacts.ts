import { useState } from 'react';
import type { Contact } from '../types';
import { fetchContacts } from '../services/messagesService';

export function useContacts(userEmail: string, userRole: string) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  async function loadContacts() {
    setLoadingContacts(true);
    try {
      const res = await fetchContacts(userEmail, userRole);
      const data = await res.json();
      if (Array.isArray(data)) setContacts(data);
    } catch {}
    finally { setLoadingContacts(false); }
  }

  return { contacts, loadingContacts, loadContacts };
}
