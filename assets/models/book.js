import * as THREE from '../../libs/three.module.js';

function createHiResCanvas() {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = 512 * scale;
  canvas.height = 672 * scale;
  const context = canvas.getContext('2d');
  context.scale(scale, scale);
  return { canvas, context };
}

function createCanvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

function wrapText(context, text, maxWidth) {
  const lines = [];
  let line = '';

  for (const word of String(text).split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function createBlankPageTexture() {
  const { canvas, context } = createHiResCanvas();

  context.fillStyle = '#f1e4c4';
  context.fillRect(0, 0, 512, 672);
  return createCanvasTexture(canvas);
}

function createFloatingTextTexture(items) {
  const { canvas, context } = createHiResCanvas();

  context.font = '27px Georgia, serif';
  let y = 148;
  for (const item of items.slice(0, 10)) {
    const textLines = wrapText(context, item, 370).slice(0, 2);

    context.fillStyle = '#8a4c32';
    context.fillText('•', 48, y);
    context.fillStyle = '#49382b';
    textLines.forEach((line, index) => {
      context.fillText(line, 80, y + index * 34);
    });

    y += Math.max(46, textLines.length * 34 + 12);
    if (y > 610) break;
  }

  return createCanvasTexture(canvas);
}

function createFloatingNumberTexture(number) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = '#49382b';
  context.font = '96px Georgia, serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(String(number), 64, 66);
  return createCanvasTexture(canvas);
}

function createRoundedPageGeometry() {
  const width = 0.58;
  const height = 0.82;
  const cornerRadius = 0.035;
  const depth = 0.014;
  const shape = new THREE.Shape();

  shape.moveTo(-width / 2 + cornerRadius, -height / 2);
  shape.lineTo(width / 2 - cornerRadius, -height / 2);
  shape.quadraticCurveTo(
    width / 2,
    -height / 2,
    width / 2,
    -height / 2 + cornerRadius
  );
  shape.lineTo(width / 2, height / 2 - cornerRadius);
  shape.quadraticCurveTo(
    width / 2,
    height / 2,
    width / 2 - cornerRadius,
    height / 2
  );
  shape.lineTo(-width / 2 + cornerRadius, height / 2);
  shape.quadraticCurveTo(
    -width / 2,
    height / 2,
    -width / 2,
    height / 2 - cornerRadius
  );
  shape.lineTo(-width / 2, -height / 2 + cornerRadius);
  shape.quadraticCurveTo(
    -width / 2,
    -height / 2,
    -width / 2 + cornerRadius,
    -height / 2
  );

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 8,
    steps: 1
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function createRoundedCoverGeometry() {
  const width = 0.62;
  const height = 0.88;
  const cornerRadius = 0.055;
  const depth = 0.052;
  const shape = new THREE.Shape();

  shape.moveTo(-width / 2 + cornerRadius, -height / 2);
  shape.lineTo(width / 2 - cornerRadius, -height / 2);
  shape.quadraticCurveTo(
    width / 2,
    -height / 2,
    width / 2,
    -height / 2 + cornerRadius
  );
  shape.lineTo(width / 2, height / 2 - cornerRadius);
  shape.quadraticCurveTo(
    width / 2,
    height / 2,
    width / 2 - cornerRadius,
    height / 2
  );
  shape.lineTo(-width / 2 + cornerRadius, height / 2);
  shape.quadraticCurveTo(
    -width / 2,
    height / 2,
    -width / 2,
    height / 2 - cornerRadius
  );
  shape.lineTo(-width / 2, -height / 2 + cornerRadius);
  shape.quadraticCurveTo(
    -width / 2,
    -height / 2,
    -width / 2 + cornerRadius,
    -height / 2
  );

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.008,
    bevelThickness: 0.012,
    curveSegments: 6,
    steps: 1
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

export function createInventoryBook() {
  const group = new THREE.Group();
  group.name = 'inventory-book';
  const hiddenPositionY = -1.4;
  const visiblePositionY = -0.1;
  group.position.set(0, hiddenPositionY, -0.9);
  group.scale.setScalar(1.2);
  group.visible = false;
  const floatingPageNumbers = new THREE.Group();
  floatingPageNumbers.name = 'inventory-page-numbers';
  floatingPageNumbers.position.copy(group.position);
  floatingPageNumbers.scale.copy(group.scale);
  floatingPageNumbers.visible = false;

  const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x653a2c });
  const coverMaterial = new THREE.MeshBasicMaterial({ color: 0x653a2c });
  const leftPageTexture = createBlankPageTexture();
  const rightPageTexture = createBlankPageTexture();
  const leftTextTexture = createFloatingTextTexture([]);
  const rightTextTexture = createFloatingTextTexture([]);
  const leftPageMaterial = new THREE.MeshBasicMaterial({
    map: leftPageTexture,
    side: THREE.DoubleSide
  });
  const rightPageMaterial = new THREE.MeshBasicMaterial({
    map: rightPageTexture,
    side: THREE.DoubleSide
  });
  const leftTextMaterial = new THREE.MeshBasicMaterial({
    map: leftTextTexture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const rightTextMaterial = new THREE.MeshBasicMaterial({
    map: rightTextTexture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const coverGeometry = createRoundedCoverGeometry();
  const pageGeometry = createRoundedPageGeometry();
  const leftCover = new THREE.Mesh(coverGeometry, coverMaterial);
  const rightCover = new THREE.Mesh(coverGeometry, coverMaterial);
  const leftPage = new THREE.Mesh(pageGeometry, [edgeMaterial, leftPageMaterial]);
  const rightPage = new THREE.Mesh(pageGeometry, [edgeMaterial, rightPageMaterial]);
  const floatingTextGeometry = new THREE.PlaneGeometry(0.52, 0.74);
  const leftFloatingText = new THREE.Mesh(floatingTextGeometry, leftTextMaterial);
  const rightFloatingText = new THREE.Mesh(floatingTextGeometry, rightTextMaterial);
  const pageNumberGeometry = new THREE.PlaneGeometry(0.12, 0.14);
  const leftPageNumber = new THREE.Mesh(
    pageNumberGeometry,
    new THREE.MeshBasicMaterial({
      map: createFloatingNumberTexture(1),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  const rightPageNumber = new THREE.Mesh(
    pageNumberGeometry,
    new THREE.MeshBasicMaterial({
      map: createFloatingNumberTexture(2),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );

  const leftHinge = new THREE.Group();
  const rightHinge = new THREE.Group();
  const leftNumberHinge = new THREE.Group();
  const rightNumberHinge = new THREE.Group();
  leftHinge.position.x = -0.005;
  rightHinge.position.x = 0.005;
  leftHinge.position.z = -0.003;
  rightHinge.position.z = 0.003;
  leftNumberHinge.position.copy(leftHinge.position);
  rightNumberHinge.position.copy(rightHinge.position);
  leftCover.position.set(-0.285, 0, 0);
  rightCover.position.set(0.285, 0, 0);
  leftPage.position.set(-0.285, 0, 0.045);
  rightPage.position.set(0.285, 0, 0.045);
  leftFloatingText.position.set(-0.285, 0, 0.105);
  rightFloatingText.position.set(0.285, 0, 0.105);
  leftPageNumber.position.set(-0.065, -0.35, 0.13);
  rightPageNumber.position.set(0.515, -0.35, 0.13);
  leftHinge.add(leftCover);
  rightHinge.add(rightCover);
  leftHinge.add(leftPage);
  rightHinge.add(rightPage);
  leftHinge.add(leftFloatingText);
  rightHinge.add(rightFloatingText);
  group.add(leftHinge, rightHinge);
  leftNumberHinge.add(leftPageNumber);
  rightNumberHinge.add(rightPageNumber);
  floatingPageNumbers.add(leftNumberHinge, rightNumberHinge);

  const openingPhaseStart = 0.55;
  let openProgress = 0;

  function setOpenProgress(progress) {
    openProgress = Math.max(0, Math.min(1, progress));
    const entranceProgress = Math.min(openProgress / openingPhaseStart, 1);
    const openingProgress = Math.max(
      0,
      (openProgress - openingPhaseStart) / (1 - openingPhaseStart)
    );
    const easedEntrance =
      entranceProgress * entranceProgress * (3 - 2 * entranceProgress);
    const easedOpening =
      openingProgress * openingProgress * (3 - 2 * openingProgress);

    group.position.y =
      hiddenPositionY + (visiblePositionY - hiddenPositionY) * easedEntrance;
    leftHinge.rotation.y = Math.PI / 2 * (1 - easedOpening);
    rightHinge.rotation.y = -Math.PI / 2 * (1 - easedOpening);
    floatingPageNumbers.position.y = group.position.y;
    leftNumberHinge.rotation.y = leftHinge.rotation.y;
    rightNumberHinge.rotation.y = rightHinge.rotation.y;
  }

  function updateInventory(items) {
    const entries = Array.isArray(items) ? items.map(String) : [];
    const leftTexture = createFloatingTextTexture(entries.slice(0, 10));
    const rightTexture = createFloatingTextTexture(entries.slice(10, 20));
    leftTextMaterial.map.dispose();
    rightTextMaterial.map.dispose();
    leftTextMaterial.map = leftTexture;
    rightTextMaterial.map = rightTexture;
    leftTextMaterial.needsUpdate = true;
    rightTextMaterial.needsUpdate = true;
  }

  setOpenProgress(openProgress);
  return { group, floatingPageNumbers, setOpenProgress, updateInventory };
}
