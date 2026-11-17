import * as THREE from '../libs/three.module.js';

let camera;

const keys = {
  w: false,
  a: false,
  s: false,
  d: false
};

const speed = 6;
const sensitivity = 0.01;
const gravity = 18;
const playerHeight = 1.6;
const playerBodyHeight = 1.8;
const playerRadius = 0.35;
const maxStepHeight = 0.35;
const collisionStepSize = 0.1;
const verticalCollisionEpsilon = 0.02;
const coyoteTimeDuration = 0.25;
const jumpVelocity = 6.5;
const worldUp = new THREE.Vector3(0, 1, 0);

// rotação
let yaw = 0;   // esquerda/direita
let pitch = 0; // cima/baixo
let joystickX = 0;
let joystickY = 0;
let verticalVelocity = 0;
let jumpRequested = false;
let coyoteTimeRemaining = 0;
let playerControlsEnabled = true;
let autoLookTarget = null;
let savedCameraView = null;
let resetTouchInput = () => {};
let hills = [];
let platforms = [];
let obstacles = [];
let worldBoundsHalfSize = Infinity;

export function setupControls(cam, world = {}) {
  camera = cam;
  hills = Array.isArray(world.hills)
    ? world.hills
    : world.hill
      ? [world.hill]
      : [];
  platforms = world.platforms || [];
  obstacles = world.obstacles || [];
  worldBoundsHalfSize = world.boundsHalfSize || Infinity;
  setupTouchControls();

  // ===============================
  // ⌨️ TECLADO
  // ===============================
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (playerControlsEnabled && !e.repeat) jumpRequested = true;
      return;
    }

    if (e.key.toLowerCase() in keys) {
      keys[e.key.toLowerCase()] = playerControlsEnabled;
    }
  });

  document.addEventListener("keyup", (e) => {
    if (e.code === "Space") return;

    if (e.key.toLowerCase() in keys) {
      keys[e.key.toLowerCase()] = false;
    }
  });

  // ===============================
  // 🖱️ ATIVAR POINTER LOCK
  // ===============================
  document.body.addEventListener("click", (event) => {
    if (
      event.target instanceof Element &&
      event.target.closest("#debug-button, #debug-hud, #interact-button, #jump-button, #inventory-button")
    ) {
      return;
    }

    if (playerControlsEnabled && !isTouchDevice && document.body.requestPointerLock) {
      document.body.requestPointerLock();
    }
  });

  // ===============================
  // 🖱️ MOVIMENTO DO MOUSE
  // ===============================
  document.addEventListener("mousemove", (e) => {
    if (playerControlsEnabled && document.pointerLockElement === document.body) {
      yaw -= e.movementX * sensitivity;
      pitch -= e.movementY * sensitivity;

      // limitar olhar pra cima/baixo
      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

      camera.rotation.order = "YXZ";
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;
    }
  });

  window.addEventListener("blur", () => {
    Object.keys(keys).forEach((key) => {
      keys[key] = false;
    });
    jumpRequested = false;
    coyoteTimeRemaining = 0;
    resetTouchInput();
  });
}

const isTouchDevice =
  navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;

function setupTouchControls() {
  const controls = document.getElementById("touch-controls");
  const movePad = document.getElementById("move-pad");
  const moveStick = document.getElementById("move-stick");
  const lookZone = document.getElementById("look-zone");
  const jumpButton = document.getElementById("jump-button");

  if (!controls || !movePad || !moveStick || !lookZone || !jumpButton || !isTouchDevice) return;

  controls.hidden = false;
  jumpButton.addEventListener("pointerdown", (event) => {
    if (!playerControlsEnabled) return;
    event.preventDefault();
    jumpButton.setPointerCapture(event.pointerId);
    jumpRequested = true;
  });
  jumpButton.addEventListener("click", (event) => {
    if (playerControlsEnabled && event.detail === 0) jumpRequested = true;
  });

  let movePointerId = null;
  let lookPointerId = null;
  let lastLookX = 0;
  let lastLookY = 0;
  const updateJoystick = (event) => {
    const bounds = movePad.getBoundingClientRect();
    const maxDistance = (bounds.width - moveStick.offsetWidth) / 2;
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    let deltaX = event.clientX - centerX;
    let deltaY = event.clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance > maxDistance) {
      deltaX = (deltaX / distance) * maxDistance;
      deltaY = (deltaY / distance) * maxDistance;
    }

    joystickX = deltaX / maxDistance;
    joystickY = deltaY / maxDistance;
    moveStick.style.left = `calc(50% + ${deltaX}px)`;
    moveStick.style.top = `calc(50% + ${deltaY}px)`;
  };

  movePad.addEventListener("pointerdown", (event) => {
    if (!playerControlsEnabled || movePointerId !== null) return;
    event.preventDefault();
    movePointerId = event.pointerId;
    movePad.setPointerCapture(event.pointerId);
    updateJoystick(event);
  });

  movePad.addEventListener("pointermove", (event) => {
    if (playerControlsEnabled && event.pointerId === movePointerId) {
      updateJoystick(event);
    }
  });

  const resetJoystick = (event) => {
    if (event.pointerId !== movePointerId) return;
    movePointerId = null;
    joystickX = 0;
    joystickY = 0;
    moveStick.style.left = "50%";
    moveStick.style.top = "50%";
  };
  movePad.addEventListener("pointerup", resetJoystick);
  movePad.addEventListener("pointercancel", resetJoystick);

  resetTouchInput = () => {
    movePointerId = null;
    lookPointerId = null;
    joystickX = 0;
    joystickY = 0;
    moveStick.style.left = "50%";
    moveStick.style.top = "50%";
  };

  lookZone.addEventListener("pointerdown", (event) => {
    if (!playerControlsEnabled || lookPointerId !== null) return;
    event.preventDefault();
    lookPointerId = event.pointerId;
    lastLookX = event.clientX;
    lastLookY = event.clientY;
    lookZone.setPointerCapture(event.pointerId);
  });

  lookZone.addEventListener("pointermove", (event) => {
    if (!playerControlsEnabled || event.pointerId !== lookPointerId) return;
    yaw -= (event.clientX - lastLookX) * sensitivity;
    pitch -= (event.clientY - lastLookY) * sensitivity;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
    lastLookX = event.clientX;
    lastLookY = event.clientY;
  });

  const stopLooking = (event) => {
    if (event.pointerId === lookPointerId) lookPointerId = null;
  };
  lookZone.addEventListener("pointerup", stopLooking);
  lookZone.addEventListener("pointercancel", stopLooking);

  window.addEventListener("blur", () => {
    resetTouchInput();
  });
}

// ===============================
// 🔄 MOVIMENTO
// ===============================
export function updateControls(deltaTime = 1 / 60) {
  if (!camera) return;

  deltaTime = Math.min(Math.max(deltaTime, 0), 0.05);
  updateAutomaticCameraTurn(deltaTime);

  if (!playerControlsEnabled) {
    jumpRequested = false;
    return;
  }

  const previousFootY = camera.position.y - playerHeight;
  const previousSurfaceY = getSurfaceHeight(
    camera.position.x,
    camera.position.z,
    previousFootY
  );
  const wasGrounded =
    verticalVelocity <= 0 && Math.abs(previousFootY - previousSurfaceY) < 0.08;

  if (wasGrounded) {
    coyoteTimeRemaining = coyoteTimeDuration;
  } else {
    coyoteTimeRemaining = Math.max(0, coyoteTimeRemaining - deltaTime);
  }

  if (jumpRequested && coyoteTimeRemaining > 0) {
    verticalVelocity = jumpVelocity;
    coyoteTimeRemaining = 0;
  }
  jumpRequested = false;

  const direction = new THREE.Vector3();

  direction.z = (keys.s ? 1 : 0) - (keys.w ? 1 : 0) + joystickY;
  direction.x = (keys.d ? 1 : 0) - (keys.a ? 1 : 0) + joystickX;

  const inputStrength = Math.min(direction.length(), 1);
  if (inputStrength >= 0.12) {
    direction.normalize();
    direction.applyAxisAngle(worldUp, yaw);
    const movement = direction.multiplyScalar(speed * inputStrength * deltaTime);
    const footY = camera.position.y - playerHeight;
    let movementFootY = footY;
    const steps = Math.max(
      1,
      Math.ceil(Math.max(Math.abs(movement.x), Math.abs(movement.z)) / collisionStepSize)
    );

    for (let step = 0; step < steps; step++) {
      const nextX = camera.position.x + movement.x / steps;
      const nextZ = camera.position.z + movement.z / steps;

      if (canOccupy(nextX, camera.position.z, movementFootY, wasGrounded)) {
        camera.position.x = nextX;
        movementFootY = Math.max(
          movementFootY,
          getSurfaceHeight(camera.position.x, camera.position.z, movementFootY)
        );
      }
      if (canOccupy(camera.position.x, nextZ, movementFootY, wasGrounded)) {
        camera.position.z = nextZ;
        movementFootY = Math.max(
          movementFootY,
          getSurfaceHeight(camera.position.x, camera.position.z, movementFootY)
        );
      }
    }
  }

  const previousHeadY = previousFootY + playerBodyHeight;
  verticalVelocity -= gravity * deltaTime;
  let nextFootY = previousFootY + verticalVelocity * deltaTime;

  if (verticalVelocity > 0) {
    const nextHeadY = nextFootY + playerBodyHeight;
    const ceiling = platforms
      .filter((platform) =>
        isOverPlatform(camera.position.x, camera.position.z, platform) &&
        previousHeadY <= platform.bottomY + verticalCollisionEpsilon &&
        nextHeadY >= platform.bottomY - verticalCollisionEpsilon
      )
      .sort((a, b) => a.bottomY - b.bottomY)[0];

    if (ceiling) {
      nextFootY = ceiling.bottomY - playerBodyHeight;
      verticalVelocity = 0;
    }
  } else {
    const landing = platforms
      .filter((platform) =>
        isOverPlatform(camera.position.x, camera.position.z, platform) &&
        previousFootY >= platform.topY - verticalCollisionEpsilon &&
        nextFootY <= platform.topY + verticalCollisionEpsilon
      )
      .sort((a, b) => b.topY - a.topY)[0];

    if (landing) {
      nextFootY = landing.topY;
      verticalVelocity = 0;
    }
  }

  const terrainY = getTerrainHeight(camera.position.x, camera.position.z);
  if (
    verticalVelocity <= 0 &&
    nextFootY <= terrainY + verticalCollisionEpsilon
  ) {
    nextFootY = Math.max(nextFootY, terrainY);
    verticalVelocity = 0;
  }

  camera.position.y = nextFootY + playerHeight;
}

export function setPlayerControlsEnabled(enabled) {
  playerControlsEnabled = enabled;

  if (!enabled) {
    Object.keys(keys).forEach((key) => {
      keys[key] = false;
    });
    joystickX = 0;
    joystickY = 0;
    jumpRequested = false;
    resetTouchInput();
    return;
  }

  autoLookTarget = null;
}

export function turnCameraToward(target) {
  if (!camera) return;

  const deltaX = target.x - camera.position.x;
  const deltaY = target.y - camera.position.y;
  const deltaZ = target.z - camera.position.z;
  const horizontalDistance = Math.hypot(deltaX, deltaZ);

  autoLookTarget = {
    yaw: Math.atan2(-deltaX, -deltaZ),
    pitch: Math.atan2(deltaY, horizontalDistance)
  };
}

export function lookDownForInventory() {
  if (!camera) return;

  savedCameraView = { yaw, pitch };
  autoLookTarget = { yaw, pitch: -Math.PI / 3 };
}

export function restoreCameraView() {
  if (!camera || !savedCameraView) return;

  autoLookTarget = savedCameraView;
  savedCameraView = null;
}

export function isCameraTurning() {
  return autoLookTarget !== null;
}

export function getCoyoteTimeRemaining() {
  return coyoteTimeRemaining;
}

function updateAutomaticCameraTurn(deltaTime) {
  if (!camera || !autoLookTarget || deltaTime === 0) return;

  const yawDifference = getShortestAngleDifference(yaw, autoLookTarget.yaw);
  const pitchDifference = autoLookTarget.pitch - pitch;
  const easing = 1 - Math.exp(-12 * deltaTime);
  yaw += yawDifference * easing;
  pitch += pitchDifference * easing;

  if (Math.abs(yawDifference) < 0.002 && Math.abs(pitchDifference) < 0.002) {
    yaw = autoLookTarget.yaw;
    pitch = autoLookTarget.pitch;
    autoLookTarget = null;
  }

  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}

function getShortestAngleDifference(current, target) {
  let difference = (target - current) % (Math.PI * 2);
  if (difference > Math.PI) difference -= Math.PI * 2;
  if (difference < -Math.PI) difference += Math.PI * 2;
  return difference;
}

function canOccupy(x, z, footY, followsGround = false) {
  if (
    Math.abs(x) > worldBoundsHalfSize - playerRadius ||
    Math.abs(z) > worldBoundsHalfSize - playerRadius
  ) {
    return false;
  }

  if (getTerrainHeight(x, z) > footY + maxStepHeight) return false;

  const candidateFootY = followsGround
    ? Math.max(footY, getSurfaceHeight(x, z, footY))
    : footY;
  const headY = candidateFootY + playerBodyHeight;
  for (const platform of platforms) {
    if (overlapsSolidObject(x, z, candidateFootY, headY, platform)) return false;
  }
  for (const obstacle of obstacles) {
    if (overlapsSolidObject(x, z, candidateFootY, headY, obstacle)) return false;
  }

  return true;
}

function overlapsSolidObject(x, z, footY, headY, object) {
  const nearestX = Math.max(
    object.x - object.halfWidth,
    Math.min(x, object.x + object.halfWidth)
  );
  const nearestZ = Math.max(
    object.z - object.halfDepth,
    Math.min(z, object.z + object.halfDepth)
  );
  const distanceX = x - nearestX;
  const distanceZ = z - nearestZ;
  const overlapsHorizontally =
    distanceX * distanceX + distanceZ * distanceZ <= playerRadius ** 2;
  const overlapsVertically =
    footY < object.topY - verticalCollisionEpsilon &&
    headY > object.bottomY + verticalCollisionEpsilon;

  return overlapsHorizontally && overlapsVertically;
}

function getSurfaceHeight(x, z, footY) {
  let surfaceY = getTerrainHeight(x, z);

  for (const platform of platforms) {
    if (
      isOverPlatform(x, z, platform) &&
      footY >= platform.topY - verticalCollisionEpsilon
    ) {
      surfaceY = Math.max(surfaceY, platform.topY);
    }
  }

  return surfaceY;
}

function isOverPlatform(x, z, platform) {
  const nearestX = Math.max(
    platform.x - platform.halfWidth,
    Math.min(x, platform.x + platform.halfWidth)
  );
  const nearestZ = Math.max(
    platform.z - platform.halfDepth,
    Math.min(z, platform.z + platform.halfDepth)
  );
  const distanceX = x - nearestX;
  const distanceZ = z - nearestZ;
  return distanceX * distanceX + distanceZ * distanceZ <= playerRadius ** 2;
}

function getTerrainHeight(x, z) {
  let terrainY = 0;

  for (const hill of hills) {
    const distance = Math.hypot(x - hill.x, z - hill.z);
    if (distance < hill.radius) {
      const ratio = distance / hill.radius;
      terrainY = Math.max(
        terrainY,
        hill.peakHeight * (1 - ratio * ratio)
      );
    }
  }

  return terrainY;
}