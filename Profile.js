document.addEventListener("DOMContentLoaded", () => {
    const v = document.getElementById("bgVideo");
    const pBtn = document.getElementById("playBtn");
    const sBtn = document.getElementById("soundBtn");
    const vSld = document.getElementById("vSlider");
    const overlay = document.getElementById("overlay");
    const card = document.getElementById("profileCard");
    const controls = document.getElementById("controls");
    const topNav = document.getElementById("topNav");

    if (overlay) {
        overlay.addEventListener("click", startExperience);
    }

    if (pBtn) {
        pBtn.addEventListener("click", togglePlay);
    }

    if (sBtn) {
        sBtn.addEventListener("click", toggleMute);
    }

    if (vSld) {
        vSld.addEventListener("input", (e) => updateVol(e.target));
    }

    function startExperience() {
        overlay.classList.add('fade-out');
        
        if (v) {
            v.style.opacity = "1";
            v.muted = false;
            v.play().catch(e => console.log("Cần tương tác người dùng"));
        }

        if (controls) {
            controls.style.opacity = "1";
        }
	if (topNav) {
	    topNav.style.opacity = "1";
	}

        setTimeout(() => { 
            if (card) card.classList.add('active'); 
        }, 600);

        if (vSld) updateVol(vSld);
    }

    function togglePlay() {
        if (!v) return;
        if (v.paused) { 
            v.play(); 
            pBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'; 
        } else { 
            v.pause(); 
            pBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'; 
        }
    }

    function toggleMute() { 
        if (!v) return;
        v.muted = !v.muted; 
        updateUI(); 
    }

    function updateVol(slider) {
        if (!v) return;
        v.volume = slider.value; 
        v.muted = (slider.value == 0);
        const pct = slider.value * 100;
        slider.style.background = `linear-gradient(to right, #fff ${pct}%, rgba(255,255,255,0.2) ${pct}%)`;
        updateUI();
    }

    function updateUI() {
        if (!v || !sBtn) return;
        if (v.muted || v.volume == 0) {
            sBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3z"/><line x1="2" y1="2" x2="22" y2="22" stroke="white" stroke-width="2"/></svg>';
        } else {
            sBtn.innerHTML = '<svg id="soundIcon" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>';
        }
    }
});