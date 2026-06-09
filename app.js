// --- 0. 起動時のモード選択 ---
// ユーザーにモードを入力させ、大文字小文字を区別せず判定
const modeInput = prompt("モードを選択してください。\n【 n 】：街モード（徒歩・当たり判定あり）\n【 f 】：フライトモード（飛行シム）", "n");
const GAME_MODE = (modeInput && modeInput.toLowerCase() === 'f') ? 'FLIGHT' : 'NORMAL';

// --- 1. シーン・カメラ・レンダラーの設定 ---
const scene = new THREE.Scene();

// ご主人様拘りの「濃い快晴（0x1e90ff）」と「霧濃度（0.002）」
const clearBlue = 0x1e90ff;
scene.background = new THREE.Color(clearBlue);
scene.fog = new THREE.FogExp2(clearBlue, 0.002);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- 2. ライティング ---
// 街がクッキリ引き締まるように直射日光を強めに調整してございます
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); 
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
sunLight.position.set(100, 150, 100);
scene.add(sunLight);
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x94b3ca, 0.3);
scene.add(hemiLight);

// --- 3. モード別の初期設定 ＆ 物理変数 ---
let speed = 0;              // フライト用：現在の速度
const MAX_SPEED = 80;       // フライト用：最高速度
const TAKE_OFF_SPEED = 35;   // フライト用：離陸可能速度
let isGrounded = true;      // フライト用：接地フラグ

let cameraRotation = { x: 0, y: 0 }; // 街モード用：視点回転

if (GAME_MODE === 'NORMAL') {
    // 街モード：中央公園の手前に配置（徒歩の目線高さ 2.5）
    camera.position.set(0, 2.5, 60);
} else {
    // フライトモード：北側滑走路の手前（南端）に配置、機首を真っ直ぐ北（Zマイナス方向）に向ける
    camera.position.set(0, 2, -230);
    camera.rotation.set(0, Math.PI, 0); 
}

// 当たり判定（コライダー）用の配列（街モードでのみ使用）
const colliders = [];
function addBoxCollider(mesh, width, depth) {
    colliders.push({ type: 'box', x: mesh.position.x, z: mesh.position.z, hw: width / 2, hd: depth / 2 });
}
function addCircleCollider(mesh, radius) {
    colliders.push({ type: 'circle', x: mesh.position.x, z: mesh.position.z, r: radius });
}

// --- 4. 共通の世界構築（地形・道路・スカイツリー・ビル群・空港・邸宅） ---

// 大地・道路・公園
const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshPhongMaterial({ color: 0xccaaaa }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const roadMat = new THREE.MeshPhongMaterial({ color: 0x44444a });
const roadH = new THREE.Mesh(new THREE.PlaneGeometry(2000, 16), roadMat); roadH.rotation.x = -Math.PI / 2; roadH.position.y = 0.02; scene.add(roadH);
const roadV = new THREE.Mesh(new THREE.PlaneGeometry(16, 2000), roadMat); roadV.rotation.x = -Math.PI / 2; roadV.position.y = 0.02; scene.add(roadV);

const park = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshPhongMaterial({ color: 0x669457 }));
park.rotation.x = -Math.PI / 2; park.position.set(0, 0.03, 0); scene.add(park);

// スカイツリー
const skytree = new THREE.Group();
const silver = new THREE.MeshPhongMaterial({ color: 0xbdc3c7 });
for(let i=0; i<3; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2, 20, 8), silver);
    const a = (i * 2 * Math.PI) / 3; leg.position.set(Math.cos(a)*6, 10, Math.sin(a)*6); leg.rotation.z = (a === 0) ? -0.15 : 0.15; skytree.add(leg);
}
const body = new THREE.Mesh(new THREE.CylinderGeometry(2, 6, 120, 16), silver); body.position.y = 60; skytree.add(body);
const obs1 = new THREE.Mesh(new THREE.CylinderGeometry(6, 4, 4, 16), new THREE.MeshPhongMaterial({color: 0xffffff})); obs1.position.y = 70; skytree.add(obs1);
const obs2 = new THREE.Mesh(new THREE.CylinderGeometry(4, 3, 3, 16), new THREE.MeshPhongMaterial({color: 0xffffff})); obs2.position.y = 95; skytree.add(obs2);
const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 1, 30, 8), silver); ant.position.y = 130; skytree.add(ant);
scene.add(skytree);
addCircleCollider(skytree, 7);

// 固定グリッド配置のビル群
const colors = [0xfcfcfc, 0xe1e4e6, 0xd1d5db, 0xfef7ea, 0xcee3f0];
const windowGeo = new THREE.PlaneGeometry(0.4, 0.6);
const windowLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); 
const windowDarkMat = new THREE.MeshBasicMaterial({ color: 0x3a586e });  
const blockPositions = [
    {startX: 15, startZ: 15, stepX: 20, stepZ: 20}, {startX: -75, startZ: 15, stepX: 20, stepZ: 20},
    {startX: 15, startZ: -75, stepX: 20, stepZ: 20}, {startX: -75, startZ: -75, stepX: 20, stepZ: 20}
];
let seed = 12345;
function pseudoRandom() { let x = Math.sin(seed++) * 10000; return x - Math.floor(x); }

blockPositions.forEach(block => {
    for(let r=0; r<4; r++) {
        for(let c=0; c<4; c++) {
            const x = block.startX + c * block.stepX; const z = block.startZ + r * block.stepZ;
            if (Math.sqrt(x*x + z*z) < 45) continue;
            const bWidth = Math.floor(pseudoRandom() * 4) + 8; const bHeight = Math.floor(pseudoRandom() * 20) + 15; const bDepth = Math.floor(pseudoRandom() * 4) + 8;
            const building = new THREE.Mesh(new THREE.BoxGeometry(bWidth, bHeight, bDepth), new THREE.MeshPhongMaterial({ color: colors[Math.floor(pseudoRandom() * colors.length)] }));
            building.position.set(x, bHeight / 2, z); scene.add(building);
            addBoxCollider(building, bWidth + 1, bDepth + 1);

            // 窓
            const bGroup = new THREE.Group(); bGroup.position.copy(building.position);
            const rows = Math.floor(bHeight / 2) - 1; const colsW = Math.floor(bWidth / 1.5) - 1;
            for (let rH = 1; rH < rows; rH++) {
                const yPos = (rH * 2) - (bHeight / 2); const wMat = pseudoRandom() > 0.15 ? windowDarkMat : windowLightMat;
                for (let cW = 0; cW <= colsW; cW++) {
                    const xPos = (cW * 1.5) - (bWidth / 2) + 0.75; const win = new THREE.Mesh(windowGeo, wMat); win.position.set(xPos, yPos, bDepth / 2 + 0.01); bGroup.add(win);
                }
                for (let cW = 0; cW <= colsW; cW++) {
                    const xPos = (cW * 1.5) - (bWidth / 2) + 0.75; const win = new THREE.Mesh(windowGeo, wMat); win.position.set(xPos, yPos, -bDepth / 2 - 0.01); win.rotation.y = Math.PI; bGroup.add(win);
                }
            }
            scene.add(bGroup);
        }
    }
});

// 空港セクション
const airport = new THREE.Group();
const runwayWidth = 60; const runwayLength = 500;
const runway = new THREE.Mesh(new THREE.PlaneGeometry(runwayWidth, runwayLength), new THREE.MeshPhongMaterial({ color: 0x222225 }));
runway.rotation.x = -Math.PI / 2; airport.add(runway);
for(let i=0; i<=10; i++) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2, 25), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    stripe.rotation.x = -Math.PI / 2; stripe.position.set(0, 0.1, -250 + (i * 50)); airport.add(stripe);
}
const greenMat = new THREE.MeshBasicMaterial({ color: 0x00ff33 }); const redMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
for (let z = -250; z <= 250; z += 25) {
    let lMat = (z === -250) ? greenMat : (z === 250 ? redMat : new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const lL = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), lMat); lL.position.set(-runwayWidth/2 - 2, 0.3, z);
    const rL = lL.clone(); rL.position.x = runwayWidth/2 + 2; airport.add(lL, rL);
}
// 空港フェンス
const fenceMat = new THREE.MeshPhongMaterial({ color: 0x718096 });
const fWidth = runwayWidth + 20; const fLength = runwayLength + 20;
const fB = new THREE.Mesh(new THREE.BoxGeometry(fWidth, 3, 0.5), fenceMat); fB.position.set(0, 1.5, -fLength/2);
const fL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, fLength), fenceMat); fL.position.set(-fWidth/2, 1.5, 0);
const fR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, fLength), fenceMat); fR.position.set(fWidth/2, 1.5, 0);
airport.add(fB, fL, fR);
airport.position.set(0, 0.06, -450);
scene.add(airport);
// 空港フェンス当たり判定（世界座標）
colliders.push({ type: 'box', x: 0, z: -450 - fLength/2, hw: fWidth/2, hd: 1 });
colliders.push({ type: 'box', x: -fWidth/2, z: -450, hw: 1, hd: fLength/2 });
colliders.push({ type: 'box', x: fWidth/2, z: -450, hw: 1, hd: fLength/2 });

// 高級邸宅
const mansion = new THREE.Group();
const wallMat = new THREE.MeshPhongMaterial({ color: 0xf7fafc });
const glassMat = new THREE.MeshPhongMaterial({ color: 0xadd8e6, transparent: true, opacity: 0.5 });
const mFloor = new THREE.Mesh(new THREE.BoxGeometry(32, 0.5, 32), wallMat);
const mRoof = new THREE.Mesh(new THREE.BoxGeometry(32, 0.5, 32), wallMat); mRoof.position.y = 10; mansion.add(mFloor, mRoof);
const wL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 10, 32), wallMat); wL.position.set(-16, 5, 0);
const wR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 10, 32), wallMat); wR.position.set(16, 5, 0);
const wB = new THREE.Mesh(new THREE.BoxGeometry(32, 10, 0.8), wallMat); wB.position.set(0, 5, -16);
const wFL = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 0.8), wallMat); wFL.position.set(-11, 5, 16);
const wFR = new THREE.Mesh(new THREE.BoxGeometry(12, 10, 0.8), wallMat); wFR.position.set(10, 5, 16);
const lWin = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 0.2), glassMat); lWin.position.set(6, 4.5, 16); 
mansion.add(wL, wR, wB, wFL, wFR, lWin);
const carpet = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ color: 0x9b1c1c })); carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, 0.3, -2); mansion.add(carpet);
const pool = new THREE.Mesh(new THREE.PlaneGeometry(16, 26), new THREE.MeshPhongMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.8 })); pool.rotation.x = -Math.PI / 2; pool.position.set(26, 0.1, 0); mansion.add(pool);
mansion.position.set(120, 0, -400); scene.add(mansion);
// 邸宅壁判定
colliders.push({ type: 'box', x: 120 - 16, z: -400, hw: 0.5, hd: 16 }); colliders.push({ type: 'box', x: 120 + 16, z: -400, hw: 0.5, hd: 16 });
colliders.push({ type: 'box', x: 120, z: -400 - 16, hw: 16, hd: 0.5 }); colliders.push({ type: 'box', x: 120 - 11, z: -400 + 16, hw: 5, hd: 0.5 }); colliders.push({ type: 'box', x: 120 + 10, z: -400 + 16, hw: 6, hd: 0.5 });


// --- 5. 入力・操作マッピング ---
const keyboardInput = { forward: 0, backward: 0, left: 0, right: 0, pitchUp: 0, pitchDown: 0, rollLeft: 0, rollRight: 0, throttleUp: 0, throttleDown: 0 };

document.addEventListener('keydown', (e) => {
    if (GAME_MODE === 'NORMAL') {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp': keyboardInput.forward = 1; break;
            case 'KeyS': case 'ArrowDown': keyboardInput.backward = 1; break;
            case 'KeyA': case 'ArrowLeft': keyboardInput.left = 1; break;
            case 'KeyD': case 'ArrowRight': keyboardInput.right = 1; break;
        }
    } else {
        switch (e.code) {
            case 'KeyW': keyboardInput.pitchUp = 1; break;
            case 'KeyS': keyboardInput.pitchDown = 1; break;
            case 'KeyA': keyboardInput.rollLeft = 1; break;
            case 'KeyD': keyboardInput.rollRight = 1; break;
            case 'ShiftLeft': keyboardInput.throttleUp = 1; break;
            case 'ControlLeft': keyboardInput.throttleDown = 1; break;
        }
    }
});
document.addEventListener('keyup', (e) => {
    if (GAME_MODE === 'NORMAL') {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp': keyboardInput.forward = 0; break;
            case 'KeyS': case 'ArrowDown': keyboardInput.backward = 0; break;
            case 'KeyA': case 'ArrowLeft': keyboardInput.left = 0; break;
            case 'KeyD': case 'ArrowRight': keyboardInput.right = 0; break;
        }
    } else {
        switch (e.code) {
            case 'KeyW': keyboardInput.pitchUp = 0; break;
            case 'KeyS': keyboardInput.pitchDown = 0; break;
            case 'KeyA': keyboardInput.rollLeft = 0; break;
            case 'KeyD': keyboardInput.rollRight = 0; break;
            case 'ShiftLeft': keyboardInput.throttleUp = 0; break;
            case 'ControlLeft': keyboardInput.throttleDown = 0; break;
        }
    }
});

// タッチパネル操作（iPad）
const joystickBase = document.getElementById('joystick-base');
const joystickStick = document.getElementById('joystick-stick');
let touchLeftId = null; let touchRightId = null;
let leftStartPos = { x: 0, y: 0 }; let rightLastPos = { x: 0, y: 0 };
let isMouseDown = false; let mouseLastPos = { x: 0, y: 0 };

window.addEventListener('touchstart', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (GAME_MODE === 'NORMAL') {
            if (touch.clientX < window.innerWidth / 2 && touchLeftId === null) {
                touchLeftId = touch.identifier; leftStartPos = { x: touch.clientX, y: touch.clientY };
                joystickBase.style.display = 'block'; joystickBase.style.left = leftStartPos.x + 'px'; joystickBase.style.top = leftStartPos.y + 'px';
                joystickStick.style.transform = 'translate(0px, 0px)';
            } else if (touch.clientX >= window.innerWidth / 2 && touchRightId === null) {
                touchRightId = touch.identifier; rightLastPos = { x: touch.clientX, y: touch.clientY };
            }
        } else {
            // フライトモードの簡易タッチ開始
            if (touchLeftId === null) {
                touchLeftId = touch.identifier; leftStartPos = { x: touch.clientX, y: touch.clientY };
                keyboardInput.throttleUp = 1; // タッチ中加速
            }
        }
    }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (GAME_MODE === 'NORMAL') {
            if (touch.identifier === touchLeftId) {
                const distX = touch.clientX - leftStartPos.x; const distY = touch.clientY - leftStartPos.y;
                const distance = Math.sqrt(distX*distX + distY*distY); const maxDist = 40;
                let moveX = distX; let moveY = distY;
                if (distance > maxDist) { moveX = (distX / distance) * maxDist; moveY = (distY / distance) * maxDist; }
                joystickStick.style.transform = `translate(${moveX}px, ${moveY}px)`;
                keyboardInput.right = moveX > 0 ? moveX / maxDist : 0; keyboardInput.left = moveX < 0 ? -moveX / maxDist : 0;
                keyboardInput.backward = moveY > 0 ? moveY / maxDist : 0; keyboardInput.forward = moveY < 0 ? -moveY / maxDist : 0;
            }
            if (touch.identifier === touchRightId) {
                const movementX = touch.clientX - rightLastPos.x; const movementY = touch.clientY - rightLastPos.y;
                cameraRotation.y -= movementX * 0.006; cameraRotation.x -= movementY * 0.006;
                cameraRotation.x = Math.max(-Math.PI/3.5, Math.min(Math.PI/3.5, cameraRotation.x));
                rightLastPos = { x: touch.clientX, y: touch.clientY };
            }
        } else {
            // フライトモードの簡易スワイプ
            if (touch.identifier === touchLeftId) {
                const dx = touch.clientX - leftStartPos.x; const dy = touch.clientY - leftStartPos.y;
                keyboardInput.rollRight = dx > 20 ? Math.min(dx / 100, 1) : 0; keyboardInput.rollLeft = dx < -20 ? Math.min(-dx / 100, 1) : 0;
                keyboardInput.pitchUp = dy > 20 ? Math.min(dy / 100, 1) : 0; keyboardInput.pitchDown = dy < -20 ? Math.min(-dy / 100, 1) : 0;
            }
        }
    }
}, { passive: false });

window.addEventListener('touchend', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchLeftId) {
            touchLeftId = null; joystickBase.style.display = 'none';
            keyboardInput.forward = 0; keyboardInput.backward = 0; keyboardInput.left = 0; keyboardInput.right = 0;
            keyboardInput.pitchUp = 0; keyboardInput.pitchDown = 0; keyboardInput.rollLeft = 0; keyboardInput.rollRight = 0; keyboardInput.throttleUp = 0;
        }
        if (touch.identifier === touchRightId) touchRightId = null;
    }
});

// マウス操作（街モードの視点変更用）
window.addEventListener('mousedown', (e) => { if(GAME_MODE === 'NORMAL') { isMouseDown = true; mouseLastPos = { x: e.clientX, y: e.clientY }; } });
window.addEventListener('mousemove', (e) => {
    if (!isMouseDown || GAME_MODE !== 'NORMAL') return;
    const movementX = e.clientX - mouseLastPos.x; const movementY = e.clientY - mouseLastPos.y;
    cameraRotation.y -= movementX * 0.003; cameraRotation.x -= movementY * 0.003;
    cameraRotation.x = Math.max(-Math.PI/3.5, Math.min(Math.PI/3.5, cameraRotation.x));
    mouseLastPos = { x: e.clientX, y: e.clientY };
});
window.addEventListener('mouseup', () => isMouseDown = false);


// --- 6. UIテキスト表示のセットアップ ---
const ui = document.getElementById('ui');
const statsElement = document.createElement('p');
statsElement.style.fontSize = "15px";
statsElement.style.fontFamily = "monospace";
statsElement.style.lineHeight = "1.5";
ui.appendChild(statsElement);

if (GAME_MODE === 'NORMAL') {
    ui.querySelector('h1').innerText = "帝国 v3.0 - 街歩きモード";
    ui.querySelector('p').innerHTML = "【操作】WASD または 左ジョイスティックで移動 / マウスドラッグ または 右画面スワイプで視点変更";
} else {
    ui.querySelector('h1').innerText = "帝国 v3.0 - フライトシムモード";
    ui.querySelector('p').innerHTML = "【PC】Shift:加速 / Ctrl:減速 / W:上昇 / S:下降 / A,D:傾け<br>【iPad】タッチで加速、上下左右スワイプで操縦";
}


// --- 7. メインループとモード別移動ロジック ---
const clock = new THREE.Clock();
const walkSpeed = 25.0; // 街モードの移動速度

// 街モード用の衝突判定関数
function checkCollision(nextX, nextZ) {
    for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        if (c.type === 'box') {
            if (nextX >= c.x - c.hw && nextX <= c.x + c.hw && nextZ >= c.z - c.hd && nextZ <= c.z + c.hd) return true;
        } else if (c.type === 'circle') {
            const dx = nextX - c.x; const dz = nextZ - c.z;
            if (dx*dx + dz*dz < c.r * c.r) return true;
        }
    }
    return false;
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (GAME_MODE === 'NORMAL') {
        // ==========================================
        // 街モード（NORMAL）のロジック
        // ==========================================
        camera.quaternion.setFromEuler(new THREE.Euler(cameraRotation.x, cameraRotation.y, 0, 'YXZ'));
        const zMove = keyboardInput.backward - keyboardInput.forward;
        const xMove = keyboardInput.right - keyboardInput.left;

        const moveVector = new THREE.Vector3(xMove, 0, zMove).normalize();
        moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);

        const nextX = camera.position.x + moveVector.x * walkSpeed * delta;
        const nextZ = camera.position.z + moveVector.z * walkSpeed * delta;

        if (!checkCollision(nextX, camera.position.z)) camera.position.x = nextX;
        if (!checkCollision(camera.position.x, nextZ)) camera.position.z = nextZ;

        camera.position.y = 2.5; // 常に一定の目線の高さ

        statsElement.innerHTML = `座標: X:${Math.round(camera.position.x)}, Z:${Math.round(camera.position.z)}`;

    } else {
        // ==========================================
        // フライトモード（FLIGHT）のロジック
        // ==========================================
        // スロットル・速度計算
        if (keyboardInput.throttleUp) speed = Math.min(speed + 20 * delta, MAX_SPEED);
        if (keyboardInput.throttleDown) speed = Math.max(speed - 30 * delta, 0);
        if (!keyboardInput.throttleUp && speed > 0) speed = Math.max(speed - 5 * delta, 0);

        // 離陸・接地判定
        if (camera.position.y > 2.1) {
            isGrounded = false;
        } else {
            isGrounded = true;
            camera.position.y = 2;
            camera.rotation.z = 0; camera.rotation.x = 0;
        }

        // 操縦（回転）ローカル軸基準
        if (keyboardInput.rollLeft)  camera.rotateZ( 1.2 * delta * keyboardInput.rollLeft);
        if (keyboardInput.rollRight) camera.rotateZ(-1.2 * delta * keyboardInput.rollRight);
        
        if (speed >= TAKE_OFF_SPEED || !isGrounded) {
            if (keyboardInput.pitchUp)   camera.rotateX( 1.0 * delta * keyboardInput.pitchUp);
            if (keyboardInput.pitchDown) camera.rotateX(-1.0 * delta * keyboardInput.pitchDown);
        }

        // 3次元正面への前進
        camera.translateZ(-speed * delta);

        // 地面衝突時の簡易着陸補正
        if (camera.position.y < 2) camera.position.y = 2;

        statsElement.innerHTML = `
            速度: ${Math.round(speed * 2)} kt ${speed >= TAKE_OFF_SPEED ? '<span style="color:#00ff33;">(離陸可能)</span>' : ''}<br>
            高度: ${Math.round((camera.position.y - 2) * 3)} ft<br>
            状態: ${isGrounded ? '<span style="color:#ff9900;">滑走中</span>' : '<span style="color:#00ffff; font-weight:bold;">◆ 飛行中 ◆</span>'}
        `;
    }

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
