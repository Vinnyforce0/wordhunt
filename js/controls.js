let camera;

const keys = {
  w: false,
  a: false,
  s: false,
  d: false
};

const speed = 0.1;

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
}

// ===============================
// 🔄 ATUALIZA MOVIMENTO
// ===============================
export function updateControls() {
  if (!camera) return;

  // frente / trás
  if (keys.w) camera.position.z -= speed;
  if (keys.s) camera.position.z += speed;

  // esquerda / direita
  if (keys.a) camera.position.x -= speed;
  if (keys.d) camera.position.x += speed;
}