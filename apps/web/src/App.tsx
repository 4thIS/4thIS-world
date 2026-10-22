import { useEffect } from 'react';
import { CampusPreview } from './dev/campus/CampusPreview';
import { CharacterGallery } from './dev/characters/CharacterGallery';
import { SimDevPage } from './dev/sim/SimDevPage';
import { useSession } from './store/session';
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
