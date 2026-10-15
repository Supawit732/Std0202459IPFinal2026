import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiRequest, notify } from '../api';

const formatMoney = (n) => Number(n).toLocaleString('en-US');

export default function DashboardScreen({ navigation, route }) {
  const token = route.params?.token;

  const [employees, setEmployees] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');
  const [adding, setAdding] = useState(false); // true while add/save request is in flight
  const [editingId, setEditingId] = useState(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [clusters, setClusters] = useState(null); // null = not analyzed yet
  const [clusterMessage, setClusterMessage] = useState('');

  const summary = useMemo(() => {
    const active = employees.filter((e) => e.status === 'Active').length;
    const payroll = employees.reduce((sum, e) => sum + (Number(e.salary) || 0), 0);
    return { total: employees.length, active, onLeave: employees.length - active, payroll };
  }, [employees]);

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

  const startEdit = (item) => {
    setEditingId(item.id);
    setName(item.name);
    setPosition(item.position);
    setSalary(String(item.salary));
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
      resetForm();
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
      if (editingId === id) resetForm();
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
    } catch (e) {
      notify('Analysis Failed', e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLogout = () => navigation.replace('Login');

  const renderHeader = () => (
    <View>
      <View style={styles.topRow}>
        <Text style={styles.heading}>Employees ({employees.length})</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryValue}>{summary.total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={[styles.summaryValue, { color: '#16a34a' }]}>{summary.active}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>{summary.onLeave}</Text>
          <Text style={styles.summaryLabel}>On Leave</Text>
        </View>
      </View>
      <View style={styles.payrollBox}>
        <Text style={styles.summaryLabel}>Total monthly payroll</Text>
        <Text style={styles.payrollValue}>{formatMoney(summary.payroll)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{editingId ? 'Edit Employee' : 'Add Employee'}</Text>
        <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
        <TextInput
          style={styles.input}
          placeholder="Position"
          value={position}
          onChangeText={setPosition}
        />
        <TextInput
          style={styles.input}
          placeholder="Salary"
          keyboardType="numeric"
          value={salary}
          onChangeText={setSalary}
        />
        <TouchableOpacity
          style={[styles.primaryBtn, adding && styles.disabled]}
          onPress={handleSubmit}
          disabled={adding}
        >
          {adding ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>{editingId ? 'Save' : 'Add Employee'}</Text>
          )}
        </TouchableOpacity>
        {editingId && (
          <TouchableOpacity style={styles.cancelBtn} onPress={resetForm} disabled={adding}>
            <Text style={styles.btnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.analyzeBtn, analyzing && styles.disabled]}
        onPress={handleAnalyze}
        disabled={analyzing}
      >
        {analyzing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Analyze Salary Structure</Text>
        )}
      </TouchableOpacity>

      {clusters !== null && (
        <View style={styles.clusterWrap}>
          {clusters.length === 0 ? (
            <Text style={styles.empty}>{clusterMessage || 'No salary data to analyze.'}</Text>
          ) : (
            clusters.map((c) => (
              <View key={c.group} style={styles.clusterCard}>
                <Text style={styles.clusterTitle}>{c.group}</Text>
                <Text style={styles.clusterLine}>Employees: {c.count}</Text>
                <Text style={styles.clusterLine}>Average salary: {formatMoney(c.centroid)}</Text>
                <Text style={styles.clusterLine}>
                  Range: {c.min == null ? '-' : formatMoney(c.min)} – {c.max == null ? '-' : formatMoney(c.max)}
                </Text>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }) => {
    const active = item.status === 'Active';
    return (
      <View style={styles.card}>
        <View style={styles.itemHeader}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={[styles.badge, { backgroundColor: active ? '#16a34a' : '#f59e0b' }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.position}>{item.position}</Text>
        <Text style={styles.salary}>{formatMoney(item.salary)}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.toggleBtn} onPress={() => handleToggle(item.id)}>
            <Text style={styles.btnText}>Toggle Status</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBtn} onPress={() => startEdit(item)}>
            <Text style={styles.btnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
            <Text style={styles.btnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {loadingList ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={<Text style={styles.empty}>No employees found.</Text>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fa' },
  list: { padding: 16, paddingBottom: 40 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  heading: { fontSize: 20, fontWeight: '700', color: '#1f2d3d' },
  logoutBtn: { backgroundColor: '#6b7280', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  logoutText: { color: '#fff', fontWeight: '600' },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  summaryBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e3e8ef',
  },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#1f2d3d' },
  summaryLabel: { fontSize: 12, color: '#6b7280' },
  payrollBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e3e8ef',
    alignItems: 'center',
  },
  payrollValue: { fontSize: 22, fontWeight: '700', color: '#1d4ed8' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e3e8ef',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, color: '#1f2d3d' },
  input: {
    borderWidth: 1,
    borderColor: '#d0d7e2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  primaryBtn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  analyzeBtn: { backgroundColor: '#7c3aed', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12, minHeight: 48, justifyContent: 'center' },
  disabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 17, fontWeight: '700', color: '#1f2d3d', flexShrink: 1 },
  badge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  position: { color: '#4b5563', marginTop: 4 },
  salary: { fontSize: 16, fontWeight: '600', marginTop: 4, color: '#111827' },
  actions: { flexDirection: 'row', marginTop: 10, gap: 8 },
  toggleBtn: { flex: 1, backgroundColor: '#0891b2', padding: 10, borderRadius: 8, alignItems: 'center' },
  editBtn: { flex: 1, backgroundColor: '#475569', padding: 10, borderRadius: 8, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#6b7280', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  deleteBtn: { flex: 1, backgroundColor: '#dc2626', padding: 10, borderRadius: 8, alignItems: 'center' },
  clusterWrap: { marginBottom: 4 },
  clusterCard: {
    backgroundColor: '#f5f3ff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  clusterTitle: { fontSize: 16, fontWeight: '700', color: '#5b21b6', marginBottom: 4 },
  clusterLine: { color: '#374151', marginTop: 2 },
  empty: { textAlign: 'center', color: '#6b7280', marginVertical: 16 },
});
