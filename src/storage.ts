import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, EMPTY_STATE } from './types';

/**
 * 저장소 어댑터.
 * 지금은 기기 로컬(AsyncStorage)에 저장하지만, 나중에 PC 웹 입력 연동을 위해
 * Supabase 같은 원격 저장소로 교체할 수 있도록 load/save 인터페이스로 분리해 둔다.
 */
const STORAGE_KEY = 'workcheck:state:v1';

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw);
    return { ...EMPTY_STATE, ...parsed };
  } catch {
    return EMPTY_STATE;
  }
}

export async function saveState(state: AppState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 저장 실패는 조용히 무시 (다음 변경 때 재시도됨)
  }
}
