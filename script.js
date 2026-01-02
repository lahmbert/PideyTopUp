// script.js

// Loading state management
function showLoading(elementId, message = 'Loading...') {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">${message}</p>
            </div>
        `;
    }
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '';
    }
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${message}
            </div>
        `;
    }
}

// Utility functions
function generateSN() {
    const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `TOPUP-${randomNum}`;
}

function getOrders() {
    const orders = localStorage.getItem('orders');
    return orders ? JSON.parse(orders) : [];
}

function saveOrders(orders) {
    localStorage.setItem('orders', JSON.stringify(orders));
}

function updateOrderStatus(sn, status) {
    const orders = getOrders();
    const order = orders.find(o => o.sn === sn);
    if (order) {
        order.status = status;
        saveOrders(orders);
    }
}

// Fetch games from Digiflazz API or fallback to dummy data
async function fetchGames() {
    try {
        const username = 'sosizigwNYLW';
        const apiKey = 'dev-7bd9e1b0-dd42-11eb-bf96-9581bb93bbe0';
        const cmd = 'prepaid';
        const sign = CryptoJS.MD5(username + apiKey + 'pricelist').toString();

        const response = await fetch('https://api.digiflazz.com/v1/price-list', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cmd: cmd,
                username: username,
                sign: sign
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.rc !== '00') {
            throw new Error(`API Error: ${data.message || 'Unknown error'}`);
        }

        // Filter for Games category
        const gamesData = data.data.filter(item => item.category === 'Games');

        if (gamesData.length === 0) {
            throw new Error('No games data found in API response');
        }

        // Group by brand and create denominations
        const gamesMap = {};
        gamesData.forEach(item => {
            if (!gamesMap[item.brand]) {
                gamesMap[item.brand] = {
                    id: item.brand.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, ''),
                    name: item.brand,
                    type: 'game',
                    denominations: []
                };
            }
            gamesMap[item.brand].denominations.push({
                id: item.buyer_sku_code,
                name: item.product_name.replace(item.brand + ' ', ''),
                price: parseInt(item.price),
                buyer_price: parseInt(item.price),
                seller_price: parseInt(item.price) + 1000 // Add markup for seller
            });
        });

        const games = Object.values(gamesMap);
        console.log(`Successfully loaded ${games.length} games with ${gamesData.length} products from Digiflazz API`);
        return games;

    } catch (error) {
        console.error('Failed to fetch from Digiflazz API:', error);
        console.log('API failed - no fallback data will be shown');
        // Return empty array instead of fallback data
        return [];
    }
}

// Load games into the page
async function loadGames() {
    const gamesContainer = document.getElementById('games-container');
    if (gamesContainer) {
        showLoading('games-container', 'Memuat daftar game...');
    }

    try {
        const games = await fetchGames();

        if (gamesContainer) {
            const gameImages = {
                'mobilelegends': 'https://logos-world.net/wp-content/uploads/2020/11/Mobile-Legends-Logo.png',
                'freefire': 'https://logos-world.net/wp-content/uploads/2020/12/Free-Fire-Logo.png',
                'pubgmobile': 'https://logos-world.net/wp-content/uploads/2020/12/PUBG-Mobile-Logo.png',
                'genshinimpact': 'https://logos-world.net/wp-content/uploads/2021/02/Genshin-Impact-Logo.png',
                'valorant': 'https://logos-world.net/wp-content/uploads/2021/02/Valorant-Logo.png',
                'callofdutymobile': 'https://logos-world.net/wp-content/uploads/2020/11/Call-of-Duty-Mobile-Logo.png',
                'honkaistarrail': 'https://logos-world.net/wp-content/uploads/2023/04/Honkai-Star-Rail-Logo.png',
                'clashofclans': 'https://logos-world.net/wp-content/uploads/2020/11/Clash-of-Clans-Logo.png'
            };
            gamesContainer.innerHTML = games.map(game => `
                <div class="col-lg-3 col-md-4 col-sm-6 mb-4 game-item" data-game-name="${game.name.toLowerCase()}">
                    <div class="card game-card h-100" data-game-id="${game.id}">
                        <img src="${gameImages[game.id] || 'https://via.placeholder.com/200x150?text=' + encodeURIComponent(game.name)}" class="card-img-top" alt="${game.name}" style="height: 150px; object-fit: contain; background-color: #fff; padding: 10px;">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title text-center">${game.name}</h5>
                            <button class="btn btn-primary mt-auto" onclick="selectGame('${game.id}')">Top Up</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Update game select options
        const gameSelect = document.getElementById('game-select');
        if (gameSelect) {
            gameSelect.innerHTML = '<option value="">Pilih Game</option>' +
                games.map(game => `<option value="${game.id}">${game.name}</option>`).join('');
        }

        // Load popular games (first 4 games)
        loadPopularGames(games.slice(0, 4));

        // Update kalkulator game options
        const calcGameSelect = document.getElementById('calc-game');
        if (calcGameSelect) {
            calcGameSelect.innerHTML = '<option value="">Pilih Game</option>' +
                games.map(game => `<option value="${game.id}">${game.name}</option>`).join('');
        }

        // Store games data for later use
        window.gamesData = games;

        // Handle case where no games are available
        if (games.length === 0) {
            if (gamesContainer) {
                gamesContainer.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <div class="alert alert-info" role="alert">
                            <i class="fas fa-info-circle me-2"></i>
                            Tidak ada game tersedia saat ini. Silakan coba lagi nanti.
                        </div>
                    </div>
                `;
            }
            return;
        }

    } catch (error) {
        console.error('Failed to load games:', error);
        if (gamesContainer) {
            showError('games-container', 'Gagal memuat daftar game. Silakan refresh halaman atau coba lagi nanti.');
        }
    }
}

// Load popular games section
function loadPopularGames(popularGames) {
    const popularContainer = document.getElementById('popular-games');
    if (popularContainer) {
        if (!popularGames || popularGames.length === 0) {
            popularContainer.innerHTML = '';
            return;
        }

        const gameImages = {
            'mobilelegends': 'https://logos-world.net/wp-content/uploads/2020/11/Mobile-Legends-Logo.png',
            'freefire': 'https://logos-world.net/wp-content/uploads/2020/12/Free-Fire-Logo.png',
            'pubgmobile': 'https://logos-world.net/wp-content/uploads/2020/12/PUBG-Mobile-Logo.png',
            'genshinimpact': 'https://logos-world.net/wp-content/uploads/2021/02/Genshin-Impact-Logo.png'
        };
        popularContainer.innerHTML = popularGames.map(game => `
            <div class="col-lg-3 col-md-6 mb-4">
                <div class="card game-card h-100" data-game-id="${game.id}">
                    <img src="${gameImages[game.id] || 'https://via.placeholder.com/200x150?text=' + encodeURIComponent(game.name)}" class="card-img-top" alt="${game.name}" style="height: 150px; object-fit: contain; background-color: #fff; padding: 10px;">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title text-center">${game.name}</h5>
                        <button class="btn btn-primary mt-auto" onclick="selectGame('${game.id}')">Top Up</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// Select game from card
function selectGame(gameId) {
    const gameSelect = document.getElementById('game-select');
    if (gameSelect) {
        gameSelect.value = gameId;
        gameSelect.dispatchEvent(new Event('change'));
    }
    document.getElementById('topup').scrollIntoView({ behavior: 'smooth' });
}

// Initialize hero slider
function initHeroSlider() {
    if ($('.slider').length) {
        $('.slider').slick({
            dots: true,
            infinite: true,
            speed: 500,
            fade: true,
            cssEase: 'linear',
            autoplay: true,
            autoplaySpeed: 5000,
            arrows: false,
            pauseOnHover: true,
            pauseOnFocus: true,
            responsive: [
                {
                    breakpoint: 768,
                    settings: {
                        fade: false,
                        speed: 300
                    }
                }
            ]
        });
    }
}

// Dark Mode Toggle
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDark);
        themeToggle.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    });

    // Load theme
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = 'Light Mode';
    }
}

// Search functionality
const searchBtn = document.getElementById('search-btn');
const gameSearch = document.getElementById('game-search');
if (searchBtn && gameSearch) {
    const performSearch = () => {
        const query = gameSearch.value.toLowerCase().trim();
        const gameItems = document.querySelectorAll('.game-item');
        gameItems.forEach(item => {
            const gameName = item.getAttribute('data-game-name');
            if (gameName.includes(query)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    };

    searchBtn.addEventListener('click', performSearch);
    gameSearch.addEventListener('input', performSearch);
}

// Top Up Form
const topupForm = document.getElementById('topup-form');
if (topupForm) {
    const gameSelect = document.getElementById('game-select');
    const serverGroup = document.getElementById('server-group');
    const nominalSelect = document.getElementById('nominal');

    gameSelect.addEventListener('change', () => {
        const selectedGameId = gameSelect.value;
        const selectedGame = window.gamesData.find(g => g.id === selectedGameId);
        if (selectedGame) {
            // Show server input for games that require it
            if (['mobilelegends', 'genshinimpact', 'honkaistarrail'].includes(selectedGameId)) {
                serverGroup.style.display = 'block';
            } else {
                serverGroup.style.display = 'none';
            }

            // Update nominal options
            nominalSelect.innerHTML = '<option value="">Pilih Nominal</option>' +
                selectedGame.denominations.map(denom => {
                    const displayPrice = denom.seller_price || denom.price;
                    return `<option value="${denom.name} - Rp ${displayPrice.toLocaleString()}">${denom.name} - Rp ${displayPrice.toLocaleString()}</option>`;
                }).join('');
        }
    });

    topupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const gameId = gameSelect.value;
        const userId = document.getElementById('user-id').value;
        const server = document.getElementById('server').value;
        const nominal = nominalSelect.value;

        if (!gameId || !userId || !nominal) {
            alert('Harap isi semua field yang diperlukan.');
            return;
        }

        const selectedGame = window.gamesData.find(g => g.id === gameId);
        const sn = generateSN();
        const order = {
            sn,
            game: selectedGame.name,
            id: userId,
            server: server || 'N/A',
            nominal,
            status: 'Pending'
        };

        const orders = getOrders();
        orders.push(order);
        saveOrders(orders);

        const message = `Halo Admin, saya ingin top up.\n\nGame: ${selectedGame.name}\nID: ${userId}\nServer: ${server || 'N/A'}\nNominal: ${nominal}\nSN Order: ${sn}`;
        const whatsappUrl = `https://wa.me/6285334679379?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');

        alert(`Order berhasil! SN: ${sn}. Pesan telah dikirim ke WhatsApp.`);
        topupForm.reset();
    });
}

// Cek Status
const cekBtn = document.getElementById('cek-btn');
if (cekBtn) {
    cekBtn.addEventListener('click', () => {
        const sn = document.getElementById('sn-input').value.trim();
        if (!sn) {
            document.getElementById('status-result').innerHTML = '<div class="alert alert-warning">Harap masukkan SN Order.</div>';
            return;
        }

        const orders = getOrders();
        const order = orders.find(o => o.sn === sn);
        if (order) {
            document.getElementById('status-result').innerHTML = `
                <div class="alert alert-info">
                    <strong>Status Order:</strong> ${order.status}<br>
                    <strong>Game:</strong> ${order.game}<br>
                    <strong>ID:</strong> ${order.id}<br>
                    <strong>Server:</strong> ${order.server}<br>
                    <strong>Nominal:</strong> ${order.nominal}
                </div>
            `;
        } else {
            document.getElementById('status-result').innerHTML = '<div class="alert alert-danger">SN Order tidak ditemukan.</div>';
        }
    });
}

// Kalkulator
const calcBtn = document.getElementById('calc-btn');
if (calcBtn) {
    calcBtn.addEventListener('click', () => {
        const gameId = document.getElementById('calc-game').value;
        const amount = parseInt(document.getElementById('calc-amount').value);

        if (!gameId || !amount) {
            document.getElementById('calc-result').innerHTML = '<div class="alert alert-warning">Harap pilih game dan masukkan jumlah.</div>';
            return;
        }

        const selectedGame = window.gamesData.find(g => g.id === gameId);
        if (selectedGame) {
            // Find the closest denomination based on the amount
            const denomination = selectedGame.denominations.find(d => {
                const denomAmount = parseInt(d.name.split(' ')[0]);
                return denomAmount === amount;
            });

            if (denomination) {
                const sellerPrice = denomination.seller_price || denomination.price;
                document.getElementById('calc-result').innerHTML = `
                    <div class="alert alert-success">
                        <strong>${denomination.name}</strong><br>
                        <strong>Harga:</strong> Rp ${sellerPrice.toLocaleString()}<br>
                        <small class="text-muted">Harga sudah termasuk biaya admin</small>
                    </div>
                `;
            } else {
                // Show available denominations for this game
                const availableOptions = selectedGame.denominations.map(d => d.name).join(', ');
                document.getElementById('calc-result').innerHTML = `
                    <div class="alert alert-info">
                        <strong>Nominal tersedia untuk ${selectedGame.name}:</strong><br>
                        ${availableOptions}<br>
                        <small class="text-muted">Pilih dari nominal yang tersedia</small>
                    </div>
                `;
            }
        } else {
            document.getElementById('calc-result').innerHTML = '<div class="alert alert-danger">Game tidak ditemukan.</div>';
        }
    });
}

// Login
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (username === 'admin' && password === 'admin') {
            localStorage.setItem('adminLoggedIn', 'true');
            window.location.href = 'admin.html';
        } else {
            alert('Username atau password salah.');
        }
    });
}

// Admin Dashboard
if (window.location.pathname.includes('admin.html')) {
    if (localStorage.getItem('adminLoggedIn') !== 'true') {
        window.location.href = 'login.html';
    }

    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('adminLoggedIn');
        window.location.href = 'login.html';
    });

    // Sidebar navigation
    const navLinks = document.querySelectorAll('.nav-link');
    const contents = {
        dashboard: document.getElementById('dashboard-content'),
        orders: document.getElementById('orders-content'),
        'update-status': document.getElementById('update-content')
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            Object.values(contents).forEach(c => c.style.display = 'none');
            const target = link.getAttribute('href').substring(1);
            contents[target].style.display = 'block';

            if (target === 'orders') {
                loadOrdersTable();
            }
        });
    });

    function loadOrdersTable(search = '') {
        const orders = getOrders().filter(o => o.sn.includes(search));
        const tbody = document.getElementById('orders-table');
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>${order.sn}</td>
                <td>${order.game}</td>
                <td>${order.id}</td>
                <td>${order.server}</td>
                <td>${order.nominal}</td>
                <td>${order.status}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="changeStatus('${order.sn}', 'Proses')">Proses</button>
                    <button class="btn btn-sm btn-success" onclick="changeStatus('${order.sn}', 'Sukses')">Sukses</button>
                </td>
            </tr>
        `).join('');
    }

    window.changeStatus = (sn, status) => {
        updateOrderStatus(sn, status);
        loadOrdersTable();
        updateDashboardStats();
    };

    const searchInput = document.getElementById('search-sn');
    searchInput.addEventListener('input', () => {
        loadOrdersTable(searchInput.value);
    });

    const updateBtn = document.getElementById('update-btn');
    updateBtn.addEventListener('click', () => {
        const sn = document.getElementById('update-sn').value;
        const status = document.getElementById('update-status').value;
        updateOrderStatus(sn, status);
        alert('Status updated!');
        loadOrdersTable();
        updateDashboardStats();
    });

    function updateDashboardStats() {
        const orders = getOrders();
        document.getElementById('total-orders').textContent = orders.length;
        document.getElementById('pending-orders').textContent = orders.filter(o => o.status === 'Pending').length;
        document.getElementById('completed-orders').textContent = orders.filter(o => o.status === 'Sukses').length;
    }

    // Initial load
    updateDashboardStats();
    loadOrdersTable();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadGames();
    initHeroSlider();
});