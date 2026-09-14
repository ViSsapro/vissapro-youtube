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

document.getElementById('googleLoginBtn').addEventListener('click', window.triggerGoogleLogin);
document.getElementById('facebookLoginBtn').addEventListener('click', window.triggerFacebookLogin);

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

function toggleSideMenu() {
    const drawer = document.getElementById('sideDrawer');
    const overlay = document.getElementById('menuOverlay');
    drawer.classList.toggle('open');
    overlay.style.display = drawer.classList.contains('open') ? 'block' : 'none';
}

function switchPageView(page) {
    document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active-view'));
    document.querySelectorAll('.drawer-nav-item button').forEach(b => b.classList.remove('active'));

    const targetMap = {
        'home': 'viewHome',
        'makemoney': 'viewMakeMoney',
        'paymentDetails': 'viewPaymentDetails',
        'comments': 'viewComments',
        'account': 'viewAccount'
    };
    
    document.getElementById(targetMap[page]).classList.add('active-view');
    document.getElementById('nav' + page.charAt(0).toUpperCase() + page.slice(1)).classList.add('active');
    toggleSideMenu();
}

function updateBalanceDisplay() {
    localStorage.setItem('vissaUserBalance', userBalance.toFixed(5));

    const formatted = '$' + userBalance.toFixed(5);
    document.getElementById('accBalance').innerText = formatted;
    document.getElementById('withdrawDisplayBalance').innerText = formatted;

    const currentLimit = LIMITS[selectedPaymentMethod];
    const methodNameCap = selectedPaymentMethod.charAt(0).toUpperCase() + selectedPaymentMethod.slice(1);
    
    document.getElementById('timelineTitleText').innerText = `${methodNameCap} Goal Progress ($${currentLimit.toFixed(2)} Target)`;
    document.getElementById('timelineMaxText').innerText = `$${currentLimit.toFixed(2)}`;

    const percent = Math.min((userBalance / currentLimit) * 100, 100).toFixed(2);
    document.getElementById('timelinePercent').innerText = percent + '%';
    document.getElementById('timelineBarFill').style.width = percent + '%';

    const remaining = Math.max(0, currentLimit - userBalance).toFixed(5);
    document.getElementById('remainingText').innerText = `Remaining: $${remaining}`;
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
        document.getElementById('btnMethodPaypal').classList.add('active');
        document.getElementById('formPaypal').classList.add('active');
    } else if (method === 'binance') {
        document.getElementById('btnMethodBinance').classList.add('active');
        document.getElementById('formBinance').classList.add('active');
    } else if (method === 'bank') {
        document.getElementById('btnMethodBank').classList.add('active');
        document.getElementById('formBank').classList.add('active');
    }

    updateBalanceDisplay();
};

window.requestWithdrawal = function() {
    const loggedUser = localStorage.getItem('vissaLoggedUser') || 'User';
    const amount = document.getElementById('wAmount').value.trim();
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
        const ppEmail = document.getElementById('wPaypalEmail').value.trim();
        if (!ppEmail) { alert('කරුණාකර PayPal Email එක ඇතුළත් කරන්න!'); return; }
        detailsText = `Method: PayPal\nPayPal Email: ${ppEmail}`;
    } else if (selectedPaymentMethod === 'binance') {
        const bId = document.getElementById('wBinanceId').value.trim();
        if (!bId) { alert('කරුණාකර Binance Pay ID හෝ Address එක ඇතුළත් කරන්න!'); return; }
        detailsText = `Method: Binance\nBinance Pay ID/Address: ${bId}`;
    } else if (selectedPaymentMethod === 'bank') {
        const bank = document.getElementById('wBankName').value.trim();
        const acc = document.getElementById('wAccNumber').value.trim();
        const branch = document.getElementById('wBranch').value.trim();
        const name = document.getElementById('wAccName').value.trim();
        if (!bank || !acc || !branch || !name) { alert('කරුණාකර සියලුම බැංකු තොරතුරු ඇතුළත් කරන්න!'); return; }
        detailsText = `Method: Bank Transfer\nBank: ${bank}\nAcc No: ${acc}\nBranch: ${branch}\nName: ${name}`;
    }

    const withdrawMessage = `User [ ${loggedUser} ] මේක unlock කරන් තියෙන්නේ. මෙන්න මේ ඩොලර් ගණන ($${amount}) withdraw කරන්න.\n\nCurrent User Total Balance: $${userBalance.toFixed(5)}\nRequired Threshold Passed: $${minLimit.toFixed(2)}\n\n--- Withdrawal Details ---\n${detailsText}`;

    emailjs.send('service_0dhcgr3', 'template_cu3r1wj', { email: MY_ADMIN_GMAIL, passcode: withdrawMessage })
        .then(function() {
            alert('ඔබගේ Withdrawal Request එක සාර්ථකව Admin වෙත යවන ලදී!');
            userBalance -= parseFloat(amount);
            updateBalanceDisplay();
            document.getElementById('wAmount').value = '';
        }, function(error) {
            alert('යැවීමේදී දෝෂයක් සිදු විය: ' + JSON.stringify(error));
        });
};

window.postComment = function() {
    const text = document.getElementById('newCommentText').value.trim();
    const loggedUser = localStorage.getItem('vissaLoggedUser') || 'User';

    if (!text) { alert('කරුණාකර Comment එකක් ලියන්න!'); return; }

    const list = document.getElementById('commentsList');
    const newComment = document.createElement('div');
    newComment.style = "background:#222; border-radius:8px; padding:15px; margin-bottom:12px; border-left:3px solid #ff0000;";
    newComment.innerHTML = `
        <div style="font-size:0.85rem; color:#ff0000; font-weight:bold; margin-bottom:4px;">${loggedUser}</div>
        <div style="font-size:0.95rem; color:#ddd;">${text}</div>
    `;
    list.prepend(newComment);
    document.getElementById('newCommentText').value = '';
};

window.openEmailModal = function() { document.getElementById('emailAuthModal').style.display = 'flex'; };
window.closeAuthModal = function() { document.getElementById('emailAuthModal').style.display = 'none'; };

window.sendOTPCode = function() {
    const userEmail = document.getElementById('userEmailInput').value.trim();
    if (!userEmail || !userEmail.includes('@')) { alert('කරුණාකර නිවැරදි Email එකක් ඇතුළත් කරන්න!'); return; }

    pendingEmail = userEmail;
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

    emailjs.send('service_0dhcgr3', 'template_cu3r1wj', { email: userEmail, passcode: generatedOTP })
        .then(function() {
            alert(`Verification Code එක ${userEmail} වෙත යවන ලදී.`);
            document.getElementById('otpStep1').style.display = 'none';
            document.getElementById('otpStep2').style.display = 'block';
        }, function(err) { alert('දෝෂයක් සිදු විය: ' + JSON.stringify(err)); });
};

window.verifyOTPCode = function() {
    if (document.getElementById('otpInput').value.trim() === generatedOTP) {
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
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'flex';
    document.getElementById('displayUserEmail').innerText = email;
    document.getElementById('accEmail').innerText = email;

    const roleElem = document.getElementById('displayUserRole');
    const fabElem = document.getElementById('fabContainer');

    if (email.toLowerCase() === MY_ADMIN_GMAIL.toLowerCase()) {
        roleElem.innerText = "Admin (Creator)";
        roleElem.className = "badge-role admin";
        fabElem.style.display = "flex";
        isAdminLoggedIn = true;
    } else {
        roleElem.innerText = "Viewer";
        roleElem.className = "badge-role";
        fabElem.style.display = "none";
        isAdminLoggedIn = false;
    }

    updateBalanceDisplay();
    render();
}

window.logout = function() {
    localStorage.removeItem('vissaLoggedUser');
    document.getElementById('appScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
};

window.toggleFab = function() { document.getElementById('fabContainer').classList.toggle('active'); };

window.switchMainView = function(view) {
    currentView = view;
    selectedPlaylistId = null;
    document.getElementById('tabAllVideosBtn').classList.toggle('active', view === 'videos');
    document.getElementById('tabPlaylistsBtn').classList.toggle('active', view === 'playlists');
    render();
};

function render() {
    const container = document.getElementById('mainContent');
    const subTabs = document.getElementById('playlistSubTabs');
    container.innerHTML = '';
    subTabs.style.display = 'none';

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
            subTabs.style.display = 'flex';
            renderSubTabs();
            const currentPl = playlistsData.find(pl => pl.id === selectedPlaylistId);
            if (currentPl) renderVideoCards(currentPl.videos, container, currentPl.id);
        }
    }
}

function renderSubTabs() {
    const subTabs = document.getElementById('playlistSubTabs');
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
    const name = document.getElementById('playlistNameInput').value.trim();
    if (!name) { alert("කරුණාකර Playlist Name එකක් ඇතුළත් කරන්න!"); return; }

    const newPl = { id: 'pl_' + Date.now(), name: name, videos: [] };

    try {
        await window.cloudAddPlaylistToDB(newPl);
        playlistsData.push(newPl);
        closeAdminModals();
        document.getElementById('playlistNameInput').value = '';
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
    const targetPlId = document.getElementById('playlistSelect').value;
    const linkInput = document.getElementById('ytLinkInput').value.trim();
    
    const titleInputElem = document.getElementById('customTitle');
    const descInputElem = document.getElementById('customDesc');

    // Title හෝ Description හිස්ව තැබුවහොත් ස්වයංක්‍රීයව Default අගයන් Auto-fill වීම
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
        
        // Input fields clear කිරීම
        document.getElementById('ytLinkInput').value = '';
        if(titleInputElem) titleInputElem.value = '';
        if(descInputElem) descInputElem.value = '';
        
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

window.openPlaylistModal = function() { toggleFab(); document.getElementById('playlistModal').style.display = 'flex'; };
window.openVideoModal = function() {
    toggleFab();
    const select = document.getElementById('playlistSelect');
    select.innerHTML = '<option value="none">-- None (Single Video / Direct Upload) --</option>';
    playlistsData.forEach(pl => { select.innerHTML += `<option value="${pl.id}">${pl.name}</option>`; });
    document.getElementById('videoModal').style.display = 'flex';
};

window.closeAdminModals = function() {
    document.getElementById('playlistModal').style.display = 'none';
    document.getElementById('videoModal').style.display = 'none';
};
