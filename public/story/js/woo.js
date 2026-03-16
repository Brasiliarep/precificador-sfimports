const API_URL = "https://sfimportsdf.com.br/wp-json/wc/v3/products";
const CONSUMER_KEY = "ck_c8a3cce21212402dd20f851df6b521195936d9e4";
const CONSUMER_SECRET = "cs_3d3339b5c3664cdf4c187bb33ee9a4b89849f9e3";

let products = [];
let selected = [];
let multiMode = false;

const grid = document.getElementById("productGrid");
const searchInput = document.getElementById("search");
const multiBtn = document.getElementById("multiBtn");
const createBtn = document.getElementById("createStoryBtn");

async function loadProducts() {
  const res = await fetch(
    `${API_URL}?per_page=100&consumer_key=${CONSUMER_KEY}&consumer_secret=${CONSUMER_SECRET}`
  );
  products = await res.json();
  render(products);
}

function render(list) {
  grid.innerHTML = "";

  list.forEach(p => {
    const img = p.images?.[0]?.src || "";

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${img}">
      <div class="name">${p.name}</div>
      <div class="price">R$ ${p.price || ""}</div>
    `;

    card.onclick = () => {
      if (!multiMode) {
        // ✅ SEMPRE salva como ARRAY
        localStorage.setItem(
          "sf_story_products",
          JSON.stringify([{
            name: p.name,
            price: p.price,
            image: img
          }])
        );
        window.location.href = "editor.html";
      } else {
        toggleSelect(card, p, img);
      }
    };

    grid.appendChild(card);
  });
}

function toggleSelect(card, p, img) {
  const index = selected.findIndex(x => x.name === p.name);

  if (index >= 0) {
    selected.splice(index, 1);
    card.style.outline = "none";
  } else {
    if (selected.length >= 6) {
      alert("Máximo de 6 produtos");
      return;
    }
    selected.push({
      name: p.name,
      price: p.price,
      image: img
    });
    card.style.outline = "3px solid #00ff88";
  }

  createBtn.style.display = selected.length ? "inline-block" : "none";
}

multiBtn.onclick = () => {
  multiMode = !multiMode;
  selected = [];
  createBtn.style.display = "none";
  alert(multiMode ? "Modo múltiplos ativado" : "Modo simples ativado");
};

createBtn.onclick = () => {
  if (!selected.length) {
    alert("Selecione pelo menos 1 produto");
    return;
  }

  localStorage.setItem(
    "sf_story_products",
    JSON.stringify(selected)
  );
  window.location.href = "editor.html";
};

searchInput.oninput = () => {
  const t = searchInput.value.toLowerCase();
  render(products.filter(p => p.name.toLowerCase().includes(t)));
};

loadProducts();
