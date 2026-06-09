// --- 1. シーン・カメラ・レンダラーの設定 ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdcecf5);
scene.fog = new THREE.FogExp2(0xdcecf5, 0.005); // v3の広い描画距離に合わせた設定

// 遠くまで見渡せるように遠方クリップ面を2000に拡張
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 3, 100); 

let cameraRotation = { x: 0, y: 0 };

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- 2. ライティング（柔らかな自然光） ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffdf2, 0.8);
sunLight.position.set(100, 150, 100);
scene.add(sunLight);

// 地面の照り返し用ライト
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x94b3ca, 0.3);
scene.add(hemiLight);

// --- 3. 都市計画（地面・道路・公園） ---
// 広大な帝国に対応するため、地面を2000×2000に拡張
const floorGeo = new THREE.PlaneGeometry(2000, 2000);
const floorMat = new THREE.MeshPhongMaterial({ color: 0xdddddd });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// 道路の描画（十字路）
const roadMat = new THREE.MeshPhongMaterial({ color: 0x55555d });
const roadH = new THREE.Mesh(new THREE.PlaneGeometry(2000, 12), roadMat);
roadH.rotation.x = -Math.PI / 2;
roadH.position.y = 0.02;
scene.add(roadH);

const roadV = new THREE.Mesh(new THREE.PlaneGeometry(12, 2000), roadMat);
roadV.rotation.x = -Math.PI / 2;
roadV.position.y = 0.02;
scene.add(roadV);

// 中央広場・公園（緑地）
const parkGeo = new THREE.PlaneGeometry(80, 80);
const parkMat = new THREE.MeshPhongMaterial({ color: 0x76a065 });
const park = new THREE.Mesh(parkGeo, parkMat);
park.rotation.x = -Math.PI / 2;
park.position.set(0, 0.03, 0);
scene.add(park);

// --- 4. 建築物の創造 ---

// 4a. 東京スカイツリー構造（中央ランドマーク）
const skytree = new THREE.Group();
const silver = new THREE.MeshPhongMaterial({ color: 0xbdc3c7 });

// 足元（3脚状の補強材）
for(let i=0; i<3; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2, 20, 8), silver);
    const a = (i * 2 * Math.PI) / 3;
    leg.position.set(Math.cos(a)*6, 10, Math.sin(a)*6);
    leg.rotation.z = (a === 0) ? -0.15 : 0.15;
    skytree.add(leg);
}

// メメインタワー
const body = new THREE.Mesh(new THREE.CylinderGeometry(2, 6, 120, 16), silver);
body.position.y = 60;
skytree.add(body);

// 第一展望台
const obs1 = new THREE.Mesh(new THREE.CylinderGeometry(6, 4, 4, 16), new THREE.MeshPhongMaterial({color: 0xffffff}));
obs1.position.y = 70;
skytree.add(obs1);

// 第二展望台
const obs2 = new THREE.Mesh(new THREE.CylinderGeometry(4, 3, 3, 16), new THREE.MeshPhongMaterial({color: 0xffffff}));
obs2.position.y = 95;
skytree.add(obs2);

// アンテナ
const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 1, 30, 8), silver);
ant.position.y = 130;
skytree.add(ant);

skytree.position.set(0, 0, 0);
scene.add(skytree);

// 4b. 公園の木々
const leaveGeo = new THREE.ConeGeometry(2, 4, 5);
const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2);
const leaveMat = new THREE.MeshPhongMaterial({ color: 0x38761d });
const trunkMat = new THREE.MeshPhongMaterial({ color: 0x783f04 });

for(let i=0; i<8; i++) {
    const tree = new THREE.Group();
    const leaves = new THREE.Mesh(leaveGeo, leaveMat);
    leaves.position.y = 3;
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1;
    tree.add(leaves, trunk);
    
    const angle = (i * Math.PI) / 4;
    tree.position.set(Math.cos(angle) * 24, 0, Math.sin(angle) * 24);
    scene.add(tree);
}

// 4c. 窓付きのリアルな近代ビル群（モブビル）
const buildingCount = 45;
const colors = [0xfcfcfc, 0xe1e4e6, 0xd1d5db, 0xfef7ea, 0xcee3f0];
const windowGeo = new THREE.PlaneGeometry(0.4, 0.6);
const windowLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); 
const windowDarkMat = new THREE.MeshBasicMaterial({ color: 0x7fa8be });  

for (let i = 0; i < buildingCount; i++) {
    const bWidth = Math.floor(Math.random() * 6) + 6;  
    const bHeight = Math.floor(Math.random() * 25) + 12;
    const bDepth = Math.floor(Math.random() * 6) + 6;

    const bGeo = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
    const bMat = new THREE.MeshPhongMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
    const building = new THREE.Mesh(bGeo, bMat);

    let x, z;
    do {
        x = (Math.random() - 0.5) * 300;
        z = (Math.random() - 0.5) * 300;
    } while (Math.sqrt(x*x + z*z) < 50 || Math.abs(x) < 10 || Math.abs(z) < 10); 

    building.position.set(x, bHeight / 2, z);
    scene.add(building);

    const bGroup = new THREE.Group();
    bGroup.position.copy(building.position);
    
    const rows = Math.floor(bHeight / 2) - 1;
    const colsW = Math.floor(bWidth / 1.5) - 1;

    for (let r = 1; r < rows; r++) {
        const yPos = (r * 2) - (bHeight / 2);
        const wMat = Math.random() > 0.1 ? windowDarkMat : windowLightMat;

        for (let c = 0; c <= colsW; c++) {
            const xPos = (c * 1.5) - (bWidth / 2) + 0.75;
            const win = new THREE.Mesh(windowGeo, wMat);
            win.position.set(xPos, yPos, bDepth / 2 + 0.01);
            bGroup.add(win);
        }
        for (let c = 0; c <= colsW; c++) {
            const xPos = (c * 1.5) - (bWidth / 2) + 0.75;
            const win = new THREE.Mesh(windowGeo, wMat);
            win.position.set(xPos, yPos, -bDepth / 2 - 0.01);
            win.rotation.y = Math.PI;
            bGroup.add(win);
        }
    }
    scene.add(bGroup);
}

// 4d. 空港セクション (北側)
const airport = new THREE.Group();
const runway = new THREE.Mesh(new THREE.PlaneGeometry(60, 400), new THREE.MeshPhongMaterial({ color: 0x333333 }));
runway.rotation.x = -Math.PI / 2;
airport.add(runway);

const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
for(let i=0; i<10; i++) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2, 20), white);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.1, -180 + i * 40);
    airport.add(stripe);
}
for(let i=0; i<8; i++) {
    const zebra = new THREE.Mesh(new THREE.PlaneGeometry(1, 15), white);
    zebra.rotation.x = -Math.PI / 2;
    zebra.position.set(-15 + i * 4, 0.1, 190);
    airport.add(zebra);
}
airport.position.set(0, 0.06, -450); // 街並みと被らないように少し奥へ調整
scene.add(airport);

// 4e. 高級邸宅 (My House) - 空港横
const mansion = new THREE.Group();
const wallMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
const glassMat = new THREE.MeshPhongMaterial({ color: 0xadd8e6, transparent: true, opacity: 0.4 });

const mFloor = new THREE.Mesh(new THREE.BoxGeometry(30, 0.5, 30), wallMat);
const mRoof = new THREE.Mesh(new THREE.BoxGeometry(30, 0.5, 30), wallMat);
mRoof.position.y = 10;
mansion.add(mFloor, mRoof);

const backWall = new THREE.Mesh(new THREE.BoxGeometry(30, 10, 0.5), wallMat);
backWall.position.set(0, 5, -15);
const glassFront = new THREE.Mesh(new THREE.BoxGeometry(30, 10, 0.1), glassMat);
glassFront.position.set(0, 5, 15);
mansion.add(backWall, glassFront);

const carpet = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({ color: 0xaa0000 }));
carpet.rotation.x = -Math.PI / 2;
carpet.position.y = 0.3;
mansion.add(carpet);

const pool = new THREE.Mesh(new THREE.PlaneGeometry(15, 25), new THREE.MeshPhongMaterial({ color: 0x00ffff }));
pool.rotation.x = -Math.PI / 2;
pool.position.set(25, 0.1, 0);
mansion.add(pool);

mansion.position.set(120, 0, -400);
scene.add(mansion);


// --- 5. 入力・操作システム (PC・iPadハイブリッド) ---
const moveInput = { forward: 0, backward: 0, left: 0, right: 0 };
const moveVector = new THREE.Vector3();

// キーボード
const onKeyDown = (e) => {
    switch (e.code) {
        case 'KeyW': case 'ArrowUp': moveInput.forward = 1; break;
        case 'KeyA': case 'ArrowLeft': moveInput.left = 1; break;
        case 'KeyS': case 'ArrowDown': moveInput.backward = 1; break;
        case 'KeyD': case 'ArrowRight': moveInput.right = 1; break;
    }
};
const onKeyUp = (e) => {
    switch (e.code) {
        case 'KeyW': case 'ArrowUp': moveInput.forward = 0; break;
        case 'KeyA': case 'ArrowLeft': moveInput.left = 0; break;
    }
    switch (e.code) {
        case 'KeyS': case 'ArrowDown': moveInput.backward = 0; break;
        case 'KeyD': case 'ArrowRight': moveInput.right = 0; break;
    }
};
document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// タッチ操作用
const joystickBase = document.getElementById('joystick-base');
const joystickStick = document.getElementById('joystick-stick');

let touchLeftId = null;
let touchRightId = null;
let leftStartPos = { x: 0, y: 0 };
let rightLastPos = { x: 0, y: 0 };
let isMouseDown = false;
let mouseLastPos = { x: 0, y: 0 };

window.addEventListener('touchstart', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.clientX < window.innerWidth / 2 && touchLeftId === null) {
            touchLeftId = touch.identifier;
            leftStartPos = { x: touch.clientX, y: touch.clientY };
            joystickBase.style.display = 'block';
            joystickBase.style.left = leftStartPos.x + 'px';
            joystickBase.style.top = leftStartPos.y + 'px';
            joystickStick.style.transform = 'translate(0px, 0px)';
        } else if (touch.clientX >= window.innerWidth / 2 && touchRightId === null) {
            touchRightId = touch.identifier;
            rightLastPos = { x: touch.clientX, y: touch.clientY };
        }
    }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (touch.identifier === touchLeftId) {
            const distX = touch.clientX - leftStartPos.x;
            const distY = touch.clientY - leftStartPos.y;
            const distance = Math.sqrt(distX*distX + distY*distY);
            const maxDist = 40;
            
            let moveX = distX;
            let moveY = distY;
            if (distance > maxDist) {
                moveX = (distX / distance) * maxDist;
                moveY = (distY / distance) * maxDist;
            }
            joystickStick.style.transform = `translate(${moveX}px, ${moveY}px)`;
            
            moveInput.right = moveX > 0 ? moveX / maxDist : 0;
            moveInput.left = moveX < 0 ? -moveX / maxDist : 0;
            moveInput.backward = moveY > 0 ? moveY / maxDist : 0;
            moveInput.forward = moveY < 0 ? -moveY / maxDist : 0;
        }
        if (touch.identifier === touchRightId) {
            const movementX = touch.clientX - rightLastPos.x;
            const movementY = touch.clientY - rightLastPos.y;
            cameraRotation.y -= movementX * 0.006;
            cameraRotation.x -= movementY * 0.006;
            cameraRotation.x = Math.max(-Math.PI/3.5, Math.min(Math.PI/3.5, cameraRotation.x));
            rightLastPos = { x: touch.clientX, y: touch.clientY };
        }
    }
}, { passive: false });

window.addEventListener('touchend', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchLeftId) {
            touchLeftId = null;
            joystickBase.style.display = 'none';
            moveInput.forward = 0; moveInput.backward = 0; moveInput.left = 0; moveInput.right = 0;
        }
        if (touch.identifier === touchRightId) touchRightId = null;
    }
});

// マウス操作
window.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    mouseLastPos = { x: e.clientX, y: e.clientY };
});
window.addEventListener('mousemove', (e) => {
    if (!isMouseDown) return;
    const movementX = e.clientX - mouseLastPos.x;
    const movementY = e.clientY - mouseLastPos.y;
    cameraRotation.y -= movementX * 0.003;
    cameraRotation.x -= movementY * 0.003;
    cameraRotation.x = Math.max(-Math.PI/3.5, Math.min(Math.PI/3.5, cameraRotation.x));
    mouseLastPos = { x: e.clientX, y: e.clientY };
});
window.addEventListener('mouseup', () => isMouseDown = false);


// --- 6. ループ処理 ---
const clock = new THREE.Clock();
const speed = 25.0; // 帝国が広大になったため移動速度を少しアップ

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    camera.quaternion.setFromEuler(new THREE.Euler(cameraRotation.x, cameraRotation.y, 0, 'YXZ'));

    const zMove = moveInput.backward - moveInput.forward;
    const xMove = moveInput.right - moveInput.left;

    moveVector.set(xMove, 0, zMove);
    moveVector.normalize();

    moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);

    camera.position.x += moveVector.x * speed * delta;
    camera.position.z += moveVector.z * speed * delta;
    camera.position.y = 2.5; 

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
