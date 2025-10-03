// rank_type_7/script.js

// 설정 변수
const RANKING_TYPE = 'blitz_data';
const DATA_FILE_NAME = 'blitz.json';

// 전역 변수
let configData = {};
let currentNewData = [];
let currentOldData = [];
let currentPage = 1;
const rowsPerPage = 100;

// --- DOM 요소 ---
const yearSelector = document.getElementById('yearSelector');
const monthWeekSelector = document.getElementById('monthWeekSelector');
const dataSelector = document.getElementById('dataSelector');
const singleViewCheckbox = document.getElementById('singleViewCheckbox');
const tgallCheckbox = document.getElementById('tgallCheckbox');
const comparisonSelection = document.getElementById('comparisonSelection');
const singleSelection = document.getElementById('singleSelection');
const tableContainer = document.querySelector('.table-container');
const searchInput = document.getElementById('searchInput');

// 이벤트 리스너
document.addEventListener('DOMContentLoaded', initializeApp);
yearSelector.addEventListener('change', updateMonthWeekSelector);
monthWeekSelector.addEventListener('change', loadAndCompareRankings);
dataSelector.addEventListener('change', loadAndCompareRankings);
singleViewCheckbox.addEventListener('change', toggleViewMode);

tgallCheckbox.addEventListener('change', () => {
    currentPage = 1;
    displayResults(currentOldData, currentNewData);
});
searchInput.addEventListener('input', () => {
    currentPage = 1;
    displayResults(currentOldData, currentNewData);
});
document.getElementById('saveAsImageBtn').addEventListener('click', saveTableAsImage);


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
    populateYearSelector();
    updateMonthWeekSelector();
}

/** 연도 선택 메뉴 채우기 */
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

/** 월/주차 및 단일 데이터 선택 메뉴 업데이트 */
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

function toggleViewMode() {
    currentPage = 1;
    const isSingleView = singleViewCheckbox.checked;
    comparisonSelection.style.display = isSingleView ? 'none' : '';
    singleSelection.style.display = isSingleView ? '' : 'none';
    tableContainer.classList.toggle('single-view', isSingleView);
    loadAndCompareRankings();
}

async function displayLastUpdated(filePath, fallbackText) {
    const lastUpdatedElement = document.getElementById('last-updated');
    try {
        const response = await fetch(filePath, { method: 'HEAD' });
        const lastModified = response.headers.get('Last-Modified');
        if (lastModified) {
            const date = new Date(lastModified);
            const formattedDate = `${date.getFullYear()}년 ${(date.getMonth() + 1).toString().padStart(2, '0')}월 ${date.getDate().toString().padStart(2, '0')}일 ${date.getHours().toString().padStart(2, '0')}시 ${date.getMinutes().toString().padStart(2, '0')}분`;
            lastUpdatedElement.textContent = formattedDate;
        } else {
            lastUpdatedElement.textContent = fallbackText;
        }
    } catch (error) {
        console.warn('Last-Modified 헤더를 가져올 수 없습니다.', error);
        lastUpdatedElement.textContent = fallbackText;
    }
}

async function loadAndCompareRankings() {
    currentPage = 1;
    const isSingleView = singleViewCheckbox.checked;
    const titleElement = document.getElementById('main-title');

    if (isSingleView) {
        const selectedDir = dataSelector.value;
        if (titleElement) titleElement.textContent = `🏆 ${selectedDir} 대난투 랭킹`;

        if (!selectedDir) {
            document.querySelector('#resultsTable tbody').innerHTML = '';
            return;
        }
        const path = `../data/${RANKING_TYPE}/${selectedDir}/${DATA_FILE_NAME}`;
        await displayLastUpdated(path, selectedDir);
        try {
            const data = await fetch(path).then(res => res.json());
            currentNewData = data;
            currentOldData = null;
            displayResults(null, currentNewData);
        } catch (error) {
            console.error("랭킹 파일 로딩 오류:", error);
            alert("랭킹 파일을 불러오는 데 실패했습니다.");
        }
    } else {
        const selectedComparisonDir = monthWeekSelector.value;
        if (!selectedComparisonDir) {
            document.querySelector('#resultsTable tbody').innerHTML = '';
            return;
        }

        const allDirectories = configData[RANKING_TYPE].sort(sortDirectories).reverse();
        const latestDir = allDirectories[0];

        if (titleElement) titleElement.textContent = `🏆 ${latestDir} 대난투 랭킹`;

        const latestPath = `../data/${RANKING_TYPE}/${latestDir}/${DATA_FILE_NAME}`;
        await displayLastUpdated(latestPath, latestDir);
        const comparisonPath = `../data/${RANKING_TYPE}/${selectedComparisonDir}/${DATA_FILE_NAME}`;

        try {
            const [oldJson, newJson] = await Promise.all([
                fetch(comparisonPath).then(res => res.json()),
                fetch(latestPath).then(res => res.json())
            ]);
            currentOldData = oldJson;
            currentNewData = newJson;
            displayResults(currentOldData, currentNewData);
        } catch (error) {
            console.error("랭킹 파일 로딩 오류:", error);
            alert("랭킹 파일을 불러오는 데 실패했습니다.");
        }
    }
}

function displayResults(oldData, newData) {
    const tableBody = document.querySelector('#resultsTable tbody');
    const noResultsMessage = document.getElementById('noResultsMessage');
    const isSingleView = singleViewCheckbox.checked;
    tableBody.innerHTML = '';

    // 1. 필터링 적용
    const showTgallOnly = tgallCheckbox.checked;
    const searchTerm = searchInput.value.toLowerCase();

    const filteredData = newData.filter(user => {
        const tgallMatch = !showTgallOnly || (user.alliance_name && (user.alliance_name.includes('팀트갤') || user.alliance_name.includes('DC2')));
        const searchMatch = !searchTerm || 
                            (user.nickname && user.nickname.toLowerCase().includes(searchTerm)) ||
                            (user.alliance_name && user.alliance_name.toLowerCase().includes(searchTerm));
        return tgallMatch && searchMatch;
    });

    noResultsMessage.style.display = filteredData.length === 0 ? 'block' : 'none';

    // 2. 페이지네이션 적용
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    // 3. 테이블 렌더링
    const oldRanksMap = !isSingleView && oldData ? new Map(oldData.map(user => [user.nickname, user.rank])) : null;

    paginatedData.forEach(newUser => {
        let rankChangeText = '-';
        let rankChangeClass = '';

        if (!isSingleView && oldRanksMap) {
            const oldRank = oldRanksMap.get(newUser.nickname);
            if (oldRank !== undefined) {
                const change = oldRank - newUser.rank;
                if (change > 0) { rankChangeText = `▲ ${change}`; rankChangeClass = 'rank-up'; }
                else if (change < 0) { rankChangeText = `▼ ${Math.abs(change)}`; rankChangeClass = 'rank-down'; }
                else { rankChangeText = '-'; rankChangeClass = 'rank-same'; }
            } else {
                rankChangeText = 'New'; rankChangeClass = 'rank-new';
            }
        }

        const isSpecial = newUser.alliance_name && (newUser.alliance_name.includes('팀트갤') || newUser.alliance_name.includes('DC2'));
        const nickname = newUser.nickname;
        const encodedNickname = encodeURIComponent(nickname);
        const nicknameHtml = `<a href="../history/index.html?nickname=${encodedNickname}" class="history-link">${nickname}</a>${isSpecial ? '<span class="tgall-icon">트갤</span>' : ''}`;

        const row = document.createElement('tr');
        row.className = rankChangeClass;
        row.innerHTML = `
            <td>${newUser.rank}</td>
            <td class="nickname">${nicknameHtml}</td>
            <td class="alliance-name">${newUser.alliance_name || '없음'}</td>
            <td>${newUser.bounty.toLocaleString()}</td>
            <td class="rank-change">${rankChangeText}</td>
        `;
        tableBody.appendChild(row);
    });

    // 4. 페이지네이션 컨트롤 생성
    setupPagination(filteredData);
}

function setupPagination(filteredItems) {
    const paginationWrapper = document.getElementById('pagination-controls');
    paginationWrapper.innerHTML = '';
    const pageCount = Math.ceil(filteredItems.length / rowsPerPage);

    for (let i = 1; i < pageCount + 1; i++) {
        const btn = document.createElement('button');
        btn.innerText = i;
        btn.classList.add('pagination-btn');
        if (currentPage == i) {
            btn.classList.add('active');
        }
        btn.addEventListener('click', () => {
            currentPage = i;
            displayResults(currentOldData, currentNewData);
        });
        paginationWrapper.appendChild(btn);
    }
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