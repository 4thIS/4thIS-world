import { useGLTF } from '@react-three/drei';
import { Component, Suspense, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  Box3,
  BoxGeometry,
  CanvasTexture,
  Color,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type InstancedMesh,
  type Material,
  type Texture,
} from 'three';
import { MODELS, type ModelName, type ModelSpec } from './assets';
import { pastelHex, pastelizePixels } from './pastel';

/** 모델 하나를 놓을 자리. pos의 y는 바닥 높이, rotY는 facing과 같은 뜻 */
export interface ModelItem {
  pos: readonly [x: number, y: number, z: number];
  rotY: number;
  scale?: number;
}

interface ModelPart {
  geometry: BufferGeometry;
  material: Material;
  /** 모델 원점(바닥 가운데) 기준 이 메시의 변환 */
  matrix: Matrix4;
}

const pastelTextures = new WeakMap<object, Texture>();

/** 공용 텍스처를 캔버스에서 파스텔로 바꾼다. 같은 이미지는 한 번만 바꾼다 */
function pastelTexture(tex: Texture): Texture {
  const img = tex.image as (CanvasImageSource & { width: number; height: number }) | undefined;
  if (!img) return tex;
  const cached = pastelTextures.get(img);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return tex;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  pastelizePixels(data.data);
  ctx.putImageData(data, 0, 0);
  // tex.clone()은 원본과 source를 공유해서 out.image = canvas가 원본 이미지까지 바꾼다.
  // 그래서 새 CanvasTexture를 만들고 설정만 옮긴다.
  const out = new CanvasTexture(canvas);
  out.name = tex.name;
  out.mapping = tex.mapping;
  out.channel = tex.channel;
  out.wrapS = tex.wrapS;
  out.wrapT = tex.wrapT;
  out.magFilter = tex.magFilter;
  out.minFilter = tex.minFilter;
  out.anisotropy = tex.anisotropy;
  out.generateMipmaps = tex.generateMipmaps;
  out.flipY = tex.flipY;
  out.colorSpace = tex.colorSpace;
  out.offset.copy(tex.offset);
  out.repeat.copy(tex.repeat);
  out.center.copy(tex.center);
  out.rotation = tex.rotation;
  out.needsUpdate = true;
  pastelTextures.set(img, out);
  return out;
}

function pastelMaterial(src: Material, spec: ModelSpec): Material {
  const base = src as MeshStandardMaterial;
  const m = new MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  if (spec.textured && base.map) {
    m.map = pastelTexture(base.map);
  } else if (base.color) {
    m.color.set(pastelHex(`#${base.color.getHexString()}`));
  }
  if (spec.tint) m.color.multiply(new Color(spec.tint));
  m.name = base.name;
  return m;
}

/** glTF 장면을 (지오메트리, 파스텔 재질, 변환) 목록으로 펼친다. 바닥 가운데가 원점이 된다 */
function extractParts(root: Object3D, spec: ModelSpec): ModelPart[] {
  root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(root);
  const center = box.getCenter(new Vector3());
  const base = new Matrix4()
    .makeRotationY(spec.yaw)
    .multiply(new Matrix4().makeScale(spec.scale, spec.scale, spec.scale))
    .multiply(new Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));
  const parts: ModelPart[] = [];
  root.traverse((o) => {
    if (!(o as Mesh).isMesh) return;
    const mesh = o as Mesh;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    parts.push({
      geometry: mesh.geometry,
      material: pastelMaterial(mats[0]!, spec),
      matrix: base.clone().multiply(mesh.matrixWorld),
    });
  });
  return parts;
}

const tmpPos = new Vector3();
const tmpQuat = new Quaternion();
const tmpScale = new Vector3();
const Y_AXIS = new Vector3(0, 1, 0);

/** 자리 하나의 변환 행렬 (위치 · y 회전 · 배율) */
export function itemMatrix(item: ModelItem, out = new Matrix4()): Matrix4 {
  tmpPos.set(item.pos[0], item.pos[1], item.pos[2]);
  tmpQuat.setFromAxisAngle(Y_AXIS, item.rotY);
  const s = item.scale ?? 1;
  tmpScale.set(s, s, s);
  return out.compose(tmpPos, tmpQuat, tmpScale);
}

function PartInstances({
  part,
  items,
  shadows,
}: {
  part: ModelPart;
  items: readonly ModelItem[];
  shadows: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new Matrix4();
    items.forEach((item, i) => {
      mesh.setMatrixAt(i, itemMatrix(item, m).multiply(part.matrix));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items, part]);
  return (
    <instancedMesh
      ref={ref}
      args={[part.geometry, part.material, items.length]}
      castShadow={shadows}
      receiveShadow
    />
  );
}

function LoadedModel({
  name,
  items,
  shadows,
}: {
  name: ModelName;
  items: readonly ModelItem[];
  shadows: boolean;
}) {
  const spec: ModelSpec = MODELS[name];
  const gltf = useGLTF(spec.url, false, false);
  const parts = useMemo(() => extractParts(gltf.scene, spec), [gltf, spec]);
  return (
    <group>
      {parts.map((part, i) => (
        <PartInstances key={`${i}-${items.length}`} part={part} items={items} shadows={shadows} />
      ))}
    </group>
  );
}

const fallbackMaterial = new MeshStandardMaterial({ color: '#e9dff0', roughness: 0.9 });

/** 모델을 못 불러왔을 때 같은 자리에 그리는 단순 상자 */
export function FallbackBoxes({ name, items }: { name: ModelName; items: readonly ModelItem[] }) {
  const spec: ModelSpec = MODELS[name];
  const geometry = useMemo(() => {
    const [w, h, d] = spec.box;
    return new BoxGeometry(w, h, d).translate(0, h / 2, 0);
  }, [spec]);
  const part = useMemo<ModelPart>(
    () => ({ geometry, material: fallbackMaterial, matrix: new Matrix4() }),
    [geometry],
  );
  return <PartInstances key={items.length} part={part} items={items} shadows />;
}

interface BoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

/** 에셋 로딩 실패를 잡아 대체 화면을 보여 준다 (설계 문서 §10) */
export class ModelBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[campus] 모델을 불러오지 못해 상자로 대신합니다', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * 같은 모델을 여러 자리에 InstancedMesh로 그린다 (메시 조각마다 드로우콜 1개).
 * 불러오는 동안은 아무것도 그리지 않고, 실패하면 상자로 대신한다.
 */
export function Model({
  name,
  items,
  shadows = false,
}: {
  name: ModelName;
  items: readonly ModelItem[];
  /** 그림자를 만들지 (바깥 소품만 true. 실내 가구는 벽·바닥판이 그림자를 만든다) */
  shadows?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <ModelBoundary fallback={<FallbackBoxes name={name} items={items} />}>
      <Suspense fallback={null}>
        <LoadedModel name={name} items={items} shadows={shadows} />
      </Suspense>
    </ModelBoundary>
  );
}
