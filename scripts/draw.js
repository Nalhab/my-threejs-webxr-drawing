let scene, camera, renderer;
const spheres = [];

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Ajouter des lumières
    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);
    
    // Positionner la caméra
    camera.position.z = 5;

    // Gérer le redimensionnement de la fenêtre
    window.addEventListener('resize', () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    });
}

// Fonction pour dessiner une sphère
function drawSphere(x, y, z) {
    const geometry = new THREE.SphereGeometry(0.1, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(x, y, z);
    scene.add(sphere);
    spheres.push(sphere);
}

// Gérer le clic pour dessiner une sphère
document.getElementById('start-button').onclick = () => {
    // Commencer à dessiner
    document.body.addEventListener('click', (event) => {
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = -(event.clientY / window.innerHeight) * 2 + 1;
        const vector = new THREE.Vector3(x, y, 0.5);
        vector.unproject(camera);
        const dir = vector.sub(camera.position).normalize();
        const distance = -camera.position.z / dir.z;
        const pos = camera.position.clone().add(dir.multiplyScalar(distance));

        drawSphere(pos.x, pos.y, pos.z);
    });
    animate();
};

// Animation
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Initialiser la scène
init();
