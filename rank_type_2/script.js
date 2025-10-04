// rank_type_2/script.js

// --- 설정 변수 ---
const RANKING_TYPE = 'gp_data';
const DATA_FILE_NAME = 'gp.json';

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
        populateSelectors();
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
        dataOption.textContent = dir.original;
        dataSelector.appendChild(dataOption);

        // 비교 시점 선택 메뉴 채우기 (최신 데이터 제외)
        if (index > 0) {
            const comparisonOption = document.createElement('option');
            comparisonOption.value = dir.original;
            comparisonOption.textContent = dir.original;
            monthWeekSelector.appendChild(comparisonOption);
        }
    });

    // 데이터가 1개만 있을 경우 단일 보기 모드로 강제 전환
    if (directories.length <= 1) {
        singleViewCheckbox.checked = true;
        singleViewCheckbox.disabled = true;
        comparisonSelection.style.display = 'none';
        singleSelection.style.display = '';
        tableContainer.classList.add('single-view');
    } else {
        singleViewCheckbox.disabled = false;
        if (!singleViewCheckbox.checked) {
            comparisonSelection.style.display = '';
            singleSelection.style.display = 'none';
        }
        tableContainer.classList.remove('single-view');
    }
    
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
    const sortBy = activeSortButton ? activeSortButton.dataset.sortBy : 'total_max_score';
    sortTable(sortBy);
}

async function loadAndCompareRankings() {
    const isSingleView = singleViewCheckbox.checked;
    const titleElement = document.getElementById('main-title');
    const lastUpdatedElement = document.getElementById('last-updated');

    if (isSingleView) {
        const selectedDir = dataSelector.value;
        if(titleElement) titleElement.textContent = `🏆 ${selectedDir} 토벌페스티벌 랭킹`;

        if (!selectedDir) {
            document.querySelector('#resultsTable tbody').innerHTML = '';
            return;
        }
        const path = `../data/${RANKING_TYPE}/${selectedDir}/${DATA_FILE_NAME}`;
        try {
            const data = await fetch(path).then(res => res.json());
            if (data.last_updated) {
                const date = new Date(data.last_updated);
                const formattedDate = `${date.getFullYear()}년 ${(date.getMonth() + 1).toString().padStart(2, '0')}월 ${date.getDate().toString().padStart(2, '0')}일 ${date.getHours().toString().padStart(2, '0')}시 ${date.getMinutes().toString().padStart(2, '0')}분`;
                lastUpdatedElement.textContent = formattedDate;
            } else {
                lastUpdatedElement.textContent = "해당 업데이트 시간 정보가 없습니다.";
            }
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
        if (!selectedComparisonDir) {
            document.querySelector('#resultsTable tbody').innerHTML = '';
            return;
        }

        const allDirectories = configData[RANKING_TYPE].sort(sortDirectories).reverse();
        const latestDir = allDirectories[0];

        if(titleElement) titleElement.textContent = `🏆 ${latestDir} 토벌페스티벌 랭킹`;
        
        const latestPath = `../data/${RANKING_TYPE}/${latestDir}/${DATA_FILE_NAME}`;
        const comparisonPath = `../data/${RANKING_TYPE}/${selectedComparisonDir}/${DATA_FILE_NAME}`;
        
        try {
            const [oldJson, newJson] = await Promise.all([
                fetch(comparisonPath).then(res => res.json()),
                fetch(latestPath).then(res => res.json())
            ]);
            
            if (newJson.last_updated) {
                const date = new Date(newJson.last_updated);
                const formattedDate = `${date.getFullYear()}년 ${(date.getMonth() + 1).toString().padStart(2, '0')}월 ${date.getDate().toString().padStart(2, '0')}일 ${date.getHours().toString().padStart(2, '0')}시 ${date.getMinutes().toString().padStart(2, '0')}분`;
                lastUpdatedElement.textContent = formattedDate;
            } else {
                lastUpdatedElement.textContent = "해당 업데이트 시간 정보가 없습니다.";
            }
            currentOldData = oldJson.ranked_records;
            currentNewData = newJson.ranked_records;

        } catch (error) {
            console.error("랭킹 파일 로딩 오류:", error);
            alert("랭킹 파일을 불러오는 데 실패했습니다.");
            currentNewData = [];
            currentOldData = [];
        }
    }
    const activeSortButton = document.querySelector('.sort-btn.active');
    const sortBy = activeSortButton ? activeSortButton.dataset.sortBy : 'total_max_score';
    sortTable(sortBy);
}

function sortTable(sortBy) {
    const sortedData = [...currentNewData].sort((a, b) => {
        const valueA = a.user_assault_rumble_event[sortBy];
        const valueB = b.user_assault_rumble_event[sortBy];
        return valueB - valueA;
    });
    displayResults(currentOldData, sortedData);
}

function displayResults(oldData, newData) {
    const isSingleView = singleViewCheckbox.checked;
    const showTgallOnly = tgallCheckbox.checked;

    let filteredData = newData;
    if (showTgallOnly) {
        filteredData = newData.filter(record => specialUsers.includes(record.user.code) || specialUsers.includes(record.user.id));
    }

    const tableBody = document.querySelector('#resultsTable tbody');
    tableBody.innerHTML = '';
    const oldRanksMap = !isSingleView && oldData ? new Map(oldData.map(record => [record.user.code, record.rank])) : null;

    filteredData.forEach((newRecord, index) => {
        let rankChangeText = '-';
        let rankChangeClass = '';

        if (!isSingleView && oldRanksMap) {
            const oldRank = oldRanksMap.get(newRecord.user.code);
            if (oldRank !== undefined) {
                const change = oldRank - newRecord.rank;
                if (change > 0) { rankChangeText = `▲ ${change}`; rankChangeClass = 'rank-up'; }
                else if (change < 0) { rankChangeText = `▼ ${Math.abs(change)}`; rankChangeClass = 'rank-down'; }
                else { rankChangeText = '-'; rankChangeClass = 'rank-same'; }
            } else {
                rankChangeText = 'New'; rankChangeClass = 'rank-new';
            }
        }
        
        const isSpecial = specialUsers.includes(newRecord.user.code) || specialUsers.includes(newRecord.user.id);
        const nickname = newRecord.user.nickname;
        const encodedNickname = encodeURIComponent(nickname);
        const nicknameHtml = `<a href="../history/index.html?nickname=${encodedNickname}" class="history-link">${nickname}</a>${isSpecial ? '<span class="tgall-icon">트갤</span>' : ''}`;

        const row = document.createElement('tr');
        row.className = rankChangeClass;
        row.innerHTML = `
            <td>${index + 1}</td>
            <td class="nickname">${nicknameHtml}</td>
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

/** 이미지 저장 */
function saveTableAsImage() {
    const target = document.querySelector(".table-container");
    const button = document.getElementById('saveAsImageBtn');
    
    button.textContent = '저장 중...';
    button.disabled = true;

    html2canvas(target, { 
        backgroundColor: '#ffffff',
        scale: Math.max(2, window.devicePixelRatio || 1), // 화질 개선
        useCORS: true,
        onclone: (clonedDoc) => {
            const clonedTarget = clonedDoc.querySelector(".table-container");
            clonedTarget.style.overflow = 'visible';

            // '승리 횟수' 헤더를 찾아 인덱스를 확인합니다.
            const headers = Array.from(clonedDoc.querySelectorAll('#resultsTable th'));
            let winCountIndex = -1;
            headers.forEach((header, index) => {
                if (header.textContent === '승리 횟수') {
                    winCountIndex = index;
                }
            });

            // '승리 횟수' 열을 숨깁니다.
            if (winCountIndex !== -1) {
                clonedDoc.querySelector('#resultsTable th:nth-child(' + (winCountIndex + 1) + ')').style.display = 'none';
                clonedDoc.querySelectorAll('#resultsTable tbody tr').forEach(row => {
                    row.querySelector('td:nth-child(' + (winCountIndex + 1) + ')').style.display = 'none';
                });
            }
            
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