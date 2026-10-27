import type { BuildingId } from '@4this/shared';
import type { CampusProps } from '../contracts';
import { Building } from './Building';
import { BuildingBoxes } from './BuildingBoxes';
import { EngInterior } from './EngInterior';
import { Flowers } from './Flowers';
import { Gate } from './Gate';
import { Grass } from './Grass';
import { Ground } from './Ground';
import { LabInterior } from './LabInterior';
import { Lights } from './Lights';
import { NoticeBoard } from './NoticeBoard';
import { OutdoorProps } from './OutdoorProps';
import { Paths } from './Paths';
import { Pond } from './Pond';
import { Trees } from './Trees';

/** 4thIS 캠퍼스 전체 (지형·길·자연물·정문·소품·건물·조명) */
export function Campus({ focusedBuilding, hiddenAboveFloor, onBuildingClick }: CampusProps) {
  // 층 숨김은 포커스된 건물에만 적용한다
  const hidden = (id: BuildingId) => (focusedBuilding === id ? hiddenAboveFloor : null);
  return (
    <group>
      <Lights />
      <Ground />
      <Paths />
      <Grass />
      <Trees />
      <Flowers />
      <Pond />
      <Gate />
      <NoticeBoard />
      <OutdoorProps />
      <Building
        id="eng"
        hiddenAboveFloor={hidden('eng')}
        focused={focusedBuilding === 'eng'}
        onClick={onBuildingClick}
        interior={(floor) => <EngInterior floor={floor} />}
      />
      <Building
        id="lab"
        hiddenAboveFloor={hidden('lab')}
        focused={focusedBuilding === 'lab'}
        onClick={onBuildingClick}
        interior={(floor) => <LabInterior floor={floor} />}
        floorColors={{ 1: '#a59cb4' }}
      />
      <BuildingBoxes
        ids={['main', 'cafe']}
        focusedBuilding={focusedBuilding}
        onBuildingClick={onBuildingClick}
      />
    </group>
  );
}
