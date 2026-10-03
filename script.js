(() => {
"use strict";

/* ---------- DATA ---------- */
const photoData = [
  {src:"./assets/photos/01.jpg",cap:"The first time you told me something from your past and trusted me with it."},
  {src:"./assets/photos/02.jpg",cap:"That quiet smile you do when you think no one is looking."},
  {src:"./assets/photos/03.jpg",cap:"The way you still get soft over the things you love."},
  {src:"./assets/photos/04.jpg",cap:"A place that still feels like home to you."},
  {src:"./assets/photos/05.jpg",cap:"One of the ordinary days that somehow became everything."},
  {src:"./assets/photos/06.jpg",cap:"You, being completely yourself."},
  {src:"./assets/photos/07.jpg",cap:"The version of you that already existed before September."}
];

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const scenes = $$(".scene");
const progress = $("#progress");
const counter = $("#sceneCounter");
const stage = $("#photoStage");

let current = 0;
let locked = false;
let built = false;
let galleryDragging = false;
let galleryStartX = 0;
let galleryRotation = 0;
let lastGalleryX = 0;
let currentPhotoIndex = -1;
let touchStartX = 0;

/* ---------- SCENES: hard-independent navigation ---------- */
function updateUI() {
  counter.textContent = String(current + 1).padStart(2,"0") + " / " + scenes.length;
  progress.style.width = ((current + 1) / scenes.length * 100) + "%";
}

// Navigation deliberately does NOT depend on GSAP, Three.js, WebGL, or any animation callback.
function setScene(next) {
  if (!Number.isInteger(next) || next < 0 || next >= scenes.length || next === current) return;

  const oldScene = scenes[current];
  const newScene = scenes[next];
  if (!oldScene || !newScene) return;

  oldScene.classList.remove("active");
  newScene.classList.add("active");
  current = next;
  updateUI();

  // Optional visual enhancement only. Navigation is already complete above.
  if (window.gsap) {
    try {
      gsap.fromTo(newScene, {opacity:0}, {opacity:1, duration:.45, ease:"power2.out"});
    } catch (_) {}
  }

  if (current === 3) buildGallery();
  if (current === 7) openLotus();
}

// Event delegation means buttons added/rearranged later still work.
document.addEventListener("click", e => {
  const nextButton = e.target.closest("[data-next]");
  if (nextButton) {
    e.preventDefault();
    e.stopPropagation();
    setScene(current + 1);
    return;
  }

  const replayButton = e.target.closest("#replay");
  if (replayButton) {
    e.preventDefault();
    e.stopPropagation();
    setScene(0);
  }
});

$$('.comfort').forEach(el => el.addEventListener('click', () => {
  const box = $("#comfortMessage");
  box.textContent = el.dataset.msg || "";
  if (window.gsap) {
    try { gsap.fromTo(box,{opacity:0,y:8},{opacity:1,y:0,duration:.35}); } catch (_) {}
  }
}));

window.addEventListener("wheel", e => {
  if (Math.abs(e.deltaY) < 30) return;
  setScene(current + (e.deltaY > 0 ? 1 : -1));
},{passive:true});

window.addEventListener("keydown", e => {
  if (["ArrowRight","ArrowDown"," ","PageDown"].includes(e.key)) {
    e.preventDefault();
    setScene(current + 1);
  } else if (["ArrowLeft","ArrowUp","PageUp"].includes(e.key)) {
    e.preventDefault();
    setScene(current - 1);
  }
});

window.addEventListener("touchstart", e => {
  if ($("#lightbox").classList.contains("open")) return;
  touchStartX = e.touches[0].clientX;
},{passive:true});

window.addEventListener("touchend", e => {
  if ($("#lightbox").classList.contains("open") || current === 3) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 55) setScene(current + (dx < 0 ? 1 : -1));
},{passive:true});

/* ---------- GALLERY ---------- */
const cards = [];

function buildGallery() {
  if (built) return;
  built = true;

  photoData.forEach((d,i) => {
    const card = document.createElement("div");
    card.className = "photo-card";
    card.dataset.index = i;

    const img = document.createElement("img");
    img.src = d.src;
    img.alt = "Kammo memory " + (i + 1);
    img.draggable = false;
    img.addEventListener("error", () => {
      card.classList.add("missing");
      card.innerHTML = "PHOTO " + String(i + 1).padStart(2,"0") + "<br>ADD IMAGE";
    });

    card.appendChild(img);
    stage.appendChild(card);
    cards.push(card);

    card.addEventListener("click", e => {
      if (Math.abs(e.clientX - galleryStartX) > 10) return;
      openLightbox(i);
    });
  });

  layoutCards();
}

function layoutCards() {
  if (!cards.length) return;
  const radius = Math.min(window.innerWidth * .29, 270);
  cards.forEach((card,i) => {
    const angle = (i / cards.length) * Math.PI * 2 + galleryRotation - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * .48;
    const z = (Math.sin(angle) + 1) * 0.5;
    const scale = .82 + z * .28;
    card.style.zIndex = String(10 + Math.round(z * 20));
    card.style.transform = `translate3d(${x}px,${y}px,0) rotate(${angle * 10}deg) scale(${scale})`;
  });
}

stage.addEventListener("pointerdown", e => {
  galleryDragging = true;
  galleryStartX = e.clientX;
  lastGalleryX = e.clientX;
  stage.setPointerCapture?.(e.pointerId);
});

stage.addEventListener("pointermove", e => {
  if (!galleryDragging) return;
  const dx = e.clientX - lastGalleryX;
  lastGalleryX = e.clientX;
  galleryRotation += dx * .006;
  layoutCards();
});

stage.addEventListener("pointerup", () => galleryDragging = false);
stage.addEventListener("pointercancel", () => galleryDragging = false);

/* ---------- LIGHTBOX ---------- */
const lb = $("#lightbox");
const lbImg = $("#lightboxImg");
const lbCap = $("#lightboxCap");

function openLightbox(index) {
  currentPhotoIndex = index;
  lbImg.src = photoData[index].src;
  lbCap.textContent = photoData[index].cap;
  lb.classList.add("open");
  spawnFairyDust();
  startButterflies();
}

function closeLightbox() {
  lb.classList.remove("open");
  stopButterflies();
}

$("#closeLb").addEventListener("click", closeLightbox);
lb.addEventListener("click", e => { if (e.target === lb) closeLightbox(); });

let lbTouchX = 0;
lb.addEventListener("touchstart", e => lbTouchX = e.touches[0].clientX,{passive:true});
lb.addEventListener("touchend", e => {
  const dx = e.changedTouches[0].clientX - lbTouchX;
  if (Math.abs(dx) < 65 || currentPhotoIndex < 0) return;
  const next = (currentPhotoIndex + (dx < 0 ? 1 : -1) + photoData.length) % photoData.length;
  openLightbox(next);
},{passive:true});

function spawnFairyDust() {
  if (!window.gsap) return;
  for (let i=0;i<35;i++) {
    const dust = document.createElement("div");
    const size = 4 + Math.random() * 7;
    dust.style.cssText =
      `position:fixed;width:${size}px;height:${size}px;border-radius:50%;` +
      `background:radial-gradient(circle,#fff 15%,#ffb6c1 55%,transparent);` +
      `box-shadow:0 0 12px #ff69b4,0 0 24px #ffb6c1;z-index:390;pointer-events:none`;
    document.body.appendChild(dust);
    gsap.set(dust,{left:(28+Math.random()*44)+"vw",top:(28+Math.random()*44)+"vh",scale:0,opacity:1});
    gsap.to(dust,{
      x:(Math.random()-.5)*260,y:(Math.random()-.5)*260-80,
      scale:1.5,opacity:0,duration:1.2+Math.random()*1,ease:"power2.out",
      onComplete:()=>dust.remove()
    });
  }
}

/* ---------- THREE.JS MAIN WORLD ---------- */
let renderer, camera, world;
let stars, heartParticles, lotus;
let heartProgress = 0;
let lotusProgress = 0;
let clockStart = performance.now();
let pointerX = 0, pointerY = 0;

function heartPoint(t, fill) {
  const x = 16 * Math.pow(Math.sin(t),3);
  const y = 13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);
  const depth = (Math.random()-.5) * .9 * fill;
  return {x:x*.075*fill,y:y*.075*fill,z:depth};
}

function createParticleHeart(count=6000) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count*3);
  const targets = new Float32Array(count*3);
  const colors = new Float32Array(count*3);

  for (let i=0;i<count;i++) {
    const a = Math.random() * Math.PI * 2;
    const radial = Math.sqrt(Math.random());
    const p = heartPoint(a,radial);
    const k = i*3;

    targets[k]=p.x;
    targets[k+1]=p.y;
    targets[k+2]=p.z;

    // Start as a tiny cloud in the center.
    positions[k]=(Math.random()-.5)*.08;
    positions[k+1]=(Math.random()-.5)*.08;
    positions[k+2]=(Math.random()-.5)*.08;

    const glow=.65+Math.random()*.35;
    colors[k]=1;
    colors[k+1]=.25*glow;
    colors[k+2]=.52*glow;
  }

  geo.setAttribute("position",new THREE.BufferAttribute(positions,3));
  geo.setAttribute("target",new THREE.BufferAttribute(targets,3));
  geo.setAttribute("color",new THREE.BufferAttribute(colors,3));

  const mat = new THREE.PointsMaterial({
    size:.028,vertexColors:true,transparent:true,opacity:.94,
    blending:THREE.AdditiveBlending,depthWrite:false
  });

  const points = new THREE.Points(geo,mat);
  points.position.set(3.05,.15,.1);
  points.visible=true;
  world.add(points);
  return points;
}

function createStars(count=1800) {
  const geo=new THREE.BufferGeometry();
  const pos=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    pos[i*3]=(Math.random()-.5)*42;
    pos[i*3+1]=(Math.random()-.5)*25;
    pos[i*3+2]=(Math.random()-.5)*40;
  }
  geo.setAttribute("position",new THREE.BufferAttribute(pos,3));
  const mat=new THREE.PointsMaterial({color:0xffffff,size:.022,transparent:true,opacity:.38});
  const pts=new THREE.Points(geo,mat);
  world.add(pts);
  return pts;
}

/* ---------- 3D LOTUS ---------- */
function petalGeometry(scale) {
  const s=new THREE.Shape();
  s.moveTo(0,0);
  s.bezierCurveTo(.33*scale,.52*scale,.66*scale,1.7*scale,.4*scale,3.1*scale);
  s.bezierCurveTo(.2*scale,3.7*scale,.03*scale,4*scale,0,4.1*scale);
  s.bezierCurveTo(-.03*scale,4*scale,-.2*scale,3.7*scale,-.4*scale,3.1*scale);
  s.bezierCurveTo(-.66*scale,1.7*scale,-.33*scale,.52*scale,0,0);
  return new THREE.ExtrudeGeometry(s,{depth:.036,bevelEnabled:true,bevelThickness:.02,bevelSize:.016,bevelSegments:2});
}

function createLotus() {
  const group=new THREE.Group();
  group.position.set(0,-.7,.2);
  group.visible=false;
  world.add(group);

  const petals=[];
  const materials=[
    new THREE.MeshPhysicalMaterial({color:0xffc0cb,emissive:0xff1493,emissiveIntensity:.2,roughness:.2,transmission:.5,thickness:1.2,clearcoat:.8,side:THREE.DoubleSide,transparent:true,opacity:.88}),
    new THREE.MeshPhysicalMaterial({color:0xffe4ec,emissive:0xff69b4,emissiveIntensity:.3,roughness:.13,transmission:.65,thickness:.8,clearcoat:1,side:THREE.DoubleSide,transparent:true,opacity:.92})
  ];

  const layers=[
    {count:8,scale:.52,max:1.5,mat:materials[1]},
    {count:12,scale:.78,max:1.32,mat:materials[0]},
    {count:16,scale:1.02,max:1.12,mat:materials[0]}
  ];

  layers.forEach((layer,li)=>{
    for(let i=0;i<layer.count;i++){
      const pivot=new THREE.Group();
      pivot.rotation.y=(i/layer.count)*Math.PI*2+li*.17;
      const mesh=new THREE.Mesh(petalGeometry(layer.scale),layer.mat.clone());
      mesh.rotation.x=.06;
      mesh.position.y=.05;
      pivot.add(mesh);
      group.add(pivot);
      petals.push({mesh,max:layer.max+(Math.random()-.5)*.08,delay:li*.08+Math.random()*.05,speed:.85+Math.random()*.25});
    }
  });

  const core=new THREE.Mesh(new THREE.SphereGeometry(.25,24,24),new THREE.MeshBasicMaterial({color:0xfff0f5}));
  core.position.y=.3;
  group.add(core);

  return {group,petals};
}

/* ---------- BUTTERFLIES ---------- */
let butterflyRenderer,bflyScene,bflyCamera,butterflies=[];
function initButterflies() {
  const canvas=$("#butterflyCanvas");
  bflyScene=new THREE.Scene();
  bflyCamera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,100);
  bflyCamera.position.z=6;
  butterflyRenderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
  butterflyRenderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  butterflyRenderer.setSize(innerWidth,innerHeight);
}
function makeButterfly() {
  const g=new THREE.Group();
  const shape=new THREE.Shape();
  shape.moveTo(0,0);
  shape.bezierCurveTo(.3,.4,.6,.5,.4,.9);
  shape.bezierCurveTo(.2,1.1,-.1,.8,0,0);
  const geo=new THREE.ShapeGeometry(shape);
  const mat=new THREE.MeshBasicMaterial({color:0xffb6c1,transparent:true,opacity:.72,side:THREE.DoubleSide});
  const l=new THREE.Mesh(geo,mat.clone()),r=new THREE.Mesh(geo,mat.clone());
  l.position.x=-.05;r.position.x=.05;r.scale.x=-1;
  g.add(l,r);
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.02,.015,.35,6),new THREE.MeshBasicMaterial({color:0xffd0e0}));
  body.rotation.z=Math.PI/2;g.add(body);
  g.userData={l,r,angle:Math.random()*Math.PI*2,radius:1.8+Math.random()*2.2,speed:.8+Math.random()*1.2,y:(Math.random()-.5)*1.5,flap:Math.random()*6.28};
  g.scale.setScalar(.38+Math.random()*.28);
  return g;
}
function startButterflies() {
  if(!butterflyRenderer)return;
  bflyScene.clear();butterflies=[];
  for(let i=0;i<10;i++){const b=makeButterfly();bflyScene.add(b);butterflies.push(b);}
  $("#butterflyCanvasWrap").style.display="block";
}
function stopButterflies(){butterflies=[];bflyScene.clear();$("#butterflyCanvasWrap").style.display="none";}

/* ---------- WORLD INIT ---------- */
function initThree() {
  if(!window.THREE){
    console.warn("Three.js failed to load; navigation still works.");
    return;
  }

  world=new THREE.Scene();
  world.fog=new THREE.FogExp2(0x050308,.021);

  camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,100);
  camera.position.set(0,1.15,8.4);

  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.setSize(innerWidth,innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.setClearColor(0x050308,1);
  $("#webgl").appendChild(renderer.domElement);

  world.add(new THREE.AmbientLight(0xffc0cb,.38));
  const light=new THREE.PointLight(0xff69b4,4.2,18);
  light.position.set(0,.5,0);
  world.add(light);

  stars=createStars();
  heartParticles=createParticleHeart(6000);
  lotus=createLotus();
  initButterflies();

  window.addEventListener("pointermove",e=>{
    pointerX=(e.clientX/innerWidth-.5)*2;
    pointerY=(e.clientY/innerHeight-.5)*2;
  },{passive:true});

  animate();
}

/* ---------- ANIMATION ---------- */
function animate() {
  requestAnimationFrame(animate);
  const t=(performance.now()-clockStart)*.001;

  if(!renderer)return;

  stars.rotation.y=t*.0045;
  stars.rotation.x=t*.0015;

  /* Heart: bloom + heartbeat */
  const heartTarget = current===0 ? 1 : 0;
  heartProgress += (heartTarget-heartProgress)*.035;
  const bloomEase=1-Math.pow(1-heartProgress,2.7);
  const pos=heartParticles.geometry.attributes.position;
  const target=heartParticles.geometry.attributes.target;

  for(let i=0;i<pos.count;i++){
    const k=i*3;
    pos.array[k] += (target.array[k]*bloomEase-pos.array[k])*.075;
    pos.array[k+1] += (target.array[k+1]*bloomEase-pos.array[k+1])*.075;
    pos.array[k+2] += (target.array[k+2]*bloomEase-pos.array[k+2])*.075;
  }
  pos.needsUpdate=true;

  const pulse=current===0 ? 1+Math.sin(t*3.2)*.045 : 0;
  heartParticles.scale.setScalar((.92+bloomEase*.48)*pulse);
  heartParticles.rotation.y=Math.sin(t*.28)*.08;
  heartParticles.position.x=3.05+pointerX*.12;
  heartParticles.position.y=.15-pointerY*.08;

  /* Lotus */
  if(lotus){
    lotus.group.visible=current===7;
    if(current===7){
      lotusProgress += (1-lotusProgress)*.022;
      const ease=1-Math.pow(1-lotusProgress,3);
      lotus.group.rotation.y=t*.18;
      lotus.group.position.y=-.75+Math.sin(t*.5)*.055;
      lotus.petals.forEach(p=>{
        const local=Math.max(0,Math.min(1,(ease-p.delay)*p.speed));
        p.mesh.rotation.x=.06+local*p.max;
      });
      lotus.group.scale.setScalar(1+Math.sin(t*1.2)*.018);
    }
  }

  /* Butterflies */
  if(butterflies.length){
    butterflies.forEach(b=>{
      const u=b.userData;
      u.angle+=.008*u.speed;
      u.flap+=.15*u.speed;
      b.position.x=Math.cos(u.angle)*u.radius;
      b.position.z=Math.sin(u.angle)*u.radius*.6;
      b.position.y=Math.sin(t*u.speed+u.angle)*.9+u.y;
      u.l.rotation.y=.3+Math.sin(u.flap)*.6;
      u.r.rotation.y=-.3-Math.sin(u.flap)*.6;
      b.rotation.y=u.angle+Math.PI/2;
    });
    butterflyRenderer.render(bflyScene,bflyCamera);
  }

  renderer.render(world,camera);
}

function openLotus(){
  lotusProgress=0;
}

/* ---------- RESIZE ---------- */
window.addEventListener("resize",()=>{
  if(renderer){
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  }
  if(butterflyRenderer){
    bflyCamera.aspect=innerWidth/innerHeight;
    bflyCamera.updateProjectionMatrix();
    butterflyRenderer.setSize(innerWidth,innerHeight);
  }
  if(built)layoutCards();
});

/* ---------- LOTUS BUTTON ---------- */
$("#bloomAgain").addEventListener("click",e=>{
  e.stopPropagation();
  lotusProgress=0;
  if(window.gsap)gsap.fromTo($("#bloomAgain"),{scale:.9},{scale:1,duration:.35,ease:"back.out(2)"});
});

/* ---------- START ---------- */
updateUI();
initThree();
})();
