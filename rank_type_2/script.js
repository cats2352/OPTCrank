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
        fetch('../data/gp_data/gp.json').then(response => response.json()),
        fetch('../data/gp_data/gp2.json').then(response => response.json())
    ])
    .then(([oldJson, newJson]) => {
        // 데이터 구조에 맞게 'ranked_records'를 사용
        const oldData = oldJson.ranked_records;
        const newData = newJson.ranked_records;
        
        displayResults(oldData, newData);
    })
    .catch(error => {
        console.error("랭킹 파일 로딩 오류:", error);
        alert("랭킹 파일을 불러오는 데 실패했습니다. 'data/gp_data/' 폴더에 gp.json과 gp2.json 파일이 있는지 확인해주세요.");
    });
}

/**
 * 두 랭킹 데이터를 비교하고 결과를 화면 테이블에 표시하는 함수
 * @param {Array} oldData - 이전 랭킹 데이터 배열
 * @param {Array} newData - 최신 랭킹 데이터 배열
 */
function displayResults(oldData, newData) {
    const tableBody = document.querySelector('#resultsTable tbody');
    tableBody.innerHTML = '';

    // 데이터 구조에 맞게 user.nickname을 키로 사용
    const oldRanksMap = new Map(oldData.map(record => [record.user.nickname, record.rank]));

    newData.forEach(newRecord => {
        // newRecord.user.nickname으로 이전 랭킹을 조회
        const oldRank = oldRanksMap.get(newRecord.user.nickname);
        let rankChangeText = '';
        let rankChangeClass = '';

        if (oldRank !== undefined) {
            const change = oldRank - newRecord.rank;
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
        // 새로운 데이터 구조에 맞게 값을 가져와서 테이블 셀을 채웁니다.
        row.innerHTML = `
            <td>${newRecord.rank}</td>
            <td class="nickname">${newRecord.user.nickname}</td>
            <td>${newRecord.user.level}</td>
            <td>${newRecord.user_assault_rumble_event.total_max_score.toLocaleString()}</td>
            <td>${newRecord.user_assault_rumble_event.level}</td>
            <td>${newRecord.user_assault_rumble_event.win_count}</td>
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
    const target = document.querySelector(".table-container"); // 캡처할 대상
    const button = document.getElementById('saveAsImageBtn');
    const originalText = button.textContent;
    button.textContent = '저장 중...'; // 사용자에게 피드백 제공
    button.disabled = true;

    html2canvas(target, {
        backgroundColor: '#16213e', // 캡처 이미지의 배경색을 지정
        scale: 2 // 해상도를 2배로 높여서 더 선명한 이미지를 만듭니다.
    }).then(canvas => {
        // 캔버스를 이미지 데이터 URL로 변환
        const image = canvas.toDataURL("image/png", 1.0);

        // 다운로드를 위한 임시 링크 생성
        const link = document.createElement("a");
        link.href = image;
        
        // 오늘 날짜로 파일 이름 생성
        const date = new Date();
        const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        link.download = `ranking-${formattedDate}.png`;
        
        // 링크를 클릭하여 파일 다운로드 트리거
        link.click();

        // 버튼 상태 원상복구
        button.textContent = originalText;
        button.disabled = false;
    }).catch(err => {
        console.error("이미지 캡처 오류:", err);
        alert("이미지 저장에 실패했습니다.");
        button.textContent = originalText;
        button.disabled = false;
    });
}