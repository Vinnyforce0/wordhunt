import * as THREE from '../libs/three.module.js';

let camera;

const keys = {
  w: false,
  a: false,
  s: false,
  d: false
};

const speed = 0.1;
const sensitivity = 0.01;

// rotação
let yaw = 0;   // esquerda/direita
let pitch = 0; // cima/baixo

export function setupControls(cam) {
  camera = cam;

  // ===============================
  // ⌨️ TECLADO
  // ===============================
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() in keys) {
      keys[e.key.toLowerCase()] = true;
    }
  });

  document.addEventListener("keyup", (e) => {
    if (e.key.toLowerCase() in keys) {
      keys[e.key.toLowerCase()] = false;
    }
  });

  // ===============================
  // 🖱️ ATIVAR POINTER LOCK
  // ===============================
  document.body.addEventListener("click", () => {
    document.body.requestPointerLock();
  });

  // ===============================
  // 🖱️ MOVIMENTO DO MOUSE
  // ===============================
  document.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === document.body) {
      yaw -= e.movementX * sensitivity;
      pitch -= e.movementY * sensitivity;

      // limitar olhar pra cima/baixo
      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

      camera.rotation.order = "YXZ";
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;
    }
  });
}

// ===============================
// 🔄 MOVIMENTO
// ===============================
export function updateControls() {
  if (!camera) return;

  const direction = new THREE.Vector3();

  if (keys.w) direction.z -= 1;
  if (keys.s) direction.z += 1;
  if (keys.a) direction.x -= 1;
  if (keys.d) direction.x += 1;

  direction.normalize();

  // movimento relativo à rotação da câmera
  const move = new THREE.Vector3();
  move.copy(direction).applyEuler(camera.rotation);

  camera.position.add(move.multiplyScalar(speed));
}