// rank_type_1/script.js

// 설정 변수
const RANKING_TYPE = 'run_data';
const DATA_FILE_NAME = 'run.json';

// 전역 변수
let configData = {};
let currentNewData = [];
let currentOldData = [];

// --- DOM 요소 ---
const yearSelector = document.getElementById('yearSelector');
const monthSelector = document.getElementById('monthSelector'); // 월 선택 추가
const weekSelector = document.getElementById('weekSelector');   // 주차 선택 추가
const dataSelector = document.getElementById('dataSelector');
const singleViewCheckbox = document.getElementById('singleViewCheckbox');
const tgallCheckbox = document.getElementById('tgallCheckbox');
const comparisonSelection = document.getElementById('comparisonSelection');
const singleSelection = document.getElementById('singleSelection');
const tableContainer = document.querySelector('.table-container');

// 이벤트 리스너
document.addEventListener('DOMContentLoaded', initializeApp);
yearSelector.addEventListener('change', updateMonthSelector);
monthSelector.addEventListener('change', updateWeekSelector);
weekSelector.addEventListener('change', loadAndCompareRankings);
dataSelector.addEventListener('change', loadAndCompareRankings);
singleViewCheckbox.addEventListener('change', toggleViewMode);
tgallCheckbox.addEventListener('change', filterByTgall);
document.getElementById('saveAsImageBtn').addEventListener('click', saveTableAsImage);
document.getElementById('searchInput').addEventListener('input', filterByNickname);

/** 페이지 초기화 */
async function initializeApp() {
    try {
        const response = await fetch('../config.json');
        configData = await response.json();
        populateSelectors();
    } catch (error) {
        console.error("초기화 오류:", error);
        alert("config.json 파일을 불러오거나 처리하는 데 실패했습니다.");
    }
}

/** 모든 선택 메뉴 채우기 */
function populateSelectors() {
    const directories = configData[RANKING_TYPE].sort(sortDirectories).reverse();
    const latestDir = directories[0];
    
    // 단일 데이터 선택 메뉴 채우기
    dataSelector.innerHTML = '';
    directories.forEach(dir => {
        const option = document.createElement('option');
        option.value = dir;
        option.textContent = dir;
        dataSelector.appendChild(option);
    });

    // 데이터가 1개만 있을 경우 단일 보기 모드로 강제 전환
    if (directories.length <= 1) {
        singleViewCheckbox.checked = true;
        singleViewCheckbox.disabled = true;
    } else {
        singleViewCheckbox.disabled = false;
    }

    populateYearSelector(); // 연도 선택 메뉴 채우기 시작
    toggleViewMode(); // 초기 뷰 모드 설정
}

/** 연도 선택 메뉴 채우기 */
function populateYearSelector() {
    const directories = configData[RANKING_TYPE];
    // 최신 데이터를 제외한 비교 가능한 데이터 목록 생성
    const comparableDirectories = directories.slice(1); 
    const years = [...new Set(comparableDirectories.map(dir => parseDateString(dir).year))].sort((a, b) => b - a);
    
    yearSelector.innerHTML = '';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}년`;
        yearSelector.appendChild(option);
    });
    updateMonthSelector();
}

/** 월 선택 메뉴 업데이트 */
function updateMonthSelector() {
    const selectedYear = yearSelector.value;
    const comparableDirectories = configData[RANKING_TYPE].slice(1);

    const months = [...new Set(
        comparableDirectories
            .map(dir => parseDateString(dir))
            .filter(date => date.year == selectedYear)
            .map(date => date.month)
    )].sort((a, b) => b - a);

    monthSelector.innerHTML = '';
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = `${month}월`;
        monthSelector.appendChild(option);
    });
    updateWeekSelector();
}

/** 주차 선택 메뉴 업데이트 */
function updateWeekSelector() {
    const selectedYear = yearSelector.value;
    const selectedMonth = monthSelector.value;
    const comparableDirectories = configData[RANKING_TYPE].slice(1);

    const weeks = [...new Set(
        comparableDirectories
            .map(dir => parseDateString(dir))
            .filter(date => date.year == selectedYear && date.month == selectedMonth)
            .map(date => date.week)
    )].sort((a, b) => b - a);

    weekSelector.innerHTML = '';
    weeks.forEach(week => {
        const option = document.createElement('option');
        option.value = week;
        option.textContent = `${week}주차`;
        weekSelector.appendChild(option);
    });
    loadAndCompareRankings();
}

/** 보기 모드 전환 (단일/비교) */
function toggleViewMode() {
    const isSingleView = singleViewCheckbox.checked;
    comparisonSelection.style.display = isSingleView ? 'none' : 'flex';
    singleSelection.style.display = isSingleView ? 'flex' : 'none';
    tableContainer.classList.toggle('single-view', isSingleView);
    loadAndCompareRankings();
}

async function loadAndCompareRankings() {
    const isSingleView = singleViewCheckbox.checked;
    const titleElement = document.getElementById('main-title');
    const lastUpdatedElement = document.getElementById('last-updated');

    if (isSingleView) {
        const selectedDir = dataSelector.value;
        if (titleElement) titleElement.textContent = `🏆 ${selectedDir} 트크런 랭킹`;
        
        if (!selectedDir) {
            document.querySelector('#resultsTable tbody').innerHTML = '';
            return;
        }
        const path = `../data/${RANKING_TYPE}/${selectedDir}/${DATA_FILE_NAME}`;
        try {
            const data = await fetch(path).then(res => res.json());
            updateLastUpdated(data.last_updated, lastUpdatedElement);
            currentNewData = data.ranking_datas;
            currentOldData = null;
            displayResults(null, currentNewData);
        } catch (error) {
            console.error("랭킹 파일 로딩 오류:", error);
            alert("랭킹 파일을 불러오는 데 실패했습니다.");
        }
    } else {
        const selectedYear = yearSelector.value;
        const selectedMonth = monthSelector.value;
        const selectedWeek = weekSelector.value;

        if (!selectedYear || !selectedMonth || !selectedWeek) {
            document.querySelector('#resultsTable tbody').innerHTML = '';
            return;
        }
        const selectedComparisonDir = `${selectedYear}년${selectedMonth}월${selectedWeek}주차`;

        const allDirectories = configData[RANKING_TYPE].sort(sortDirectories).reverse();
        const latestDir = allDirectories[0];

        if (titleElement) titleElement.textContent = `🏆 ${latestDir} 트크런 랭킹`;

        const latestPath = `../data/${RANKING_TYPE}/${latestDir}/${DATA_FILE_NAME}`;
        const comparisonPath = `../data/${RANKING_TYPE}/${selectedComparisonDir}/${DATA_FILE_NAME}`;

        try {
            const [oldJson, newJson] = await Promise.all([
                fetch(comparisonPath).then(res => res.json()),
                fetch(latestPath).then(res => res.json())
            ]);
            updateLastUpdated(newJson.last_updated, lastUpdatedElement);
            currentOldData = oldJson.ranking_datas;
            currentNewData = newJson.ranking_datas;
            displayResults(currentOldData, currentNewData);
        } catch (error) {
            console.error("랭킹 파일 로딩 오류:", error);
            alert("랭킹 파일을 불러오는 데 실패했습니다.");
        }
    }
}

function updateLastUpdated(lastUpdated, element) {
    if (lastUpdated) {
        const date = new Date(lastUpdated);
        element.textContent = `${date.getFullYear()}년 ${(date.getMonth() + 1).toString().padStart(2, '0')}월 ${date.getDate().toString().padStart(2, '0')}일 ${date.getHours().toString().padStart(2, '0')}시 ${date.getMinutes().toString().padStart(2, '0')}분`;
    } else {
        element.textContent = "해당 업데이트 시간 정보가 없습니다.";
    }
}

function filterByTgall() {
    displayResults(currentOldData, currentNewData);
}

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

    filteredData.forEach(newUser => {
        let rankChangeText = '-';
        let rankChangeClass = '';

        if (!isSingleView && oldRanksMap) {
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
        const nickname = newUser.nickname;
        const encodedNickname = encodeURIComponent(nickname);
        const userId = newUser.code || newUser.id;
        const nicknameHtml = `<a href="../history/index.html?nickname=${encodedNickname}&id=${userId}" class="history-link">${nickname}</a>${isSpecial ? '<span class="tgall-icon">트갤</span>' : ''}`;

        const row = document.createElement('tr');
        row.className = rankChangeClass;
        row.innerHTML = `
            <td>${newUser.rank}</td>
            <td class="nickname">${nicknameHtml}</td>
            <td>${newUser.level}</td>
            <td>${newUser.score.toLocaleString()}</td>
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
        if (nicknameCell && nicknameCell.textContent.toLowerCase().includes(searchTerm)) {
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

    html2canvas(target, { 
        backgroundColor: '#ffffff',
        scale: Math.max(2, window.devicePixelRatio || 1),
        useCORS: true,
        onclone: (clonedDoc) => {
            const clonedTarget = clonedDoc.querySelector(".table-container");
            clonedTarget.style.overflow = 'visible';

            clonedDoc.querySelectorAll('tr.rank-up').forEach(row => {
                row.style.background = 'linear-gradient(to right, rgb(240, 161, 161), #ffffff)';
            });

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

/** 날짜 문자열 파싱 유틸리티 */
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

/** 디렉토리 정렬 유틸리티 */
function sortDirectories(a, b) {
    const dateA = parseDateString(a);
    const dateB = parseDateString(b);
    if (dateA.year !== dateB.year) return dateA.year - dateB.year;
    if (dateA.month !== dateB.month) return dateA.month - dateB.month;
    return dateA.week - dateB.week;
}