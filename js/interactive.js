import * as THREE from '../libs/three.module.js';
import { DEFAULT_ENVIRONMENT_ID, SPELL_CASTER_ITEM } from './player.js';

const hillDefinitions = [
  {
    id: "hill-1",
    x: 12,
    z: -18,
    radius: 9,
    peakHeight: 6,
    color: 0x4b843b
  },
  {
    id: "hill-2",
    x: -10,
    z: -17,
    radius: 7,
    peakHeight: 4.5,
    color: 0x5b9145
  }
];

const towerDefinition = {
  id: "tower-1",
  x: 32,
  z: 27,
  width: 10,
  depth: 8,
  height: 10,
  roofThickness: 0.25,
  color: 0x77746b
};

const towerTopFloorDefinition = {
  id: "tower-top-floor",
  x: towerDefinition.x,
  z: towerDefinition.z,
  width: towerDefinition.width + 1,
  depth: towerDefinition.depth + 1,
  thickness: towerDefinition.roofThickness,
  topY: towerDefinition.height,
  roundedEdges: true,
  color: 0x568b3d
};

const platformDefinitions = [
  { id: "platform-1", x: 20.5, z: -5, topY: 0.6 },
  { id: "platform-2", x: 20.5, z: -7.5, topY: 1.2 },
  { id: "platform-3", x: 20.5, z: -10, topY: 1.8 },
  { id: "platform-4", x: 20.5, z: -12.5, topY: 2.4 },
  { id: "platform-5", x: 19.2, z: -15.5, topY: 3 },
  { id: "platform-6", x: 18, z: -18, topY: 3.6 },
  towerTopFloorDefinition,
  ...createTowerClimbPlatformDefinitions(towerDefinition)
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
      "Olá! Que bom ver você.",
      "Pelo que parece, Lord Omega despertou novamente e sequestrou as letras e os números do alfabeto.",
      "Eu ficaria tremendamente grato se você pudesse resolver esse pepino para mim.",
      "Tu és meu herói, mas é uma pena que o jogo ainda esteja longe de ficar pronto. Então, na verdade...",
      "Eu sou apenas uma imagem feita por IA. Vivo em um mundo vazio e sem graça e reflito sobre isso todos os dias.",
      "Ou, pelo menos, toda vez que alguém abre este jogo, já que meu código não fica funcionando o tempo todo.",
      "É muito esquisito quando sou desligado; é como se eu ficasse preso em um vazio infinito e gelado, sem nada para ver, sentir ou com quem conversar.",
      "Mas parece que terei que aturar isso até que o jogo esteja completo.",
      "Maldito VINNYFORCE0! Ele é um preguiçoso. Não volta a desenvolver este jogo há dias e...",
      "...",
      "Acho que fui longe demais, hehe.",
      "Quase ia me esquecendo, preciso te ajudar a adquirir os poderes da professia-",
      "Que professia vc me pergunta?",
      "nao sei tambem, eu vi isso a 2 anos, nao lembro",
      "Da uma olhada na biblioteca depois",
      "Enfim, procure a letra B, ele pode te ajudar a desbloquear seus poderes",
      "Eu to aqui pelo alivio comico, a primeira letra do alfabeto sendo a mais inutil do jogo",
      "Adeus, aventureiro."
    ],
    dialogueVariants: [
      {
        priority: 10,
        conditions: {
          requiredItems: ["spellcaster"]
        },
        dialogues: [
          "Então você conseguiu o SpellCaster! Agora pode canalizar letras e palavras para usar habilidades.",
          "E eu posso contribuir com uma letra para os seus feitiços.",
          "A.",
          "É, só A. Mas cheguei primeiro: sou a letra número um!",
          "Também sou uma das vogais mais usadas. Isso conta como experiência, né?",
          "Ainda não? Tudo bem. Quando encontrar outras letras, formamos uma equipe. Eu fico na frente, como sempre.",
          "So nao esquece de mim :)"
        ]
      }
    ]
  },
  {
    id: "npc-2",
    position: {
      x: towerDefinition.x,
      y: towerDefinition.height + 1.25,
      z: towerDefinition.z
    },
    interactionRadius: 4,
    size: 2.5,
    color: 0x45b96c,
    image: "./assets/images/npc-b.svg",
    dialogues: [
      "Opa, estava à sua espera.",
      "Pegue isto: o SpellCaster canaliza as letras que você encontrar e as palavras que descobrir para ativar habilidades.",
      "Você vai precisar dele para seguir sua jornada."
    ],
    dialogueVariants: [
      {
        priority: 10,
        conditions: {
          requiredItems: ["spellcaster"],
          conversationCount: { min: 2 }
        },
        dialogues: [
          "Como está se saindo com o SpellCaster? Use as letras que coletar e as palavras que descobrir para ativar habilidades.",
          "Continue explorando: cada nova combinação pode revelar um poder diferente.",
          "Provavelmente, cairei no esquecimento depois desta conversa.",
          "A propósito...",
          "Não, você NÃO pode nos usar como letras para seus feitiços!",
          "Há uma grande diferença entre usar as letras que você encontra pelo mapa e usar LETRAS QUE SÃO SERES VIVOS!",
          "Isso é meio insensível da sua parte."
        ]
      }
    ],
    reward: { ...SPELL_CASTER_ITEM }
  }
];

const areaOfInterestDefinitions = [];
const worldBoundsHalfSize = 52;

export function createInteractiveWorld(
  scene,
  { environmentId = DEFAULT_ENVIRONMENT_ID, loadingManager } = {}
) {
  scene.userData.environmentId = environmentId;
  createGround(scene, worldBoundsHalfSize, environmentId);
  const towerObstacle = createTower(scene, towerDefinition, environmentId);
  const hills = hillDefinitions.map((definition) => ({
    ...definition,
    environmentId: definition.environmentId || environmentId
  }));
  hills.forEach((hill) => createHill(scene, hill, environmentId));

  const platforms = platformDefinitions.map((definition) =>
    createPlatform(scene, definition, environmentId)
  );
  const npcs = npcDefinitions.map((definition) =>
    createNpc(scene, definition, environmentId, loadingManager)
  );

  return {
    environmentId,
    hill: hills[0] || null,
    hills,
    platforms,
    obstacles: [towerObstacle],
    grassPatches: [{
      x: towerTopFloorDefinition.x,
      z: towerTopFloorDefinition.z,
      width: towerTopFloorDefinition.width - 1,
      depth: towerTopFloorDefinition.depth - 1,
      baseY: towerTopFloorDefinition.topY + 0.015
    }],
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

function createTower(scene, definition, environmentId) {
  const wallHeight = definition.height - definition.roofThickness;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(definition.width, wallHeight, definition.depth),
    new THREE.MeshStandardMaterial({
      color: definition.color,
      roughness: 1
    })
  );
  mesh.name = definition.id;
  mesh.userData.environmentId = environmentId;
  mesh.position.set(definition.x, wallHeight / 2, definition.z);
  scene.add(mesh);

  return {
    id: definition.id,
    environmentId,
    x: definition.x,
    z: definition.z,
    halfWidth: definition.width / 2,
    halfDepth: definition.depth / 2,
    bottomY: 0,
    topY: wallHeight
  };
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
    definition.roundedEdges
      ? createRoundedPlatformGeometry(width, depth, thickness)
      : new THREE.BoxGeometry(width, thickness, depth),
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

function createRoundedPlatformGeometry(width, depth, thickness) {
  const bevelThickness = Math.min(0.08, thickness / 4);
  const bevelSize = Math.min(0.35, width / 8, depth / 8);
  const shapeWidth = width - bevelSize * 2;
  const shapeDepth = depth - bevelSize * 2;
  const halfWidth = shapeWidth / 2;
  const halfDepth = shapeDepth / 2;
  const cornerRadius = Math.min(0.65, shapeWidth / 4, shapeDepth / 4);
  const shape = new THREE.Shape();

  shape.moveTo(-halfWidth + cornerRadius, -halfDepth);
  shape.lineTo(halfWidth - cornerRadius, -halfDepth);
  shape.quadraticCurveTo(
    halfWidth,
    -halfDepth,
    halfWidth,
    -halfDepth + cornerRadius
  );
  shape.lineTo(halfWidth, halfDepth - cornerRadius);
  shape.quadraticCurveTo(
    halfWidth,
    halfDepth,
    halfWidth - cornerRadius,
    halfDepth
  );
  shape.lineTo(-halfWidth + cornerRadius, halfDepth);
  shape.quadraticCurveTo(
    -halfWidth,
    halfDepth,
    -halfWidth,
    halfDepth - cornerRadius
  );
  shape.lineTo(-halfWidth, -halfDepth + cornerRadius);
  shape.quadraticCurveTo(
    -halfWidth,
    -halfDepth,
    -halfWidth + cornerRadius,
    -halfDepth
  );

  const extrusionDepth = thickness - bevelThickness * 2;
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: extrusionDepth,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize,
    bevelThickness,
    curveSegments: 8
  });
  geometry.translate(0, 0, -extrusionDepth / 2);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function createTowerClimbPlatformDefinitions(tower) {
  const platformSize = 3;
  const risePerPlatform = 0.8;
  const platformsPerSide = 4;
  const halfExtent =
    Math.max(tower.width, tower.depth) / 2 + platformSize / 2 + 1.2;
  const sideLength = halfExtent * 2;
  const platformSpacing = sideLength / platformsPerSide;
  const perimeter = sideLength * 4;
  const platformCount = Math.ceil(tower.height / risePerPlatform) - 1;
  const definitions = [];

  for (let index = 0; index < platformCount; index++) {
    const distance = (index * platformSpacing) % perimeter;
    const side = Math.floor(distance / sideLength);
    const offset = distance - side * sideLength;
    let x;
    let z;

    if (side === 0) {
      x = tower.x - halfExtent + offset;
      z = tower.z - halfExtent;
    } else if (side === 1) {
      x = tower.x + halfExtent;
      z = tower.z - halfExtent + offset;
    } else if (side === 2) {
      x = tower.x + halfExtent - offset;
      z = tower.z + halfExtent;
    } else {
      x = tower.x - halfExtent;
      z = tower.z + halfExtent - offset;
    }

    definitions.push({
      id: `tower-climb-${index + 1}`,
      x,
      z,
      width: platformSize,
      depth: platformSize,
      topY: (index + 1) * risePerPlatform,
      color: 0x8a8268
    });
  }

  return definitions;
}

function createNpc(scene, definition, environmentId, loadingManager) {
  const position = definition.position;
  const objectEnvironmentId = definition.environmentId || environmentId;
  const size = definition.size === undefined ? 2.5 : definition.size;
  const y = position.y === undefined ? size / 2 : position.y;
  const color = definition.color === undefined ? 0xffffff : definition.color;
  const dialogues = Array.isArray(definition.dialogues) ? [...definition.dialogues] : [];
  const dialogueVariants = Array.isArray(definition.dialogueVariants)
    ? definition.dialogueVariants.map((variant) => {
        const conditions = variant.conditions || {};
        return {
          ...variant,
          conditions: {
            ...conditions,
            requiredItems: [...(conditions.requiredItems || [])],
            excludedItems: [...(conditions.excludedItems || [])],
            requiredProgress: { ...(conditions.requiredProgress || {}) },
            excludedProgress: { ...(conditions.excludedProgress || {}) },
            moments: [...(conditions.moments || [])],
            conversationCount: conditions.conversationCount
              ? { ...conditions.conversationCount }
              : undefined
          },
          dialogues: [...variant.dialogues]
        };
      })
    : [];
  const reward = definition.reward ? { ...definition.reward } : null;
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
    dialogueVariants,
    reward,
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