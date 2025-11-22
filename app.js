// ★★ 구글 스프레드시트 WebApp URL ★★
const API_URL = "https://script.google.com/macros/s/AKfycbwXGKkXsf_C9uTc1o4byZ4SJwUZIkYwGoukARMqbY-Qt7VOwZKqvo0Gph2VSsRJfL5K/exec";

// 시트 이름 (시트 탭 이름 그대로)
const SHEET_NAME = "시트1";   // ← 실제 너의 스프레드시트 시트 이름으로 변경!

// 데이터 불러오기 함수
async function loadSheetData() {
    try {
        const response = await fetch(`${API_URL}?sheet=${SHEET_NAME}`);
        const json = await response.json();

        console.log("스프레드시트 데이터:", json.data);

        // HTML에 데이터 표시 (원하는 방식으로 변경 가능)
        const output = document.getElementById("sheet-data");
        output.innerHTML = "";

        json.data.forEach(row => {
            let div = document.createElement("div");
            div.className = "sheet-row";
            div.innerHTML = JSON.stringify(row);
            output.appendChild(div);
        });

    } catch (error) {
        console.error("스프레드시트 불러오기 실패:", error);
    }
}

// 페이지 로드 시 자동 실행
window.onload = loadSheetData;

