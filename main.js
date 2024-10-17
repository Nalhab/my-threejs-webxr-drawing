import * as THREE from '/node_modules/three';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from '/node_modules/three/examples/jsm/renderers/CSS2DRenderer.js';
import { EffectComposer } from '/node_modules/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '/node_modules/three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from '/node_modules/three/examples/jsm/postprocessing/OutlinePass.js';
import { ShaderPass } from '/node_modules/three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from '/node_modules/three/examples/jsm/shaders/FXAAShader.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(4, 5, 11);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.enableRotate = false;
controls.minDistance = 5;
controls.maxDistance = 20;
controls.minPolarAngle = 0.5;
controls.maxPolarAngle = 1.5;
controls.autoRotate = false;
controls.target = new THREE.Vector3(0, 1, 0);
controls.update();

const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.bias = -0.0001;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
scene.add(directionalLight);

const spotLight = new THREE.SpotLight(0xffffff, 1.5, 100, Math.PI / 4, 0.5, 1);
spotLight.position.set(10, 20, 10);
spotLight.castShadow = true;
spotLight.shadow.bias = -0.0001;
spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;
scene.add(spotLight);

const loader = new GLTFLoader().setPath('public/lowpoly_human_heart/');
let mesh;
const group = new THREE.Group();
scene.add(group);

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
outlinePass.edgeStrength = 10.0;
outlinePass.edgeGlow = 0.0;
outlinePass.edgeThickness = 1.0;
outlinePass.pulsePeriod = 0;
outlinePass.visibleEdgeColor.set('#000000');
outlinePass.hiddenEdgeColor.set('#000000');
composer.addPass(outlinePass);

const effectFXAA = new ShaderPass(FXAAShader);
effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
composer.addPass(effectFXAA);
let label;

loader.load('scene.gltf', (gltf) => {
  console.log('loading model');
  mesh = gltf.scene;

  mesh.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material.needsUpdate = true;
      }
    }
  });

  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  mesh.position.x -= center.x;
  mesh.position.y -= center.y * 2;
  mesh.position.z -= center.z;

  mesh.scale.set(2.5, 2.5, 2.5);
  mesh.rotation.set(0, 0, Math.PI / 10);

  group.add(mesh);

  outlinePass.selectedObjects = [mesh];

  camera.position.set(0, 0, 10);
  camera.lookAt(mesh.position);

  document.getElementById('progress-container').style.display = 'none';

  const div = document.createElement('div');
  div.className = 'label text-uppercase fw-bold text-theme mb-4';
  div.textContent = 'Anatomy Pictionary';
  label = new CSS2DObject(div);
  label.position.set(0, size.y / 2 + 2, 0);
  scene.add(label);

  // Add a button below the title
  const buttonDiv = document.createElement('div');
  buttonDiv.className = 'button-container';
  const button = document.createElement('button');
  button.className = 'action-button';
  button.textContent = 'PLAY';
  buttonDiv.appendChild(button);
  document.body.appendChild(buttonDiv);

  button.addEventListener('click', () => {
    localStorage.setItem('gameMode', 'play');
    window.location.href = 'game.html';
  });

  const multiDiv = document.createElement('div');
  multiDiv.className = 'multi-container';
  const multi = document.createElement('multi');
  multi.className = 'multi-button';
  multi.textContent = 'PLAY WITH FRIENDS';
  multiDiv.appendChild(multi);
  document.body.appendChild(multiDiv);

  multi.addEventListener('click', () => {
    localStorage.setItem('gameMode', 'playWithFriends');
    window.location.href = 'game.html';
  });
}, (xhr) => {
  console.log(`loading ${xhr.loaded / xhr.total * 100}%`);
}, (error) => {
  console.error(error);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

controls.enableZoom = false;

document.addEventListener("mousemove", onDocumentMouseMove);

let mouseX = 0;
let mouseY = 0;

let targetX = 0;
let targetY = 0;

const windowX = window.innerWidth / 2;
const windowY = window.innerHeight / 2;

function onDocumentMouseMove(event) {
  mouseX = (event.clientX - windowX);
  mouseY = (event.clientY - windowY);
}

const updateShape = (event) => {
  if (mesh) {
    mesh.position.y = window.scrollY * 0.001;
  }
}

window.addEventListener('scroll', updateShape);

const clock = new THREE.Clock();

const tick = () => {
  targetX = mouseX * 0.001;
  targetY = mouseY * 0.001;

  const elapsedTime = clock.getElapsedTime();

  if (mesh) {
    group.rotation.y = elapsedTime * 0.5;
    group.rotation.y += (targetX - group.rotation.y) * 0.5;
    group.rotation.x += (targetY - group.rotation.x) * 0.5;
  }

  composer.render();
  labelRenderer.render(scene, camera);
  window.requestAnimationFrame(tick);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  composer.render();
  labelRenderer.render(scene, camera);
}

tick();
animate();