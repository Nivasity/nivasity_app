import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import AppText from '../components/AppText';
import { useTheme } from './ThemeContext';

type AppMessageActionStyle = 'default' | 'cancel' | 'destructive';

type AppMessageAction = {
  text: string;
  style?: AppMessageActionStyle;
  onPress?: () => void;
};

type AlertOptions = {
  title: string;
  message?: string;
  actions?: AppMessageAction[];
  dismissable?: boolean;
};

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

type ToastOptions = {
  message: string;
  actionText?: string;
  onAction?: () => void;
};

type AppMessageContextValue = {
  alert: (options: AlertOptions) => void;
  confirm: (options: ConfirmOptions) => void;
  toast: (options: ToastOptions) => void;
};

const AppMessageContext = createContext<AppMessageContextValue | undefined>(undefined);

export const useAppMessage = () => {
  const ctx = useContext(AppMessageContext);
  if (!ctx) throw new Error('useAppMessage must be used within AppMessageProvider');
  return ctx;
};

type DialogState = {
  visible: boolean;
  title: string;
  message?: string;
  dismissable: boolean;
  actions: AppMessageAction[];
};

type ToastState = {
  visible: boolean;
  message: string;
  actionText?: string;
  onAction?: () => void;
};

export const AppMessageProvider = ({ children }: { children: ReactNode }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [dialog, setDialog] = useState<DialogState>({
    visible: false,
    title: '',
    message: undefined,
    dismissable: true,
    actions: [{ text: 'OK' }],
  });

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    actionText: undefined,
    onAction: undefined,
  });

  const value = useMemo<AppMessageContextValue>(
    () => ({
      alert: ({ title, message, actions, dismissable = true }) => {
        setDialog({
          visible: true,
          title,
          message,
          dismissable,
          actions: actions?.length ? actions : [{ text: 'OK' }],
        });
      },
      confirm: ({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', destructive, onConfirm }) => {
        setDialog({
          visible: true,
          title,
          message,
          dismissable: true,
          actions: [
            { text: cancelText, style: 'cancel' },
            { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
          ],
        });
      },
      toast: ({ message, actionText, onAction }) => {
        setToast({ visible: true, message, actionText, onAction });
      },
    }),
    []
  );

  const closeDialog = () => setDialog((s) => ({ ...s, visible: false }));

  const getActionColor = (style?: AppMessageActionStyle) => {
    switch (style) {
      case 'cancel':
        return colors.textMuted;
      case 'destructive':
        return colors.danger;
      default:
        return colors.accent;
    }
  };

  useEffect(() => {
    if (!toast.visible) return;
    const handle = setTimeout(() => setToast((s) => ({ ...s, visible: false })), 2800);
    return () => clearTimeout(handle);
  }, [toast.visible]);

  return (
    <AppMessageContext.Provider value={value}>
      {children}

      <Modal
        visible={dialog.visible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (dialog.dismissable) closeDialog();
        }}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={dialog.dismissable ? closeDialog : undefined}
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

          <View style={[styles.dialogCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText style={[styles.dialogTitle, { color: colors.text }]}>{dialog.title}</AppText>
            {dialog.message ? (
              <AppText style={[styles.dialogMessage, { color: colors.textMuted }]}>
                {dialog.message}
              </AppText>
            ) : null}

            <View style={styles.actionsRow}>
              {dialog.actions.map((action, idx) => {
                const destructive = action.style === 'destructive';
                const filled = action.style === 'default' || destructive;
                return (
                  <TouchableOpacity
                    key={`${action.text}-${idx}`}
                    onPress={() => {
                      closeDialog();
                      action.onPress?.();
                    }}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={action.text}
                    style={[
                      styles.actionButton,
                      filled
                        ? { backgroundColor: destructive ? colors.danger : colors.accent }
                        : { backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 1 },
                    ]}
                  >
                    <AppText
                      style={[
                        styles.actionText,
                        { color: filled ? '#FFFFFF' : getActionColor(action.style) },
                      ]}
                    >
                      {action.text}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {toast.visible ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
          <View
            style={[
              styles.toastWrap,
              {
                paddingBottom: 90 + insets.bottom,
              },
            ]}
            pointerEvents="box-none"
          >
            <View style={[styles.toast, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <AppText style={[styles.toastText, { color: colors.text }]} numberOfLines={2}>
                {toast.message}
              </AppText>
              {toast.actionText ? (
                <TouchableOpacity
                  onPress={() => {
                    setToast((s) => ({ ...s, visible: false }));
                    toast.onAction?.();
                  }}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={toast.actionText}
                  style={styles.toastAction}
                >
                  <AppText style={[styles.toastActionText, { color: colors.accent }]}>
                    {toast.actionText}
                  </AppText>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}
    </AppMessageContext.Provider>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  dialogCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  dialogMessage: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  actionsRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '900',
  },
  toastWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  toast: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toastText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  toastAction: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastActionText: {
    fontSize: 12,
    fontWeight: '900',
  },
});
