// 설정 변수
const RANKING_TYPE = 'run_data';
const DATA_FILE_NAME = 'run.json';

// 전역 변수
let configData = {};

// 이벤트 리스너
document.addEventListener('DOMContentLoaded', initializeApp);
document.getElementById('yearSelector').addEventListener('change', updateMonthWeekSelector);
document.getElementById('monthWeekSelector').addEventListener('change', loadAndCompareRankings);
document.getElementById('saveAsImageBtn').addEventListener('click', saveTableAsImage);
document.getElementById('searchInput').addEventListener('input', filterByNickname);

/** 페이지 초기화 */
async function initializeApp() {
    try {
        const response = await fetch('../config.json');
        configData = await response.json();
        populateYearSelector();
        updateMonthWeekSelector(); // 초기 월/주차 목록 생성
    } catch (error) {
        console.error("초기화 오류:", error);
        alert("config.json 파일을 불러오는 데 실패했습니다.");
    }
}

/** 연도 선택 메뉴 채우기 */
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

/** 월/주차 선택 메뉴 업데이트 */
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
    
    const latestDir = directories[0].original;

    for (let i = 1; i < directories.length; i++) {
        const dir = directories[i].original;
        const option = document.createElement('option');
        option.value = dir;
        option.textContent = dir.replace(`${selectedYear}년`, '').trim();
        monthWeekSelector.appendChild(option);
    }
    loadAndCompareRankings(); // 연도 변경 시 자동으로 첫 항목으로 비교 실행
}

/** 랭킹 데이터 불러오기 및 비교 */
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
        displayResults(oldJson.ranking_datas, newJson.ranking_datas);
    } catch (error) {
        console.error("랭킹 파일 로딩 오류:", error);
        alert("랭킹 파일을 불러오는 데 실패했습니다.");
    }
}

/** 결과 표시 */
function displayResults(oldData, newData) {
    const tableBody = document.querySelector('#resultsTable tbody');
    tableBody.innerHTML = '';
    const oldRanksMap = new Map(oldData.map(user => [user.nickname, user.rank]));

    newData.forEach(newUser => {
        const oldRank = oldRanksMap.get(newUser.nickname);
        let rankChangeText = '';
        let rankChangeClass = '';

        if (oldRank !== undefined) {
            const change = oldRank - newUser.rank;
            if (change > 0) { rankChangeText = `▲ ${change}`; rankChangeClass = 'rank-up'; }
            else if (change < 0) { rankChangeText = `▼ ${Math.abs(change)}`; rankChangeClass = 'rank-down'; }
            else { rankChangeText = '-'; rankChangeClass = 'rank-same'; }
        } else {
            rankChangeText = 'New'; rankChangeClass = 'rank-new';
        }

        const row = document.createElement('tr');
        row.className = rankChangeClass;
        row.innerHTML = `
            <td>${newUser.rank}</td>
            <td class="nickname">${newUser.nickname}</td>
            <td>${newUser.level}</td>
            <td>${newUser.score.toLocaleString()}</td>
            <td>${rankChangeText}</td>
        `;
        tableBody.appendChild(row);
    });
    filterByNickname();
}

/** 닉네임 필터링 */
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

/** 이미지 저장 */
function saveTableAsImage() { /* ... 기존과 동일 ... */ }

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