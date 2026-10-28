import { useEffect } from 'react';
import { CampusPreview } from './dev/campus/CampusPreview';
import { CharacterGallery } from './dev/characters/CharacterGallery';
import { SimDevPage } from './dev/sim/SimDevPage';
import { useSession } from './store/session';
import { browserStore, shouldShowIntro } from './ui/intro/introStorage';
import { useUi } from './ui/store';
import { UiRoot } from './ui/UiRoot';
import { WorldCanvas } from './world/WorldCanvas';
import './ui/tokens.css';

/** ?dev=characters, ?dev=campus, ?dev=sim 은 개발용 단독 페이지 */
const devPage = new URLSearchParams(window.location.search).get('dev');

export function App() {
  const refresh = useSession((s) => s.refresh);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  // 들어올 때마다 소개 모달 ("오늘 하루 보지 않기"면 그날은 건너뛴다)
  useEffect(() => {
    if (devPage) return;
    const ui = useUi.getState();
    if (ui.screen === null && shouldShowIntro(browserStore(), Date.now())) ui.open('intro');
  }, []);

  if (devPage === 'characters') return <CharacterGallery />;
  if (devPage === 'campus') return <CampusPreview />;
  if (devPage === 'sim') return <SimDevPage />;

  return (
    <div className="app">
      <WorldCanvas />
      <UiRoot />
    </div>
  );
}
