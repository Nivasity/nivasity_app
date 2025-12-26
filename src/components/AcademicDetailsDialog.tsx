import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { TextInput as PaperTextInput } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import AppText from './AppText';
import Button from './Button';
import Input from './Input';
import OptionPickerDialog from './OptionPickerDialog';
import { getAdmissionSessions } from '../config/options';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { referenceAPI } from '../services/api';

const toSessionLabel = (value?: string) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  if (/^\d{4}\/\d{4}$/.test(trimmed)) return trimmed;
  if (/^\d{4}$/.test(trimmed)) {
    const y = Number(trimmed);
    return Number.isFinite(y) ? `${y}/${y + 1}` : trimmed;
  }
  return trimmed;
};

const toAdmissionYearValue = (sessionOrYear: string) => {
  const trimmed = (sessionOrYear || '').trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^(\d{4})\/\d{4}$/);
  if (match) return match[1];
  return trimmed;
};

const AcademicDetailsDialog = () => {
  const { colors, isDark } = useTheme();
  const appMessage = useAppMessage();
  const { user, needsAcademicInfo, updateAcademicInfo, dismissAcademicPrompt } = useAuth();

  const admissionSessions = useMemo(() => getAdmissionSessions(2019), []);

  const [deptOpen, setDeptOpen] = useState(false);
  const [admOpen, setAdmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);

  const [form, setForm] = useState<{
    deptId: number | null;
    deptName: string;
    admissionYear: string;
    matricNo: string;
  }>({ deptId: null, deptName: '', admissionYear: '', matricNo: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  const visible = needsAcademicInfo;

  useEffect(() => {
    if (!visible) return;
    setForm({
      deptId: user?.deptId != null ? Number(user.deptId) : null,
      deptName: user?.department || '',
      admissionYear: toSessionLabel(user?.admissionYear),
      matricNo: user?.matricNumber || '',
    });
    setErrors({});
  }, [visible, user?.deptId, user?.department, user?.admissionYear, user?.matricNumber]);

  useEffect(() => {
    if (!visible) return;
    const rawSchoolId = user?.schoolId;
    const schoolId = rawSchoolId != null ? Number(rawSchoolId) : NaN;
    if (!Number.isFinite(schoolId)) return;

    let mounted = true;
    (async () => {
      setDepartmentsLoading(true);
      try {
        const data = await referenceAPI.getDepartments({ schoolId, page: 1, limit: 100 });
        if (!mounted) return;
        setDepartments((data.departments || []).map((d) => ({ id: d.id, name: d.name })));
      } catch (error: any) {
        if (!mounted) return;
        setDepartments([]);
        appMessage.toast({
          status: 'failed',
          message: error?.response?.data?.message || error?.message || 'Could not load departments',
        });
      } finally {
        if (mounted) setDepartmentsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [visible, user?.schoolId, appMessage]);

  const departmentNames = useMemo(() => departments.map((d) => d.name), [departments]);

  const validate = () => {
    const next: typeof errors = {};
    if (!form.deptId) next.deptId = 'Select your department';
    if (!form.admissionYear) next.admissionYear = 'Select admission year';
    if (!form.matricNo.trim()) next.matricNo = 'Matric number is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await updateAcademicInfo({
        deptId: form.deptId as number,
        matricNo: form.matricNo.trim(),
        admissionYear: toAdmissionYearValue(form.admissionYear),
      });
      appMessage.toast({ status: 'success', message: 'Academic info updated.' });
    } catch (error: any) {
      appMessage.alert({
        title: 'Error',
        message: error?.response?.data?.message || error?.message || 'Failed to update academic info',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={dismissAcademicPrompt}
      >
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={dismissAcademicPrompt}>
            <BlurView intensity={28} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.18)' },
              ]}
            />
          </Pressable>

          <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText style={[styles.title, { color: colors.text }]}>Complete your academic profile</AppText>
            <AppText style={[styles.subtitle, { color: colors.textMuted }]}>
              Add your department, matric number, and admission year to personalize your experience.
            </AppText>

            <TouchableOpacity
              onPress={() => setAdmOpen(true)}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="Select admission year"
            >
              <View pointerEvents="none">
                <Input
                  label="Admission Year"
                  value={form.admissionYear}
                  placeholder="Select session"
                  editable={false}
                  errorText={errors.admissionYear}
                  right={<PaperTextInput.Icon icon="chevron-down" color={colors.textMuted} />}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (!departmentsLoading && departmentNames.length > 0) setDeptOpen(true);
                else
                  appMessage.toast({
                    status: departmentsLoading ? 'info' : 'failed',
                    message: departmentsLoading ? 'Loading departments...' : 'No departments found',
                  });
              }}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="Select department"
            >
              <View pointerEvents="none">
                <Input
                  label="Department"
                  value={form.deptName}
                  placeholder="Select your department"
                  editable={false}
                  errorText={errors.deptId}
                  right={<PaperTextInput.Icon icon="chevron-down" color={colors.textMuted} />}
                />
              </View>
            </TouchableOpacity>

            <Input
              label="Matric Number"
              placeholder="e.g. CSC/22/1234"
              value={form.matricNo}
              onChangeText={(text) => setForm((s) => ({ ...s, matricNo: text }))}
              errorText={errors.matricNo}
              autoCapitalize="characters"
            />

            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={dismissAcademicPrompt} activeOpacity={0.85}>
                <AppText style={[styles.actionLink, { color: colors.textMuted }]}>Not now</AppText>
              </TouchableOpacity>
              <Button title={saving ? 'Saving...' : 'Save'} onPress={handleSave} disabled={saving} />
            </View>
          </View>
        </View>
      </Modal>

      <OptionPickerDialog
        visible={admOpen}
        title="Select admission session"
        searchPlaceholder="Search admission session..."
        options={admissionSessions}
        selected={form.admissionYear}
        onClose={() => setAdmOpen(false)}
        onSelect={(admissionYear) => setForm((s) => ({ ...s, admissionYear }))}
      />

      <OptionPickerDialog
        visible={deptOpen}
        title="Select department"
        searchPlaceholder="Search department..."
        options={departmentNames}
        selected={form.deptName}
        loading={departmentsLoading}
        onClose={() => setDeptOpen(false)}
        onSelect={(deptName) => {
          const match = departments.find((d) => d.name === deptName);
          setForm((s) => ({ ...s, deptName, deptId: match?.id ?? null }));
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 14,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
  },
  actionLink: {
    fontSize: 14,
    fontWeight: '800',
  },
});

export default AcademicDetailsDialog;
