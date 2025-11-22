function renderOrders() {
  const filterValue = document.getElementById("order-filter")?.value || "all";
  const q = S(document.getElementById("global-search")?.value).toLowerCase();
  let list = [...ORDERS];

  // 상태 필터
  if (filterValue !== "all") {
    list = list.filter(o => {
      const st = S(o["배송상태(API)"] || o["배송상태"] || o["상태"]);
      if (filterValue === "paid") return st.includes("결제") || st.includes("완료") || st.includes("주문");
      if (filterValue === "shipping") return st.includes("배송중");
      if (filterValue === "done") return st.includes("배송완료");
      if (filterValue === "delayed") return st.includes("배송지연");
      return true;
    });
  }

  // 검색
  if (q) {
    list = list.filter(o => (
      S(o.주문번호).toLowerCase().includes(q) ||
      S(o.고객명).toLowerCase().includes(q) ||
      S(o.트래킹번호).toLowerCase().includes(q) ||
      S(o.상품명).toLowerCase().includes(q)
    ));
  }

  const tbody = document.getElementById("order-tbody");
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = "";
    document.getElementById("order-empty")?.classList.remove("hidden");
    return;
  }
  document.getElementById("order-empty")?.classList.add("hidden");

  const badgeClass = (status) => {
    const st = S(status);
    if (st.includes("배송지연")) return "badge badge-delayed";
    if (st.includes("배송완료")) return "badge badge-done";
    if (st.includes("배송중")) return "badge badge-shipping";
    return "badge badge-paid";
  };

  tbody.innerHTML = list.map(o => {
    const amount = N(o["결제금액(KRW)"] || o["금액"]);
    const status = S(o["배송상태(API)"] || o["배송상태"] || o["상태"]);
    return `
      <tr>
        <td><strong>${S(o.주문번호)}</strong></td>
        <td>${S(o.고객명) || "-"}</td>
        <td>${S(o.상품명) || "-"}<br><span class="muted">x ${S(o.수량) || 1}</span></td>
        <td class="right">${amount ? amount.toLocaleString() + "원" : "-"}</td>
        <td>${S(o.채널) || "-"}</td>
        <td>${S(o.주문일시) || S(o.날짜) || "-"}</td>
        <td><span class="${badgeClass(status)}">${status || "-"}</span></td>
        <td>${S(o.트래킹번호) || "-"}</td>
      </tr>
    `;
  }).join("");
}
