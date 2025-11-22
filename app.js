const API_BASE = "https://script.google.com/macros/s/AKfycbx3s5j7YgqcWLGGGuzdtQy0Ayl3QHtHP7xwhEAv3N-BClUVFNZy2krd4WNyOy-kiQE/exec";

let PRODUCTS = [];
let ORDERS = [];
let SHIPPINGS = [];

async function loadSheet(sheetName) {
  const res = await fetch(`${API_BASE}?sheet=${encodeURIComponent(sheetName)}`);
  const json = await res.json();
  return json.data || [];
}

const S = v => (v ?? "").toString().trim();
const N = v => {
  const num = parseFloat(S(v).replace(/,/g, ""));
  return Number.isFinite(num) ? num : 0;
};

function parseDateFromRow(row) {
  const candidates = ["주문일시", "날짜", "주문일", "주문일자", "결제일", "발송일"];
  for (const key of candidates) {
    if (row[key]) {
      const d = new Date(row[key]);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function isSameDay(a, b) {
  return a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function renderCards(list, elId, mapper, emptyId) {
  const el = document.getElementById(elId);
  if (!el) return;

  el.innerHTML = "";
  if (!list.length) {
    if (emptyId) document.getElementById(emptyId)?.classList.remove("hidden");
    return;
  }
  if (emptyId) document.getElementById(emptyId)?.classList.add("hidden");

  el.innerHTML = list.map(mapper).join("");
}

function renderProducts() {
  const sortValue = document.getElementById("product-sort")?.value || "name";
  let list = [...PRODUCTS];

  if (sortValue === "price_desc") list.sort((a,b)=>N(b["판매가(KRW)"])-N(a["판매가(KRW)"]));
  if (sortValue === "name") list.sort((a,b)=>S(a.상품명).localeCompare(S(b.상품명), "ko"));

  renderCards(list, "product-list", p => {
    const price = N(p["판매가(KRW)"]);
    const margin = S(p["마진율"]);
    const img = S(p["이미지URL"]);
    return `
      <div class="card">
        <div class="title">${S(p.상품명)}</div>
        <div class="muted">상품ID: ${S(p.상품ID)}</div>
        <div class="muted">소싱처: ${S(p.소싱처)}</div>
        <div class="muted">판매가: ${price ? price.toLocaleString() + "원" : "-"}</div>
        <div class="muted">마진율: ${margin || "-"}</div>
        <div class="muted">상태: ${S(p.상태) || "-"}</div>
        ${img ? `<img src="${img}" alt="">` : ""}
      </div>
    `;
  }, "product-empty");
}

function renderOrders() {
  const filterValue = document.getElementById("order-filter")?.value || "all";
  const q = S(document.getElementById("global-search")?.value).toLowerCase();

  let list = [...ORDERS];

  if (filterValue !== "all") {
    list = list.filter(o => {
      const st = S(o["배송상태(API)"] || o["배송상태"]);
      if (filterValue === "paid") return st.includes("결제") || st.includes("완료") || st.includes("주문");
      if (filterValue === "shipping") return st.includes("배송중");
      if (filterValue === "done") return st.includes("배송완료");
      if (filterValue === "delayed") return st.includes("배송지연");
      return true;
    });
  }

  if (q) {
    list = list.filter(o => (
      S(o.주문번호).toLowerCase().includes(q) ||
      S(o.고객명).toLowerCase().includes(q) ||
      S(o.트래킹번호).toLowerCase().includes(q) ||
      S(o.상품명).toLowerCase().includes(q)
    ));
  }

  renderCards(list, "order-list", o => {
    const amount = N(o["결제금액(KRW)"]);
    const status = S(o["배송상태(API)"] || o["배송상태"]);
    return `
      <div class="card">
        <div>주문번호: ${S(o.주문번호)}</div>
        <div>채널: ${S(o.채널)}</div>
        <div>주문일시: ${S(o.주문일시)}</div>
        <div>상품명: ${S(o.상품명)} / 수량: ${S(o.수량)}</div>
        <div>결제금액: ${amount ? amount.toLocaleString() + "원" : "-"}</div>
        <div class="${status.includes("배송지연") ? "danger-text" : ""}">
          배송상태: ${status || "-"}
        </div>
        <div>트래킹번호: ${S(o.트래킹번호) || "-"}</div>
      </div>
    `;
  }, "order-empty");
}

function renderShipping() {
  const filterValue = document.getElementById("shipping-filter")?.value || "all";
  const q = S(document.getElementById("global-search")?.value).toLowerCase();

  let list = [...SHIPPINGS];

  if (filterValue !== "all") {
    list = list.filter(s => {
      const st = S(s["현재상태(파싱)"] || s["배송상태"]);
      if (filterValue === "shipping") return st.includes("배송중");
      if (filterValue === "done") return st.includes("배송완료");
      if (filterValue === "delayed") return st.includes("배송지연");
      return true;
    });
  }

  if (q) {
    list = list.filter(s => (
      S(s.주문번호).toLowerCase().includes(q) ||
      S(s.트래킹번호).toLowerCase().includes(q)
    ));
  }

  renderCards(list, "shipping-list", s => {
    const st = S(s["현재상태(파싱)"]);
    return `
      <div class="card">
        <div>주문번호: ${S(s.주문번호)}</div>
        <div>고객명: ${S(s.고객명)}</div>
        <div>택배사: ${S(s.택배사) || "-"}</div>
        <div>트래킹번호: ${S(s.트래킹번호) || "-"}</div>
        <div class="${st.includes("배송지연") || S(s.배송지연).includes("Y") ? "danger-text" : ""}">
          현재상태: ${st || "-"}
        </div>
        <div>마지막업데이트: ${S(s.마지막업데이트) || "-"}</div>
        ${S(s.상세링크) ? `<a href="${S(s.상세링크)}" target="_blank">상세보기</a>` : ""}
      </div>
    `;
  }, "shipping-empty");
}

function renderStats() {
  const today = new Date();

  const todayOrders = ORDERS.filter(o => {
    const d = parseDateFromRow(o);
    return d ? isSameDay(d, today) : false;
  });

  const todaySales = todayOrders.reduce((sum, o) => sum + N(o["결제금액(KRW)"]), 0);

  const shippingCount = SHIPPINGS.filter(s => S(s["현재상태(파싱)"]).includes("배송중")).length;
  const delayedCount = SHIPPINGS.filter(s => S(s["현재상태(파싱)"]).includes("배송지연") || S(s.배송지연).includes("Y")).length;

  document.getElementById("stat-today-orders").textContent = todayOrders.length.toLocaleString();
  document.getElementById("stat-today-sales").textContent = todaySales.toLocaleString();
  document.getElementById("stat-shipping").textContent = shippingCount.toLocaleString();
  document.getElementById("stat-delayed").textContent = delayedCount.toLocaleString();

  const lu = document.getElementById("last-updated");
  if (lu) lu.textContent = `Last updated: ${today.toLocaleString()}`;
}

async function refreshAll() {
  try {
    const [p, o, s] = await Promise.all([
      loadSheet("Product_DB"),
      loadSheet("Order_DB"),
      loadSheet("Shipping_DB")
    ]);

    PRODUCTS = p;
    ORDERS = o;
    SHIPPINGS = s;

    renderProducts();
    renderOrders();
    renderShipping();
    renderStats();
  } catch (err) {
    console.error(err);
    alert("시트 데이터를 불러오지 못했어. WebApp 공개/시트명/권한 확인 필요.");
  }
}

function wireEvents() {
  document.getElementById("refresh-btn")?.addEventListener("click", refreshAll);
  document.getElementById("product-sort")?.addEventListener("change", renderProducts);
  document.getElementById("order-filter")?.addEventListener("change", renderOrders);
  document.getElementById("shipping-filter")?.addEventListener("change", renderShipping);
  document.getElementById("global-search")?.addEventListener("input", () => {
    renderOrders();
    renderShipping();
  });
}

(async function init(){
  wireEvents();
  await refreshAll();
  setInterval(refreshAll, 60000);
})();
