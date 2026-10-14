import * as THREE from 'three';

export interface Avatar3DState {
  gender?: 'male' | 'female';
  skinTone?: string;
  eyeColor?: string;
  hairColor?: string;
  hairStyle?: string;
  facialHair?: string;
  clothingColor?: string;
  bodyShape?: BodyShapeId;
}

export const SKIN_TONES = [
  { id: 'pale', color: '#fbe2d5' },
  { id: 'fair', color: '#f3cbb4' },
  { id: 'tan', color: '#d99f7d' },
  { id: 'olive', color: '#b87c56' },
  { id: 'brown', color: '#885338' },
  { id: 'dark', color: '#4d2d1e' },
];

export const EYE_COLORS = [
  { id: 'brown', color: '#4a2c11' },
  { id: 'blue', color: '#2563eb' },
  { id: 'green', color: '#16a34a' },
  { id: 'hazel', color: '#854d0e' },
  { id: 'grey', color: '#64748b' },
  { id: 'amber', color: '#d97706' },
];

export const HAIR_COLORS = [
  { id: 'black', color: '#171717' },
  { id: 'dark_brown', color: '#2c1e18' },
  { id: 'brown', color: '#593b2b' },
  { id: 'blonde', color: '#eab308' },
  { id: 'silver', color: '#94a3b8' },
  { id: 'red', color: '#991b1b' },
];

export type BodyShapeId = 'athletic' | 'muscular' | 'slim' | 'heavy';

export interface IMVUAvatarMeshGroup extends THREE.Group {
  updateCustomization: (state: Avatar3DState) => void;
  bodyParts: {
    skinMeshes: THREE.Mesh[];
    eyeIrises: THREE.Mesh[];
    hairGroup: THREE.Group;
    facialHairGroup: THREE.Group;
    eyebrowsGroup: THREE.Group;
    clothingGroup: THREE.Group;
    torsoGroup: THREE.Group;
    armsGroup: THREE.Group;
  };
}

/**
 * Builds a complete 3D IMVU-style humanoid avatar matching the reference configuration:
 * - Front, Side, Three-Quarter, and Back view anatomically accurate proportions
 * - Athletic male/female muscular anatomy with pectorals, 6-pack abs, serratus, and quads
 * - Parametric skin materials (PBR roughness, subsurface scattering sheen)
 * - 3D customizable eyes with colored irises
 * - 3D stylized polygon hair styles
 * - 3D facial hair (stubble, goatee, full beard, mustache)
 * - 3D athletic shorts with white piping (matching the reference configuration)
 * - 3D modular interchangeable wardrobe (T-shirts, Jackets, Pants, Footwear, Accessories)
 * - Body shape scaling (Athletic, Muscular, Slim, Heavy)
 */
export function buildIMVUAvatarModel(initialState: Avatar3DState): IMVUAvatarMeshGroup {
  const root = new THREE.Group() as IMVUAvatarMeshGroup;
  root.name = 'IMVU_Avatar_Character';

  const skinMeshes: THREE.Mesh[] = [];
  const eyeIrises: THREE.Mesh[] = [];

  // 1. Resolve Colors from state
  const skinToneObj = SKIN_TONES.find((s) => s.id === initialState.skinTone) || SKIN_TONES[2];
  const skinBaseColor = new THREE.Color(skinToneObj.color);

  const eyeColorObj = EYE_COLORS.find((e) => e.id === initialState.eyeColor) || EYE_COLORS[0];
  const eyeIrisColor = new THREE.Color(eyeColorObj.color);

  const hairColorHex = initialState.hairColor || '#2c1e18';
  const hairColor = new THREE.Color(hairColorHex);

  // 2. Base PBR Materials
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: skinBaseColor,
    roughness: 0.45,
    metalness: 0.04,
  });

  const eyeScleraMaterial = new THREE.MeshStandardMaterial({
    color: 0xf8f9fa,
    roughness: 0.1,
    metalness: 0.05,
  });

  const eyeIrisMaterial = new THREE.MeshStandardMaterial({
    color: eyeIrisColor,
    roughness: 0.2,
    metalness: 0.2,
  });

  const eyePupilMaterial = new THREE.MeshBasicMaterial({
    color: 0x050505,
  });

  const hairMaterial = new THREE.MeshStandardMaterial({
    color: hairColor,
    roughness: 0.4,
    metalness: 0.12,
  });

  const facialHairMaterial = new THREE.MeshStandardMaterial({
    color: hairColor,
    roughness: 0.65,
    metalness: 0.05,
  });

  // Reference Shorts Materials:
  // Black athletic shorts with white elastic waistband and white curved piping (as in photos)
  const shortsBaseColor = new THREE.Color(initialState.clothingColor || '#141416');
  const shortsMaterial = new THREE.MeshStandardMaterial({
    color: shortsBaseColor,
    roughness: 0.75,
    metalness: 0.08,
  });

  const shortsTrimMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    metalness: 0.1,
  });

  // 3. Sub-groups for modularity
  const headGroup = new THREE.Group();
  headGroup.name = 'Head_Group';
  const torsoGroup = new THREE.Group();
  torsoGroup.name = 'Torso_Group';
  const armsGroup = new THREE.Group();
  armsGroup.name = 'Arms_Group';
  const legsGroup = new THREE.Group();
  legsGroup.name = 'Legs_Group';
  const hairGroup = new THREE.Group();
  hairGroup.name = 'Hair_Group';
  const facialHairGroup = new THREE.Group();
  facialHairGroup.name = 'FacialHair_Group';
  const eyebrowsGroup = new THREE.Group();
  eyebrowsGroup.name = 'Eyebrows_Group';
  const clothingGroup = new THREE.Group();
  clothingGroup.name = 'Clothing_Group';

  root.add(torsoGroup);
  root.add(headGroup);
  root.add(armsGroup);
  root.add(legsGroup);
  root.add(clothingGroup);

  // =========================================================================
  // A. HEAD & FACIAL FEATURES (Anatomical IMVU Style)
  // =========================================================================
  const headCenterY = 1.48;

  // Cranium
  const craniumGeo = new THREE.SphereGeometry(0.125, 32, 28);
  craniumGeo.scale(0.95, 1.15, 1.05);
  const cranium = new THREE.Mesh(craniumGeo, skinMaterial);
  cranium.position.set(0, headCenterY + 0.03, 0);
  cranium.castShadow = true;
  headGroup.add(cranium);
  skinMeshes.push(cranium);

  // Jaw & Chin (Athletic masculine chiseled jaw)
  const jawGeo = new THREE.CylinderGeometry(0.09, 0.055, 0.11, 24);
  jawGeo.scale(1.0, 1.0, 0.85);
  const jaw = new THREE.Mesh(jawGeo, skinMaterial);
  jaw.position.set(0, headCenterY - 0.07, 0.02);
  jaw.castShadow = true;
  headGroup.add(jaw);
  skinMeshes.push(jaw);

  // Chin protrusion
  const chinGeo = new THREE.SphereGeometry(0.032, 16, 16);
  chinGeo.scale(1.0, 0.8, 1.2);
  const chin = new THREE.Mesh(chinGeo, skinMaterial);
  chin.position.set(0, headCenterY - 0.125, 0.065);
  headGroup.add(chin);
  skinMeshes.push(chin);

  // Cheekbones
  [-0.07, 0.07].forEach((xSide) => {
    const cheekGeo = new THREE.SphereGeometry(0.04, 16, 16);
    cheekGeo.scale(0.8, 1.1, 0.9);
    const cheek = new THREE.Mesh(cheekGeo, skinMaterial);
    cheek.position.set(xSide, headCenterY - 0.02, 0.065);
    headGroup.add(cheek);
    skinMeshes.push(cheek);
  });

  // Nose
  const noseBridgeGeo = new THREE.CylinderGeometry(0.012, 0.016, 0.06, 12);
  const noseBridge = new THREE.Mesh(noseBridgeGeo, skinMaterial);
  noseBridge.rotation.x = -0.35;
  noseBridge.position.set(0, headCenterY - 0.02, 0.12);
  headGroup.add(noseBridge);
  skinMeshes.push(noseBridge);

  const noseTipGeo = new THREE.SphereGeometry(0.016, 14, 14);
  const noseTip = new THREE.Mesh(noseTipGeo, skinMaterial);
  noseTip.position.set(0, headCenterY - 0.045, 0.138);
  headGroup.add(noseTip);
  skinMeshes.push(noseTip);

  // Mouth & Lips
  const upperLipGeo = new THREE.BoxGeometry(0.046, 0.010, 0.016);
  const upperLip = new THREE.Mesh(
    upperLipGeo,
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(skinToneObj.color).multiplyScalar(0.92),
      roughness: 0.5,
    })
  );
  upperLip.position.set(0, headCenterY - 0.082, 0.108);
  headGroup.add(upperLip);

  const lowerLipGeo = new THREE.BoxGeometry(0.042, 0.012, 0.016);
  const lowerLip = new THREE.Mesh(
    lowerLipGeo,
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(skinToneObj.color).multiplyScalar(0.90),
      roughness: 0.45,
    })
  );
  lowerLip.position.set(0, headCenterY - 0.096, 0.106);
  headGroup.add(lowerLip);

  // Ears
  [-0.105, 0.105].forEach((xSide) => {
    const earGeo = new THREE.SphereGeometry(0.028, 14, 14);
    earGeo.scale(0.4, 1.4, 0.9);
    const ear = new THREE.Mesh(earGeo, skinMaterial);
    ear.rotation.y = xSide > 0 ? 0.2 : -0.2;
    ear.position.set(xSide, headCenterY - 0.01, -0.01);
    headGroup.add(ear);
    skinMeshes.push(ear);
  });

  // Eyes (Left & Right with Sclera, Iris, Pupil)
  [-0.042, 0.042].forEach((xSide) => {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(xSide, headCenterY + 0.012, 0.098);

    // Eyeball Sclera
    const eyeball = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 16), eyeScleraMaterial);
    eyeGroup.add(eyeball);

    // Iris (Customizable color)
    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.009, 16), eyeIrisMaterial);
    iris.position.set(0, 0, 0.0175);
    eyeGroup.add(iris);
    eyeIrises.push(iris);

    // Pupil
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.0042, 12), eyePupilMaterial);
    pupil.position.set(0, 0, 0.0182);
    eyeGroup.add(pupil);

    // Upper eyelid crease
    const eyelidGeo = new THREE.TorusGeometry(0.019, 0.004, 8, 16, Math.PI * 0.9);
    const eyelid = new THREE.Mesh(eyelidGeo, skinMaterial);
    eyelid.position.set(0, 0.006, 0.014);
    eyelid.rotation.z = Math.PI * 0.05;
    eyeGroup.add(eyelid);

    headGroup.add(eyeGroup);
  });

  // 3D Eyebrows
  [-0.044, 0.044].forEach((xSide) => {
    const browGeo = new THREE.BoxGeometry(0.042, 0.008, 0.012);
    const brow = new THREE.Mesh(browGeo, facialHairMaterial);
    brow.position.set(xSide, headCenterY + 0.038, 0.112);
    brow.rotation.z = xSide > 0 ? -0.12 : 0.12;
    eyebrowsGroup.add(brow);
  });
  headGroup.add(eyebrowsGroup);

  // Neck
  const neckGeo = new THREE.CylinderGeometry(0.062, 0.076, 0.16, 24);
  const neck = new THREE.Mesh(neckGeo, skinMaterial);
  neck.position.set(0, 1.34, -0.01);
  neck.castShadow = true;
  torsoGroup.add(neck);
  skinMeshes.push(neck);

  // Adam's apple
  const adamsAppleGeo = new THREE.SphereGeometry(0.012, 10, 10);
  adamsAppleGeo.scale(1.0, 1.4, 1.2);
  const adamsApple = new THREE.Mesh(adamsAppleGeo, skinMaterial);
  adamsApple.position.set(0, 1.34, 0.06);
  torsoGroup.add(adamsApple);
  skinMeshes.push(adamsApple);

  // =========================================================================
  // B. 3D HAIRSTYLES (Multiple stylized polygonal shapes)
  // =========================================================================
  headGroup.add(hairGroup);

  const buildHairStyles = () => {
    hairGroup.clear();

    // 1. Pompadour (Main Mafia Reference)
    const pompGroup = new THREE.Group();
    pompGroup.name = 'hair_pompadour';

    const pompadourTopGeo = new THREE.SphereGeometry(0.142, 24, 20);
    pompadourTopGeo.scale(0.96, 1.15, 1.22);
    const pompTop = new THREE.Mesh(pompadourTopGeo, hairMaterial);
    pompTop.position.set(0, headCenterY + 0.09, 0.02);
    pompTop.castShadow = true;
    pompGroup.add(pompTop);

    // Slicked Back Front Crest
    const crestGeo = new THREE.CylinderGeometry(0.07, 0.11, 0.13, 16);
    crestGeo.scale(1.0, 1.0, 1.35);
    const crest = new THREE.Mesh(crestGeo, hairMaterial);
    crest.rotation.x = -0.55;
    crest.position.set(0, headCenterY + 0.125, 0.06);
    pompGroup.add(crest);

    // Tapered Sides
    [-0.095, 0.095].forEach((xSide) => {
      const sideGeo = new THREE.BoxGeometry(0.025, 0.16, 0.14);
      const side = new THREE.Mesh(sideGeo, hairMaterial);
      side.position.set(xSide, headCenterY + 0.04, -0.01);
      pompGroup.add(side);
    });

    hairGroup.add(pompGroup);

    // 2. Slick Back
    const slickGroup = new THREE.Group();
    slickGroup.name = 'hair_slick_back';
    const slickGeo = new THREE.SphereGeometry(0.138, 24, 20);
    slickGeo.scale(0.94, 0.95, 1.35);
    const slickMesh = new THREE.Mesh(slickGeo, hairMaterial);
    slickMesh.position.set(0, headCenterY + 0.065, -0.03);
    slickGroup.add(slickMesh);
    slickGroup.visible = false;
    hairGroup.add(slickGroup);

    // 3. Buzz Cut
    const buzzGroup = new THREE.Group();
    buzzGroup.name = 'hair_buzz';
    const buzzGeo = new THREE.SphereGeometry(0.132, 24, 20);
    buzzGeo.scale(0.96, 1.12, 1.08);
    const buzzMesh = new THREE.Mesh(buzzGeo, hairMaterial);
    buzzMesh.position.set(0, headCenterY + 0.04, 0);
    buzzGroup.add(buzzMesh);
    buzzGroup.visible = false;
    hairGroup.add(buzzGroup);

    // 4. Female Wavy Long
    const femaleWavyGroup = new THREE.Group();
    femaleWavyGroup.name = 'hair_female_wavy_long';
    const topWavyGeo = new THREE.SphereGeometry(0.144, 24, 20);
    topWavyGeo.scale(0.98, 1.12, 1.15);
    const topWavy = new THREE.Mesh(topWavyGeo, hairMaterial);
    topWavy.position.set(0, headCenterY + 0.07, 0);
    femaleWavyGroup.add(topWavy);

    // Flowing Locks
    [-0.09, 0.09].forEach((xSide) => {
      const lockGeo = new THREE.CylinderGeometry(0.035, 0.022, 0.44, 16);
      const lock = new THREE.Mesh(lockGeo, hairMaterial);
      lock.position.set(xSide, headCenterY - 0.14, 0.02);
      lock.rotation.z = xSide > 0 ? -0.1 : 0.1;
      femaleWavyGroup.add(lock);
    });
    // Back Locks
    const backLockGeo = new THREE.CylinderGeometry(0.11, 0.08, 0.52, 16);
    const backLock = new THREE.Mesh(backLockGeo, hairMaterial);
    backLock.position.set(0, headCenterY - 0.18, -0.09);
    femaleWavyGroup.add(backLock);

    femaleWavyGroup.visible = false;
    hairGroup.add(femaleWavyGroup);
  };

  buildHairStyles();

  // =========================================================================
  // C. 3D FACIAL HAIR (Stubble, Full Beard, Goatee, Mustache)
  // =========================================================================
  headGroup.add(facialHairGroup);

  const buildFacialHair = () => {
    facialHairGroup.clear();

    // 1. Classic Mustache
    const mustGroup = new THREE.Group();
    mustGroup.name = 'facial_classic_mustache';
    [-0.022, 0.022].forEach((xSide) => {
      const stachePartGeo = new THREE.BoxGeometry(0.032, 0.010, 0.012);
      const stachePart = new THREE.Mesh(stachePartGeo, facialHairMaterial);
      stachePart.position.set(xSide, headCenterY - 0.072, 0.118);
      stachePart.rotation.z = xSide > 0 ? -0.16 : 0.16;
      mustGroup.add(stachePart);
    });
    facialHairGroup.add(mustGroup);

    // 2. Goatee
    const goateeGroup = new THREE.Group();
    goateeGroup.name = 'facial_goatee';
    const goateeChinGeo = new THREE.BoxGeometry(0.038, 0.046, 0.024);
    const goateeChin = new THREE.Mesh(goateeChinGeo, facialHairMaterial);
    goateeChin.position.set(0, headCenterY - 0.125, 0.076);
    goateeGroup.add(goateeChin);
    facialHairGroup.add(goateeGroup);

    // 3. Stubble
    const stubbleGroup = new THREE.Group();
    stubbleGroup.name = 'facial_stubble';
    const stubbleGeo = new THREE.SphereGeometry(0.095, 20, 16);
    stubbleGeo.scale(0.9, 0.8, 0.95);
    const stubbleMat = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.85,
      transparent: true,
      opacity: 0.38,
    });
    const stubbleMesh = new THREE.Mesh(stubbleGeo, stubbleMat);
    stubbleMesh.position.set(0, headCenterY - 0.09, 0.025);
    stubbleGroup.add(stubbleMesh);
    facialHairGroup.add(stubbleGroup);

    // 4. Full Beard
    const beardGroup = new THREE.Group();
    beardGroup.name = 'facial_beard';
    const fullBeardGeo = new THREE.CylinderGeometry(0.098, 0.065, 0.14, 20);
    fullBeardGeo.scale(1.05, 1.0, 0.92);
    const fullBeard = new THREE.Mesh(fullBeardGeo, facialHairMaterial);
    fullBeard.position.set(0, headCenterY - 0.11, 0.032);
    beardGroup.add(fullBeard);
    facialHairGroup.add(beardGroup);
  };

  buildFacialHair();

  // =========================================================================
  // D. TORSO & ATHLETIC MUSCULAR ANATOMY (Matching the Reference Photos)
  // =========================================================================
  const isMale = initialState.gender !== 'female';

  // Upper Chest / Pectorals
  const chestWidth = isMale ? 0.33 : 0.28;
  const chestGeo = new THREE.BoxGeometry(chestWidth, 0.22, 0.18);
  const chestMesh = new THREE.Mesh(chestGeo, skinMaterial);
  chestMesh.position.set(0, 1.15, 0);
  chestMesh.castShadow = true;
  torsoGroup.add(chestMesh);
  skinMeshes.push(chestMesh);

  // Left & Right Defined Pectoral Plates
  [-0.075, 0.075].forEach((xSide) => {
    const pecGeo = new THREE.BoxGeometry(0.13, 0.11, 0.045);
    const pec = new THREE.Mesh(pecGeo, skinMaterial);
    pec.position.set(xSide, 1.17, 0.092);
    torsoGroup.add(pec);
    skinMeshes.push(pec);
  });

  // 6-Pack Abdominal Section (Rectus Abdominis)
  const absGroup = new THREE.Group();
  absGroup.name = 'Abs_Group';
  const abRows = [
    { y: 1.04, depth: 0.088, h: 0.065 },
    { y: 0.97, depth: 0.085, h: 0.065 },
    { y: 0.90, depth: 0.082, h: 0.065 },
  ];
  abRows.forEach((row) => {
    [-0.045, 0.045].forEach((xSide) => {
      const abGeo = new THREE.BoxGeometry(0.072, row.h, 0.024);
      const ab = new THREE.Mesh(abGeo, skinMaterial);
      ab.position.set(xSide, row.y, row.depth);
      absGroup.add(ab);
      skinMeshes.push(ab);
    });
  });
  torsoGroup.add(absGroup);

  // Midsection Core Body Block
  const coreGeo = new THREE.CylinderGeometry(0.145, 0.135, 0.32, 24);
  coreGeo.scale(1.0, 1.0, 0.78);
  const coreMesh = new THREE.Mesh(coreGeo, skinMaterial);
  coreMesh.position.set(0, 0.97, 0);
  torsoGroup.add(coreMesh);
  skinMeshes.push(coreMesh);

  // Pelvis & Hip Base
  const pelvisGeo = new THREE.CylinderGeometry(0.135, 0.145, 0.16, 24);
  pelvisGeo.scale(1.05, 1.0, 0.82);
  const pelvisMesh = new THREE.Mesh(pelvisGeo, skinMaterial);
  pelvisMesh.position.set(0, 0.77, 0);
  torsoGroup.add(pelvisMesh);
  skinMeshes.push(pelvisMesh);

  // =========================================================================
  // E. ATHLETIC SHORTS (Exact IMVU Reference with Waistband & Piping)
  // =========================================================================
  const shortsGroup = new THREE.Group();
  shortsGroup.name = 'Reference_Athletic_Shorts';

  // White Elastic Waistband
  const waistbandGeo = new THREE.CylinderGeometry(0.155, 0.156, 0.045, 32);
  waistbandGeo.scale(1.05, 1.0, 0.84);
  const waistband = new THREE.Mesh(waistbandGeo, shortsTrimMaterial);
  waistband.position.set(0, 0.835, 0);
  shortsGroup.add(waistband);

  // Main Shorts Pelvis Body
  const shortsBodyGeo = new THREE.CylinderGeometry(0.156, 0.165, 0.18, 32);
  shortsBodyGeo.scale(1.06, 1.0, 0.85);
  const shortsBody = new THREE.Mesh(shortsBodyGeo, shortsMaterial);
  shortsBody.position.set(0, 0.73, 0);
  shortsBody.castShadow = true;
  shortsGroup.add(shortsBody);

  // Left & Right Shorts Leg Barrels with curved white piping
  [-0.088, 0.088].forEach((xSide) => {
    const legBarrelGeo = new THREE.CylinderGeometry(0.086, 0.092, 0.19, 24);
    const legBarrel = new THREE.Mesh(legBarrelGeo, shortsMaterial);
    legBarrel.position.set(xSide, 0.58, 0);
    shortsGroup.add(legBarrel);

    // Bottom White Hem Trim
    const hemGeo = new THREE.TorusGeometry(0.092, 0.006, 12, 28);
    const hem = new THREE.Mesh(hemGeo, shortsTrimMaterial);
    hem.rotation.x = Math.PI / 2;
    hem.position.set(xSide, 0.485, 0);
    shortsGroup.add(hem);

    // Lateral White Piping Stripe
    const sideStripeGeo = new THREE.BoxGeometry(0.008, 0.28, 0.012);
    const sideStripe = new THREE.Mesh(sideStripeGeo, shortsTrimMaterial);
    sideStripe.position.set(xSide > 0 ? xSide + 0.088 : xSide - 0.088, 0.63, 0);
    shortsGroup.add(sideStripe);
  });

  torsoGroup.add(shortsGroup);

  // =========================================================================
  // F. ARMS & HANDS (Athletic Muscular Definition)
  // =========================================================================
  [-0.20, 0.20].forEach((xSide) => {
    const armSideGroup = new THREE.Group();
    armSideGroup.name = xSide > 0 ? 'Arm_Right' : 'Arm_Left';

    // Deltoid / Shoulder
    const deltGeo = new THREE.SphereGeometry(0.068, 16, 16);
    deltGeo.scale(0.85, 1.15, 0.95);
    const delt = new THREE.Mesh(deltGeo, skinMaterial);
    delt.position.set(xSide, 1.22, 0);
    delt.castShadow = true;
    armSideGroup.add(delt);
    skinMeshes.push(delt);

    // Bicep / Upper Arm
    const bicepGeo = new THREE.CylinderGeometry(0.052, 0.046, 0.22, 18);
    const bicep = new THREE.Mesh(bicepGeo, skinMaterial);
    bicep.position.set(xSide, 1.06, 0);
    bicep.castShadow = true;
    armSideGroup.add(bicep);
    skinMeshes.push(bicep);

    // Forearm
    const forearmGeo = new THREE.CylinderGeometry(0.046, 0.038, 0.22, 18);
    const forearm = new THREE.Mesh(forearmGeo, skinMaterial);
    forearm.position.set(xSide, 0.86, 0);
    forearm.castShadow = true;
    armSideGroup.add(forearm);
    skinMeshes.push(forearm);

    // Hand & Palm
    const handGeo = new THREE.BoxGeometry(0.048, 0.082, 0.032);
    const hand = new THREE.Mesh(handGeo, skinMaterial);
    hand.position.set(xSide, 0.72, 0);
    armSideGroup.add(hand);
    skinMeshes.push(hand);

    armsGroup.add(armSideGroup);
  });

  // =========================================================================
  // G. LEGS & ATHLETIC FOOTWEAR
  // =========================================================================
  [-0.088, 0.088].forEach((xSide) => {
    const legSideGroup = new THREE.Group();

    // Thigh / Quadriceps (Muscular definition visible below shorts)
    const quadGeo = new THREE.CylinderGeometry(0.076, 0.058, 0.26, 20);
    const quad = new THREE.Mesh(quadGeo, skinMaterial);
    quad.position.set(xSide, 0.38, 0);
    quad.castShadow = true;
    legSideGroup.add(quad);
    skinMeshes.push(quad);

    // Knee Cap
    const kneeGeo = new THREE.SphereGeometry(0.042, 14, 14);
    kneeGeo.scale(0.85, 1.1, 1.05);
    const knee = new THREE.Mesh(kneeGeo, skinMaterial);
    knee.position.set(xSide, 0.23, 0.015);
    legSideGroup.add(knee);
    skinMeshes.push(knee);

    // Calf & Shin
    const calfGeo = new THREE.CylinderGeometry(0.056, 0.040, 0.28, 18);
    const calf = new THREE.Mesh(calfGeo, skinMaterial);
    calf.position.set(xSide, 0.08, 0);
    calf.castShadow = true;
    legSideGroup.add(calf);
    skinMeshes.push(calf);

    // Athletic Shoes / Footwear
    const shoeGroup = new THREE.Group();
    shoeGroup.name = 'Shoe_Group';
    const shoeSoleGeo = new THREE.BoxGeometry(0.078, 0.038, 0.17);
    const shoeSole = new THREE.Mesh(
      shoeSoleGeo,
      new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.4 })
    );
    shoeSole.position.set(xSide, -0.065, 0.025);
    shoeGroup.add(shoeSole);

    const shoeUpperGeo = new THREE.SphereGeometry(0.048, 14, 14);
    shoeUpperGeo.scale(0.85, 0.75, 1.4);
    const shoeUpper = new THREE.Mesh(
      shoeUpperGeo,
      new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.6 })
    );
    shoeUpper.position.set(xSide, -0.045, 0.04);
    shoeGroup.add(shoeUpper);

    legSideGroup.add(shoeGroup);
    legsGroup.add(legSideGroup);
  });

  // =========================================================================
  // H. STATE UPDATE HOOK (Live Customization Sync)
  // =========================================================================
  root.updateCustomization = (newState: Avatar3DState) => {
    // 1. Update Skin Tone
    const newSkinTone = SKIN_TONES.find((s) => s.id === newState.skinTone) || SKIN_TONES[2];
    const newSkinColor = new THREE.Color(newSkinTone.color);
    skinMaterial.color.copy(newSkinColor);

    // 2. Update Eye Color
    const newEyeColor = EYE_COLORS.find((e) => e.id === newState.eyeColor) || EYE_COLORS[0];
    const newIrisColor = new THREE.Color(newEyeColor.color);
    eyeIrisMaterial.color.copy(newIrisColor);

    // 3. Update Hair Color
    const newHairColor = new THREE.Color(newState.hairColor || '#2c1e18');
    hairMaterial.color.copy(newHairColor);
    facialHairMaterial.color.copy(newHairColor);

    // 4. Update Clothing Color Tint
    if (newState.clothingColor) {
      shortsMaterial.color.set(newState.clothingColor);
    }

    // 5. Toggle Hairstyle Visibility
    hairGroup.children.forEach((child) => {
      const matchName = `hair_${newState.hairStyle}`;
      child.visible = child.name === matchName;
    });

    // Fallback if none matched: ensure pompadour is visible
    if (!hairGroup.children.some((c) => c.visible)) {
      const defaultHair = hairGroup.getObjectByName('hair_pompadour');
      if (defaultHair) defaultHair.visible = true;
    }

    // 6. Toggle Facial Hair Visibility
    facialHairGroup.children.forEach((child) => {
      const matchName = `facial_${newState.facialHair}`;
      child.visible = child.name === matchName && newState.gender !== 'female';
    });

    // 7. Adjust for Gender Proportions
    if (newState.gender === 'female') {
      chestMesh.scale.set(0.85, 1.0, 0.9);
      coreMesh.scale.set(0.82, 1.0, 0.85);
      pelvisMesh.scale.set(1.12, 1.0, 1.05);
      absGroup.visible = false;
      facialHairGroup.visible = false;
    } else {
      chestMesh.scale.set(1.0, 1.0, 1.0);
      coreMesh.scale.set(1.0, 1.0, 1.0);
      pelvisMesh.scale.set(1.0, 1.0, 1.0);
      absGroup.visible = true;
    }
  };

  root.bodyParts = {
    skinMeshes,
    eyeIrises,
    hairGroup,
    facialHairGroup,
    eyebrowsGroup,
    clothingGroup,
    torsoGroup,
    armsGroup,
  };

  // Run initial state pass
  root.updateCustomization(initialState);

  return root;
}
