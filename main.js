import * as THREE from './libs/three.module.js';
import { scene, camera, renderer } from './js/scene.js';
import {
  getCoyoteTimeRemaining,
  isCameraTurning,
  lookDownForInventory,
  restoreCameraView,
  setPlayerControlsEnabled,
  setPlayerMovementEnabled,
  setupControls,
  turnCameraToward,
  updateControls
} from './js/controls.js';
import { createInteractiveWorld } from './js/interactive.js';
import { createInventoryBook, createSpellCasterModel } from './assets/models/book.js';
import {
  addAcquiredLetter,
  addInventoryItem,
  DEFAULT_ENVIRONMENT_ID,
  getNpcDialogueState,
  hasInventoryItem,
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
const spellCasterModel = createSpellCasterModel();
camera.add(
  inventoryBook.group,
  inventoryBook.floatingPageNumbers,
  inventoryBook.acquisitionEffects,
  spellCasterModel.group
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
  updateSpellCasterInterface();
});

const spellCasterButton = document.getElementById("spellcaster-button");
const spellCasterPanel = document.getElementById("spellcaster-panel");
const spellCasterWord = document.getElementById("spellcaster-word");
const spellCasterKeys = document.getElementById("spellcaster-keys");
const spellCasterBackspace = document.getElementById("spellcaster-backspace");
const spellCasterCast = document.getElementById("spellcaster-cast");
const spellCasterInventory = document.getElementById("spellcaster-inventory");
const spellCasterClose = document.getElementById("spellcaster-close");
const spellCasterStatus = document.getElementById("spellcaster-status");
let spellCasterOpen = false;
let spellCasterEquipped = false;
let typedSpellWord = "";
let spellStatusTimer = null;

function getAcquiredLetterValues() {
  return playerState.acquiredLetters.map((letter) => {
    if (typeof letter === "string" || typeof letter === "number") return String(letter);
    return String(letter.name || letter.label || letter.word || letter.letter || letter.id || "");
  });
}

function getDiscoveredWordValues() {
  return playerState.discoveredWords.map((word) => {
    if (typeof word === "string" || typeof word === "number") return String(word);
    return String(word.name || word.label || word.word || word.id || "");
  });
}

function updateSpellCasterInterface() {
  const acquired = hasInventoryItem("spellcaster");
  spellCasterButton.hidden =
    !acquired || !spellCasterEquipped || inventoryOpen || !overlay.hidden;
  spellCasterModel.group.visible =
    acquired && spellCasterEquipped && spellCasterOpen;
  touchControls.classList.toggle(
    "spellcaster-active",
    acquired && spellCasterEquipped && spellCasterOpen
  );
  if (!acquired || !spellCasterEquipped) {
    closeSpellCaster();
  }

  const letters = getAcquiredLetterValues();
  spellCasterModel.updateLetters(letters);
  spellCasterKeys.replaceChildren();
  [...new Set(letters.map((letter) => letter.trim().toUpperCase()).filter(Boolean))]
    .slice(0, 12)
    .forEach((letter) => {
      const key = document.createElement("button");
      key.type = "button";
      key.textContent = letter;
      key.setAttribute("aria-label", `Adicionar letra ${letter}`);
      key.addEventListener("click", () => appendSpellLetter(letter));
      spellCasterKeys.appendChild(key);
    });

  spellCasterWord.textContent = typedSpellWord;
}

function openSpellCaster() {
  if (!hasInventoryItem("spellcaster") || !spellCasterEquipped || inventoryOpen) return;
  typedSpellWord = "";
  spellCasterOpen = true;
  spellCasterPanel.hidden = false;
  spellCasterButton.setAttribute("aria-expanded", "true");
  spellCasterButton.textContent = "Guardar SpellCaster";
  setPlayerMovementEnabled(false);
  updateSpellCasterInterface();
  showSpellCasterStatus("Escolha letras e conjure uma palavra.");
}

function closeSpellCaster() {
  spellCasterOpen = false;
  spellCasterPanel.hidden = true;
  spellCasterButton.setAttribute("aria-expanded", "false");
  spellCasterButton.textContent = "SpellCaster";
  typedSpellWord = "";
  spellCasterWord.textContent = "";
  spellCasterModel.group.visible = false;
  touchControls.classList.remove("spellcaster-active");
  if (overlay.hidden && !inventoryOpen && !activeNpc) {
    setPlayerMovementEnabled(true);
  }
}

function toggleSpellCasterEquipment() {
  if (!hasInventoryItem("spellcaster")) return;
  spellCasterEquipped = !spellCasterEquipped;
  if (!spellCasterEquipped) closeSpellCaster();
  updateSpellCasterInterface();
  showSpellCasterStatus(
    spellCasterEquipped ? "SpellCaster equipado." : "SpellCaster desequipado."
  );
}

function appendSpellLetter(letter) {
  typedSpellWord = (typedSpellWord + String(letter).trim().toUpperCase()).slice(0, 20);
  spellCasterWord.textContent = typedSpellWord;
}

function showSpellCasterStatus(message) {
  if (spellStatusTimer !== null) window.clearTimeout(spellStatusTimer);
  spellCasterStatus.textContent = message;
  spellCasterStatus.classList.add("is-visible");
  spellStatusTimer = window.setTimeout(() => {
    spellCasterStatus.classList.remove("is-visible");
  }, 2400);
}

function castFireEffect() {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 1.1, 12),
    new THREE.MeshBasicMaterial({
      color: 0xff5a16,
      transparent: true,
      opacity: 0.82,
      depthWrite: false
    })
  );
  flame.position.copy(camera.position).add(direction.multiplyScalar(1.2));
  flame.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize()
  );
  flame.userData.life = 0.65;
  scene.add(flame);
  const flameLight = new THREE.PointLight(0xff7a24, 2.4, 4);
  flameLight.position.copy(flame.position);
  scene.add(flameLight);
  flame.userData.light = flameLight;
}

function castSpellWord() {
  const word = typedSpellWord.trim().toUpperCase();
  if (!word) return;

  const discovered = getDiscoveredWordValues()
    .map((entry) => entry.trim().toUpperCase());
  if (!discovered.includes(word)) {
    showSpellCasterStatus("palavra desconhecida");
    return;
  }

  showSpellCasterStatus(`Palavra conjurada: ${word}`);
  recordPlayerAction("cast_spell", { word });
  if (word === "FIRE") castFireEffect();
  typedSpellWord = "";
  spellCasterWord.textContent = "";
}

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

spellCasterButton.addEventListener("click", () => {
  if (spellCasterOpen) closeSpellCaster();
  else openSpellCaster();
});
spellCasterClose.addEventListener("click", closeSpellCaster);
spellCasterBackspace.addEventListener("click", () => {
  typedSpellWord = typedSpellWord.slice(0, -1);
  spellCasterWord.textContent = typedSpellWord;
});
spellCasterCast.addEventListener("click", castSpellWord);
spellCasterInventory.addEventListener("click", () => {
  closeSpellCaster();
  toggleInventory();
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

  const cardHit = inventoryBook.inventoryCards.visible
    ? pageRaycaster.intersectObjects(inventoryBook.inventoryCards.children, false)[0]
    : null;
  if (cardHit) {
    const inventoryEntry = cardHit.object.userData.inventoryEntry;
    if (
      inventoryEntry?.sectionId === "items" &&
      inventoryEntry.label.trim().toLowerCase() === "spellcaster"
    ) {
      toggleSpellCasterEquipment();
    }
    event.preventDefault();
    return;
  }

  const hit = pageRaycaster.intersectObjects(
    [inventoryBook.pages.left, inventoryBook.pages.right],
    false
  )[0];
  if (!hit) return;

  const direction = hit.object === inventoryBook.pages.left ? -1 : 1;
  if (inventoryBook.turnPage(direction)) event.preventDefault();
});

renderer.domElement.addEventListener("pointerdown", (event) => {
  if (!spellCasterOpen || event.button !== 0) return;
  const bounds = renderer.domElement.getBoundingClientRect();
  pagePointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pagePointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  pageRaycaster.setFromCamera(pagePointer, camera);
  const keyHit = pageRaycaster.intersectObject(
    spellCasterModel.keyMeshes,
    true
  )[0];
  if (keyHit?.object.userData.spellCasterLetter) {
    appendSpellLetter(keyHit.object.userData.spellCasterLetter);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.code === "KeyT" && !event.repeat && overlay.hidden) {
    event.preventDefault();
    if (spellCasterOpen) closeSpellCaster();
    else openSpellCaster();
    return;
  }

  if (spellCasterOpen && /^[a-zA-Z]$/.test(event.key) && !event.repeat) {
    const letter = event.key.toUpperCase();
    if (getAcquiredLetterValues().some((value) => value.toUpperCase() === letter)) {
      appendSpellLetter(letter);
    }
    return;
  }

  if (spellCasterOpen && event.code === "Backspace") {
    event.preventDefault();
    typedSpellWord = typedSpellWord.slice(0, -1);
    spellCasterWord.textContent = typedSpellWord;
    return;
  }

  if (spellCasterOpen && event.code === "Enter") {
    event.preventDefault();
    castSpellWord();
    return;
  }

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

  if (event.code === "Escape" && spellCasterOpen) {
    event.preventDefault();
    closeSpellCaster();
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
function updateSpellEffects(deltaTime) {
  for (const object of [...scene.children]) {
    if (typeof object.userData.life !== "number") continue;
    object.userData.life -= deltaTime;
    object.scale.setScalar(Math.max(0.05, object.userData.life / 0.65));
    if (object.material) object.material.opacity = Math.max(0, object.userData.life / 0.65);
    if (object.userData.light) object.userData.light.intensity = object.userData.life * 3.7;
    if (object.userData.life <= 0) {
      if (object.userData.light) scene.remove(object.userData.light);
      scene.remove(object);
      object.geometry?.dispose();
      object.material?.dispose();
    }
  }
}
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
      updateSpellEffects(deltaTime);
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
  inventoryButton.hidden =
    !inventoryOpen && (spellCasterOpen || Boolean(nearbyNpc || nearbyArea));
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
  if (
    activeNpc.id === "npc-1" &&
    hasInventoryItem("spellcaster") &&
    dialogue.trim() === "A."
  ) {
    addAcquiredLetter("A");
  }
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
  setPlayerMovementEnabled(!spellCasterOpen);
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

  const formatEntry = (item, index) => {
    if (typeof item === "string" || typeof item === "number") {
      return String(item);
    }
    if (item && typeof item === "object") {
      const label = item.name || item.label || item.word || item.letter || item.id;
      if (label !== undefined) return String(label);
    }
    return `Item ${index + 1}`;
  };
  const sections = {
    letters: [...playerState.acquiredLetters],
    words: [...playerState.discoveredWords],
    items: [...playerState.inventory]
  };
  const entries = Object.values(sections).flat().map(formatEntry);

  inventoryBook.updateInventory(sections);
  inventoryStatus.textContent = entries.length
    ? `Inventário aberto. ${entries.length} registro(s): ${entries.join(", ")}`
    : "Inventário aberto.";
  inventoryOpen = true;
  if (spellCasterOpen) closeSpellCaster();
  spellCasterButton.hidden = true;
  inventoryButton.disabled = false;
  inventoryButton.textContent = "Fechar livro";
  inventoryButton.setAttribute("aria-label", "Fechar inventário");
  inventoryButton.setAttribute("aria-expanded", "true");
  inventoryBook.group.visible = true;
  inventoryBook.floatingPageNumbers.visible = true;
  inventoryBookProgress = 0;
  inventoryBook.setOpenProgress(inventoryBookProgress);
  touchControls.classList.add("inventory-active");
  updateSpellCasterInterface();
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
    setPlayerMovementEnabled(!spellCasterOpen);
    inventoryStatus.textContent = "Inventário fechado.";
    updateSpellCasterInterface();
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