import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { profileAPI } from '../services/api';
import { User } from '../types';

interface ProfileEditScreenProps {
  navigation: any;
}

const ProfileEditScreen: React.FC<ProfileEditScreenProps> = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const [profileData, setProfileData] = useState<Partial<User>>({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [errors, setErrors] = useState<Partial<User>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: Partial<User> = {};

    if (!profileData.name) {
      newErrors.name = 'Name is required';
    }

    if (!profileData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      newErrors.email = 'Email is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const updatedUser = await profileAPI.updateProfile(profileData);
      updateUser(updatedUser);
      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update profile'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Edit Profile</Text>
            </View>

            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>
                    {user?.name?.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.changeAvatarButton}>
                <Text style={styles.changeAvatarText}>Change Photo</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <Input
                label="Full Name"
                placeholder="Enter your full name"
                value={profileData.name}
                onChangeText={(text) =>
                  setProfileData({ ...profileData, name: text })
                }
                error={errors.name}
                autoCapitalize="words"
              />

              <Input
                label="Email"
                placeholder="Enter your email"
                value={profileData.email}
                onChangeText={(text) =>
                  setProfileData({ ...profileData, email: text })
                }
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Account Type</Text>
                <Text style={styles.infoValue}>
                  {user?.role === 'admin' ? 'Administrator' : 'Student'}
                </Text>
              </View>

              <View style={styles.buttonContainer}>
                <Button
                  title="Save Changes"
                  onPress={handleSave}
                  loading={loading}
                  style={styles.saveButton}
                />
                <Button
                  title="Cancel"
                  onPress={() => navigation.goBack()}
                  variant="outline"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  changeAvatarButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changeAvatarText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  form: {
    width: '100%',
  },
  infoCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  buttonContainer: {
    marginTop: 8,
  },
  saveButton: {
    marginBottom: 12,
  },
});

export default ProfileEditScreen;
