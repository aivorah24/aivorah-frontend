import React from 'react';
import { useDigest } from '../hooks/useDigest';
import DigestContent from './DigestContent';

// The World & You → "Current Affairs" tab. Loads only when the tab is opened.
export default function CurrentAffairsTab({ navigation }: { navigation: any }) {
  const state = useDigest();
  return <DigestContent state={state} navigation={navigation} showDateRow={false} />;
}
