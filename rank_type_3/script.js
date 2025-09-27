// rank_type_3/script.js

// --- 설정 변수 ---
const RANKING_TYPE = 'kizuna_data';
const DATA_FILE_NAME = 'kizuna.json';

// --- 전역 변수 ---
let configData = {};
let currentOldData = [];
let currentNewData = [];

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
document.querySelectorAll('.sort-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        sortTable(button.dataset.sortBy);
    });
});
document.getElementById('saveAsImageBtn').addEventListener('click', saveTableAsImage);
document.getElementById('searchInput').addEventListener('input', filterByNickname);
yearSelector.addEventListener('change', updateMonthWeekSelector);
monthWeekSelector.addEventListener('change', loadAndCompareRankings);
dataSelector.addEventListener('change', loadAndCompareRankings);
singleViewCheckbox.addEventListener('change', toggleViewMode);
tgallCheckbox.addEventListener('change', filterByTgall);

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

/** 보기 모드 전환 (단일/비교) */
function toggleViewMode() {
    const isSingleView = singleViewCheckbox.checked;
    comparisonSelection.style.display = isSingleView ? 'none' : '';
    singleSelection.style.display = isSingleView ? '' : 'none';
    tableContainer.classList.toggle('single-view', isSingleView);
    loadAndCompareRankings();
}

function filterByTgall() {
    const activeSortButton = document.querySelector('.sort-btn.active');
    const sortBy = activeSortButton ? activeSortButton.dataset.sortBy : 'kizuna_battle_point';
    sortTable(sortBy);
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
            currentNewData = data.ranked_records;
            currentOldData = null;
        } catch (error) {
            console.error("랭킹 파일 로딩 오류:", error);
            alert("랭킹 파일을 불러오는 데 실패했습니다.");
            currentNewData = [];
            currentOldData = null;
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
            
            currentOldData = oldJson.ranked_records;
            currentNewData = newJson.ranked_records;
        } catch (error) {
            console.error("랭킹 파일 로딩 오류:", error);
            alert("랭킹 파일을 불러오는 데 실패했습니다.");
            currentNewData = [];
            currentOldData = [];
        }
    }
    // 데이터 로드 후 기본 정렬 실행
    const activeSortButton = document.querySelector('.sort-btn.active');
    const sortBy = activeSortButton ? activeSortButton.dataset.sortBy : 'kizuna_battle_point';
    sortTable(sortBy);
}


/**
 * 선택된 기준으로 데이터를 정렬하는 함수
 */
function sortTable(sortBy) {
    // currentNewData를 복사하여 정렬
    const sortedData = [...currentNewData]; 
    sortedData.sort((a, b) => b[sortBy] - a[sortBy]);

    // 정렬된 데이터를 기반으로 화면 표시
    displayResults(currentOldData, sortedData); 
}

/**
 * 결과를 테이블에 표시하는 함수
 */
function displayResults(oldData, newData) {
    const isSingleView = singleViewCheckbox.checked;
    const showTgallOnly = tgallCheckbox.checked;

    let filteredData = newData;
    if (showTgallOnly) {
        filteredData = newData.filter(user => specialUsers.includes(user.code) || specialUsers.includes(user.id));
    }

    const tableBody = document.querySelector('#resultsTable tbody');
    tableBody.innerHTML = '';
    const oldRanksMap = !isSingleView && oldData ? new Map(oldData.map(user => [user.code, user.rank])) : null;

    filteredData.forEach((newUser, index) => {
        let rankChangeText = '-';
        let rankChangeClass = '';

        if (!isSingleView && oldRanksMap) {
            // 순위 비교는 원본 데이터의 'rank' 값을 사용
            const oldRank = oldRanksMap.get(newUser.code);
            if (oldRank !== undefined) {
                const change = oldRank - newUser.rank;
                if (change > 0) { rankChangeText = `▲ ${change}`; rankChangeClass = 'rank-up'; }
                else if (change < 0) { rankChangeText = `▼ ${Math.abs(change)}`; rankChangeClass = 'rank-down'; }
                else { rankChangeText = '-'; rankChangeClass = 'rank-same'; }
            } else {
                rankChangeText = 'New'; rankChangeClass = 'rank-new';
            }
        }

        const isSpecial = specialUsers.includes(newUser.code) || specialUsers.includes(newUser.id);
        const nicknameHtml = `${newUser.nickname}${isSpecial ? '<span class="tgall-icon">트갤</span>' : ''}`;

        const row = document.createElement('tr');
        row.className = rankChangeClass;
        row.innerHTML = `
            <td>${index + 1}</td>
            <td class="nickname">${nicknameHtml}</td>
            <td>${newUser.level}</td>
            <td>${newUser.rescue_count}</td>
            <td>${newUser.battle_count}</td>
            <td>${newUser.kizuna_battle_point.toLocaleString()}</td>
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

    noResultsMessage.style.display = (visibleCount === 0 && searchTerm) ? 'block' : 'none';
}

/** 이미지 저장 */
function saveTableAsImage() {
    const target = document.querySelector(".table-container");
    const button = document.getElementById('saveAsImageBtn');
    
    button.textContent = '저장 중...';
    button.disabled = true;

    html2canvas(target, { 
        backgroundColor: '#ffffff', // 캡처의 기본 배경색을 흰색으로 지정
        scale: 2,
        onclone: (clonedDoc) => {
            // html2canvas가 복제한 문서 내에서만 스타일을 수정합니다.
            
            // rank-up 행의 배경 그라데이션 끝 색상을 'transparent' 대신 흰색으로 명시
            clonedDoc.querySelectorAll('tr.rank-up').forEach(row => {
                row.style.background = 'linear-gradient(to right, rgb(240, 161, 161), #ffffff)';
            });

            // rank-down 행의 배경 그라데이션 끝 색상을 'transparent' 대신 흰색으로 명시
            clonedDoc.querySelectorAll('tr.rank-down').forEach(row => {
                row.style.background = 'linear-gradient(to right, rgb(160, 205, 241), #ffffff)';
            });
        }
    })
    .then(canvas => {
        const link = document.createElement("a");
        const date = new Date();
        const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        link.href = canvas.toDataURL("image/png", 1.0);
        link.download = `ranking-${formattedDate}.png`;
        link.click();
    })
    .catch(err => {
        console.error("이미지 캡처 오류:", err);
        alert("이미지 저장에 실패했습니다.");
    })
    .finally(() => {
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