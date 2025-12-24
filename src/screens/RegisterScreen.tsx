import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  Button as PaperButton,
  Checkbox,
  HelperText,
  TextInput as PaperTextInput,
} from 'react-native-paper';
import AuthScaffold from '../components/auth/AuthScaffold';
import AppText from '../components/AppText';
import Button from '../components/Button';
import Input from '../components/Input';
import OptionPickerDialog from '../components/OptionPickerDialog';
import PhoneField from '../components/PhoneField';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { RegisterCredentials } from '../types';
import { normalizePhone } from '../utils/phone';
import { referenceAPI } from '../services/api';

interface RegisterScreenProps {
  navigation: any;
}

type Gender = 'female' | 'male' | null;

type RegisterForm = {
  firstName: string;
  lastName: string;
  school: string;
  schoolId: number | null;
  countryCca2: string;
  callingCode: string;
  phoneNumber: string;
  gender: Gender;
  email: string;
  password: string;
  acceptedTerms: boolean;
};

type RegisterErrors = Partial<Record<keyof RegisterForm, string>>;

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { register } = useAuth();
  const { colors } = useTheme();
  const appMessage = useAppMessage();

  const [schools, setSchools] = useState<Array<{ id: number; name: string }>>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);

  const [form, setForm] = useState<RegisterForm>({
    firstName: '',
    lastName: '',
    school: '',
    schoolId: null,
    countryCca2: 'NG',
    callingCode: '+234',
    phoneNumber: '',
    gender: null,
    email: '',
    password: '',
    acceptedTerms: true,
  });
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [loading, setLoading] = useState(false);
  const [schoolOpen, setSchoolOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await referenceAPI.getSchools({ page: 1, limit: 100 });
        if (!mounted) return;
        setSchools((data.schools || []).map((s) => ({ id: s.id, name: s.name })));
      } catch (error: any) {
        if (!mounted) return;
        setSchools([]);
        appMessage.toast({
          message: error?.response?.data?.message || error?.message || 'Could not load schools',
        });
      } finally {
        if (mounted) setSchoolsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [appMessage]);

  const schoolNames = useMemo(() => schools.map((s) => s.name), [schools]);

  const canOpenSchools = !schoolsLoading && schoolNames.length > 0;

  const validate = (): boolean => {
    const newErrors: RegisterErrors = {};

    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!form.schoolId) newErrors.school = 'School is required';

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
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        phone: normalizePhone(form.callingCode, form.phoneNumber),
        gender: form.gender ?? undefined,
        email: form.email.trim(),
        password: form.password,
        school_id: form.schoolId as number,
      };
      const res = await register(payload);
      appMessage.toast({
        message:
          res.message ||
          "Registration successful! We've sent a verification code (OTP) to your email address. Please check your inbox.",
      });
      navigation.navigate('VerifyOtp', { email: payload.email, schoolName: form.school });
    } catch (error: any) {
      appMessage.alert({
        title: 'Registration Failed',
        message: error?.response?.data?.message || error?.message || 'Failed to create account',
      });
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
        onPress={() => {
          if (!canOpenSchools) {
            appMessage.toast({ message: schoolsLoading ? 'Loading schools...' : 'No schools available' });
            return;
          }
          setSchoolOpen(true);
        }}
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

      <PhoneField
        countryCca2={form.countryCca2}
        callingCode={form.callingCode}
        phoneNumber={form.phoneNumber}
        errorText={errors.phoneNumber}
        onChangeCountry={(countryCca2, callingCode) =>
          setForm((s) => ({ ...s, countryCca2, callingCode }))
        }
        onChangePhoneNumber={(phoneNumber) => setForm((s) => ({ ...s, phoneNumber }))}
      />

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

      <OptionPickerDialog
        visible={schoolOpen}
        title="Select school"
        searchPlaceholder="Search schools..."
        options={schoolNames}
        selected={form.school}
        onClose={() => setSchoolOpen(false)}
        onSelect={(school) => {
          const match = schools.find((s) => s.name === school);
          setForm((s) => ({ ...s, school, schoolId: match?.id ?? null }));
        }}
      />
    </AuthScaffold>
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
});

export default RegisterScreen;
