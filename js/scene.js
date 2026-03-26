import * as THREE from '../libs/three.module.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// altura do "player"
camera.position.y = 1.6;

// 🚨 IMPORTANTE (isso resolve o erro)
export { scene, camera, renderer };