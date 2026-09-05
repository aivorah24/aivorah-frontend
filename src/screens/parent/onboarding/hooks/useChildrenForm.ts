import { useState } from 'react';
import { type ChildEntry, emptyChild } from '../types';

// The "Your Children" card's list state - add/remove/switch between
// multiple children, and edit whichever one is currently active.
export function useChildrenForm() {
  const [children, setChildren] = useState<ChildEntry[]>([emptyChild()]);
  const [activeChildIdx, setActiveChildIdx] = useState(0);
  const [showChildPassword, setShowChildPassword] = useState(false);
  const [schoolLocating, setSchoolLocating] = useState(false);

  const activeChild = children[activeChildIdx] || emptyChild();

  const updateChild = (field: keyof ChildEntry, value: string) => {
    setChildren((prev) => prev.map((c, i) => (i === activeChildIdx ? { ...c, [field]: value } : c)));
  };

  const addAnotherChild = () => {
    const newIdx = children.length;
    setChildren((prev) => [...prev, emptyChild()]);
    setActiveChildIdx(newIdx);
    setShowChildPassword(false);
  };

  const removeChild = (idx: number) => {
    if (children.length <= 1) return;
    setChildren((prev) => prev.filter((_, i) => i !== idx));
    setActiveChildIdx((prev) => Math.min(prev, children.length - 2));
  };

  const selectChild = (idx: number) => {
    setActiveChildIdx(idx);
    setShowChildPassword(false);
  };

  return {
    children, setChildren,
    activeChildIdx, activeChild,
    updateChild, addAnotherChild, removeChild, selectChild,
    showChildPassword, setShowChildPassword,
    schoolLocating, setSchoolLocating,
  };
}
