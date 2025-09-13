// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', loadAndCompareRankings); // 페이지가 로드되면 랭킹을 바로 불러옵니다.
document.getElementById('reloadBtn').addEventListener('click', loadAndCompareRankings); // '다시 불러오기' 버튼 클릭 시
document.getElementById('searchBtn').addEventListener('click', filterByNickname); // '검색' 버튼 클릭 시
document.getElementById('searchInput').addEventListener('keyup', (event) => {
    // 검색창에서 Enter 키를 눌러도 검색이 되도록 합니다.
    if (event.key === 'Enter') {
        filterByNickname();
    }
});

/**
 * 랭킹 파일을 불러오고 비교하는 메인 함수
 */
function loadAndCompareRankings() {
    // === 파일 경로가 새 구조에 맞게 수정되었습니다! ===
    Promise.all([
        fetch('../data/run_data/run.json').then(response => response.json()),
        fetch('../data/run_data/run2.json').then(response => response.json())
    ])
    .then(([oldJson, newJson]) => {
        const oldData = oldJson.ranking_datas;
        const newData = newJson.ranking_datas;
        
        displayResults(oldData, newData); // 함수 이름을 displayResults로 변경하여 통일
    })
    .catch(error => {
        // 파일을 불러오다 오류가 발생하면 사용자에게 알립니다.
        console.error("랭킹 파일 로딩 오류:", error);
        alert("랭킹 파일을 불러오는 데 실패했습니다. 'rankDB/tkrun/' 폴더에 run.json과 run2.json 파일이 있는지, 그리고 폴더 구조가 올바른지 확인해주세요.");
    });
}

/**
 * 두 랭킹 데이터를 비교하고 결과를 화면 테이블에 표시하는 함수
 * @param {Array} oldData - 이전 랭킹 데이터 배열
 * @param {Array} newData - 최신 랭킹 데이터 배열
 */
function displayResults(oldData, newData) {
    const tableBody = document.querySelector('#resultsTable tbody');
    tableBody.innerHTML = ''; // 이전 결과를 초기화

    // 빠른 조회를 위해 이전 랭킹 데이터를 Map 객체로 변환
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
 * 입력된 닉네임으로 테이블 결과를 필터링하는 함수
 */
function filterByNickname() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#resultsTable tbody tr');

    rows.forEach(row => {
        const nicknameCell = row.querySelector('.nickname');
        if (nicknameCell) {
            const nickname = nicknameCell.textContent.toLowerCase();
            // 닉네임에 검색어가 포함되어 있으면 보여주고, 그렇지 않으면 숨깁니다.
            if (nickname.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', loadAndCompareRankings);
document.getElementById('reloadBtn').addEventListener('click', loadAndCompareRankings);
document.getElementById('searchBtn').addEventListener('click', filterByNickname);
// ✅ '이미지로 저장' 버튼에 대한 이벤트 리스너를 추가합니다.
document.getElementById('saveAsImageBtn').addEventListener('click', saveTableAsImage); 
document.getElementById('searchInput').addEventListener('keyup', (event) => {
    if (event.key === 'Enter') filterByNickname();
});

// ... (loadAndCompareRankings, displayResults, filterByNickname 함수는 그대로) ...


// ✨✨✨ 아래 함수를 파일 맨 아래에 새로 추가해주세요. ✨✨✨

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