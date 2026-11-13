(() => {
  "use strict";

  const config = window.PORTFOLIO || {};
  const duration = 35;
  const fps = 24;
  const routes = [
    { id: "home", label: "Главная", source: "creative_tape.mp3", type: "Audio", start: 0, color: "#e66c4b" },
    { id: "about", label: "О проекте", source: "null_object.aep", type: "Comp", start: 9, color: "#d5ab55" },
    { id: "work", label: "Эдиты", source: "showreel.mp4", type: "Footage", start: 18, color: "#5980d4" },
    { id: "links", label: "Ссылки", source: "social_links", type: "Links", start: 27, color: "#62a78d" }
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
  const audioTrack = $("audioTrack");
  const audioPosition = $("audioPosition");
  const audioMessage = $("audioMessage");
  const video = $("workVideo");
  const videoMessage = $("videoMessage");
  const gallery = $("workGallery");
  const workPlayer = $("workPlayer");

  let selectedRoute;
  let seconds = 0;
  let playing = false;
  let frame = 0;
  let previewStart = 0;
  let previewOffset = 0;
  let audioRequest = 0;
  let videoRequest = 0;
  let activeCard;

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
    const brand = String(config.brand || "Null Object").trim();
    const words = brand.split(/\s+/);
    document.title = brand + " — Creative Archive";
    document.querySelectorAll("[data-brand]").forEach(node => { node.textContent = brand; });
    const title = document.querySelector(".home-copy .display-title");
    title.replaceChildren();
    words.forEach((word, index) => {
      if (index) title.append(" ");
      title.append(element("span", "", word));
    });

    const tagline = document.querySelector(".home-copy .slide-label");
    if (config.kicker) tagline.textContent = config.kicker;
    if (config.aboutText) $("aboutText").textContent = config.aboutText;
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
      project.append(decorative("span", "layer-swatch"), element("span", "project-label", route.label),
        element("small", "project-type", route.type));

      const layer = button("layer-item");
      const switches = decorative("span", "layer-switches");
      switches.append(element("i"), element("i"));
      layer.append(eyeIcon(), decorative("span", "layer-swatch"), decorative("span", "layer-number", index + 1),
        element("span", "layer-name", route.source), switches);
      layer.title = route.source;

      const track = button("track-item");
      track.setAttribute("aria-label", route.label);
      track.title = route.source;
      track.style.setProperty("--start", percent(route.start));
      track.style.setProperty("--length", percent(length));
      track.append(decorative("span", "track-bar"));

      const chip = button("mobile-chip");
      chip.append(decorative("span", "layer-swatch"), element("span", "", route.label));
      const segment = element("span", "mobile-segment");
      segment.style.setProperty("--route-color", route.color);
      segment.style.setProperty("--length", percent(length));
      segment.style.flexBasis = percent(length);
      $("mobileSegments").append(segment);

      const menuLink = element("a", "file-link", route.label);
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
      const title = project.title || project.label || "Эдит " + (index + 1);
      const card = button("work-card");
      card.setAttribute("aria-label", "Смотреть " + title);
      const image = element("img");
      image.src = "assets/hero-fallback.svg";
      image.alt = "";
      image.loading = "lazy";
      loadImage(image, project.poster, "assets/hero-fallback.svg");
      card.append(image, decorative("span", "work-play", "▶"), element("span", "work-title", title));
      card.addEventListener("click", () => { openWork(project, title, card); });
      $("workGrid").append(card);
    });
    if (!$("workGrid").children.length) {
      $("workGrid").append(element("p", "media-message", "Пока нет доступных видео."));
    }
  }

  function drawLinks() {
    const links = Array.isArray(config.socialLinks) ? config.socialLinks : [];
    const tones = ["#e58e51", "#e2bb5e", "#78a2e7", "#78bfa3"];
    let count = 0;
    links.forEach(item => {
      const url = externalUrl(item?.url);
      if (!url) return;
      const title = String(item.title || new URL(url).hostname);
      const link = externalLink("social-link", "", url);
      link.style.setProperty("--link-color", tones[count % tones.length]);
      link.append(element("strong", "social-label", title), decorative("span", "social-arrow", "↗"));
      $("socialStack").append(link);

      const host = new URL(url).hostname.toLowerCase();
      const footerTitle = {
        "t.me": "Telegram", "github.com": "GitHub", "null-object-ae.onrender.com": "Сайт"
      }[host] || title;
      $("footerLinks").append(externalLink("footer-link", footerTitle, url));

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
    timelinePlay.setAttribute("aria-label", playing ? "Приостановить таймлайн" : "Воспроизвести таймлайн");
    timelinePlay.setAttribute("aria-pressed", String(playing));
    $("menuPreview").setAttribute("aria-pressed", String(playing));
    editor.classList.toggle("is-playing", playing);
    $("playState").textContent = playing ? "Playing" : "Paused";
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
    audioToggle.replaceChildren(decorative("span", "", active ? "❚❚" : "▶"),
      document.createTextNode(active ? " Пауза" : " Слушать"));
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
    audioMessage.textContent = "Не удалось загрузить аудио. Попробуй выбрать другой трек.";
    showAudioState();
  }

  function applyAudioTrack(tracks) {
    stopAudio();
    audioMessage.textContent = "";
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
    audioMessage.textContent = "";
    if (audio.ended) audio.currentTime = 0;
    try {
      await audio.play();
    } catch (error) {
      if (request !== audioRequest) return;
      if (error.name === "NotAllowedError") audioMessage.textContent = "Нажми «Слушать» ещё раз.";
      else reportAudioError();
    }
  }

  function setVolume(nextVolume, muted = false) {
    const value = Math.max(0, Math.min(1, nextVolume));
    audio.volume = video.volume = value;
    audio.muted = video.muted = muted;
    volume.value = value;
    volume.style.setProperty("--fill", (muted ? 0 : value * 100) + "%");
    const silent = muted || value === 0;
    mute.setAttribute("aria-label", silent ? "Включить звук" : "Выключить звук");
    mute.setAttribute("aria-pressed", String(silent));
  }

  function configureAudio() {
    const configured = Array.isArray(config.audioTracks) ? config.audioTracks : [];
    const tracks = configured.filter(track => track && mediaSource(track.src));
    if (!tracks.length && mediaSource(config.audioPreview)) {
      tracks.push({ title: config.audioTitle || "Аудиопревью", src: config.audioPreview });
    }
    if (!tracks.length) {
      audioTrack.disabled = audioToggle.disabled = audioPosition.disabled = true;
      audioTrack.append(element("option", "", "Нет аудио"));
      return;
    }
    tracks.forEach((track, index) => {
      const option = element("option", "", track.title || "Трек " + (index + 1));
      option.value = index;
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
    $("videoTitle").textContent = title;
    video.setAttribute("aria-label", title);
    videoMessage.textContent = "";
    video.poster = mediaSource(project.poster) ? project.poster : "";
    video.src = project.video;
    gallery.hidden = true;
    workPlayer.hidden = false;
    $("backToWorks").focus();
    try {
      await video.play();
    } catch (error) {
      if (request !== videoRequest) return;
      videoMessage.textContent = error.name === "NotAllowedError" ?
        "Нажми кнопку воспроизведения в плеере." : "Не удалось воспроизвести видео.";
    }
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
    $("viewArea").addEventListener("wheel", event => {
      if (!event.cancelable || event.ctrlKey || event.target.closest("video,select,input")) return;
      event.preventDefault();
      const now = performance.now();
      if (now - lastWheel > 180) wheelDistance = 0;
      lastWheel = now;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      wheelDistance += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 80 : 1);
      if (Math.abs(wheelDistance) >= 60) {
        step(Math.sign(wheelDistance));
        wheelDistance = 0;
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
  setTime((routeFromHash() || routes[0]).start);
  bindTimeline();
  bindPreviewNavigation();

  document.addEventListener("click", event => {
    const control = event.target.closest("[data-route]");
    if (control) {
      event.preventDefault();
      navigate(routes.find(route => route.id === control.dataset.route));
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
    if (!workPlayer.hidden) videoMessage.textContent = "Не удалось загрузить видео.";
  });
  volume.addEventListener("input", () => { setVolume(Number(volume.value)); });
  mute.addEventListener("click", () => {
    const muted = audio.muted || audio.volume === 0;
    setVolume(audio.volume || 0.8, !muted);
  });
})();
