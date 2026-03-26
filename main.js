import { scene, camera, renderer } from './js/scene.js';
import { setupControls, updateControls } from './js/controls.js';
import { createWorld } from './js/world.js';

// ===============================
// 🎮 SETUP INICIAL
// ===============================

// cria o mundo
createWorld(scene);

// configura controles
setupControls(camera);

// overlay (tela inicial)
const overlay = document.getElementById("overlay");

// ===============================
// 🖱️ INICIAR JOGO AO CLICAR
// ===============================

overlay.addEventListener("click", () => {
  overlay.style.display = "none";
});

// ===============================
// 🔄 LOOP DO JOGO
// ===============================

function animate() {
  requestAnimationFrame(animate);

  // atualiza controles (movimento)
  updateControls();

  // renderiza a cena
  renderer.render(scene, camera);
}

animate();

// ===============================
// 📱 RESPONSIVIDADE
// ===============================

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===============================
// ⚙️ SERVICE WORKER
// ===============================

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}