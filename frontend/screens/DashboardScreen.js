import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { apiRequest, notify } from '../api';
import { avatarPalette, cardStyle, colors, radius, spacing, tierTints, type } from '../theme';

const formatMoney = (n) => Number(n).toLocaleString('en-US');

const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const avatarColors = (name) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return avatarPalette[h % avatarPalette.length];
};

// Map the i-th of n tiers onto the light -> dark teal tints.
const tierTint = (i, n) => tierTints[n >= 3 ? i : n === 2 ? [0, 2][i] : 1];

const webNoOutline = Platform.select({ web: { outlineStyle: 'none' } });

export default function DashboardScreen({ navigation, route }) {
  const token = route.params?.token;
  const insets = useSafeAreaInsets();

  const [employees, setEmployees] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');
  const [adding, setAdding] = useState(false); // true while add/save request is in flight
  const [editingId, setEditingId] = useState(null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // All | Active | On Leave
  const [sortDir, setSortDir] = useState(null); // null | 'asc' | 'desc'

  const [analyzing, setAnalyzing] = useState(false);
  const [clusters, setClusters] = useState(null); // null = not analyzed yet
  const [clusterMessage, setClusterMessage] = useState('');
  const [iterations, setIterations] = useState(null);
  const [expandedTier, setExpandedTier] = useState(null);

  const summary = useMemo(() => {
    const active = employees.filter((e) => e.status === 'Active').length;
    const payroll = employees.reduce((sum, e) => sum + (Number(e.salary) || 0), 0);
    return { total: employees.length, active, onLeave: employees.length - active, payroll };
  }, [employees]);

  const visibleEmployees = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = employees.filter(
      (e) =>
        (statusFilter === 'All' || e.status === statusFilter) &&
        (!q || e.name.toLowerCase().includes(q) || e.position.toLowerCase().includes(q))
    );
    if (sortDir) {
      list = [...list].sort((a, b) => (sortDir === 'asc' ? a.salary - b.salary : b.salary - a.salary));
    }
    return list;
  }, [employees, query, statusFilter, sortDir]);

  const fetchEmployees = useCallback(async () => {
    try {
      const data = await apiRequest('/api/employees', { token });
      setEmployees(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      notify('Error', e.message);
    }
  }, [token]);

  useEffect(() => {
    (async () => {
      setLoadingList(true);
      await fetchEmployees();
      setLoadingList(false);
    })();
  }, [fetchEmployees]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchEmployees();
    } finally {
      setRefreshing(false);
    }
  };

  const resetForm = () => {
    setName('');
    setPosition('');
    setSalary('');
    setEditingId(null);
  };

  const closeForm = () => {
    resetForm();
    setFormOpen(false);
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setName(item.name);
    setPosition(item.position);
    setSalary(String(item.salary));
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    const n = name.trim();
    const p = position.trim();
    const s = salary.trim();
    if (!n || !p || !s) {
      notify('Validation Error', 'Name, position and salary are all required.');
      return;
    }
    const salaryNum = Number(s);
    if (!Number.isFinite(salaryNum) || salaryNum <= 0) {
      notify('Validation Error', 'Salary must be a positive number.');
      return;
    }
    setAdding(true);
    try {
      const body = { name: n, position: p, salary: salaryNum };
      if (editingId) {
        const data = await apiRequest(`/api/employees/${editingId}`, { method: 'PUT', token, body });
        setEmployees((prev) => prev.map((e) => (e.id === editingId ? data.data : e)));
      } else {
        const data = await apiRequest('/api/employees', { method: 'POST', token, body });
        setEmployees((prev) => [...prev, data.data]);
      }
      closeForm();
      setClusters(null); // previous analysis is now stale
    } catch (e) {
      notify('Error', e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const data = await apiRequest(`/api/employees/${id}/status`, { method: 'PUT', token });
      setEmployees((prev) => prev.map((e) => (e.id === id ? data.data : e)));
    } catch (e) {
      notify('Error', e.message);
    }
  };

  const deleteEmployee = async (id) => {
    try {
      await apiRequest(`/api/employees/${id}`, { method: 'DELETE', token });
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      setClusters(null);
    } catch (e) {
      notify('Error', e.message);
    }
  };

  const handleDelete = (id) => {
    if (Platform.OS === 'web') {
      // Alert.alert buttons don't work on Expo web
      if (window.confirm('Confirm Delete\n\nAre you sure?')) deleteEmployee(id);
      return;
    }
    Alert.alert('Confirm Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEmployee(id) },
    ]);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const data = await apiRequest('/api/employees/salary-clusters', { token });
      setClusters(Array.isArray(data.clusters) ? data.clusters : []);
      setClusterMessage(data.message || '');
      setIterations(typeof data.iterations === 'number' ? data.iterations : null);
      setExpandedTier(null);
    } catch (e) {
      notify('Analysis Failed', e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLogout = () => navigation.replace('Login');

  const cycleSort = () => setSortDir((d) => (d === null ? 'asc' : d === 'asc' ? 'desc' : null));
  const sortIcon = sortDir === 'asc' ? 'arrow-up' : sortDir === 'desc' ? 'arrow-down' : 'sliders';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const maxCentroid = clusters && clusters.length ? Math.max(...clusters.map((c) => c.centroid), 1) : 1;

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.flexShrink}>
          <Text style={type.title}>Good morning, Admin</Text>
          <Text style={styles.date}>{today}</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleLogout}
          accessibilityLabel="Logout"
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={20} color={colors.ink} />
        </TouchableOpacity>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Total monthly payroll</Text>
        <Text style={styles.heroValue}>{formatMoney(summary.payroll)}</Text>
        <View style={styles.heroStats}>
          {[
            ['Total', summary.total],
            ['Active', summary.active],
            ['On Leave', summary.onLeave],
          ].map(([label, value]) => (
            <View key={label} style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{value}</Text>
              <Text style={styles.heroStatLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Salary insights */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Feather name="bar-chart-2" size={18} color={colors.accent} />
          <Text style={type.section}>Salary insights</Text>
        </View>
        <TouchableOpacity
          style={[styles.primaryBtn, analyzing && styles.disabled]}
          onPress={handleAnalyze}
          disabled={analyzing}
          activeOpacity={0.85}
        >
          {analyzing ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.primaryBtnText}>Analyze Salary Structure</Text>
          )}
        </TouchableOpacity>

        {clusters !== null &&
          (clusters.length === 0 ? (
            <Text style={styles.emptyInline}>{clusterMessage || 'No salary data to analyze.'}</Text>
          ) : (
            <View style={styles.tiers}>
              {clusters.map((c, i) => {
                const tint = tierTint(i, clusters.length);
                const expanded = expandedTier === c.group;
                return (
                  <TouchableOpacity
                    key={c.group}
                    style={[styles.tierCard, { backgroundColor: tint.bg, borderColor: tint.border }]}
                    activeOpacity={0.85}
                    onPress={() => setExpandedTier(expanded ? null : c.group)}
                  >
                    <View style={styles.tierTop}>
                      <Text style={[styles.tierName, { color: tint.text }]}>{c.group}</Text>
                      <Text style={[styles.tierCount, { color: tint.text }]}>
                        {c.count} {c.count === 1 ? 'employee' : 'employees'}
                      </Text>
                      <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={tint.text} />
                    </View>
                    <Text style={[styles.tierAvg, { color: tint.text }]}>{formatMoney(c.centroid)}</Text>
                    <Text style={[styles.tierSub, { color: tint.text }]}>Average salary</Text>
                    <Text style={[styles.tierRange, { color: tint.text }]}>
                      Range {c.min == null ? '-' : formatMoney(c.min)} – {c.max == null ? '-' : formatMoney(c.max)}
                    </Text>
                    <View style={[styles.barTrack, { backgroundColor: tint.track }]}>
                      <View
                        style={[
                          styles.barFill,
                          { backgroundColor: tint.fill, width: `${(c.centroid / maxCentroid) * 100}%` },
                        ]}
                      />
                    </View>
                    {expanded && (
                      <View style={[styles.memberList, { borderTopColor: tint.track }]}>
                        {(c.members || []).length === 0 ? (
                          <Text style={[styles.memberName, { color: tint.text }]}>No members</Text>
                        ) : (
                          c.members.map((m, idx) => (
                            <Text key={`${m}-${idx}`} style={[styles.memberName, { color: tint.text }]}>
                              • {m}
                            </Text>
                          ))
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
              {iterations !== null && (
                <Text style={styles.iterText}>K-Means converged in {iterations} iteration(s)</Text>
              )}
            </View>
          ))}
      </View>

      {/* Search + filters */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, webNoOutline]}
          placeholder="Search by name or position"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <View style={styles.filterRow}>
        <View style={styles.segment}>
          {['All', 'Active', 'On Leave'].map((f) => {
            const on = statusFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.segmentItem, on && styles.segmentItemOn]}
                onPress={() => setStatusFilter(f)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={[styles.sortBtn, sortDir && styles.sortBtnOn]}
          onPress={cycleSort}
          accessibilityLabel={`Sort by salary: ${sortDir || 'off'}`}
          activeOpacity={0.8}
        >
          <Feather name={sortIcon} size={18} color={sortDir ? colors.onAccent : colors.ink} />
        </TouchableOpacity>
      </View>

      <Text style={[type.section, styles.listLabel]}>
        Employees ({visibleEmployees.length}/{employees.length})
      </Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const active = item.status === 'Active';
    const [avBg, avFg] = avatarColors(item.name);
    return (
      <View style={styles.row}>
        <View style={styles.rowTop}>
          <View style={[styles.avatar, { backgroundColor: avBg }]}>
            <Text style={[styles.avatarText, { color: avFg }]}>{initials(item.name)}</Text>
          </View>
          <View style={styles.rowMid}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.position} numberOfLines={1}>
              {item.position}
            </Text>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.salary}>{formatMoney(item.salary)}</Text>
            <View style={[styles.pill, { backgroundColor: active ? colors.activeBg : colors.leaveBg }]}>
              <Text style={[styles.pillText, { color: active ? colors.activeText : colors.leaveText }]}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => handleToggle(item.id)} activeOpacity={0.6}>
            <Feather name="refresh-cw" size={14} color={colors.accent} />
            <Text style={styles.ghostText} numberOfLines={1}>
              Toggle Status
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => startEdit(item)} activeOpacity={0.6}>
            <Feather name="edit-2" size={14} color={colors.accent} />
            <Text style={styles.ghostText} numberOfLines={1}>
              Edit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => handleDelete(item.id)} activeOpacity={0.6}>
            <Feather name="trash-2" size={14} color={colors.danger} />
            <Text style={[styles.ghostText, { color: colors.danger }]} numberOfLines={1}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loadingList ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 64 }} />
        ) : (
          <FlatList
            data={visibleEmployees}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={renderHeader()}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Feather name="users" size={32} color={colors.muted} />
                <Text style={styles.emptyTitle}>No employees found</Text>
              </View>
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Floating add button */}
        <TouchableOpacity
          style={[styles.fab, { bottom: Math.max(insets.bottom, spacing.md) + spacing.sm }]}
          onPress={openAdd}
          accessibilityLabel="Add Employee"
          activeOpacity={0.85}
        >
          <Feather name="plus" size={28} color={colors.onAccent} />
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* Add / Edit bottom sheet */}
      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={closeForm}>
        <KeyboardAvoidingView
          style={styles.sheetWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.overlay} onPress={adding ? undefined : closeForm} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm }]}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{editingId ? 'Edit Employee' : 'Add Employee'}</Text>

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={[styles.field, webNoOutline]}
              placeholder="Name"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
            />
            <Text style={styles.fieldLabel}>Position</Text>
            <TextInput
              style={[styles.field, webNoOutline]}
              placeholder="Position"
              placeholderTextColor={colors.muted}
              value={position}
              onChangeText={setPosition}
            />
            <Text style={styles.fieldLabel}>Salary</Text>
            <TextInput
              style={[styles.field, webNoOutline]}
              placeholder="Salary"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              value={salary}
              onChangeText={setSalary}
            />

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={closeForm}
                disabled={adding}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, styles.saveBtn, adding && styles.disabled]}
                onPress={handleSubmit}
                disabled={adding}
                activeOpacity={0.85}
              >
                {adding ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <Text style={styles.primaryBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  list: { padding: spacing.md, paddingBottom: 112, width: '100%', maxWidth: 720, alignSelf: 'center' },

  // header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  date: { ...type.body, color: colors.muted, marginTop: spacing.xs },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // hero
  hero: { backgroundColor: colors.accent, borderRadius: radius.card, padding: spacing.lg, marginBottom: spacing.md },
  heroLabel: { ...type.section, color: colors.onAccentMuted },
  heroValue: { ...type.number, fontSize: 40, color: colors.onAccent, marginTop: spacing.sm },
  heroStats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  heroStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.control,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.sm + 4,
  },
  heroStatValue: { ...type.number, fontSize: 22, color: colors.onAccent },
  heroStatLabel: { fontSize: 12, color: colors.onAccentMuted, marginTop: 2 },

  // generic card + buttons
  card: { ...cardStyle, padding: spacing.md, marginBottom: spacing.md },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  primaryBtn: {
    backgroundColor: colors.accent,
    height: 48,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: colors.onAccent, fontSize: 15, fontWeight: '600' },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  secondaryBtnText: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 1 },
  disabled: { opacity: 0.6 },

  // tiers
  tiers: { marginTop: spacing.md, gap: spacing.sm + 4 },
  tierCard: { borderRadius: radius.card, borderWidth: 1, padding: spacing.md },
  tierTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tierName: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, flex: 1 },
  tierCount: { fontSize: 13, opacity: 0.85 },
  tierAvg: { ...type.number, fontSize: 28, marginTop: spacing.sm },
  tierSub: { fontSize: 12, opacity: 0.8 },
  tierRange: { ...type.body, fontSize: 14, marginTop: spacing.sm, fontVariant: ['tabular-nums'] },
  barTrack: { height: 8, borderRadius: 4, marginTop: spacing.sm + 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  memberList: { marginTop: spacing.sm + 4, paddingTop: spacing.sm, borderTopWidth: 1 },
  memberName: { fontSize: 14, marginTop: 2 },
  iterText: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  emptyInline: { ...type.body, color: colors.muted, textAlign: 'center', marginTop: spacing.md },

  // search + filters
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...cardStyle,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.sm + 4,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink, height: '100%' },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  segment: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#ECE8E1',
    borderRadius: radius.control,
    padding: 4,
  },
  segmentItem: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  segmentItemOn: { backgroundColor: colors.accent },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  segmentTextOn: { color: colors.onAccent },
  sortBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortBtnOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  listLabel: { marginTop: spacing.lg, marginBottom: spacing.sm + 4 },

  // employee rows
  row: { ...cardStyle, padding: spacing.md, marginBottom: spacing.sm + 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700' },
  rowMid: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.ink },
  position: { fontSize: 14, color: colors.muted, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  salary: { ...type.number, fontSize: 16, color: colors.ink },
  pill: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.pill },
  pillText: { fontSize: 12, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ghostBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  ghostText: { fontSize: 13, fontWeight: '600', color: colors.accent, flexShrink: 1 },

  // empty state
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyTitle: { ...type.body, color: colors.muted, fontWeight: '600' },

  // FAB
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // bottom sheet
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: spacing.md },
  fieldLabel: { ...type.section, marginBottom: 6 },
  field: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.bg,
    marginBottom: spacing.md,
  },
  sheetActions: { flexDirection: 'row', gap: spacing.sm + 4, marginTop: spacing.sm },
});
