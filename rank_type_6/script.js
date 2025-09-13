// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', loadAndCompareRankings);
document.getElementById('reloadBtn').addEventListener('click', loadAndCompareRankings);
document.getElementById('saveAsImageBtn').addEventListener('click', saveTableAsImage);
document.getElementById('searchInput').addEventListener('input', filterByNickname);

let originalNewData = []; // 원본 데이터 저장

function loadAndCompareRankings() {
    Promise.all([
        fetch('../data/pvp_data/2025년9월/pvp.json').then(r => r.json()),
        fetch('../data/pvp_data/2025년9월/pvp2.json').then(r => r.json())
    ]).then(([oldJson, newJson]) => {
        originalNewData = newJson.ranking_datas;
        displayResults(oldJson.ranking_datas, originalNewData);
    }).catch(error => {
        console.error("랭킹 파일 로딩 오류:", error);
        alert("랭킹 파일을 불러오는 데 실패했습니다.");
    });
}

function displayResults(oldData, newData) {
    const tableBody = document.querySelector('#resultsTable tbody');
    tableBody.innerHTML = '';
    const oldRanksMap = new Map(oldData.map(d => [d.user.nickname, d.ranking]));

    newData.forEach(newUser => {
        const oldRank = oldRanksMap.get(newUser.user.nickname);
        let rankChangeText = '-', rankChangeClass = 'rank-same';

        if (oldRank !== undefined) {
            const change = oldRank - newUser.ranking;
            if (change > 0) { rankChangeText = `▲ ${change}`; rankChangeClass = 'rank-up'; }
            else if (change < 0) { rankChangeText = `▼ ${Math.abs(change)}`; rankChangeClass = 'rank-down'; }
        } else {
            rankChangeText = 'New'; rankChangeClass = 'rank-new';
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${newUser.ranking}</td>
            <td class="nickname">${newUser.user.nickname}</td>
            <td>${newUser.ranking_point.toLocaleString()}</td>
            <td><button class="view-deck-btn">보기</button></td>
            <td class="${rankChangeClass}">${rankChangeText}</td>
        `;
        
        // '보기' 버튼에 클릭 이벤트 추가
        const deckButton = row.querySelector('.view-deck-btn');
        deckButton.addEventListener('click', () => {
            showDeckModal(newUser.pirates_arena_deck);
        });
        
        tableBody.appendChild(row);
    });
}

// ✨ 덱 정보를 보여주는 모달(팝업) 함수
function showDeckModal(deckData) {
    const modal = document.getElementById('deckModal');
    const deckInfoDiv = document.getElementById('deckInfo');
    
    // deckData 배열의 각 항목을 <p> 태그로 감싸서 한 줄씩 만듭니다.
    const deckHtml = deckData.map(id => `<p>${id}</p>`).join('');

    deckInfoDiv.innerHTML = deckHtml;
    modal.style.display = 'block';

    // 닫기 버튼 설정
    const closeButton = modal.querySelector('.close-button');
    closeButton.onclick = () => {
        modal.style.display = 'none';
    };

    // 모달 바깥을 클릭하면 닫히도록 설정
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
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

    if (visibleCount === 0) {
        table.style.display = 'none';
        noResultsMessage.style.display = 'block';
    } else {
        table.style.display = '';
        noResultsMessage.style.display = 'none';
    }
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