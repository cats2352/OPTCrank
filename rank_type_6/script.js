// --- 설정 변수 ---
const RANKING_TYPE = 'pvp_data';
const DATA_FILE_NAME = 'pvp.json';

// --- 전역 변수 ---
let configData = {};
let originalNewData = [];
let originalOldData = [];

// --- 이벤트 리스너 ---
document.addEventListener('DOMContentLoaded', initializeApp);
document.getElementById('saveAsImageBtn').addEventListener('click', saveTableAsImage);
document.getElementById('searchInput').addEventListener('input', filterByNickname);
document.getElementById('yearSelector').addEventListener('change', updateMonthWeekSelector);
document.getElementById('monthWeekSelector').addEventListener('change', loadAndCompareRankings);

async function initializeApp() {
    try {
        const response = await fetch('../config.json');
        configData = await response.json();
        const directories = configData[RANKING_TYPE];
        if (!directories || directories.length < 2) {
            alert('비교할 데이터가 2개 이상 필요합니다. config.json을 확인해주세요.');
            return;
        }
        populateYearSelector();
        updateMonthWeekSelector();
    } catch (error) {
        console.error("초기화 오류:", error);
        alert("config.json 파일을 불러오거나 처리하는 데 실패했습니다.");
    }
}

function populateYearSelector() {
    const directories = configData[RANKING_TYPE];
    const yearSelector = document.getElementById('yearSelector');
    const years = [...new Set(directories.map(dir => parseDateString(dir).year))].sort((a, b) => b - a);
    
    yearSelector.innerHTML = '';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}년`;
        yearSelector.appendChild(option);
    });
}

function updateMonthWeekSelector() {
    const yearSelector = document.getElementById('yearSelector');
    const selectedYear = yearSelector.value;
    const directories = configData[RANKING_TYPE]
        .map(dir => ({ original: dir, parsed: parseDateString(dir) }))
        .filter(item => item.parsed.year == selectedYear)
        .sort((a, b) => sortDirectories(a.original, b.original))
        .reverse();

    const monthWeekSelector = document.getElementById('monthWeekSelector');
    monthWeekSelector.innerHTML = '';
    
    if (directories.length > 0) {
        const latestDir = directories[0].original;
        for (let i = 1; i < directories.length; i++) {
            const dir = directories[i].original;
            const option = document.createElement('option');
            option.value = dir;
            option.textContent = dir.replace(`${selectedYear}년`, '').trim();
            monthWeekSelector.appendChild(option);
        }
    }
    loadAndCompareRankings();
}

async function loadAndCompareRankings() {
    const selectedComparisonDir = document.getElementById('monthWeekSelector').value;
    if (!selectedComparisonDir) return;

    const allDirectories = configData[RANKING_TYPE].sort(sortDirectories).reverse();
    const latestDir = allDirectories[0];

    const latestPath = `../data/${RANKING_TYPE}/${latestDir}/${DATA_FILE_NAME}`;
    const comparisonPath = `../data/${RANKING_TYPE}/${selectedComparisonDir}/${DATA_FILE_NAME}`;
    
    try {
        const [oldJson, newJson] = await Promise.all([
            fetch(comparisonPath).then(res => res.json()),
            fetch(latestPath).then(res => res.json())
        ]);
        
        originalOldData = oldJson.ranking_datas;
        originalNewData = newJson.ranking_datas;
        displayResults(originalOldData, originalNewData);
    } catch (error) {
        console.error("랭킹 파일 로딩 오류:", error);
        alert("랭킹 파일을 불러오는 데 실패했습니다.");
    }
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
        row.className = rankChangeClass;
        row.innerHTML = `
            <td>${newUser.ranking}</td>
            <td class="nickname">${newUser.user.nickname}</td>
            <td>${newUser.ranking_point.toLocaleString()}</td>
            <td><button class="view-deck-btn">보기</button></td>
            <td>${rankChangeText}</td>
        `;
        
        const deckButton = row.querySelector('.view-deck-btn');
        deckButton.addEventListener('click', () => {
            showDeckModal(newUser.pirates_arena_deck);
        });
        
        tableBody.appendChild(row);
    });
    filterByNickname();
}

function showDeckModal(deckData) {
    const modal = document.getElementById('deckModal');
    const deckInfoDiv = document.getElementById('deckInfo');
    const deckHtml = deckData.map(id => `<p>${id || ' '}</p>`).join('');
    deckInfoDiv.innerHTML = deckHtml;
    modal.style.display = 'block';
    const closeButton = modal.querySelector('.close-button');
    closeButton.onclick = () => { modal.style.display = 'none'; };
    window.onclick = (event) => {
        if (event.target == modal) { modal.style.display = 'none'; }
    };
}

function filterByNickname() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const table = document.getElementById('resultsTable');
    const rows = table.querySelectorAll('tbody tr');
    const noResultsMessage = document.getElementById('noResultsMessage');
    let visibleCount = 0;

    rows.forEach(row => {
        const nicknameCell = row.querySelector('.nickname');
        if (nicknameCell && nicknameCell.textContent.toLowerCase().includes(searchTerm)) {
            row.style.display = '';
            visibleCount++;
        } else if(nicknameCell) {
            row.style.display = 'none';
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

// --- 유틸리티 함수 ---
function parseDateString(dir) {
    const yearMatch = dir.match(/(\d{4})년/);
    const monthMatch = dir.match(/(\d{1,2})월/);
    return {
        year: yearMatch ? parseInt(yearMatch[1]) : 0,
        month: monthMatch ? parseInt(monthMatch[1]) : 0,
    };
}

function sortDirectories(a, b) {
    const dateA = parseDateString(a);
    const dateB = parseDateString(b);
    if (dateA.year !== dateB.year) return dateA.year - dateB.year;
    return dateA.month - dateB.month;
}