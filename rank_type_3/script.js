let originalOldData = [];
let originalNewData = [];

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', () => {
    loadAndCompareRankings();

    // 정렬 버튼에 이벤트 리스너 추가
    document.querySelectorAll('.sort-btn').forEach(button => {
        button.addEventListener('click', () => {
            // 모든 버튼에서 'active' 클래스 제거
            document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
            // 클릭된 버튼에 'active' 클래스 추가
            button.classList.add('active');
            
            const sortBy = button.dataset.sortBy;
            sortTable(sortBy);
        });
    });
});

document.getElementById('saveAsImageBtn').addEventListener('click', saveTableAsImage);
document.getElementById('searchInput').addEventListener('input', filterByNickname);

/**
 * 랭킹 파일을 불러오고 비교하는 메인 함수
 */
function loadAndCompareRankings() {
    Promise.all([
        fetch('../data/kizuna_data/2025년9월/kizuna.json').then(response => response.json()),
        fetch('../data/kizuna_data/2025년9월/kizuna2.json').then(response => response.json())
    ])
    .then(([oldJson, newJson]) => {
        originalOldData = oldJson.ranked_records;
        originalNewData = newJson.ranked_records;
        
        // 페이지 로드 시 기본 정렬(유대 포인트) 실행
        sortTable('kizuna_battle_point');
    })
    .catch(error => {
        console.error("랭킹 파일 로딩 오류:", error);
        alert("랭킹 파일을 불러오는 데 실패했습니다. 'data/kizuna_data/' 폴더에 파일이 있는지 확인해주세요.");
    });
}

/**
 * 선택된 기준으로 데이터를 정렬하는 함수
 * @param {string} sortBy - 정렬 기준이 될 키 이름
 */
function sortTable(sortBy) {
    // 원본 데이터의 복사본을 만들어 정렬 (원본 훼손 방지)
    const sortedData = [...originalNewData];

    sortedData.sort((a, b) => {
        // b - a : 내림차순 (높은 값이 위로)
        return b[sortBy] - a[sortBy];
    });
    
    // 정렬된 데이터로 테이블 다시 표시
    displayResults(sortedData);
}

/**
 * 랭킹 데이터를 화면 테이블에 표시하는 함수 (✅ 수정 완료된 함수)
 */
function displayResults(newData) {
    const tableBody = document.querySelector('#resultsTable tbody');
    tableBody.innerHTML = '';

    // '순위 변화' 계산을 위해 이전 데이터의 원본 랭킹 정보를 사용합니다. (이 부분은 올바르게 동작하고 있었습니다)
    const oldRanksMap = new Map(originalOldData.map(user => [user.nickname, user.rank]));

    // ✅ forEach 루프에 'index'를 추가하여 현재 행 번호를 가져옵니다.
    newData.forEach((newUser, index) => {
        const oldRank = oldRanksMap.get(newUser.nickname);
        let rankChangeText = '';
        let rankChangeClass = '';

        // '순위 변화'는 여전히 원본 랭킹(newUser.rank)을 기준으로 계산합니다.
        if (oldRank !== undefined) {
            const change = oldRank - newUser.rank;
            if (change > 0) rankChangeText = `▲ ${change}`, rankChangeClass = 'rank-up';
            else if (change < 0) rankChangeText = `▼ ${Math.abs(change)}`, rankChangeClass = 'rank-down';
            else rankChangeText = '-', rankChangeClass = 'rank-same';
        } else {
            rankChangeText = 'New', rankChangeClass = 'rank-new';
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td class="nickname">${newUser.nickname}</td>
            <td>${newUser.level}</td>
            <td>${newUser.rescue_count}</td>
            <td>${newUser.battle_count}</td>
            <td>${newUser.kizuna_battle_point.toLocaleString()}</td>
            <td class="${rankChangeClass}">${rankChangeText}</td>
        `;
        tableBody.appendChild(row);
    });
    
    // 테이블을 다시 그린 후, 현재 검색어에 맞게 필터링을 다시 적용
    filterByNickname();
}

/**
 * 입력된 닉네임으로 테이블 결과를 필터링하는 함수
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

    if (visibleCount === 0 && searchTerm) {
        table.style.display = 'none';
        noResultsMessage.style.display = 'block';
    } else {
        table.style.display = '';
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