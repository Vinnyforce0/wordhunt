import * as THREE from '../libs/three.module.js';
import { DEFAULT_ENVIRONMENT_ID } from './player.js';

export function createWorld(
  scene,
  {
    terrainExclusions = [],
    boundsHalfSize = 30,
    environmentId = DEFAULT_ENVIRONMENT_ID
  } = {}
) {
  scene.userData.environmentId = environmentId;
  scene.background = new THREE.Color(0x87ceeb);

  // ===============================
  // 💡 LUZ
  // ===============================
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 20, 10);
  light.userData.environmentId = environmentId;
  scene.add(light);

  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  ambient.userData.environmentId = environmentId;
  scene.add(ambient);

  // ===============================
  // 🌱 GRAMA 2D
  // ===============================
  const grassPositions = [];
  const grassColors = [];
  const grassColorPalette = [
    new THREE.Color(0x5ca34a),
    new THREE.Color(0x71b557),
    new THREE.Color(0x3f873e)
  ];

  const grassAreaHalfSize = boundsHalfSize - 1;
  for (let i = 0; i < 6000; i++) {
    const x = (Math.random() * 2 - 1) * grassAreaHalfSize;
    const z = (Math.random() * 2 - 1) * grassAreaHalfSize;
    if (terrainExclusions.some((area) =>
      Math.hypot(x - area.x, z - area.z) < area.radius + 0.5
    )) continue;

    const angle = Math.random() * Math.PI;
    const halfWidth = 0.008 + Math.random() * 0.01;
    const height = 0.12 + Math.random() * 0.22;
    const lean = (Math.random() - 0.5) * 0.08;
    const sideX = Math.cos(angle) * halfWidth;
    const sideZ = Math.sin(angle) * halfWidth;
    const leanX = Math.cos(angle + Math.PI / 2) * lean;
    const leanZ = Math.sin(angle + Math.PI / 2) * lean;
    grassPositions.push(
      x - sideX, 0.015, z - sideZ,
      x + sideX, 0.015, z + sideZ,
      x + leanX, 0.015 + height, z + leanZ
    );

    const color = grassColorPalette[Math.floor(Math.random() * grassColorPalette.length)];
    for (let vertex = 0; vertex < 3; vertex++) {
      grassColors.push(color.r, color.g, color.b);
    }
  }

  const grassGeometry = new THREE.BufferGeometry();
  grassGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(grassPositions, 3)
  );
  grassGeometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(grassColors, 3)
  );
  const grass = new THREE.Mesh(
    grassGeometry,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })
  );
  grass.userData.environmentId = environmentId;
  scene.add(grass);

  const cloudMotions = createClouds(scene, boundsHalfSize, environmentId);
  let cloudsVisible = true;
  return {
    environmentId,
    update: (deltaTime) => {
      if (cloudsVisible) updateClouds(cloudMotions, deltaTime);
    },
    setGrassVisible: (visible) => {
      grass.visible = visible;
    },
    setCloudsVisible: (visible) => {
      cloudsVisible = visible;
      for (const motion of cloudMotions) {
        motion.cloud.visible = visible;
      }
    }
  };
}

function createClouds(scene, boundsHalfSize, environmentId) {
  const cloudGeometry = new THREE.SphereGeometry(1, 16, 12);
  const cloudMotions = [];
  const direction = Math.random() * Math.PI * 2;
  const directionX = Math.cos(direction);
  const directionZ = Math.sin(direction);

  for (let i = 0; i < 9; i++) {
    const cloud = new THREE.Group();
    cloud.userData.environmentId = environmentId;
    const puffCount = 5 + Math.floor(Math.random() * 5);
    const cloudSize = 1.6 + Math.random() * 1.8;
    const spawnPosition = findCloudSpawnPosition(
      cloudSize,
      cloudMotions,
      boundsHalfSize
    );
    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xf1f8ff).lerp(
        new THREE.Color(0xffffff),
        Math.random() * 0.6
      ),
      roughness: 1
    });

    const center = new THREE.Mesh(cloudGeometry, cloudMaterial);
    center.userData.environmentId = environmentId;
    center.scale.setScalar(1.25);
    cloud.add(center);

    for (let j = 0; j < puffCount; j++) {
      const vertical = Math.random() * 2 - 1;
      const angle = Math.random() * Math.PI * 2;
      const horizontal = Math.sqrt(1 - vertical * vertical);
      const puff = new THREE.Mesh(cloudGeometry, cloudMaterial);
      puff.userData.environmentId = environmentId;
      puff.position.set(
        Math.cos(angle) * horizontal * 0.9,
        vertical * 0.8,
        Math.sin(angle) * horizontal * 0.9
      );
      puff.scale.setScalar(0.7 + Math.random() * 0.65);
      cloud.add(puff);
    }

    cloud.scale.setScalar(cloudSize);
    cloud.position.set(
      spawnPosition.x,
      18 + Math.random() * 6,
      spawnPosition.z
    );
    scene.add(cloud);

    const speed = 0.35 + Math.random() * 0.5;
    const extent = cloudSize * 2.3;
    cloudMotions.push({
      cloud,
      cloudSize,
      environmentId,
      speedX: directionX * speed,
      speedZ: directionZ * speed,
      wrapX: boundsHalfSize + extent,
      wrapZ: boundsHalfSize + extent
    });
  }

  return cloudMotions;
}

function findCloudSpawnPosition(cloudSize, cloudMotions, boundsHalfSize) {
  let position;

  for (let attempt = 0; attempt < 12; attempt++) {
    position = {
      x: (Math.random() * 2 - 1) * boundsHalfSize,
      z: (Math.random() * 2 - 1) * boundsHalfSize
    };

    const isSpacedFromClouds = cloudMotions.every((motion) => {
      const minimumDistance = (cloudSize + motion.cloudSize) * 2.5;
      return Math.hypot(
        position.x - motion.cloud.position.x,
        position.z - motion.cloud.position.z
      ) >= minimumDistance;
    });

    if (isSpacedFromClouds) break;
  }

  return position;
}

function updateClouds(cloudMotions, deltaTime) {
  for (const motion of cloudMotions) {
    motion.cloud.position.x += motion.speedX * deltaTime;
    motion.cloud.position.z += motion.speedZ * deltaTime;

    if (motion.cloud.position.x > motion.wrapX) {
      motion.cloud.position.x = -motion.wrapX;
    } else if (motion.cloud.position.x < -motion.wrapX) {
      motion.cloud.position.x = motion.wrapX;
    }

    if (motion.cloud.position.z > motion.wrapZ) {
      motion.cloud.position.z = -motion.wrapZ;
    } else if (motion.cloud.position.z < -motion.wrapZ) {
      motion.cloud.position.z = motion.wrapZ;
    }
  }
}