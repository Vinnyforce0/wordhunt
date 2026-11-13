export const DEFAULT_ENVIRONMENT_ID = "overworld";

export const playerState = {
  currentEnvironment: DEFAULT_ENVIRONMENT_ID,
  inventory: [],
  acquiredMissions: [],
  completedMissions: [],
  actions: [],
  foundItems: [],
  npcDialogues: Object.create(null)
};

export function setPlayerEnvironment(environmentId) {
  playerState.currentEnvironment = environmentId;
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