// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', loadAndCompareRankings);
document.getElementById('saveAsImageBtn').addEventListener('click', saveTableAsImage);
document.getElementById('searchInput').addEventListener('input', filterByNickname);

let originalNewData = []; // 검색 필터링을 위해 원본 데이터 저장

function loadAndCompareRankings() {
    Promise.all([
        fetch('../data/bounty_data/2025년9월/bounty.json').then(r => r.json()),
        fetch('../data/bounty_data/2025년9월/bounty2.json').then(r => r.json())
    ]).then(([oldJson, newJson]) => {
        originalNewData = newJson.rankings;
        displayResults(oldJson.rankings, originalNewData);
    }).catch(error => {
        console.error("랭킹 파일 로딩 오류:", error);
        alert("랭킹 파일을 불러오는 데 실패했습니다.");
    });
}

function displayResults(oldData, newData) {
    const tableBody = document.querySelector('#resultsTable tbody');
    tableBody.innerHTML = '';
    const oldRanksMap = new Map(oldData.map(d => [d.nickname, d.rank]));

    newData.forEach(newUser => {
        const oldRank = oldRanksMap.get(newUser.nickname);
        let rankChangeText = '-', rankChangeClass = 'rank-same';

        if (oldRank !== undefined) {
            const change = oldRank - newUser.rank;
            if (change > 0) { rankChangeText = `▲ ${change}`; rankChangeClass = 'rank-up'; }
            else if (change < 0) { rankChangeText = `▼ ${Math.abs(change)}`; rankChangeClass = 'rank-down'; }
        } else {
            rankChangeText = 'New'; rankChangeClass = 'rank-new';
        }

        const row = document.createElement('tr');
        // bounty 값을 숫자로 변환 후 세 자리 콤마를 추가합니다.
        const bountyNumber = parseInt(newUser.bounty, 10);

        row.innerHTML = `
            <td>${newUser.rank}</td>
            <td class="nickname">${newUser.nickname}</td>
            <td>${newUser.alliance_name || '없음'}</td>
            <td>${newUser.level}</td>
            <td>${bountyNumber.toLocaleString()}</td>
            <td class="${rankChangeClass}">${rankChangeText}</td>
        `;
        tableBody.appendChild(row);
    });
}

function filterByNickname() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    // 이전 랭킹 데이터는 그대로 두고, 현재 데이터만 필터링합니다.
    fetch('../data/bounty_data/bounty.json').then(r => r.json()).then(oldJson => {
        const filteredData = originalNewData.filter(record => 
            record.nickname.toLowerCase().includes(searchTerm) ||
            (record.alliance_name && record.alliance_name.toLowerCase().includes(searchTerm))
        );
        
        displayResults(oldJson.rankings, filteredData);

        const table = document.getElementById('resultsTable');
        const noResultsMessage = document.getElementById('noResultsMessage');
        if (filteredData.length === 0) {
            table.style.display = 'none';
            noResultsMessage.style.display = 'block';
        } else {
            table.style.display = '';
            noResultsMessage.style.display = 'none';
        }
    });
}

function saveTableAsImage() {
    const target = document.querySelector(".table-container");
    const button = document.getElementById('saveAsImageBtn');
    button.textContent = '저장 중...';
    button.disabled = true;

    html2canvas(target, { backgroundColor: '#16213e', scale: 2 })
    .then(canvas => {
        const link = document.createElement("a");
        const date = new Date();
        const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        link.href = canvas.toDataURL("image/png", 1.0);
        link.download = `ranking-${formattedDate}.png`;
        link.click();
        button.textContent = '이미지로 저장';
        button.disabled = false;
    }).catch(err => {
        console.error("이미지 캡처 오류:", err);
        alert("이미지 저장에 실패했습니다.");
        button.textContent = '이미지로 저장';
        button.disabled = false;
    });
}