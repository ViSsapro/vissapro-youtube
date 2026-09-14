import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA6npygmtNl42_xnHjUnWf332QnrBDn1IM",
    authDomain: "vissapro-aa91d.firebaseapp.com",
    projectId: "vissapro-aa91d",
    storageBucket: "vissapro-aa91d.firebasestorage.app",
    messagingSenderId: "866553327331",
    appId: "1:866553327331:web:60ef47fa0c88a942571fd6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global functions attachment for HTML button triggers
window.triggerGoogleLogin = function() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((res) => { loginSuccess(res.user.email); })
        .catch((err) => { alert("Google Sign-In Error: " + err.message); });
};

window.triggerFacebookLogin = function() {
    const provider = new FacebookAuthProvider();
    signInWithPopup(auth, provider)
        .then((res) => { loginSuccess(res.user.email || "facebook_user@vissapro.com"); })
        .catch((err) => { alert("Facebook Sign-In Error: " + err.message); });
};

const googleLoginBtn = document.getElementById('googleLoginBtn');
if (googleLoginBtn) googleLoginBtn.addEventListener('click', window.triggerGoogleLogin);

const facebookLoginBtn = document.getElementById('facebookLoginBtn');
if (facebookLoginBtn) facebookLoginBtn.addEventListener('click', window.triggerFacebookLogin);

// Firestore Data Fetching & Saving
window.cloudFetchData = async function() {
    try {
        const singleDocRef = doc(db, "appData", "singleVideosDoc");
        const singleDocSnap = await getDoc(singleDocRef);

        let sVideos = [];
        if (singleDocSnap.exists()) {
            const data = singleDocSnap.data();
            if (Array.isArray(data.videos)) {
                sVideos = data.videos;
            }
        }

        const plSnap = await getDocs(collection(db, "playlists"));
        const pData = [];

        plSnap.forEach(d => {
            const data = d.data();
            pData.push({
                id: data.id || d.id,
                name: data.name || "Untitled Playlist",
                videos: Array.isArray(data.videos) ? data.videos : []
            });
        });

        return { singleVideos: sVideos, playlistsData: pData };
    } catch (e) {
        console.error("Firestore Fetch Error:", e);
        throw e;
    }
};

window.cloudAddPlaylistToDB = async function(plObj) {
    try {
        await setDoc(doc(db, "playlists", plObj.id), {
            ...plObj,
            videos: Array.isArray(plObj.videos) ? plObj.videos : []
        });
        return true;
    } catch (e) {
        console.error("Add Playlist Error:", e);
        throw e;
    }
};

window.cloudAddVideoToDB = async function(targetPlId, newVidObj, singleVideosArr, playlistsArr) {
    try {
        if (targetPlId === 'none') {
            await setDoc(doc(db, "appData", "singleVideosDoc"), {
                videos: Array.isArray(singleVideosArr) ? singleVideosArr : []
            });
        } else {
            const targetPl = (playlistsArr || []).find(p => p.id === targetPlId);
            if (!targetPl) throw new Error("Selected playlist was not found.");

            await setDoc(doc(db, "playlists", targetPl.id), {
                ...targetPl,
                videos: Array.isArray(targetPl.videos) ? targetPl.videos : []
            });
        }
        return true;
    } catch (e) {
        console.error("Add Video Error:", e);
        throw e;
    }
};

window.cloudUpdateDatabase = async function(singleVideosArr, playlistsArr) {
    try {
        await setDoc(doc(db, "appData", "singleVideosDoc"), {
            videos: Array.isArray(singleVideosArr) ? singleVideosArr : []
        });

        for (const pl of playlistsArr) {
            await setDoc(doc(db, "playlists", pl.id), {
                id: pl.id,
                name: pl.name,
                videos: Array.isArray(pl.videos) ? pl.videos : []
            });
        }
        return true;
    } catch (e) {
        console.error("Cloud Update Error:", e);
        throw e;
    }
};

// Initialize App on load
window.onload = async function() {
    const loggedUser = localStorage.getItem('vissaLoggedUser');
    if (loggedUser) { 
        await loadCloudData();
        initDashboard(loggedUser); 
    }
};

// EmailJS Init
(function(){ emailjs.init("PjusIs1VJ5zFRcuZp"); })();

const MY_ADMIN_GMAIL = "vimukthithuhina754@gmail.com"; 
const ADSTERRA_SHORTLINK = "https://www.profitableratecpmnetwork.com/vjqz55vz70?key=9d1607f0aa27ecbba8680e15d9d0ec4a";

const LIMITS = {
    paypal: 3.00,
    binance: 4.50,
    bank: 6.50
};

let generatedOTP = null;
let pendingEmail = "";
let userBalance = parseFloat(localStorage.getItem('vissaUserBalance')) || 0.00000;
let selectedPaymentMethod = 'paypal';

let singleVideos = [];
let playlistsData = [];
let currentView = 'videos';
let selectedPlaylistId = null;
let isAdminLoggedIn = false;

async function loadCloudData() {
    if (!window.cloudFetchData) return false;
    try {
        const dbRes = await window.cloudFetchData();
        singleVideos = Array.isArray(dbRes.singleVideos) ? dbRes.singleVideos : [];
        playlistsData = Array.isArray(dbRes.playlistsData) ? dbRes.playlistsData : [];
        localStorage.setItem('vissaSingleVideos', JSON.stringify(singleVideos));
        return true;
    } catch (e) {
        console.error("loadCloudData Error:", e);
        return false;
    }
}

// Fixed: Attached to window to prevent undefined errors in HTML onclick
window.toggleSideMenu = function() {
    const drawer = document.getElementById('sideDrawer');
    const overlay = document.getElementById('menuOverlay');
    if (drawer && overlay) {
        drawer.classList.toggle('open');
        overlay.style.display = drawer.classList.contains('open') ? 'block' : 'none';
    }
};

// Fixed: Attached to window to handle page switching properly
window.switchPageView = function(page) {
    document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active-view'));
    document.querySelectorAll('.drawer-nav-item button').forEach(b => b.classList.remove('active'));

    const targetMap = {
        'home': 'viewHome',
        'makemoney': 'viewMakeMoney',
        'paymentDetails': 'viewPaymentDetails',
        'comments': 'viewComments',
        'account': 'viewAccount'
    };
    
    const targetView = document.getElementById(targetMap[page]);
    if (targetView) targetView.classList.add('active-view');

    const navBtn = document.getElementById('nav' + page.charAt(0).toUpperCase() + page.slice(1));
    if (navBtn) navBtn.classList.add('active');

    window.toggleSideMenu();
};

function updateBalanceDisplay() {
    localStorage.setItem('vissaUserBalance', userBalance.toFixed(5));

    const formatted = '$' + userBalance.toFixed(5);
    const accBalanceEl = document.getElementById('accBalance');
    const withdrawDisplayBalanceEl = document.getElementById('withdrawDisplayBalance');
    if (accBalanceEl) accBalanceEl.innerText = formatted;
    if (withdrawDisplayBalanceEl) withdrawDisplayBalanceEl.innerText = formatted;

    const currentLimit = LIMITS[selectedPaymentMethod];
    const methodNameCap = selectedPaymentMethod.charAt(0).toUpperCase() + selectedPaymentMethod.slice(1);
    
    const timelineTitleText = document.getElementById('timelineTitleText');
    const timelineMaxText = document.getElementById('timelineMaxText');
    if (timelineTitleText) timelineTitleText.innerText = `${methodNameCap} Goal Progress ($${currentLimit.toFixed(2)} Target)`;
    if (timelineMaxText) timelineMaxText.innerText = `$${currentLimit.toFixed(2)}`;

    const percent = Math.min((userBalance / currentLimit) * 100, 100).toFixed(2);
    const timelinePercent = document.getElementById('timelinePercent');
    const timelineBarFill = document.getElementById('timelineBarFill');
    if (timelinePercent) timelinePercent.innerText = percent + '%';
    if (timelineBarFill) timelineBarFill.style.width = percent + '%';

    const remaining = Math.max(0, currentLimit - userBalance).toFixed(5);
    const remainingText = document.getElementById('remainingText');
    if (remainingText) remainingText.innerText = `Remaining: $${remaining}`;
}

window.watchAdAction = function(adTitle) {
    window.open(ADSTERRA_SHORTLINK, '_blank');
    userBalance += 0.00010;
    updateBalanceDisplay();
    alert(`"${adTitle}" සක්‍රිය විය! $0.00010 ක් ඔබගේ ගිණුමට එකතු විය.`);
};

window.selectPaymentMethod = function(method) {
    selectedPaymentMethod = method;
    document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.method-form').forEach(f => f.classList.remove('active'));

    if (method === 'paypal') {
        const btn = document.getElementById('btnMethodPaypal');
        const form = document.getElementById('formPaypal');
        if (btn) btn.classList.add('active');
        if (form) form.classList.add('active');
    } else if (method === 'binance') {
        const btn = document.getElementById('btnMethodBinance');
        const form = document.getElementById('formBinance');
        if (btn) btn.classList.add('active');
        if (form) form.classList.add('active');
    } else if (method === 'bank') {
        const btn = document.getElementById('btnMethodBank');
        const form = document.getElementById('formBank');
        if (btn) btn.classList.add('active');
        if (form) form.classList.add('active');
    }

    updateBalanceDisplay();
};

window.requestWithdrawal = function() {
    const loggedUser = localStorage.getItem('vissaLoggedUser') || 'User';
    const amountInput = document.getElementById('wAmount');
    const amount = amountInput ? amountInput.value.trim() : "";
    const minLimit = LIMITS[selectedPaymentMethod];
    let detailsText = "";

    if (userBalance < minLimit) {
        const rem = (minLimit - userBalance).toFixed(5);
        alert(`Withdraw කිරීමට නොහැක!\n\n${selectedPaymentMethod.toUpperCase()} සඳහා අවම Withdrawal limit එක $${minLimit.toFixed(2)} කි.\nඔබට තව $${rem} ක් ලබා ගැනීමට අවශ්‍යයි.`);
        return;
    }

    if (!amount || parseFloat(amount) <= 0) {
        alert('කරුණාකර Withdraw කිරීමට අවශ්‍ය ඩොලර් ගණන ඇතුළත් කරන්න!');
        return;
    }

    if (parseFloat(amount) > userBalance) {
        alert('ඔබගේ Total Balance එකට වඩා වැඩි මුදලක් Withdraw කිරීමට නොහැක!');
        return;
    }

    if (selectedPaymentMethod === 'paypal') {
        const ppEmailEl = document.getElementById('wPaypalEmail');
        const ppEmail = ppEmailEl ? ppEmailEl.value.trim() : "";
        if (!ppEmail) { alert('කරුණාකර PayPal Email එක ඇතුළත් කරන්න!'); return; }
        detailsText = `Method: PayPal\nPayPal Email: ${ppEmail}`;
    } else if (selectedPaymentMethod === 'binance') {
        const bIdEl = document.getElementById('wBinanceId');
        const bId = bIdEl ? bIdEl.value.trim() : "";
        if (!bId) { alert('කරුණාකර Binance Pay ID හෝ Address එක ඇතුළත් කරන්න!'); return; }
        detailsText = `Method: Binance\nBinance Pay ID/Address: ${bId}`;
    } else if (selectedPaymentMethod === 'bank') {
        const bankEl = document.getElementById('wBankName');
        const accEl = document.getElementById('wAccNumber');
        const branchEl = document.getElementById('wBranch');
        const nameEl = document.getElementById('wAccName');
        const bank = bankEl ? bankEl.value.trim() : "";
        const acc = accEl ? accEl.value.trim() : "";
        const branch = branchEl ? branchEl.value.trim() : "";
        const name = nameEl ? nameEl.value.trim() : "";
        if (!bank || !acc || !branch || !name) { alert('කරුණාකර සියලුම බැංකු තොරතුරු ඇතුළත් කරන්න!'); return; }
        detailsText = `Method: Bank Transfer\nBank: ${bank}\nAcc No: ${acc}\nBranch: ${branch}\nName: ${name}`;
    }

    const withdrawMessage = `User [ ${loggedUser} ] මේක unlock කරන් තියෙන්නේ. මෙන්න මේ ඩොලර් ගණන ($${amount}) withdraw කරන්න.\n\nCurrent User Total Balance: $${userBalance.toFixed(5)}\nRequired Threshold Passed: $${minLimit.toFixed(2)}\n\n--- Withdrawal Details ---\n${detailsText}`;

    emailjs.send('service_0dhcgr3', 'template_cu3r1wj', { email: MY_ADMIN_GMAIL, passcode: withdrawMessage })
        .then(function() {
            alert('ඔබගේ Withdrawal Request එක සාර්ථකව Admin වෙත යවන ලදී!');
            userBalance -= parseFloat(amount);
            updateBalanceDisplay();
            if (amountInput) amountInput.value = '';
        }, function(error) {
            alert('යැවීමේදී දෝෂයක් සිදු විය: ' + JSON.stringify(error));
        });
};

window.postComment = function() {
    const commentInput = document.getElementById('newCommentText');
    const text = commentInput ? commentInput.value.trim() : "";
    const loggedUser = localStorage.getItem('vissaLoggedUser') || 'User';

    if (!text) { alert('කරුණාකර Comment එකක් ලියන්න!'); return; }

    const list = document.getElementById('commentsList');
    if (list) {
        const newComment = document.createElement('div');
        newComment.style = "background:#222; border-radius:8px; padding:15px; margin-bottom:12px; border-left:3px solid #ff0000;";
        newComment.innerHTML = `
            <div style="font-size:0.85rem; color:#ff0000; font-weight:bold; margin-bottom:4px;">${loggedUser}</div>
            <div style="font-size:0.95rem; color:#ddd;">${text}</div>
        `;
        list.prepend(newComment);
    }
    if (commentInput) commentInput.value = '';
};

window.openEmailModal = function() { 
    const modal = document.getElementById('emailAuthModal');
    if (modal) modal.style.display = 'flex'; 
};

window.closeAuthModal = function() { 
    const modal = document.getElementById('emailAuthModal');
    if (modal) modal.style.display = 'none'; 
};

window.sendOTPCode = function() {
    const emailInput = document.getElementById('userEmailInput');
    const userEmail = emailInput ? emailInput.value.trim() : "";
    if (!userEmail || !userEmail.includes('@')) { alert('කරුණාකර නිවැරදි Email එකක් ඇතුළත් කරන්න!'); return; }

    pendingEmail = userEmail;
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

    emailjs.send('service_0dhcgr3', 'template_cu3r1wj', { email: userEmail, passcode: generatedOTP })
        .then(function() {
            alert(`Verification Code එක ${userEmail} වෙත යවන ලදී.`);
            const step1 = document.getElementById('otpStep1');
            const step2 = document.getElementById('otpStep2');
            if (step1) step1.style.display = 'none';
            if (step2) step2.style.display = 'block';
        }, function(err) { alert('දෝෂයක් සිදු විය: ' + JSON.stringify(err)); });
};

window.verifyOTPCode = function() {
    const otpInput = document.getElementById('otpInput');
    if (otpInput && otpInput.value.trim() === generatedOTP) {
        closeAuthModal();
        loginSuccess(pendingEmail);
    } else { alert('වැරදි Verification Code එකකි!'); }
};

async function loginSuccess(email) {
    localStorage.setItem('vissaLoggedUser', email);
    await loadCloudData();
    initDashboard(email);
}

function initDashboard(email) {
    const loginScreen = document.getElementById('loginScreen');
    const appScreen = document.getElementById('appScreen');
    if (loginScreen) loginScreen.style.display = 'none';
    if (appScreen) appScreen.style.display = 'flex';
    
    const displayUserEmail = document.getElementById('displayUserEmail');
    const accEmail = document.getElementById('accEmail');
    if (displayUserEmail) displayUserEmail.innerText = email;
    if (accEmail) accEmail.innerText = email;

    const roleElem = document.getElementById('displayUserRole');
    const fabElem = document.getElementById('fabContainer');

    if (email.toLowerCase() === MY_ADMIN_GMAIL.toLowerCase()) {
        if (roleElem) {
            roleElem.innerText = "Admin (Creator)";
            roleElem.className = "badge-role admin";
        }
        if (fabElem) fabElem.style.display = "flex";
        isAdminLoggedIn = true;
    } else {
        if (roleElem) {
            roleElem.innerText = "Viewer";
            roleElem.className = "badge-role";
        }
        if (fabElem) fabElem.style.display = "none";
        isAdminLoggedIn = false;
    }

    updateBalanceDisplay();
    render();
}

window.logout = function() {
    localStorage.removeItem('vissaLoggedUser');
    const appScreen = document.getElementById('appScreen');
    const loginScreen = document.getElementById('loginScreen');
    if (appScreen) appScreen.style.display = 'none';
    if (loginScreen) loginScreen.style.display = 'flex';
};

window.toggleFab = function() { 
    const fab = document.getElementById('fabContainer');
    if (fab) fab.classList.toggle('active'); 
};

window.switchMainView = function(view) {
    currentView = view;
    selectedPlaylistId = null;
    const tabVideos = document.getElementById('tabAllVideosBtn');
    const tabPlaylists = document.getElementById('tabPlaylistsBtn');
    if (tabVideos) tabVideos.classList.toggle('active', view === 'videos');
    if (tabPlaylists) tabPlaylists.classList.toggle('active', view === 'playlists');
    render();
};

function render() {
    const container = document.getElementById('mainContent');
    const subTabs = document.getElementById('playlistSubTabs');
    if (!container) return;
    container.innerHTML = '';
    if (subTabs) subTabs.style.display = 'none';

    if (currentView === 'videos') {
        let allCombined = [...singleVideos];
        playlistsData.forEach(pl => { allCombined = allCombined.concat(pl.videos); });
        if (allCombined.length === 0) {
            container.innerHTML = '<p style="color:#888; text-align:center; padding:40px;">තවමත් වීඩියෝ නොමැත.</p>';
            return;
        }
        renderVideoCards(allCombined, container, 'none');
    } else if (currentView === 'playlists') {
        if (selectedPlaylistId === null) {
            if (playlistsData.length === 0) {
                container.innerHTML = '<p style="color:#888; text-align:center; padding:40px;">තවමත් Playlists නොමැත.</p>';
                return;
            }
            const grid = document.createElement('div');
            grid.className = 'playlist-grid';
            playlistsData.forEach(pl => {
                const card = document.createElement('div');
                card.className = 'playlist-card animated-box-frame';
                card.onclick = () => { selectedPlaylistId = pl.id; render(); };
                card.innerHTML = `<i class="fa-solid fa-layer-group"></i><h3>${pl.name}</h3><span style="color:#777; font-size:0.85rem;">${pl.videos.length} Videos</span>`;
                grid.appendChild(card);
            });
            container.appendChild(grid);
        } else {
            if (subTabs) subTabs.style.display = 'flex';
            renderSubTabs();
            const currentPl = playlistsData.find(pl => pl.id === selectedPlaylistId);
            if (currentPl) renderVideoCards(currentPl.videos, container, currentPl.id);
        }
    }
}

function renderSubTabs() {
    const subTabs = document.getElementById('playlistSubTabs');
    if (!subTabs) return;
    subTabs.innerHTML = '<button class="sub-tab-btn animated-box-frame" onclick="selectedPlaylistId=null;render();"><i class="fa-solid fa-arrow-left"></i> All Playlists</button>';
    playlistsData.forEach(pl => {
        const btn = document.createElement('button');
        btn.className = `sub-tab-btn animated-box-frame ${pl.id === selectedPlaylistId ? 'active' : ''}`;
        btn.innerText = pl.name;
        btn.onclick = () => { selectedPlaylistId = pl.id; render(); };
        subTabs.appendChild(btn);
    });
}

function renderVideoCards(videos, targetElem, playlistContextId) {
    videos.forEach(vid => {
        const card = document.createElement('div');
        card.className = 'video-container animated-box-frame';
        
        let deleteButtonHTML = '';
        if (isAdminLoggedIn) {
            const vidIdentifier = vid.firebaseId || vid.id;
            deleteButtonHTML = `<button onclick="removeVideo('${playlistContextId}', '${vidIdentifier}')" style="background: #ff4d4d; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; margin-top: 10px; font-weight: bold;"><i class="fa-solid fa-trash"></i> Delete Video</button>`;
        }

        card.innerHTML = `
            <div class="video-wrapper"><iframe src="https://www.youtube.com/embed/${vid.id}" allowfullscreen></iframe></div>
            <div class="video-details">
                <h2 class="video-title">${vid.title}</h2>
                <div class="video-description">${vid.description}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <a href="https://www.youtube.com/watch?v=${vid.id}" target="_blank" class="yt-btn"><i class="fa-brands fa-youtube"></i> Watch on YouTube</a>
                    ${deleteButtonHTML}
                </div>
            </div>
        `;
        targetElem.appendChild(card);
    });
}

window.addPlaylist = async function() {
    const nameInput = document.getElementById('playlistNameInput');
    const name = nameInput ? nameInput.value.trim() : "";
    if (!name) { alert("කරුණාකර Playlist Name එකක් ඇතුළත් කරන්න!"); return; }

    const newPl = { id: 'pl_' + Date.now(), name: name, videos: [] };

    try {
        await window.cloudAddPlaylistToDB(newPl);
        playlistsData.push(newPl);
        closeAdminModals();
        if (nameInput) nameInput.value = '';
        switchMainView('playlists');
        alert("Playlist එක සාර්ථකව සාදන ලදී.");
    } catch (e) {
        alert("Playlist save කිරීමට නොහැකි විය: " + e.message);
    }
};

function extractVideoID(url) {
    let cleanUrl = url.split('?')[0].split('&')[0];
    const match = cleanUrl.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/);
    return (match && match[2].length === 11) ? match[2] : null;
}

window.addVideo = async function() {
    const targetPlEl = document.getElementById('playlistSelect');
    const linkInputEl = document.getElementById('ytLinkInput');
    const targetPlId = targetPlEl ? targetPlEl.value : 'none';
    const linkInput = linkInputEl ? linkInputEl.value.trim() : "";
    
    const titleInputElem = document.getElementById('customTitle');
    const descInputElem = document.getElementById('customDesc');

    let title = (titleInputElem && titleInputElem.value.trim()) ? titleInputElem.value.trim() : "VissaPro Exclusive Video";
    let description = (descInputElem && descInputElem.value.trim()) ? descInputElem.value.trim() : "මෙම වීඩියෝව VissaPro Hub එක හරහා නරඹන්න.";

    if (!linkInput) { 
        alert("කරුණාකර YouTube Link එකක් ඇතුළත් කරන්න!"); 
        return; 
    }

    const videoId = extractVideoID(linkInput);
    if (!videoId || videoId.length !== 11) { 
        alert("නිවැරදි YouTube Video Link එකක් ඇතුළත් කරන්න!"); 
        return; 
    }

    const newVidObj = { 
        firebaseId: 'vid_' + Date.now(), 
        id: videoId, 
        title: title, 
        description: description 
    };

    try {
        let nextSingleVideos = [...singleVideos];
        let nextPlaylistsData = playlistsData.map(pl => ({ ...pl, videos: [...pl.videos] }));

        if (targetPlId === 'none') {
            nextSingleVideos.unshift(newVidObj);
        } else {
            const targetPl = nextPlaylistsData.find(pl => pl.id === targetPlId);
            if (!targetPl) { 
                alert("Selected playlist එක හමු වුණේ නැහැ."); 
                return; 
            }
            targetPl.videos.unshift(newVidObj);
        }

        await window.cloudAddVideoToDB(targetPlId, newVidObj, nextSingleVideos, nextPlaylistsData);

        singleVideos = nextSingleVideos;
        playlistsData = nextPlaylistsData;
        localStorage.setItem('vissaSingleVideos', JSON.stringify(singleVideos));

        closeAdminModals();
        
        if (linkInputEl) linkInputEl.value = '';
        if (titleInputElem) titleInputElem.value = '';
        if (descInputElem) descInputElem.value = '';
        
        render();
        alert("Video එක, Title එක සහ Description එක සාර්ථකව Save විය!");
    } catch (e) {
        alert("Video save කිරීමට නොහැකි විය: " + e.message);
    }
};

window.removeVideo = async function(playlistId, videoFirebaseId) {
    if (!confirm("මෙම වීඩියෝව ඉවත් කිරීමට ඔබට අවශ්‍ය බව විශ්වාසද?")) return;

    try {
        let nextSingleVideos = [...singleVideos];
        let nextPlaylistsData = playlistsData.map(pl => ({ ...pl, videos: [...pl.videos] }));

        if (playlistId === 'none') {
            nextSingleVideos = nextSingleVideos.filter(v => v.firebaseId !== videoFirebaseId && v.id !== videoFirebaseId);
        } else {
            const targetPl = nextPlaylistsData.find(pl => pl.id === playlistId);
            if (targetPl) {
                targetPl.videos = targetPl.videos.filter(v => v.firebaseId !== videoFirebaseId && v.id !== videoFirebaseId);
            }
        }

        if (typeof window.cloudUpdateDatabase === 'function') {
            await window.cloudUpdateDatabase(nextSingleVideos, nextPlaylistsData);
        }

        singleVideos = nextSingleVideos;
        playlistsData = nextPlaylistsData;
        localStorage.setItem('vissaSingleVideos', JSON.stringify(singleVideos));

        render();
        alert("වීඩියෝව සාර්ථකව ඉවත් කරන ලදී!");
    } catch (e) {
        alert("වීඩියෝව ඉවත් කිරීම අසාර්ථක විය: " + e.message);
    }
};

window.openPlaylistModal = function() { 
    toggleFab(); 
    const modal = document.getElementById('playlistModal');
    if (modal) modal.style.display = 'flex'; 
};

window.openVideoModal = function() {
    toggleFab();
    const select = document.getElementById('playlistSelect');
    if (select) {
        select.innerHTML = '<option value="none">-- None (Single Video / Direct Upload) --</option>';
        playlistsData.forEach(pl => { select.innerHTML += `<option value="${pl.id}">${pl.name}</option>`; });
    }
    const modal = document.getElementById('videoModal');
    if (modal) modal.style.display = 'flex';
};

window.closeAdminModals = function() {
    const plModal = document.getElementById('playlistModal');
    const vidModal = document.getElementById('videoModal');
    if (plModal) plModal.style.display = 'none';
    if (vidModal) vidModal.style.display = 'none';
};
