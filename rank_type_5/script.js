// rank_type_5/script.js

// --- 설정 변수 ---
const RANKING_TYPE = 'bounty_data';
const DATA_FILE_NAME = 'bounty.json';

// --- 전역 변수 ---
let configData = {};
let currentNewData = [];
let currentOldData = [];

// --- DOM 요소 ---
const yearSelector = document.getElementById('yearSelector');
const monthWeekSelector = document.getElementById('monthWeekSelector');
const dataSelector = document.getElementById('dataSelector');
const singleViewCheckbox = document.getElementById('singleViewCheckbox');
const tgallCheckbox = document.getElementById('tgallCheckbox');
const comparisonSelection = document.getElementById('comparisonSelection');
const singleSelection = document.getElementById('singleSelection');
const tableContainer = document.querySelector('.table-container');

// --- 이벤트 리스너 ---
document.addEventListener('DOMContentLoaded', initializeApp);
document.getElementById('saveAsImageBtn').addEventListener('click', saveTableAsImage);
document.getElementById('searchInput').addEventListener('input', filterByNickname);
yearSelector.addEventListener('change', updateMonthWeekSelector);
monthWeekSelector.addEventListener('change', loadAndCompareRankings);
dataSelector.addEventListener('change', loadAndCompareRankings);
singleViewCheckbox.addEventListener('change', toggleViewMode);
tgallCheckbox.addEventListener('change', filterByTgall);


async function initializeApp() {
    try {
        const response = await fetch('../config.json');
        configData = await response.json();
        const directories = configData[RANKING_TYPE];
        if (!directories || directories.length < 2) {
            alert('비교할 데이터가 2개 이상 필요합니다. config.json을 확인해주세요.');
            return;
        }
        populateSelectors();
        loadAndCompareRankings();
    } catch (error) {
        console.error("초기화 오류:", error);
        alert("config.json 파일을 불러오거나 처리하는 데 실패했습니다.");
    }
}

function populateSelectors() {
    populateYearSelector();
    updateMonthWeekSelector();
}

function populateYearSelector() {
    const directories = configData[RANKING_TYPE];
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
    const selectedYear = yearSelector.value;
    const directories = configData[RANKING_TYPE]
        .map(dir => ({ original: dir, parsed: parseDateString(dir) }))
        .filter(item => item.parsed.year == selectedYear)
        .sort((a, b) => sortDirectories(a.original, b.original))
        .reverse();

    monthWeekSelector.innerHTML = '';
    dataSelector.innerHTML = '';
    
    directories.forEach((dir, index) => {
        const dataOption = document.createElement('option');
        dataOption.value = dir.original;
        dataOption.textContent = dir.original;
        dataSelector.appendChild(dataOption);

        if (index > 0) {
            const comparisonOption = document.createElement('option');
            comparisonOption.value = dir.original;
            comparisonOption.textContent = dir.original;
            monthWeekSelector.appendChild(comparisonOption);
        }
    });
    
    loadAndCompareRankings();
}

function toggleViewMode() {
    const isSingleView = singleViewCheckbox.checked;
    comparisonSelection.style.display = isSingleView ? 'none' : '';
    singleSelection.style.display = isSingleView ? '' : 'none';
    tableContainer.classList.toggle('single-view', isSingleView);
    loadAndCompareRankings();
}

function filterByTgall() {
    displayResults(currentOldData, currentNewData);
}

async function loadAndCompareRankings() {
    const isSingleView = singleViewCheckbox.checked;

    if (isSingleView) {
        const selectedDir = dataSelector.value;
        if (!selectedDir) return;
        const path = `../data/${RANKING_TYPE}/${selectedDir}/${DATA_FILE_NAME}`;
        try {
            const data = await fetch(path).then(res => res.json());
            currentNewData = data.rankings;
            currentOldData = null;
            displayResults(null, currentNewData);
        } catch (error) {
            console.error("랭킹 파일 로딩 오류:", error);
            alert("랭킹 파일을 불러오는 데 실패했습니다.");
        }
    } else {
        const selectedComparisonDir = monthWeekSelector.value;
        if (!selectedComparisonDir) return;

        const allDirectories = configData[RANKING_TYPE].sort((a,b) => sortDirectories(a,b)).reverse();
        const latestDir = allDirectories[0];

        const latestPath = `../data/${RANKING_TYPE}/${latestDir}/${DATA_FILE_NAME}`;
        const comparisonPath = `../data/${RANKING_TYPE}/${selectedComparisonDir}/${DATA_FILE_NAME}`;
        
        try {
            const [oldJson, newJson] = await Promise.all([
                fetch(comparisonPath).then(res => res.json()),
                fetch(latestPath).then(res => res.json())
            ]);
            
            currentOldData = oldJson.rankings;
            currentNewData = newJson.rankings;
            displayResults(currentOldData, currentNewData);
        } catch (error) {
            console.error("랭킹 파일 로딩 오류:", error);
            alert("랭킹 파일을 불러오는 데 실패했습니다.");
        }
    }
}

// 기존 displayResults 함수를 아래 코드로 교체하세요.
function displayResults(oldData, newData) {
    const isSingleView = singleViewCheckbox.checked;
    const showTgallOnly = tgallCheckbox.checked;

    let filteredData = newData;
    if (showTgallOnly) {
        filteredData = newData.filter(user => specialUsers.includes(user.id) || specialUsers.includes(user.code));
    }

    const tableBody = document.querySelector('#resultsTable tbody');
    tableBody.innerHTML = '';
    const oldRanksMap = !isSingleView && oldData ? new Map(oldData.map(d => [d.id, d.rank])) : null;

    filteredData.forEach(newUser => {
        let rankChangeText = '-';
        let rankChangeClass = '';

        if (!isSingleView && oldRanksMap) {
            const oldRank = oldRanksMap.get(newUser.id);
            if (oldRank !== undefined) {
                const change = oldRank - newUser.rank;
                if (change > 0) { rankChangeText = `▲ ${change}`; rankChangeClass = 'rank-up'; }
                else if (change < 0) { rankChangeText = `▼ ${Math.abs(change)}`; rankChangeClass = 'rank-down'; }
            } else {
                rankChangeText = 'New'; rankChangeClass = 'rank-new';
            }
        }
        
        const isSpecial = specialUsers.includes(newUser.id) || specialUsers.includes(newUser.code);
        const nicknameHtml = `${newUser.nickname}${isSpecial ? '<span class="tgall-icon">트갤</span>' : ''}`;

        const row = document.createElement('tr');
        row.className = rankChangeClass;
        const bountyNumber = parseInt(newUser.bounty, 10);

        row.innerHTML = `
            <td>${newUser.rank}</td>
            <td class="nickname">${nicknameHtml}</td>
            <td class="alliance-name">${newUser.alliance_name || '없음'}</td>
            <td>${newUser.level}</td>
            <td>${bountyNumber.toLocaleString()}</td>
            <td class="rank-change">${rankChangeText}</td>
        `;
        tableBody.appendChild(row);
    });
    filterByNickname();
}


function filterByNickname() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const table = document.getElementById('resultsTable');
    const rows = table.querySelectorAll('tbody tr');
    const noResultsMessage = document.getElementById('noResultsMessage');
    let visibleCount = 0;

    rows.forEach(row => {
        const nicknameCell = row.querySelector('.nickname');
        const allianceCell = row.querySelector('.alliance-name');
        
        const nicknameMatch = nicknameCell && nicknameCell.textContent.toLowerCase().includes(searchTerm);
        const allianceMatch = allianceCell && allianceCell.textContent.toLowerCase().includes(searchTerm);

        if (nicknameMatch || allianceMatch) {
            row.style.display = '';
            visibleCount++;
        } else if(nicknameCell) {
            row.style.display = 'none';
        }
    });

    noResultsMessage.style.display = (visibleCount === 0 && searchTerm) ? 'block' : 'none';
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