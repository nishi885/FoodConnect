const path = window.location.pathname;
const items = document.querySelectorAll("#sidebar-nav a");
const activeItem = [].slice.call(items).find(item => item.getAttribute("href") == path);
if(activeItem) {
	activeItem.classList.add("active");
}

window.setTimeout(() => {
	let alertsWrapper = document.querySelector(".alerts-wrapper");
	if(alertsWrapper) {
		alertsWrapper.style.display = "none";
	}
}, 5000);


let btn = document.querySelector("#sidebar-toggler-btn");
if(btn) {
	btn.addEventListener("click", () => {
		document.querySelector("#sidebar").classList.toggle("sidebar-hide");
	});
}

// Toggle sidebar when clicking the user initial circle in header
const userIcon = document.getElementById('user-icon');
if (userIcon) {
	const toggleSidebar = () => {
		const sidebar = document.getElementById('sidebar');
		if (!sidebar) return;
		sidebar.classList.toggle('sidebar-hide');
		const expanded = sidebar.classList.contains('sidebar-hide') ? 'false' : 'true';
		userIcon.setAttribute('aria-expanded', expanded);
	};
	userIcon.addEventListener('click', toggleSidebar);
	userIcon.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSidebar(); } });
}

// Notification polling and popup
(function() {
	if (!document.getElementById('notif-badge')) return;

	const badge = document.getElementById('notif-badge');
	const list = document.getElementById('notif-list');
	const markAllBtn = document.getElementById('mark-all-read');
	const userId = window.currentUserId || '';

	const showPopup = (text) => {
		const p = document.createElement('div');
		p.className = 'notif-popup';
		p.style = 'position:fixed;right:20px;bottom:20px;background:#fff;border:1px solid #ddd;padding:12px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:2000;';
		p.textContent = text;
		document.body.appendChild(p);
		setTimeout(() => p.remove(), 6000);
	};

	let lastSeen = Number(localStorage.getItem('lastNotifTimestamp') || 0);

	async function fetchNotifs() {
		try {
			const res = await fetch('/notifications', { credentials: 'same-origin' });
			if (!res.ok) {
				if (res.status === 401) {
					badge.style.display = 'none';
				}
				return;
			}
			const data = await res.json();
			const { unreadCount, notifications } = data;
			if (unreadCount > 0) {
				badge.style.display = 'inline-block';
				badge.textContent = unreadCount;
			} else {
				badge.style.display = 'none';
			}
			if (list) {
				if (!notifications || notifications.length === 0) {
					list.innerHTML = 'No notifications';
				} else {
					list.innerHTML = '';
					notifications.forEach(n => {
						const item = document.createElement('div');
						item.className = 'notif-item d-flex justify-content-between align-items-start p-2';
						item.style.borderBottom = '1px solid #eee';
						const left = document.createElement('div');
						left.innerHTML = `<div class="fw-bold">${n.message}</div><div class="small text-muted">${new Date(n.createdAt).toLocaleString()}</div>`;
						const right = document.createElement('div');
						right.innerHTML = n.isRead ? '' : '<span class="badge bg-primary">New</span>';
						item.appendChild(left);
						item.appendChild(right);
						item.dataset.id = n._id;
						item.addEventListener('click', async () => {
							try {
								await fetch('/notifications/mark-read', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n._id }) });
								right.innerHTML = '';
								badge.textContent = Math.max(0, Number(badge.textContent) - 1);
								if (badge.textContent === '0') badge.style.display = 'none';
							} catch (e) { console.error(e); }
						});
						list.appendChild(item);

						// show popup for newly created notifications
						const createdTs = new Date(n.createdAt).getTime();
						if (createdTs > lastSeen && !n.isRead) {
							showPopup(n.message);
							lastSeen = Math.max(lastSeen, createdTs);
							localStorage.setItem('lastNotifTimestamp', String(lastSeen));
						}
					});
				}
			}
		} catch (err) {
			console.error('Error fetching notifications', err);
		}
	}

	if (markAllBtn) {
		markAllBtn.addEventListener('click', async (e) => {
			e.preventDefault();
			try {
				await fetch('/notifications/mark-read', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
				const badges = document.querySelectorAll('#notif-list .badge');
				badges.forEach(b => b.remove());
				badge.style.display = 'none';
			} catch (err) { console.error(err); }
		});
	}

	// initial fetch and interval
	fetchNotifs();
	setInterval(fetchNotifs, 10000);
})();