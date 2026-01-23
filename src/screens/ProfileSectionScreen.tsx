import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextInput as PaperTextInput } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import AppIcon from '../components/AppIcon';
import Button from '../components/Button';
import Input from '../components/Input';
import OptionPickerDialog from '../components/OptionPickerDialog';
import PhoneField from '../components/PhoneField';
import { getAdmissionSessions } from '../config/options';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { authAPI, profileAPI, referenceAPI } from '../services/api';
import { User } from '../types';
import { normalizePhone } from '../utils/phone';

type ProfileSection = 'account' | 'academic' | 'security' | 'myAccount';

type ProfileSectionScreenProps = {
  navigation: any;
  route: any;
};

const getSectionTitle = (section: ProfileSection) => {
  switch (section) {
    case 'academic':
      return 'Academic info';
    case 'security':
      return 'Security';
    case 'myAccount':
      return 'My Account';
    default:
      return 'Account settings';
  }
};

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

const ProfileSectionScreen: React.FC<ProfileSectionScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const appMessage = useAppMessage();
  const { user, updateUser, logout } = useAuth();
  const section = (route?.params?.section as ProfileSection | undefined) ?? 'account';
  const title = useMemo(() => getSectionTitle(section), [section]);

  const [saving, setSaving] = useState(false);
  const [editDialog, setEditDialog] = useState<null | 'profile' | 'academic'>(null);

  const [accountData, setAccountData] = useState<Pick<User, 'firstName' | 'lastName' | 'email'>>(() => {
    const derived = (user?.name || '').trim().split(/\s+/).filter(Boolean);
    const fallbackFirstName = derived[0] || '';
    const fallbackLastName = derived.slice(1).join(' ');
    return {
      firstName: user?.firstName || fallbackFirstName,
      lastName: user?.lastName || fallbackLastName,
      email: user?.email || '',
    };
  });
  const [accountErrors, setAccountErrors] = useState<
    Partial<Record<'firstName' | 'lastName' | 'email' | 'phoneNumber', string>>
  >({});

  const [phoneData, setPhoneData] = useState(() => {
    const raw = (user?.phone || '').trim();
    if (raw.startsWith('+234')) {
      return { countryCca2: 'NG', callingCode: '+234', phoneNumber: raw.slice(4) };
    }
    return { countryCca2: 'NG', callingCode: '+234', phoneNumber: raw.replace(/[^\d]/g, '') };
  });

  const [academicData, setAcademicData] = useState<Pick<User, 'school' | 'admissionYear' | 'department' | 'matricNumber'>>({
    school: user?.school || user?.institutionName || '',
    admissionYear: toSessionLabel(user?.admissionYear),
    department: user?.department || '',
    matricNumber: user?.matricNumber || '',
  });
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [admissionOpen, setAdmissionOpen] = useState(false);

  const admissionSessions = useMemo(() => getAdmissionSessions(2019), []);
  const [deptId, setDeptId] = useState<number | null>(() => {
    const raw = user?.deptId;
    if (raw == null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  });
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);

  const [schools, setSchools] = useState<Array<{ id: number; name: string }>>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);

  const schoolLookupActive = section === 'academic' || section === 'myAccount' || editDialog === 'academic';

  useEffect(() => {
    if (!schoolLookupActive) return;
    const rawSchoolId = user?.schoolId;
    const schoolId = rawSchoolId != null ? Number(rawSchoolId) : NaN;
    if (!Number.isFinite(schoolId)) return;

    let mounted = true;
    (async () => {
      setDepartmentsLoading(true);
      try {
        const data = await referenceAPI.getDepartments({ schoolId, page: 1, limit: 100 });
        if (!mounted) return;
        setDepartments(
          (data.departments || [])
            .map((d) => ({ id: Number((d as any).id), name: String((d as any).name || '').trim() }))
            .filter((d) => Number.isFinite(d.id) && !!d.name)
        );
      } catch {
        if (!mounted) return;
        setDepartments([]);
      } finally {
        if (mounted) setDepartmentsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [schoolLookupActive, user?.schoolId]);

  useEffect(() => {
    if (!schoolLookupActive) return;
    const rawSchoolId = user?.schoolId;
    const schoolId = rawSchoolId != null ? Number(rawSchoolId) : NaN;
    if (!Number.isFinite(schoolId)) return;

    let mounted = true;
    (async () => {
      setSchoolsLoading(true);
      try {
        const data = await referenceAPI.getSchools({ page: 1, limit: 100 });
        if (!mounted) return;
        setSchools(
          (data.schools || [])
            .map((s) => ({ id: Number((s as any).id), name: String((s as any).name || '').trim() }))
            .filter((s) => Number.isFinite(s.id) && !!s.name)
        );
      } catch {
        if (!mounted) return;
        setSchools([]);
      } finally {
        if (mounted) setSchoolsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [schoolLookupActive, user?.schoolId]);

  useEffect(() => {
    if (!schoolLookupActive) return;
    if (!user) return;

    const rawSchoolId = user.schoolId;
    const schoolId = rawSchoolId != null ? Number(rawSchoolId) : NaN;
    const schoolName = Number.isFinite(schoolId) ? schools.find((s) => s.id === schoolId)?.name : undefined;

    const deptNameFromId = deptId != null ? departments.find((d) => d.id === deptId)?.name : undefined;
    const admissionSession = toSessionLabel(user.admissionYear);

    setAcademicData((prev) => ({
      ...prev,
      school: schoolName || prev.school,
      admissionYear: prev.admissionYear || admissionSession,
      department: deptNameFromId || prev.department,
    }));

    if (schoolName && !user.school) {
      updateUser({ ...user, school: schoolName });
    }
  }, [departments, deptId, schoolLookupActive, schools, updateUser, user]);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const saveProfilePatch = async (patch: Partial<User>, okMessage: string) => {
    if (!user) return;
    setSaving(true);
    try {
      const updatedUser = await profileAPI.updateProfile(patch);
      updateUser(updatedUser);
      appMessage.toast({ status: 'success', message: okMessage });
    } catch (error: any) {
      updateUser({ ...user, ...patch });
      appMessage.alert({
        title: 'Saved on device',
        message: error.response?.data?.message || okMessage,
      });
    } finally {
      setSaving(false);
    }
  };

  const validateAccount = () => {
    const nextErrors: Partial<Record<'firstName' | 'lastName' | 'email' | 'phoneNumber', string>> = {};

    if (!accountData.firstName?.trim()) nextErrors.firstName = 'First name is required';
    if (!accountData.lastName?.trim()) nextErrors.lastName = 'Last name is required';

    if (!accountData.email?.trim()) nextErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(accountData.email)) nextErrors.email = 'Email is invalid';

    const phoneDigits = phoneData.phoneNumber.replace(/[^\d]/g, '');
    if (!phoneDigits) nextErrors.phoneNumber = 'Phone number is required';
    else if (phoneDigits.length < 7) nextErrors.phoneNumber = 'Phone number is too short';

    setAccountErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveAccount = async () => {
    if (!validateAccount()) return;
    const firstName = (accountData.firstName || '').trim();
    const lastName = (accountData.lastName || '').trim();
    const email = accountData.email.trim().toLowerCase();
    const phone = normalizePhone(phoneData.callingCode, phoneData.phoneNumber);
    await saveProfilePatch(
      { firstName, lastName, name: `${firstName} ${lastName}`.trim(), email, phone },
      'Account settings updated.'
    );
  };

  const handleSaveAcademic = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await profileAPI.updateAcademicInfo({
        deptId: deptId ?? undefined,
        matricNo: academicData.matricNumber?.trim() || undefined,
        admissionYear: toAdmissionYearValue(academicData.admissionYear || '') || undefined,
      });
      const refreshed = await authAPI.getCurrentUser();
      updateUser({ ...user, ...refreshed, school: user.school, institutionName: user.institutionName });
      appMessage.toast({ status: 'success', message: 'Academic info updated.' });
    } catch (error: any) {
      updateUser({
        ...user,
        admissionYear: toAdmissionYearValue(academicData.admissionYear || '') || undefined,
        matricNumber: academicData.matricNumber?.trim() || undefined,
        deptId: deptId ?? undefined,
        department: academicData.department?.trim() || undefined,
      });
      appMessage.alert({
        title: 'Saved on device',
        message: error.response?.data?.message || error?.message || 'Academic info updated.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      appMessage.alert({ title: 'Missing info', message: 'Fill in all fields to change your password.' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      appMessage.alert({ title: 'Passwords do not match', message: 'Confirm your new password.' });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await authAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
      appMessage.toast({ status: 'success', message: res.message || 'Password changed.' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      appMessage.alert({
        title: 'Error',
        message: error.response?.data?.message || error?.message || 'Failed to change password.',
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const confirmDeleteAccount = () => {
    if (!deletePassword) {
      appMessage.alert({ title: 'Password required', message: 'Enter your password to delete your account.' });
      return;
    }

    appMessage.confirm({
      title: 'Delete account',
      message: 'This will permanently delete your account. This action cannot be undone.',
      confirmText: 'Delete',
      destructive: true,
      onConfirm: () => handleDeleteAccount(),
    });
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const res = await authAPI.deleteAccount(deletePassword);
      appMessage.alert({
        title: 'Account deleted',
        message: res.message || 'Your account has been deleted.',
        actions: [{ text: 'OK', onPress: () => logout() }],
      });
    } catch (error: any) {
      appMessage.alert({
        title: 'Error',
        message: error.response?.data?.message || error?.message || 'Failed to delete account.',
      });
    } finally {
      setDeleteLoading(false);
      setDeletePassword('');
    }
  };

  const openProfileEdit = () => {
    const derived = (user?.name || '').trim().split(/\s+/).filter(Boolean);
    const fallbackFirstName = derived[0] || '';
    const fallbackLastName = derived.slice(1).join(' ');

    setAccountData({
      firstName: user?.firstName || fallbackFirstName,
      lastName: user?.lastName || fallbackLastName,
      email: user?.email || '',
    });
    setAccountErrors({});

    const raw = (user?.phone || '').trim();
    if (raw.startsWith('+234')) {
      setPhoneData({ countryCca2: 'NG', callingCode: '+234', phoneNumber: raw.slice(4) });
    } else {
      setPhoneData({ countryCca2: 'NG', callingCode: '+234', phoneNumber: raw.replace(/[^\d]/g, '') });
    }

    setEditDialog('profile');
  };

  const openAcademicEdit = () => {
    setAcademicData({
      school: user?.school || user?.institutionName || '',
      admissionYear: toSessionLabel(user?.admissionYear),
      department: user?.department || '',
      matricNumber: user?.matricNumber || '',
    });
    const rawDeptId = user?.deptId;
    const parsedDeptId = rawDeptId != null ? Number(rawDeptId) : NaN;
    setDeptId(Number.isFinite(parsedDeptId) ? parsedDeptId : null);
    setDepartmentOpen(false);
    setAdmissionOpen(false);
    setEditDialog('academic');
  };

  const closeEditDialog = () => {
    setDepartmentOpen(false);
    setAdmissionOpen(false);
    setEditDialog(null);
  };

  const saveAccountFromDialog = async () => {
    if (!validateAccount()) return;
    await handleSaveAccount();
    closeEditDialog();
  };

  const saveAcademicFromDialog = async () => {
    if (!user) return;
    await handleSaveAcademic();
    closeEditDialog();
  };

  const nameParts = useMemo(() => (user?.name || '').trim().split(/\s+/).filter(Boolean), [user?.name]);
  const displayFirstName = user?.firstName || nameParts[0] || '';
  const displayLastName = user?.lastName || nameParts.slice(1).join(' ') || '';
  const displayEmail = user?.email || '';
  const displayPhone = (user?.phone || '').trim();

  const displaySchoolFromReference = useMemo(() => {
    const raw = user?.schoolId;
    const schoolId = raw != null ? Number(raw) : NaN;
    if (!Number.isFinite(schoolId)) return '';
    return schools.find((s) => s.id === schoolId)?.name || '';
  }, [schools, user?.schoolId]);

  const displaySchool =
    user?.school ||
    user?.institutionName ||
    displaySchoolFromReference ||
    (user?.schoolId != null ? `School ID: ${String(user.schoolId)}` : '');
  const displayAdmission = toSessionLabel(user?.admissionYear);
  const displayDepartment = user?.department || '';
  const displayMatric = user?.matricNumber || '';

  const renderAccountForm = ({ onSave, showEmail }: { onSave: () => void; showEmail?: boolean }) => (
    <>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Input
            label="First Name"
            value={accountData.firstName || ''}
            onChangeText={(text) => setAccountData((s) => ({ ...s, firstName: text }))}
            errorText={accountErrors.firstName}
            autoCapitalize="words"
            autoComplete="given-name"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="Last Name"
            value={accountData.lastName || ''}
            onChangeText={(text) => setAccountData((s) => ({ ...s, lastName: text }))}
            errorText={accountErrors.lastName}
            autoCapitalize="words"
            autoComplete="family-name"
          />
        </View>
      </View>
      {showEmail !== false ? (
        <Input
          label="Email address"
          placeholder="Enter your email"
          value={accountData.email || ''}
          errorText={accountErrors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          editable={false}
        />
      ) : null}
      <PhoneField
        countryCca2={phoneData.countryCca2}
        callingCode={phoneData.callingCode}
        phoneNumber={phoneData.phoneNumber}
        errorText={accountErrors.phoneNumber}
        onChangeCountry={(countryCca2, callingCode) => setPhoneData((s) => ({ ...s, countryCca2, callingCode }))}
        onChangePhoneNumber={(phoneNumber) => setPhoneData((s) => ({ ...s, phoneNumber }))}
      />
      <Button title={saving ? 'Saving...' : 'Save changes'} onPress={onSave} disabled={saving} />
    </>
  );

  const renderAcademicForm = (onSave: () => void) => (
    <>
      <Input
        label="School"
        value={academicData.school || (user?.schoolId != null ? `School ID: ${String(user.schoolId)}` : '')}
        editable={false}
        right={schoolsLoading ? <PaperTextInput.Icon icon="loading" color={colors.textMuted} /> : undefined}
      />
      <TouchableOpacity
        onPress={() => setAdmissionOpen(true)}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Select admission year"
      >
        <View pointerEvents="none">
          <Input
            label="Admission Year"
            value={academicData.admissionYear || ''}
            placeholder="Select session"
            editable={false}
            right={<PaperTextInput.Icon icon="chevron-down" color={colors.textMuted} />}
          />
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
                  if (!departmentsLoading && departments.length > 0) setDepartmentOpen(true);
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
            value={academicData.department || ''}
            placeholder="Select your department"
            editable={false}
            right={<PaperTextInput.Icon icon="chevron-down" color={colors.textMuted} />}
          />
        </View>
      </TouchableOpacity>
      <Input
        label="Matric Number"
        placeholder="e.g. CSC/22/1234"
        value={academicData.matricNumber || ''}
        onChangeText={(text) => setAcademicData((s) => ({ ...s, matricNumber: text }))}
        autoCapitalize="characters"
      />
      <Button title={saving ? 'Saving...' : 'Save changes'} onPress={onSave} disabled={saving} />

      <OptionPickerDialog
        visible={admissionOpen}
        title="Select admission session"
        searchPlaceholder="Search admission session..."
        options={admissionSessions}
        selected={academicData.admissionYear || ''}
        onClose={() => setAdmissionOpen(false)}
        onSelect={(admissionYear) => setAcademicData((s) => ({ ...s, admissionYear }))}
      />

      <OptionPickerDialog
        visible={departmentOpen}
        title="Select department"
        searchPlaceholder="Search department..."
        options={departments.map((d) => d.name)}
        selected={academicData.department || ''}
        loading={departmentsLoading}
        onClose={() => setDepartmentOpen(false)}
        onSelect={(department) => {
          const match = departments.find((d) => d.name === department);
          setDeptId(match?.id ?? null);
          setAcademicData((s) => ({ ...s, department }));
        }}
      />
    </>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 110 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.iconButton, { backgroundColor: colors.background }]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <AppIcon name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.topTitle, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.iconButton} />
          </View>

          {section === 'myAccount' ? (
            <>
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Profile information</Text>
                  <TouchableOpacity
                    onPress={openProfileEdit}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Edit profile information"
                    style={[styles.editButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  >
                    <AppIcon name="create-outline" size={18} color={colors.secondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.kvList}>
                  <KeyValueRow label="First name" value={displayFirstName} />
                  <KeyValueRow label="Last name" value={displayLastName} />
                  <KeyValueRow label="Email" value={displayEmail} />
                  <KeyValueRow label="Phone" value={displayPhone} />
                </View>
              </View>

              <View style={{ height: 12 }} />

              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Academic Info</Text>
                  <TouchableOpacity
                    onPress={openAcademicEdit}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Edit academic info"
                    style={[styles.editButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  >
                    <AppIcon name="create-outline" size={18} color={colors.secondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.kvList}>
                  <KeyValueRow label="School" value={displaySchool} />
                  <KeyValueRow label="Department" value={displayDepartment} />
                  <KeyValueRow label="Admission year" value={displayAdmission} />
                  <KeyValueRow label="Matric number" value={displayMatric} />
                </View>
              </View>
            </>
          ) : null}

          {section === 'account' ? (
            <View style={[styles.card, { borderColor: colors.border }]}>
              {renderAccountForm({ onSave: handleSaveAccount })}
            </View>
          ) : null}

          {section === 'academic' ? (
            <View style={[styles.card, { borderColor: colors.border }]}>
              {renderAcademicForm(handleSaveAcademic)}
            </View>
          ) : null}

          {section === 'security' ? (
            <>
              <View style={[styles.card, { borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Change password</Text>
                <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
                  Choose a strong password you don't use elsewhere.
                </Text>
                <View style={{ height: 12 }} />
                <Input
                  label="Current Password"
                  placeholder="Enter current password"
                  value={passwordData.currentPassword}
                  onChangeText={(text) => setPasswordData((s) => ({ ...s, currentPassword: text }))}
                  isPassword
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <Input
                  label="New Password"
                  placeholder="Enter new password"
                  value={passwordData.newPassword}
                  onChangeText={(text) => setPasswordData((s) => ({ ...s, newPassword: text }))}
                  isPassword
                  autoCapitalize="none"
                  autoComplete="password-new"
                />
                <Input
                  label="Confirm Password"
                  placeholder="Confirm new password"
                  value={passwordData.confirmPassword}
                  onChangeText={(text) => setPasswordData((s) => ({ ...s, confirmPassword: text }))}
                  isPassword
                  autoCapitalize="none"
                />
                <Button
                  title={passwordLoading ? 'Updating...' : 'Change password'}
                  onPress={handleChangePassword}
                  disabled={passwordLoading}
                />
              </View>

              <View style={{ height: 12 }} />

              <View style={[styles.card, { borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.danger }]}>Delete account</Text>
                <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
                  This will permanently delete your account. Enter your password to continue.
                </Text>
                <View style={{ height: 12 }} />
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  isPassword
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <TouchableOpacity
                  onPress={confirmDeleteAccount}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Delete account"
                  style={[
                    styles.dangerButton,
                    { borderColor: colors.danger, backgroundColor: colors.surface },
                    deleteLoading && { opacity: 0.75 },
                  ]}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <ActivityIndicator color={colors.danger} />
                  ) : (
                    <Text style={[styles.dangerText, { color: colors.danger }]}>Delete account</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={editDialog === 'profile'} transparent animationType="slide" onRequestClose={closeEditDialog}>
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={closeEditDialog}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <BlurView intensity={28} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.18)' },
              ]}
            />
          </Pressable>

          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: 16 + insets.bottom },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Edit profile information</Text>
              <TouchableOpacity
                onPress={closeEditDialog}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={[styles.closeButton]}
              >
                <AppIcon name="close-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                {renderAccountForm({ onSave: saveAccountFromDialog, showEmail: false })}
              </KeyboardAvoidingView>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={editDialog === 'academic'} transparent animationType="slide" onRequestClose={closeEditDialog}>
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={closeEditDialog}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <BlurView intensity={28} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.18)' },
              ]}
            />
          </Pressable>

          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: 16 + insets.bottom },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Edit academic info</Text>
              <TouchableOpacity
                onPress={closeEditDialog}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={[styles.closeButton]}
              >
                <AppIcon name="close-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                {renderAcademicForm(saveAcademicFromDialog)}
              </KeyboardAvoidingView>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const KeyValueRow = ({
  label,
  value,
  valueLines = 1,
}: {
  label: string;
  value?: string;
  valueLines?: number;
}) => {
  const { colors } = useTheme();
  const normalized = (value || '').trim();
  return (
    <View style={[styles.kvRow, { borderColor: colors.border }]}>
      <Text style={[styles.kvLabel, { color: colors.textMuted }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.kvValue, { color: colors.text }]} numberOfLines={valueLines}>
        {normalized || 'Not set'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
    maxWidth: '70%',
  },
  card: {
    borderRadius: 22,
    padding: 14,
    paddingBottom: 30,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  editButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kvList: {
    gap: 10,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    padding: 12,
  },
  kvLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    paddingTop: 2,
  },
  kvValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.2,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 8,
    paddingBottom: 25,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButton: {
    height: 52,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerText: {
    fontSize: 16,
    fontWeight: '800',
  },
});

export default ProfileSectionScreen;
