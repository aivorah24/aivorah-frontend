import { useState } from 'react';
import { Alert } from 'react-native';
import HELP_SERVICE_URL from '../../../../config/helpServiceUrl';

export function useSupportTicket(userEmail: string | undefined) {
  const [ticketVisible, setTicketVisible] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketLoading, setTicketLoading] = useState(false);

  async function handleSubmitTicket() {
    const subject = ticketSubject.trim();
    const message = ticketMessage.trim();
    if (!subject) { Alert.alert('Required', 'Please enter a subject.'); return; }
    if (!message) { Alert.alert('Required', 'Please describe your issue.'); return; }
    setTicketLoading(true);
    try {
      const res = await fetch(`${HELP_SERVICE_URL}/help/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail || '', subject, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not submit ticket.');
      setTicketVisible(false);
      setTicketSubject(''); setTicketMessage('');
      Alert.alert('Ticket Submitted', `We'll respond to ${userEmail || 'your email'} within 24 hours.`, [{ text: 'OK' }]);
    } catch (err: any) {
      Alert.alert('Submission Failed', err?.message || 'Could not submit ticket. Please try again.');
    } finally {
      setTicketLoading(false);
    }
  }

  return {
    ticketVisible, setTicketVisible,
    ticketSubject, setTicketSubject,
    ticketMessage, setTicketMessage,
    ticketLoading,
    handleSubmitTicket,
  };
}
