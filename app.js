// --- 1. シーン・カメラ・レンダラーの設定 ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e90ff);
scene.fog = new THREE.FogExp2(0xdcecf5, 0.002);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 3, 100); 

let cameraRotation = { x: 0, y: 0 };

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- 2. ライティング ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffdf2, 1.0);
sunLight.position.set(100, 150, 100);
scene.add(sunLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x94b3ca, 0.3);
scene.add(hemiLight);

// 当たり判定（コライダー）用の配列
const colliders = [];

// コライダー登録関数（中心座標とXZのサイズ、及び半径から簡易判定用）
function addBoxCollider(mesh, width, depth) {
    colliders.push({
        type: 'box',
        x: mesh.position.x,
        z: mesh.position.z,
        hw: width / 2,
        hd: depth / 2
    });
}
function addCircleCollider(mesh, radius) {
    colliders.push({
        type: 'circle',
        x: mesh.position.x,
        z: mesh.position.z,
        r: radius
    });
}

// --- 3. 都市計画（地面・道路・公園） ---
const floorGeo = new THREE.PlaneGeometry(2000, 2000);
const floorMat = new THREE.MeshPhongMaterial({ color: 0xccaaaa }); // ほんのり砂浜・大地風
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// 道路の描画（十字路）幅16
const roadMat = new THREE.MeshPhongMaterial({ color: 0x44444a });
const roadH = new THREE.Mesh(new THREE.PlaneGeometry(2000, 16), roadMat);
roadH.rotation.x = -Math.PI / 2;
roadH.position.y = 0.02;
scene.add(roadH);

const roadV = new THREE.Mesh(new THREE.PlaneGeometry(16, 2000), roadMat);
roadV.rotation.x = -Math.PI / 2;
roadV.position.y = 0.02;
scene.add(roadV);

// 中央広場・公園
const parkGeo = new THREE.PlaneGeometry(80, 80);
const parkMat = new THREE.MeshPhongMaterial({ color: 0x669457 });
const park = new THREE.Mesh(parkGeo, parkMat);
park.rotation.x = -Math.PI / 2;
park.position.set(0, 0.03, 0);
scene.add(park);

// --- 4. 建築物の創造 ---

// 4a. 東京スカイツリー構造
const skytree = new THREE.Group();
const silver = new THREE.MeshPhongMaterial({ color: 0xbdc3c7 });

for(let i=0; i<3; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2, 20, 8), silver);
    const a = (i * 2 * Math.PI) / 3;
    leg.position.set(Math.cos(a)*6, 10, Math.sin(a)*6);
    leg.rotation.z = (a === 0) ? -0.15 : 0.15;
    skytree.add(leg);
}
const body = new THREE.Mesh(new THREE.CylinderGeometry(2, 6, 120, 16), silver);
body.position.y = 60;
skytree.add(body);

const obs1 = new THREE.Mesh(new THREE.CylinderGeometry(6, 4, 4, 16), new THREE.MeshPhongMaterial({color: 0xffffff}));
obs1.position.y = 70;
skytree.add(obs1);

const obs2 = new THREE.Mesh(new THREE.CylinderGeometry(4, 3, 3, 16), new THREE.MeshPhongMaterial({color: 0xffffff}));
obs2.position.y = 95;
skytree.add(obs2);

const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 1, 30, 8), silver);
ant.position.y = 130;
skytree.add(ant);

skytree.position.set(0, 0, 0);
scene.add(skytree);
addCircleCollider(skytree, 7); // タワーの判定

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

// 4c. 固定グリッド配置のリアルな近代ビル群（道に沿って固定並び）
const colors = [0xfcfcfc, 0xe1e4e6, 0xd1d5db, 0xfef7ea, 0xcee3f0];
const windowGeo = new THREE.PlaneGeometry(0.4, 0.6);
const windowLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); 
const windowDarkMat = new THREE.MeshBasicMaterial({ color: 0x3a586e });  

// 十字路の4つのセクターにビルを綺麗にグリッド配置
const blockPositions = [
    {startX: 15, startZ: 15, stepX: 20, stepZ: 20},   // 南東
    {startX: -75, startZ: 15, stepX: 20, stepZ: 20},  // 南西
    {startX: 15, startZ: -75, stepX: 20, stepZ: 20},  // 北東
    {startX: -75, startZ: -75, stepX: 20, stepZ: 20}  // 北西
];

let seed = 12345; // 再現可能なランダム（固定配置化）
function pseudoRandom() {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

blockPositions.forEach(block => {
    for(let r=0; r<4; r++) {
        for(let c=0; c<4; c++) {
            const x = block.startX + c * block.stepX;
            const z = block.startZ + r * block.stepZ;
            
            // 中央公園エリアと被る位置はスキップ
            if (Math.sqrt(x*x + z*z) < 45) continue;

            const bWidth = Math.floor(pseudoRandom() * 4) + 8;  
            const bHeight = Math.floor(pseudoRandom() * 20) + 15;
            const bDepth = Math.floor(pseudoRandom() * 4) + 8;

            const bGeo = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
            const bMat = new THREE.MeshPhongMaterial({ color: colors[Math.floor(pseudoRandom() * colors.length)] });
            const building = new THREE.Mesh(bGeo, bMat);
            building.position.set(x, bHeight / 2, z);
            scene.add(building);

            // 当たり判定登録
            addBoxCollider(building, bWidth + 1, bDepth + 1);

            // 窓枠グループ
            const bGroup = new THREE.Group();
            bGroup.position.copy(building.position);
            
            const rows = Math.floor(bHeight / 2) - 1;
            const colsW = Math.floor(bWidth / 1.5) - 1;

            for (let rH = 1; rH < rows; rH++) {
                const yPos = (rH * 2) - (bHeight / 2);
                const wMat = pseudoRandom() > 0.15 ? windowDarkMat : windowLightMat;

                for (let cW = 0; cW <= colsW; cW++) {
                    const xPos = (cW * 1.5) - (bWidth / 2) + 0.75;
                    const win = new THREE.Mesh(windowGeo, wMat);
                    win.position.set(xPos, yPos, bDepth / 2 + 0.01);
                    bGroup.add(win);
                }
                for (let cW = 0; cW <= colsW; cW++) {
                    const xPos = (cW * 1.5) - (bWidth / 2) + 0.75;
                    const win = new THREE.Mesh(windowGeo, wMat);
                    win.position.set(xPos, yPos, -bDepth / 2 - 0.01);
                    win.rotation.y = Math.PI;
                    bGroup.add(win);
                }
            }
            scene.add(bGroup);
        }
    }
});

// 4d. 空港セクション (北側)
const airport = new THREE.Group();
const runwayWidth = 60;
const runwayLength = 400;

const runway = new THREE.Mesh(new THREE.PlaneGeometry(runwayWidth, runwayLength), new THREE.MeshPhongMaterial({ color: 0x222225 }));
runway.rotation.x = -Math.PI / 2;
airport.add(runway);

// 滑走路マーキング
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

// リアルな航空誘導灯 (滑走路の両端に配置、自発光素材)
const greenLightMat = new THREE.MeshBasicMaterial({ color: 0x00ff33 });
const redLightMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
const whiteLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

for (let z = -200; z <= 200; z += 20) {
    let lMat = whiteLightMat;
    if (z === -200) lMat = greenLightMat; 
    if (z === 200) lMat = redLightMat;    
    
    const leftLight = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), lMat);
    leftLight.position.set(-runwayWidth/2 - 1, 0.2, z);
    const rightLight = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), lMat);
    rightLight.position.set(runwayWidth/2 + 1, 0.2, z);
    airport.add(leftLight, rightLight);
}

// 空港の端の柵（フェンス）
const fenceMat = new THREE.MeshPhongMaterial({ color: 0x718096 });
const fenceGroup = new THREE.Group();
const fWidth = runwayWidth + 20;
const fLength = runwayLength + 20;

const fenceLeft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, fLength), fenceMat);
fenceLeft.position.set(-fWidth/2, 1.5, 0);
const fenceRight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, fLength), fenceMat);
fenceRight.position.set(fWidth/2, 1.5, 0);
fenceGroup.add(fenceLeft, fenceRight);

airport.add(fenceGroup);
airport.position.set(0, 0.06, -450);
scene.add(airport);

// 空港フェンスの当たり判定（世界座標換算）
colliders.push({ type: 'box', x: -fWidth/2, z: -450, hw: 1, hd: fLength/2 });
colliders.push({ type: 'box', x: fWidth/2, z: -450, hw: 1, hd: fLength/2 });


// 4e. 高級邸宅 (My House) - スカスカを解消しリアルに強化
const mansion = new THREE.Group();
const wallMat = new THREE.MeshPhongMaterial({ color: 0xfbd38d });
const glassMat = new THREE.MeshPhongMaterial({ color: 0xadd8e6, transparent: true, opacity: 0.5 });
const frameMat = new THREE.MeshPhongMaterial({ color: 0x2d3748 });

// 厚みのある強固な床と天井
const mFloor = new THREE.Mesh(new THREE.BoxGeometry(32, 0.5, 32), wallMat);
const mRoof = new THREE.Mesh(new THREE.BoxGeometry(32, 0.5, 32), wallMat);
mRoof.position.y = 10;
mansion.add(mFloor, mRoof);

// 外壁の構築（中に入れるように、正面には隙間＝玄関を作る）
const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.8, 10, 32), wallMat);
wallLeft.position.set(-16, 5, 0);
const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.8, 10, 32), wallMat);
wallRight.position.set(16, 5, 0);
const wallBack = new THREE.Mesh(new THREE.BoxGeometry(32, 10, 0.8), wallMat);
wallBack.position.set(0, 5, -16);

// 正面壁：左右に壁を寄せ、中央を巨大なガラス窓＆玄関にする
const wallFrontLeft = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 0.8), wallMat);
wallFrontLeft.position.set(-11, 5, 16);
const wallFrontRight = new THREE.Mesh(new THREE.BoxGeometry(12, 10, 0.8), wallMat);
wallFrontRight.position.set(10, 5, 16); 

// 邸宅内の当たり判定（外壁・正面壁を個別に登録して中に入れるようにする）
colliders.push({ type: 'box', x: 120 - 16, z: -400, hw: 0.5, hd: 16 }); 
colliders.push({ type: 'box', x: 120 + 16, z: -400, hw: 0.5, hd: 16 }); 
colliders.push({ type: 'box', x: 120, z: -400 - 16, hw: 16, hd: 0.5 }); 
colliders.push({ type: 'box', x: 120 - 11, z: -400 + 16, hw: 5, hd: 0.5 });  
colliders.push({ type: 'box', x: 120 + 10, z: -400 + 16, hw: 6, hd: 0.5 });  

// 内部インテリア
const carpet = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ color: 0x9b1c1c }));
carpet.rotation.x = -Math.PI / 2;
carpet.position.set(0, 0.3, -2);
mansion.add(carpet);

// 高級インフィニティプール
const poolGeo = new THREE.PlaneGeometry(16, 26);
const poolMat = new THREE.MeshPhongMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.8 });
const pool = new THREE.Mesh(poolGeo, poolMat);
pool.rotation.x = -Math.PI / 2;
pool.position.set(26, 0.1, 0);
mansion.add(pool);

// 敷地を囲う高級な外構フェンス（柵）
const outerFenceMat = new THREE.MeshPhongMaterial({ color: 0x1a202c });
const oFenceGeo = new THREE.BoxGeometry(0.3, 2, 40);
const oFenceL = new THREE.Mesh(oFenceGeo, outerFenceMat); oFenceL.position.set(-20, 1, 0);
const oFenceR = new THREE.Mesh(oFenceGeo, outerFenceMat); oFenceR.position.set(38, 1, 0);
mansion.add(oFenceL, oFenceR);
// 外柵の当たり判定
colliders.push({ type: 'box', x: 120 - 20, z: -400, hw: 0.2, hd: 20 });
colliders.push({ type: 'box', x: 120 + 38, z: -400, hw: 0.2, hd: 20 });

mansion.position.set(120, 0, -400);
scene.add(mansion);


// --- 4f. モブ建物の追加配置（密度強化） ---
const mobColors = [0x95a5a6, 0x7f8c8d, 0x34495e, 0xd2d7d9];
for (let i = -5; i <= 5; i++) {
    if (Math.abs(i) < 2) continue;
    const sideX1 = new THREE.Mesh(new THREE.BoxGeometry(10, 12, 10), new THREE.MeshPhongMaterial({ color: mobColors[Math.floor(pseudoRandom() * mobColors.length)] }));
    sideX1.position.set(i * 18, 6, 42);
    scene.add(sideX1);
    addBoxCollider(sideX1, 11, 11);

    const sideX2 = new THREE.Mesh(new THREE.BoxGeometry(10, 12, 10), new THREE.MeshPhongMaterial({ color: mobColors[Math.floor(pseudoRandom() * mobColors.length)] }));
    sideX2.position.set(i * 18, 6, -42);
    scene.add(sideX2);
    addBoxCollider(sideX2, 11, 11);

    const sideZ1 = new THREE.Mesh(new THREE.BoxGeometry(10, 12, 10), new THREE.MeshPhongMaterial({ color: mobColors[Math.floor(pseudoRandom() * mobColors.length)] }));
    sideZ1.position.set(42, 6, i * 18);
    scene.add(sideZ1);
    addBoxCollider(sideZ1, 11, 11);

    const sideZ2 = new THREE.Mesh(new THREE.BoxGeometry(10, 12, 10), new THREE.MeshPhongMaterial({ color: mobColors[Math.floor(pseudoRandom() * mobColors.length)] }));
    sideZ2.position.set(-42, 6, i * 18);
    scene.add(sideZ2);
    addBoxCollider(sideZ2, 11, 11);
}


// --- 4g. 線路と電車の創造（街の全区画をダイナミックに囲う大環状線） ---
const trackPoints = [];
const halfSize = 180; 

for (let z = halfSize; z >= -halfSize; z -= 4) trackPoints.push(new THREE.Vector3(-halfSize, 0.4, z));
for (let x = -halfSize; x <= halfSize; x += 4) trackPoints.push(new THREE.Vector3(x, 0.4, -halfSize));
for (let z = -halfSize; z <= halfSize; z += 4) trackPoints.push(new THREE.Vector3(halfSize, 0.4, z));
for (let x = halfSize; x >= -halfSize; x -= 4) trackPoints.push(new THREE.Vector3(x, 0.4, halfSize));

const trackGroup = new THREE.Group();
const tieMat = new THREE.MeshPhongMaterial({ color: 0x5c4033 });
const railMat = new THREE.MeshPhongMaterial({ color: 0xd1d5db, specular: 0xffffff });
trackPoints.forEach((pt, idx) => {
    if (idx % 2 === 0) {
        const tie = new THREE.Mesh(new THREE.BoxGeometry(5, 0.1, 0.8), tieMat);
        tie.position.copy(pt);
        if (Math.abs(pt.x) === halfSize && Math.abs(pt.z) !== halfSize) tie.rotation.y = Math.PI / 2;
        trackGroup.add(tie);
    }
});
scene.add(trackGroup);

const trainGroup = new THREE.Group();
const carMat = new THREE.MeshPhongMaterial({ color: 0x009b4f, specular: 0xffffff }); 
const glassUnitMat = new THREE.MeshPhongMaterial({ color: 0x111111 });

function createCar() {
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.4, 12), carMat);
    body.position.y = 1.4;
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.3, 0.2), glassUnitMat);
    frontGlass.position.set(0, 1.7, 6.01);
    car.add(body, frontGlass);
    return car;
}

const leadCar = createCar();
const secondCar = createCar();
trainGroup.add(leadCar, secondCar);
scene.add(trainGroup);

let trainProgress = 0.0;
let trainSpeed = 0.0;
let isDriving = false; 


// --- 5. 入力・操作システム ---
const moveInput = { forward: 0, backward: 0, left: 0, right: 0 };
const moveVector = new THREE.Vector3();

const onKeyDown = (e) => {
    switch (e.code) {
        case 'KeyW': case 'ArrowUp': moveInput.forward = 1; break;
        case 'KeyA': case 'ArrowLeft': moveInput.left = 1; break;
        case 'KeyS': case 'ArrowDown': moveInput.backward = 1; break;
        case 'KeyD': case 'ArrowRight': moveInput.right = 1; break;
        case 'Enter':
            if (isDriving) {
                isDriving = false;
                camera.position.copy(trainGroup.position);
                camera.position.x += 6; 
                camera.position.y = 2.5;
            } else {
                const distToTrain = camera.position.distanceTo(trainGroup.position);
                if (distToTrain < 30) {
                    isDriving = true;
                }
            }
            break;
    }
};
const onKeyUp = (e) => {
    switch (e.code) {
        case 'KeyW': case 'ArrowUp': moveInput.forward = 0; break;
        case 'KeyA': case 'ArrowLeft': moveInput.left = 0; break;
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
            if (joystickBase) {
                joystickBase.style.display = 'block';
                joystickBase.style.left = leftStartPos.x + 'px';
                joystickBase.style.top = leftStartPos.y + 'px';
                joystickStick.style.transform = 'translate(0px, 0px)';
            }
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
            if (joystickStick) joystickStick.style.transform = `translate(${moveX}px, ${moveY}px)`;
            
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
            if (joystickBase) joystickBase.style.display = 'none';
            moveInput.forward = 0; moveInput.backward = 0; moveInput.left = 0; moveInput.right = 0;
        }
        if (touch.identifier === touchRightId) touchRightId = null;
    }
});

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


// --- 6. ループ処理と衝突判定 ---
const clock = new THREE.Clock();
const speed = 25.0; 

function checkCollision(nextX, nextZ) {
    for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        if (c.type === 'box') {
            if (nextX >= c.x - c.hw && nextX <= c.x + c.hw &&
                nextZ >= c.z - c.hd && nextZ <= c.z + c.hd) {
                return true; 
            }
        } else if (c.type === 'circle') {
            const dx = nextX - c.x;
            const dz = nextZ - c.z;
            if (dx*dx + dz*dz < c.r * c.r) {
                return true; 
            }
        }
    }
    return false;
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (isDriving) {
        if (moveInput.forward > 0) trainSpeed += 15.0 * delta;
        else if (moveInput.backward > 0) trainSpeed -= 15.0 * delta;
        else trainSpeed *= 0.98; 

        trainSpeed = Math.max(-15.0, Math.min(45.0, trainSpeed));
    } else {
        if (trainSpeed < 25.0) trainSpeed += 5.0 * delta;
    }

    trainProgress += (trainSpeed / 4.0) * delta; 
    const totalPoints = trackPoints.length;

    let currentIdx = Math.floor(trainProgress) % totalPoints;
    if (currentIdx < 0) currentIdx += totalPoints;

    const leadPos = trackPoints[currentIdx];
    const nextPos = trackPoints[(currentIdx + 1) % totalPoints];
    
    leadCar.position.copy(leadPos);
    leadCar.lookAt(nextPos.x, leadCar.position.y, nextPos.z);

    let secondIdx = (currentIdx - 4) % totalPoints; 
    if (secondIdx < 0) secondIdx += totalPoints;
    const secondPos = trackPoints[secondIdx];
    const secondNextPos = trackPoints[(secondIdx + 1) % totalPoints];
    secondCar.position.copy(secondPos);
    secondCar.lookAt(secondNextPos.x, secondCar.position.y, secondNextPos.z);

    trainGroup.position.copy(leadPos);

    if (isDriving) {
        camera.position.copy(leadPos);
        camera.position.y += 2.4; 
        camera.quaternion.setFromEuler(new THREE.Euler(cameraRotation.x, cameraRotation.y, 0, 'YXZ'));
        camera.lookAt(nextPos.x, camera.position.y, nextPos.z);
    } else {
        camera.quaternion.setFromEuler(new THREE.Euler(cameraRotation.x, cameraRotation.y, 0, 'YXZ'));

        const zMove = moveInput.backward - moveInput.forward;
        const xMove = moveInput.right - moveInput.left;

        moveVector.set(xMove, 0, zMove);
        moveVector.normalize();
        moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);

        const nextX = camera.position.x + moveVector.x * speed * delta;
        const nextZ = camera.position.z + moveVector.z * speed * delta;

        if (!checkCollision(nextX, camera.position.z)) {
            camera.position.x = nextX;
        }
        if (!checkCollision(camera.position.x, nextZ)) {
            camera.position.z = nextZ;
        }
        camera.position.y = 2.5; 
    }

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
