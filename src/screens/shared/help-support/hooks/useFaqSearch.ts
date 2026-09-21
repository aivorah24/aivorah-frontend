import { useState } from 'react';
import type { Faq } from '../types';

export function useFaqSearch(faqs: Faq[]) {
  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const filteredFaqs = faqs.filter((f) =>
    search === ''
    || f.q.toLowerCase().includes(search.toLowerCase())
    || f.a.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleFaq = (i: number) => setOpenFaq((prev) => (prev === i ? null : i));

  return { search, setSearch, openFaq, toggleFaq, filteredFaqs };
}
