import { Component, type ReactNode } from 'react';
import { TextFallback } from './TextFallback';

/**
 * 3D Canvas가 던지는 오류(WebGL 컨텍스트를 못 만드는 브라우저 등)를 잡아 텍스트 목록으로 대신한다.
 * 이 경계가 없으면 React 루트 전체가 내려가고, 바깥 WorldCanvas의 소켓 연결까지 끊긴다.
 */
export class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('3D 월드를 그리지 못해 텍스트 목록으로 바꿉니다', error);
  }

  render() {
    return this.state.failed ? <TextFallback /> : this.props.children;
  }
}
