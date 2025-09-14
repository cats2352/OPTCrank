// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', loadAndCompareRankings);
document.getElementById('reloadBtn').addEventListener('click', loadAndCompareRankings);
document.getElementById('saveAsImageBtn').addEventListener('click', saveTableAsImage);
// ✅ 'input' 이벤트로 변경하여 실시간 검색을 구현합니다.
document.getElementById('searchInput').addEventListener('input', filterByNickname);

/**
 * 랭킹 파일을 불러오고 비교하는 메인 함수
 */
function loadAndCompareRankings() {
    Promise.all([
        fetch('../data/run_data/2025년9월1주차/run.json').then(response => response.json()),
        fetch('../data/run_data/2025년9월2주차/run.json').then(response => response.json())
    ])
    .then(([oldJson, newJson]) => {
        const oldData = oldJson.ranking_datas;
        const newData = newJson.ranking_datas;
        
        displayResults(oldData, newData);
    })
    .catch(error => {
        console.error("랭킹 파일 로딩 오류:", error);
        alert("랭킹 파일을 불러오는 데 실패했습니다. 'data/run_data/' 폴더에 파일이 있는지 확인해주세요.");
    });
}

/**
 * 두 랭킹 데이터를 비교하고 결과를 화면 테이블에 표시하는 함수
 */
function displayResults(oldData, newData) {
    const tableBody = document.querySelector('#resultsTable tbody');
    tableBody.innerHTML = '';

    const oldRanksMap = new Map(oldData.map(user => [user.nickname, user.rank]));

    newData.forEach(newUser => {
        const oldRank = oldRanksMap.get(newUser.nickname);
        let rankChangeText = '';
        let rankChangeClass = '';

        if (oldRank !== undefined) {
            const change = oldRank - newUser.rank;
            if (change > 0) {
                rankChangeText = `▲ ${change}`;
                rankChangeClass = 'rank-up';
            } else if (change < 0) {
                rankChangeText = `▼ ${Math.abs(change)}`;
                rankChangeClass = 'rank-down';
            } else {
                rankChangeText = '-';
                rankChangeClass = 'rank-same';
            }
        } else {
            rankChangeText = 'New';
            rankChangeClass = 'rank-new';
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${newUser.rank}</td>
            <td class="nickname">${newUser.nickname}</td>
            <td>${newUser.level}</td>
            <td>${newUser.score.toLocaleString()}</td>
            <td class="${rankChangeClass}">${rankChangeText}</td>
        `;
        tableBody.appendChild(row);
    });
}

/**
 * 입력된 닉네임으로 테이블 결과를 필터링하는 함수 (✅ 최종 수정본)
 */
function filterByNickname() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const table = document.getElementById('resultsTable');
    const rows = table.querySelectorAll('tbody tr');
    const noResultsMessage = document.getElementById('noResultsMessage');
    let visibleCount = 0;

    rows.forEach(row => {
        const nicknameCell = row.querySelector('.nickname');
        if (nicknameCell) {
            const nickname = nicknameCell.textContent.toLowerCase();
            if (nickname.includes(searchTerm)) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        }
    });

    // 검색 결과가 하나도 없으면 테이블을 숨기고 "결과 없음" 메시지를 표시합니다.
    if (visibleCount === 0) {
        table.style.display = 'none';
        noResultsMessage.style.display = 'block';
    } else {
        table.style.display = ''; // table의 기본 display 속성으로 복원
        noResultsMessage.style.display = 'none';
    }
}


/**
 * 현재 보이는 랭킹 테이블을 이미지(PNG)로 저장하는 함수
 */
function saveTableAsImage() {
    const target = document.querySelector(".table-container");
    const button = document.getElementById('saveAsImageBtn');
    const originalText = button.textContent;
    button.textContent = '저장 중...';
    button.disabled = true;

    html2canvas(target, {
        backgroundColor: '#16213e',
        scale: 2
    }).then(canvas => {
        const image = canvas.toDataURL("image/png", 1.0);
        const link = document.createElement("a");
        const date = new Date();
        const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        link.href = image;
        link.download = `ranking-${formattedDate}.png`;
        link.click();
        button.textContent = originalText;
        button.disabled = false;
    }).catch(err => {
        console.error("이미지 캡처 오류:", err);
        alert("이미지 저장에 실패했습니다.");
        button.textContent = originalText;
        button.disabled = false;
    });
}