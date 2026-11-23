/* ══════ COMPONENTE — carrusel de fotos pro como FONDO de toda la página ══════ */

const PHOTOS = [
  { src: "../assets/web/foto1.jpg", tag: "Barbería privada" },
  { src: "../assets/web/foto2.jpg", tag: "Fisioterapia" },
  { src: "../assets/web/foto3.jpg", tag: "Nails" },
  { src: "../assets/web/foto4.jpg", tag: "MEN'S LINE Studio" },
  { src: "../assets/web/foto5.jpg", tag: "MEN'S LINE Studio" },
  { src: "../assets/web/foto6.jpg", tag: "MEN'S LINE Studio" }
];

let picIdx = 0;
const lbg = document.getElementById("lbg"), bgImgs = [];
PHOTOS.forEach(p => { const im = new Image(); im.src = p.src; im.alt = ""; lbg.appendChild(im); bgImgs.push(im); });

function tick() {
  bgImgs.forEach(im => im.classList.remove("on"));
  picIdx = (picIdx + 1) % bgImgs.length;
  bgImgs[picIdx].classList.add("on");
}
bgImgs[0].addEventListener("load", () => { picIdx = 0; tick(); }, { once: true });
if (bgImgs[0].complete) tick();
setTimeout(() => { if (!bgImgs.some(im => im.classList.contains("on"))) tick(); }, 2500);
setInterval(tick, 4200);
