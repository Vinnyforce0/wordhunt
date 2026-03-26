import * as THREE from '../libs/three.module.js';

export function createWorld(scene) {

  // ===============================
  // 🌍 CHÃO
  // ===============================
  const floorGeometry = new THREE.PlaneGeometry(50, 50);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444
  });

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // ===============================
  // 💡 LUZ
  // ===============================
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 20, 10);
  scene.add(light);

  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);

  // ===============================
  // 🧱 CUBOS (OBSTÁCULOS)
  // ===============================
  for (let i = 0; i < 30; i++) {

    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    );

    cube.position.set(
      (Math.random() - 0.5) * 30,
      0.5,
      (Math.random() - 0.5) * 30
    );

    scene.add(cube);
  }
}