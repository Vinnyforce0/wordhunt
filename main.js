import * as THREE from './libs/three.module.js';
import { scene, camera, renderer } from './js/scene.js';
import {
  getCoyoteTimeRemaining,
  isCameraTurning,
  lookDownForInventory,
  restoreCameraView,
  setPlayerControlsEnabled,
  setupControls,
  turnCameraToward,
  updateControls
} from './js/controls.js';
import { createInteractiveWorld } from './js/interactive.js';
import { createInventoryBook } from './assets/models/book.js';
import {
  addInventoryItem,
  DEFAULT_ENVIRONMENT_ID,
  getNpcDialogueState,
  onPlayerAcquisition,
  playerState,
  recordNpcDialogue,
  recordPlayerAction,
  selectNpcDialogues,
  setPlayerEnvironment
} from './js/player.js';
import { createWorld } from './js/world.js';

const overlay = document.getElementById("overlay");
const loadingPanel = document.getElementById("loading-panel");
const loadingProgress = document.getElementById("loading-progress");
const loadingStatus = document.getElementById("loading-status");
const loadingWarning = document.getElementById("loading-warning");
const menuPanel = document.getElementById("menu-panel");
const settingsPanel = document.getElementById("settings-panel");
const loadingManager = new THREE.LoadingManager();
let hasLoadingRequests = false;
let loadingErrorCount = 0;
let loadingFinished = false;

function completeLoading() {
  if (loadingFinished) return;
  loadingFinished = true;
  loadingProgress.value = loadingProgress.max || 1;
  loadingPanel.hidden = true;
  menuPanel.hidden = false;
  overlay.setAttribute("aria-labelledby", "menu-title");

  if (loadingErrorCount > 0) {
    loadingWarning.textContent =
      `${loadingErrorCount} recurso(s) não carregaram; alguns elementos usarão a aparência padrão.`;
    loadingWarning.hidden = false;
  }
}

loadingManager.onStart = () => {
  hasLoadingRequests = true;
  loadingStatus.textContent = "Carregando assets e texturas do ambiente...";
};
loadingManager.onProgress = (_url, loaded, total) => {
  loadingProgress.max = total;
  loadingProgress.value = loaded;
  loadingStatus.textContent = `Carregando ambiente... ${loaded}/${total}`;
};
loadingManager.onError = (url) => {
  loadingErrorCount++;
  loadingStatus.textContent = `Falha ao carregar ${url}`;
};
loadingManager.onLoad = completeLoading;

// ===============================
// 🎮 SETUP INICIAL
// ===============================

// cria o mundo
const environmentId = playerState.currentEnvironment || DEFAULT_ENVIRONMENT_ID;
setPlayerEnvironment(environmentId);
scene.userData.environmentId = environmentId;
camera.userData.environmentId = environmentId;
const interactiveWorld = createInteractiveWorld(scene, {
  environmentId,
  loadingManager
});
const world = {
  ...interactiveWorld,
  ...createWorld(scene, {
    terrainExclusions: interactiveWorld.hills,
    grassPatches: interactiveWorld.grassPatches,
    boundsHalfSize: interactiveWorld.boundsHalfSize,
    environmentId
  })
};

// configura controles
setupControls(camera, world);
const inventoryBook = createInventoryBook();
camera.add(
  inventoryBook.group,
  inventoryBook.floatingPageNumbers,
  inventoryBook.acquisitionEffects
);

// overlay (tela inicial)
const startButton = document.getElementById("start-button");
const settingsButton = document.getElementById("settings-button");
const settingsBackButton = document.getElementById("settings-back-button");
const menuButton = document.getElementById("menu-button");
const grassToggle = document.getElementById("grass-toggle");
const cloudsToggle = document.getElementById("clouds-toggle");
const debugButton = document.getElementById("debug-button");
const debugHud = document.getElementById("debug-hud");
const debugCoyoteTime = document.getElementById("debug-coyote-time");
const debugPositionX = document.getElementById("debug-position-x");
const debugPositionY = document.getElementById("debug-position-y");
const debugPositionZ = document.getElementById("debug-position-z");
const debugNpcId = document.getElementById("debug-npc-id");
const interactButton = document.getElementById("interact-button");
const touchControls = document.getElementById("touch-controls");
const inventoryButton = document.getElementById("inventory-button");
const inventoryStatus = document.getElementById("inventory-status");
const dialogueBubble = document.getElementById("dialogue-bubble");
const dialogueAvatar = document.getElementById("dialogue-avatar");
const dialogueText = document.getElementById("dialogue-text");
const npcs = world.npcs || [];
const areasOfInterest = world.areasOfInterest || [];
const endConversationMessage = "\"interaja novamente para encerrar conversa\"";
const dialogueTypingInterval = 24;
let activeNpc = null;
let activeNpcDialogueState = null;
let activeNpcDialogues = [];
let typingTimer = null;
let fullDialogueText = "";
let dialogueCharacters = [];
let typedCharacterCount = 0;
let inventoryOpen = false;
let inventoryClosePending = false;
let inventoryRestorePending = false;
let inventoryBookProgress = 0;
const pageRaycaster = new THREE.Raycaster();
const pagePointer = new THREE.Vector2();

onPlayerAcquisition(({ type, entry }) => {
  inventoryBook.showAcquisitionCard({ type, entry });
});

// ===============================
// 🖱️ INICIAR JOGO AO CLICAR
// ===============================

startButton.addEventListener("click", () => {
  overlay.hidden = true;
  menuButton.hidden = false;
  menuButton.setAttribute("aria-expanded", "false");
  startButton.textContent = "Continuar";
});

menuButton.addEventListener("click", () => {
  if (inventoryOpen) closeInventory();
  menuPanel.hidden = false;
  settingsPanel.hidden = true;
  overlay.hidden = false;
  menuButton.hidden = true;
  menuButton.setAttribute("aria-expanded", "true");
  interactButton.hidden = true;
});

settingsButton.addEventListener("click", () => {
  menuPanel.hidden = true;
  settingsPanel.hidden = false;
});

settingsBackButton.addEventListener("click", () => {
  settingsPanel.hidden = true;
  menuPanel.hidden = false;
});

grassToggle.addEventListener("change", () => {
  world.setGrassVisible(grassToggle.checked);
});

cloudsToggle.addEventListener("change", () => {
  world.setCloudsVisible(cloudsToggle.checked);
});

debugButton.addEventListener("click", () => {
  debugHud.hidden = !debugHud.hidden;
  debugButton.setAttribute("aria-expanded", String(!debugHud.hidden));
});

interactButton.addEventListener("click", interactWithNearbyNpc);
inventoryButton.addEventListener("click", toggleInventory);
renderer.domElement.addEventListener("pointerdown", (event) => {
  if (!inventoryOpen || inventoryClosePending || event.button !== 0) return;

  const bounds = renderer.domElement.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  pagePointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pagePointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  pageRaycaster.setFromCamera(pagePointer, camera);

  const contentsHit = pageRaycaster.intersectObjects(
    [inventoryBook.textPages.left, inventoryBook.textPages.right],
    false
  )[0];
  if (contentsHit) {
    const side =
      contentsHit.object === inventoryBook.textPages.left ? "left" : "right";
    const destination = inventoryBook.getContentsDestination(
      side,
      contentsHit.uv.y
    );
    if (destination && inventoryBook.goToPage(destination)) {
      event.preventDefault();
      return;
    }
  }

  const hit = pageRaycaster.intersectObjects(
    [inventoryBook.pages.left, inventoryBook.pages.right],
    false
  )[0];
  if (!hit) return;

  const direction = hit.object === inventoryBook.pages.left ? -1 : 1;
  if (inventoryBook.turnPage(direction)) event.preventDefault();
});

document.addEventListener("keydown", (event) => {
  if (event.code === "KeyI" && !event.repeat && overlay.hidden) {
    event.preventDefault();
    toggleInventory();
    return;
  }

  if (event.code === "Escape" && inventoryOpen) {
    event.preventDefault();
    closeInventory();
    return;
  }

  if (event.code === "KeyE" && !event.repeat && overlay.hidden) {
    interactWithNearbyNpc();
  }
});

// ===============================
// 🔄 LOOP DO JOGO
// ===============================

let previousFrameTime = 0;
function animate(timestamp) {
  requestAnimationFrame(animate);

  // atualiza controles (movimento)
  const deltaTime = previousFrameTime === 0
    ? 0
    : Math.min((timestamp - previousFrameTime) / 1000, 0.05);
  previousFrameTime = timestamp;
  if (overlay.hidden || inventoryClosePending) {
    updateControls(deltaTime);
    if (overlay.hidden) {
      if (
        activeNpc &&
        activeNpcDialogueState.phase === "turning" &&
        !isCameraTurning()
      ) {
        showNpcDialogue();
      }
      world.update(deltaTime);
      updateInteractionButton();
      updateDebugHud();
    }
    updateInventoryBook(deltaTime);
  }

  // renderiza a cena
  renderer.render(scene, camera);
}

function updateInteractionButton() {
  const nearbyNpc = npcs.find(isNearPlayer);
  const nearbyArea = areasOfInterest.find(isNearPlayer);
  interactButton.hidden =
    (activeNpcDialogueState && activeNpcDialogueState.phase === "turning") ||
    (!nearbyNpc && !nearbyArea);
  inventoryButton.hidden = Boolean(nearbyNpc || nearbyArea);
  debugNpcId.textContent = nearbyNpc ? String(nearbyNpc.id) : "Nenhum";
}

function isNearPlayer(target) {
  const radius = target.interactionRadius || 3;
  return Math.hypot(
    camera.position.x - target.x,
    camera.position.y - target.y,
    camera.position.z - target.z
  ) <= radius;
}

function interactWithNearbyNpc() {
  const npc = npcs.find(isNearPlayer);
  if (!npc) return;

  if (activeNpc && activeNpc.id !== npc.id) {
    stopDialogueTyping();
    activeNpcDialogueState.phase = "idle";
    activeNpcDialogueState.nextDialogueIndex = 0;
    recordPlayerAction("interrupted_npc_conversation", {
      npcId: activeNpc.id,
      nextNpcId: npc.id
    });
    activeNpc = null;
    activeNpcDialogueState = null;
    activeNpcDialogues = [];
  }

  if (activeNpcDialogueState && activeNpcDialogueState.phase === "turning") {
    return;
  }

  if (!activeNpc) {
    startNpcConversation(npc);
    return;
  }

  if (typingTimer !== null) {
    completeDialogueTyping();
    return;
  }

  if (activeNpcDialogueState.phase === "ending") {
    closeNpcConversation();
    return;
  }

  if (activeNpcDialogueState.nextDialogueIndex < activeNpcDialogues.length) {
    showNextNpcDialogue();
    return;
  }

  activeNpcDialogueState.phase = "ending";
  showDialogueText(activeNpc, endConversationMessage, "system");
}

function startNpcConversation(npc) {
  activeNpc = npc;
  activeNpcDialogueState = getNpcDialogueState(npc.id);
  activeNpcDialogues = selectNpcDialogues(npc, activeNpcDialogueState);
  activeNpcDialogueState.phase = "turning";
  activeNpcDialogueState.nextDialogueIndex = 0;
  activeNpcDialogueState.conversationsStarted++;
  recordPlayerAction("started_npc_conversation", { npcId: npc.id });

  setPlayerControlsEnabled(false);
  turnCameraToward(npc);
  touchControls.classList.add("conversation-active");
}

function showNpcDialogue() {
  activeNpcDialogueState.phase = "dialogue";
  dialogueAvatar.style.backgroundColor = activeNpc.image
    ? "transparent"
    : activeNpc.sprite.material.color.getStyle();
  dialogueAvatar.style.backgroundImage = activeNpc.image
    ? `url("${activeNpc.image}")`
    : "none";
  dialogueBubble.classList.add("is-visible");
  dialogueBubble.setAttribute("aria-hidden", "false");

  if (activeNpcDialogues.length > 0) {
    showNextNpcDialogue();
    return;
  }

  activeNpcDialogueState.phase = "ending";
  showDialogueText(activeNpc, endConversationMessage, "system");
}

function showNextNpcDialogue() {
  const dialogue = String(
    activeNpcDialogues[activeNpcDialogueState.nextDialogueIndex]
  );
  activeNpcDialogueState.nextDialogueIndex++;
  showDialogueText(activeNpc, dialogue, "npc");
}

function showDialogueText(npc, text, speaker) {
  stopDialogueTyping();
  fullDialogueText = text;
  dialogueCharacters = Array.from(text);
  typedCharacterCount = 0;
  dialogueText.textContent = "";
  recordNpcDialogue(npc.id, speaker, text);

  if (dialogueCharacters.length === 0) return;

  typingTimer = window.setInterval(() => {
    typedCharacterCount++;
    dialogueText.textContent = dialogueCharacters
      .slice(0, typedCharacterCount)
      .join("");

    if (typedCharacterCount >= dialogueCharacters.length) {
      stopDialogueTyping();
    }
  }, dialogueTypingInterval);
}

function completeDialogueTyping() {
  stopDialogueTyping();
  typedCharacterCount = dialogueCharacters.length;
  dialogueText.textContent = fullDialogueText;
}

function stopDialogueTyping() {
  if (typingTimer !== null) {
    window.clearInterval(typingTimer);
    typingTimer = null;
  }
}

function closeNpcConversation() {
  const npcId = activeNpc.id;
  if (activeNpc.reward && addInventoryItem(activeNpc.reward)) {
    recordPlayerAction("acquired_item", {
      npcId,
      itemId: activeNpc.reward.id
    });
  }
  activeNpcDialogueState.phase = "idle";
  activeNpcDialogueState.nextDialogueIndex = 0;
  activeNpcDialogueState.conversationsCompleted++;
  recordPlayerAction("ended_npc_conversation", { npcId });

  dialogueBubble.classList.remove("is-visible");
  dialogueBubble.setAttribute("aria-hidden", "true");
  touchControls.classList.remove("conversation-active");
  setPlayerControlsEnabled(true);
  activeNpc = null;
  activeNpcDialogueState = null;
  activeNpcDialogues = [];
}

function updateDebugHud() {
  debugCoyoteTime.textContent = `${getCoyoteTimeRemaining().toFixed(2)} s`;
  debugPositionX.textContent = camera.position.x.toFixed(2);
  debugPositionY.textContent = camera.position.y.toFixed(2);
  debugPositionZ.textContent = camera.position.z.toFixed(2);
}

requestAnimationFrame(animate);

function toggleInventory() {
  if (inventoryClosePending) return;
  if (inventoryOpen) {
    closeInventory();
    return;
  }
  if (!overlay.hidden || activeNpc) return;

  const formatEntries = (entries) => entries.map((item, index) => {
    if (typeof item === "string" || typeof item === "number") {
      return String(item);
    }
    if (item && typeof item === "object") {
      const label = item.name || item.label || item.word || item.letter || item.id;
      if (label !== undefined) return String(label);
    }
    return `Item ${index + 1}`;
  });
  const sections = {
    letters: formatEntries(playerState.acquiredLetters),
    words: formatEntries(playerState.discoveredWords),
    items: formatEntries(playerState.inventory)
  };
  const entries = Object.values(sections).flat();

  inventoryBook.updateInventory(sections);
  inventoryStatus.textContent = entries.length
    ? `Inventário aberto. ${entries.length} registro(s): ${entries.join(", ")}`
    : "Inventário aberto.";
  inventoryOpen = true;
  inventoryButton.disabled = false;
  inventoryButton.textContent = "Fechar livro";
  inventoryButton.setAttribute("aria-label", "Fechar inventário");
  inventoryButton.setAttribute("aria-expanded", "true");
  inventoryBook.group.visible = true;
  inventoryBook.floatingPageNumbers.visible = true;
  inventoryBookProgress = 0;
  inventoryBook.setOpenProgress(inventoryBookProgress);
  touchControls.classList.add("inventory-active");
  setPlayerControlsEnabled(false);
  if (document.pointerLockElement) document.exitPointerLock();
  lookDownForInventory();
}

function closeInventory() {
  if (!inventoryOpen) return;

  inventoryOpen = false;
  inventoryClosePending = true;
  inventoryRestorePending = false;
  inventoryButton.disabled = true;
  inventoryButton.textContent = "Fechando...";
  inventoryButton.setAttribute("aria-label", "Fechando inventário");
  inventoryButton.setAttribute("aria-expanded", "false");
  inventoryStatus.textContent = "Fechando o inventário.";
}

function updateInventoryBook(deltaTime) {
  const progressChange = deltaTime * 2.5; // velocidade de abertura/fechamento do livro
  if (inventoryOpen && !isCameraTurning()) {
    inventoryBookProgress = Math.min(1, inventoryBookProgress + progressChange);
  } else if (inventoryClosePending && !inventoryRestorePending) {
    inventoryBookProgress = Math.max(0, inventoryBookProgress - progressChange);
  }
  inventoryBook.setOpenProgress(inventoryBookProgress);
  inventoryBook.updatePageTurn(deltaTime);
  inventoryBook.updateAcquisitionCards(deltaTime);

  if (
    inventoryClosePending &&
    inventoryBookProgress === 0 &&
    !inventoryRestorePending
  ) {
    inventoryBook.group.visible = false;
    inventoryBook.floatingPageNumbers.visible = false;
    restoreCameraView();
    inventoryRestorePending = true;
  }

  if (
    inventoryClosePending &&
    inventoryRestorePending &&
    !isCameraTurning()
  ) {
    inventoryClosePending = false;
    inventoryRestorePending = false;
    inventoryButton.disabled = false;
    inventoryButton.textContent = "Inventário";
    inventoryButton.setAttribute("aria-label", "Abrir inventário");
    touchControls.classList.remove("inventory-active");
    setPlayerControlsEnabled(true);
    inventoryStatus.textContent = "Inventário fechado.";
  }
}

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

if (!hasLoadingRequests) completeLoading();