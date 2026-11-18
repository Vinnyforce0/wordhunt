import * as THREE from '../../libs/three.module.js';

const ITEMS_PER_PAGE = 4;
const TABLE_OF_CONTENTS_PAGE_COUNT = 2;
const TABLE_OF_CONTENTS_LINK_AREAS = [
  { top: 120, bottom: 265 },
  { top: 295, bottom: 440 },
  { top: 470, bottom: 615 }
];

function createHiResCanvas(scale = 2) {
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

  context.font = '46px Georgia, serif';
  let y = 132;
  for (const item of items.slice(0, ITEMS_PER_PAGE)) {
    const textLines = wrapText(context, item, 370).slice(0, 2);

    context.fillStyle = '#8a4c32';
    context.fillText('•', 48, y);
    context.fillStyle = '#49382b';
    textLines.forEach((line, index) => {
      context.fillText(line, 80, y + index * 54);
    });

    y += Math.max(64, textLines.length * 54 + 12);
    if (y > 620) break;
  }

  return createCanvasTexture(canvas);
}

function createTableOfContentsTitleTexture() {
  const { canvas, context } = createHiResCanvas();

  context.fillStyle = '#49382b';
  context.font = '52px Georgia, serif';
  context.fillText('Sumário', 48, 180);

  return createCanvasTexture(canvas);
}

function createTableOfContentsLinksTexture(sections) {
  const { canvas, context } = createHiResCanvas();
  const rowPositions = [165, 340, 515];

  context.font = '40px Georgia, serif';
  sections.forEach((section, index) => {
    const textLines = wrapText(context, section.title, 390).slice(0, 2);
    const y = rowPositions[index];
    context.fillStyle = '#8a4c32';
    context.fillText('•', 42, y);
    context.fillStyle = '#49382b';
    textLines.forEach((line, lineIndex) => {
      context.fillText(line, 78, y + lineIndex * 48);
    });
  });

  return createCanvasTexture(canvas);
}

function createFloatingNumberTexture(number) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = '#49382b';
  context.font = `${Math.min(96, 180 / String(number).length)}px Georgia, serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(String(number), 64, 66);
  return createCanvasTexture(canvas);
}

function createAcquisitionCardTexture({ type, entry }) {
  const { canvas, context } = createHiResCanvas(3);
  const typeLabels = {
    item: 'ITEM ADQUIRIDO',
    letter: 'LETRA LIBERTADA',
    word: 'PALAVRA DESCOBERTA'
  };
  const title =
    typeof entry === 'string' || typeof entry === 'number'
      ? String(entry)
      : entry && typeof entry === 'object'
        ? String(entry.name || entry.label || entry.word || entry.letter || entry.id || 'Nova descoberta')
        : 'Nova descoberta';
  const description =
    entry && typeof entry === 'object' && entry.description
      ? String(entry.description)
      : type === 'letter'
        ? 'Uma nova letra para suas combinações.'
        : type === 'word'
          ? 'Uma nova palavra para seus feitiços.'
          : 'Um novo item para sua jornada.';

  context.fillStyle = '#202b38';
  context.fillRect(0, 0, 512, 672);
  context.strokeStyle = '#f2d27b';
  context.lineWidth = 8;
  context.strokeRect(18, 18, 476, 636);
  context.strokeStyle = 'rgba(242, 210, 123, 0.48)';
  context.lineWidth = 2;
  context.strokeRect(34, 34, 444, 604);

  context.textAlign = 'center';
  context.fillStyle = '#f2d27b';
  context.font = '26px Georgia, serif';
  context.fillText(typeLabels[type] || 'NOVA DESCOBERTA', 256, 116);
  context.fillStyle = '#fff6dc';
  context.font = 'bold 42px Georgia, serif';
  const titleLines = wrapText(context, title, 410).slice(0, 3);
  titleLines.forEach((line, index) => {
    context.fillText(line, 256, 258 + index * 54);
  });

  context.fillStyle = '#d9cda9';
  context.font = '25px Georgia, serif';
  const descriptionLines = wrapText(context, description, 390).slice(0, 5);
  descriptionLines.forEach((line, index) => {
    context.fillText(line, 256, 440 + index * 38);
  });

  const texture = createCanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
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

export function createSpellCasterModel() {
  const group = new THREE.Group();
  group.name = 'spellcaster-model';
  group.position.set(0.72, -0.38, -1.05);
  group.rotation.set(-0.08, -0.12, 0);
  group.scale.setScalar(0.82);
  group.visible = false;

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.78, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0x302f67,
      roughness: 0.42,
      metalness: 0.18
    })
  );
  body.name = 'spellcaster-body';
  body.position.z = -0.03;
  group.add(body);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.68),
    new THREE.MeshBasicMaterial({
      color: 0x17162d,
      transparent: true,
      opacity: 0.96,
      side: THREE.DoubleSide
    })
  );
  screen.position.z = 0.035;
  group.add(screen);

  let letters = [];
  const keyGroup = new THREE.Group();
  keyGroup.name = 'spellcaster-keys';
  group.add(keyGroup);

  function rebuildKeys(nextLetters) {
    letters = [...new Set(nextLetters.map((letter) => String(letter).trim().toUpperCase()).filter(Boolean))];
    for (const child of [...keyGroup.children]) {
      keyGroup.remove(child);
      if (child.material) {
        child.material.dispose();
        if (child.material.map) child.material.map.dispose();
      }
      if (child.geometry) child.geometry.dispose();
    }

    letters.slice(0, 12).forEach((letter, index) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const context = canvas.getContext('2d');
      context.fillStyle = '#c9b66b';
      context.fillRect(8, 8, 112, 112);
      context.strokeStyle = '#fff6dc';
      context.lineWidth = 5;
      context.strokeRect(14, 14, 100, 100);
      context.fillStyle = '#202038';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = 'bold 72px Arial';
      context.fillText(letter, 64, 68);

      const texture = createCanvasTexture(canvas);
      const key = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, 0.12),
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide
        })
      );
      const column = index % 3;
      const row = Math.floor(index / 3);
      key.position.set(-0.19 + column * 0.19, 0.18 - row * 0.19, 0.045);
      key.userData.spellCasterLetter = letter;
      keyGroup.add(key);
    });
  }

  rebuildKeys([]);

  return {
    group,
    keyMeshes: keyGroup,
    updateLetters: rebuildKeys
  };
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
  const acquisitionEffects = new THREE.Group();
  acquisitionEffects.name = 'inventory-acquisition-effects';
  acquisitionEffects.position.set(0, 0, -0.9);
  acquisitionEffects.scale.setScalar(1.2);
  acquisitionEffects.visible = false;
  const inventoryCards = new THREE.Group();
  inventoryCards.name = 'inventory-floating-cards';
  group.add(inventoryCards);

  const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x003aac });
  const coverMaterial = new THREE.MeshBasicMaterial({ color: 0x003aac });
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
  const leftPage = new THREE.Mesh(pageGeometry, [leftPageMaterial, edgeMaterial]);
  const rightPage = new THREE.Mesh(pageGeometry, [rightPageMaterial, edgeMaterial]);
  const pageTurnPivot = new THREE.Group();
  pageTurnPivot.name = 'inventory-page-turn';
  pageTurnPivot.visible = false;
  const pageTurnMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 0.82),
    leftPageMaterial
  );
  pageTurnMesh.renderOrder = 1;
  pageTurnPivot.add(pageTurnMesh);
  const floatingTextGeometry = new THREE.PlaneGeometry(0.52, 0.74);
  const acquisitionCardGeometry = new THREE.PlaneGeometry(0.36, 0.48);
  const inventoryCardGeometry = new THREE.PlaneGeometry(0.23, 0.3);
  const acquisitionHaloGeometry = new THREE.RingGeometry(0.2, 0.23, 48);
  const leftFloatingText = new THREE.Mesh(floatingTextGeometry, leftTextMaterial);
  const rightFloatingText = new THREE.Mesh(floatingTextGeometry, rightTextMaterial);
  const pageNumberGeometry = new THREE.PlaneGeometry(0.12, 0.14);
  const leftPageNumberMaterial = new THREE.MeshBasicMaterial({
    map: createFloatingNumberTexture(1),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const rightPageNumberMaterial = new THREE.MeshBasicMaterial({
    map: createFloatingNumberTexture(2),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const leftPageNumber = new THREE.Mesh(
    pageNumberGeometry,
    leftPageNumberMaterial
  );
  const rightPageNumber = new THREE.Mesh(
    pageNumberGeometry,
    rightPageNumberMaterial
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
  leftPageNumber.position.set(-0.05, -0.3, 0.13);
  rightPageNumber.position.set(0.45, -0.3, 0.13);
  
  leftHinge.add(leftCover);
  rightHinge.add(rightCover);
  leftHinge.add(leftPage);
  rightHinge.add(rightPage);
  leftHinge.add(leftFloatingText);
  rightHinge.add(rightFloatingText);
  group.add(leftHinge, rightHinge, pageTurnPivot);
  
  leftNumberHinge.add(leftPageNumber);
  rightNumberHinge.add(rightPageNumber);
  floatingPageNumbers.add(leftNumberHinge, rightNumberHinge);

  const openingPhaseStart = 0.55;
  const pageTurnDuration = 0.4;
  let openProgress = 0;
  let firstVisiblePage = 1;
  let sections = [];
  let pageTurn = null;
  const acquisitionCardQueue = [];
  let activeAcquisitionCard = null;
  let inventoryCardTime = 0;
  const sectionDefinitions = [
    {
      id: 'letters',
      title: 'Letras adquiridas',
      emptyMessage: 'Nenhuma letra adquirida ainda.'
    },
    {
      id: 'words',
      title: 'Palavras achadas',
      emptyMessage: 'Nenhuma palavra achada ainda.'
    },
    {
      id: 'items',
      title: 'Itens coletados',
      emptyMessage: 'Nenhum item coletado ainda.'
    }
  ];

  function replaceNumberTexture(material, number) {
    material.map.dispose();
    material.map = createFloatingNumberTexture(number);
    material.needsUpdate = true;
  }

  function updateVisiblePages() {
    const leftTexture = createPageTexture(firstVisiblePage);
    const rightTexture = createPageTexture(firstVisiblePage + 1);
    leftTextMaterial.map.dispose();
    rightTextMaterial.map.dispose();
    leftTextMaterial.map = leftTexture;
    rightTextMaterial.map = rightTexture;
    leftTextMaterial.needsUpdate = true;
    rightTextMaterial.needsUpdate = true;
    replaceNumberTexture(leftPageNumberMaterial, firstVisiblePage);
    replaceNumberTexture(rightPageNumberMaterial, firstVisiblePage + 1);
    updateInventoryCards();
  }

  function createPageTexture(pageNumber) {
    if (pageNumber === 1) return createTableOfContentsTitleTexture();
    if (pageNumber === 2) return createTableOfContentsLinksTexture(sections);

    const section = sections.find(
      (entry) => pageNumber >= entry.startPage && pageNumber <= entry.endPage
    );
    if (!section) return createFloatingTextTexture([]);
    if (section.entries.length === 0) {
      return pageNumber === section.startPage
        ? createFloatingTextTexture([section.emptyMessage])
        : createFloatingTextTexture([]);
    }

    return createFloatingTextTexture([]);
  }

  function getEntryLabel(entry) {
    if (typeof entry === 'string' || typeof entry === 'number') {
      return String(entry);
    }
    if (!entry || typeof entry !== 'object') return 'Nova descoberta';
    return String(
      entry.name || entry.label || entry.word || entry.letter || entry.id ||
      'Nova descoberta'
    );
  }

  function updateInventoryCards() {
    for (const card of [...inventoryCards.children]) {
      inventoryCards.remove(card);
      card.material.map.dispose();
      card.material.dispose();
    }

    for (const side of ['left', 'right']) {
      const pageNumber = firstVisiblePage + (side === 'right' ? 1 : 0);
      const section = sections.find(
        (entry) => pageNumber >= entry.startPage && pageNumber <= entry.endPage
      );
      if (!section || section.entries.length === 0) continue;

      const firstEntryIndex = (pageNumber - section.startPage) * ITEMS_PER_PAGE;
      const pageEntries = section.entries.slice(
        firstEntryIndex,
        firstEntryIndex + ITEMS_PER_PAGE
      );
      const pageCenterX = side === 'left' ? -0.285 : 0.285;
      pageEntries.forEach((entry, index) => {
        const texture = createAcquisitionCardTexture({
          type: section.id === 'letters'
            ? 'letter'
            : section.id === 'words'
              ? 'word'
              : 'item',
          entry
        });
        const card = new THREE.Mesh(
          inventoryCardGeometry,
          new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
          })
        );
        const column = index % 2;
        const row = Math.floor(index / 2);
        const baseY = row === 0 ? 0.17 : -0.17;
        card.position.set(
          pageCenterX + (column === 0 ? -0.13 : 0.13),
          baseY,
          0.12
        );
        card.renderOrder = 4;
        card.userData.baseY = baseY;
        card.userData.inventoryEntry = {
          sectionId: section.id,
          label: getEntryLabel(entry)
        };
        inventoryCards.add(card);
      });
    }
  }

  function updateFloatingInventoryCards(deltaTime) {
    inventoryCardTime += deltaTime;
    for (const [index, card] of inventoryCards.children.entries()) {
      const phase = index * 0.8;
      card.position.y = card.userData.baseY +
        Math.sin(inventoryCardTime * 2 + phase) * 0.006;
      card.rotation.z = Math.sin(inventoryCardTime * 1.5 + phase) * 0.012;
    }
  }

  function setOpenProgress(progress) {
    openProgress = Math.max(0, Math.min(1, progress));
    inventoryCards.visible = openProgress === 1 && !pageTurn;
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

  function updateInventory(content) {
    let nextPage = TABLE_OF_CONTENTS_PAGE_COUNT + 1;
    sections = sectionDefinitions.map((definition) => {
      const entries = Array.isArray(content && content[definition.id])
        ? [...content[definition.id]]
        : [];
      let pageCount = Math.max(2, Math.ceil(entries.length / ITEMS_PER_PAGE));
      if (pageCount % 2 !== 0) pageCount++;
      const startPage = nextPage;
      const endPage = startPage + pageCount - 1;
      nextPage = endPage + 1;

      return { ...definition, entries, startPage, endPage };
    });
    firstVisiblePage = 1;
    updateVisiblePages();
  }

  function getContentsDestination(side, textureY) {
    if (openProgress < 1 || pageTurn) return null;
    const pageNumber = firstVisiblePage + (side === 'right' ? 1 : 0);
    if (pageNumber !== 2) return null;

    const canvasY = (1 - textureY) * 672;
    const sectionIndex = TABLE_OF_CONTENTS_LINK_AREAS.findIndex(
      (area) => canvasY >= area.top && canvasY <= area.bottom
    );
    return sections[sectionIndex]?.startPage || null;
  }

  function goToPage(pageNumber) {
    if (
      openProgress < 1 ||
      pageTurn ||
      pageNumber < TABLE_OF_CONTENTS_PAGE_COUNT + 1
    ) {
      return false;
    }
    firstVisiblePage = pageNumber;
    updateVisiblePages();
    return true;
  }

  function turnPage(direction) {
    if (
      openProgress < 1 ||
      pageTurn ||
      (direction !== -1 && direction !== 1) ||
      firstVisiblePage + direction * 2 < 1
    ) {
      return false;
    }

    pageTurn = { direction, elapsed: 0 };
    inventoryCards.visible = false;
    pageTurnPivot.position.set(0, 0., 0.04);
    pageTurnPivot.rotation.y = 0;
    pageTurnMesh.position.x = direction > 0 ? 0.3 : -0.28;
    pageTurnPivot.visible = true;
    return true;
  }

  function updatePageTurn(deltaTime) {
    updateFloatingInventoryCards(deltaTime);
    if (!pageTurn) return;

    pageTurn.elapsed = Math.min(pageTurn.elapsed + deltaTime, pageTurnDuration);
    const progress = pageTurn.elapsed / pageTurnDuration;
    const easedProgress = progress * progress * (3 - 2 * progress);
    pageTurnPivot.rotation.y = -pageTurn.direction * Math.PI * easedProgress;
    leftPageNumber.visible = false;
    rightPageNumber.visible = false;
    leftFloatingText.visible = false;
    rightFloatingText.visible = false;

    if (progress === 1) {
      firstVisiblePage += pageTurn.direction * 2;
      pageTurnPivot.visible = false;
      pageTurn = null;
      updateVisiblePages();
      inventoryCards.visible = true;
      leftPageNumber.visible = true;
      rightPageNumber.visible = true;
      leftFloatingText.visible = true;
      rightFloatingText.visible = true;
    }
  }

  function showAcquisitionCard(entry) {
    acquisitionCardQueue.push({
      entry,
      startY: group.position.y + 0.08,
      endY: visiblePositionY + 0.05
    });
    acquisitionEffects.visible = true;
  }

  function createAcquisitionCard({ entry, startY, endY }) {
    const texture = createAcquisitionCardTexture(entry);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xf2d27b,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const card = new THREE.Group();
    const halo = new THREE.Mesh(acquisitionHaloGeometry, haloMaterial);
    halo.position.z = -0.015;
    halo.scale.set(1.1, 1.3, 1);
    halo.renderOrder = 2;
    const face = new THREE.Mesh(acquisitionCardGeometry, material);
    face.position.z = 0.01;
    face.renderOrder = 3;
    card.add(halo, face);
    card.position.set(0, startY, 0.2);
    card.scale.setScalar(0.15);
    card.visible = true;
    acquisitionEffects.add(card);

    return {
      card,
      elapsed: 0,
      startY,
      endY,
      material,
      halo,
      haloMaterial,
      texture
    };
  }

  function updateAcquisitionCards(deltaTime) {
    if (!activeAcquisitionCard && acquisitionCardQueue.length > 0) {
      activeAcquisitionCard = createAcquisitionCard(acquisitionCardQueue.shift());
    }
    if (!activeAcquisitionCard) return;

    const activeCard = activeAcquisitionCard;
    activeCard.elapsed += deltaTime;
    const entranceProgress = Math.min(activeCard.elapsed / 0.55, 1);
    const easedEntrance = 1 - (1 - entranceProgress) ** 3;
    const fadeProgress = Math.max(0, (activeCard.elapsed - 1.9) / 0.45);
    const opacity = Math.min(activeCard.elapsed / 0.16, 1) * (1 - fadeProgress);

    activeCard.card.position.set(
      Math.sin(activeCard.elapsed * 2.4) * 0.025,
      activeCard.startY +
        (activeCard.endY - activeCard.startY) * easedEntrance +
        Math.sin(activeCard.elapsed * 3) * 0.025,
      0.2 + easedEntrance * 0.12
    );
    activeCard.card.scale.setScalar(0.15 + easedEntrance * 0.85);
    activeCard.card.rotation.z = Math.sin(activeCard.elapsed * 1.8) * 0.035;
    activeCard.halo.rotation.z += deltaTime * 0.9;
    activeCard.material.opacity = opacity;
    activeCard.haloMaterial.opacity = opacity * 0.8;

    if (activeCard.elapsed >= 2.35) {
      acquisitionEffects.remove(activeCard.card);
      activeCard.texture.dispose();
      activeCard.material.dispose();
      activeCard.haloMaterial.dispose();
      activeAcquisitionCard = null;
      if (acquisitionCardQueue.length === 0) {
        acquisitionEffects.visible = false;
      }
    }
  }

  setOpenProgress(openProgress);
  return {
    group,
    floatingPageNumbers,
    acquisitionEffects,
    pages: { left: leftPage, right: rightPage },
    textPages: { left: leftFloatingText, right: rightFloatingText },
    inventoryCards,
    setOpenProgress,
    updateInventory,
    getContentsDestination,
    goToPage,
    turnPage,
    updatePageTurn,
    showAcquisitionCard,
    updateAcquisitionCards
  };
}
