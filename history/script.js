document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('search-btn');
    const nicknameInput = document.getElementById('nickname-input');
    const resultsContainer = document.getElementById('results-container');
    const loadingIndicator = document.getElementById('loading-indicator');
    const saveBtn = document.getElementById('saveAsImageBtn');
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

    async function initializeAutocomplete() {
        if (!allDataCache) {
            allDataCache = await loadAllData();
        }
        // 모든 닉네임 수집
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

        // 입력 필드에 input 이벤트 리스너 추가
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
        saveBtn.style.display = 'none'; // 검색 시작 시 버튼 숨기기

        if (!allDataCache) {
            allDataCache = await loadAllData();
        }

        const uniqueIds = findUniqueIdsByNickname(nickname, allDataCache);
        if (uniqueIds.size === 0) {
            loadingIndicator.style.display = 'none';
            resultsContainer.innerHTML = '<p>해당 닉네임을 가진 유저를 찾을 수 없습니다.</p>';
            return;
        }

        const history = findUserHistoryByIds(uniqueIds, allDataCache);
        
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
    
    function findUniqueIdsByNickname(nickname, allData) {
        const ids = new Set();
        const normalizedNickname = nickname.toLowerCase();

        for (const rankType in allData) {
            allData[rankType].forEach(entry => {
                const players = getPlayersFromData({ type: rankType, data: entry.data });
                players.forEach(player => {
                    const currentPlayerNickname = getNickname(player);
                    if (currentPlayerNickname && currentPlayerNickname.toLowerCase() === normalizedNickname) {
                        const id = getUserId(player);
                        if (id) {
                            ids.add(id);
                        }
                    }
                });
            });
        }
        return ids;
    }


    function findUserHistoryByIds(ids, allData) {
        const history = {};
        for (const rankType in allData) {
            const recordsMap = new Map();
            allData[rankType].forEach(entry => {
                const players = getPlayersFromData({ type: rankType, data: entry.data });
                players.forEach(player => {
                    const playerId = getUserId(player);
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
        let hasResults = false;

        for (const rankType in history) {
            const records = history[rankType];
            if (records.length > 0) {
                hasResults = true;
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'result-category';
                categoryDiv.innerHTML = `<h2>${getRankTypeName(rankType)}</h2>`;

                // 차트 생성
                const chartContainer = document.createElement('div');
                chartContainer.className = 'chart-container';
                const canvas = document.createElement('canvas');
                chartContainer.appendChild(canvas);
                categoryDiv.appendChild(chartContainer);
                createChart(canvas, records);
                
                // 테이블 생성 (닉네임 열 추가)
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
            resultsContainer.innerHTML = '<p>해당 닉네임에 대한 랭킹 기록을 찾을 수 없습니다.</p>';
            saveBtn.style.display = 'none';
        } else {
            saveBtn.style.display = 'block';
        }
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
                        reverse: true, // 순위가 낮을수록 위로
                        beginAtZero: false
                    }
                }
            }
        });
    }

    // --- 유틸리티 함수 ---
    function getFileNameForRankType(rankType) {
        const map = { 'run_data': 'run.json', 'gp_data': 'gp.json', 'kizuna_data': 'kizuna.json', 'tm_data': 'tm.json', 'bounty_data': 'bounty.json', 'pvp_data': 'pvp.json' };
        return map[rankType];
    }

    function getPlayersFromData(ranking) {
        const data = ranking.data;
        switch (ranking.type) {
            case 'run_data': case 'pvp_data': return data.ranking_datas || [];
            case 'gp_data': case 'kizuna_data': return data.ranked_records || [];
            case 'tm_data': return data.rank_data || [];
            case 'bounty_data': return data.rankings || [];
            default: return [];
        }
    }

    function getNickname(player) {
        return player.user ? player.user.nickname : player.nickname;
    }
    
    function getUserId(player) {
        const user = player.user || player;
        return user.id || user.code;
    }

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
            'run_data': '트크런 랭킹', 'gp_data': '토벌페스티벌 랭킹', 'kizuna_data': '유대결전 랭킹',
            'tm_data': '트맵 랭킹', 'bounty_data': '현상금 랭킹', 'pvp_data': '해적제 랭킹'
        };
        return names[rankType] || rankType;
    }
    
    /** 이미지 저장 */
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