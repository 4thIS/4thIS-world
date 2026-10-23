import type { CampusProps } from '../contracts';
import { BuildingBoxes } from './BuildingBoxes';
import { Flowers } from './Flowers';
import { Gate } from './Gate';
import { Grass } from './Grass';
import { Ground } from './Ground';
import { Lights } from './Lights';
import { NoticeBoard } from './NoticeBoard';
import { OutdoorProps } from './OutdoorProps';
import { Paths } from './Paths';
import { Pond } from './Pond';
import { Trees } from './Trees';

/** 4thIS 캠퍼스 전체 (지형·길·자연물·정문·소품·건물·조명) */
export function Campus({ focusedBuilding, onBuildingClick }: CampusProps) {
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
      <BuildingBoxes focusedBuilding={focusedBuilding} onBuildingClick={onBuildingClick} />
    </group>
  );
}
