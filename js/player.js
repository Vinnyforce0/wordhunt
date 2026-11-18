export const DEFAULT_ENVIRONMENT_ID = "overworld";

export const SPELL_CASTER_ITEM = {
  id: "spellcaster",
  name: "SpellCaster",
  type: "foco de conjuração",
  description:
    "Artefato que canaliza letras coletadas e palavras descobertas para ativar habilidades."
};

export const playerState = {
  currentEnvironment: DEFAULT_ENVIRONMENT_ID,
  storyMoment: "opening",
  inventory: [],
  acquiredLetters: [],
  discoveredWords: [],
  acquiredMissions: [],
  completedMissions: [],
  actions: [],
  foundItems: [],
  npcDialogues: Object.create(null)
};

const acquisitionListeners = new Set();

export function onPlayerAcquisition(listener) {
  acquisitionListeners.add(listener);
  return () => acquisitionListeners.delete(listener);
}

export function hasInventoryItem(itemId) {
  return playerState.inventory.some(
    (item) => item && typeof item === "object" && item.id === itemId
  );
}

export function addInventoryItem(item) {
  if (hasInventoryItem(item.id)) return false;
  const acquiredItem = { ...item };
  playerState.inventory.push(acquiredItem);
  notifyPlayerAcquisition("item", acquiredItem);
  return true;
}

export function addAcquiredLetter(letter) {
  return addUniqueAcquisition(playerState.acquiredLetters, letter, "letter");
}

export function addDiscoveredWord(word) {
  return addUniqueAcquisition(playerState.discoveredWords, word, "word");
}

function addUniqueAcquisition(collection, entry, type) {
  const key = getEntryKey(entry);
  if (
    collection.some((existingEntry) =>
      key === null ? existingEntry === entry : getEntryKey(existingEntry) === key
    )
  ) {
    return false;
  }

  collection.push(entry);
  notifyPlayerAcquisition(type, entry);
  return true;
}

function getEntryKey(entry) {
  if (typeof entry === "string" || typeof entry === "number") {
    return String(entry);
  }
  if (!entry || typeof entry !== "object") return null;

  const key = entry.id ?? entry.value ?? entry.symbol ?? entry.letter ??
    entry.word ?? entry.name ?? entry.label;
  return key === undefined || key === null ? null : String(key);
}

function notifyPlayerAcquisition(type, entry) {
  const acquiredEntry =
    entry && typeof entry === "object" ? { ...entry } : entry;
  const event = { type, entry: acquiredEntry };
  acquisitionListeners.forEach((listener) => listener(event));
}

export function setPlayerEnvironment(environmentId) {
  playerState.currentEnvironment = environmentId;
}

export function setStoryMoment(momentId) {
  playerState.storyMoment = momentId;
}

export function getNpcDialogueState(npcId) {
  if (!playerState.npcDialogues[npcId]) {
    playerState.npcDialogues[npcId] = {
      phase: "idle",
      nextDialogueIndex: 0,
      conversationsStarted: 0,
      conversationsCompleted: 0,
      history: []
    };
  }

  return playerState.npcDialogues[npcId];
}

export function selectNpcDialogues(npc, dialogueState) {
  const conversationNumber = dialogueState.conversationsStarted + 1;
  let selectedVariant = null;
  let selectedPriority = -Infinity;

  for (const variant of npc.dialogueVariants || []) {
    if (!matchesDialogueConditions(variant.conditions || {}, conversationNumber)) {
      continue;
    }

    const priority = Number.isFinite(variant.priority) ? variant.priority : 0;
    if (selectedVariant === null || priority > selectedPriority) {
      selectedVariant = variant;
      selectedPriority = priority;
    }
  }

  return [...(selectedVariant ? selectedVariant.dialogues : npc.dialogues)];
}

function matchesDialogueConditions(conditions, conversationNumber) {
  const requiredItems = conditions.requiredItems || [];
  const excludedItems = conditions.excludedItems || [];
  if (!requiredItems.every(hasInventoryItem)) return false;
  if (excludedItems.some(hasInventoryItem)) return false;

  const progressCollections = {
    acquiredMissions: playerState.acquiredMissions,
    completedMissions: playerState.completedMissions,
    acquiredLetters: playerState.acquiredLetters,
    discoveredWords: playerState.discoveredWords,
    foundItems: playerState.foundItems
  };
  const requiredProgress = conditions.requiredProgress || {};
  const excludedProgress = conditions.excludedProgress || {};

  for (const [collectionName, requiredValues] of Object.entries(requiredProgress)) {
    if (collectionName === "actions") continue;
    const collection = progressCollections[collectionName];
    if (!collection || !requiredValues.every((value) => collectionHasValue(collection, value))) {
      return false;
    }
  }

  for (const [collectionName, excludedValues] of Object.entries(excludedProgress)) {
    if (collectionName === "actions") continue;
    const collection = progressCollections[collectionName];
    if (!collection || excludedValues.some((value) => collectionHasValue(collection, value))) {
      return false;
    }
  }

  const requiredActions = requiredProgress.actions || [];
  const excludedActions = excludedProgress.actions || [];
  if (!requiredActions.every(hasRecordedAction)) return false;
  if (excludedActions.some(hasRecordedAction)) return false;

  const moments = conditions.moments || [];
  if (moments.length > 0 && !moments.includes(playerState.storyMoment)) return false;

  const conversationCount = conditions.conversationCount;
  if (conversationCount) {
    if (
      conversationCount.min !== undefined &&
      conversationNumber < conversationCount.min
    ) {
      return false;
    }
    if (
      conversationCount.max !== undefined &&
      conversationNumber > conversationCount.max
    ) {
      return false;
    }
  }

  return true;
}

function collectionHasValue(collection, expectedValue) {
  return collection.some((entry) => {
    if (entry === expectedValue) return true;
    if (!entry || typeof entry !== "object") return false;

    return [
      entry.id,
      entry.name,
      entry.value,
      entry.symbol,
      entry.letter,
      entry.word
    ].includes(expectedValue);
  });
}

function hasRecordedAction(actionType) {
  return playerState.actions.some((action) => action.type === actionType);
}

export function recordNpcDialogue(npcId, speaker, text) {
  const dialogueState = getNpcDialogueState(npcId);
  dialogueState.history.push({
    speaker,
    text,
    timestamp: Date.now()
  });
}

export function recordPlayerAction(type, details = {}) {
  playerState.actions.push({
    type,
    details: { ...details },
    timestamp: Date.now()
  });
}