// --- 설정 변수 ---
const RANKING_TYPE = 'gp_data';
const DATA_FILE_NAME = 'gp.json';

// --- 전역 변수 ---
let configData = {};
let originalNewData = [];
let originalOldData = [];

// --- DOM 요소 ---
const yearSelector = document.getElementById('yearSelector');
const monthWeekSelector = document.getElementById('monthWeekSelector');
const dataSelector = document.getElementById('dataSelector');
const singleViewCheckbox = document.getElementById('singleViewCheckbox');
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

/**
 * 페이지 초기화 함수
 */
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

/** 모든 선택 메뉴 채우기 */
function populateSelectors() {
    populateYearSelector();
    updateMonthWeekSelector();
}

/**
 * 연도 선택 메뉴 채우기
 */
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

/**
 * 월/주차 및 단일 데이터 선택 메뉴 업데이트
 */
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
        // 단일 데이터 선택 메뉴 채우기
        const dataOption = document.createElement('option');
        dataOption.value = dir.original;
        dataOption.textContent = dir.original; // 수정된 부분
        dataSelector.appendChild(dataOption);

        // 비교 시점 선택 메뉴 채우기 (최신 데이터 제외)
        if (index > 0) {
            const comparisonOption = document.createElement('option');
            comparisonOption.value = dir.original;
            comparisonOption.textContent = dir.original; // 수정된 부분
            monthWeekSelector.appendChild(comparisonOption);
        }
    });

    loadAndCompareRankings();
}

/** 보기 모드 전환 (단일/비교) */
function toggleViewMode() {
    const isSingleView = singleViewCheckbox.checked;
    comparisonSelection.style.display = isSingleView ? 'none' : '';
    singleSelection.style.display = isSingleView ? '' : 'none';
    tableContainer.classList.toggle('single-view', isSingleView);
    loadAndCompareRankings();
}


/**
 * 랭킹 데이터 불러오기 및 비교
 */
async function loadAndCompareRankings() {
    const isSingleView = singleViewCheckbox.checked;

    if (isSingleView) {
        const selectedDir = dataSelector.value;
        if (!selectedDir) return;
        const path = `../data/${RANKING_TYPE}/${selectedDir}/${DATA_FILE_NAME}`;
        try {
            const data = await fetch(path).then(res => res.json());
            originalNewData = data.ranked_records;
            displayResults(null, originalNewData);
        } catch (error) {
            console.error("랭킹 파일 로딩 오류:", error);
            alert("랭킹 파일을 불러오는 데 실패했습니다.");
        }
    } else {
        const selectedComparisonDir = monthWeekSelector.value;
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
            
            originalOldData = oldJson.ranked_records;
            originalNewData = newJson.ranked_records;
            displayResults(originalOldData, originalNewData);

        } catch (error) {
            console.error("랭킹 파일 로딩 오류:", error);
            alert("랭킹 파일을 불러오는 데 실패했습니다.");
        }
    }
}


/**
 * 랭킹 데이터를 화면 테이블에 표시하는 함수
 */
function displayResults(oldData, newData) {
    const isSingleView = singleViewCheckbox.checked;
    const tableBody = document.querySelector('#resultsTable tbody');
    tableBody.innerHTML = '';
    const oldRanksMap = !isSingleView ? new Map(oldData.map(record => [record.user.nickname, record.rank])) : null;

    newData.forEach(newRecord => {
        let rankChangeText = '-';
        let rankChangeClass = '';

        if (!isSingleView && oldRanksMap) {
            const oldRank = oldRanksMap.get(newRecord.user.nickname);
            if (oldRank !== undefined) {
                const change = oldRank - newRecord.rank;
                if (change > 0) { rankChangeText = `▲ ${change}`; rankChangeClass = 'rank-up'; }
                else if (change < 0) { rankChangeText = `▼ ${Math.abs(change)}`; rankChangeClass = 'rank-down'; }
                else { rankChangeText = '-'; rankChangeClass = 'rank-same'; }
            } else {
                rankChangeText = 'New'; rankChangeClass = 'rank-new';
            }
        }

        const row = document.createElement('tr');
        row.className = rankChangeClass;
        row.innerHTML = `
            <td>${newRecord.rank}</td>
            <td class="nickname">${newRecord.user.nickname}</td>
            <td>${newRecord.user.level}</td>
            <td>${newRecord.user_assault_rumble_event.total_max_score.toLocaleString()}</td>
            <td>${newRecord.user_assault_rumble_event.level}</td>
            <td>${newRecord.user_assault_rumble_event.win_count}</td>
            <td class="rank-change">${rankChangeText}</td>
        `;
        tableBody.appendChild(row);
    });
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
        if (nicknameCell && nicknameCell.textContent.toLowerCase().includes(searchTerm)) {
            row.style.display = '';
            visibleCount++;
        } else if(nicknameCell) {
            row.style.display = 'none';
        }
    });

    if (visibleCount === 0 && searchTerm) {
        noResultsMessage.style.display = 'block';
    } else {
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
    const weekMatch = dir.match(/(\d{1,2})주차/);
    return {
        year: yearMatch ? parseInt(yearMatch[1]) : 0,
        month: monthMatch ? parseInt(monthMatch[1]) : 0,
        week: weekMatch ? parseInt(weekMatch[1]) : 0,
    };
}

function sortDirectories(a, b) {
    const dateA = parseDateString(a);
    const dateB = parseDateString(b);
    if (dateA.year !== dateB.year) return dateA.year - dateB.year;
    if (dateA.month !== dateB.month) return dateA.month - dateB.month;
    return dateA.week - dateB.week;
}