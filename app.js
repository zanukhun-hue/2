(() => {
  "use strict";

  const config = window.PORTFOLIO || {};
  const locales = window.PORTFOLIO_LOCALES || {};
  const languageStorageKey = "null-object-language";
  const duration = 35;
  const fps = 24;
  const routes = [
    { id: "home", source: "creative_tape.mp3", type: "typeAudio", start: 0, color: "#e66c4b" },
    { id: "about", source: "null_object.aep", type: "typeComp", start: 9, color: "#d5ab55" },
    { id: "work", source: "showreel.mp4", type: "typeFootage", start: 18, color: "#5980d4" },
    { id: "links", source: "social_links", type: "typeLinks", start: 27, color: "#62a78d" }
  ];

  const $ = id => document.getElementById(id);
  const editor = document.querySelector(".editor");
  const viewer = $("viewer");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const timelineSeek = $("timelineSeek");
  const trackColumn = $("trackColumn");
  const timelinePlay = $("timelinePlay");
  const fileMenu = $("fileMenu");
  const mute = $("mute");
  const volume = $("volume");
  const audio = new Audio();
  const audioToggle = $("audioToggle");
  const audioIcon = audioToggle.firstElementChild;
  const audioLabel = document.createTextNode("");
  audioToggle.replaceChildren(audioIcon, audioLabel);
  const audioTrack = $("audioTrack");
  const audioPosition = $("audioPosition");
  const audioMessage = $("audioMessage");
  const video = $("workVideo");
  const videoMessage = $("videoMessage");
  const gallery = $("workGallery");
  const workPlayer = $("workPlayer");
  const videoToggle = $("videoToggle");
  const videoSeek = $("videoSeek");
  const videoMute = $("videoMute");
  const videoFullscreen = $("videoFullscreen");
  const workSelect = $("workSelect");
  const watchPlay = $("watchPlay");
  const languageSwitch = $("languageSwitch");
  const localizeMedia = [];

  let language = savedLanguage();
  let brand = "Null Object";
  let selectedRoute;
  let seconds = 0;
  let playing = false;
  let frame = 0;
  let previewStart = 0;
  let previewOffset = 0;
  let audioRequest = 0;
  let videoRequest = 0;
  let enteringSlide;
  let leavingSlide;
  let enterTimer;
  let leaveTimer;
  let swipe;
  let snapTimer;

  function savedLanguage() {
    try {
      if (localStorage.getItem(languageStorageKey) === "ru") return "ru";
    } catch {
      // The language switch remains available when storage is blocked.
    }
    return "en";
  }

  function translate(key, values = {}) {
    const text = locales[language]?.[key] ?? locales.en?.[key];
    return text?.replace(/\{(\w+)\}/g, (token, name) => values[name] ?? token);
  }

  function localizedElement(tag, className, key) {
    const node = element(tag, className);
    node.dataset.i18n = key;
    return node;
  }

  function setMessage(node, key = "") {
    if (key) node.dataset.i18n = key;
    else delete node.dataset.i18n;
    node.textContent = translate(key) || "";
  }

  function applyLanguage() {
    document.documentElement.lang = language;
    document.title = brand + " — " + (translate("titleSuffix") || "Creative Archive");
    const attributes = [
      ["data-i18n", ""], ["data-i18n-aria", "aria-label"], ["data-i18n-title", "title"],
      ["data-i18n-alt", "alt"], ["data-i18n-content", "content"]
    ];
    for (const [source, target] of attributes) {
      document.querySelectorAll("[" + source + "]").forEach(node => {
        const text = translate(node.getAttribute(source));
        if (text === undefined) return;
        if (target) node.setAttribute(target, text);
        else if (node.textContent !== text) node.textContent = text;
      });
    }
    localizeMedia.forEach(update => update());
    languageSwitch?.querySelectorAll("[data-language]").forEach(control => {
      control.setAttribute("aria-pressed", String(control.dataset.language === language));
    });
    updatePreview();
    showAudioState();
    updateMuteLabel();
    updateVideoPlayback();
    updateVideoFullscreen();
  }

  function element(tag, className, label) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (label !== undefined) node.textContent = label;
    return node;
  }

  function decorative(tag, className, label) {
    const node = element(tag, className, label);
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  function button(className, label) {
    const node = element("button", className, label);
    node.type = "button";
    return node;
  }

  function mediaSource(value) {
    return typeof value === "string" && /^(https:\/\/|\.\/|assets\/|media\/)/i.test(value) &&
      !/[<>"\u0000-\u001f]/.test(value);
  }

  function externalUrl(value) {
    if (typeof value !== "string") return "";
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  function externalLink(className, title, url) {
    const link = element("a", className);
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    if (title) link.textContent = title;
    return link;
  }

  function loadImage(image, source, fallback) {
    if (!mediaSource(source)) return;
    image.addEventListener("error", () => { image.src = fallback; }, { once: true });
    image.src = source;
  }

  function applyContent() {
    brand = String(config.brand || "Null Object").trim();
    const words = brand.split(/\s+/);
    document.querySelectorAll("[data-brand]").forEach(node => { node.textContent = brand; });
    const title = document.querySelector(".home-copy .display-title");
    title.replaceChildren();
    words.forEach((word, index) => {
      if (index) title.append(" ");
      title.append(element("span", "", word));
    });

    if (config.handle) $("socialHandle").textContent = config.handle;
    document.querySelectorAll("[data-avatar]").forEach(image => {
      loadImage(image, config.profilePhoto, "assets/logo-fallback.svg");
    });
    loadImage($("aboutArtwork"), config.artwork, "assets/hero-fallback.svg");
  }

  function eyeIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("layer-eye");
    const path = document.createElementNS(svg.namespaceURI, "path");
    path.setAttribute("d", "M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zm0 11a4 4 0 110-8 4 4 0 010 8z");
    svg.append(path);
    return svg;
  }

  function drawRoutes() {
    routes.forEach((route, index) => {
      const length = (routes[index + 1]?.start ?? duration) - route.start;
      const project = button("project-item");
      project.append(decorative("span", "layer-swatch"), localizedElement("span", "project-label", route.id),
        localizedElement("small", "project-type", route.type));

      const layer = button("layer-item");
      const switches = decorative("span", "layer-switches");
      switches.append(element("i"), element("i"));
      layer.append(eyeIcon(), decorative("span", "layer-swatch"), decorative("span", "layer-number", index + 1),
        element("span", "layer-name", route.source), switches);
      layer.title = route.source;

      const track = button("track-item");
      track.dataset.i18nAria = route.id;
      track.title = route.source;
      track.style.setProperty("--start", percent(route.start));
      track.style.setProperty("--length", percent(length));
      track.append(decorative("span", "track-bar"));

      const chip = button("mobile-chip");
      chip.append(decorative("span", "layer-swatch"), localizedElement("span", "", route.id));
      const segment = element("span", "mobile-segment");
      segment.style.setProperty("--route-color", route.color);
      segment.style.setProperty("--length", percent(length));
      segment.style.flexBasis = percent(length);
      $("mobileSegments").append(segment);

      const menuLink = localizedElement("a", "file-link", route.id);
      menuLink.href = "#" + route.id;
      for (const [node, container] of [
        [project, "projectList"], [layer, "layerList"], [track, "trackList"],
        [chip, "mobileSections"], [menuLink, "fileLinks"]
      ]) {
        node.dataset.route = route.id;
        node.style.setProperty("--route-color", route.color);
        $(container).append(node);
      }
    });

    for (let tick = 0; tick < duration; tick += 5) {
      const mark = element("span", "ruler-tick", String(tick).padStart(2, "0") + "s");
      mark.style.left = percent(tick);
      $("timeRuler").append(mark);
    }
  }

  function drawWork() {
    const projects = (Array.isArray(config.projects) ? config.projects : [])
      .filter(project => project && mediaSource(project.video));
    if (!projects.length) {
      gallery.hidden = true;
      $("workEmpty").hidden = false;
      return;
    }

    const titleAt = index => {
      const project = projects[index];
      return project.title || project.label || translate("workFallback", { number: index + 1 });
    };
    const updateTitle = () => {
      const title = titleAt(workSelect.selectedIndex);
      $("watchTitle").textContent = title;
      watchPlay.setAttribute("aria-label", translate("watchWork", { title }) || title);
      if (!workPlayer.hidden) showVideoTitle(title);
    };
    const showPoster = () => {
      const project = projects[workSelect.selectedIndex];
      const fallback = "assets/hero-fallback.svg";
      const source = mediaSource(project.poster) ? project.poster : fallback;
      for (const image of [$("workAmbient"), $("workPoster")]) image.src = source;
      updateTitle();
    };

    for (const image of [$("workAmbient"), $("workPoster")]) {
      image.addEventListener("error", () => {
        if (image.getAttribute("src") !== "assets/hero-fallback.svg") image.src = "assets/hero-fallback.svg";
      });
    }
    projects.forEach(() => workSelect.append(element("option")));
    localizeMedia.push(() => {
      [...workSelect.options].forEach((option, index) => { option.textContent = titleAt(index); });
      updateTitle();
    });
    workSelect.hidden = projects.length === 1;
    workSelect.addEventListener("change", showPoster);
    watchPlay.addEventListener("click", () => {
      const index = workSelect.selectedIndex;
      openWork(projects[index], titleAt(index));
    });
    showPoster();
  }

  function drawLinks() {
    const links = Array.isArray(config.socialLinks) ? config.socialLinks : [];
    links.forEach(item => {
      const url = externalUrl(item?.url);
      if (!url && item?.comingSoon) {
        const card = element("div", "social-link social-unavailable");
        card.append(element("strong", "social-label", item.title),
          localizedElement("span", "social-status", "socialComingSoon"));
        $("socialStack").append(card);
        return;
      }
      if (!url) return;
      const host = new URL(url).hostname.toLowerCase();
      const title = String(item.title || host);
      const titleKey = item.titleKey || (host === "t.me" ? "socialTelegram" : "");
      const link = externalLink("social-link", "", url);
      const label = element("strong", "social-label", title);
      if (titleKey) label.dataset.i18n = titleKey;
      link.append(label, decorative("span", "social-arrow", "↗"));
      $("socialStack").append(link);

      const footerTitle = host === "t.me" ? "Telegram" : title;
      const footer = externalLink("footer-link", footerTitle, url);
      if (item.footerKey) footer.dataset.i18n = item.footerKey;
      $("footerLinks").append(footer);

      if (host === "t.me") {
        $("aboutTelegram").href = url;
        $("aboutTelegram").hidden = false;
      }
    });
  }

  function percent(time) {
    return time / duration * 100 + "%";
  }

  function timecode(time) {
    const totalFrames = Math.floor(time * fps + 0.000001);
    const totalSeconds = Math.floor(totalFrames / fps);
    return [0, Math.floor(totalSeconds / 60), totalSeconds % 60, totalFrames % fps]
      .map((part, index) => index ? String(part).padStart(2, "0") : part).join(":");
  }

  function setHash(id, historyMode) {
    const hash = "#" + id;
    if (location.hash === hash) return;
    if (historyMode === "push") history.pushState(null, "", hash);
    else history.replaceState(null, "", hash);
  }

  function finishEntrance() {
    clearTimeout(enterTimer);
    if (!enteringSlide) return;
    enteringSlide.classList.remove("is-entering");
    enteringSlide.style.removeProperty("--slide-direction");
    enteringSlide = undefined;
  }

  function finishExit() {
    clearTimeout(leaveTimer);
    if (!leavingSlide) return;
    leavingSlide.hidden = true;
    if (leavingSlide.id === "stage-work") closeWork(false);
    leavingSlide.inert = false;
    leavingSlide.removeAttribute("aria-hidden");
    leavingSlide.classList.remove("is-leaving");
    leavingSlide.style.removeProperty("--slide-direction");
    leavingSlide.style.removeProperty("--swipe-x");
    leavingSlide = undefined;
  }

  function clearSwipe(preserveSlide) {
    clearTimeout(snapTimer);
    viewer.classList.remove("is-swiping", "is-snapping");
    if (swipe && swipe.slide !== preserveSlide) swipe.slide.style.removeProperty("--swipe-x");
    swipe = undefined;
  }

  function focusHeading(slide) {
    const heading = slide.querySelector("h2");
    const target = heading && !heading.closest("[hidden]") ? heading : slide;
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }

  function showRoute(route, historyMode, { animate = true, direction } = {}) {
    const useMotion = animate && !reducedMotion.matches;
    if (selectedRoute === route) {
      if (!useMotion) {
        finishEntrance();
        finishExit();
        clearSwipe();
      }
      setHash(route.id, historyMode);
      return;
    }

    const previousRoute = selectedRoute;
    const previous = previousRoute && $("stage-" + previousRoute.id);
    const current = $("stage-" + route.id);
    const transferFocus = previous?.contains(document.activeElement);
    const index = routes.indexOf(route);
    const travel = direction || (index > routes.indexOf(previousRoute) ? 1 : -1);
    finishEntrance();
    finishExit();
    clearSwipe(useMotion ? previous : undefined);

    if (selectedRoute?.id === "home") stopAudio();
    if (selectedRoute?.id === "work") {
      if (useMotion && !workPlayer.hidden) {
        videoRequest++;
        video.pause();
      } else {
        closeWork(false);
      }
    }
    selectedRoute = route;

    current.hidden = false;
    if (transferFocus) focusHeading(current);
    routes.forEach(item => {
      const slide = $("stage-" + item.id);
      slide.hidden = slide !== current && !(useMotion && slide === previous);
    });
    if (useMotion) {
      if (previous) {
        leavingSlide = previous;
        previous.inert = true;
        previous.setAttribute("aria-hidden", "true");
        previous.style.setProperty("--slide-direction", travel);
        previous.classList.add("is-leaving");
        leaveTimer = setTimeout(finishExit, 220);
      }
      enteringSlide = current;
      current.style.setProperty("--slide-direction", travel);
      current.classList.add("is-entering");
      enterTimer = setTimeout(finishEntrance, 1000);
    }
    document.querySelectorAll("[data-route]").forEach(control => {
      const active = control.dataset.route === route.id;
      if (control.closest(".slide")) return;
      control.classList.toggle("is-active", active);
      if (active) control.setAttribute("aria-current", "page");
      else control.removeAttribute("aria-current");
    });

    const chip = $("mobileSections").children[index];
    if (chip.offsetWidth) {
      $("mobileSections").scrollLeft = chip.offsetLeft - $("mobileSections").offsetLeft -
        ($("mobileSections").clientWidth - chip.offsetWidth) / 2;
    }
    $("mobileActive").style.setProperty("--route-color", route.color);
    const mobileRoute = $("mobileRoute");
    if (mobileRoute) setMessage(mobileRoute, route.id);

    $("compositionSource").textContent = route.source;
    setHash(route.id, historyMode);
  }

  function setTime(time, historyMode = "replace", motion) {
    seconds = Math.max(0, Math.min(duration, time));
    const label = timecode(seconds);
    $("timecode").value = label;
    $("viewerClock").textContent = label;
    timelineSeek.value = seconds;
    timelineSeek.setAttribute("aria-valuetext", label);
    trackColumn.style.setProperty("--playhead", percent(seconds));
    const route = routes.findLast(item => seconds >= item.start);
    showRoute(route, historyMode, motion);
  }

  function seek(time) {
    pausePreview();
    setTime(time, "replace", { animate: false });
  }

  function navigate(route, historyMode = "push", direction) {
    pausePreview();
    setTime(route.start, historyMode, { direction });
  }

  function step(direction) {
    const index = routes.indexOf(selectedRoute);
    navigate(routes[(index + direction + routes.length) % routes.length], "push", direction);
  }

  function updatePreview() {
    timelinePlay.firstElementChild.textContent = playing ? "❚❚" : "▶";
    const action = translate(playing ? "pauseTimeline" : "playTimeline");
    timelinePlay.setAttribute("aria-label", action);
    timelinePlay.setAttribute("aria-pressed", String(playing));
    const menuPreview = $("menuPreview");
    menuPreview.setAttribute("aria-pressed", String(playing));
    menuPreview.title = action;
    editor.classList.toggle("is-playing", playing);
    $("playState").textContent = translate(playing ? "playing" : "paused");
  }

  function pausePreview() {
    if (!playing) return;
    playing = false;
    cancelAnimationFrame(frame);
    updatePreview();
  }

  function advancePreview(now) {
    if (!playing) return;
    setTime(previewOffset + (now - previewStart) / 1000);
    if (seconds >= duration) pausePreview();
    else frame = requestAnimationFrame(advancePreview);
  }

  function togglePreview() {
    if (playing) {
      pausePreview();
      return;
    }
    stopAudio();
    if (selectedRoute.id === "work") closeWork(false);
    if (seconds >= duration) setTime(0);
    previewStart = performance.now();
    previewOffset = seconds;
    playing = true;
    updatePreview();
    frame = requestAnimationFrame(advancePreview);
  }

  function showAudioState() {
    const active = !audio.paused && !audio.ended;
    audioIcon.textContent = active ? "❚❚" : "▶";
    audioLabel.data = translate(active ? "pauseAudio" : "listen") || "";
    audioToggle.setAttribute("aria-pressed", String(active));
    $("stage-home").classList.toggle("is-playing-audio", active);
  }

  function showAudioPosition() {
    audioPosition.value = audio.currentTime;
    audioPosition.style.setProperty("--fill",
      Number.isFinite(audio.duration) && audio.duration > 0 ? (audio.currentTime / audio.duration * 100) + "%" : "0%");
  }

  function stopAudio() {
    audioRequest++;
    audio.pause();
    showAudioState();
  }

  function reportAudioError() {
    audioPosition.disabled = true;
    setMessage(audioMessage, "audioError");
    showAudioState();
  }

  function applyAudioTrack(tracks) {
    stopAudio();
    setMessage(audioMessage);
    audioPosition.disabled = true;
    audioPosition.value = "0";
    audioPosition.style.setProperty("--fill", "0%");
    audio.src = tracks[Number(audioTrack.value)].src;
    audio.load();
  }

  async function toggleAudio() {
    if (!audio.paused) {
      stopAudio();
      return;
    }
    pausePreview();
    const request = ++audioRequest;
    setMessage(audioMessage);
    if (audio.ended) audio.currentTime = 0;
    try {
      await audio.play();
    } catch (error) {
      if (request !== audioRequest) return;
      if (error.name === "NotAllowedError") setMessage(audioMessage, "audioBlocked");
      else reportAudioError();
    }
  }

  function setVolume(nextVolume, muted = false) {
    const value = Math.max(0, Math.min(1, nextVolume));
    audio.volume = video.volume = value;
    audio.muted = video.muted = muted;
    volume.value = value;
    volume.style.setProperty("--fill", (muted ? 0 : value * 100) + "%");
    updateMuteLabel();
  }

  function updateMuteLabel() {
    const silent = audio.muted || audio.volume === 0;
    const label = translate(silent ? "unmute" : "mute");
    for (const control of [mute, videoMute]) {
      control.setAttribute("aria-label", label);
      control.setAttribute("aria-pressed", String(silent));
    }
  }

  function toggleMute() {
    const silent = audio.muted || audio.volume === 0;
    setVolume(audio.volume || 0.8, !silent);
  }

  function configureAudio() {
    const configured = Array.isArray(config.audioTracks) ? config.audioTracks : [];
    const tracks = configured.filter(track => track && mediaSource(track.src));
    if (!tracks.length && mediaSource(config.audioPreview)) {
      tracks.push({ title: config.audioTitle, fallback: "audioPreview", src: config.audioPreview });
    }
    if (!tracks.length) {
      audioTrack.disabled = audioToggle.disabled = audioPosition.disabled = true;
      audioTrack.append(localizedElement("option", "", "noAudio"));
      return;
    }
    tracks.forEach((track, index) => {
      const option = element("option", "", track.title);
      option.value = index;
      if (!track.title) {
        localizeMedia.push(() => {
          option.textContent = translate(track.fallback || "trackFallback", { number: index + 1 });
        });
      }
      audioTrack.append(option);
    });

    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", () => {
      audioPosition.max = audio.duration;
      audioPosition.disabled = !Number.isFinite(audio.duration) || audio.duration <= 0;
      showAudioPosition();
    });
    ["play", "pause", "ended"].forEach(event => audio.addEventListener(event, showAudioState));
    audio.addEventListener("timeupdate", showAudioPosition);
    audio.addEventListener("error", reportAudioError);
    audioTrack.addEventListener("change", () => { applyAudioTrack(tracks); });
    audioToggle.addEventListener("click", toggleAudio);
    audioPosition.addEventListener("input", () => {
      audio.currentTime = Number(audioPosition.value);
      showAudioPosition();
    });
    applyAudioTrack(tracks);
  }

  function openWork(project, title) {
    pausePreview();
    stopAudio();
    showVideoTitle(title);
    video.poster = mediaSource(project.poster) ? project.poster : "";
    video.src = project.video;
    gallery.hidden = true;
    workPlayer.hidden = false;
    updateVideoPosition();
    $("backToWorks").focus({ preventScroll: true });
    playWork();
  }

  async function playWork() {
    const request = ++videoRequest;
    setMessage(videoMessage);
    try {
      if (video.ended) video.currentTime = 0;
      await video.play();
    } catch (error) {
      if (request !== videoRequest) return;
      setMessage(videoMessage, error.name === "NotAllowedError" ? "videoBlocked" : "videoPlayError");
    }
  }

  function toggleVideo() {
    if (video.paused || video.ended) playWork();
    else {
      videoRequest++;
      video.pause();
    }
  }

  function videoTimeLabel(time) {
    const whole = Math.floor(Number.isFinite(time) ? time : 0);
    return String(Math.floor(whole / 60)).padStart(2, "0") + ":" + String(whole % 60).padStart(2, "0");
  }

  function updateVideoPosition() {
    const total = video.duration;
    const elapsed = video.currentTime;
    const seekable = Number.isFinite(total) && total > 0;
    const position = seekable ? elapsed / total * 100 : 0;
    const current = videoTimeLabel(elapsed);
    const length = videoTimeLabel(total);
    videoSeek.disabled = !seekable;
    videoSeek.value = position;
    videoSeek.style.setProperty("--fill", position + "%");
    videoSeek.setAttribute("aria-valuetext", current + " / " + length);
    $("videoClock").textContent = current;
    $("videoDuration").textContent = length;
  }

  function updateVideoPlayback() {
    const active = !video.paused && !video.ended;
    videoToggle.querySelector("[data-video-play-icon]").hidden = active;
    videoToggle.querySelector("[data-video-pause-icon]").hidden = !active;
    videoToggle.setAttribute("aria-label", translate(active ? "videoPause" : "videoPlay"));
    videoToggle.setAttribute("aria-pressed", String(active));
  }

  function videoExpanded() {
    return document.fullscreenElement === workPlayer || workPlayer.classList.contains("is-expanded");
  }

  function updateVideoFullscreen() {
    const expanded = videoExpanded();
    videoFullscreen.setAttribute("aria-label", translate(expanded ? "videoExitFullscreen" : "videoFullscreen"));
    videoFullscreen.setAttribute("aria-pressed", String(expanded));
  }

  async function collapseVideo() {
    if (workPlayer.hasAttribute("popover")) {
      workPlayer.hidePopover?.();
      workPlayer.removeAttribute("popover");
    }
    workPlayer.classList.remove("is-expanded");
    if (document.fullscreenElement === workPlayer) {
      try { await document.exitFullscreen(); } catch {
        // The browser may already be closing fullscreen.
      }
    }
    updateVideoFullscreen();
  }

  async function toggleVideoFullscreen() {
    if (videoExpanded()) {
      await collapseVideo();
      return;
    }
    try {
      await workPlayer.requestFullscreen();
      if (workPlayer.hidden) await collapseVideo();
    } catch {
      if (!workPlayer.hidden) {
        workPlayer.classList.add("is-expanded");
        if (typeof workPlayer.showPopover === "function") {
          workPlayer.setAttribute("popover", "manual");
          workPlayer.showPopover();
          videoFullscreen.focus({ preventScroll: true });
        }
      }
    }
    updateVideoFullscreen();
  }

  function showVideoTitle(title) {
    $("videoTitle").textContent = title;
    video.setAttribute("aria-label", title);
  }

  function closeWork(restoreFocus) {
    if (workPlayer.hidden) return;
    videoRequest++;
    if (videoExpanded()) collapseVideo();
    video.pause();
    video.removeAttribute("src");
    video.load();
    workPlayer.hidden = true;
    gallery.hidden = false;
    updateVideoPosition();
    updateVideoPlayback();
    if (restoreFocus) watchPlay.focus();
  }

  function bindTimeline() {
    let dragPointer;
    const seekAtPointer = event => {
      const bounds = trackColumn.getBoundingClientRect();
      seek((event.clientX - bounds.left) / bounds.width * duration);
    };

    trackColumn.addEventListener("pointerdown", event => {
      if (event.button !== 0 || event.target.closest(".track-bar")) return;
      event.preventDefault();
      timelineSeek.focus({ preventScroll: true });
      dragPointer = event.pointerId;
      trackColumn.setPointerCapture(dragPointer);
      seekAtPointer(event);
    });
    trackColumn.addEventListener("pointermove", event => {
      if (event.pointerId === dragPointer) seekAtPointer(event);
    });
    trackColumn.addEventListener("lostpointercapture", () => { dragPointer = undefined; });
    timelineSeek.addEventListener("input", () => { seek(Number(timelineSeek.value)); });
  }

  function bindPreviewNavigation() {
    let wheelDistance = 0;
    let lastWheel = 0;
    let wheelLockedUntil = 0;
    $("viewArea").addEventListener("wheel", event => {
      if (!event.cancelable || event.ctrlKey || event.target.closest("video,select,input")) return;
      event.preventDefault();
      const now = performance.now();
      if (now < wheelLockedUntil) return;
      if (now - lastWheel > 180) wheelDistance = 0;
      lastWheel = now;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      wheelDistance += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 80 : 1);
      if (Math.abs(wheelDistance) >= 60) {
        step(Math.sign(wheelDistance));
        wheelDistance = 0;
        wheelLockedUntil = now + 280;
      }
    }, { passive: false });

    viewer.addEventListener("touchstart", event => {
      clearSwipe();
      if (event.touches.length !== 1 || event.target.closest("video,select,input,button,a")) return;
      const { clientX, clientY } = event.touches[0];
      swipe = {
        slide: $("stage-" + selectedRoute.id), x: clientX, y: clientY, width: viewer.clientWidth
      };
    }, { passive: true });
    viewer.addEventListener("touchmove", event => {
      if (!swipe || event.touches.length !== 1) return;
      const { clientX, clientY } = event.touches[0];
      const distance = clientX - swipe.x;
      const rise = Math.abs(clientY - swipe.y);
      if (!swipe.dragging) {
        if (rise >= 12 && rise > Math.abs(distance)) {
          clearSwipe();
          return;
        }
        if (Math.abs(distance) < 12 || Math.abs(distance) <= rise * 1.3) return;
        swipe.dragging = true;
      }
      if (!reducedMotion.matches) {
        const limit = swipe.width * 0.24;
        const offset = Math.max(-limit, Math.min(limit, distance * 0.65));
        swipe.slide.style.setProperty("--swipe-x", offset + "px");
        viewer.classList.add("is-swiping");
      }
    }, { passive: true });
    function endSwipe(event) {
      if (!swipe) return;
      const distance = (event.changedTouches[0]?.clientX ?? swipe.x) - swipe.x;
      if (event.type === "touchend" && swipe.dragging && Math.abs(distance) >= 45) {
        step(distance < 0 ? 1 : -1);
      } else if (viewer.classList.contains("is-swiping")) {
        viewer.classList.replace("is-swiping", "is-snapping");
        swipe.slide.style.removeProperty("--swipe-x");
        snapTimer = setTimeout(clearSwipe, 250);
      } else {
        clearSwipe();
      }
    }
    viewer.addEventListener("touchend", endSwipe, { passive: true });
    viewer.addEventListener("touchcancel", endSwipe, { passive: true });
  }

  function routeFromHash() {
    return routes.find(route => location.hash === "#" + route.id);
  }

  function handleKeys(event) {
    if (event.key === "Escape") {
      if (videoExpanded()) {
        collapseVideo();
      } else if (fileMenu.open) {
        fileMenu.open = false;
        fileMenu.querySelector("summary").focus();
      } else if (selectedRoute.id === "work" && !workPlayer.hidden) {
        closeWork(true);
      }
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (!workPlayer.hidden && workPlayer.contains(event.target) && !event.target.closest("input,select,textarea")) {
      if (event.code === "Space" && !event.target.closest("button,a") && !event.repeat) {
        event.preventDefault();
        toggleVideo();
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        if (Number.isFinite(video.duration)) {
          const delta = event.key === "ArrowLeft" ? -5 : 5;
          video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + delta));
          updateVideoPosition();
        }
        return;
      }
    }
    if (event.target.closest("input,select,textarea,video,[contenteditable]")) return;

    if (event.code === "Space" && !event.target.closest("button,a,summary")) {
      event.preventDefault();
      if (!event.repeat) togglePreview();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      if (event.shiftKey) step(direction);
      else seek(seconds + direction / fps);
    } else if (/^[1-4]$/.test(event.key) && !event.repeat) {
      navigate(routes[Number(event.key) - 1]);
    }
  }

  applyContent();
  drawRoutes();
  drawWork();
  drawLinks();
  configureAudio();
  setVolume(Number(volume.value));
  applyLanguage();
  setTime((routeFromHash() || routes[0]).start);
  bindTimeline();
  bindPreviewNavigation();

  languageSwitch?.addEventListener("click", event => {
    const nextLanguage = event.target.closest("[data-language]")?.dataset.language;
    if (!Object.hasOwn(locales, nextLanguage) || nextLanguage === language) return;
    language = nextLanguage;
    try {
      localStorage.setItem(languageStorageKey, language);
    } catch {
      // The current tab keeps the selected language without storage.
    }
    applyLanguage();
  });

  document.addEventListener("click", event => {
    const control = event.target.closest("[data-route]");
    if (control) {
      event.preventDefault();
      const route = routes.find(item => item.id === control.dataset.route);
      navigate(route);
      if (control.closest(".slide")) focusHeading($("stage-" + route.id));
      if (fileMenu.open) fileMenu.querySelector("summary").focus();
      fileMenu.open = false;
      return;
    }
    const stepControl = event.target.closest("[data-step]");
    if (stepControl) step(Number(stepControl.dataset.step));
    if (!fileMenu.contains(event.target)) fileMenu.open = false;
  });

  document.addEventListener("keydown", handleKeys);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    finishEntrance();
    finishExit();
    clearSwipe();
    pausePreview();
    stopAudio();
    video.pause();
  });
  window.addEventListener("hashchange", () => {
    navigate(routeFromHash() || routes[0], "replace");
  });
  reducedMotion.addEventListener("change", () => {
    finishEntrance();
    finishExit();
    clearSwipe();
  });

  $("toggleGuides").addEventListener("click", event => {
    const guide = $("safeGuide");
    guide.hidden = !guide.hidden;
    event.currentTarget.setAttribute("aria-pressed", String(!guide.hidden));
  });
  timelinePlay.addEventListener("click", togglePreview);
  $("menuPreview").addEventListener("click", togglePreview);
  $("backToWorks").addEventListener("click", () => { closeWork(true); });
  videoToggle.addEventListener("click", toggleVideo);
  video.addEventListener("click", toggleVideo);
  videoSeek.addEventListener("input", () => {
    if (!Number.isFinite(video.duration)) return;
    video.currentTime = Number(videoSeek.value) / 100 * video.duration;
    updateVideoPosition();
  });
  videoMute.addEventListener("click", toggleMute);
  videoFullscreen.addEventListener("click", toggleVideoFullscreen);
  document.addEventListener("fullscreenchange", updateVideoFullscreen);
  for (const event of ["loadedmetadata", "durationchange", "timeupdate", "seeked", "emptied"]) {
    video.addEventListener(event, updateVideoPosition);
  }
  for (const event of ["play", "pause", "ended", "emptied"]) {
    video.addEventListener(event, updateVideoPlayback);
  }
  video.addEventListener("error", () => {
    if (selectedRoute.id === "work" && !workPlayer.hidden) setMessage(videoMessage, "videoLoadError");
  });
  volume.addEventListener("input", () => { setVolume(Number(volume.value)); });
  mute.addEventListener("click", toggleMute);
})();
