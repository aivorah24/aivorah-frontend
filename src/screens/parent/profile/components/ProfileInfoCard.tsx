import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

function InfoRow({ icon, label, value, styles, isLast }: { icon: string; label: string; value: string; styles: any; isLast?: boolean }) {
  return (
    <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
      <View style={styles.infoRowLeft}>
        <Feather name={icon as any} size={14} color="#BAA467" style={{ opacity: 0.7 }} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ProfileInfoCard({
  name, email, phone, city, colors, s,
}: {
  name: string; email: string; phone: string; city: string; colors: any; s: any;
}) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Feather name="user" size={16} color={colors.accentYellow} />
        <Text style={s.cardTitle}>Profile Information</Text>
      </View>
      <InfoRow icon="user"     label="Name"            value={name || '—'}  styles={s} />
      <InfoRow icon="mail"     label="Email Address"   value={email || '—'} styles={s} />
      <InfoRow icon="phone"    label="Contact Number"  value={phone || '—'} styles={s} />
      <InfoRow icon="map-pin"  label="City"            value={city || '—'}  styles={s} isLast />
    </View>
  );
}
