import { useState } from 'react';
import { FAQS } from '../constants';

export function useFaqSearch() {
  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const filteredFaqs = FAQS.filter((f) =>
    search === ''
    || f.q.toLowerCase().includes(search.toLowerCase())
    || f.a.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleFaq = (i: number) => setOpenFaq((prev) => (prev === i ? null : i));

  return { search, setSearch, openFaq, toggleFaq, filteredFaqs };
}
