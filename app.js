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
  let activeCard;

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
    const projects = Array.isArray(config.projects) ? config.projects : [];
    projects.filter(project => project && mediaSource(project.video)).forEach((project, index) => {
      const card = button("work-card");
      const title = element("span", "work-title");
      const image = element("img");
      image.src = "assets/hero-fallback.svg";
      image.alt = "";
      image.loading = "lazy";
      loadImage(image, project.poster, "assets/hero-fallback.svg");
      card.append(image, decorative("span", "work-play", "▶"), title);
      card.addEventListener("click", () => { openWork(project, title.textContent, card); });
      localizeMedia.push(() => {
        const name = project.title || project.label || translate("workFallback", { number: index + 1 });
        title.textContent = name;
        card.setAttribute("aria-label", translate("watchWork", { title: name }) || name);
        if (activeCard === card) showVideoTitle(name);
      });
      $("workGrid").append(card);
    });
    if (!$("workGrid").children.length) {
      $("workGrid").append(localizedElement("p", "media-message", "noWorks"));
    }
  }

  function drawLinks() {
    const links = Array.isArray(config.socialLinks) ? config.socialLinks : [];
    const tones = ["#e58e51", "#e2bb5e", "#78a2e7", "#78bfa3"];
    let count = 0;
    links.forEach(item => {
      const url = externalUrl(item?.url);
      if (!url) return;
      const host = new URL(url).hostname.toLowerCase();
      const title = String(item.title || host);
      const titleKey = item.titleKey || {
        "t.me": "socialTelegram", "github.com": "socialGithub", "null-object-ae.onrender.com": "socialSite"
      }[host];
      const link = externalLink("social-link", "", url);
      link.style.setProperty("--link-color", tones[count % tones.length]);
      const label = element("strong", "social-label", title);
      if (titleKey) label.dataset.i18n = titleKey;
      link.append(label, decorative("span", "social-arrow", "↗"));
      $("socialStack").append(link);

      const footerTitle = { "t.me": "Telegram", "github.com": "GitHub" }[host] || title;
      const footerKey = item.footerKey || (host === "null-object-ae.onrender.com" ? "footerSite" : "");
      const footer = externalLink("footer-link", footerTitle, url);
      if (footerKey) footer.dataset.i18n = footerKey;
      $("footerLinks").append(footer);

      if (host === "t.me") {
        $("aboutTelegram").href = url;
        $("aboutTelegram").hidden = false;
      }
      count++;
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

  function showRoute(route, historyMode) {
    if (selectedRoute === route) {
      setHash(route.id, historyMode);
      return;
    }

    if (selectedRoute?.id === "home") stopAudio();
    if (selectedRoute?.id === "work") closeWork(false);
    selectedRoute = route;

    routes.forEach(item => {
      $("stage-" + item.id).hidden = item !== route;
    });
    document.querySelectorAll("[data-route]").forEach(control => {
      const active = control.dataset.route === route.id;
      if (control.closest(".slide")) return;
      control.classList.toggle("is-active", active);
      if (active) control.setAttribute("aria-current", "page");
      else control.removeAttribute("aria-current");
    });

    const index = routes.indexOf(route);
    const chip = $("mobileSections").children[index];
    if (chip.offsetWidth) {
      $("mobileSections").scrollLeft = chip.offsetLeft - $("mobileSections").offsetLeft -
        ($("mobileSections").clientWidth - chip.offsetWidth) / 2;
    }
    $("mobileActive").style.setProperty("--route-color", route.color);

    $("compositionSource").textContent = route.source;
    setHash(route.id, historyMode);
  }

  function setTime(time, historyMode = "replace") {
    seconds = Math.max(0, Math.min(duration, time));
    const label = timecode(seconds);
    $("timecode").value = label;
    $("viewerClock").textContent = label;
    timelineSeek.value = seconds;
    timelineSeek.setAttribute("aria-valuetext", label);
    trackColumn.style.setProperty("--playhead", percent(seconds));
    const route = routes.findLast(item => seconds >= item.start);
    showRoute(route, historyMode);
  }

  function seek(time) {
    pausePreview();
    setTime(time);
  }

  function navigate(route, historyMode = "push") {
    pausePreview();
    setTime(route.start, historyMode);
  }

  function step(direction) {
    const index = routes.indexOf(selectedRoute);
    navigate(routes[(index + direction + routes.length) % routes.length]);
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
    closeWork(false);
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
    closeWork(false);
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
    mute.setAttribute("aria-label", translate(silent ? "unmute" : "mute"));
    mute.setAttribute("aria-pressed", String(silent));
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

  async function openWork(project, title, card) {
    pausePreview();
    stopAudio();
    activeCard = card;
    const request = ++videoRequest;
    showVideoTitle(title);
    setMessage(videoMessage);
    video.poster = mediaSource(project.poster) ? project.poster : "";
    video.src = project.video;
    gallery.hidden = true;
    workPlayer.hidden = false;
    $("backToWorks").focus();
    try {
      await video.play();
    } catch (error) {
      if (request !== videoRequest) return;
      setMessage(videoMessage, error.name === "NotAllowedError" ? "videoBlocked" : "videoPlayError");
    }
  }

  function showVideoTitle(title) {
    $("videoTitle").textContent = title;
    video.setAttribute("aria-label", title);
  }

  function closeWork(restoreFocus) {
    if (workPlayer.hidden) return;
    videoRequest++;
    video.pause();
    video.removeAttribute("src");
    video.load();
    workPlayer.hidden = true;
    gallery.hidden = false;
    if (restoreFocus) activeCard?.focus();
    activeCard = null;
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

    let touchStart;
    viewer.addEventListener("touchstart", event => {
      if (event.touches.length !== 1 || event.target.closest("video,select,input,button,a")) return;
      const { clientX, clientY } = event.touches[0];
      touchStart = { x: clientX, y: clientY };
    }, { passive: true });
    viewer.addEventListener("touchend", event => {
      if (!touchStart) return;
      const { clientX, clientY } = event.changedTouches[0];
      const deltaX = clientX - touchStart.x;
      const deltaY = clientY - touchStart.y;
      if (Math.abs(deltaX) >= 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
        step(deltaX < 0 ? 1 : -1);
      }
      touchStart = undefined;
    }, { passive: true });
    viewer.addEventListener("touchcancel", () => { touchStart = undefined; }, { passive: true });
  }

  function routeFromHash() {
    return routes.find(route => location.hash === "#" + route.id);
  }

  function handleKeys(event) {
    if (event.key === "Escape") {
      if (fileMenu.open) {
        fileMenu.open = false;
        fileMenu.querySelector("summary").focus();
      } else if (!workPlayer.hidden) {
        closeWork(true);
      }
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey ||
      event.target.closest("input,select,textarea,video,[contenteditable]")) return;

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
      if (control.closest(".slide")) {
        const heading = $("stage-" + route.id).querySelector("h2");
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
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
    pausePreview();
    stopAudio();
    video.pause();
  });
  window.addEventListener("hashchange", () => {
    navigate(routeFromHash() || routes[0], "replace");
  });

  $("toggleGuides").addEventListener("click", event => {
    const guide = $("safeGuide");
    guide.hidden = !guide.hidden;
    event.currentTarget.setAttribute("aria-pressed", String(!guide.hidden));
  });
  timelinePlay.addEventListener("click", togglePreview);
  $("menuPreview").addEventListener("click", togglePreview);
  $("backToWorks").addEventListener("click", () => { closeWork(true); });
  video.addEventListener("error", () => {
    if (!workPlayer.hidden) setMessage(videoMessage, "videoLoadError");
  });
  volume.addEventListener("input", () => { setVolume(Number(volume.value)); });
  mute.addEventListener("click", () => {
    const muted = audio.muted || audio.volume === 0;
    setVolume(audio.volume || 0.8, !muted);
  });
})();
