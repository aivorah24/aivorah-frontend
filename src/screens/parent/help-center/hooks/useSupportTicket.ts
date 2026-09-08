import { useState } from 'react';
import { submitTicket } from '../services/helpCenterService';

// Confirmation/validation messages are rendered as inline state, not
// Alert.alert() - react-native-web doesn't implement Alert.alert (a real
// bug found during E2E baseline testing: real parents on web never saw
// the "Ticket Submitted!" confirmation at all). Inline state works
// identically on every platform.
export function useSupportTicket(email: string | undefined) {
  const [ticketVisible, setTicketVisible] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState('');
  const [ticketSuccess, setTicketSuccess] = useState('');

  function openTicket() {
    setTicketError('');
    setTicketSuccess('');
    setTicketVisible(true);
  }

  async function handleSubmitTicket() {
    const subject = ticketSubject.trim();
    const message = ticketMessage.trim();
    setTicketError('');
    if (!subject) { setTicketError('Please enter a subject.'); return; }
    if (!message) { setTicketError('Please describe your issue.'); return; }
    setTicketLoading(true);
    try {
      await submitTicket(email || '', subject, message);
      setTicketSubject('');
      setTicketMessage('');
      setTicketSuccess(`We'll respond to ${email || 'your email'} within 24 hours.`);
    } catch (err: any) {
      setTicketError(err?.message || 'Please try again.');
    } finally {
      setTicketLoading(false);
    }
  }

  return {
    ticketVisible, openTicket, closeTicket: () => setTicketVisible(false),
    ticketSubject, setTicketSubject, ticketMessage, setTicketMessage,
    ticketLoading, ticketError, ticketSuccess, handleSubmitTicket,
  };
}
