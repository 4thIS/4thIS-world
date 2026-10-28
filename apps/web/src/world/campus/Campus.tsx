import { useMemo } from 'react';
import { BUILDING_IDS, kstMinutes, type BuildingId } from '@4this/shared';
import type { CampusProps } from '../contracts';
import { Building } from './Building';
import { CafeInterior, CafeTerrace } from './CafeInterior';
import { EngInterior } from './EngInterior';
import { Flowers } from './Flowers';
import { Gate } from './Gate';
import { Grass } from './Grass';
import { Ground } from './Ground';
import { LabInterior } from './LabInterior';
import { LampGlow } from './LampGlow';
import { Lights } from './Lights';
import { MainInterior } from './MainInterior';
import { NoticeBoard } from './NoticeBoard';
import { OutdoorProps } from './OutdoorProps';
import { Paths } from './Paths';
import { litFloorsOf } from './nightLights';
import { Pond } from './Pond';
import { skyAt } from './sky';
import { Trees } from './Trees';

/** 4thIS 캠퍼스 전체 (지형·길·자연물·정문·소품·건물·조명) */
export function Campus({
  now,
  occupiedFloors,
  focusedBuilding,
  hiddenAboveFloor,
  onBuildingClick,
}: CampusProps) {
  // 층 숨김은 포커스된 건물에만 적용한다
  const hidden = (id: BuildingId) => (focusedBuilding === id ? hiddenAboveFloor : null);
  // 하늘은 1분 단위로만 다시 계산한다
  const minute = Math.floor(kstMinutes(now));
  const sky = useMemo(() => skyAt(minute), [minute]);
  const lit = useMemo(
    () =>
      Object.fromEntries(BUILDING_IDS.map((id) => [id, litFloorsOf(occupiedFloors, id)])) as Record<
        BuildingId,
        Set<number>
      >,
    [occupiedFloors],
  );
  const common = (id: BuildingId) => ({
    id,
    hiddenAboveFloor: hidden(id),
    focused: focusedBuilding === id,
    onClick: onBuildingClick,
    night: sky.night,
    litFloors: lit[id],
  });
  return (
    <group>
      <Lights sky={sky} />
      <Ground />
      <Paths />
      <Grass />
      <Trees />
      <Flowers />
      <Pond />
      <Gate />
      <NoticeBoard />
      <OutdoorProps />
      <LampGlow night={sky.night} />
      <Building {...common('eng')} interior={(floor) => <EngInterior floor={floor} />} />
      <Building
        {...common('lab')}
        interior={(floor) => <LabInterior floor={floor} />}
        floorColors={{ 1: '#a59cb4' }}
      />
      <Building {...common('main')} interior={(floor) => <MainInterior floor={floor} />} />
      <Building {...common('cafe')} interior={() => <CafeInterior />} />
      <CafeTerrace />
    </group>
  );
}
