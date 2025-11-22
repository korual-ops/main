const API_BASE = "https://script.google.com/macros/s/AKfycbx3s5j7YgqcWLGGGuzdtQy0Ayl3QHtHP7xwhEAv3N-BClUVFNZy2krd4WNyOy-kiQE/exec";

async function loadSheet(sheetName) {
  const res = await fetch(`${API_BASE}?sheet=${sheetName}`);
  return res.json();
}

function renderCards(list, elId, mapper) {
  const el = document.getElementById(elId);
  el.innerHTML = "";
  list.forEach(item => {
    el.innerHTML += mapper(item);
  });
}

(async function init(){
  const products = await loadSheet("Product_DB");
  renderCards(products.data, "product-list", p => `
    <div class="card">
      <div>${p.상품명}</div>
      <div>가격: ${p.가격}원</div>
      <div>재고: ${p.재고}</div>
      <img src="${p.이미지}" alt="">
    </div>
  `);

  const orders = await loadSheet("Order_DB");
  renderCards(orders.data, "order-list", o => `
    <div class="card">
      <div>주문번호: ${o.주문번호}</div>
      <div>고객명: ${o.고객명}</div>
      <div>금액: ${o.금액}원</div>
      <div>상태: ${o.상태}</div>
    </div>
  `);

  const shipping = await loadSheet("Shipping_DB");
  renderCards(shipping.data, "shipping-list", s => `
    <div class="card">
      <div>주문번호: ${s.주문번호}</div>
      <div>운송장: ${s.운송장}</div>
      <div>상태: ${s.배송상태}</div>
      <div>발송일: ${s.발송일}</div>
    </div>
  `);
})();
