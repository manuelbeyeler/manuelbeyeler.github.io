const STORAGE_KEY = "mb-highlights-v1";
const EDIT_KEY = "mb-edit-mode";

const grid = document.getElementById("grid");
const composer = document.getElementById("composer");
const viewer = document.getElementById("viewer");
const viewerBody = document.getElementById("viewer-body");
const form = document.getElementById("post-form");
const editToggle = document.getElementById("edit-toggle");

function editing() {
  return document.body.classList.contains("is-editing") || new URLSearchParams(location.search).has("bearbeiten");
}

function loadCustom() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCustom(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function mediaHtml(item) {
  if (item.src && item.kind === "video") {
    return `<video src="${item.src}" muted playsinline></video>`;
  }
  if (item.src) return `<img src="${item.src}" alt="" />`;
  if (item.kind === "video") return `<span class="play">▶</span>`;
  return item.skill || "Bild";
}

function cardFromElement(card) {
  return {
    title: card.querySelector("h3")?.textContent || "",
    text: card.querySelector(".card-body p:last-child")?.textContent || "",
    skill: card.querySelector(".tag")?.textContent || "",
    kind: card.dataset.kind || "bild",
    src: card.dataset.src || card.querySelector("img, video")?.getAttribute("src") || "",
    loop: card.dataset.loop === "1",
    gallery: card.dataset.gallery ? card.dataset.gallery.split("|").filter(Boolean) : [],
    visual: [...card.querySelector(".media")?.classList || []].find((name) => name.startsWith("visual-"))?.replace("visual-", "") || "",
  };
}

function render(filter = "alle") {
  grid.querySelectorAll("[data-custom], .add-card").forEach((el) => el.remove());

  grid.querySelectorAll(".card:not([data-custom])").forEach((card) => {
    card.hidden = filter !== "alle" && card.dataset.kind !== filter;
  });

  if (editing()) {
    const add = document.createElement("button");
    add.type = "button";
    add.className = "add-card";
    add.innerHTML = `<strong>+ Highlight hinzufügen</strong><span>Bild oder Video · ohne Datum</span>`;
    add.addEventListener("click", () => composer.showModal());
    grid.prepend(add);
  }

  for (const item of loadCustom().reverse()) {
    if (filter !== "alle" && item.kind !== filter) continue;
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.kind = item.kind;
    card.dataset.custom = "1";
    card.innerHTML = `
      <button type="button" class="media" data-open>${mediaHtml(item)}</button>
      <div class="card-body">
        <button type="button" class="remove" data-remove="${item.id}">Entfernen</button>
        <p class="tag">${item.kind} · ${item.skill}</p>
        <h3>${item.title}</h3>
        <p>${item.text}</p>
      </div>
    `;
    card.querySelector("[data-remove]").hidden = !editing();
    card.querySelector("[data-remove]").addEventListener("click", () => {
      saveCustom(loadCustom().filter((entry) => entry.id !== item.id));
      render(document.querySelector(".filters .is-on")?.dataset.filter || "alle");
    });
    const addCard = grid.querySelector(".add-card");
    if (addCard) addCard.after(card);
    else grid.prepend(card);
  }
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
  } else {
    media = `<div class="media${item.visual ? ` visual-${item.visual}` : ""}" style="height:280px">${item.skill}</div>`;
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

function readFile(file) {
  const max = 1.6 * 1024 * 1024;
  if (file.size > max) {
    return Promise.resolve("");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
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

document.getElementById("cancel-post").addEventListener("click", () => composer.close());
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

editToggle.addEventListener("click", () => {
  const on = !document.body.classList.contains("is-editing");
  document.body.classList.toggle("is-editing", on);
  localStorage.setItem(EDIT_KEY, on ? "1" : "0");
  editToggle.textContent = on ? "Bearbeiten beenden" : "Highlights bearbeiten";
  render(document.querySelector(".filters .is-on")?.dataset.filter || "alle");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const file = data.get("file");
  let src = "";
  if (file && file.size) {
    src = await readFile(file);
    if (!src) {
      document.getElementById("file-note").textContent =
        "Datei ist grösser als 1,5 MB. Sie wird in dieser Sitzung gezeigt, bleibt aber nicht gespeichert.";
      src = URL.createObjectURL(file);
    }
  }

  saveCustom([
    {
      id: crypto.randomUUID(),
      title: String(data.get("title")).trim(),
      skill: String(data.get("skill")).trim(),
      text: String(data.get("text")).trim(),
      kind: data.get("kind") === "video" ? "video" : "bild",
      src,
      custom: true,
    },
    ...loadCustom(),
  ]);
  form.reset();
  composer.close();
  render(document.querySelector(".filters .is-on")?.dataset.filter || "alle");
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

if (localStorage.getItem(EDIT_KEY) === "1" || new URLSearchParams(location.search).has("bearbeiten")) {
  document.body.classList.add("is-editing");
  editToggle.textContent = "Bearbeiten beenden";
}

render();
