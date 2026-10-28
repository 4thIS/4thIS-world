import { AdminScreen } from './admin/AdminScreen';
import { AdminLoginForm } from './auth/AdminLoginForm';
import { LoginForm } from './auth/LoginForm';
import { SignupForm } from './auth/SignupForm';
import { CustomizeScreen } from './customize/CustomizeScreen';
import { ScheduleScreen } from './schedule/ScheduleScreen';
import { useUi } from './store';

/** UI 스토어의 screen 값에 맞는 모달 하나를 그린다 (라우터 대신) */
export function ScreenHost() {
  const screen = useUi((s) => s.screen);
  switch (screen) {
    case null:
      return null;
    case 'login':
      return <LoginForm />;
    case 'signup':
      return <SignupForm />;
    case 'adminLogin':
      return <AdminLoginForm />;
    case 'customize':
      return <CustomizeScreen />;
    case 'schedule':
      return <ScheduleScreen />;
    case 'admin':
      return <AdminScreen />;
  }
}
