import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../common/Header';
import { apiService as rawApi } from '../../services/api';
const api: any = rawApi;

const ORANGE = '#d97700';
const BG = '#f7f7f7';
const CARD = '#ffffff';
const TEXT = '#111';
const SUB  = '#666';

type RouteParams = { id?: string|number; incident?: any };
type Props = { route: { params?: RouteParams }, navigation: any };

export default function IncidentDetails({ route, navigation }: Props) {
  const { id, incident: fromRoute } = route.params || {};
  const [incident, setIncident] = useState<any | null>(fromRoute || null);
  const [loading, setLoading] = useState<boolean>(!fromRoute);

  async function fetchByIdSafe(theId: string|number) {
    if (api.getIncident) {
      try { const res = await api.getIncident(theId); return res?.incident ?? res; } catch {}
    }
    if (api.getAssignedIncidents) {
      try {
        const res = await api.getAssignedIncidents();
        const found = res?.incidents?.find((x: any) => String(x.id) === String(theId));
        if (found) return found;
      } catch {}
    }
    if (api.fetchMyReports) {
      try {
        const list = await api.fetchMyReports();
        const found = list?.find?.((x: any) => String(x.id) === String(theId));
        if (found) return found;
      } catch {}
    }
    return null;
  }

  useEffect(() => {
    (async () => {
      if (fromRoute) return;
      if (id == null) return;
      setLoading(true);
      const data = await fetchByIdSafe(id);
      setIncident(data);
      setLoading(false);
    })();
  }, [id, fromRoute]);

  async function updateStatus(next: string) {
    if (!incident?.id) return;
    try {
      await api.updateIncident?.(incident.id, { status: next });
      Alert.alert('Updated', `Status set to ${next}`);
      const fresh = await fetchByIdSafe(incident.id);
      setIncident(fresh || { ...incident, status: next });
    } catch (e: any) {
      Alert.alert('Update failed', e?.message || 'Unknown error');
    }
  }

  if (loading) {
    return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><Text>Loading incident…</Text></View>;
  }
  if (!incident) {
    return <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding:16 }}>
      <Text>Incident not found.</Text>
    </View>;
  }

  const meta = [
    ['Type', incident.type],
    ['Severity', incident.severity ?? '-'],
    ['Status', incident.status],
    ['Address', incident.location?.address ?? '-'],
    ['Reported', incident.createdAt ? new Date(incident.createdAt).toLocaleString() : '-'],
  ];

  return (
    <View style={{ flex:1, backgroundColor: BG }}>
      <Header title={`Incident #${incident.id}`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding:12 }}>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flexDirection:'row', alignItems:'center' }}>
              <Ionicons name="alert-circle" size={20} color={ORANGE} />
              <Text style={styles.title}>Details</Text>
            </View>
            <View style={styles.badge}><Text style={styles.badgeText}>{incident.status}</Text></View>
          </View>

          <Text style={styles.desc}>{incident.description || 'No description provided.'}</Text>

          <View style={{ marginTop:10 }}>
            {meta.map(([k,v])=>(
              <View key={k as string} style={styles.metaRow}>
                <Text style={styles.metaKey}>{k}</Text>
                <Text style={styles.metaVal}>{String(v ?? '-')}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action buttons (server RBAC still enforces perms) */}
        <View style={{ flexDirection:'row', gap:8, marginTop:12 }}>
          {['active','responding','resolved'].map(s => (
            <TouchableOpacity key={s} onPress={() => updateStatus(s)} style={styles.btn}>
              <Ionicons name={s==='resolved'?'shield-checkmark': s==='responding'?'flash':'checkmark-circle'} size={16} color="#fff" />
              <Text style={styles.btnText}>{s === 'responding' ? 'Responding' : s[0].toUpperCase()+s.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: CARD, borderRadius:12, padding:16 },
  rowBetween: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  title: { marginLeft:6, fontSize:18, fontWeight:'700', color:TEXT },
  badge: { backgroundColor: '#ffe7cc', paddingHorizontal:10, paddingVertical:4, borderRadius:12 },
  badgeText: { color: ORANGE, fontSize:12, fontWeight:'700' },
  desc: { marginTop:10, color:TEXT, fontSize:14 },
  metaRow: { flexDirection:'row', marginTop:6 },
  metaKey: { width:90, color:SUB, fontSize:12 },
  metaVal: { flex:1, color:TEXT, fontSize:12, fontWeight:'600' },
  btn: { flexDirection:'row', alignItems:'center', gap:6, backgroundColor: ORANGE, paddingHorizontal:14, paddingVertical:10, borderRadius:10 },
  btnText: { color:'#fff', fontWeight:'700', fontSize:14 },
});
