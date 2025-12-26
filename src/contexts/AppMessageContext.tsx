import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import AppIcon from '../components/AppIcon';
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
  status?: 'success' | 'failed' | 'info';
  title?: string;
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
  status: 'success' | 'failed' | 'info';
  title?: string;
  actionText?: string;
  onAction?: () => void;
};

const withAlpha = (hex: string, alpha: number) => {
  const clamped = Math.max(0, Math.min(1, alpha));
  const normalized = (hex || '').trim();
  if (!/^#([0-9a-fA-F]{6})$/.test(normalized)) return hex;
  const a = Math.round(clamped * 255);
  const suffix = a.toString(16).padStart(2, '0').toUpperCase();
  return `${normalized}${suffix}`;
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
    status: 'info',
    title: undefined,
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
      toast: ({ message, status = 'info', title, actionText, onAction }) => {
        setToast({ visible: true, message, status, title, actionText, onAction });
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

  const toastTitle = toast.title
    ? toast.title
    : toast.status === 'success'
      ? 'Successful'
      : toast.status === 'failed'
        ? 'Failed'
        : 'Notice';

  const toastTone =
    toast.status === 'success'
      ? colors.success
      : toast.status === 'failed'
        ? colors.warning
        : colors.border;

  const toastIcon: React.ComponentProps<typeof AppIcon>['name'] =
    toast.status === 'success'
      ? 'checkmark-circle-outline'
      : toast.status === 'failed'
        ? 'close-circle-outline'
        : 'sparkles-outline';

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
                paddingTop: 10 + insets.top,
                paddingRight: 14,
              },
            ]}
            pointerEvents="box-none"
          >
            <View style={[styles.toast, { backgroundColor: colors.surface, borderColor: withAlpha(toastTone, 0.6) }]}>
              <View style={[styles.toastIconWrap, { backgroundColor: withAlpha(toastTone, 0.14) }]}>
                <AppIcon name={toastIcon} size={18} color={toastTone} />
              </View>

              <View style={styles.toastBody}>
                <AppText style={[styles.toastTitle, { color: toastTone }]} numberOfLines={1}>
                  {toastTitle}
                </AppText>
                <AppText style={[styles.toastText, { color: colors.text }]} numberOfLines={3}>
                  {toast.message}
                </AppText>
              </View>
              {toast.actionText ? (
                <TouchableOpacity
                  onPress={() => {
                    setToast((s) => ({ ...s, visible: false }));
                    toast.onAction?.();
                  }}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={toast.actionText}
                  style={[styles.toastAction, { borderColor: colors.border }]}
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
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingLeft: 14,
  },
  toast: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    maxWidth: 360,
    minWidth: 260,
  },
  toastIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastBody: {
    flex: 1,
    paddingTop: 1,
  },
  toastTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  toastAction: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  toastActionText: {
    fontSize: 12,
    fontWeight: '900',
  },
});
