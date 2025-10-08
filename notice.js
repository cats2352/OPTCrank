document.addEventListener('DOMContentLoaded', () => {
    fetch('notice.json')
        .then(response => response.json())
        .then(data => {
            const noticeList = document.getElementById('notice-list');

            // 날짜를 기준으로 공지사항을 최신순으로 정렬합니다.
            data.notices.sort((a, b) => new Date(b.date) - new Date(a.date));

            // 최신 2개의 공지사항만 표시
            const recentNotices = data.notices.slice(0, 2); 
            
            recentNotices.forEach(notice => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `<span class="date">${notice.date}</span><span class="content">${notice.content}</span>`;
                noticeList.appendChild(listItem);
            });
        })
        .catch(error => {
            console.error('공지사항을 불러오는 중 오류가 발생했습니다.', error);
            const noticeList = document.getElementById('notice-list');
            noticeList.innerHTML = '<li>공지사항을 불러올 수 없습니다.</li>';
        });
});