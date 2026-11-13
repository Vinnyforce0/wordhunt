import * as THREE from '../libs/three.module.js';
import { DEFAULT_ENVIRONMENT_ID } from './player.js';

const hillDefinition = {
  id: "hill-1",
  x: 12,
  z: -18,
  radius: 9,
  peakHeight: 6,
  color: 0x4b843b
};

const platformDefinitions = [
  { id: "platform-1", x: 20.5, z: -5, topY: 0.6 },
  { id: "platform-2", x: 20.5, z: -7.5, topY: 1.2 },
  { id: "platform-3", x: 20.5, z: -10, topY: 1.8 },
  { id: "platform-4", x: 20.5, z: -12.5, topY: 2.4 },
  { id: "platform-5", x: 19.2, z: -15.5, topY: 3 },
  { id: "platform-6", x: 18, z: -18, topY: 3.6 }
];

const npcDefinitions = [
  {
    id: "npc-1",
    position: { x: -20, y: 1.25, z: 20 },
    interactionRadius: 4,
    size: 2.5,
    color: 0xff42a1,
    image: "./assets/images/npc-a.svg",
    dialogues: [
      "Olá! Que bom encontrar você.",
      "Estou explorando este lugar. Volte para conversarmos mais!"
    ]
  }
];

const areaOfInterestDefinitions = [];
const worldBoundsHalfSize = 30;

export function createInteractiveWorld(
  scene,
  { environmentId = DEFAULT_ENVIRONMENT_ID, loadingManager } = {}
) {
  scene.userData.environmentId = environmentId;
  createGround(scene, worldBoundsHalfSize, environmentId);
  const hill = {
    ...hillDefinition,
    environmentId: hillDefinition.environmentId || environmentId
  };
  createHill(scene, hill, environmentId);

  const platforms = platformDefinitions.map((definition) =>
    createPlatform(scene, definition, environmentId)
  );
  const npcs = npcDefinitions.map((definition) =>
    createNpc(scene, definition, environmentId, loadingManager)
  );

  return {
    environmentId,
    hill,
    platforms,
    npcs,
    areasOfInterest: areaOfInterestDefinitions.map((area) => ({
      ...area,
      environmentId: area.environmentId || environmentId
    })),
    boundsHalfSize: worldBoundsHalfSize
  };
}

function createGround(scene, boundsHalfSize, environmentId) {
  const thickness = 0.8;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(boundsHalfSize * 2, thickness, boundsHalfSize * 2),
    new THREE.MeshStandardMaterial({ color: 0x4c9a43, roughness: 1 })
  );
  mesh.name = "ground";
  mesh.userData.environmentId = environmentId;
  mesh.position.y = -thickness / 2;
  scene.add(mesh);
}

function createHill(scene, hill, environmentId) {
  const mesh = new THREE.Mesh(
    createHillGeometry(hill.radius, hill.peakHeight),
    new THREE.MeshStandardMaterial({
      color: hill.color,
      roughness: 1,
      side: THREE.DoubleSide
    })
  );
  mesh.name = hill.id;
  mesh.userData.environmentId = hill.environmentId || environmentId;
  mesh.position.set(hill.x, 0, hill.z);
  scene.add(mesh);
}

function createPlatform(scene, definition, environmentId) {
  const objectEnvironmentId = definition.environmentId || environmentId;
  const width = definition.width === undefined ? 3.2 : definition.width;
  const depth = definition.depth === undefined ? 2.8 : definition.depth;
  const thickness = definition.thickness === undefined ? 0.5 : definition.thickness;
  const topY = definition.topY;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, thickness, depth),
    new THREE.MeshStandardMaterial({
      color: definition.color === undefined ? 0x8a8268 : definition.color,
      roughness: 1
    })
  );
  mesh.name = definition.id;
  mesh.userData.environmentId = objectEnvironmentId;
  mesh.position.set(definition.x, topY - thickness / 2, definition.z);
  scene.add(mesh);

  return {
    id: definition.id,
    environmentId: objectEnvironmentId,
    x: definition.x,
    z: definition.z,
    topY,
    halfWidth: width / 2,
    halfDepth: depth / 2,
    bottomY: topY - thickness
  };
}

function createNpc(scene, definition, environmentId, loadingManager) {
  const position = definition.position;
  const objectEnvironmentId = definition.environmentId || environmentId;
  const size = definition.size === undefined ? 2.5 : definition.size;
  const y = position.y === undefined ? size / 2 : position.y;
  const color = definition.color === undefined ? 0xffffff : definition.color;
  const dialogues = Array.isArray(definition.dialogues) ? [...definition.dialogues] : [];
  const material = new THREE.SpriteMaterial({ color });
  if (definition.image) {
    new THREE.TextureLoader(loadingManager).load(
      definition.image,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        material.map = texture;
        material.color.set(0xffffff);
        material.transparent = true;
        material.alphaTest = 0.05;
        material.depthWrite = false;
        material.needsUpdate = true;
      },
      undefined,
      (error) => {
        console.error(`Não foi possível carregar a imagem do NPC "${definition.id}".`, error);
      }
    );
  }

  const sprite = new THREE.Sprite(material);
  sprite.name = definition.id;
  sprite.userData.id = definition.id;
  sprite.userData.environmentId = objectEnvironmentId;
  sprite.position.set(
    position.x,
    y,
    position.z
  );
  sprite.scale.set(size, size, 1);
  scene.add(sprite);

  return {
    id: definition.id,
    environmentId: objectEnvironmentId,
    x: position.x,
    y,
    z: position.z,
    interactionRadius: definition.interactionRadius === undefined
      ? 3
      : definition.interactionRadius,
    image: definition.image || null,
    dialogues,
    sprite
  };
}

function createHillGeometry(radius, peakHeight) {
  const radialSegments = 24;
  const heightSegments = 12;
  const positions = [0, peakHeight, 0];
  const indices = [];

  for (let ring = 1; ring <= heightSegments; ring++) {
    const ringRadius = (radius * ring) / heightSegments;
    const ringHeight = peakHeight * (1 - (ringRadius / radius) ** 2);

    for (let segment = 0; segment < radialSegments; segment++) {
      const angle = (segment / radialSegments) * Math.PI * 2;
      positions.push(
        Math.cos(angle) * ringRadius,
        ringHeight,
        Math.sin(angle) * ringRadius
      );
    }
  }

  for (let segment = 0; segment < radialSegments; segment++) {
    const nextSegment = (segment + 1) % radialSegments;
    indices.push(0, 1 + nextSegment, 1 + segment);
  }

  for (let ring = 0; ring < heightSegments - 1; ring++) {
    const innerStart = 1 + ring * radialSegments;
    const outerStart = innerStart + radialSegments;

    for (let segment = 0; segment < radialSegments; segment++) {
      const nextSegment = (segment + 1) % radialSegments;
      const inner = innerStart + segment;
      const innerNext = innerStart + nextSegment;
      const outer = outerStart + segment;
      const outerNext = outerStart + nextSegment;
      indices.push(inner, outerNext, outer, inner, innerNext, outerNext);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
