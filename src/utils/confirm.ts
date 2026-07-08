import { Alert, Platform } from 'react-native';

/** 삭제 등 확인 다이얼로그 — 웹에서는 Alert.alert가 동작하지 않으므로 분기 */
export function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (window.confirm(`${title}\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: '취소', style: 'cancel' },
    { text: '확인', style: 'destructive', onPress: onConfirm },
  ]);
}
