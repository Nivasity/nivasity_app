import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  Button as PaperButton,
  Checkbox,
  Dialog,
  HelperText,
  List,
  Portal,
  TextInput as PaperTextInput,
} from 'react-native-paper';
import AuthScaffold from '../components/auth/AuthScaffold';
import AppText from '../components/AppText';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { RegisterCredentials } from '../types';

interface RegisterScreenProps {
  navigation: any;
}

type Gender = 'female' | 'male' | null;

type RegisterForm = {
  firstName: string;
  lastName: string;
  school: string;
  countryCode: string;
  phoneNumber: string;
  gender: Gender;
  email: string;
  password: string;
  acceptedTerms: boolean;
};

type RegisterErrors = Partial<Record<keyof RegisterForm, string>>;

const SCHOOLS = [
  'University of Lagos (UNILAG)',
  'University of Ibadan (UI)',
  'Obafemi Awolowo University (OAU)',
  'Covenant University',
  'Ahmadu Bello University (ABU)',
  'Other',
];

const normalizeCountryCode = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '+234';
  if (trimmed.startsWith('+')) return `+${trimmed.replace(/[^\d]/g, '')}`;
  return `+${trimmed.replace(/[^\d]/g, '')}`;
};

const normalizePhone = (countryCode: string, phoneNumber: string) => {
  const cc = normalizeCountryCode(countryCode);
  const pn = phoneNumber.replace(/[^\d]/g, '');
  return `${cc}${pn}`;
};

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { register } = useAuth();
  const { colors } = useTheme();

  const [form, setForm] = useState<RegisterForm>({
    firstName: '',
    lastName: '',
    school: '',
    countryCode: '+234',
    phoneNumber: '',
    gender: null,
    email: '',
    password: '',
    acceptedTerms: true,
  });
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [loading, setLoading] = useState(false);
  const [schoolOpen, setSchoolOpen] = useState(false);

  const validate = (): boolean => {
    const newErrors: RegisterErrors = {};

    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!form.school) newErrors.school = 'School is required';

    const phoneDigits = form.phoneNumber.replace(/[^\d]/g, '');
    if (!phoneDigits) newErrors.phoneNumber = 'Phone number is required';
    else if (phoneDigits.length < 7) newErrors.phoneNumber = 'Phone number is too short';

    if (!form.gender) newErrors.gender = 'Select your gender';

    if (!form.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Email is invalid';

    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    if (!form.acceptedTerms) newErrors.acceptedTerms = 'Please accept the terms';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const payload: RegisterCredentials = {
        name: `${form.firstName} ${form.lastName}`.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        school: form.school,
        phone: normalizePhone(form.countryCode, form.phoneNumber),
        gender: form.gender ?? undefined,
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.password,
      };
      await register(payload);
    } catch (error: any) {
      Alert.alert(
        'Registration Failed',
        error?.response?.data?.message || 'Failed to create account'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      navigation={navigation}
      title="Get Started"
      scrollable
      cardStyle={styles.card}
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Input
            label="First name"
            value={form.firstName}
            onChangeText={(text) => setForm((s) => ({ ...s, firstName: text }))}
            errorText={errors.firstName}
            autoCapitalize="words"
            autoComplete="given-name"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="Last name"
            value={form.lastName}
            onChangeText={(text) => setForm((s) => ({ ...s, lastName: text }))}
            errorText={errors.lastName}
            autoCapitalize="words"
            autoComplete="family-name"
          />
        </View>
      </View>

      <TouchableOpacity
        onPress={() => setSchoolOpen(true)}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Select school"
      >
        <View pointerEvents="none">
          <Input
            label="School"
            value={form.school}
            placeholder="Select your school"
            errorText={errors.school}
            editable={false}
            right={<PaperTextInput.Icon icon="chevron-down" />}
          />
        </View>
      </TouchableOpacity>

      <View style={styles.row}>
        <View style={{ flex: 0.38 }}>
          <Input
            label="Code"
            value={form.countryCode}
            onChangeText={(text) => setForm((s) => ({ ...s, countryCode: text }))}
            keyboardType="phone-pad"
          />
        </View>
        <View style={{ flex: 0.62 }}>
          <Input
            label="Phone"
            value={form.phoneNumber}
            onChangeText={(text) => setForm((s) => ({ ...s, phoneNumber: text }))}
            keyboardType="phone-pad"
            errorText={errors.phoneNumber}
          />
        </View>
      </View>

      <View style={styles.genderWrap}>
        <View style={styles.genderHeader}>
          {errors.gender ? (
            <AppText style={[styles.genderError, { color: colors.danger }]}>{errors.gender}</AppText>
          ) : null}
        </View>
        <View style={styles.genderRow}>
          <PaperButton
            mode={form.gender === 'female' ? 'contained' : 'outlined'}
            onPress={() => setForm((s) => ({ ...s, gender: 'female' }))}
            buttonColor={form.gender === 'female' ? colors.secondary : undefined}
            textColor={form.gender === 'female' ? '#FFFFFF' : colors.text}
            style={[styles.genderButton, { borderColor: colors.border }]}
            contentStyle={styles.genderContent}
          >
            Female
          </PaperButton>
          <PaperButton
            mode={form.gender === 'male' ? 'contained' : 'outlined'}
            onPress={() => setForm((s) => ({ ...s, gender: 'male' }))}
            buttonColor={form.gender === 'male' ? colors.secondary : undefined}
            textColor={form.gender === 'male' ? '#FFFFFF' : colors.text}
            style={[styles.genderButton, { borderColor: colors.border }]}
            contentStyle={styles.genderContent}
          >
            Male
          </PaperButton>
        </View>
      </View>

      <Input
        label="Email"
        placeholder="Enter your email"
        value={form.email}
        onChangeText={(text) => setForm((s) => ({ ...s, email: text }))}
        errorText={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        inputMode="email"
      />

      <Input
        label="Password"
        placeholder="Create your password"
        value={form.password}
        onChangeText={(text) => setForm((s) => ({ ...s, password: text }))}
        errorText={errors.password}
        isPassword
        autoComplete="password-new"
      />

      <TouchableOpacity
        onPress={() => setForm((s) => ({ ...s, acceptedTerms: !s.acceptedTerms }))}
        style={styles.termsRow}
        accessibilityRole="checkbox"
        accessibilityLabel="I agree to the Terms and Conditions"
        accessibilityState={{ checked: form.acceptedTerms }}
        activeOpacity={0.85}
      >
        <View pointerEvents="none">
          <Checkbox
            status={form.acceptedTerms ? 'checked' : 'unchecked'}
            color={colors.secondary}
            uncheckedColor={colors.border}
          />
        </View>
        <AppText style={[styles.termsText, { color: colors.textMuted }]}>
          I agree to the <AppText style={[styles.link, { color: colors.accent }]}>Terms and Conditions</AppText>
        </AppText>
      </TouchableOpacity>
      {errors.acceptedTerms ? (
        <HelperText type="error" visible>
          {errors.acceptedTerms}
        </HelperText>
      ) : null}

      <Button title="Sign up" onPress={handleRegister} loading={loading} style={styles.primaryButton} />

      <View style={styles.bottomRow}>
        <AppText style={[styles.bottomText, { color: colors.textMuted }]}>
          Already have an account?{' '}
        </AppText>
        <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
          <AppText style={[styles.link, { color: colors.accent }]}>Log in</AppText>
        </TouchableOpacity>
      </View>

      <ModalSchoolPicker
        visible={schoolOpen}
        selected={form.school}
        onClose={() => setSchoolOpen(false)}
        onSelect={(school) => setForm((s) => ({ ...s, school }))}
      />
    </AuthScaffold>
  );
};

const ModalSchoolPicker = ({
  visible,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selected: string;
  onClose: () => void;
  onSelect: (school: string) => void;
}) => {
  const { colors } = useTheme();
  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onClose}
        style={[styles.dialog, { backgroundColor: colors.surface }]}
      >
        <Dialog.Title style={[styles.dialogTitle, { color: colors.text }]}>
          Select school
        </Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView>
            {SCHOOLS.map((name) => (
              <List.Item
                key={name}
                title={name}
                titleStyle={{ color: colors.text, fontWeight: '700' }}
                onPress={() => {
                  onSelect(name);
                  onClose();
                }}
                right={() =>
                  selected === name ? (
                    <List.Icon icon="check" color={colors.secondary} />
                  ) : null
                }
              />
            ))}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <PaperButton onPress={onClose} textColor={colors.accent}>
            Close
          </PaperButton>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  card: {
    maxHeight: '82%',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  genderWrap: {
    marginBottom: 12,
  },
  genderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  genderError: {
    fontSize: 14,
    fontWeight: '700',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    borderRadius: 20,
  },
  genderContent: {
    height: 44,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
    marginBottom: 4,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 16,
  },
  link: {
    fontSize: 14,
    fontWeight: '900',
  },
  primaryButton: {
    marginTop: 8,
    marginBottom: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingBottom: 6,
  },
  bottomText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dialog: {
    borderRadius: 18,
  },
  dialogTitle: {
    fontWeight: '900',
  },
});

export default RegisterScreen;
