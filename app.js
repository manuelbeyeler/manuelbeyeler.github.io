const grid = document.getElementById("grid");
const viewer = document.getElementById("viewer");
const viewerBody = document.getElementById("viewer-body");

function cardFromElement(card) {
  return {
    title: card.querySelector("h3")?.textContent || "",
    text: card.querySelector(".card-body p:last-child")?.textContent || "",
    skill: card.querySelector(".tag")?.textContent || "",
    kind: card.dataset.kind || "bild",
    src: card.dataset.src || card.querySelector("img, video")?.getAttribute("src") || "",
    loop: card.dataset.loop === "1",
    gallery: card.dataset.gallery ? card.dataset.gallery.split("|").filter(Boolean) : [],
  };
}

function render(filter = "alle") {
  grid.querySelectorAll(".card").forEach((card) => {
    card.hidden = filter !== "alle" && card.dataset.kind !== filter;
  });
}

function openViewer(item) {
  let media = "";
  if (item.kind === "video" && item.src) {
    media = `<video src="${item.src}" controls autoplay playsinline${item.loop ? " loop" : ""}></video>`;
  } else if (item.gallery && item.gallery.length) {
    media = `
      <div class="gallery" data-index="0">
        <img src="${item.gallery[0]}" alt="" />
        <div class="gallery-nav">
          <button type="button" data-step="-1">Zurück</button>
          <span>1 / ${item.gallery.length}</span>
          <button type="button" data-step="1">Weiter</button>
        </div>
      </div>`;
  } else if (item.src) {
    media = `<img src="${item.src}" alt="" />`;
  }
  viewerBody.innerHTML = `${media}<h3>${item.title}</h3><p>${item.text}</p>`;
  const gallery = viewerBody.querySelector(".gallery");
  if (gallery) {
    const img = gallery.querySelector("img");
    const label = gallery.querySelector("span");
    const show = (next) => {
      const count = item.gallery.length;
      const index = (Number(gallery.dataset.index) + next + count) % count;
      gallery.dataset.index = String(index);
      img.src = item.gallery[index];
      label.textContent = `${index + 1} / ${count}`;
    };
    gallery.querySelectorAll("[data-step]").forEach((btn) => {
      btn.addEventListener("click", () => show(Number(btn.dataset.step)));
    });
  }
  viewer.showModal();
}

grid.addEventListener("click", (event) => {
  const opener = event.target.closest("[data-open]");
  if (!opener) return;
  const card = opener.closest(".card");
  if (card) openViewer(cardFromElement(card));
});

document.querySelectorAll(".filters button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filters button").forEach((b) => b.classList.remove("is-on"));
    btn.classList.add("is-on");
    render(btn.dataset.filter);
  });
});

function stopViewerMedia() {
  viewerBody.querySelectorAll("video").forEach((video) => {
    video.pause();
    video.removeAttribute("src");
    video.load();
  });
}

document.getElementById("close-viewer").addEventListener("click", () => {
  stopViewerMedia();
  viewer.close();
});
viewer.addEventListener("close", stopViewerMedia);

document.addEventListener("keydown", (event) => {
  if (!viewer.open) return;
  const gallery = viewerBody.querySelector(".gallery");
  if (!gallery) return;
  if (event.key === "ArrowRight") gallery.querySelector("[data-step='1']")?.click();
  if (event.key === "ArrowLeft") gallery.querySelector("[data-step='-1']")?.click();
});

document.getElementById("mail-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.target);
  const subject = encodeURIComponent("Nachricht über die Website");
  const body = encodeURIComponent(
    `${data.get("message")}\n\n${data.get("name")}\n${data.get("email")}`
  );
  location.href = `mailto:manuelbeyeler@hotmail.com?subject=${subject}&body=${body}`;
});

render();
