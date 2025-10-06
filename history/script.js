document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('search-btn');
    const nicknameInput = document.getElementById('nickname-input');
    const resultsContainer = document.getElementById('results-container');
    const loadingIndicator = document.getElementById('loading-indicator');
    const saveBtn = document.getElementById('saveAsImageBtn');
    const summaryContainer = document.getElementById('summary-container');
    let allDataCache = null;
    let uniqueNicknames = new Set();

    searchBtn.addEventListener('click', performSearch);
    nicknameInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            performSearch();
        }
    });
    saveBtn.addEventListener('click', saveAsImage);

    // --- 자동완성 기능 초기화 ---
    initializeAutocomplete();

    // --- URL 파라미터를 이용한 자동 검색 기능 ---
    const urlParams = new URLSearchParams(window.location.search);
    const nicknameFromUrl = urlParams.get('nickname');
    if (nicknameFromUrl) {
        nicknameInput.value = nicknameFromUrl;
        performSearch();
    }

    async function initializeAutocomplete() {
        if (!allDataCache) {
            allDataCache = await loadAllData();
        }
        for (const rankType in allDataCache) {
            allDataCache[rankType].forEach(entry => {
                const players = getPlayersFromData({ type: rankType, data: entry.data });
                players.forEach(player => {
                    const nickname = getNickname(player);
                    if (nickname) {
                        uniqueNicknames.add(nickname);
                    }
                });
            });
        }

        nicknameInput.addEventListener('input', function(e) {
            const val = this.value;
            closeAllLists();
            if (!val) { return false; }
            
            const autocompleteList = document.createElement('div');
            autocompleteList.setAttribute('id', 'autocomplete-list');
            autocompleteList.setAttribute('class', 'autocomplete-items');
            this.parentNode.appendChild(autocompleteList);
            
            const nicknamesArray = Array.from(uniqueNicknames);
            let count = 0;
            for (let i = 0; i < nicknamesArray.length; i++) {
                if (nicknamesArray[i].toLowerCase().includes(val.toLowerCase()) && count < 7) {
                    const item = document.createElement('div');
                    item.innerHTML = nicknamesArray[i];
                    item.addEventListener('click', function(e) {
                        nicknameInput.value = this.innerText;
                        closeAllLists();
                    });
                    autocompleteList.appendChild(item);
                    count++;
                }
            }
        });
        
        document.addEventListener('click', (e) => {
            closeAllLists(e.target);
        });
    }
    
    function closeAllLists(elmnt) {
        const items = document.getElementsByClassName('autocomplete-items');
        for (let i = 0; i < items.length; i++) {
            if (elmnt != items[i] && elmnt != nicknameInput) {
                items[i].parentNode.removeChild(items[i]);
            }
        }
    }

    async function performSearch() {
        const nickname = nicknameInput.value.trim();
        closeAllLists();
        if (!nickname) {
            alert('닉네임을 입력해주세요.');
            return;
        }

        loadingIndicator.style.display = 'block';
        resultsContainer.innerHTML = '';
        summaryContainer.innerHTML = '';
        saveBtn.style.display = 'none';

        if (!allDataCache) {
            allDataCache = await loadAllData();
        }

        const uniqueUsers = findUniqueUsersByNickname(nickname, allDataCache);

        if (uniqueUsers.length === 0) {
            loadingIndicator.style.display = 'none';
            resultsContainer.innerHTML = '<p>해당 닉네임을 가진 유저를 찾을 수 없습니다.</p>';
            return;
        }

        if (uniqueUsers.length > 1) {
            loadingIndicator.style.display = 'none';
            displayUserSelection(uniqueUsers);
        } else {
            const userId = uniqueUsers[0].id;
            searchHistoryForUser(userId);
        }
    }

    function displayUserSelection(users) {
        resultsContainer.innerHTML = '<h2>동일한 닉네임을 사용하는 여러 유저가 검색되었습니다.</h2><p>조회할 유저를 선택해주세요.</p>';
        const userList = document.createElement('div');
        userList.className = 'user-selection-list';

        users.forEach(user => {
            const userButton = document.createElement('button');
            userButton.className = 'user-select-btn';
            userButton.innerHTML = `
                <div><strong>ID/Code:</strong> ${user.id}</div>
                <div><strong>최근 활동:</strong> ${user.lastPeriod} (${getRankTypeName(user.lastRankType)})</div>
            `;
            userButton.addEventListener('click', () => {
                searchHistoryForUser(user.id);
            });
            userList.appendChild(userButton);
        });
        resultsContainer.appendChild(userList);

        const style = document.createElement('style');
        style.innerHTML = `
            .user-selection-list { display: flex; flex-direction: column; gap: 10px; }
            .user-select-btn { padding: 15px; border: 1px solid #ccc; border-radius: 8px; cursor: pointer; text-align: left; background-color: #f9f9f9; }
            .user-select-btn:hover { background-color: #e9e9e9; }
        `;
        document.head.appendChild(style);
    }
    
    async function searchHistoryForUser(userId) {
        loadingIndicator.style.display = 'block';
        resultsContainer.innerHTML = '';
        summaryContainer.innerHTML = '';

        const idSet = new Set([userId]);
        const history = findUserHistoryByIds(idSet, allDataCache);
        
        loadingIndicator.style.display = 'none';
        displayHistory(history);
    }

    async function loadAllData() {
        const allRankings = {};
        const configResponse = await fetch('../config.json');
        const config = await configResponse.json();

        for (const rankType in config) {
            allRankings[rankType] = [];
            const directories = config[rankType];
            for (const dir of directories) {
                const fileName = getFileNameForRankType(rankType);
                const path = `../data/${rankType}/${dir}/${fileName}`;
                try {
                    const response = await fetch(path);
                    const data = await response.json();
                    allRankings[rankType].push({ period: dir, data: data });
                } catch (error) {
                    console.warn(`데이터를 불러오지 못했습니다: ${path}`, error);
                }
            }
        }
        return allRankings;
    }
    
    function findUniqueUsersByNickname(nickname, allData) {
        const usersMap = new Map();
        const normalizedNickname = nickname.toLowerCase();

        for (const rankType in allData) {
            const sortedEntries = [...allData[rankType]].sort((a, b) => b.period.localeCompare(a.period));

            sortedEntries.forEach(entry => {
                const players = getPlayersFromData({ type: rankType, data: entry.data });
                players.forEach(player => {
                    const currentPlayerNickname = getNickname(player);
                    if (currentPlayerNickname && currentPlayerNickname.toLowerCase() === normalizedNickname) {
                        const id = getUserId(player, rankType);
                        if (id && !usersMap.has(id)) {
                            usersMap.set(id, {
                                id: id,
                                lastPeriod: entry.period,
                                lastRankType: rankType,
                            });
                        }
                    }
                });
            });
        }
        return Array.from(usersMap.values());
    }

    function findUserHistoryByIds(ids, allData) {
        const history = {};
        for (const rankType in allData) {
            const recordsMap = new Map();
            allData[rankType].forEach(entry => {
                const players = getPlayersFromData({ type: rankType, data: entry.data });
                players.forEach(player => {
                    const playerId = getUserId(player, rankType);
                    if (ids.has(playerId)) {
                         recordsMap.set(entry.period, {
                            period: entry.period,
                            rank: player.rank || player.ranking,
                            score: getScore(player),
                            nickname: getNickname(player)
                        });
                    }
                });
            });
            history[rankType] = Array.from(recordsMap.values()).sort((a, b) => a.period.localeCompare(b.period));
        }
        return history;
    }

    function displayHistory(history) {
        resultsContainer.innerHTML = '';
        summaryContainer.innerHTML = '';
        let hasResults = false;
        
        const summary = calculateSummary(history);
        if(summary.totalRecords > 0) {
            displaySummary(summary);
        }

        for (const rankType in history) {
            const records = history[rankType];
            if (records.length > 0) {
                hasResults = true;
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'result-category';
                categoryDiv.innerHTML = `<h2>${getRankTypeName(rankType)}</h2>`;

                const chartContainer = document.createElement('div');
                chartContainer.className = 'chart-container';
                const canvas = document.createElement('canvas');
                chartContainer.appendChild(canvas);
                categoryDiv.appendChild(chartContainer);
                createChart(canvas, records);
                
                const table = document.createElement('table');
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>기간</th>
                            <th>당시 닉네임</th>
                            <th>순위</th>
                            <th>점수/포인트</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.map(r => `
                            <tr>
                                <td>${r.period}</td>
                                <td>${r.nickname}</td>
                                <td>${r.rank}</td>
                                <td>${r.score.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                `;
                categoryDiv.appendChild(table);
                resultsContainer.appendChild(categoryDiv);
            }
        }

        if (!hasResults) {
            resultsContainer.innerHTML = '<p>해당 유저에 대한 랭킹 기록을 찾을 수 없습니다.</p>';
            saveBtn.style.display = 'none';
        } else {
            saveBtn.style.display = 'block';
        }
    }
    
    function calculateSummary(history) {
        let bestRank = Infinity;
        let top100Count = 0;
        let totalRecords = 0;
        const participation = {};

        for (const rankType in history) {
            const records = history[rankType];
            if (records.length > 0) {
                participation[rankType] = records.length;
            }
            records.forEach(record => {
                totalRecords++;
                if (record.rank < bestRank) {
                    bestRank = record.rank;
                }
                if (record.rank <= 100) {
                    top100Count++;
                }
            });
        }
        
        const mostFrequentRankType = Object.keys(participation).length > 0
            ? Object.entries(participation).sort((a, b) => b[1] - a[1])[0][0]
            : null;

        return {
            bestRank: bestRank === Infinity ? '-' : bestRank,
            top100Count,
            mostFrequentRank: mostFrequentRankType ? getRankTypeName(mostFrequentRankType) : '-',
            totalRecords
        };
    }

    function displaySummary(summary) {
        const summaryHtml = `
            <div class="summary-card">
                <h2>🏆 커리어 하이라이트</h2>
                <div class="summary-items">
                    <div class="summary-item">
                        <div class="label">최고 순위</div>
                        <div class="value">#${summary.bestRank}</div>
                    </div>
                    <div class="summary-item">
                        <div class="label">TOP 100 달성</div>
                        <div class="value">${summary.top100Count}회</div>
                    </div>
                    <div class="summary-item">
                        <div class="label">주력 컨텐츠</div>
                        <div class="value">${summary.mostFrequentRank}</div>
                    </div>
                </div>
            </div>
        `;
        summaryContainer.innerHTML = summaryHtml;
    }

    function createChart(canvas, records) {
        const labels = records.map(r => r.period);
        const data = records.map(r => r.rank);

        new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '순위 변동',
                    data: data,
                    borderColor: 'rgba(0, 123, 255, 1)',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                scales: {
                    y: {
                        reverse: true,
                        beginAtZero: false
                    }
                }
            }
        });
    }

    // --- 유틸리티 함수 ---
    function getFileNameForRankType(rankType) {
        const map = {
            'run_data': 'run.json', 'gp_data': 'gp.json', 'kizuna_data': 'kizuna.json', 
            'tm_data': 'tm.json', 'bounty_data': 'bounty.json', 'pvp_data': 'pvp.json',
            'blitz_data': 'blitz.json'
        };
        return map[rankType];
    }

    function getPlayersFromData(ranking) {
        const data = ranking.data;
        switch (ranking.type) {
            case 'run_data': case 'pvp_data': return data.ranking_datas || [];
            case 'gp_data': case 'kizuna_data': return data.ranked_records || [];
            case 'tm_data': return data.rank_data || [];
            case 'bounty_data': case 'blitz_data': return data.rankings || [];
            default: return [];
        }
    }

    function getNickname(player) {
        return player.user ? player.user.nickname : player.nickname;
    }
    
    // --- 여기가 최종 수정된 부분입니다 ---
    function getUserId(player, rankType) {
        const user = player.user || player;
        // 요청하신 4가지 랭킹 타입은 code를 우선으로 사용
        if (rankType === 'run_data' || rankType === 'bounty_data' || rankType === 'kizuna_data' || rankType === 'gp_data') {
            return user.code || user.id;
        }
        // 그 외의 경우 기존 로직대로 id를 우선으로 사용
        return user.id || user.code;
    }
    // --- 여기까지 ---

    function getScore(player) {
        if (player.score) return player.score;
        if (player.user_assault_rumble_event) return player.user_assault_rumble_event.total_max_score;
        if (player.kizuna_battle_point) return player.kizuna_battle_point;
        if (player.treasure_point) return player.treasure_point;
        if (player.bounty) return parseInt(player.bounty, 10);
        if (player.ranking_point) return player.ranking_point;
        return 0;
    }
    
    function getRankTypeName(rankType) {
        const names = {
            'run_data': '트크런', 'gp_data': '토벌페스티벌', 'kizuna_data': '유대결전',
            'tm_data': '트레저맵', 'bounty_data': '현상금', 'pvp_data': '해적제',
            'blitz_data': '대난투'
        };
        return names[rankType] || rankType;
    }
    
    function saveAsImage() {
        const nickname = nicknameInput.value.trim();
        const target = document.getElementById("capture-area");
        
        saveBtn.textContent = '저장 중...';
        saveBtn.disabled = true;

        html2canvas(target, { 
            backgroundColor: '#ffffff', 
            scale: 2,
            onclone: (document) => {
                const container = document.getElementById('capture-area');
                container.style.backgroundColor = '#ffffff';
                container.style.padding = '20px';
            }
        })
        .then(canvas => {
            const link = document.createElement("a");
            const date = new Date();
            const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
            link.href = canvas.toDataURL("image/png", 1.0);
            link.download = `${nickname}_history-${formattedDate}.png`;
            link.click();
        })
        .catch(err => {
            console.error("이미지 캡처 오류:", err);
            alert("이미지 저장에 실패했습니다.");
        })
        .finally(() => {
            saveBtn.textContent = '결과 이미지로 저장';
            saveBtn.disabled = false;
        });
    }
});