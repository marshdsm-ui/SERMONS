(function() {
	//#region \0rolldown/runtime.js
	var __defProp$1 = Object.defineProperty;
	var __esmMin = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
	var __exportAll = (all, no_symbols) => {
		let target = {};
		for (var name in all) __defProp$1(target, name, {
			get: all[name],
			enumerable: true
		});
		if (!no_symbols) __defProp$1(target, Symbol.toStringTag, { value: "Module" });
		return target;
	};
	//#endregion
	//#region js/tweaks.js
	function revealTweaks(deck) {
		const isThumbnail = window.location.href.includes("backgroundTransition=none");
		const isFollower = !!new URLSearchParams(window.location.search).get("remoteMultiplexId");
		const readyTweaks = () => {
			applyStackAttributes(deck);
			updateAttributionFromCurrentSlide(deck);
			updateHiddenPreviewOverlay(deck);
			ensureLinksOpenExternally(deck);
			updateFixedOverlayVisibility(deck);
			ensureMagicSlideStyles();
			addMagicSlideIndicators(deck);
		};
		deck.on("ready", readyTweaks);
		deck.on("slidechanged", () => {
			updateAttributionFromCurrentSlide(deck);
			updateHiddenPreviewOverlay(deck);
			ensureLinksOpenExternally(deck);
			updateFixedOverlayVisibility(deck);
		});
		deck.on("overviewshown", () => {
			updateFixedOverlayVisibility(deck);
			if ((deck.getConfig?.() || {}).transition === "fade") {
				const slides = deck.getRevealElement?.()?.querySelectorAll?.(".slides section");
				if (slides?.length) {
					slides.forEach((s) => {
						s.style.transition = "none";
					});
					requestAnimationFrame(() => requestAnimationFrame(() => {
						slides.forEach((s) => {
							s.style.transition = "";
						});
					}));
				}
			}
			updateAttributionFromCurrentSlide(deck);
			updateHiddenPreviewOverlay(deck);
			updateFixedOverlayVisibility(deck);
		});
		deck.on("pdf-ready", () => {
			enforcePdfPageBackground();
			fixFitMediaPdfLayout(deck);
			window.setTimeout(() => {
				enforcePdfPageBackground();
				fixFitMediaPdfLayout(deck);
			}, 80);
		});
		if (!isThumbnail) {
			initBackgroundAudio(deck);
			initCountdowns(deck);
			if (!isFollower) initFitVideoControls(deck);
			const params = new URLSearchParams(window.location.search);
			if (params.get("variant") === "confidencemonitor" || params.get("variant") === "notes" || params.get("builderPreview") === "1") initConfidenceMonitorVideoTimer(deck);
			deck.on("slidechanged", (e) => {
				e.currentSlide.querySelectorAll("video[data-imagefit], video[data-imagefit-fill]").forEach((v) => {
					v.currentTime = 0;
					v.play().catch(() => {});
				});
			});
			deck.on("ready", (e) => {
				e.currentSlide.querySelectorAll("video[data-imagefit], video[data-imagefit-fill]").forEach((v) => {
					v.play().catch(() => {});
				});
			});
		}
		scrubBackgroundVideos(isThumbnail);
		enforcePdfPageBackground();
		fixFitMediaPdfLayout(deck);
		hideControlsOnSpeakerNotes();
		doubleClickFullScreen();
		hideCursorOnIdle();
	}
	function fixFitMediaPdfLayout(deck) {
		if (!/(?:\?|&)print-pdf(?:&|$)/i.test(window.location.search)) return;
		const config = deck?.getConfig?.() || {};
		const baseWidth = Number(config.width) || 1920;
		const baseHeight = Number(config.height) || 1080;
		if (!baseWidth || !baseHeight) return;
		const targetAspect = baseHeight / baseWidth;
		const margin = Number.isFinite(Number(config.margin)) ? Number(config.margin) : .04;
		const pageHeightOffset = Number.isFinite(Number(config.pdfPageHeightOffset)) ? Number(config.pdfPageHeightOffset) : -1;
		document.querySelectorAll(".reveal .slides .pdf-page > section").forEach((slide) => {
			if (!slide.querySelector("[data-imagefit], [data-imagefit-fill]")) return;
			const page = slide.closest(".pdf-page");
			if (!page) return;
			const slideRect = slide.getBoundingClientRect();
			const pageRect = page.getBoundingClientRect();
			const slideWidth = slideRect.width || Number.parseFloat(slide.style.width) || 0;
			if (!slideWidth) return;
			const singlePageHeight = slideWidth * targetAspect * (1 + margin) + pageHeightOffset;
			if (singlePageHeight > 0) page.style.height = `${singlePageHeight}px`;
			const finalPageHeight = singlePageHeight > 0 ? singlePageHeight : pageRect.height;
			const targetHeight = Math.min(slideWidth * targetAspect, finalPageHeight);
			const top = Math.max((finalPageHeight - targetHeight) / 2, 0);
			slide.style.top = `${top}px`;
			slide.style.height = `${targetHeight}px`;
			slide.style.minHeight = `${targetHeight}px`;
			slide.style.maxHeight = `${targetHeight}px`;
			slide.style.overflow = "hidden";
		});
	}
	function enforcePdfPageBackground() {
		if (!/(?:\?|&)print-pdf(?:&|$)/i.test(window.location.search)) return;
		const rootStyles = window.getComputedStyle(document.documentElement);
		const themeBackground = String(rootStyles.getPropertyValue("--r-background-color") || "").trim();
		if (!themeBackground) return;
		document.querySelectorAll(".reveal .slides .pdf-page").forEach((page) => {
			page.style.backgroundColor = themeBackground;
		});
	}
	function initFitVideoControls(deck) {
		const wireSlideFitVideos = (slide) => {
			if (!slide) return;
			slide.querySelectorAll("video[data-imagefit], video[data-imagefit-fill]").forEach((video) => {
				if (video.dataset.fitVideoControlsWired === "1") return;
				video.dataset.fitVideoControlsWired = "1";
				let isUserInitiatedPause = false;
				const syncControlsToState = () => {
					video.controls = !!(isUserInitiatedPause && video.paused);
				};
				video.addEventListener("click", () => {
					if (video.controls) return;
					if (video.paused || video.ended) {
						isUserInitiatedPause = true;
						syncControlsToState();
						return;
					}
					isUserInitiatedPause = true;
					video.pause();
				});
				video.addEventListener("play", () => {
					isUserInitiatedPause = false;
					syncControlsToState();
				});
				video.addEventListener("pause", () => {
					syncControlsToState();
				});
				video.addEventListener("ended", () => {
					isUserInitiatedPause = false;
					syncControlsToState();
				});
				syncControlsToState();
			});
		};
		deck.on("ready", (e) => {
			wireSlideFitVideos(e.currentSlide);
		});
		deck.on("slidechanged", (e) => {
			wireSlideFitVideos(e.currentSlide);
		});
	}
	function initConfidenceMonitorVideoTimer(deck) {
		const ensureOverlay = () => {
			let overlay = document.getElementById("video-timer-overlay");
			if (overlay) return overlay;
			overlay = document.createElement("div");
			overlay.id = "video-timer-overlay";
			const remainingBar = document.createElement("div");
			remainingBar.className = "video-timer-remaining";
			const playedBar = document.createElement("div");
			playedBar.className = "video-timer-played";
			const timeLabel = document.createElement("div");
			timeLabel.className = "video-timer-label";
			timeLabel.textContent = "00:00";
			overlay.appendChild(remainingBar);
			overlay.appendChild(playedBar);
			overlay.appendChild(timeLabel);
			document.body.appendChild(overlay);
			return overlay;
		};
		const overlay = ensureOverlay();
		let updateInterval = null;
		let currentVideo = null;
		const audioEl = document.getElementById("background-audio-player");
		const formatTime = (seconds) => {
			const minutes = Math.floor(seconds / 60);
			const secs = Math.floor(seconds % 60);
			return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
		};
		const updateOverlayPosition = () => {
			const speakerNoteHeading = document.querySelector(".speaker-note-heading");
			if (speakerNoteHeading) if (getComputedStyle(speakerNoteHeading).display !== "none") {
				const height = speakerNoteHeading.offsetHeight;
				overlay.style.bottom = `${height}px`;
			} else overlay.style.bottom = "0";
		};
		const updateTimer = () => {
			const overlayEl = document.getElementById("video-timer-overlay") || overlay;
			const isVideoPlaying = currentVideo && !currentVideo.paused && !currentVideo.ended;
			const isAudioPlaying = audioEl && !audioEl.paused && !audioEl.ended && audioEl.duration > 0;
			if (isVideoPlaying) {
				const duration = currentVideo.duration;
				const currentTime = currentVideo.currentTime;
				const remaining = Math.max(0, duration - currentTime);
				const timeLabel = overlayEl.querySelector(".video-timer-label");
				const playedBar = overlayEl.querySelector(".video-timer-played");
				if (timeLabel) timeLabel.textContent = formatTime(remaining);
				if (playedBar) {
					const percentPlayed = duration > 0 ? currentTime / duration * 100 : 0;
					playedBar.style.width = `${percentPlayed}%`;
				}
				overlayEl.style.display = "block";
				updateOverlayPosition();
			} else if (isAudioPlaying) {
				const duration = audioEl.duration;
				const currentTime = audioEl.currentTime;
				const remaining = Math.max(0, duration - currentTime);
				const timeLabel = overlayEl.querySelector(".video-timer-label");
				const playedBar = overlayEl.querySelector(".video-timer-played");
				if (timeLabel) timeLabel.textContent = `(audio) ${formatTime(remaining)}`;
				if (playedBar) {
					const percentPlayed = duration > 0 ? currentTime / duration * 100 : 0;
					playedBar.style.width = `${percentPlayed}%`;
				}
				overlayEl.style.display = "block";
				updateOverlayPosition();
			} else {
				overlayEl.style.display = "none";
				if (updateInterval) {
					clearInterval(updateInterval);
					updateInterval = null;
				}
			}
		};
		const startInterval = () => {
			if (!updateInterval) {
				updateTimer();
				updateInterval = setInterval(updateTimer, 100);
			}
		};
		const wireVideoTimer = (video) => {
			if (video.dataset.timerWired === "1") return;
			video.dataset.timerWired = "1";
			const onPlay = () => {
				currentVideo = video;
				startInterval();
			};
			const onPause = () => {
				if (currentVideo === video) currentVideo = null;
				updateTimer();
			};
			const onEnded = () => {
				if (currentVideo === video) currentVideo = null;
				updateTimer();
			};
			video.addEventListener("play", onPlay);
			video.addEventListener("pause", onPause);
			video.addEventListener("ended", onEnded);
		};
		const wireSlideVideos = (slide) => {
			if (!slide) return;
			slide.querySelectorAll("video[data-imagefit], video[data-imagefit-fill]").forEach(wireVideoTimer);
		};
		if (audioEl) {
			const onAudioPlay = () => {
				startInterval();
			};
			const onAudioPause = () => {
				updateTimer();
			};
			const onAudioEnded = () => {
				updateTimer();
			};
			audioEl.addEventListener("play", onAudioPlay);
			audioEl.addEventListener("pause", onAudioPause);
			audioEl.addEventListener("ended", onAudioEnded);
		}
		deck.on("ready", (e) => {
			ensureOverlay();
			wireSlideVideos(e.currentSlide);
			updateTimer();
		});
		deck.on("slidechanged", (e) => {
			currentVideo = null;
			ensureOverlay();
			wireSlideVideos(e.currentSlide);
			updateTimer();
		});
	}
	function ensureLinksOpenExternally(deck) {
		(deck?.getRevealElement?.() || document).querySelectorAll("a[href]").forEach((link) => {
			const href = link.getAttribute("href");
			if (!href || href.trim().startsWith("#")) return;
			const trimmed = href.trim();
			let shouldOpenExternally = false;
			if (/^(mailto:|tel:)/i.test(trimmed)) shouldOpenExternally = true;
			else try {
				const resolved = new URL(trimmed, window.location.href);
				shouldOpenExternally = (resolved.protocol === "http:" || resolved.protocol === "https:") && resolved.host !== window.location.host;
			} catch {
				shouldOpenExternally = false;
			}
			if (shouldOpenExternally) {
				link.setAttribute("target", "_blank");
				const rel = link.getAttribute("rel") || "";
				const relParts = new Set(rel.split(/\s+/).filter(Boolean));
				relParts.add("noopener");
				relParts.add("noreferrer");
				link.setAttribute("rel", Array.from(relParts).join(" "));
				return;
			}
			if (String(link.getAttribute("target") || "").toLowerCase() === "_blank") link.removeAttribute("target");
			const rel = link.getAttribute("rel") || "";
			if (rel) {
				const relParts = rel.split(/\s+/).filter(Boolean).filter((part) => {
					const lower = part.toLowerCase();
					return lower !== "noopener" && lower !== "noreferrer";
				});
				if (relParts.length) link.setAttribute("rel", relParts.join(" "));
				else link.removeAttribute("rel");
			}
		});
	}
	function applyStackAttributes(deck) {
		const revealElement = deck?.getRevealElement?.();
		if (!revealElement) return;
		const stacks = revealElement.querySelectorAll(".slides > section.stack");
		const attributeRegex = /([^"= ]+?)="([^"]+?)"|(data-[^"= ]+?)(?=[" ]|$)/g;
		stacks.forEach((stack) => {
			const firstVerticalSlide = Array.from(stack.children).find((child) => child.tagName === "SECTION");
			if (!firstVerticalSlide) return;
			firstVerticalSlide.querySelectorAll(".revelation-stack-attrs[data-stack-attrs]").forEach((marker) => {
				const encoded = marker.getAttribute("data-stack-attrs") || "";
				let attributeString = encoded;
				try {
					attributeString = decodeURIComponent(encoded);
				} catch {}
				attributeRegex.lastIndex = 0;
				let match;
				while ((match = attributeRegex.exec(attributeString)) !== null) if (match[2]) stack.setAttribute(match[1], match[2]);
				else if (match[3]) stack.setAttribute(match[3], "");
				marker.remove();
			});
		});
	}
	function initBackgroundAudio(deck) {
		const audioEl = document.getElementById("background-audio-player");
		if (!audioEl) return;
		let lastCommand = null;
		const normalizeSrc = (src) => {
			try {
				return new URL(src, window.location.href).href;
			} catch {
				return src;
			}
		};
		const stopAudio = () => {
			audioEl.pause();
			audioEl.currentTime = 0;
			audioEl.removeAttribute("src");
			audioEl.load();
			lastCommand = "stop";
		};
		const startAudio = (src, loop) => {
			const normalized = normalizeSrc(src);
			const current = audioEl.src ? normalizeSrc(audioEl.src) : "";
			const commandKey = `play:${normalized}:${loop ? "loop" : "once"}`;
			if (lastCommand === commandKey) return;
			const isSameSrc = current && normalized === current;
			audioEl.loop = !!loop;
			if (!isSameSrc) {
				audioEl.src = src;
				audioEl.currentTime = 0;
			} else if (audioEl.ended && !audioEl.loop) {
				lastCommand = commandKey;
				return;
			}
			audioEl.play().catch(() => {});
			lastCommand = commandKey;
		};
		const handleSlideAudio = (slide) => {
			if (!slide) return;
			if (slide.hasAttribute("data-background-audio-stop")) {
				stopAudio();
				return;
			}
			const loopSrc = slide.getAttribute("data-background-audio-loop");
			const startSrc = slide.getAttribute("data-background-audio-start");
			if (loopSrc) {
				startAudio(loopSrc, true);
				return;
			}
			if (startSrc) startAudio(startSrc, false);
		};
		deck.on("ready", (e) => handleSlideAudio(e.currentSlide));
		deck.on("slidechanged", (e) => handleSlideAudio(e.currentSlide));
	}
	function initCountdowns(deck) {
		const activeIntervals = [];
		const clearCountdownIntervals = () => {
			while (activeIntervals.length > 0) {
				const id = activeIntervals.pop();
				window.clearInterval(id);
			}
		};
		const pad2 = (value) => String(Math.max(0, Number.parseInt(value, 10) || 0)).padStart(2, "0");
		const formatTime = (seconds) => {
			const total = Math.max(0, Number.parseInt(seconds, 10) || 0);
			const hours = Math.floor(total / 3600);
			const minutes = Math.floor(total % 3600 / 60);
			const secs = total % 60;
			if (hours > 0) return `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)}`;
			return `${pad2(minutes)}:${pad2(secs)}`;
		};
		const secondsUntilClockTime = (hour, minute) => {
			const now = /* @__PURE__ */ new Date();
			const target = new Date(now);
			target.setHours(hour, minute, 0, 0);
			if (target.getTime() < now.getTime()) target.setDate(target.getDate() + 1);
			return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 1e3));
		};
		const updateCountdownsOnSlide = (slide) => {
			clearCountdownIntervals();
			if (!slide) return;
			slide.querySelectorAll(".countdown[data-countdown-mode]").forEach((el) => {
				const mode = (el.dataset.countdownMode || "").toLowerCase();
				if (mode === "from") {
					const durationSeconds = Number.parseInt(el.dataset.countdownSeconds || "", 10);
					if (!Number.isFinite(durationSeconds) || durationSeconds < 0) return;
					const startMs = Date.now();
					const tickFrom = () => {
						const elapsed = Math.floor((Date.now() - startMs) / 1e3);
						el.textContent = formatTime(Math.max(0, durationSeconds - elapsed));
					};
					tickFrom();
					activeIntervals.push(window.setInterval(tickFrom, 250));
					return;
				}
				if (mode === "to") {
					const hour = Number.parseInt(el.dataset.countdownHour || "", 10);
					const minute = Number.parseInt(el.dataset.countdownMinute || "", 10);
					if (!Number.isFinite(hour) || !Number.isFinite(minute)) return;
					const tickTo = () => {
						el.textContent = formatTime(secondsUntilClockTime(hour, minute));
					};
					tickTo();
					activeIntervals.push(window.setInterval(tickTo, 250));
					return;
				}
				const handler = window.revealCountdownHandlers?.[mode];
				if (typeof handler === "function") handler(el, activeIntervals, deck);
			});
		};
		deck.on("ready", (e) => updateCountdownsOnSlide(e.currentSlide));
		deck.on("slidechanged", (e) => updateCountdownsOnSlide(e.currentSlide));
	}
	function hideCursorOnIdle() {
		const hideDelay = 2e3;
		let timer = setTimeout(() => {
			document.body.style.cursor = "none";
		}, hideDelay);
		document.addEventListener("mousemove", () => {
			document.body.style.cursor = "default";
			clearTimeout(timer);
			timer = setTimeout(() => {
				document.body.style.cursor = "none";
			}, hideDelay);
		});
	}
	function scrubBackgroundVideos(isThumbnail) {
		if (isThumbnail) {
			document.querySelectorAll(".slide-background-content video").forEach((video) => {
				if (!video.hasAttribute("data-paused-by-notes")) {
					video.pause();
					video.remove();
					video.setAttribute("data-paused-by-notes", "true");
					console.log("[Notes] Paused and removed background video");
				}
			});
			setTimeout(() => scrubBackgroundVideos(true), 1e3);
		}
	}
	function updateAttributionFromCurrentSlide(deck) {
		const currentSlide = deck.getCurrentSlide();
		if (!currentSlide) return;
		const source = currentSlide.querySelector(".slide-attribution");
		const overlay = document.getElementById("fixed-overlay-wrapper");
		const aiSource = currentSlide.querySelector(".slide-ai-symbol");
		const aiOverlay = document.getElementById("fixed-ai-wrapper");
		if (source) {
			overlay.innerHTML = source.innerHTML;
			overlay.style.display = "";
		} else {
			overlay.innerHTML = "";
			overlay.style.display = "none";
		}
		if (aiOverlay) if (aiSource) {
			aiOverlay.innerHTML = aiSource.innerHTML;
			aiOverlay.style.display = "";
		} else {
			aiOverlay.innerHTML = "";
			aiOverlay.style.display = "none";
		}
		const tintcolor = currentSlide.getAttribute("data-tint-color");
		const tint = document.getElementById("fixed-tint-wrapper");
		const tintFadeMs = 300;
		const tintStyle = resolveTintStyle(tintcolor);
		if (!tint) return;
		const tintLayers = ensureTintLayers(tint, tintFadeMs);
		const wasHidden = getComputedStyle(tint).display === "none";
		tint.style.transition = `opacity ${tintFadeMs}ms ease`;
		if (tint._hideTimeout) {
			clearTimeout(tint._hideTimeout);
			tint._hideTimeout = null;
		}
		if (tintStyle) {
			const activeIndex = tint._activeTintLayerIndex ?? 0;
			const inactiveIndex = activeIndex === 0 ? 1 : 0;
			const activeLayer = tintLayers[activeIndex];
			const inactiveLayer = tintLayers[inactiveIndex];
			const targetSignature = tintStyleSignature(tintStyle);
			if ((activeLayer.dataset.tintSignature || "") !== targetSignature) {
				applyTintStyleToLayer(inactiveLayer, tintStyle);
				if (wasHidden) {
					activeLayer.style.opacity = "0";
					inactiveLayer.style.opacity = "1";
				} else {
					inactiveLayer.style.opacity = "0";
					inactiveLayer.offsetHeight;
					inactiveLayer.style.opacity = "1";
					activeLayer.style.opacity = "0";
				}
				tint._activeTintLayerIndex = inactiveIndex;
			} else {
				activeLayer.style.opacity = "1";
				inactiveLayer.style.opacity = "0";
			}
			if (wasHidden) {
				tint.style.display = "";
				tint.style.opacity = "0";
				tint.offsetHeight;
			}
			tint.style.opacity = "1";
		} else if (!wasHidden) {
			tint.style.opacity = "0";
			tint._hideTimeout = setTimeout(() => {
				tint.style.display = "none";
			}, tintFadeMs);
		}
	}
	function ensureHiddenPreviewOverlay() {
		let overlay = document.getElementById("fixed-hidden-preview-wrapper");
		if (overlay) return overlay;
		overlay = document.createElement("div");
		overlay.id = "fixed-hidden-preview-wrapper";
		overlay.textContent = "HIDDEN";
		document.body.appendChild(overlay);
		return overlay;
	}
	function updateHiddenPreviewOverlay(deck) {
		const overlay = ensureHiddenPreviewOverlay();
		const currentSlide = deck.getCurrentSlide?.();
		const inOverview = !!deck?.isOverview?.();
		const isHiddenPreview = !!currentSlide?.hasAttribute?.("data-hidden-preview");
		overlay.style.display = !inOverview && isHiddenPreview ? "flex" : "none";
	}
	function updateFixedOverlayVisibility(deck) {
		const visibility = !!deck?.isOverview?.() ? "hidden" : "";
		[
			"fixed-tint-wrapper",
			"fixed-ai-wrapper",
			"fixed-overlay-wrapper",
			"fixed-hidden-preview-wrapper"
		].forEach((id) => {
			const el = document.getElementById(id);
			if (el) el.style.visibility = visibility;
		});
	}
	function resolveTintStyle(rawTint) {
		if (!rawTint) return null;
		const value = rawTint.trim();
		if (!value) return null;
		if (/^image\s*:/i.test(value) || /\burl\s*\(/i.test(value)) return null;
		if (/^(linear-gradient|radial-gradient|conic-gradient)\s*\(/i.test(value)) return {
			type: "gradient",
			value
		};
		return {
			type: "color",
			value
		};
	}
	function ensureTintLayers(tint, tintFadeMs) {
		if (Array.isArray(tint._tintLayers) && tint._tintLayers.length === 2) {
			tint.style.backgroundColor = "transparent";
			tint.style.backgroundImage = "none";
			tint._tintLayers.forEach((layer) => {
				layer.style.transition = `opacity ${tintFadeMs}ms ease`;
			});
			return tint._tintLayers;
		}
		const createLayer = () => {
			const layer = document.createElement("div");
			layer.style.position = "absolute";
			layer.style.top = "0";
			layer.style.left = "0";
			layer.style.width = "100%";
			layer.style.height = "100%";
			layer.style.pointerEvents = "none";
			layer.style.opacity = "0";
			layer.style.transition = `opacity ${tintFadeMs}ms ease`;
			layer.style.backgroundColor = "transparent";
			layer.style.backgroundImage = "none";
			return layer;
		};
		const layerA = createLayer();
		const layerB = createLayer();
		tint.style.backgroundColor = "transparent";
		tint.style.backgroundImage = "none";
		tint.append(layerA, layerB);
		tint._tintLayers = [layerA, layerB];
		tint._activeTintLayerIndex = 0;
		return tint._tintLayers;
	}
	function tintStyleSignature(tintStyle) {
		return tintStyle ? `${tintStyle.type}:${tintStyle.value}` : "";
	}
	function initVideoSync(deck, remotePlugin) {
		if (!!new URLSearchParams(window.location.search).get("remoteMultiplexId")) {
			const stripControls = (slide) => {
				slide?.querySelectorAll("video").forEach((v) => {
					v.controls = false;
					v.removeAttribute("controls");
				});
			};
			deck.on("ready", (e) => stripControls(e.currentSlide));
			deck.on("slidechanged", (e) => stripControls(e.currentSlide));
			remotePlugin.onMessage("video-command", (data) => {
				const indices = deck.getIndices();
				if (indices.h !== data.h || (indices.v ?? 0) !== (data.v ?? 0)) return;
				const slide = deck.getCurrentSlide();
				if (!slide) return;
				const video = [...slide.querySelectorAll("video")][data.videoIndex];
				if (!video) return;
				if (Math.abs(video.currentTime - data.currentTime) > .3) video.currentTime = data.currentTime;
				if (data.paused) video.pause();
				else video.play().catch(() => {});
			});
		} else {
			const wireVideoSync = (slide) => {
				if (!slide) return;
				[...slide.querySelectorAll("video")].forEach((video, videoIndex) => {
					if (video.dataset.videoSyncWired === "1") return;
					video.dataset.videoSyncWired = "1";
					const sendCmd = () => {
						const indices = deck.getIndices();
						remotePlugin.sendMessage("video-command", {
							h: indices.h,
							v: indices.v ?? 0,
							videoIndex,
							currentTime: video.currentTime,
							paused: video.paused
						});
					};
					video.addEventListener("play", sendCmd);
					video.addEventListener("pause", sendCmd);
					video.addEventListener("seeked", sendCmd);
				});
			};
			deck.on("ready", (e) => wireVideoSync(e.currentSlide));
			deck.on("slidechanged", (e) => wireVideoSync(e.currentSlide));
		}
	}
	function applyTintStyleToLayer(layer, tintStyle) {
		layer.style.backgroundColor = "transparent";
		layer.style.backgroundImage = "none";
		if (tintStyle.type === "color") layer.style.backgroundColor = tintStyle.value;
		else layer.style.backgroundImage = tintStyle.value;
		layer.dataset.tintSignature = tintStyleSignature(tintStyle);
	}
	function hideControlsOnSpeakerNotes() {
		window.addEventListener("message", (event) => {
			let edata = event.data;
			if (typeof edata === "string") try {
				edata = JSON.parse(edata);
			} catch {
				return;
			}
			if (!edata || typeof edata !== "object") return;
			if (edata.namespace === "reveal-notes" && edata.type === "connected") {
				console.log("Speaker Notes Connected, hiding controls");
				document.querySelector(".controls")?.classList.add("hide-when-notes");
				document.querySelector(".progress")?.classList.add("hide-when-notes");
			}
		});
	}
	function doubleClickFullScreen() {
		if (new URLSearchParams(window.location.search).get("forceControls") === "1") return;
		document.addEventListener("dblclick", () => {
			const elem = document.documentElement;
			if (!document.fullscreenElement) {
				if (elem.requestFullscreen) elem.requestFullscreen();
				else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
			}
		});
	}
	function ensureMagicSlideStyles() {
		if (document.getElementById("magic-slide-styles")) return;
		const style = document.createElement("style");
		style.id = "magic-slide-styles";
		style.textContent = `
    @keyframes sparkle-pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.3);
      }
    }

    .magic-slide-indicator {
      display: none;
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 192px;
      line-height: 1;
      pointer-events: none;
      z-index: 10;
      animation: sparkle-pulse 1.5s ease-in-out infinite;
    }

    .reveal.overview [data-magic-slide] .magic-slide-indicator {
      display: block;
    }
  `;
		document.head.appendChild(style);
	}
	function addMagicSlideIndicators(deck) {
		const revealElement = deck?.getRevealElement?.();
		if (!revealElement) return;
		revealElement.querySelectorAll("[data-magic-slide]").forEach((slide) => {
			if (slide.querySelector(".magic-slide-indicator")) return;
			const indicator = document.createElement("div");
			indicator.className = "magic-slide-indicator";
			indicator.textContent = "✨";
			slide.appendChild(indicator);
		});
	}
	//#endregion
	//#region js/contextmenu.js
	function contextMenu(deck) {
		document.addEventListener("contextmenu", function(e) {
			e.preventDefault();
			const existing = document.getElementById("reveal-context-menu");
			if (existing) existing.remove();
			const menu = document.createElement("div");
			menu.id = "reveal-context-menu";
			const menuWidth = 220;
			const menuHeight = 280;
			const maxLeft = window.innerWidth - menuWidth - 10;
			const maxTop = window.innerHeight - menuHeight - 10;
			const clampedX = Math.min(e.clientX, maxLeft);
			menu.style = `
        position: fixed;
        top: ${Math.min(e.clientY, maxTop)}px;
        left: ${clampedX}px;
        background: #222;
        border: 1px solid #444;
        border-radius: 6px;
        color: white;
        z-index: 9999;
        font-family: sans-serif;
        box-shadow: 0 0 8px #000;
      `;
			const isLocal = window.location.hostname === "localhost";
			const isElectron = !!window.electronAPI;
			const hasBackHistory = canGoBack();
			const canSendToPeers = !!window.electronAPI?.sendPeerCommand || window.parent && window.parent !== window;
			const items = [
				{
					label: tr("Show Reveal.js Help (?)"),
					action: () => deck.toggleHelp()
				},
				{
					label: tr("Show Speaker Notes (s)"),
					action: () => deck.getPlugins().notes.open()
				},
				{
					label: tr("Toggle Fullscreen"),
					action: () => toggleFullscreen()
				},
				{
					label: tr("Copy Peer Share URL"),
					action: () => copyPeerShareUrl()
				},
				...isElectron && hasBackHistory ? [{
					label: tr("Back"),
					action: () => goBack()
				}] : [],
				...!isLocal ? [{
					label: tr("Toggle Remote Follower Link (a)"),
					action: () => fireRevealKey("a")
				}, {
					label: tr("Toggle Remote Control Link (r)"),
					action: () => fireRevealKey("r")
				}] : [],
				...canSendToPeers ? [{
					label: tr("Send Presentation to Peers (z)"),
					action: () => sendPresentationToPeers()
				}, {
					label: tr("Close Presentations on Peers (q)"),
					action: () => closePresentationsOnPeers()
				}] : [],
				{
					label: deck.isOverview() ? tr("Close Overview (ESC)") : tr("Overview (ESC)"),
					action: () => deck.toggleOverview()
				},
				{
					label: deck.isPaused() ? tr("Unpause/Unblank (b)") : tr("Pause/Blank (b)"),
					action: () => deck.togglePause()
				}
			];
			if (e.target.tagName === "A" && e.target.href) {
				const link = e.target.href;
				items.unshift({
					label: tr("Open Link in New Tab"),
					action: () => window.open(link, "_blank")
				}, {
					label: tr("Copy Link Address"),
					action: () => {
						if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(() => console.log("✅ " + tr("Link copied to clipboard"))).catch((err) => {
							console.error("❌ Clipboard error:", err);
							fallbackCopyText(link);
						});
						else fallbackCopyText(link);
					}
				});
			}
			const plugins = Object.entries(window.RevelationPlugins).map(([name, plugin]) => ({
				name,
				plugin,
				priority: plugin.priority
			})).sort((a, b) => a.priority - b.priority);
			for (const { plugin } of plugins) if (typeof plugin.getPresentationMenuItems === "function") {
				const menuItems = plugin.getPresentationMenuItems(deck);
				if (Array.isArray(menuItems)) items.push(...menuItems);
			}
			items.push({
				label: tr("Close Presentation"),
				action: () => closePresentation()
			});
			items.forEach(({ label, action }) => {
				const item = document.createElement("div");
				item.textContent = label;
				item.style = "padding: 0.5rem 1rem; cursor: pointer;";
				item.onmouseover = () => item.style.background = "#444";
				item.onmouseout = () => item.style.background = "transparent";
				item.onclick = () => {
					action();
					menu.remove();
				};
				menu.appendChild(item);
			});
			document.body.appendChild(menu);
			document.addEventListener("click", () => menu.remove(), { once: true });
		});
	}
	function sendPresentationToPeers() {
		const url = getPeerShareUrl();
		if (!url) {
			alert(tr("Remote share link not ready yet."));
			return;
		}
		if (window.electronAPI?.sendPeerCommand) {
			window.electronAPI.sendPeerCommand({
				type: "open-presentation",
				payload: { url }
			});
			return;
		}
		if (window.parent && window.parent !== window) {
			window.parent.postMessage({
				type: "pip-send-to-peers",
				payload: { url }
			}, "*");
			return;
		}
		console.warn("Peer commands unavailable outside Electron.");
	}
	function closePresentationsOnPeers() {
		if (window.electronAPI?.sendPeerCommand) {
			window.electronAPI.sendPeerCommand({
				type: "close-presentation",
				payload: {}
			});
			return;
		}
		if (window.parent && window.parent !== window) {
			window.parent.postMessage({ type: "pip-close-on-peers" }, "*");
			return;
		}
		console.warn("Peer commands unavailable outside Electron.");
	}
	function getPeerShareUrl() {
		const baseUrl = window.location.href.replace(/#.*/, "");
		const canonicalBaseUrl = stripPeerModeParams(baseUrl);
		try {
			const raw = window.localStorage?.getItem("presentations");
			const presentations = JSON.parse(raw || "{}");
			const multiplexId = (presentations[baseUrl] || presentations[canonicalBaseUrl])?.multiplexId;
			if (!multiplexId) return null;
			return `${canonicalBaseUrl}${canonicalBaseUrl.includes("?") ? "&" : "?"}remoteMultiplexId=${multiplexId}`;
		} catch (err) {
			console.warn("Failed to read remote share link from local storage.", err);
			return null;
		}
	}
	function stripPeerModeParams(url) {
		try {
			const parsed = new URL(url);
			parsed.searchParams.delete("lang");
			parsed.searchParams.delete("variant");
			return parsed.toString();
		} catch {
			return url;
		}
	}
	function fallbackCopyText(text) {
		const textarea = document.createElement("textarea");
		textarea.value = text;
		textarea.style.position = "fixed";
		document.body.appendChild(textarea);
		textarea.focus();
		textarea.select();
		try {
			document.execCommand("copy");
			console.log("✅ Link copied (fallback)");
		} catch (err) {
			console.error("❌ Fallback copy failed", err);
			alert("Failed to copy the link. You can do it manually:\n" + text);
		}
		document.body.removeChild(textarea);
	}
	function toggleFullscreen() {
		if (window.electronAPI?.toggleFullScreen) window.electronAPI.toggleFullScreen();
		else {
			const elem = document.documentElement;
			if (!document.fullscreenElement) {
				if (elem.requestFullscreen) elem.requestFullscreen();
				else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
			} else if (document.exitFullscreen) document.exitFullscreen();
		}
	}
	function closePresentation() {
		if (window.electronAPI?.closePresentation) {
			window.electronAPI.closePresentation();
			return;
		}
		if (window.parent && window.parent !== window) {
			window.parent.postMessage("pip-close-presentation", "*");
			return;
		} else {
			window.close();
			if (!window.closed) alert(tr("Please close this tab manually."));
		}
	}
	function copyPeerShareUrl() {
		fallbackCopyText(getPeerShareUrl() || window.location.href);
	}
	function goBack() {
		window.history.back();
	}
	function canGoBack() {
		if (window.navigation && typeof window.navigation.canGoBack === "boolean") return window.navigation.canGoBack;
		return window.history.length > 1;
	}
	function fireRevealKey(key) {
		const code = key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0;
		const event = new KeyboardEvent("keydown", {
			key,
			keyCode: code,
			bubbles: true,
			cancelable: true
		});
		document.dispatchEvent(event);
	}
	//#endregion
	//#region node_modules/reveal.js/dist/reveal.mjs
	var e$5 = (e, t) => {
		for (let n in t) e[n] = t[n];
		return e;
	}, t$4 = (e, t) => Array.from(e.querySelectorAll(t)), n$4 = (e, t, n) => {
		n ? e.classList.add(t) : e.classList.remove(t);
	}, r$4 = (e) => {
		if (typeof e == "string") {
			if (e === "null") return null;
			if (e === "true") return !0;
			if (e === "false") return !1;
			if (e.match(/^-?[\d\.]+$/)) return parseFloat(e);
		}
		return e;
	}, i$3 = (e, t) => {
		e.style.transform = t;
	}, a$3 = (e, t) => {
		let n = e.matches || e.matchesSelector || e.msMatchesSelector;
		return !!(n && n.call(e, t));
	}, o$3 = (e, t) => {
		if (e && typeof e.closest == "function") return e.closest(t);
		for (; e;) {
			if (a$3(e, t)) return e;
			e = e.parentElement;
		}
		return null;
	}, s$3 = (e) => {
		e = e || document.documentElement;
		let t = e.requestFullscreen || e.webkitRequestFullscreen || e.webkitRequestFullScreen || e.mozRequestFullScreen || e.msRequestFullscreen;
		t && t.apply(e);
	}, c$3 = (e, t, n, r = "") => {
		let i = e.querySelectorAll("." + n);
		for (let t = 0; t < i.length; t++) {
			let n = i[t];
			if (n.parentNode === e) return n;
		}
		let a = document.createElement(t);
		return a.className = n, a.innerHTML = r, e.appendChild(a), a;
	}, l$3 = (e) => {
		let t = document.createElement("style");
		return e && e.length > 0 && t.appendChild(document.createTextNode(e)), document.head.appendChild(t), t;
	}, u$3 = () => {
		let e = {};
		location.search.replace(/[A-Z0-9]+?=([\w\.%-]*)/gi, (t) => {
			let n = t.split("=").shift(), r = t.split("=").pop();
			return n && r !== void 0 && (e[n] = r), t;
		});
		for (let t in e) {
			let n = e[t];
			e[t] = r$4(unescape(n));
		}
		return e.dependencies !== void 0 && delete e.dependencies, e;
	}, d$3 = (e, t = 0) => {
		if (e) {
			var n;
			let r, i = e.style.height;
			return e.style.height = "0px", e.parentElement && (e.parentElement.style.height = "auto"), r = t - (((n = e.parentElement) == null ? void 0 : n.offsetHeight) || 0), e.style.height = i + "px", e.parentElement && e.parentElement.style.removeProperty("height"), r;
		}
		return t;
	}, f$3 = {
		mp4: "video/mp4",
		m4a: "video/mp4",
		ogv: "video/ogg",
		mpeg: "video/mpeg",
		webm: "video/webm"
	}, p$3 = (e = "") => {
		let t = e.split(".").pop();
		return t ? f$3[t] : void 0;
	}, m$3 = (e = "") => encodeURI(e).replace(/%5B/g, "[").replace(/%5D/g, "]").replace(/[!'()*]/g, (e) => `%${e.charCodeAt(0).toString(16).toUpperCase()}`), h$3 = navigator.userAgent, g$3 = /(iphone|ipod|ipad|android)/gi.test(h$3) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
	/chrome/i.test(h$3) && /edge/i.test(h$3);
	var _$3 = /android/gi.test(h$3), v$3 = function(e) {
		if (e) {
			var t = function(e) {
				return [].slice.call(e);
			}, n = 0, r = 1, i = 2, a = 3, o = [], s = null, c = "requestAnimationFrame" in e ? function() {
				var t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : { sync: !1 };
				e.cancelAnimationFrame(s);
				var n = function() {
					return u(o.filter((function(e) {
						return e.dirty && e.active;
					})));
				};
				if (t.sync) return n();
				s = e.requestAnimationFrame(n);
			} : function() {}, l = function(e) {
				return function(t) {
					o.forEach((function(t) {
						return t.dirty = e;
					})), c(t);
				};
			}, u = function(e) {
				e.filter((function(e) {
					return !e.styleComputed;
				})).forEach((function(e) {
					e.styleComputed = m(e);
				})), e.filter(h).forEach(g);
				var t = e.filter(p);
				t.forEach(f), t.forEach((function(e) {
					g(e), d(e);
				})), t.forEach(_);
			}, d = function(e) {
				return e.dirty = n;
			}, f = function(e) {
				e.availableWidth = e.element.parentNode.clientWidth, e.currentWidth = e.element.scrollWidth, e.previousFontSize = e.currentFontSize, e.currentFontSize = Math.min(Math.max(e.minSize, e.availableWidth / e.currentWidth * e.previousFontSize), e.maxSize), e.whiteSpace = e.multiLine && e.currentFontSize === e.minSize ? "normal" : "nowrap";
			}, p = function(e) {
				return e.dirty !== i || e.dirty === i && e.element.parentNode.clientWidth !== e.availableWidth;
			}, m = function(t) {
				var n = e.getComputedStyle(t.element, null);
				return t.currentFontSize = parseFloat(n.getPropertyValue("font-size")), t.display = n.getPropertyValue("display"), t.whiteSpace = n.getPropertyValue("white-space"), !0;
			}, h = function(e) {
				var t = !1;
				return !e.preStyleTestCompleted && (/inline-/.test(e.display) || (t = !0, e.display = "inline-block"), e.whiteSpace !== "nowrap" && (t = !0, e.whiteSpace = "nowrap"), e.preStyleTestCompleted = !0, t);
			}, g = function(e) {
				e.element.style.whiteSpace = e.whiteSpace, e.element.style.display = e.display, e.element.style.fontSize = e.currentFontSize + "px";
			}, _ = function(e) {
				e.element.dispatchEvent(new CustomEvent("fit", { detail: {
					oldValue: e.previousFontSize,
					newValue: e.currentFontSize,
					scaleFactor: e.currentFontSize / e.previousFontSize
				} }));
			}, v = function(e, t) {
				return function(n) {
					e.dirty = t, e.active && c(n);
				};
			}, y = function(e) {
				return function() {
					o = o.filter((function(t) {
						return t.element !== e.element;
					})), e.observeMutations && e.observer.disconnect(), e.element.style.whiteSpace = e.originalStyle.whiteSpace, e.element.style.display = e.originalStyle.display, e.element.style.fontSize = e.originalStyle.fontSize;
				};
			}, b = function(e) {
				return function() {
					e.active || (e.active = !0, c());
				};
			}, x = function(e) {
				return function() {
					return e.active = !1;
				};
			}, S = function(e) {
				e.observeMutations && (e.observer = new MutationObserver(v(e, r)), e.observer.observe(e.element, e.observeMutations));
			}, ee = {
				minSize: 16,
				maxSize: 512,
				multiLine: !0,
				observeMutations: "MutationObserver" in e && {
					subtree: !0,
					childList: !0,
					characterData: !0
				}
			}, C = null, w = function() {
				e.clearTimeout(C), C = e.setTimeout(l(i), E.observeWindowDelay);
			}, te = ["resize", "orientationchange"];
			return Object.defineProperty(E, "observeWindow", { set: function(t) {
				var n = `${t ? "add" : "remove"}EventListener`;
				te.forEach((function(t) {
					e[n](t, w);
				}));
			} }), E.observeWindow = !0, E.observeWindowDelay = 100, E.fitAll = l(a), E;
		}
		function T(e, t) {
			var n = Object.assign({}, ee, t), r = e.map((function(e) {
				var t = Object.assign({}, n, {
					element: e,
					active: !0
				});
				return function(e) {
					e.originalStyle = {
						whiteSpace: e.element.style.whiteSpace,
						display: e.element.style.display,
						fontSize: e.element.style.fontSize
					}, S(e), e.newbie = !0, e.dirty = !0, o.push(e);
				}(t), {
					element: e,
					fit: v(t, a),
					unfreeze: b(t),
					freeze: x(t),
					unsubscribe: y(t)
				};
			}));
			return c(), r;
		}
		function E(e) {
			var n = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
			return typeof e == "string" ? T(t(document.querySelectorAll(e)), n) : T([e], n)[0];
		}
	}(typeof window > "u" ? null : window);
	function y$3(e) {
		"@babel/helpers - typeof";
		return y$3 = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
			return typeof e;
		} : function(e) {
			return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
		}, y$3(e);
	}
	function b$3(e, t) {
		if (y$3(e) != "object" || !e) return e;
		var n = e[Symbol.toPrimitive];
		if (n !== void 0) {
			var r = n.call(e, t || "default");
			if (y$3(r) != "object") return r;
			throw TypeError("@@toPrimitive must return a primitive value.");
		}
		return (t === "string" ? String : Number)(e);
	}
	function x$3(e) {
		var t = b$3(e, "string");
		return y$3(t) == "symbol" ? t : t + "";
	}
	function S$3(e, t, n) {
		return (t = x$3(t)) in e ? Object.defineProperty(e, t, {
			value: n,
			enumerable: !0,
			configurable: !0,
			writable: !0
		}) : e[t] = n, e;
	}
	var ee$2 = class {
		constructor(e) {
			S$3(this, "allowedToPlayAudio", null), this.Reveal = e, this.startEmbeddedMedia = this.startEmbeddedMedia.bind(this), this.startEmbeddedIframe = this.startEmbeddedIframe.bind(this), this.preventIframeAutoFocus = this.preventIframeAutoFocus.bind(this), this.ensureMobileMediaPlaying = this.ensureMobileMediaPlaying.bind(this), this.failedAudioPlaybackTargets = /* @__PURE__ */ new Set(), this.failedVideoPlaybackTargets = /* @__PURE__ */ new Set(), this.failedMutedVideoPlaybackTargets = /* @__PURE__ */ new Set(), this.renderMediaPlayButton();
		}
		renderMediaPlayButton() {
			this.mediaPlayButton = document.createElement("button"), this.mediaPlayButton.className = "r-overlay-button r-media-play-button", this.mediaPlayButton.addEventListener("click", () => {
				this.resetTemporarilyMutedMedia(), new Set([
					...this.failedAudioPlaybackTargets,
					...this.failedVideoPlaybackTargets,
					...this.failedMutedVideoPlaybackTargets
				]).forEach((e) => {
					this.startEmbeddedMedia({ target: e });
				}), this.clearMediaPlaybackErrors();
			});
		}
		shouldPreload(e) {
			if (this.Reveal.isScrollView()) return !0;
			let t = this.Reveal.getConfig().preloadIframes;
			return typeof t != "boolean" && (t = e.hasAttribute("data-preload")), t;
		}
		load(e, n = {}) {
			let r = this.Reveal.getConfig().display;
			if (r.includes("!important")) {
				let t = r.replace(/\s*!important\s*$/, "").trim();
				e.style.setProperty("display", t, "important");
			} else e.style.display = r;
			t$4(e, "img[data-src], video[data-src], audio[data-src], iframe[data-src]").forEach((e) => {
				let t = e.tagName === "IFRAME";
				(!t || this.shouldPreload(e)) && (e.setAttribute("src", e.getAttribute("data-src")), e.setAttribute("data-lazy-loaded", ""), e.removeAttribute("data-src"), t && e.addEventListener("load", this.preventIframeAutoFocus));
			}), t$4(e, "video, audio").forEach((e) => {
				let n = 0;
				t$4(e, "source[data-src]").forEach((e) => {
					e.setAttribute("src", e.getAttribute("data-src")), e.removeAttribute("data-src"), e.setAttribute("data-lazy-loaded", ""), n += 1;
				}), g$3 && e.tagName === "VIDEO" && e.setAttribute("playsinline", ""), n > 0 && e.load();
			});
			let i = e.slideBackgroundElement;
			if (i) {
				i.style.display = "block";
				let t = e.slideBackgroundContentElement, r = e.getAttribute("data-background-iframe");
				if (i.hasAttribute("data-loaded") === !1) {
					i.setAttribute("data-loaded", "true");
					let a = e.getAttribute("data-background-image"), o = e.getAttribute("data-background-video"), s = e.hasAttribute("data-background-video-loop"), c = e.hasAttribute("data-background-video-muted");
					if (a) /^data:/.test(a.trim()) ? t.style.backgroundImage = `url(${a.trim()})` : t.style.backgroundImage = a.split(",").map((e) => `url(${m$3(decodeURI(e.trim()))})`).join(",");
					else if (o) {
						let e = document.createElement("video");
						s && e.setAttribute("loop", ""), (c || this.Reveal.isSpeakerNotes()) && (e.muted = !0), g$3 && e.setAttribute("playsinline", ""), o.split(",").forEach((t) => {
							let n = document.createElement("source");
							n.setAttribute("src", t);
							let r = p$3(t);
							r && n.setAttribute("type", r), e.appendChild(n);
						}), t.appendChild(e);
					} else if (r && n.excludeIframes !== !0) {
						let e = document.createElement("iframe");
						e.setAttribute("allowfullscreen", ""), e.setAttribute("mozallowfullscreen", ""), e.setAttribute("webkitallowfullscreen", ""), e.setAttribute("allow", "autoplay"), e.setAttribute("data-src", r), e.style.width = "100%", e.style.height = "100%", e.style.maxHeight = "100%", e.style.maxWidth = "100%", t.appendChild(e);
					}
				}
				let a = t.querySelector("iframe[data-src]");
				a && this.shouldPreload(i) && !/autoplay=(1|true|yes)/gi.test(r) && a.getAttribute("src") !== r && a.setAttribute("src", r);
			}
			this.layout(e);
		}
		layout(e) {
			Array.from(e.querySelectorAll(".r-fit-text")).forEach((e) => {
				v$3(e, {
					minSize: 24,
					maxSize: this.Reveal.getConfig().height * .8,
					observeMutations: !1,
					observeWindow: !1
				});
			});
		}
		unload(e) {
			e.style.display = "none";
			let n = this.Reveal.getSlideBackground(e);
			n && (n.style.display = "none", t$4(n, "iframe[src]").forEach((e) => {
				e.removeAttribute("src");
			})), t$4(e, "video[data-lazy-loaded][src], audio[data-lazy-loaded][src], iframe[data-lazy-loaded][src]").forEach((e) => {
				e.setAttribute("data-src", e.getAttribute("src")), e.removeAttribute("src");
			}), t$4(e, "video[data-lazy-loaded] source[src], audio source[src]").forEach((e) => {
				e.setAttribute("data-src", e.getAttribute("src")), e.removeAttribute("src");
			});
		}
		formatEmbeddedContent() {
			let e = (e, n, r) => {
				t$4(this.Reveal.getSlidesElement(), "iframe[" + e + "*=\"" + n + "\"]").forEach((t) => {
					let n = t.getAttribute(e);
					n && n.indexOf(r) === -1 && t.setAttribute(e, n + (/\?/.test(n) ? "&" : "?") + r);
				});
			};
			e("src", "youtube.com/embed/", "enablejsapi=1"), e("data-src", "youtube.com/embed/", "enablejsapi=1"), e("src", "player.vimeo.com/", "api=1"), e("data-src", "player.vimeo.com/", "api=1");
		}
		startEmbeddedContent(e) {
			if (e) {
				let n = this.Reveal.isSpeakerNotes();
				t$4(e, "img[src$=\".gif\"]").forEach((e) => {
					e.setAttribute("src", e.getAttribute("src"));
				}), t$4(e, "video, audio").forEach((e) => {
					if (o$3(e, ".fragment") && !o$3(e, ".fragment.visible")) return;
					let t = this.Reveal.getConfig().autoPlayMedia;
					if (typeof t != "boolean" && (t = e.hasAttribute("data-autoplay") || !!o$3(e, ".slide-background")), t && typeof e.play == "function") {
						if (n && !e.muted) return;
						e.readyState > 1 ? this.startEmbeddedMedia({ target: e }) : g$3 ? (e.addEventListener("canplay", this.ensureMobileMediaPlaying), this.playMediaElement(e)) : (e.removeEventListener("loadeddata", this.startEmbeddedMedia), e.addEventListener("loadeddata", this.startEmbeddedMedia));
					}
				}), n || (t$4(e, "iframe[src]").forEach((e) => {
					o$3(e, ".fragment") && !o$3(e, ".fragment.visible") || this.startEmbeddedIframe({ target: e });
				}), t$4(e, "iframe[data-src]").forEach((e) => {
					o$3(e, ".fragment") && !o$3(e, ".fragment.visible") || e.getAttribute("src") !== e.getAttribute("data-src") && (e.removeEventListener("load", this.startEmbeddedIframe), e.addEventListener("load", this.startEmbeddedIframe), e.setAttribute("src", e.getAttribute("data-src")));
				}));
			}
		}
		ensureMobileMediaPlaying(e) {
			let t = e.target;
			typeof t.getVideoPlaybackQuality == "function" && setTimeout(() => {
				let e = t.paused === !1, n = t.getVideoPlaybackQuality().totalVideoFrames;
				e && n === 0 && (t.load(), t.play());
			}, 1e3);
		}
		startEmbeddedMedia(e) {
			let t = !!o$3(e.target, "html"), n = !!o$3(e.target, ".present");
			t && n && (e.target.paused || e.target.ended) && (e.target.currentTime = 0, this.playMediaElement(e.target)), e.target.removeEventListener("loadeddata", this.startEmbeddedMedia);
		}
		playMediaElement(e) {
			let t = e.play();
			t && typeof t.catch == "function" && t.then(() => {
				e.muted || (this.allowedToPlayAudio = !0);
			}).catch((t) => {
				if (t.name === "NotAllowedError") if (this.allowedToPlayAudio = !1, e.tagName === "VIDEO") {
					this.onVideoPlaybackNotAllowed(e);
					let t = !!o$3(e, "html"), n = !!o$3(e, ".present"), r = e.muted;
					t && n && !r && (e.setAttribute("data-muted-by-reveal", "true"), e.muted = !0, e.play().catch(() => {
						this.onMutedVideoPlaybackNotAllowed(e);
					}));
				} else e.tagName === "AUDIO" && this.onAudioPlaybackNotAllowed(e);
			});
		}
		startEmbeddedIframe(e) {
			let t = e.target;
			if (this.preventIframeAutoFocus(e), t && t.contentWindow) {
				let n = !!o$3(e.target, "html"), r = !!o$3(e.target, ".present");
				if (n && r) {
					let e = this.Reveal.getConfig().autoPlayMedia;
					typeof e != "boolean" && (e = t.hasAttribute("data-autoplay") || !!o$3(t, ".slide-background")), /youtube\.com\/embed\//.test(t.getAttribute("src")) && e ? t.contentWindow.postMessage("{\"event\":\"command\",\"func\":\"playVideo\",\"args\":\"\"}", "*") : /player\.vimeo\.com\//.test(t.getAttribute("src")) && e ? t.contentWindow.postMessage("{\"method\":\"play\"}", "*") : t.contentWindow.postMessage("slide:start", "*");
				}
			}
		}
		stopEmbeddedContent(n, r = {}) {
			r = e$5({ unloadIframes: !0 }, r), n && n.parentNode && (t$4(n, "video, audio").forEach((e) => {
				!e.hasAttribute("data-ignore") && typeof e.pause == "function" && (e.setAttribute("data-paused-by-reveal", ""), e.pause(), g$3 && e.removeEventListener("canplay", this.ensureMobileMediaPlaying));
			}), t$4(n, "iframe").forEach((e) => {
				e.contentWindow && e.contentWindow.postMessage("slide:stop", "*"), e.removeEventListener("load", this.preventIframeAutoFocus), e.removeEventListener("load", this.startEmbeddedIframe);
			}), t$4(n, "iframe[src*=\"youtube.com/embed/\"]").forEach((e) => {
				!e.hasAttribute("data-ignore") && e.contentWindow && typeof e.contentWindow.postMessage == "function" && e.contentWindow.postMessage("{\"event\":\"command\",\"func\":\"pauseVideo\",\"args\":\"\"}", "*");
			}), t$4(n, "iframe[src*=\"player.vimeo.com/\"]").forEach((e) => {
				!e.hasAttribute("data-ignore") && e.contentWindow && typeof e.contentWindow.postMessage == "function" && e.contentWindow.postMessage("{\"method\":\"pause\"}", "*");
			}), r.unloadIframes === !0 && t$4(n, "iframe[data-src]").forEach((e) => {
				e.setAttribute("src", "about:blank"), e.removeAttribute("src");
			}));
		}
		isAllowedToPlayAudio() {
			return this.allowedToPlayAudio;
		}
		showPlayOrUnmuteButton() {
			let e = this.failedAudioPlaybackTargets.size, t = this.failedVideoPlaybackTargets.size, n = this.failedMutedVideoPlaybackTargets.size, r = "Play media";
			n > 0 ? r = "Play video" : t > 0 ? r = "Unmute video" : e > 0 && (r = "Play audio"), this.mediaPlayButton.textContent = r, this.Reveal.getRevealElement().appendChild(this.mediaPlayButton);
		}
		onAudioPlaybackNotAllowed(e) {
			this.failedAudioPlaybackTargets.add(e), this.showPlayOrUnmuteButton(e);
		}
		onVideoPlaybackNotAllowed(e) {
			this.failedVideoPlaybackTargets.add(e), this.showPlayOrUnmuteButton();
		}
		onMutedVideoPlaybackNotAllowed(e) {
			this.failedMutedVideoPlaybackTargets.add(e), this.showPlayOrUnmuteButton();
		}
		resetTemporarilyMutedMedia() {
			new Set([
				...this.failedAudioPlaybackTargets,
				...this.failedVideoPlaybackTargets,
				...this.failedMutedVideoPlaybackTargets
			]).forEach((e) => {
				e.hasAttribute("data-muted-by-reveal") && (e.muted = !1, e.removeAttribute("data-muted-by-reveal"));
			});
		}
		clearMediaPlaybackErrors() {
			this.resetTemporarilyMutedMedia(), this.failedAudioPlaybackTargets.clear(), this.failedVideoPlaybackTargets.clear(), this.failedMutedVideoPlaybackTargets.clear(), this.mediaPlayButton && this.mediaPlayButton.parentNode && this.mediaPlayButton.remove();
		}
		preventIframeAutoFocus(e) {
			let t = e.target;
			if (t && this.Reveal.getConfig().preventIframeAutoFocus) {
				let e = 0, n = () => {
					document.activeElement === t ? document.activeElement.blur() : e < 1e3 && (e += 100, setTimeout(n, 100));
				};
				setTimeout(n, 100);
			}
		}
		afterSlideChanged() {
			this.clearMediaPlaybackErrors();
		}
	}, C$3 = ".slides section", w$3 = ".slides>section", te$2 = ".slides>section.present>section", T$3 = ".backgrounds>.slide-background", E$3 = /registerPlugin|registerKeyboardShortcut|addKeyBinding|addEventListener|showPreview|previewIframe/, ne$2 = class {
		constructor(e) {
			this.Reveal = e;
		}
		render() {
			this.element = document.createElement("div"), this.element.className = "slide-number", this.Reveal.getRevealElement().appendChild(this.element);
		}
		configure(e, t) {
			let n = "none";
			e.slideNumber && !this.Reveal.isPrintView() && (e.showSlideNumber === "all" || e.showSlideNumber === "speaker" && this.Reveal.isSpeakerNotes()) && (n = "block"), this.element.style.display = n;
		}
		update() {
			this.Reveal.getConfig().slideNumber && this.element && (this.element.innerHTML = this.getSlideNumber());
		}
		getSlideNumber(e = this.Reveal.getCurrentSlide()) {
			let t = this.Reveal.getConfig(), n, r = "h.v";
			if (typeof t.slideNumber == "function") n = t.slideNumber(e);
			else {
				typeof t.slideNumber == "string" && (r = t.slideNumber), !/c/.test(r) && this.Reveal.getHorizontalSlides().length === 1 && (r = "c");
				let i = e && e.dataset.visibility === "uncounted" ? 0 : 1;
				switch (n = [], r) {
					case "c":
						n.push(this.Reveal.getSlidePastCount(e) + i);
						break;
					case "c/t":
						n.push(this.Reveal.getSlidePastCount(e) + i, "/", this.Reveal.getTotalSlides());
						break;
					default:
						let t = this.Reveal.getIndices(e);
						n.push(t.h + i);
						let a = r === "h/v" ? "/" : ".";
						this.Reveal.isVerticalSlide(e) && n.push(a, t.v + 1);
				}
			}
			let i = "#" + this.Reveal.location.getHash(e);
			return this.formatNumber(n[0], n[1], n[2], i);
		}
		formatNumber(e, t, n, r = "#" + this.Reveal.location.getHash()) {
			return typeof n == "number" && !isNaN(n) ? `<a href="${r}">
					<span class="slide-number-a">${e}</span>
					<span class="slide-number-delimiter">${t}</span>
					<span class="slide-number-b">${n}</span>
					</a>` : `<a href="${r}">
					<span class="slide-number-a">${e}</span>
					</a>`;
		}
		destroy() {
			this.element.remove();
		}
	}, re$2 = class {
		constructor(e) {
			this.Reveal = e, this.onInput = this.onInput.bind(this), this.onBlur = this.onBlur.bind(this), this.onKeyDown = this.onKeyDown.bind(this);
		}
		render() {
			this.element = document.createElement("div"), this.element.className = "jump-to-slide", this.jumpInput = document.createElement("input"), this.jumpInput.type = "text", this.jumpInput.className = "jump-to-slide-input", this.jumpInput.placeholder = "Jump to slide", this.jumpInput.addEventListener("input", this.onInput), this.jumpInput.addEventListener("keydown", this.onKeyDown), this.jumpInput.addEventListener("blur", this.onBlur), this.element.appendChild(this.jumpInput);
		}
		show() {
			this.indicesOnShow = this.Reveal.getIndices(), this.Reveal.getRevealElement().appendChild(this.element), this.jumpInput.focus();
		}
		hide() {
			this.isVisible() && (this.element.remove(), this.jumpInput.value = "", clearTimeout(this.jumpTimeout), delete this.jumpTimeout);
		}
		isVisible() {
			return !!this.element.parentNode;
		}
		jump() {
			clearTimeout(this.jumpTimeout), delete this.jumpTimeout;
			let e = this.jumpInput.value.trim(""), t;
			if (/^\d+$/.test(e)) {
				let n = this.Reveal.getConfig().slideNumber;
				if (n === "c" || n === "c/t") {
					let n = this.Reveal.getSlides()[parseInt(e, 10) - 1];
					n && (t = this.Reveal.getIndices(n));
				}
			}
			return t || (/^\d+\.\d+$/.test(e) && (e = e.replace(".", "/")), t = this.Reveal.location.getIndicesFromHash(e, { oneBasedIndex: !0 })), !t && /\S+/i.test(e) && e.length > 1 && (t = this.search(e)), t && e !== "" ? (this.Reveal.slide(t.h, t.v, t.f), !0) : (this.Reveal.slide(this.indicesOnShow.h, this.indicesOnShow.v, this.indicesOnShow.f), !1);
		}
		jumpAfter(e) {
			clearTimeout(this.jumpTimeout), this.jumpTimeout = setTimeout(() => this.jump(), e);
		}
		search(e) {
			let t = RegExp("\\b" + e.trim() + "\\b", "i"), n = this.Reveal.getSlides().find((e) => t.test(e.innerText));
			return n ? this.Reveal.getIndices(n) : null;
		}
		cancel() {
			this.Reveal.slide(this.indicesOnShow.h, this.indicesOnShow.v, this.indicesOnShow.f), this.hide();
		}
		confirm() {
			this.jump(), this.hide();
		}
		destroy() {
			this.jumpInput.removeEventListener("input", this.onInput), this.jumpInput.removeEventListener("keydown", this.onKeyDown), this.jumpInput.removeEventListener("blur", this.onBlur), this.element.remove();
		}
		onKeyDown(e) {
			e.keyCode === 13 ? this.confirm() : e.keyCode === 27 && (this.cancel(), e.stopImmediatePropagation());
		}
		onInput(e) {
			this.jumpAfter(200);
		}
		onBlur() {
			setTimeout(() => this.hide(), 1);
		}
	}, D$3 = (e) => {
		let t = e.match(/^#([0-9a-f]{3})$/i);
		if (t && t[1]) {
			let e = t[1];
			return {
				r: parseInt(e.charAt(0), 16) * 17,
				g: parseInt(e.charAt(1), 16) * 17,
				b: parseInt(e.charAt(2), 16) * 17
			};
		}
		let n = e.match(/^#([0-9a-f]{6})$/i);
		if (n && n[1]) {
			let e = n[1];
			return {
				r: parseInt(e.slice(0, 2), 16),
				g: parseInt(e.slice(2, 4), 16),
				b: parseInt(e.slice(4, 6), 16)
			};
		}
		let r = e.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
		if (r) return {
			r: parseInt(r[1], 10),
			g: parseInt(r[2], 10),
			b: parseInt(r[3], 10)
		};
		let i = e.match(/^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d]+|[\d]*.[\d]+)\s*\)$/i);
		return i ? {
			r: parseInt(i[1], 10),
			g: parseInt(i[2], 10),
			b: parseInt(i[3], 10),
			a: parseFloat(i[4])
		} : null;
	}, ie$2 = (e) => (typeof e == "string" && (e = D$3(e)), e ? (e.r * 299 + e.g * 587 + e.b * 114) / 1e3 : null), ae$2 = class {
		constructor(e) {
			this.Reveal = e;
		}
		render() {
			this.element = document.createElement("div"), this.element.className = "backgrounds", this.Reveal.getRevealElement().appendChild(this.element);
		}
		create() {
			this.element.innerHTML = "", this.element.classList.add("no-transition"), this.Reveal.getHorizontalSlides().forEach((e) => {
				let n = this.createBackground(e, this.element);
				t$4(e, "section").forEach((e) => {
					this.createBackground(e, n), n.classList.add("stack");
				});
			}), this.Reveal.getConfig().parallaxBackgroundImage ? (this.element.style.backgroundImage = "url(\"" + this.Reveal.getConfig().parallaxBackgroundImage + "\")", this.element.style.backgroundSize = this.Reveal.getConfig().parallaxBackgroundSize, this.element.style.backgroundRepeat = this.Reveal.getConfig().parallaxBackgroundRepeat, this.element.style.backgroundPosition = this.Reveal.getConfig().parallaxBackgroundPosition, setTimeout(() => {
				this.Reveal.getRevealElement().classList.add("has-parallax-background");
			}, 1)) : (this.element.style.backgroundImage = "", this.Reveal.getRevealElement().classList.remove("has-parallax-background"));
		}
		createBackground(e, t) {
			let n = document.createElement("div");
			n.className = "slide-background " + e.className.replace(/present|past|future/, "");
			let r = document.createElement("div");
			return r.className = "slide-background-content", n.appendChild(r), t.appendChild(n), e.slideBackgroundElement = n, e.slideBackgroundContentElement = r, this.sync(e), n;
		}
		sync(e) {
			let t = e.slideBackgroundElement, n = e.slideBackgroundContentElement, r = {
				background: e.getAttribute("data-background"),
				backgroundSize: e.getAttribute("data-background-size"),
				backgroundImage: e.getAttribute("data-background-image"),
				backgroundVideo: e.getAttribute("data-background-video"),
				backgroundIframe: e.getAttribute("data-background-iframe"),
				backgroundColor: e.getAttribute("data-background-color"),
				backgroundGradient: e.getAttribute("data-background-gradient"),
				backgroundRepeat: e.getAttribute("data-background-repeat"),
				backgroundPosition: e.getAttribute("data-background-position"),
				backgroundTransition: e.getAttribute("data-background-transition"),
				backgroundOpacity: e.getAttribute("data-background-opacity")
			}, i = e.hasAttribute("data-preload");
			e.classList.remove("has-dark-background"), e.classList.remove("has-light-background"), t.removeAttribute("data-loaded"), t.removeAttribute("data-background-hash"), t.removeAttribute("data-background-size"), t.removeAttribute("data-background-transition"), t.style.backgroundColor = "", n.style.backgroundSize = "", n.style.backgroundRepeat = "", n.style.backgroundPosition = "", n.style.backgroundImage = "", n.style.opacity = "", n.innerHTML = "", r.background && (/^(http|file|\/\/)/gi.test(r.background) || /\.(svg|png|jpg|jpeg|gif|bmp|webp)([?#\s]|$)/gi.test(r.background) ? e.setAttribute("data-background-image", r.background) : t.style.background = r.background), (r.background || r.backgroundColor || r.backgroundGradient || r.backgroundImage || r.backgroundVideo || r.backgroundIframe) && t.setAttribute("data-background-hash", r.background + r.backgroundSize + r.backgroundImage + r.backgroundVideo + r.backgroundIframe + r.backgroundColor + r.backgroundGradient + r.backgroundRepeat + r.backgroundPosition + r.backgroundTransition + r.backgroundOpacity), r.backgroundSize && t.setAttribute("data-background-size", r.backgroundSize), r.backgroundColor && (t.style.backgroundColor = r.backgroundColor), r.backgroundGradient && (t.style.backgroundImage = r.backgroundGradient), r.backgroundTransition && t.setAttribute("data-background-transition", r.backgroundTransition), i && t.setAttribute("data-preload", ""), r.backgroundSize && (n.style.backgroundSize = r.backgroundSize), r.backgroundRepeat && (n.style.backgroundRepeat = r.backgroundRepeat), r.backgroundPosition && (n.style.backgroundPosition = r.backgroundPosition), r.backgroundOpacity && (n.style.opacity = r.backgroundOpacity);
			let a = this.getContrastClass(e);
			typeof a == "string" && e.classList.add(a);
		}
		getContrastClass(e) {
			let t = e.slideBackgroundElement, n = e.getAttribute("data-background-color");
			if (!n || !D$3(n)) {
				let e = window.getComputedStyle(t);
				e && e.backgroundColor && (n = e.backgroundColor);
			}
			if (n) {
				let e = D$3(n);
				if (e && e.a !== 0) return ie$2(n) < 128 ? "has-dark-background" : "has-light-background";
			}
			return null;
		}
		bubbleSlideContrastClassToElement(e, t) {
			["has-light-background", "has-dark-background"].forEach((n) => {
				e.classList.contains(n) ? t.classList.add(n) : t.classList.remove(n);
			}, this);
		}
		update(e = !1) {
			let n = this.Reveal.getConfig(), r = this.Reveal.getCurrentSlide(), i = this.Reveal.getIndices(), a = null, o = n.rtl ? "future" : "past", s = n.rtl ? "past" : "future";
			if (Array.from(this.element.childNodes).forEach((n, r) => {
				n.classList.remove("past", "present", "future"), r < i.h ? n.classList.add(o) : r > i.h ? n.classList.add(s) : (n.classList.add("present"), a = n), (e || r === i.h) && t$4(n, ".slide-background").forEach((e, t) => {
					e.classList.remove("past", "present", "future");
					let n = typeof i.v == "number" ? i.v : 0;
					t < n ? e.classList.add("past") : t > n ? e.classList.add("future") : (e.classList.add("present"), r === i.h && (a = e));
				});
			}), this.previousBackground && !this.previousBackground.closest("body") && (this.previousBackground = null), a && this.previousBackground) {
				let e = this.previousBackground.getAttribute("data-background-hash"), t = a.getAttribute("data-background-hash");
				if (t && t === e && a !== this.previousBackground) {
					this.element.classList.add("no-transition");
					let e = a.querySelector("video"), t = this.previousBackground.querySelector("video");
					if (e && t) {
						let n = e.parentNode;
						t.parentNode.appendChild(e), n.appendChild(t);
					}
				}
			}
			let c = a !== this.previousBackground;
			if (c && this.previousBackground && this.Reveal.slideContent.stopEmbeddedContent(this.previousBackground, { unloadIframes: !this.Reveal.slideContent.shouldPreload(this.previousBackground) }), c && a) {
				this.Reveal.slideContent.startEmbeddedContent(a);
				let e = a.querySelector(".slide-background-content");
				if (e) {
					let t = e.style.backgroundImage || "";
					/\.gif/i.test(t) && (e.style.backgroundImage = "", window.getComputedStyle(e).opacity, e.style.backgroundImage = t);
				}
				this.previousBackground = a;
			}
			r && this.bubbleSlideContrastClassToElement(r, this.Reveal.getRevealElement()), setTimeout(() => {
				this.element.classList.remove("no-transition");
			}, 10);
		}
		updateParallax() {
			let e = this.Reveal.getIndices();
			if (this.Reveal.getConfig().parallaxBackgroundImage) {
				let t = this.Reveal.getHorizontalSlides(), n = this.Reveal.getVerticalSlides(), r = this.element.style.backgroundSize.split(" "), i, a;
				r.length === 1 ? i = a = parseInt(r[0], 10) : (i = parseInt(r[0], 10), a = parseInt(r[1], 10));
				let o = this.element.offsetWidth, s = t.length, c, l;
				c = typeof this.Reveal.getConfig().parallaxBackgroundHorizontal == "number" ? this.Reveal.getConfig().parallaxBackgroundHorizontal : s > 1 ? (i - o) / (s - 1) : 0, l = c * e.h * -1;
				let u = this.element.offsetHeight, d = n.length, f, p;
				f = typeof this.Reveal.getConfig().parallaxBackgroundVertical == "number" ? this.Reveal.getConfig().parallaxBackgroundVertical : (a - u) / (d - 1), p = d > 0 ? f * e.v : 0, this.element.style.backgroundPosition = l + "px " + -p + "px";
			}
		}
		destroy() {
			this.element.remove();
		}
	}, O$3 = 0, oe$2 = class {
		constructor(e) {
			this.Reveal = e;
		}
		run(e, t) {
			this.reset();
			let n = this.Reveal.getSlides(), r = n.indexOf(t), i = n.indexOf(e);
			if (e && t && e.hasAttribute("data-auto-animate") && t.hasAttribute("data-auto-animate") && e.getAttribute("data-auto-animate-id") === t.getAttribute("data-auto-animate-id") && !(r > i ? t : e).hasAttribute("data-auto-animate-restart")) {
				this.autoAnimateStyleSheet = this.autoAnimateStyleSheet || l$3();
				let n = this.getAutoAnimateOptions(t);
				e.dataset.autoAnimate = "pending", t.dataset.autoAnimate = "pending", n.slideDirection = r > i ? "forward" : "backward";
				let a = e.style.display === "none";
				a && (e.style.display = this.Reveal.getConfig().display);
				let o = this.getAutoAnimatableElements(e, t).map((e) => this.autoAnimateElements(e.from, e.to, e.options || {}, n, O$3++));
				if (a && (e.style.display = "none"), t.dataset.autoAnimateUnmatched !== "false" && this.Reveal.getConfig().autoAnimateUnmatched === !0) {
					let e = n.duration * .8, r = n.duration * .2;
					this.getUnmatchedAutoAnimateElements(t).forEach((e) => {
						let t = this.getAutoAnimateOptions(e, n), r = "unmatched";
						(t.duration !== n.duration || t.delay !== n.delay) && (r = "unmatched-" + O$3++, o.push(`[data-auto-animate="running"] [data-auto-animate-target="${r}"] { transition: opacity ${t.duration}s ease ${t.delay}s; }`)), e.dataset.autoAnimateTarget = r;
					}, this), o.push(`[data-auto-animate="running"] [data-auto-animate-target="unmatched"] { transition: opacity ${e}s ease ${r}s; }`);
				}
				this.autoAnimateStyleSheet.innerHTML = o.join(""), requestAnimationFrame(() => {
					this.autoAnimateStyleSheet && (getComputedStyle(this.autoAnimateStyleSheet).fontWeight, t.dataset.autoAnimate = "running");
				}), this.Reveal.dispatchEvent({
					type: "autoanimate",
					data: {
						fromSlide: e,
						toSlide: t,
						sheet: this.autoAnimateStyleSheet
					}
				});
			}
		}
		reset() {
			t$4(this.Reveal.getRevealElement(), "[data-auto-animate]:not([data-auto-animate=\"\"])").forEach((e) => {
				e.dataset.autoAnimate = "";
			}), t$4(this.Reveal.getRevealElement(), "[data-auto-animate-target]").forEach((e) => {
				delete e.dataset.autoAnimateTarget;
			}), this.autoAnimateStyleSheet && this.autoAnimateStyleSheet.parentNode && (this.autoAnimateStyleSheet.parentNode.removeChild(this.autoAnimateStyleSheet), this.autoAnimateStyleSheet = null);
		}
		autoAnimateElements(e, t, n, r, i) {
			e.dataset.autoAnimateTarget = "", t.dataset.autoAnimateTarget = i;
			let a = this.getAutoAnimateOptions(t, r);
			n.delay !== void 0 && (a.delay = n.delay), n.duration !== void 0 && (a.duration = n.duration), n.easing !== void 0 && (a.easing = n.easing);
			let o = this.getAutoAnimatableProperties("from", e, n), s = this.getAutoAnimatableProperties("to", t, n);
			if (t.classList.contains("fragment") && delete s.styles.opacity, n.translate !== !1 || n.scale !== !1) {
				let e = this.Reveal.getScale(), t = {
					x: (o.x - s.x) / e,
					y: (o.y - s.y) / e,
					scaleX: o.width / s.width,
					scaleY: o.height / s.height
				};
				t.x = Math.round(t.x * 1e3) / 1e3, t.y = Math.round(t.y * 1e3) / 1e3, t.scaleX = Math.round(t.scaleX * 1e3) / 1e3, t.scaleX = Math.round(t.scaleX * 1e3) / 1e3;
				let r = n.translate !== !1 && (t.x !== 0 || t.y !== 0), i = n.scale !== !1 && (t.scaleX !== 0 || t.scaleY !== 0);
				if (r || i) {
					let e = [];
					r && e.push(`translate(${t.x}px, ${t.y}px)`), i && e.push(`scale(${t.scaleX}, ${t.scaleY})`), o.styles.transform = e.join(" "), o.styles["transform-origin"] = "top left", s.styles.transform = "none";
				}
			}
			for (let e in s.styles) {
				let t = s.styles[e], n = o.styles[e];
				t === n ? delete s.styles[e] : (t.explicitValue === !0 && (s.styles[e] = t.value), n.explicitValue === !0 && (o.styles[e] = n.value));
			}
			let c = "", l = Object.keys(s.styles);
			if (l.length > 0) {
				o.styles.transition = "none", s.styles.transition = `all ${a.duration}s ${a.easing} ${a.delay}s`, s.styles["transition-property"] = l.join(", "), s.styles["will-change"] = l.join(", ");
				let e = Object.keys(o.styles).map((e) => e + ": " + o.styles[e] + " !important;").join(""), t = Object.keys(s.styles).map((e) => e + ": " + s.styles[e] + " !important;").join("");
				c = "[data-auto-animate-target=\"" + i + "\"] {" + e + "}[data-auto-animate=\"running\"] [data-auto-animate-target=\"" + i + "\"] {" + t + "}";
			}
			return c;
		}
		getAutoAnimateOptions(t, n) {
			let r = {
				easing: this.Reveal.getConfig().autoAnimateEasing,
				duration: this.Reveal.getConfig().autoAnimateDuration,
				delay: 0
			};
			if (r = e$5(r, n), t.parentNode) {
				let e = o$3(t.parentNode, "[data-auto-animate-target]");
				e && (r = this.getAutoAnimateOptions(e, r));
			}
			return t.dataset.autoAnimateEasing && (r.easing = t.dataset.autoAnimateEasing), t.dataset.autoAnimateDuration && (r.duration = parseFloat(t.dataset.autoAnimateDuration)), t.dataset.autoAnimateDelay && (r.delay = parseFloat(t.dataset.autoAnimateDelay)), r;
		}
		getAutoAnimatableProperties(e, t, n) {
			let r = this.Reveal.getConfig(), i = { styles: [] };
			if (n.translate !== !1 || n.scale !== !1) {
				let e;
				if (typeof n.measure == "function") e = n.measure(t);
				else if (r.center) e = t.getBoundingClientRect();
				else {
					let n = this.Reveal.getScale();
					e = {
						x: t.offsetLeft * n,
						y: t.offsetTop * n,
						width: t.offsetWidth * n,
						height: t.offsetHeight * n
					};
				}
				i.x = e.x, i.y = e.y, i.width = e.width, i.height = e.height;
			}
			let a = getComputedStyle(t);
			return (n.styles || r.autoAnimateStyles).forEach((t) => {
				let n;
				typeof t == "string" && (t = { property: t }), t.from !== void 0 && e === "from" ? n = {
					value: t.from,
					explicitValue: !0
				} : t.to !== void 0 && e === "to" ? n = {
					value: t.to,
					explicitValue: !0
				} : (t.property === "line-height" && (n = parseFloat(a["line-height"]) / parseFloat(a["font-size"])), isNaN(n) && (n = a[t.property])), n !== "" && (i.styles[t.property] = n);
			}), i;
		}
		getAutoAnimatableElements(e, t) {
			let n = (typeof this.Reveal.getConfig().autoAnimateMatcher == "function" ? this.Reveal.getConfig().autoAnimateMatcher : this.getAutoAnimatePairs).call(this, e, t), r = [];
			return n.filter((e, t) => {
				if (r.indexOf(e.to) === -1) return r.push(e.to), !0;
			});
		}
		getAutoAnimatePairs(e, t) {
			let n = [], r = "h1, h2, h3, h4, h5, h6, p, li";
			return this.findAutoAnimateMatches(n, e, t, "[data-id]", (e) => e.nodeName + ":::" + e.getAttribute("data-id")), this.findAutoAnimateMatches(n, e, t, r, (e) => e.nodeName + ":::" + e.textContent.trim()), this.findAutoAnimateMatches(n, e, t, "img, video, iframe", (e) => e.nodeName + ":::" + (e.getAttribute("src") || e.getAttribute("data-src"))), this.findAutoAnimateMatches(n, e, t, "pre", (e) => e.nodeName + ":::" + e.textContent.trim()), n.forEach((e) => {
				a$3(e.from, r) ? e.options = { scale: !1 } : a$3(e.from, "pre") && (e.options = {
					scale: !1,
					styles: ["width", "height"]
				}, this.findAutoAnimateMatches(n, e.from, e.to, ".hljs .hljs-ln-code", (e) => e.textContent, {
					scale: !1,
					styles: [],
					measure: this.getLocalBoundingBox.bind(this)
				}), this.findAutoAnimateMatches(n, e.from, e.to, ".hljs .hljs-ln-numbers[data-line-number]", (e) => e.getAttribute("data-line-number"), {
					scale: !1,
					styles: ["width"],
					measure: this.getLocalBoundingBox.bind(this)
				}));
			}, this), n;
		}
		getLocalBoundingBox(e) {
			let t = this.Reveal.getScale();
			return {
				x: Math.round(e.offsetLeft * t * 100) / 100,
				y: Math.round(e.offsetTop * t * 100) / 100,
				width: Math.round(e.offsetWidth * t * 100) / 100,
				height: Math.round(e.offsetHeight * t * 100) / 100
			};
		}
		findAutoAnimateMatches(e, t, n, r, i, a) {
			let o = {}, s = {};
			[].slice.call(t.querySelectorAll(r)).forEach((e, t) => {
				let n = i(e);
				typeof n == "string" && n.length && (o[n] = o[n] || [], o[n].push(e));
			}), [].slice.call(n.querySelectorAll(r)).forEach((t, n) => {
				let r = i(t);
				s[r] = s[r] || [], s[r].push(t);
				let c;
				if (o[r]) {
					let e = s[r].length - 1, t = o[r].length - 1;
					o[r][e] ? (c = o[r][e], o[r][e] = null) : o[r][t] && (c = o[r][t], o[r][t] = null);
				}
				c && e.push({
					from: c,
					to: t,
					options: a
				});
			});
		}
		getUnmatchedAutoAnimateElements(e) {
			return [].slice.call(e.children).reduce((e, t) => {
				let n = t.querySelector("[data-auto-animate-target]");
				return !t.hasAttribute("data-auto-animate-target") && !n && e.push(t), t.querySelector("[data-auto-animate-target]") && (e = e.concat(this.getUnmatchedAutoAnimateElements(t))), e;
			}, []);
		}
	}, k$3 = 500, A$3 = 4, se$2 = 6, j$3 = 8, ce$2 = class {
		constructor(e) {
			this.Reveal = e, this.active = !1, this.activatedCallbacks = [], this.onScroll = this.onScroll.bind(this);
		}
		activate() {
			if (this.active) return;
			let e = this.Reveal.getState();
			this.active = !0, this.slideHTMLBeforeActivation = this.Reveal.getSlidesElement().innerHTML;
			let n = t$4(this.Reveal.getRevealElement(), w$3), r = t$4(this.Reveal.getRevealElement(), T$3);
			this.viewportElement.classList.add("loading-scroll-mode", "reveal-scroll");
			let i, a = window.getComputedStyle(this.viewportElement);
			a && a.background && (i = a.background);
			let o = [], s = n[0].parentNode, c, l = (e, t, n, a) => {
				let s;
				if (c && this.Reveal.shouldAutoAnimateBetween(c, e)) s = document.createElement("div"), s.className = "scroll-page-content scroll-auto-animate-page", s.style.display = "none", c.closest(".scroll-page-content").parentNode.appendChild(s);
				else {
					let e = document.createElement("div");
					if (e.className = "scroll-page", o.push(e), a && r.length > t) {
						let n = r[t], a = window.getComputedStyle(n);
						a && a.background ? e.style.background = a.background : i && (e.style.background = i);
					} else i && (e.style.background = i);
					let n = document.createElement("div");
					n.className = "scroll-page-sticky", e.appendChild(n), s = document.createElement("div"), s.className = "scroll-page-content", n.appendChild(s);
				}
				s.appendChild(e), e.classList.remove("past", "future"), e.setAttribute("data-index-h", t), e.setAttribute("data-index-v", n), e.slideBackgroundElement && (e.slideBackgroundElement.remove("past", "future"), s.insertBefore(e.slideBackgroundElement, e)), c = e;
			};
			n.forEach((e, t) => {
				this.Reveal.isVerticalStack(e) ? e.querySelectorAll("section").forEach((e, n) => {
					l(e, t, n, !0);
				}) : l(e, t, 0);
			}, this), this.createProgressBar(), t$4(this.Reveal.getRevealElement(), ".stack").forEach((e) => e.remove()), o.forEach((e) => s.appendChild(e)), this.Reveal.slideContent.layout(this.Reveal.getSlidesElement()), this.Reveal.layout(), this.Reveal.setState(e), this.activatedCallbacks.forEach((e) => e()), this.activatedCallbacks = [], this.restoreScrollPosition(), this.viewportElement.classList.remove("loading-scroll-mode"), this.viewportElement.addEventListener("scroll", this.onScroll, { passive: !0 });
		}
		deactivate() {
			if (!this.active) return;
			let e = this.Reveal.getState();
			this.active = !1, this.viewportElement.removeEventListener("scroll", this.onScroll), this.viewportElement.classList.remove("reveal-scroll"), this.removeProgressBar(), this.Reveal.getSlidesElement().innerHTML = this.slideHTMLBeforeActivation, this.Reveal.sync(), this.Reveal.setState(e), this.slideHTMLBeforeActivation = null;
		}
		toggle(e) {
			typeof e == "boolean" ? e ? this.activate() : this.deactivate() : this.isActive() ? this.deactivate() : this.activate();
		}
		isActive() {
			return this.active;
		}
		createProgressBar() {
			this.progressBar = document.createElement("div"), this.progressBar.className = "scrollbar", this.progressBarInner = document.createElement("div"), this.progressBarInner.className = "scrollbar-inner", this.progressBar.appendChild(this.progressBarInner), this.progressBarPlayhead = document.createElement("div"), this.progressBarPlayhead.className = "scrollbar-playhead", this.progressBarInner.appendChild(this.progressBarPlayhead), this.viewportElement.insertBefore(this.progressBar, this.viewportElement.firstChild);
			let e = (e) => {
				let t = (e.clientY - this.progressBarInner.getBoundingClientRect().top) / this.progressBarHeight;
				t = Math.max(Math.min(t, 1), 0), this.viewportElement.scrollTop = t * (this.viewportElement.scrollHeight - this.viewportElement.offsetHeight);
			}, t = (n) => {
				this.draggingProgressBar = !1, this.showProgressBar(), document.removeEventListener("mousemove", e), document.removeEventListener("mouseup", t);
			};
			this.progressBarInner.addEventListener("mousedown", (n) => {
				n.preventDefault(), this.draggingProgressBar = !0, document.addEventListener("mousemove", e), document.addEventListener("mouseup", t), e(n);
			});
		}
		removeProgressBar() {
			this.progressBar && (this.progressBar.remove(), this.progressBar = null);
		}
		layout() {
			this.isActive() && (this.syncPages(), this.syncScrollPosition());
		}
		syncPages() {
			let e = this.Reveal.getConfig(), t = this.Reveal.getComputedSlideSize(window.innerWidth, window.innerHeight), n = this.Reveal.getScale(), r = e.scrollLayout === "compact", i = this.viewportElement.offsetHeight, a = t.height * n, o = r ? a : i;
			this.scrollTriggerHeight = r ? a : i, this.viewportElement.style.setProperty("--page-height", o + "px"), this.viewportElement.style.scrollSnapType = typeof e.scrollSnap == "string" ? `y ${e.scrollSnap}` : "", this.slideTriggers = [], this.pages = Array.from(this.Reveal.getRevealElement().querySelectorAll(".scroll-page")).map((n) => {
				let a = this.createPage({
					pageElement: n,
					slideElement: n.querySelector("section"),
					stickyElement: n.querySelector(".scroll-page-sticky"),
					contentElement: n.querySelector(".scroll-page-content"),
					backgroundElement: n.querySelector(".slide-background"),
					autoAnimateElements: n.querySelectorAll(".scroll-auto-animate-page"),
					autoAnimatePages: []
				});
				a.pageElement.style.setProperty("--slide-height", e.center === !0 ? "auto" : t.height + "px"), this.slideTriggers.push({
					page: a,
					activate: () => this.activatePage(a),
					deactivate: () => this.deactivatePage(a)
				}), this.createFragmentTriggersForPage(a), a.autoAnimateElements.length > 0 && this.createAutoAnimateTriggersForPage(a);
				let s = Math.max(a.scrollTriggers.length - 1, 0);
				s += a.autoAnimatePages.reduce((e, t) => e + Math.max(t.scrollTriggers.length - 1, 0), a.autoAnimatePages.length), a.pageElement.querySelectorAll(".scroll-snap-point").forEach((e) => e.remove());
				for (let e = 0; e < s + 1; e++) {
					let t = document.createElement("div");
					t.className = "scroll-snap-point", t.style.height = this.scrollTriggerHeight + "px", t.style.scrollSnapAlign = r ? "center" : "start", a.pageElement.appendChild(t), e === 0 && (t.style.marginTop = -this.scrollTriggerHeight + "px");
				}
				return r && a.scrollTriggers.length > 0 ? (a.pageHeight = i, a.pageElement.style.setProperty("--page-height", i + "px")) : (a.pageHeight = o, a.pageElement.style.removeProperty("--page-height")), a.scrollPadding = this.scrollTriggerHeight * s, a.totalHeight = a.pageHeight + a.scrollPadding, a.pageElement.style.setProperty("--page-scroll-padding", a.scrollPadding + "px"), s > 0 ? (a.stickyElement.style.position = "sticky", a.stickyElement.style.top = Math.max((i - a.pageHeight) / 2, 0) + "px") : (a.stickyElement.style.position = "relative", a.pageElement.style.scrollSnapAlign = a.pageHeight < i ? "center" : "start"), a;
			}), this.setTriggerRanges(), this.viewportElement.setAttribute("data-scrollbar", e.scrollProgress), e.scrollProgress && this.totalScrollTriggerCount > 1 ? (this.progressBar || this.createProgressBar(), this.syncProgressBar()) : this.removeProgressBar();
		}
		setTriggerRanges() {
			this.totalScrollTriggerCount = this.slideTriggers.reduce((e, t) => e + Math.max(t.page.scrollTriggers.length, 1), 0);
			let e = 0;
			this.slideTriggers.forEach((t, n) => {
				t.range = [e, e + Math.max(t.page.scrollTriggers.length, 1) / this.totalScrollTriggerCount];
				let r = (t.range[1] - t.range[0]) / t.page.scrollTriggers.length;
				t.page.scrollTriggers.forEach((t, n) => {
					t.range = [e + n * r, e + (n + 1) * r];
				}), e = t.range[1];
			}), this.slideTriggers[this.slideTriggers.length - 1].range[1] = 1;
		}
		createFragmentTriggersForPage(e, t) {
			t = t || e.slideElement;
			let n = this.Reveal.fragments.sort(t.querySelectorAll(".fragment"), !0);
			return n.length && (e.fragments = this.Reveal.fragments.sort(t.querySelectorAll(".fragment:not(.disabled)")), e.scrollTriggers.push({ activate: () => {
				this.Reveal.fragments.update(-1, e.fragments, t);
			} }), n.forEach((n, r) => {
				e.scrollTriggers.push({ activate: () => {
					this.Reveal.fragments.update(r, e.fragments, t);
				} });
			})), e.scrollTriggers.length;
		}
		createAutoAnimateTriggersForPage(e) {
			e.autoAnimateElements.length > 0 && this.slideTriggers.push(...Array.from(e.autoAnimateElements).map((t, n) => {
				let r = this.createPage({
					slideElement: t.querySelector("section"),
					contentElement: t,
					backgroundElement: t.querySelector(".slide-background")
				});
				return this.createFragmentTriggersForPage(r, r.slideElement), e.autoAnimatePages.push(r), {
					page: r,
					activate: () => this.activatePage(r),
					deactivate: () => this.deactivatePage(r)
				};
			}));
		}
		createPage(e) {
			return e.scrollTriggers = [], e.indexh = parseInt(e.slideElement.getAttribute("data-index-h"), 10), e.indexv = parseInt(e.slideElement.getAttribute("data-index-v"), 10), e;
		}
		syncProgressBar() {
			this.progressBarInner.querySelectorAll(".scrollbar-slide").forEach((e) => e.remove());
			let e = this.viewportElement.scrollHeight, t = this.viewportElement.offsetHeight, n = t / e;
			this.progressBarHeight = this.progressBarInner.offsetHeight, this.playheadHeight = Math.max(n * this.progressBarHeight, j$3), this.progressBarScrollableHeight = this.progressBarHeight - this.playheadHeight;
			let r = t / e * this.progressBarHeight, i = Math.min(r / 8, A$3);
			this.progressBarPlayhead.style.height = this.playheadHeight - i + "px", r > se$2 ? this.slideTriggers.forEach((e) => {
				let { page: t } = e;
				t.progressBarSlide = document.createElement("div"), t.progressBarSlide.className = "scrollbar-slide", t.progressBarSlide.style.top = e.range[0] * this.progressBarHeight + "px", t.progressBarSlide.style.height = (e.range[1] - e.range[0]) * this.progressBarHeight - i + "px", t.progressBarSlide.classList.toggle("has-triggers", t.scrollTriggers.length > 0), this.progressBarInner.appendChild(t.progressBarSlide), t.scrollTriggerElements = t.scrollTriggers.map((n, r) => {
					let a = document.createElement("div");
					return a.className = "scrollbar-trigger", a.style.top = (n.range[0] - e.range[0]) * this.progressBarHeight + "px", a.style.height = (n.range[1] - n.range[0]) * this.progressBarHeight - i + "px", t.progressBarSlide.appendChild(a), r === 0 && (a.style.display = "none"), a;
				});
			}) : this.pages.forEach((e) => e.progressBarSlide = null);
		}
		syncScrollPosition() {
			let e = this.viewportElement.offsetHeight, t = e / this.viewportElement.scrollHeight, n = this.viewportElement.scrollTop, r = this.viewportElement.scrollHeight - e, i = Math.max(Math.min(n / r, 1), 0), a = Math.max(Math.min((n + e / 2) / this.viewportElement.scrollHeight, 1), 0), o;
			this.slideTriggers.forEach((e) => {
				let { page: n } = e;
				i >= e.range[0] - t * 2 && i <= e.range[1] + t * 2 && !n.loaded ? (n.loaded = !0, this.Reveal.slideContent.load(n.slideElement)) : n.loaded && (n.loaded = !1, this.Reveal.slideContent.unload(n.slideElement)), i >= e.range[0] && i <= e.range[1] ? (this.activateTrigger(e), o = e.page) : e.active && this.deactivateTrigger(e);
			}), o && o.scrollTriggers.forEach((e) => {
				a >= e.range[0] && a <= e.range[1] ? this.activateTrigger(e) : e.active && this.deactivateTrigger(e);
			}), this.setProgressBarValue(n / (this.viewportElement.scrollHeight - e));
		}
		setProgressBarValue(e) {
			this.progressBar && (this.progressBarPlayhead.style.transform = `translateY(${e * this.progressBarScrollableHeight}px)`, this.getAllPages().filter((e) => e.progressBarSlide).forEach((e) => {
				e.progressBarSlide.classList.toggle("active", e.active === !0), e.scrollTriggers.forEach((t, n) => {
					e.scrollTriggerElements[n].classList.toggle("active", e.active === !0 && t.active === !0);
				});
			}), this.showProgressBar());
		}
		showProgressBar() {
			this.progressBar.classList.add("visible"), clearTimeout(this.hideProgressBarTimeout), this.Reveal.getConfig().scrollProgress === "auto" && !this.draggingProgressBar && (this.hideProgressBarTimeout = setTimeout(() => {
				this.progressBar && this.progressBar.classList.remove("visible");
			}, k$3));
		}
		prev() {
			this.viewportElement.scrollTop -= this.scrollTriggerHeight;
		}
		next() {
			this.viewportElement.scrollTop += this.scrollTriggerHeight;
		}
		scrollToSlide(e) {
			if (!this.active) this.activatedCallbacks.push(() => this.scrollToSlide(e));
			else {
				let t = this.getScrollTriggerBySlide(e);
				t && (this.viewportElement.scrollTop = t.range[0] * (this.viewportElement.scrollHeight - this.viewportElement.offsetHeight));
			}
		}
		storeScrollPosition() {
			clearTimeout(this.storeScrollPositionTimeout), this.storeScrollPositionTimeout = setTimeout(() => {
				sessionStorage.setItem("reveal-scroll-top", this.viewportElement.scrollTop), sessionStorage.setItem("reveal-scroll-origin", location.origin + location.pathname), this.storeScrollPositionTimeout = null;
			}, 50);
		}
		restoreScrollPosition() {
			let e = sessionStorage.getItem("reveal-scroll-top"), t = sessionStorage.getItem("reveal-scroll-origin");
			e && t === location.origin + location.pathname && (this.viewportElement.scrollTop = parseInt(e, 10));
		}
		activatePage(e) {
			if (!e.active) {
				e.active = !0;
				let { slideElement: t, backgroundElement: n, contentElement: r, indexh: i, indexv: a } = e;
				r.style.display = "block", t.classList.add("present"), n && n.classList.add("present"), this.Reveal.setCurrentScrollPage(t, i, a), this.Reveal.backgrounds.bubbleSlideContrastClassToElement(t, this.viewportElement), Array.from(r.parentNode.querySelectorAll(".scroll-page-content")).forEach((e) => {
					e !== r && (e.style.display = "none");
				});
			}
		}
		deactivatePage(e) {
			e.active && (e.active = !1, e.slideElement && e.slideElement.classList.remove("present"), e.backgroundElement && e.backgroundElement.classList.remove("present"));
		}
		activateTrigger(e) {
			e.active || (e.active = !0, e.activate());
		}
		deactivateTrigger(e) {
			e.active && (e.active = !1, e.deactivate && e.deactivate());
		}
		getSlideByIndices(e, t) {
			let n = this.getAllPages().find((n) => n.indexh === e && n.indexv === t);
			return n ? n.slideElement : null;
		}
		getScrollTriggerBySlide(e) {
			return this.slideTriggers.find((t) => t.page.slideElement === e);
		}
		getAllPages() {
			return this.pages.flatMap((e) => [e, ...e.autoAnimatePages || []]);
		}
		onScroll() {
			this.syncScrollPosition(), this.storeScrollPosition();
		}
		get viewportElement() {
			return this.Reveal.getViewportElement();
		}
	};
	function M$3(e, t, n, r, i, a, o) {
		try {
			var s = e[a](o), c = s.value;
		} catch (e) {
			n(e);
			return;
		}
		s.done ? t(c) : Promise.resolve(c).then(r, i);
	}
	function N$3(e) {
		return function() {
			var t = this, n = arguments;
			return new Promise(function(r, i) {
				var a = e.apply(t, n);
				function o(e) {
					M$3(a, r, i, o, s, "next", e);
				}
				function s(e) {
					M$3(a, r, i, o, s, "throw", e);
				}
				o(void 0);
			});
		};
	}
	var le$2 = class {
		constructor(e) {
			this.Reveal = e;
		}
		activate() {
			var e = this;
			return N$3(function* () {
				let n = e.Reveal.getConfig(), r = t$4(e.Reveal.getRevealElement(), C$3), i = n.slideNumber && /all|print/i.test(n.showSlideNumber), a = e.Reveal.getComputedSlideSize(window.innerWidth, window.innerHeight), o = Math.floor(a.width * (1 + n.margin)), s = Math.floor(a.height * (1 + n.margin)), c = a.width, u = a.height;
				yield new Promise(requestAnimationFrame), l$3("@page{size:" + o + "px " + s + "px; margin: 0px;}"), l$3(".reveal section>img, .reveal section>video, .reveal section>iframe{max-width: " + c + "px; max-height:" + u + "px}"), document.documentElement.classList.add("reveal-print", "print-pdf"), document.body.style.width = o + "px", document.body.style.height = s + "px";
				let d = e.Reveal.getViewportElement(), f;
				if (d) {
					let e = window.getComputedStyle(d);
					e && e.background && (f = e.background);
				}
				yield new Promise(requestAnimationFrame), e.Reveal.layoutSlideContents(c, u), yield new Promise(requestAnimationFrame);
				let p = r.map((e) => e.scrollHeight), m = [], h = r[0].parentNode, g = 1;
				r.forEach(function(e, r) {
					if (e.classList.contains("stack") === !1) {
						let a = (o - c) / 2, l = (s - u) / 2, d = p[r], h = Math.max(Math.ceil(d / s), 1);
						h = Math.min(h, n.pdfMaxPagesPerSlide), (h === 1 && n.center || e.classList.contains("center")) && (l = Math.max((s - d) / 2, 0));
						let _ = document.createElement("div");
						if (m.push(_), _.className = "pdf-page", _.style.height = (s + n.pdfPageHeightOffset) * h + "px", f && (_.style.background = f), _.appendChild(e), e.style.left = a + "px", e.style.top = l + "px", e.style.width = c + "px", this.Reveal.slideContent.layout(e), e.slideBackgroundElement && _.insertBefore(e.slideBackgroundElement, e), n.showNotes) {
							let t = this.Reveal.getSlideNotes(e);
							if (t) {
								let e = typeof n.showNotes == "string" ? n.showNotes : "inline", r = document.createElement("div");
								r.classList.add("speaker-notes"), r.classList.add("speaker-notes-pdf"), r.setAttribute("data-layout", e), r.innerHTML = t, e === "separate-page" ? m.push(r) : (r.style.left = "8px", r.style.bottom = "8px", r.style.width = o - 16 + "px", _.appendChild(r));
							}
						}
						if (i) {
							let e = document.createElement("div");
							e.classList.add("slide-number"), e.classList.add("slide-number-pdf"), e.innerHTML = g++, _.appendChild(e);
						}
						if (n.pdfSeparateFragments) {
							let e = this.Reveal.fragments.sort(_.querySelectorAll(".fragment"), !0), t;
							e.forEach(function(e, n) {
								t && t.forEach(function(e) {
									e.classList.remove("current-fragment");
								}), e.forEach(function(e) {
									e.classList.add("visible", "current-fragment");
								}, this);
								let r = _.cloneNode(!0);
								if (i) {
									let e = r.querySelector(".slide-number-pdf"), t = n + 1;
									e.innerHTML += "." + t;
								}
								m.push(r), t = e;
							}, this), e.forEach(function(e) {
								e.forEach(function(e) {
									e.classList.remove("visible", "current-fragment");
								});
							});
						} else t$4(_, ".fragment:not(.fade-out)").forEach(function(e) {
							e.classList.add("visible");
						});
					}
				}, e), yield new Promise(requestAnimationFrame), m.forEach((e) => h.appendChild(e)), e.Reveal.slideContent.layout(e.Reveal.getSlidesElement()), e.Reveal.dispatchEvent({ type: "pdf-ready" }), d.classList.remove("loading-scroll-mode");
			})();
		}
		isActive() {
			return this.Reveal.getConfig().view === "print";
		}
	}, ue$2 = class {
		constructor(e) {
			this.Reveal = e;
		}
		configure(e, t) {
			e.fragments === !1 ? this.disable() : t.fragments === !1 && this.enable();
		}
		disable() {
			t$4(this.Reveal.getSlidesElement(), ".fragment").forEach((e) => {
				e.classList.add("visible"), e.classList.remove("current-fragment");
			});
		}
		enable() {
			t$4(this.Reveal.getSlidesElement(), ".fragment").forEach((e) => {
				e.classList.remove("visible"), e.classList.remove("current-fragment");
			});
		}
		availableRoutes() {
			let e = this.Reveal.getCurrentSlide();
			if (e && this.Reveal.getConfig().fragments) {
				let t = e.querySelectorAll(".fragment:not(.disabled)"), n = e.querySelectorAll(".fragment:not(.disabled):not(.visible)");
				return {
					prev: t.length - n.length > 0,
					next: !!n.length
				};
			} else return {
				prev: !1,
				next: !1
			};
		}
		sort(e, t = !1) {
			e = Array.from(e);
			let n = [], r = [], i = [];
			e.forEach((e) => {
				if (e.hasAttribute("data-fragment-index")) {
					let t = parseInt(e.getAttribute("data-fragment-index"), 10);
					n[t] || (n[t] = []), n[t].push(e);
				} else r.push([e]);
			}), n = n.concat(r);
			let a = 0;
			return n.forEach((e) => {
				e.forEach((e) => {
					i.push(e), e.setAttribute("data-fragment-index", a);
				}), a++;
			}), t === !0 ? n : i;
		}
		sortAll() {
			this.Reveal.getHorizontalSlides().forEach((e) => {
				let n = t$4(e, "section");
				n.forEach((e, t) => {
					this.sort(e.querySelectorAll(".fragment"));
				}, this), n.length === 0 && this.sort(e.querySelectorAll(".fragment"));
			});
		}
		update(e, t, n = this.Reveal.getCurrentSlide()) {
			let r = {
				shown: [],
				hidden: []
			};
			if (n && this.Reveal.getConfig().fragments && (t = t || this.sort(n.querySelectorAll(".fragment")), t.length)) {
				let i = 0;
				if (typeof e != "number") {
					let t = this.sort(n.querySelectorAll(".fragment.visible")).pop();
					t && (e = parseInt(t.getAttribute("data-fragment-index") || 0, 10));
				}
				Array.from(t).forEach((t, n) => {
					if (t.hasAttribute("data-fragment-index") && (n = parseInt(t.getAttribute("data-fragment-index"), 10)), i = Math.max(i, n), n <= e) {
						let i = t.classList.contains("visible");
						t.classList.add("visible"), t.classList.remove("current-fragment"), n === e && (this.Reveal.announceStatus(this.Reveal.getStatusText(t)), t.classList.add("current-fragment"), this.Reveal.slideContent.startEmbeddedContent(t)), i || (r.shown.push(t), this.Reveal.dispatchEvent({
							target: t,
							type: "visible",
							bubbles: !1
						}));
					} else {
						let e = t.classList.contains("visible");
						t.classList.remove("visible"), t.classList.remove("current-fragment"), e && (this.Reveal.slideContent.stopEmbeddedContent(t), r.hidden.push(t), this.Reveal.dispatchEvent({
							target: t,
							type: "hidden",
							bubbles: !1
						}));
					}
				}), e = typeof e == "number" ? e : -1, e = Math.max(Math.min(e, i), -1), n.setAttribute("data-fragment", e);
			}
			return r.hidden.length && this.Reveal.dispatchEvent({
				type: "fragmenthidden",
				data: {
					fragment: r.hidden[0],
					fragments: r.hidden
				}
			}), r.shown.length && this.Reveal.dispatchEvent({
				type: "fragmentshown",
				data: {
					fragment: r.shown[0],
					fragments: r.shown
				}
			}), r;
		}
		sync(e = this.Reveal.getCurrentSlide()) {
			return this.sort(e.querySelectorAll(".fragment"));
		}
		goto(e, t = 0) {
			let n = this.Reveal.getCurrentSlide();
			if (n && this.Reveal.getConfig().fragments) {
				let r = this.sort(n.querySelectorAll(".fragment:not(.disabled)"));
				if (r.length) {
					if (typeof e != "number") {
						let t = this.sort(n.querySelectorAll(".fragment:not(.disabled).visible")).pop();
						e = t ? parseInt(t.getAttribute("data-fragment-index") || 0, 10) : -1;
					}
					e += t;
					let i = this.update(e, r);
					return this.Reveal.controls.update(), this.Reveal.progress.update(), this.Reveal.getConfig().fragmentInURL && this.Reveal.location.writeURL(), !!(i.shown.length || i.hidden.length);
				}
			}
			return !1;
		}
		next() {
			return this.goto(null, 1);
		}
		prev() {
			return this.goto(null, -1);
		}
	}, de$2 = class {
		constructor(e) {
			this.Reveal = e, this.active = !1, this.onSlideClicked = this.onSlideClicked.bind(this);
		}
		activate() {
			if (this.Reveal.getConfig().overview && !this.Reveal.isScrollView() && !this.isActive()) {
				this.active = !0, this.Reveal.getRevealElement().classList.add("overview"), this.Reveal.cancelAutoSlide(), this.Reveal.getSlidesElement().appendChild(this.Reveal.getBackgroundsElement()), t$4(this.Reveal.getRevealElement(), C$3).forEach((e) => {
					e.classList.contains("stack") || e.addEventListener("click", this.onSlideClicked, !0);
				});
				let e = this.Reveal.getComputedSlideSize();
				this.overviewSlideWidth = e.width + 70, this.overviewSlideHeight = e.height + 70, this.Reveal.getConfig().rtl && (this.overviewSlideWidth = -this.overviewSlideWidth), this.Reveal.updateSlidesVisibility(), this.layout(), this.update(), this.Reveal.layout();
				let n = this.Reveal.getIndices();
				this.Reveal.dispatchEvent({
					type: "overviewshown",
					data: {
						indexh: n.h,
						indexv: n.v,
						currentSlide: this.Reveal.getCurrentSlide()
					}
				});
			}
		}
		layout() {
			this.Reveal.getHorizontalSlides().forEach((e, n) => {
				e.setAttribute("data-index-h", n), i$3(e, "translate3d(" + n * this.overviewSlideWidth + "px, 0, 0)"), e.classList.contains("stack") && t$4(e, "section").forEach((e, t) => {
					e.setAttribute("data-index-h", n), e.setAttribute("data-index-v", t), i$3(e, "translate3d(0, " + t * this.overviewSlideHeight + "px, 0)");
				});
			}), Array.from(this.Reveal.getBackgroundsElement().childNodes).forEach((e, n) => {
				i$3(e, "translate3d(" + n * this.overviewSlideWidth + "px, 0, 0)"), t$4(e, ".slide-background").forEach((e, t) => {
					i$3(e, "translate3d(0, " + t * this.overviewSlideHeight + "px, 0)");
				});
			});
		}
		update() {
			let e = Math.min(window.innerWidth, window.innerHeight), t = Math.max(e / 5, 150) / e, n = this.Reveal.getIndices();
			this.Reveal.transformSlides({ overview: [
				"scale(" + t + ")",
				"translateX(" + -n.h * this.overviewSlideWidth + "px)",
				"translateY(" + -n.v * this.overviewSlideHeight + "px)"
			].join(" ") });
		}
		deactivate() {
			if (this.Reveal.getConfig().overview) {
				this.active = !1, this.Reveal.getRevealElement().classList.remove("overview"), this.Reveal.getRevealElement().classList.add("overview-deactivating"), setTimeout(() => {
					this.Reveal.getRevealElement().classList.remove("overview-deactivating");
				}, 1), this.Reveal.getRevealElement().appendChild(this.Reveal.getBackgroundsElement()), t$4(this.Reveal.getRevealElement(), C$3).forEach((e) => {
					i$3(e, ""), e.removeEventListener("click", this.onSlideClicked, !0);
				}), t$4(this.Reveal.getBackgroundsElement(), ".slide-background").forEach((e) => {
					i$3(e, "");
				}), this.Reveal.transformSlides({ overview: "" });
				let e = this.Reveal.getIndices();
				this.Reveal.slide(e.h, e.v), this.Reveal.layout(), this.Reveal.cueAutoSlide(), this.Reveal.dispatchEvent({
					type: "overviewhidden",
					data: {
						indexh: e.h,
						indexv: e.v,
						currentSlide: this.Reveal.getCurrentSlide()
					}
				});
			}
		}
		toggle(e) {
			typeof e == "boolean" ? e ? this.activate() : this.deactivate() : this.isActive() ? this.deactivate() : this.activate();
		}
		isActive() {
			return this.active;
		}
		onSlideClicked(e) {
			if (this.isActive()) {
				e.preventDefault();
				let t = e.target;
				for (; t && !t.nodeName.match(/section/gi);) t = t.parentNode;
				if (t && !t.classList.contains("disabled") && (this.deactivate(), t.nodeName.match(/section/gi))) {
					let e = parseInt(t.getAttribute("data-index-h"), 10), n = parseInt(t.getAttribute("data-index-v"), 10);
					this.Reveal.slide(e, n);
				}
			}
		}
	}, fe$2 = class {
		constructor(e) {
			this.Reveal = e, this.shortcuts = {}, this.bindings = {}, this.onDocumentKeyDown = this.onDocumentKeyDown.bind(this);
		}
		configure(e, t) {
			e.navigationMode === "linear" ? (this.shortcuts["&#8594;  ,  &#8595;  ,  SPACE  ,  N  ,  L  ,  J"] = "Next slide", this.shortcuts["&#8592;  ,  &#8593;  ,  P  ,  H  ,  K"] = "Previous slide") : (this.shortcuts["N  ,  SPACE"] = "Next slide", this.shortcuts["P  ,  Shift SPACE"] = "Previous slide", this.shortcuts["&#8592;  ,  H"] = "Navigate left", this.shortcuts["&#8594;  ,  L"] = "Navigate right", this.shortcuts["&#8593;  ,  K"] = "Navigate up", this.shortcuts["&#8595;  ,  J"] = "Navigate down"), this.shortcuts["Alt + &#8592;/&#8593/&#8594;/&#8595;"] = "Navigate without fragments", this.shortcuts["Shift + &#8592;/&#8593/&#8594;/&#8595;"] = "Jump to first/last slide", this.shortcuts["B  ,  ."] = "Pause", this.shortcuts.F = "Fullscreen", this.shortcuts.G = "Jump to slide", this.shortcuts["ESC, O"] = "Slide overview";
		}
		bind() {
			document.addEventListener("keydown", this.onDocumentKeyDown, !1);
		}
		unbind() {
			document.removeEventListener("keydown", this.onDocumentKeyDown, !1);
		}
		addKeyBinding(e, t) {
			typeof e == "object" && e.keyCode ? this.bindings[e.keyCode] = {
				callback: t,
				key: e.key,
				description: e.description
			} : this.bindings[e] = {
				callback: t,
				key: null,
				description: null
			};
		}
		removeKeyBinding(e) {
			delete this.bindings[e];
		}
		triggerKey(e) {
			this.onDocumentKeyDown({ keyCode: e });
		}
		registerKeyboardShortcut(e, t) {
			this.shortcuts[e] = t;
		}
		getShortcuts() {
			return this.shortcuts;
		}
		getBindings() {
			return this.bindings;
		}
		onDocumentKeyDown(e) {
			let t = this.Reveal.getConfig();
			if (typeof t.keyboardCondition == "function" && t.keyboardCondition(e) === !1 || t.keyboardCondition === "focused" && !this.Reveal.isFocused()) return !0;
			let n = e.keyCode, r = !this.Reveal.isAutoSliding();
			this.Reveal.onUserInput(e);
			let i = document.activeElement && document.activeElement.isContentEditable === !0, a = document.activeElement && document.activeElement.tagName && /input|textarea/i.test(document.activeElement.tagName), o = document.activeElement && document.activeElement.className && /speaker-notes/i.test(document.activeElement.className), c = !([
				32,
				37,
				38,
				39,
				40,
				63,
				78,
				80,
				191
			].indexOf(e.keyCode) !== -1 && e.shiftKey || e.altKey) && (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey);
			if (i || a || o || c) return;
			let l = [
				66,
				86,
				190,
				191,
				112
			], u;
			if (typeof t.keyboard == "object") for (u in t.keyboard) t.keyboard[u] === "togglePause" && l.push(parseInt(u, 10));
			if (this.Reveal.isOverlayOpen() && ![
				"Escape",
				"f",
				"c",
				"b",
				"."
			].includes(e.key) || this.Reveal.isPaused() && l.indexOf(n) === -1) return !1;
			let d = t.navigationMode === "linear" || !this.Reveal.hasHorizontalSlides() || !this.Reveal.hasVerticalSlides(), f = !1;
			if (typeof t.keyboard == "object") {
				for (u in t.keyboard) if (parseInt(u, 10) === n) {
					let n = t.keyboard[u];
					typeof n == "function" ? n.apply(null, [e]) : typeof n == "string" && typeof this.Reveal[n] == "function" && this.Reveal[n].call(), f = !0;
				}
			}
			if (f === !1) {
				for (u in this.bindings) if (parseInt(u, 10) === n) {
					let t = this.bindings[u].callback;
					typeof t == "function" ? t.apply(null, [e]) : typeof t == "string" && typeof this.Reveal[t] == "function" && this.Reveal[t].call(), f = !0;
				}
			}
			f === !1 && (f = !0, n === 80 || n === 33 ? this.Reveal.prev({ skipFragments: e.altKey }) : n === 78 || n === 34 ? this.Reveal.next({ skipFragments: e.altKey }) : n === 72 || n === 37 ? e.shiftKey ? this.Reveal.slide(0) : !this.Reveal.overview.isActive() && d ? t.rtl ? this.Reveal.next({ skipFragments: e.altKey }) : this.Reveal.prev({ skipFragments: e.altKey }) : this.Reveal.left({ skipFragments: e.altKey }) : n === 76 || n === 39 ? e.shiftKey ? this.Reveal.slide(this.Reveal.getHorizontalSlides().length - 1) : !this.Reveal.overview.isActive() && d ? t.rtl ? this.Reveal.prev({ skipFragments: e.altKey }) : this.Reveal.next({ skipFragments: e.altKey }) : this.Reveal.right({ skipFragments: e.altKey }) : n === 75 || n === 38 ? e.shiftKey ? this.Reveal.slide(void 0, 0) : !this.Reveal.overview.isActive() && d ? this.Reveal.prev({ skipFragments: e.altKey }) : this.Reveal.up({ skipFragments: e.altKey }) : n === 74 || n === 40 ? e.shiftKey ? this.Reveal.slide(void 0, Number.MAX_VALUE) : !this.Reveal.overview.isActive() && d ? this.Reveal.next({ skipFragments: e.altKey }) : this.Reveal.down({ skipFragments: e.altKey }) : n === 36 ? this.Reveal.slide(0) : n === 35 ? this.Reveal.slide(this.Reveal.getHorizontalSlides().length - 1) : n === 32 ? (this.Reveal.overview.isActive() && this.Reveal.overview.deactivate(), e.shiftKey ? this.Reveal.prev({ skipFragments: e.altKey }) : this.Reveal.next({ skipFragments: e.altKey })) : [
				58,
				59,
				66,
				86,
				190
			].includes(n) || n === 191 && !e.shiftKey ? this.Reveal.togglePause() : n === 70 ? s$3(t.embedded ? this.Reveal.getViewportElement() : document.documentElement) : n === 65 ? t.autoSlideStoppable && this.Reveal.toggleAutoSlide(r) : n === 71 ? t.jumpToSlide && this.Reveal.toggleJumpToSlide() : n === 67 && this.Reveal.isOverlayOpen() ? this.Reveal.closeOverlay() : (n === 63 || n === 191) && e.shiftKey || n === 112 ? this.Reveal.toggleHelp() : f = !1), f ? e.preventDefault && e.preventDefault() : n === 27 || n === 79 ? (this.Reveal.closeOverlay() === !1 && this.Reveal.overview.toggle(), e.preventDefault && e.preventDefault()) : n === 13 && this.Reveal.overview.isActive() && (this.Reveal.overview.deactivate(), e.preventDefault && e.preventDefault()), this.Reveal.cueAutoSlide();
		}
	};
	function P$3(e, t) {
		var n = Object.keys(e);
		if (Object.getOwnPropertySymbols) {
			var r = Object.getOwnPropertySymbols(e);
			t && (r = r.filter(function(t) {
				return Object.getOwnPropertyDescriptor(e, t).enumerable;
			})), n.push.apply(n, r);
		}
		return n;
	}
	function F$3(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t] == null ? {} : arguments[t];
			t % 2 ? P$3(Object(n), !0).forEach(function(t) {
				S$3(e, t, n[t]);
			}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : P$3(Object(n)).forEach(function(t) {
				Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
			});
		}
		return e;
	}
	var pe$2 = class {
		constructor(e) {
			S$3(this, "MAX_REPLACE_STATE_FREQUENCY", 1e3), this.Reveal = e, this.writeURLTimeout = 0, this.replaceStateTimestamp = 0, this.onWindowHashChange = this.onWindowHashChange.bind(this);
		}
		bind() {
			window.addEventListener("hashchange", this.onWindowHashChange, !1);
		}
		unbind() {
			window.removeEventListener("hashchange", this.onWindowHashChange, !1);
		}
		getIndicesFromHash(e = window.location.hash, t = {}) {
			let n = e.replace(/^#\/?/, ""), r = n.split("/");
			if (!/^[0-9]*$/.test(r[0]) && n.length) {
				let e, t;
				/\/[-\d]+$/g.test(n) && (t = parseInt(n.split("/").pop(), 10), t = isNaN(t) ? void 0 : t, n = n.split("/").shift());
				try {
					let t = decodeURIComponent(n);
					e = (document.getElementById(t) || document.querySelector(`[data-id="${t}"]`)).closest(".slides section");
				} catch (e) {}
				if (e) return F$3(F$3({}, this.Reveal.getIndices(e)), {}, { f: t });
			} else {
				let e = this.Reveal.getConfig(), n = e.hashOneBasedIndex || t.oneBasedIndex ? 1 : 0, i = parseInt(r[0], 10) - n || 0, a = parseInt(r[1], 10) - n || 0, o;
				return e.fragmentInURL && (o = parseInt(r[2], 10), isNaN(o) && (o = void 0)), {
					h: i,
					v: a,
					f: o
				};
			}
			return null;
		}
		readURL() {
			let e = this.Reveal.getIndices(), t = this.getIndicesFromHash();
			t ? (t.h !== e.h || t.v !== e.v || t.f !== void 0) && this.Reveal.slide(t.h, t.v, t.f) : this.Reveal.slide(e.h || 0, e.v || 0);
		}
		writeURL(e) {
			let t = this.Reveal.getConfig(), n = this.Reveal.getCurrentSlide();
			if (clearTimeout(this.writeURLTimeout), typeof e == "number") this.writeURLTimeout = setTimeout(this.writeURL, e);
			else if (n) {
				let e = this.getHash();
				t.history ? window.location.hash = e : t.hash && (e === "/" ? this.debouncedReplaceState(window.location.pathname + window.location.search) : this.debouncedReplaceState("#" + e));
			}
		}
		replaceState(e) {
			window.history.replaceState(null, null, e), this.replaceStateTimestamp = Date.now();
		}
		debouncedReplaceState(e) {
			clearTimeout(this.replaceStateTimeout), Date.now() - this.replaceStateTimestamp > this.MAX_REPLACE_STATE_FREQUENCY ? this.replaceState(e) : this.replaceStateTimeout = setTimeout(() => this.replaceState(e), this.MAX_REPLACE_STATE_FREQUENCY);
		}
		getHash(e) {
			let t = "/", n = e || this.Reveal.getCurrentSlide(), r = n ? n.getAttribute("id") : null;
			r && (r = encodeURIComponent(r));
			let i = this.Reveal.getIndices(e);
			if (this.Reveal.getConfig().fragmentInURL || (i.f = void 0), typeof r == "string" && r.length) t = "/" + r, i.f >= 0 && (t += "/" + i.f);
			else {
				let e = +!!this.Reveal.getConfig().hashOneBasedIndex;
				(i.h > 0 || i.v > 0 || i.f >= 0) && (t += i.h + e), (i.v > 0 || i.f >= 0) && (t += "/" + (i.v + e)), i.f >= 0 && (t += "/" + i.f);
			}
			return t;
		}
		onWindowHashChange(e) {
			this.readURL();
		}
	}, me$2 = class {
		constructor(e) {
			this.Reveal = e, this.onNavigateLeftClicked = this.onNavigateLeftClicked.bind(this), this.onNavigateRightClicked = this.onNavigateRightClicked.bind(this), this.onNavigateUpClicked = this.onNavigateUpClicked.bind(this), this.onNavigateDownClicked = this.onNavigateDownClicked.bind(this), this.onNavigatePrevClicked = this.onNavigatePrevClicked.bind(this), this.onNavigateNextClicked = this.onNavigateNextClicked.bind(this), this.onEnterFullscreen = this.onEnterFullscreen.bind(this);
		}
		render() {
			let e = this.Reveal.getConfig().rtl, n = this.Reveal.getRevealElement();
			this.element = document.createElement("aside"), this.element.className = "controls", this.element.innerHTML = `<button class="navigate-left" aria-label="${e ? "next slide" : "previous slide"}"><div class="controls-arrow"></div></button>
			<button class="navigate-right" aria-label="${e ? "previous slide" : "next slide"}"><div class="controls-arrow"></div></button>
			<button class="navigate-up" aria-label="above slide"><div class="controls-arrow"></div></button>
			<button class="navigate-down" aria-label="below slide"><div class="controls-arrow"></div></button>`, this.Reveal.getRevealElement().appendChild(this.element), this.controlsLeft = t$4(n, ".navigate-left"), this.controlsRight = t$4(n, ".navigate-right"), this.controlsUp = t$4(n, ".navigate-up"), this.controlsDown = t$4(n, ".navigate-down"), this.controlsPrev = t$4(n, ".navigate-prev"), this.controlsNext = t$4(n, ".navigate-next"), this.controlsFullscreen = t$4(n, ".enter-fullscreen"), this.controlsRightArrow = this.element.querySelector(".navigate-right"), this.controlsLeftArrow = this.element.querySelector(".navigate-left"), this.controlsDownArrow = this.element.querySelector(".navigate-down");
		}
		configure(e, t) {
			let n = e.controls === "speaker" || e.controls === "speaker-only";
			this.element.style.display = e.controls && (!n || this.Reveal.isSpeakerNotes()) ? "block" : "none", this.element.setAttribute("data-controls-layout", e.controlsLayout), this.element.setAttribute("data-controls-back-arrows", e.controlsBackArrows);
		}
		bind() {
			let e = ["touchstart", "click"];
			_$3 && (e = ["touchend"]), e.forEach((e) => {
				this.controlsLeft.forEach((t) => t.addEventListener(e, this.onNavigateLeftClicked, !1)), this.controlsRight.forEach((t) => t.addEventListener(e, this.onNavigateRightClicked, !1)), this.controlsUp.forEach((t) => t.addEventListener(e, this.onNavigateUpClicked, !1)), this.controlsDown.forEach((t) => t.addEventListener(e, this.onNavigateDownClicked, !1)), this.controlsPrev.forEach((t) => t.addEventListener(e, this.onNavigatePrevClicked, !1)), this.controlsNext.forEach((t) => t.addEventListener(e, this.onNavigateNextClicked, !1)), this.controlsFullscreen.forEach((t) => t.addEventListener(e, this.onEnterFullscreen, !1));
			});
		}
		unbind() {
			[
				"touchstart",
				"touchend",
				"click"
			].forEach((e) => {
				this.controlsLeft.forEach((t) => t.removeEventListener(e, this.onNavigateLeftClicked, !1)), this.controlsRight.forEach((t) => t.removeEventListener(e, this.onNavigateRightClicked, !1)), this.controlsUp.forEach((t) => t.removeEventListener(e, this.onNavigateUpClicked, !1)), this.controlsDown.forEach((t) => t.removeEventListener(e, this.onNavigateDownClicked, !1)), this.controlsPrev.forEach((t) => t.removeEventListener(e, this.onNavigatePrevClicked, !1)), this.controlsNext.forEach((t) => t.removeEventListener(e, this.onNavigateNextClicked, !1)), this.controlsFullscreen.forEach((t) => t.removeEventListener(e, this.onEnterFullscreen, !1));
			});
		}
		update() {
			let e = this.Reveal.availableRoutes();
			[
				...this.controlsLeft,
				...this.controlsRight,
				...this.controlsUp,
				...this.controlsDown,
				...this.controlsPrev,
				...this.controlsNext
			].forEach((e) => {
				e.classList.remove("enabled", "fragmented"), e.setAttribute("disabled", "disabled");
			}), e.left && this.controlsLeft.forEach((e) => {
				e.classList.add("enabled"), e.removeAttribute("disabled");
			}), e.right && this.controlsRight.forEach((e) => {
				e.classList.add("enabled"), e.removeAttribute("disabled");
			}), e.up && this.controlsUp.forEach((e) => {
				e.classList.add("enabled"), e.removeAttribute("disabled");
			}), e.down && this.controlsDown.forEach((e) => {
				e.classList.add("enabled"), e.removeAttribute("disabled");
			}), (e.left || e.up) && this.controlsPrev.forEach((e) => {
				e.classList.add("enabled"), e.removeAttribute("disabled");
			}), (e.right || e.down) && this.controlsNext.forEach((e) => {
				e.classList.add("enabled"), e.removeAttribute("disabled");
			});
			let t = this.Reveal.getCurrentSlide();
			if (t) {
				let e = this.Reveal.fragments.availableRoutes();
				e.prev && this.controlsPrev.forEach((e) => {
					e.classList.add("fragmented", "enabled"), e.removeAttribute("disabled");
				}), e.next && this.controlsNext.forEach((e) => {
					e.classList.add("fragmented", "enabled"), e.removeAttribute("disabled");
				});
				let n = this.Reveal.isVerticalSlide(t), r = n && t.parentElement && t.parentElement.querySelectorAll(":scope > section").length > 1;
				n && r ? (e.prev && this.controlsUp.forEach((e) => {
					e.classList.add("fragmented", "enabled"), e.removeAttribute("disabled");
				}), e.next && this.controlsDown.forEach((e) => {
					e.classList.add("fragmented", "enabled"), e.removeAttribute("disabled");
				})) : (e.prev && this.controlsLeft.forEach((e) => {
					e.classList.add("fragmented", "enabled"), e.removeAttribute("disabled");
				}), e.next && this.controlsRight.forEach((e) => {
					e.classList.add("fragmented", "enabled"), e.removeAttribute("disabled");
				}));
			}
			if (this.Reveal.getConfig().controlsTutorial) {
				let t = this.Reveal.getIndices();
				!this.Reveal.hasNavigatedVertically() && e.down ? this.controlsDownArrow.classList.add("highlight") : (this.controlsDownArrow.classList.remove("highlight"), this.Reveal.getConfig().rtl ? !this.Reveal.hasNavigatedHorizontally() && e.left && t.v === 0 ? this.controlsLeftArrow.classList.add("highlight") : this.controlsLeftArrow.classList.remove("highlight") : !this.Reveal.hasNavigatedHorizontally() && e.right && t.v === 0 ? this.controlsRightArrow.classList.add("highlight") : this.controlsRightArrow.classList.remove("highlight"));
			}
		}
		destroy() {
			this.unbind(), this.element.remove();
		}
		onNavigateLeftClicked(e) {
			e.preventDefault(), this.Reveal.onUserInput(), this.Reveal.getConfig().navigationMode === "linear" ? this.Reveal.prev() : this.Reveal.left();
		}
		onNavigateRightClicked(e) {
			e.preventDefault(), this.Reveal.onUserInput(), this.Reveal.getConfig().navigationMode === "linear" ? this.Reveal.next() : this.Reveal.right();
		}
		onNavigateUpClicked(e) {
			e.preventDefault(), this.Reveal.onUserInput(), this.Reveal.up();
		}
		onNavigateDownClicked(e) {
			e.preventDefault(), this.Reveal.onUserInput(), this.Reveal.down();
		}
		onNavigatePrevClicked(e) {
			e.preventDefault(), this.Reveal.onUserInput(), this.Reveal.prev();
		}
		onNavigateNextClicked(e) {
			e.preventDefault(), this.Reveal.onUserInput(), this.Reveal.next();
		}
		onEnterFullscreen(e) {
			let t = this.Reveal.getConfig(), n = this.Reveal.getViewportElement();
			s$3(t.embedded ? n : n.parentElement);
		}
	}, he$2 = class {
		constructor(e) {
			this.Reveal = e, this.onProgressClicked = this.onProgressClicked.bind(this);
		}
		render() {
			this.element = document.createElement("div"), this.element.className = "progress", this.Reveal.getRevealElement().appendChild(this.element), this.bar = document.createElement("span"), this.element.appendChild(this.bar);
		}
		configure(e, t) {
			this.element.style.display = e.progress ? "block" : "none";
		}
		bind() {
			this.Reveal.getConfig().progress && this.element && this.element.addEventListener("click", this.onProgressClicked, !1);
		}
		unbind() {
			this.Reveal.getConfig().progress && this.element && this.element.removeEventListener("click", this.onProgressClicked, !1);
		}
		update() {
			if (this.Reveal.getConfig().progress && this.bar) {
				let e = this.Reveal.getProgress();
				this.Reveal.getTotalSlides() < 2 && (e = 0), this.bar.style.transform = "scaleX(" + e + ")";
			}
		}
		getMaxWidth() {
			return this.Reveal.getRevealElement().offsetWidth;
		}
		onProgressClicked(e) {
			this.Reveal.onUserInput(e), e.preventDefault();
			let t = this.Reveal.getSlides(), n = t.length, r = Math.floor(e.clientX / this.getMaxWidth() * n);
			this.Reveal.getConfig().rtl && (r = n - r);
			let i = this.Reveal.getIndices(t[r]);
			this.Reveal.slide(i.h, i.v);
		}
		destroy() {
			this.element.remove();
		}
	}, ge$2 = class {
		constructor(e) {
			this.Reveal = e, this.lastMouseWheelStep = 0, this.cursorHidden = !1, this.cursorInactiveTimeout = 0, this.onDocumentCursorActive = this.onDocumentCursorActive.bind(this), this.onDocumentMouseScroll = this.onDocumentMouseScroll.bind(this);
		}
		configure(e, t) {
			e.mouseWheel ? document.addEventListener("wheel", this.onDocumentMouseScroll, !1) : document.removeEventListener("wheel", this.onDocumentMouseScroll, !1), e.hideInactiveCursor ? (document.addEventListener("mousemove", this.onDocumentCursorActive, !1), document.addEventListener("mousedown", this.onDocumentCursorActive, !1)) : (this.showCursor(), document.removeEventListener("mousemove", this.onDocumentCursorActive, !1), document.removeEventListener("mousedown", this.onDocumentCursorActive, !1));
		}
		showCursor() {
			this.cursorHidden && (this.cursorHidden = !1, this.Reveal.getRevealElement().style.cursor = "");
		}
		hideCursor() {
			this.cursorHidden === !1 && (this.cursorHidden = !0, this.Reveal.getRevealElement().style.cursor = "none");
		}
		destroy() {
			this.showCursor(), document.removeEventListener("wheel", this.onDocumentMouseScroll, !1), document.removeEventListener("mousemove", this.onDocumentCursorActive, !1), document.removeEventListener("mousedown", this.onDocumentCursorActive, !1);
		}
		onDocumentCursorActive(e) {
			this.showCursor(), clearTimeout(this.cursorInactiveTimeout), this.cursorInactiveTimeout = setTimeout(this.hideCursor.bind(this), this.Reveal.getConfig().hideCursorTime);
		}
		onDocumentMouseScroll(e) {
			if (Date.now() - this.lastMouseWheelStep > 1e3) {
				this.lastMouseWheelStep = Date.now();
				let t = e.detail || -e.wheelDelta;
				t > 0 ? this.Reveal.next() : t < 0 && this.Reveal.prev();
			}
		}
	}, _e$2 = (e, t) => {
		let n = document.createElement("script");
		n.type = "text/javascript", n.async = !1, n.defer = !1, n.src = e, typeof t == "function" && (n.onload = (e) => {
			e.type === "load" && (n.onload = n.onerror = null, t());
		}, n.onerror = (e) => {
			n.onload = n.onerror = null, t(/* @__PURE__ */ Error("Failed loading script: " + n.src + "\n" + e));
		});
		let r = document.querySelector("head");
		r && r.insertBefore(n, r.lastChild);
	}, ve$2 = class {
		constructor(e) {
			this.Reveal = e, this.state = "idle", this.registeredPlugins = {}, this.asyncDependencies = [];
		}
		load(e, t) {
			return this.state = "loading", e.forEach(this.registerPlugin.bind(this)), new Promise((e) => {
				let n = [], r = 0;
				if (t.forEach((e) => {
					(!e.condition || e.condition()) && (e.async ? this.asyncDependencies.push(e) : n.push(e));
				}), n.length) {
					r = n.length;
					let t = (t) => {
						t && typeof t.callback == "function" && t.callback(), --r === 0 && this.initPlugins().then(e);
					};
					n.forEach((e) => {
						typeof e.id == "string" ? (this.registerPlugin(e), t(e)) : typeof e.src == "string" ? _e$2(e.src, () => t(e)) : (console.warn("Unrecognized plugin format", e), t());
					});
				} else this.initPlugins().then(e);
			});
		}
		initPlugins() {
			return new Promise((e) => {
				let t = Object.values(this.registeredPlugins), n = t.length;
				if (n === 0) this.loadAsync().then(e);
				else {
					let r, i = () => {
						--n === 0 ? this.loadAsync().then(e) : r();
					}, a = 0;
					r = () => {
						let e = t[a++];
						if (typeof e.init == "function") {
							let t = e.init(this.Reveal);
							t && typeof t.then == "function" ? t.then(i) : i();
						} else i();
					}, r();
				}
			});
		}
		loadAsync() {
			return this.state = "loaded", this.asyncDependencies.length && this.asyncDependencies.forEach((e) => {
				_e$2(e.src, e.callback);
			}), Promise.resolve();
		}
		registerPlugin(e) {
			arguments.length === 2 && typeof arguments[0] == "string" ? (e = arguments[1], e.id = arguments[0]) : typeof e == "function" && (e = e());
			let t = e.id;
			typeof t == "string" ? this.registeredPlugins[t] === void 0 ? (this.registeredPlugins[t] = e, this.state === "loaded" && typeof e.init == "function" && e.init(this.Reveal)) : console.warn("reveal.js: \"" + t + "\" plugin has already been registered") : console.warn("Unrecognized plugin format; can't find plugin.id", e);
		}
		hasPlugin(e) {
			return !!this.registeredPlugins[e];
		}
		getPlugin(e) {
			return this.registeredPlugins[e];
		}
		getRegisteredPlugins() {
			return this.registeredPlugins;
		}
		destroy() {
			Object.values(this.registeredPlugins).forEach((e) => {
				typeof e.destroy == "function" && e.destroy();
			}), this.registeredPlugins = {}, this.asyncDependencies = [];
		}
	}, ye$2 = class {
		constructor(e) {
			this.Reveal = e, this.onSlidesClicked = this.onSlidesClicked.bind(this), this.iframeTriggerSelector = null, this.mediaTriggerSelector = "[data-preview-image], [data-preview-video]", this.stateProps = [
				"previewIframe",
				"previewImage",
				"previewVideo",
				"previewFit"
			], this.state = {};
		}
		update() {
			this.Reveal.getConfig().previewLinks ? this.iframeTriggerSelector = "a[href]:not([data-preview-link=false]), [data-preview-link]:not(a):not([data-preview-link=false])" : this.iframeTriggerSelector = "[data-preview-link]:not([data-preview-link=false])";
			let e = this.Reveal.getSlidesElement().querySelectorAll(this.iframeTriggerSelector).length > 0, t = this.Reveal.getSlidesElement().querySelectorAll(this.mediaTriggerSelector).length > 0;
			e || t ? this.Reveal.getSlidesElement().addEventListener("click", this.onSlidesClicked, !1) : this.Reveal.getSlidesElement().removeEventListener("click", this.onSlidesClicked, !1);
		}
		createOverlay(e) {
			this.dom = document.createElement("div"), this.dom.classList.add("r-overlay"), this.dom.classList.add(e), this.viewport = document.createElement("div"), this.viewport.classList.add("r-overlay-viewport"), this.dom.appendChild(this.viewport), this.Reveal.getRevealElement().appendChild(this.dom);
		}
		previewIframe(e) {
			this.close(), this.state = { previewIframe: e }, this.createOverlay("r-overlay-preview"), this.dom.dataset.state = "loading", this.viewport.innerHTML = `<header class="r-overlay-header">
				<a class="r-overlay-header-button r-overlay-external" href="${e}" target="_blank"><span class="icon"></span></a>
				<button class="r-overlay-header-button r-overlay-close"><span class="icon"></span></button>
			</header>
			<div class="r-overlay-spinner"></div>
			<div class="r-overlay-content">
				<iframe src="${e}"></iframe>
				<small class="r-overlay-content-inner">
					<span class="r-overlay-error x-frame-error">Unable to load iframe. This is likely due to the site's policy (x-frame-options).</span>
				</small>
			</div>`, this.dom.querySelector("iframe").addEventListener("load", (e) => {
				this.dom.dataset.state = "loaded";
			}, !1), this.dom.querySelector(".r-overlay-close").addEventListener("click", (e) => {
				this.close(), e.preventDefault();
			}, !1), this.dom.querySelector(".r-overlay-external").addEventListener("click", (e) => {
				this.close();
			}, !1), this.Reveal.dispatchEvent({
				type: "previewiframe",
				data: { url: e }
			});
		}
		previewMedia(e, t, n) {
			if (t !== "image" && t !== "video") {
				console.warn("Please specify a valid media type to preview (image|video)");
				return;
			}
			this.close(), n = n || "scale-down", this.createOverlay("r-overlay-preview"), this.dom.dataset.state = "loading", this.dom.dataset.previewFit = n, this.viewport.innerHTML = "<header class=\"r-overlay-header\">\n				<button class=\"r-overlay-header-button r-overlay-close\">Esc <span class=\"icon\"></span></button>\n			</header>\n			<div class=\"r-overlay-spinner\"></div>\n			<div class=\"r-overlay-content\"></div>";
			let r = this.dom.querySelector(".r-overlay-content");
			if (t === "image") {
				this.state = {
					previewImage: e,
					previewFit: n
				};
				let t = document.createElement("img", {});
				t.src = e, r.appendChild(t), t.addEventListener("load", () => {
					this.dom.dataset.state = "loaded";
				}, !1), t.addEventListener("error", () => {
					this.dom.dataset.state = "error", r.innerHTML = "<span class=\"r-overlay-error\">Unable to load image.</span>";
				}, !1), this.dom.style.cursor = "zoom-out", this.dom.addEventListener("click", (e) => {
					this.close();
				}, !1), this.Reveal.dispatchEvent({
					type: "previewimage",
					data: { url: e }
				});
			} else if (t === "video") {
				this.state = {
					previewVideo: e,
					previewFit: n
				};
				let t = document.createElement("video");
				t.autoplay = this.dom.dataset.previewAutoplay !== "false", t.controls = this.dom.dataset.previewControls !== "false", t.loop = this.dom.dataset.previewLoop === "true", t.muted = this.dom.dataset.previewMuted === "true", t.playsInline = !0, t.src = e, r.appendChild(t), t.addEventListener("loadeddata", () => {
					this.dom.dataset.state = "loaded";
				}, !1), t.addEventListener("error", () => {
					this.dom.dataset.state = "error", r.innerHTML = "<span class=\"r-overlay-error\">Unable to load video.</span>";
				}, !1), this.Reveal.dispatchEvent({
					type: "previewvideo",
					data: { url: e }
				});
			} else throw Error("Please specify a valid media type to preview");
			this.dom.querySelector(".r-overlay-close").addEventListener("click", (e) => {
				this.close(), e.preventDefault();
			}, !1);
		}
		previewImage(e, t) {
			this.previewMedia(e, "image", t);
		}
		previewVideo(e, t) {
			this.previewMedia(e, "video", t);
		}
		toggleHelp(e) {
			typeof e == "boolean" ? e ? this.showHelp() : this.close() : this.dom ? this.close() : this.showHelp();
		}
		showHelp() {
			if (this.Reveal.getConfig().help) {
				this.close(), this.createOverlay("r-overlay-help");
				let e = "<p class=\"title\">Keyboard Shortcuts</p>", t = this.Reveal.keyboard.getShortcuts(), n = this.Reveal.keyboard.getBindings();
				e += "<table><th>KEY</th><th>ACTION</th>";
				for (let n in t) e += `<tr><td>${n}</td><td>${t[n]}</td></tr>`;
				for (let t in n) n[t].key && n[t].description && (e += `<tr><td>${n[t].key}</td><td>${n[t].description}</td></tr>`);
				e += "</table>", this.viewport.innerHTML = `
				<header class="r-overlay-header">
					<button class="r-overlay-header-button r-overlay-close">Esc <span class="icon"></span></button>
				</header>
				<div class="r-overlay-content">
					<div class="r-overlay-help-content">${e}</div>
				</div>
			`, this.dom.querySelector(".r-overlay-close").addEventListener("click", (e) => {
					this.close(), e.preventDefault();
				}, !1), this.Reveal.dispatchEvent({ type: "showhelp" });
			}
		}
		isOpen() {
			return !!this.dom;
		}
		close() {
			return this.dom ? (this.dom.remove(), this.dom = null, this.state = {}, this.Reveal.dispatchEvent({ type: "closeoverlay" }), !0) : !1;
		}
		getState() {
			return this.state;
		}
		setState(e) {
			this.stateProps.every((t) => this.state[t] === e[t]) || (e.previewIframe ? this.previewIframe(e.previewIframe) : e.previewImage ? this.previewImage(e.previewImage, e.previewFit) : e.previewVideo ? this.previewVideo(e.previewVideo, e.previewFit) : this.close());
		}
		onSlidesClicked(e) {
			let t = e.target, n = t.closest(this.iframeTriggerSelector), r = t.closest(this.mediaTriggerSelector);
			if (n) {
				if (e.metaKey || e.shiftKey || e.altKey) return;
				let t = n.getAttribute("data-preview-link"), r = typeof t == "string" && t.startsWith("http") ? t : n.getAttribute("href");
				r && (this.previewIframe(r), e.preventDefault());
			} else if (r) {
				if (r.hasAttribute("data-preview-image")) {
					let t = r.dataset.previewImage || r.getAttribute("src");
					t && (this.previewImage(t, r.dataset.previewFit), e.preventDefault());
				} else if (r.hasAttribute("data-preview-video")) {
					let t = r.dataset.previewVideo || r.getAttribute("src");
					if (!t) {
						let e = r.querySelector("source");
						e && (t = e.getAttribute("src"));
					}
					t && (this.previewVideo(t, r.dataset.previewFit), e.preventDefault());
				}
			}
		}
		destroy() {
			this.close();
		}
	}, I$3 = 40, be$2 = class {
		constructor(e) {
			this.Reveal = e, this.touchStartX = 0, this.touchStartY = 0, this.touchStartCount = 0, this.touchCaptured = !1, this.onPointerDown = this.onPointerDown.bind(this), this.onPointerMove = this.onPointerMove.bind(this), this.onPointerUp = this.onPointerUp.bind(this), this.onTouchStart = this.onTouchStart.bind(this), this.onTouchMove = this.onTouchMove.bind(this), this.onTouchEnd = this.onTouchEnd.bind(this);
		}
		bind() {
			let e = this.Reveal.getRevealElement();
			"onpointerdown" in window ? (e.addEventListener("pointerdown", this.onPointerDown, !1), e.addEventListener("pointermove", this.onPointerMove, !1), e.addEventListener("pointerup", this.onPointerUp, !1)) : window.navigator.msPointerEnabled ? (e.addEventListener("MSPointerDown", this.onPointerDown, !1), e.addEventListener("MSPointerMove", this.onPointerMove, !1), e.addEventListener("MSPointerUp", this.onPointerUp, !1)) : (e.addEventListener("touchstart", this.onTouchStart, !1), e.addEventListener("touchmove", this.onTouchMove, !1), e.addEventListener("touchend", this.onTouchEnd, !1));
		}
		unbind() {
			let e = this.Reveal.getRevealElement();
			e.removeEventListener("pointerdown", this.onPointerDown, !1), e.removeEventListener("pointermove", this.onPointerMove, !1), e.removeEventListener("pointerup", this.onPointerUp, !1), e.removeEventListener("MSPointerDown", this.onPointerDown, !1), e.removeEventListener("MSPointerMove", this.onPointerMove, !1), e.removeEventListener("MSPointerUp", this.onPointerUp, !1), e.removeEventListener("touchstart", this.onTouchStart, !1), e.removeEventListener("touchmove", this.onTouchMove, !1), e.removeEventListener("touchend", this.onTouchEnd, !1);
		}
		isSwipePrevented(e) {
			if (a$3(e, "video[controls], audio[controls]")) return !0;
			for (; e && typeof e.hasAttribute == "function";) {
				if (e.hasAttribute("data-prevent-swipe")) return !0;
				e = e.parentNode;
			}
			return !1;
		}
		onTouchStart(e) {
			if (this.touchCaptured = !1, this.isSwipePrevented(e.target)) return !0;
			this.touchStartX = e.touches[0].clientX, this.touchStartY = e.touches[0].clientY, this.touchStartCount = e.touches.length;
		}
		onTouchMove(e) {
			if (this.isSwipePrevented(e.target)) return !0;
			let t = this.Reveal.getConfig();
			if (this.touchCaptured) _$3 && e.preventDefault();
			else {
				this.Reveal.onUserInput(e);
				let n = e.touches[0].clientX, r = e.touches[0].clientY;
				if (e.touches.length === 1 && this.touchStartCount !== 2) {
					let i = this.Reveal.availableRoutes({ includeFragments: !0 }), a = n - this.touchStartX, o = r - this.touchStartY;
					a > I$3 && Math.abs(a) > Math.abs(o) ? (this.touchCaptured = !0, t.navigationMode === "linear" ? t.rtl ? this.Reveal.next() : this.Reveal.prev() : this.Reveal.left()) : a < -I$3 && Math.abs(a) > Math.abs(o) ? (this.touchCaptured = !0, t.navigationMode === "linear" ? t.rtl ? this.Reveal.prev() : this.Reveal.next() : this.Reveal.right()) : o > I$3 && i.up ? (this.touchCaptured = !0, t.navigationMode === "linear" ? this.Reveal.prev() : this.Reveal.up()) : o < -I$3 && i.down && (this.touchCaptured = !0, t.navigationMode === "linear" ? this.Reveal.next() : this.Reveal.down()), t.embedded ? (this.touchCaptured || this.Reveal.isVerticalSlide()) && e.preventDefault() : e.preventDefault();
				}
			}
		}
		onTouchEnd(e) {
			this.touchCaptured && !this.Reveal.slideContent.isAllowedToPlayAudio() && this.Reveal.startEmbeddedContent(this.Reveal.getCurrentSlide()), this.touchCaptured = !1;
		}
		onPointerDown(e) {
			(e.pointerType === e.MSPOINTER_TYPE_TOUCH || e.pointerType === "touch") && (e.touches = [{
				clientX: e.clientX,
				clientY: e.clientY
			}], this.onTouchStart(e));
		}
		onPointerMove(e) {
			(e.pointerType === e.MSPOINTER_TYPE_TOUCH || e.pointerType === "touch") && (e.touches = [{
				clientX: e.clientX,
				clientY: e.clientY
			}], this.onTouchMove(e));
		}
		onPointerUp(e) {
			(e.pointerType === e.MSPOINTER_TYPE_TOUCH || e.pointerType === "touch") && (e.touches = [{
				clientX: e.clientX,
				clientY: e.clientY
			}], this.onTouchEnd(e));
		}
	}, L$3 = "focus", R$3 = "blur", xe$2 = class {
		constructor(e) {
			this.Reveal = e, this.onRevealPointerDown = this.onRevealPointerDown.bind(this), this.onDocumentPointerDown = this.onDocumentPointerDown.bind(this);
		}
		configure(e, t) {
			e.embedded ? this.blur() : (this.focus(), this.unbind());
		}
		bind() {
			this.Reveal.getConfig().embedded && this.Reveal.getRevealElement().addEventListener("pointerdown", this.onRevealPointerDown, !1);
		}
		unbind() {
			this.Reveal.getRevealElement().removeEventListener("pointerdown", this.onRevealPointerDown, !1), document.removeEventListener("pointerdown", this.onDocumentPointerDown, !1);
		}
		focus() {
			this.state !== L$3 && (this.Reveal.getRevealElement().classList.add("focused"), document.addEventListener("pointerdown", this.onDocumentPointerDown, !1)), this.state = L$3;
		}
		blur() {
			this.state !== R$3 && (this.Reveal.getRevealElement().classList.remove("focused"), document.removeEventListener("pointerdown", this.onDocumentPointerDown, !1)), this.state = R$3;
		}
		isFocused() {
			return this.state === L$3;
		}
		destroy() {
			this.Reveal.getRevealElement().classList.remove("focused");
		}
		onRevealPointerDown(e) {
			this.focus();
		}
		onDocumentPointerDown(e) {
			let t = o$3(e.target, ".reveal");
			(!t || t !== this.Reveal.getRevealElement()) && this.blur();
		}
	}, Se$2 = class {
		constructor(e) {
			this.Reveal = e;
		}
		render() {
			this.element = document.createElement("div"), this.element.className = "speaker-notes", this.element.setAttribute("data-prevent-swipe", ""), this.element.setAttribute("tabindex", "0"), this.Reveal.getRevealElement().appendChild(this.element);
		}
		configure(e, t) {
			e.showNotes && this.element.setAttribute("data-layout", typeof e.showNotes == "string" ? e.showNotes : "inline");
		}
		update() {
			this.Reveal.getConfig().showNotes && this.element && this.Reveal.getCurrentSlide() && !this.Reveal.isScrollView() && !this.Reveal.isPrintView() && (this.element.innerHTML = this.getSlideNotes() || "<span class=\"notes-placeholder\">No notes on this slide.</span>");
		}
		updateVisibility() {
			this.Reveal.getConfig().showNotes && this.hasNotes() && !this.Reveal.isScrollView() && !this.Reveal.isPrintView() ? this.Reveal.getRevealElement().classList.add("show-notes") : this.Reveal.getRevealElement().classList.remove("show-notes");
		}
		hasNotes() {
			return this.Reveal.getSlidesElement().querySelectorAll("[data-notes], aside.notes").length > 0;
		}
		isSpeakerNotesWindow() {
			return !!window.location.search.match(/receiver/gi);
		}
		getSlideNotes(e = this.Reveal.getCurrentSlide()) {
			if (e.hasAttribute("data-notes")) return e.getAttribute("data-notes");
			let t = e.querySelectorAll("aside.notes");
			return t ? Array.from(t).map((e) => e.innerHTML).join("\n") : null;
		}
		destroy() {
			this.element.remove();
		}
	}, Ce$2 = class {
		constructor(e, t) {
			this.diameter = 100, this.diameter2 = this.diameter / 2, this.thickness = 6, this.playing = !1, this.progress = 0, this.progressOffset = 1, this.container = e, this.progressCheck = t, this.canvas = document.createElement("canvas"), this.canvas.className = "playback", this.canvas.width = this.diameter, this.canvas.height = this.diameter, this.canvas.style.width = this.diameter2 + "px", this.canvas.style.height = this.diameter2 + "px", this.context = this.canvas.getContext("2d"), this.container.appendChild(this.canvas), this.render();
		}
		setPlaying(e) {
			let t = this.playing;
			this.playing = e, !t && this.playing ? this.animate() : this.render();
		}
		animate() {
			let e = this.progress;
			this.progress = this.progressCheck(), e > .8 && this.progress < .2 && (this.progressOffset = this.progress), this.render(), this.playing && requestAnimationFrame(this.animate.bind(this));
		}
		render() {
			let e = this.playing ? this.progress : 0, t = this.diameter2 - this.thickness, n = this.diameter2, r = this.diameter2;
			this.progressOffset += (1 - this.progressOffset) * .1;
			let i = -Math.PI / 2 + Math.PI * 2 * e, a = -Math.PI / 2 + this.progressOffset * (Math.PI * 2);
			this.context.save(), this.context.clearRect(0, 0, this.diameter, this.diameter), this.context.beginPath(), this.context.arc(n, r, t + 4, 0, Math.PI * 2, !1), this.context.fillStyle = "rgba( 0, 0, 0, 0.4 )", this.context.fill(), this.context.beginPath(), this.context.arc(n, r, t, 0, Math.PI * 2, !1), this.context.lineWidth = this.thickness, this.context.strokeStyle = "rgba( 255, 255, 255, 0.2 )", this.context.stroke(), this.playing && (this.context.beginPath(), this.context.arc(n, r, t, a, i, !1), this.context.lineWidth = this.thickness, this.context.strokeStyle = "#fff", this.context.stroke()), this.context.translate(n - 28 / 2, r - 28 / 2), this.playing ? (this.context.fillStyle = "#fff", this.context.fillRect(0, 0, 28 / 2 - 4, 28), this.context.fillRect(18, 0, 28 / 2 - 4, 28)) : (this.context.beginPath(), this.context.translate(4, 0), this.context.moveTo(0, 0), this.context.lineTo(24, 28 / 2), this.context.lineTo(0, 28), this.context.fillStyle = "#fff", this.context.fill()), this.context.restore();
		}
		on(e, t) {
			this.canvas.addEventListener(e, t, !1);
		}
		off(e, t) {
			this.canvas.removeEventListener(e, t, !1);
		}
		destroy() {
			this.playing = !1, this.canvas.parentNode && this.container.removeChild(this.canvas);
		}
	}, we$2 = {
		width: 960,
		height: 700,
		margin: .04,
		minScale: .2,
		maxScale: 2,
		controls: !0,
		controlsTutorial: !0,
		controlsLayout: "bottom-right",
		controlsBackArrows: "faded",
		progress: !0,
		slideNumber: !1,
		showSlideNumber: "all",
		hashOneBasedIndex: !1,
		hash: !1,
		respondToHashChanges: !0,
		jumpToSlide: !0,
		history: !1,
		keyboard: !0,
		keyboardCondition: null,
		disableLayout: !1,
		overview: !0,
		center: !0,
		touch: !0,
		loop: !1,
		rtl: !1,
		navigationMode: "default",
		shuffle: !1,
		fragments: !0,
		fragmentInURL: !0,
		embedded: !1,
		help: !0,
		pause: !0,
		showNotes: !1,
		showHiddenSlides: !1,
		autoPlayMedia: null,
		preloadIframes: null,
		mouseWheel: !1,
		previewLinks: !1,
		viewDistance: 3,
		mobileViewDistance: 2,
		display: "block",
		hideInactiveCursor: !0,
		hideCursorTime: 5e3,
		sortFragmentsOnSync: !0,
		autoAnimate: !0,
		autoAnimateMatcher: null,
		autoAnimateEasing: "ease",
		autoAnimateDuration: 1,
		autoAnimateUnmatched: !0,
		autoAnimateStyles: [
			"opacity",
			"color",
			"background-color",
			"padding",
			"font-size",
			"line-height",
			"letter-spacing",
			"border-width",
			"border-color",
			"border-radius",
			"outline",
			"outline-offset"
		],
		autoSlide: 0,
		autoSlideStoppable: !0,
		autoSlideMethod: null,
		defaultTiming: null,
		postMessage: !0,
		postMessageEvents: !1,
		focusBodyOnPageVisibilityChange: !0,
		transition: "slide",
		transitionSpeed: "default",
		backgroundTransition: "fade",
		parallaxBackgroundImage: "",
		parallaxBackgroundSize: "",
		parallaxBackgroundRepeat: "",
		parallaxBackgroundPosition: "",
		parallaxBackgroundHorizontal: null,
		parallaxBackgroundVertical: null,
		view: null,
		scrollLayout: "full",
		scrollSnap: "mandatory",
		scrollProgress: "auto",
		scrollActivationWidth: 435,
		pdfMaxPagesPerSlide: Infinity,
		pdfSeparateFragments: !0,
		pdfPageHeightOffset: -1,
		dependencies: [],
		plugins: []
	}, Te$2 = "6.0.1";
	function z$3(a, s) {
		arguments.length < 2 && (s = arguments[0], a = document.querySelector(".reveal"));
		let l = {}, f = {}, p = !1, m = !1, h, _, v, y, b = {
			hasNavigatedHorizontally: !1,
			hasNavigatedVertically: !1
		}, x = [], S = 1, T = {
			layout: "",
			overview: ""
		}, D = {}, ie = "idle", O = 0, k, A = 0, se = -1, j = !1, M = new ee$2(l), N = new ne$2(l), P = new re$2(l), _e = new oe$2(l), I = new ae$2(l), L = new ce$2(l), R = new le$2(l), z = new ue$2(l), B = new de$2(l), V = new fe$2(l), H = new pe$2(l), U = new me$2(l), W = new he$2(l), Ee = new ge$2(l), G = new ve$2(l), K = new ye$2(l), q = new xe$2(l), De = new be$2(l), J = new Se$2(l);
		function Oe(e) {
			if (!a) throw "Unable to find presentation root (<div class=\"reveal\">).";
			if (p) throw "Reveal.js has already been initialized.";
			if (p = !0, D.wrapper = a, D.slides = a.querySelector(".slides"), !D.slides) throw "Unable to find slides container (<div class=\"slides\">).";
			return f = F$3(F$3(F$3(F$3(F$3({}, we$2), f), s), e), u$3()), /print-pdf/gi.test(window.location.search) && (f.view = "print"), ke(), window.addEventListener("load", X, !1), G.load(f.plugins, f.dependencies).then(Ae), new Promise((e) => l.on("ready", e));
		}
		function ke() {
			f.embedded === !0 ? D.viewport = o$3(a, ".reveal-viewport") || a : (D.viewport = document.body, document.documentElement.classList.add("reveal-full-page")), D.viewport.classList.add("reveal-viewport");
		}
		function Ae() {
			p !== !1 && (m = !0, Me(), Ne(), Be(), Re(), ze(), _t(), Ve(), I.update(!0), je(), H.readURL(), setTimeout(() => {
				D.slides.classList.remove("no-transition"), D.wrapper.classList.add("ready"), Y({
					type: "ready",
					data: {
						indexh: h,
						indexv: _,
						currentSlide: y
					}
				});
			}, 1));
		}
		function je() {
			let e = f.view === "print", t = f.view === "scroll" || f.view === "reader";
			(e || t) && (e ? Ue() : De.unbind(), D.viewport.classList.add("loading-scroll-mode"), e ? document.readyState === "complete" ? R.activate() : window.addEventListener("load", () => R.activate()) : L.activate());
		}
		function Me() {
			f.showHiddenSlides || t$4(D.wrapper, "section[data-visibility=\"hidden\"]").forEach((e) => {
				let t = e.parentNode;
				t.childElementCount === 1 && /section/i.test(t.nodeName) ? t.remove() : e.remove();
			});
		}
		function Ne() {
			D.slides.classList.add("no-transition"), g$3 ? D.wrapper.classList.add("no-hover") : D.wrapper.classList.remove("no-hover"), I.render(), N.render(), P.render(), U.render(), W.render(), J.render(), D.pauseOverlay = c$3(D.wrapper, "div", "pause-overlay", f.controls ? "<button class=\"resume-button\">Resume presentation</button>" : null), D.statusElement = Pe(), D.wrapper.setAttribute("role", "application");
		}
		function Pe() {
			let e = D.wrapper.querySelector(".aria-status");
			return e || (e = document.createElement("div"), e.style.position = "absolute", e.style.height = "1px", e.style.width = "1px", e.style.overflow = "hidden", e.style.clip = "rect( 1px, 1px, 1px, 1px )", e.classList.add("aria-status"), e.setAttribute("aria-live", "polite"), e.setAttribute("aria-atomic", "true"), D.wrapper.appendChild(e)), e;
		}
		function Fe(e) {
			D.statusElement.textContent = e;
		}
		function Ie(e) {
			let t = "";
			if (e.nodeType === 3) t += e.textContent.trim();
			else if (e.nodeType === 1) {
				let n = e.getAttribute("aria-hidden"), r = window.getComputedStyle(e).display === "none";
				if (n !== "true" && !r) {
					if (e.tagName === "IMG" || e.tagName === "VIDEO") {
						let n = e.getAttribute("alt");
						n && (t += Le(n));
					}
					Array.from(e.childNodes).forEach((e) => {
						t += Ie(e);
					}), [
						"P",
						"DIV",
						"UL",
						"OL",
						"LI",
						"H1",
						"H2",
						"H3",
						"H4",
						"H5",
						"H6",
						"BLOCKQUOTE"
					].includes(e.tagName) && t.trim() !== "" && (t = Le(t));
				}
			}
			return t = t.trim(), t === "" ? "" : t + " ";
		}
		function Le(e) {
			let t = e.trim();
			return t === "" ? e : /[.!?]$/.test(t) ? t : t + ".";
		}
		function Re() {
			setInterval(() => {
				(!L.isActive() && D.wrapper.scrollTop !== 0 || D.wrapper.scrollLeft !== 0) && (D.wrapper.scrollTop = 0, D.wrapper.scrollLeft = 0);
			}, 1e3);
		}
		function ze() {
			document.addEventListener("fullscreenchange", $t), document.addEventListener("webkitfullscreenchange", $t);
		}
		function Be() {
			f.postMessage && window.addEventListener("message", Jt, !1);
		}
		function Ve(t) {
			let r = F$3({}, f);
			if (typeof t == "object" && e$5(f, t), l.isReady() === !1) return;
			let i = D.wrapper.querySelectorAll(C$3).length;
			D.wrapper.classList.remove(r.transition), D.wrapper.classList.add(f.transition), D.wrapper.setAttribute("data-transition-speed", f.transitionSpeed), D.wrapper.setAttribute("data-background-transition", f.backgroundTransition), D.viewport.style.setProperty("--slide-width", typeof f.width == "string" ? f.width : f.width + "px"), D.viewport.style.setProperty("--slide-height", typeof f.height == "string" ? f.height : f.height + "px"), f.shuffle && vt(), n$4(D.wrapper, "embedded", f.embedded), n$4(D.wrapper, "rtl", f.rtl), n$4(D.wrapper, "center", f.center), f.pause === !1 && st(), _e.reset(), k && (k.destroy(), k = null), i > 1 && f.autoSlide && f.autoSlideStoppable && (k = new Ce$2(D.wrapper, () => Math.min(Math.max((Date.now() - se) / O, 0), 1)), k.on("click", en), j = !1), f.navigationMode === "default" ? D.wrapper.removeAttribute("data-navigation-mode") : D.wrapper.setAttribute("data-navigation-mode", f.navigationMode), J.configure(f, r), q.configure(f, r), Ee.configure(f, r), U.configure(f, r), W.configure(f, r), V.configure(f, r), z.configure(f, r), N.configure(f, r), ht();
		}
		function He() {
			window.addEventListener("resize", Zt, !1), f.touch && De.bind(), f.keyboard && V.bind(), f.progress && W.bind(), f.respondToHashChanges && H.bind(), U.bind(), q.bind(), D.slides.addEventListener("click", Xt, !1), D.slides.addEventListener("transitionend", Yt, !1), D.pauseOverlay.addEventListener("click", st, !1), f.focusBodyOnPageVisibilityChange && document.addEventListener("visibilitychange", Qt, !1);
		}
		function Ue() {
			De.unbind(), q.unbind(), V.unbind(), U.unbind(), W.unbind(), H.unbind(), window.removeEventListener("resize", Zt, !1), D.slides.removeEventListener("click", Xt, !1), D.slides.removeEventListener("transitionend", Yt, !1), D.pauseOverlay.removeEventListener("click", st, !1);
		}
		function We() {
			p = !1, m !== !1 && (Ue(), Rt(), J.destroy(), q.destroy(), K.destroy(), G.destroy(), Ee.destroy(), U.destroy(), W.destroy(), I.destroy(), N.destroy(), P.destroy(), document.removeEventListener("fullscreenchange", $t), document.removeEventListener("webkitfullscreenchange", $t), document.removeEventListener("visibilitychange", Qt, !1), window.removeEventListener("message", Jt, !1), window.removeEventListener("load", X, !1), D.pauseOverlay && D.pauseOverlay.remove(), D.statusElement && D.statusElement.remove(), document.documentElement.classList.remove("reveal-full-page"), D.wrapper.classList.remove("ready", "center", "has-horizontal-slides", "has-vertical-slides"), D.wrapper.removeAttribute("data-transition-speed"), D.wrapper.removeAttribute("data-background-transition"), D.viewport.classList.remove("reveal-viewport"), D.viewport.style.removeProperty("--slide-width"), D.viewport.style.removeProperty("--slide-height"), D.slides.style.removeProperty("width"), D.slides.style.removeProperty("height"), D.slides.style.removeProperty("zoom"), D.slides.style.removeProperty("left"), D.slides.style.removeProperty("top"), D.slides.style.removeProperty("bottom"), D.slides.style.removeProperty("right"), D.slides.style.removeProperty("transform"), Array.from(D.wrapper.querySelectorAll(C$3)).forEach((e) => {
				e.style.removeProperty("display"), e.style.removeProperty("top"), e.removeAttribute("hidden"), e.removeAttribute("aria-hidden");
			}));
		}
		function Ge(e, t, n) {
			a.addEventListener(e, t, n);
		}
		function Ke(e, t, n) {
			a.removeEventListener(e, t, n);
		}
		function qe(e) {
			typeof e.layout == "string" && (T.layout = e.layout), typeof e.overview == "string" && (T.overview = e.overview), T.layout ? i$3(D.slides, T.layout + " " + T.overview) : i$3(D.slides, T.overview);
		}
		function Y({ target: t = D.wrapper, type: n, data: r, bubbles: i = !0 }) {
			let a = document.createEvent("HTMLEvents", 1, 2);
			return a.initEvent(n, i, !0), e$5(a, r), t.dispatchEvent(a), t === D.wrapper && Ye(n), a;
		}
		function Je(e) {
			Y({
				type: "slidechanged",
				data: {
					indexh: h,
					indexv: _,
					previousSlide: v,
					currentSlide: y,
					origin: e
				}
			});
		}
		function Ye(t, n) {
			if (f.postMessageEvents && window.parent !== window.self) {
				let r = {
					namespace: "reveal",
					eventName: t,
					state: Ft()
				};
				e$5(r, n), window.parent.postMessage(JSON.stringify(r), "*");
			}
		}
		function X() {
			if (D.wrapper && !R.isActive()) {
				let e = D.viewport.offsetWidth, t = D.viewport.offsetHeight;
				if (!f.disableLayout) {
					g$3 && !f.embedded && document.documentElement.style.setProperty("--vh", window.innerHeight * .01 + "px");
					let n = L.isActive() ? Qe(e, t) : Qe(), r = S;
					Xe(f.width, f.height), D.slides.style.width = n.width + "px", D.slides.style.height = n.height + "px", S = Math.min(n.presentationWidth / n.width, n.presentationHeight / n.height), S = Math.max(S, f.minScale), S = Math.min(S, f.maxScale), S === 1 || L.isActive() ? (D.slides.style.zoom = "", D.slides.style.left = "", D.slides.style.top = "", D.slides.style.bottom = "", D.slides.style.right = "", qe({ layout: "" })) : (D.slides.style.zoom = "", D.slides.style.left = "50%", D.slides.style.top = "50%", D.slides.style.bottom = "auto", D.slides.style.right = "auto", qe({ layout: "translate(-50%, -50%) scale(" + S + ")" }));
					let i = Array.from(D.wrapper.querySelectorAll(C$3));
					for (let e = 0, t = i.length; e < t; e++) {
						let t = i[e];
						t.style.display !== "none" && (f.center || t.classList.contains("center") ? t.classList.contains("stack") ? t.style.top = 0 : t.style.top = Math.max((n.height - t.scrollHeight) / 2, 0) + "px" : t.style.top = "");
					}
					r !== S && Y({
						type: "resize",
						data: {
							oldScale: r,
							scale: S,
							size: n
						}
					});
				}
				Ze(), D.viewport.style.setProperty("--slide-scale", S), D.viewport.style.setProperty("--viewport-width", e + "px"), D.viewport.style.setProperty("--viewport-height", t + "px"), L.layout(), W.update(), I.updateParallax(), B.isActive() && B.update();
			}
		}
		function Xe(e, n) {
			t$4(D.slides, "section > .stretch, section > .r-stretch").forEach((t) => {
				let r = d$3(t, n);
				if (/(img|video)/gi.test(t.nodeName)) {
					let n = t.naturalWidth || t.videoWidth, i = t.naturalHeight || t.videoHeight, a = Math.min(e / n, r / i);
					t.style.width = n * a + "px", t.style.height = i * a + "px";
				} else t.style.width = e + "px", t.style.height = r + "px";
			});
		}
		function Ze() {
			if (D.wrapper && !f.disableLayout && !R.isActive() && typeof f.scrollActivationWidth == "number" && f.view !== "scroll") {
				let e = Qe();
				e.presentationWidth > 0 && e.presentationWidth <= f.scrollActivationWidth ? L.isActive() || (I.create(), L.activate()) : L.isActive() && L.deactivate();
			}
		}
		function Qe(e, t) {
			let n = f.width, r = f.height;
			f.disableLayout && (n = D.slides.offsetWidth, r = D.slides.offsetHeight);
			let i = {
				width: n,
				height: r,
				presentationWidth: e || D.wrapper.offsetWidth,
				presentationHeight: t || D.wrapper.offsetHeight
			};
			return i.presentationWidth -= i.presentationWidth * f.margin, i.presentationHeight -= i.presentationHeight * f.margin, typeof i.width == "string" && /%$/.test(i.width) && (i.width = parseInt(i.width, 10) / 100 * i.presentationWidth), typeof i.height == "string" && /%$/.test(i.height) && (i.height = parseInt(i.height, 10) / 100 * i.presentationHeight), i;
		}
		function $e(e, t) {
			typeof e == "object" && typeof e.setAttribute == "function" && e.setAttribute("data-previous-indexv", t || 0);
		}
		function et(e) {
			if (typeof e == "object" && typeof e.setAttribute == "function" && e.classList.contains("stack")) {
				let t = e.hasAttribute("data-start-indexv") ? "data-start-indexv" : "data-previous-indexv";
				return parseInt(e.getAttribute(t) || 0, 10);
			}
			return 0;
		}
		function tt(e = y) {
			return e && e.parentNode && !!e.parentNode.nodeName.match(/section/i);
		}
		function nt(e = y) {
			return e.classList.contains(".stack") || e.querySelector("section") !== null;
		}
		function rt() {
			return y && tt(y) ? !y.nextElementSibling : !1;
		}
		function it() {
			return h === 0 && _ === 0;
		}
		function at() {
			return y ? !(y.nextElementSibling || tt(y) && y.parentNode.nextElementSibling) : !1;
		}
		function ot() {
			if (f.pause) {
				let e = D.wrapper.classList.contains("paused");
				Rt(), D.wrapper.classList.add("paused"), e === !1 && Y({ type: "paused" });
			}
		}
		function st() {
			let e = D.wrapper.classList.contains("paused");
			D.wrapper.classList.remove("paused"), Lt(), e && Y({ type: "resumed" });
		}
		function ct(e) {
			typeof e == "boolean" ? e ? ot() : st() : lt() ? st() : ot();
		}
		function lt() {
			return D.wrapper.classList.contains("paused");
		}
		function ut(e) {
			typeof e == "boolean" ? e ? P.show() : P.hide() : P.isVisible() ? P.hide() : P.show();
		}
		function dt(e) {
			typeof e == "boolean" ? e ? Bt() : zt() : j ? Bt() : zt();
		}
		function ft() {
			return !!(O && !j);
		}
		function Z(e, t, n, r) {
			if (Y({
				type: "beforeslidechange",
				data: {
					indexh: e === void 0 ? h : e,
					indexv: t === void 0 ? _ : t,
					origin: r
				}
			}).defaultPrevented) return;
			v = y;
			let i = D.wrapper.querySelectorAll(w$3);
			if (L.isActive()) {
				let n = L.getSlideByIndices(e, t);
				n && L.scrollToSlide(n);
				return;
			}
			if (i.length === 0) return;
			t === void 0 && !B.isActive() && (t = et(i[e])), v && v.parentNode && v.parentNode.classList.contains("stack") && $e(v.parentNode, _);
			let o = x.concat();
			x.length = 0;
			let s = h || 0, c = _ || 0;
			h = yt(w$3, e === void 0 ? h : e), _ = yt(te$2, t === void 0 ? _ : t);
			let l = h !== s || _ !== c;
			l || (v = null);
			let u = i[h], d = u.querySelectorAll("section");
			a.classList.toggle("is-vertical-slide", d.length > 1), y = d[_] || u;
			let p = !1;
			l && v && y && !B.isActive() && (ie = "running", p = pt(v, y, s, c), p && D.slides.classList.add("disable-slide-transitions")), St(), X(), B.isActive() && B.update(), n !== void 0 && z.goto(n), v && v !== y && (v.classList.remove("present"), v.setAttribute("aria-hidden", "true"), it() && setTimeout(() => {
				Ot().forEach((e) => {
					$e(e, 0);
				});
			}, 0));
			stateLoop: for (let e = 0, t = x.length; e < t; e++) {
				for (let t = 0; t < o.length; t++) if (o[t] === x[e]) {
					o.splice(t, 1);
					continue stateLoop;
				}
				D.viewport.classList.add(x[e]), Y({ type: x[e] });
			}
			for (; o.length;) D.viewport.classList.remove(o.pop());
			l && (M.afterSlideChanged(), Je(r)), (l || !v) && (M.stopEmbeddedContent(v), M.startEmbeddedContent(y)), requestAnimationFrame(() => {
				Fe(Ie(y));
			}), W.update(), U.update(), J.update(), I.update(), I.updateParallax(), N.update(), z.update(), H.writeURL(), Lt(), p && (setTimeout(() => {
				D.slides.classList.remove("disable-slide-transitions");
			}, 0), f.autoAnimate && _e.run(v, y));
		}
		function pt(e, t, n, r) {
			return e.hasAttribute("data-auto-animate") && t.hasAttribute("data-auto-animate") && e.getAttribute("data-auto-animate-id") === t.getAttribute("data-auto-animate-id") && !(h > n || _ > r ? t : e).hasAttribute("data-auto-animate-restart");
		}
		function mt(e, t, n) {
			let r = h || 0;
			h = t, _ = n;
			let i = y !== e;
			v = y, y = e, y && v && f.autoAnimate && pt(v, y, r, _) && _e.run(v, y), i && (M.afterSlideChanged(), v && (M.stopEmbeddedContent(v), M.stopEmbeddedContent(v.slideBackgroundElement)), M.startEmbeddedContent(y), M.startEmbeddedContent(y.slideBackgroundElement)), requestAnimationFrame(() => {
				Fe(Ie(y));
			}), Je();
		}
		function ht() {
			Ue(), He(), X(), O = f.autoSlide, Lt(), I.create(), H.writeURL(), f.sortFragmentsOnSync === !0 && z.sortAll(), h !== void 0 && (h = yt(w$3, h), _ = yt(te$2, _)), U.update(), W.update(), St(), J.update(), J.updateVisibility(), K.update(), I.update(!0), N.update(), M.formatEmbeddedContent(), f.autoPlayMedia === !1 ? M.stopEmbeddedContent(y, { unloadIframes: !1 }) : M.startEmbeddedContent(y), B.isActive() && B.layout(), Y({ type: "sync" });
		}
		function gt(e = y) {
			I.sync(e), z.sync(e), M.load(e), I.update(), J.update(), Y({
				type: "slidesync",
				data: { slide: e }
			});
		}
		function _t() {
			$().forEach((e) => {
				t$4(e, "section").forEach((e, t) => {
					t > 0 && (e.classList.remove("present"), e.classList.remove("past"), e.classList.add("future"), e.setAttribute("aria-hidden", "true"));
				});
			});
		}
		function vt(e = $()) {
			e.forEach((t, n) => {
				let r = e[Math.floor(Math.random() * e.length)];
				r.parentNode === t.parentNode && t.parentNode.insertBefore(t, r);
				let i = t.querySelectorAll("section");
				i.length && vt(i);
			});
		}
		function yt(e, n) {
			let r = t$4(D.wrapper, e), i = r.length, a = L.isActive() || R.isActive(), o = !1, s = !1;
			if (i) {
				f.loop && (n >= i && (o = !0), n %= i, n < 0 && (n = i + n, s = !0)), n = Math.max(Math.min(n, i - 1), 0);
				for (let e = 0; e < i; e++) {
					let t = r[e], i = f.rtl && !tt(t);
					if (t.classList.remove("past"), t.classList.remove("present"), t.classList.remove("future"), t.setAttribute("hidden", ""), t.setAttribute("aria-hidden", "true"), t.querySelector("section") && t.classList.add("stack"), a) {
						t.classList.add("present");
						continue;
					}
					e < n ? (t.classList.add(i ? "future" : "past"), f.fragments && bt(t)) : e > n ? (t.classList.add(i ? "past" : "future"), f.fragments && xt(t)) : e === n && f.fragments && (o ? xt(t) : s && bt(t));
				}
				let e = r[n], t = e.classList.contains("present");
				e.classList.add("present"), e.removeAttribute("hidden"), e.removeAttribute("aria-hidden"), t || Y({
					target: e,
					type: "visible",
					bubbles: !1
				});
				let c = e.getAttribute("data-state");
				c && (x = x.concat(c.split(" ")));
			} else n = 0;
			return n;
		}
		function bt(e) {
			t$4(e, ".fragment").forEach((e) => {
				e.classList.add("visible"), e.classList.remove("current-fragment");
			});
		}
		function xt(e) {
			t$4(e, ".fragment.visible").forEach((e) => {
				e.classList.remove("visible", "current-fragment");
			});
		}
		function St() {
			let e = $(), n = e.length, r, i;
			if (n && h !== void 0) {
				let a = B.isActive(), o = a ? 10 : f.viewDistance;
				g$3 && (o = a ? 6 : f.mobileViewDistance), R.isActive() && (o = Number.MAX_VALUE);
				for (let s = 0; s < n; s++) {
					let c = e[s], l = t$4(c, "section"), u = l.length;
					if (r = Math.abs((h || 0) - s) || 0, f.loop && (r = Math.abs(((h || 0) - s) % (n - o)) || 0), r < o ? M.load(c) : M.unload(c), u) {
						let e = a ? 0 : et(c);
						for (let t = 0; t < u; t++) {
							let n = l[t];
							i = Math.abs(s === (h || 0) ? (_ || 0) - t : t - e), r + i < o ? M.load(n) : M.unload(n);
						}
					}
				}
				At() ? D.wrapper.classList.add("has-vertical-slides") : D.wrapper.classList.remove("has-vertical-slides"), kt() ? D.wrapper.classList.add("has-horizontal-slides") : D.wrapper.classList.remove("has-horizontal-slides");
			}
		}
		function Q({ includeFragments: e = !1 } = {}) {
			let t = D.wrapper.querySelectorAll(w$3), n = D.wrapper.querySelectorAll(te$2), r = {
				left: h > 0,
				right: h < t.length - 1,
				up: _ > 0,
				down: _ < n.length - 1
			};
			if (f.loop && (t.length > 1 && (r.left = !0, r.right = !0), n.length > 1 && (r.up = !0, r.down = !0)), t.length > 1 && f.navigationMode === "linear" && (r.right = r.right || r.down, r.left = r.left || r.up), e === !0) {
				let e = z.availableRoutes();
				r.left = r.left || e.prev, r.up = r.up || e.prev, r.down = r.down || e.next, r.right = r.right || e.next;
			}
			if (f.rtl) {
				let e = r.left;
				r.left = r.right, r.right = e;
			}
			return r;
		}
		function Ct(e = y) {
			let t = $(), n = 0;
			mainLoop: for (let r = 0; r < t.length; r++) {
				let i = t[r], a = i.querySelectorAll("section");
				for (let t = 0; t < a.length; t++) {
					if (a[t] === e) break mainLoop;
					a[t].dataset.visibility !== "uncounted" && n++;
				}
				if (i === e) break;
				i.classList.contains("stack") === !1 && i.dataset.visibility !== "uncounted" && n++;
			}
			return n;
		}
		function wt() {
			let e = Mt(), t = Ct();
			if (y) {
				let e = y.querySelectorAll(".fragment");
				if (e.length > 0) {
					let n = y.querySelectorAll(".fragment.visible");
					t += n.length / e.length * .9;
				}
			}
			return Math.min(t / (e - 1), 1);
		}
		function Tt(e) {
			let n = h, r = _, i;
			if (e) if (L.isActive()) n = parseInt(e.getAttribute("data-index-h"), 10), e.getAttribute("data-index-v") && (r = parseInt(e.getAttribute("data-index-v"), 10));
			else {
				let i = tt(e), a = i ? e.parentNode : e, o = $();
				n = Math.max(o.indexOf(a), 0), r = void 0, i && (r = Math.max(t$4(e.parentNode, "section").indexOf(e), 0));
			}
			if (!e && y && y.querySelectorAll(".fragment").length > 0) {
				let e = y.querySelector(".current-fragment");
				i = e && e.hasAttribute("data-fragment-index") ? parseInt(e.getAttribute("data-fragment-index"), 10) : y.querySelectorAll(".fragment.visible").length - 1;
			}
			return {
				h: n,
				v: r,
				f: i
			};
		}
		function Et() {
			return t$4(D.wrapper, C$3 + ":not(.stack):not([data-visibility=\"uncounted\"])");
		}
		function $() {
			return t$4(D.wrapper, w$3);
		}
		function Dt() {
			return t$4(D.wrapper, ".slides>section>section");
		}
		function Ot() {
			return t$4(D.wrapper, w$3 + ".stack");
		}
		function kt() {
			return $().length > 1;
		}
		function At() {
			return Dt().length > 1;
		}
		function jt() {
			return Et().map((e) => {
				let t = {};
				for (let n = 0; n < e.attributes.length; n++) {
					let r = e.attributes[n];
					t[r.name] = r.value;
				}
				return t;
			});
		}
		function Mt() {
			return Et().length;
		}
		function Nt(e, t) {
			let n = $()[e], r = n && n.querySelectorAll("section");
			return r && r.length && typeof t == "number" ? r ? r[t] : void 0 : n;
		}
		function Pt(e, t) {
			let n = typeof e == "number" ? Nt(e, t) : e;
			if (n) return n.slideBackgroundElement;
		}
		function Ft() {
			let e = Tt();
			return F$3({
				indexh: e.h,
				indexv: e.v,
				indexf: e.f,
				paused: lt(),
				overview: B.isActive()
			}, K.getState());
		}
		function It(e) {
			if (typeof e == "object") {
				Z(r$4(e.indexh), r$4(e.indexv), r$4(e.indexf));
				let t = r$4(e.paused), n = r$4(e.overview);
				typeof t == "boolean" && t !== lt() && ct(t), typeof n == "boolean" && n !== B.isActive() && B.toggle(n), K.setState(e);
			}
		}
		function Lt() {
			if (Rt(), y && f.autoSlide !== !1) {
				let e = y.querySelector(".current-fragment[data-autoslide]"), n = e ? e.getAttribute("data-autoslide") : null, r = y.parentNode ? y.parentNode.getAttribute("data-autoslide") : null, i = y.getAttribute("data-autoslide");
				n ? O = parseInt(n, 10) : i ? O = parseInt(i, 10) : r ? O = parseInt(r, 10) : (O = f.autoSlide, y.querySelectorAll(".fragment").length === 0 && t$4(y, "video, audio").forEach((e) => {
					e.hasAttribute("data-autoplay") && O && e.duration * 1e3 / e.playbackRate > O && (O = e.duration * 1e3 / e.playbackRate + 1e3);
				})), O && !j && !lt() && !B.isActive() && (!at() || z.availableRoutes().next || f.loop === !0) && (A = setTimeout(() => {
					typeof f.autoSlideMethod == "function" ? f.autoSlideMethod() : Kt(), Lt();
				}, O), se = Date.now()), k && k.setPlaying(A !== -1);
			}
		}
		function Rt() {
			clearTimeout(A), A = -1;
		}
		function zt() {
			O && !j && (j = !0, Y({ type: "autoslidepaused" }), clearTimeout(A), k && k.setPlaying(!1));
		}
		function Bt() {
			O && j && (j = !1, Y({ type: "autoslideresumed" }), Lt());
		}
		function Vt({ skipFragments: e = !1 } = {}) {
			if (b.hasNavigatedHorizontally = !0, L.isActive()) return L.prev();
			f.rtl ? (B.isActive() || e || z.next() === !1) && Q().left && Z(h + 1, f.navigationMode === "grid" ? _ : void 0) : (B.isActive() || e || z.prev() === !1) && Q().left && Z(h - 1, f.navigationMode === "grid" ? _ : void 0);
		}
		function Ht({ skipFragments: e = !1 } = {}) {
			if (b.hasNavigatedHorizontally = !0, L.isActive()) return L.next();
			f.rtl ? (B.isActive() || e || z.prev() === !1) && Q().right && Z(h - 1, f.navigationMode === "grid" ? _ : void 0) : (B.isActive() || e || z.next() === !1) && Q().right && Z(h + 1, f.navigationMode === "grid" ? _ : void 0);
		}
		function Ut({ skipFragments: e = !1 } = {}) {
			if (L.isActive()) return L.prev();
			(B.isActive() || e || z.prev() === !1) && Q().up && Z(h, _ - 1);
		}
		function Wt({ skipFragments: e = !1 } = {}) {
			if (b.hasNavigatedVertically = !0, L.isActive()) return L.next();
			(B.isActive() || e || z.next() === !1) && Q().down && Z(h, _ + 1);
		}
		function Gt({ skipFragments: e = !1 } = {}) {
			if (L.isActive()) return L.prev();
			if (e || z.prev() === !1) if (Q().up) Ut({ skipFragments: e });
			else {
				let n;
				if (n = f.rtl ? t$4(D.wrapper, w$3 + ".future").pop() : t$4(D.wrapper, w$3 + ".past").pop(), n && n.classList.contains("stack")) {
					let e = n.querySelectorAll("section").length - 1 || void 0;
					Z(h - 1, e);
				} else f.rtl ? Ht({ skipFragments: e }) : Vt({ skipFragments: e });
			}
		}
		function Kt({ skipFragments: e = !1 } = {}) {
			if (b.hasNavigatedHorizontally = !0, b.hasNavigatedVertically = !0, L.isActive()) return L.next();
			if (e || z.next() === !1) {
				let t = Q();
				t.down && t.right && f.loop && rt() && (t.down = !1), t.down ? Wt({ skipFragments: e }) : f.rtl ? Vt({ skipFragments: e }) : Ht({ skipFragments: e });
			}
		}
		function qt(e) {
			f.autoSlideStoppable && zt();
		}
		function Jt(e) {
			let t = e.data;
			if (typeof t == "string" && t.charAt(0) === "{" && t.charAt(t.length - 1) === "}" && (t = JSON.parse(t), t.method && typeof l[t.method] == "function")) if (E$3.test(t.method) === !1) {
				let e = l[t.method].apply(l, t.args);
				Ye("callback", {
					method: t.method,
					result: e
				});
			} else console.warn("reveal.js: \"" + t.method + "\" is is blacklisted from the postMessage API");
		}
		function Yt(e) {
			ie === "running" && /section/gi.test(e.target.nodeName) && (ie = "idle", Y({
				type: "slidetransitionend",
				data: {
					indexh: h,
					indexv: _,
					previousSlide: v,
					currentSlide: y
				}
			}));
		}
		function Xt(e) {
			let t = o$3(e.target, "a[href^=\"#\"]");
			if (t) {
				let n = t.getAttribute("href"), r = H.getIndicesFromHash(n);
				r && (l.slide(r.h, r.v, r.f), e.preventDefault());
			}
		}
		function Zt(e) {
			X();
		}
		function Qt(e) {
			document.hidden === !1 && document.activeElement !== document.body && (typeof document.activeElement.blur == "function" && document.activeElement.blur(), document.body.focus());
		}
		function $t(e) {
			(document.fullscreenElement || document.webkitFullscreenElement) === D.wrapper && (e.stopImmediatePropagation(), setTimeout(() => {
				l.layout(), l.focus.focus();
			}, 1));
		}
		function en(e) {
			at() && f.loop === !1 ? (Z(0, 0), Bt()) : j ? Bt() : zt();
		}
		let tn = {
			VERSION: Te$2,
			initialize: Oe,
			configure: Ve,
			destroy: We,
			sync: ht,
			syncSlide: gt,
			syncFragments: z.sync.bind(z),
			slide: Z,
			left: Vt,
			right: Ht,
			up: Ut,
			down: Wt,
			prev: Gt,
			next: Kt,
			navigateLeft: Vt,
			navigateRight: Ht,
			navigateUp: Ut,
			navigateDown: Wt,
			navigatePrev: Gt,
			navigateNext: Kt,
			navigateFragment: z.goto.bind(z),
			prevFragment: z.prev.bind(z),
			nextFragment: z.next.bind(z),
			on: Ge,
			off: Ke,
			addEventListener: Ge,
			removeEventListener: Ke,
			layout: X,
			shuffle: vt,
			availableRoutes: Q,
			availableFragments: z.availableRoutes.bind(z),
			toggleHelp: K.toggleHelp.bind(K),
			toggleOverview: B.toggle.bind(B),
			toggleScrollView: L.toggle.bind(L),
			togglePause: ct,
			toggleAutoSlide: dt,
			toggleJumpToSlide: ut,
			isFirstSlide: it,
			isLastSlide: at,
			isLastVerticalSlide: rt,
			isVerticalSlide: tt,
			isVerticalStack: nt,
			isPaused: lt,
			isAutoSliding: ft,
			isSpeakerNotes: J.isSpeakerNotesWindow.bind(J),
			isOverview: B.isActive.bind(B),
			isFocused: q.isFocused.bind(q),
			isOverlayOpen: K.isOpen.bind(K),
			isScrollView: L.isActive.bind(L),
			isPrintView: R.isActive.bind(R),
			isReady: () => m,
			loadSlide: M.load.bind(M),
			unloadSlide: M.unload.bind(M),
			startEmbeddedContent: () => M.startEmbeddedContent(y),
			stopEmbeddedContent: () => M.stopEmbeddedContent(y, { unloadIframes: !1 }),
			previewIframe: K.previewIframe.bind(K),
			previewImage: K.previewImage.bind(K),
			previewVideo: K.previewVideo.bind(K),
			showPreview: K.previewIframe.bind(K),
			hidePreview: K.close.bind(K),
			addEventListeners: He,
			removeEventListeners: Ue,
			dispatchEvent: Y,
			getState: Ft,
			setState: It,
			getProgress: wt,
			getIndices: Tt,
			getSlidesAttributes: jt,
			getSlidePastCount: Ct,
			getTotalSlides: Mt,
			getSlide: Nt,
			getPreviousSlide: () => v,
			getCurrentSlide: () => y,
			getSlideBackground: Pt,
			getSlideNotes: J.getSlideNotes.bind(J),
			getSlides: Et,
			getHorizontalSlides: $,
			getVerticalSlides: Dt,
			hasHorizontalSlides: kt,
			hasVerticalSlides: At,
			hasNavigatedHorizontally: () => b.hasNavigatedHorizontally,
			hasNavigatedVertically: () => b.hasNavigatedVertically,
			shouldAutoAnimateBetween: pt,
			addKeyBinding: V.addKeyBinding.bind(V),
			removeKeyBinding: V.removeKeyBinding.bind(V),
			triggerKey: V.triggerKey.bind(V),
			registerKeyboardShortcut: V.registerKeyboardShortcut.bind(V),
			getComputedSlideSize: Qe,
			setCurrentScrollPage: mt,
			removeHiddenSlides: Me,
			getScale: () => S,
			getConfig: () => f,
			getQueryHash: u$3,
			getSlidePath: H.getHash.bind(H),
			getRevealElement: () => a,
			getSlidesElement: () => D.slides,
			getViewportElement: () => D.viewport,
			getBackgroundsElement: () => I.element,
			registerPlugin: G.registerPlugin.bind(G),
			hasPlugin: G.hasPlugin.bind(G),
			getPlugin: G.getPlugin.bind(G),
			getPlugins: G.getRegisteredPlugins.bind(G)
		};
		return e$5(l, F$3(F$3({}, tn), {}, {
			announceStatus: Fe,
			getStatusText: Ie,
			focus: q,
			scroll: L,
			progress: W,
			controls: U,
			location: H,
			overview: B,
			keyboard: V,
			fragments: z,
			backgrounds: I,
			slideContent: M,
			slideNumber: N,
			onUserInput: qt,
			closeOverlay: K.close.bind(K),
			updateSlidesVisibility: St,
			layoutSlideContents: Xe,
			transformSlides: qe,
			cueAutoSlide: Lt,
			cancelAutoSlide: Rt
		})), tn;
	}
	var B$3 = z$3, V$3 = [];
	B$3.initialize = (e) => {
		let t = document.querySelector(".reveal");
		if (!(t instanceof HTMLElement)) throw Error("Unable to find presentation root (<div class=\"reveal\">).");
		return Object.assign(B$3, new z$3(t, e)), V$3.map((e) => e(B$3)), B$3.initialize();
	}, [
		"configure",
		"on",
		"off",
		"addEventListener",
		"removeEventListener",
		"registerPlugin"
	].forEach((e) => {
		B$3[e] = (...t) => {
			V$3.push((n) => n[e].call(null, ...t));
		};
	}), B$3.isReady = () => !1, B$3.VERSION = Te$2;
	//#endregion
	//#region node_modules/socket.io-client/dist/socket.io.esm.min.js
	/*!
	* Socket.IO v4.8.3
	* (c) 2014-2025 Guillermo Rauch
	* Released under the MIT License.
	*/
	var t$3 = Object.create(null);
	t$3.open = "0", t$3.close = "1", t$3.ping = "2", t$3.pong = "3", t$3.message = "4", t$3.upgrade = "5", t$3.noop = "6";
	var s$2 = Object.create(null);
	Object.keys(t$3).forEach(((i) => {
		s$2[t$3[i]] = i;
	}));
	var i$2 = {
		type: "error",
		data: "parser error"
	}, e$4 = "function" == typeof Blob || "undefined" != typeof Blob && "[object BlobConstructor]" === Object.prototype.toString.call(Blob), n$3 = "function" == typeof ArrayBuffer, r$3 = (t) => "function" == typeof ArrayBuffer.isView ? ArrayBuffer.isView(t) : t && t.buffer instanceof ArrayBuffer, o$2 = ({ type: s, data: i }, o, c) => e$4 && i instanceof Blob ? o ? c(i) : h$2(i, c) : n$3 && (i instanceof ArrayBuffer || r$3(i)) ? o ? c(i) : h$2(new Blob([i]), c) : c(t$3[s] + (i || "")), h$2 = (t, s) => {
		const i = new FileReader();
		return i.onload = function() {
			const t = i.result.split(",")[1];
			s("b" + (t || ""));
		}, i.readAsDataURL(t);
	};
	function c$2(t) {
		return t instanceof Uint8Array ? t : t instanceof ArrayBuffer ? new Uint8Array(t) : new Uint8Array(t.buffer, t.byteOffset, t.byteLength);
	}
	var a$2;
	var u$2 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", f$2 = "undefined" == typeof Uint8Array ? [] : new Uint8Array(256);
	for (let t = 0; t < 64; t++) f$2[u$2.charCodeAt(t)] = t;
	var l$2 = "function" == typeof ArrayBuffer, d$2 = (t, e) => {
		if ("string" != typeof t) return {
			type: "message",
			data: y$2(t, e)
		};
		const n = t.charAt(0);
		if ("b" === n) return {
			type: "message",
			data: p$2(t.substring(1), e)
		};
		return s$2[n] ? t.length > 1 ? {
			type: s$2[n],
			data: t.substring(1)
		} : { type: s$2[n] } : i$2;
	}, p$2 = (t, s) => {
		if (l$2) return y$2(((t) => {
			let s, i, e, n, r, o = .75 * t.length, h = t.length, c = 0;
			"=" === t[t.length - 1] && (o--, "=" === t[t.length - 2] && o--);
			const a = new ArrayBuffer(o), u = new Uint8Array(a);
			for (s = 0; s < h; s += 4) i = f$2[t.charCodeAt(s)], e = f$2[t.charCodeAt(s + 1)], n = f$2[t.charCodeAt(s + 2)], r = f$2[t.charCodeAt(s + 3)], u[c++] = i << 2 | e >> 4, u[c++] = (15 & e) << 4 | n >> 2, u[c++] = (3 & n) << 6 | 63 & r;
			return a;
		})(t), s);
		return {
			base64: !0,
			data: t
		};
	}, y$2 = (t, s) => "blob" === s ? t instanceof Blob ? t : new Blob([t]) : t instanceof ArrayBuffer ? t : t.buffer, b$2 = String.fromCharCode(30);
	function g$2() {
		return new TransformStream({ transform(t, s) {
			(function(t, s) {
				e$4 && t.data instanceof Blob ? t.data.arrayBuffer().then(c$2).then(s) : n$3 && (t.data instanceof ArrayBuffer || r$3(t.data)) ? s(c$2(t.data)) : o$2(t, !1, ((t) => {
					a$2 || (a$2 = new TextEncoder()), s(a$2.encode(t));
				}));
			})(t, ((i) => {
				const e = i.length;
				let n;
				if (e < 126) n = new Uint8Array(1), new DataView(n.buffer).setUint8(0, e);
				else if (e < 65536) {
					n = new Uint8Array(3);
					const t = new DataView(n.buffer);
					t.setUint8(0, 126), t.setUint16(1, e);
				} else {
					n = new Uint8Array(9);
					const t = new DataView(n.buffer);
					t.setUint8(0, 127), t.setBigUint64(1, BigInt(e));
				}
				t.data && "string" != typeof t.data && (n[0] |= 128), s.enqueue(n), s.enqueue(i);
			}));
		} });
	}
	var w$2;
	function v$2(t) {
		return t.reduce(((t, s) => t + s.length), 0);
	}
	function m$2(t, s) {
		if (t[0].length === s) return t.shift();
		const i = new Uint8Array(s);
		let e = 0;
		for (let n = 0; n < s; n++) i[n] = t[0][e++], e === t[0].length && (t.shift(), e = 0);
		return t.length && e < t[0].length && (t[0] = t[0].slice(e)), i;
	}
	function k$2(t) {
		if (t) return function(t) {
			for (var s in k$2.prototype) t[s] = k$2.prototype[s];
			return t;
		}(t);
	}
	k$2.prototype.on = k$2.prototype.addEventListener = function(t, s) {
		return this.t = this.t || {}, (this.t["$" + t] = this.t["$" + t] || []).push(s), this;
	}, k$2.prototype.once = function(t, s) {
		function i() {
			this.off(t, i), s.apply(this, arguments);
		}
		return i.fn = s, this.on(t, i), this;
	}, k$2.prototype.off = k$2.prototype.removeListener = k$2.prototype.removeAllListeners = k$2.prototype.removeEventListener = function(t, s) {
		if (this.t = this.t || {}, 0 == arguments.length) return this.t = {}, this;
		var i, e = this.t["$" + t];
		if (!e) return this;
		if (1 == arguments.length) return delete this.t["$" + t], this;
		for (var n = 0; n < e.length; n++) if ((i = e[n]) === s || i.fn === s) {
			e.splice(n, 1);
			break;
		}
		return 0 === e.length && delete this.t["$" + t], this;
	}, k$2.prototype.emit = function(t) {
		this.t = this.t || {};
		for (var s = new Array(arguments.length - 1), i = this.t["$" + t], e = 1; e < arguments.length; e++) s[e - 1] = arguments[e];
		if (i) {
			e = 0;
			for (var n = (i = i.slice(0)).length; e < n; ++e) i[e].apply(this, s);
		}
		return this;
	}, k$2.prototype.emitReserved = k$2.prototype.emit, k$2.prototype.listeners = function(t) {
		return this.t = this.t || {}, this.t["$" + t] || [];
	}, k$2.prototype.hasListeners = function(t) {
		return !!this.listeners(t).length;
	};
	var A$2 = "function" == typeof Promise && "function" == typeof Promise.resolve ? (t) => Promise.resolve().then(t) : (t, s) => s(t, 0), E$2 = "undefined" != typeof self ? self : "undefined" != typeof window ? window : Function("return this")();
	function O$2(t, ...s) {
		return s.reduce(((s, i) => (t.hasOwnProperty(i) && (s[i] = t[i]), s)), {});
	}
	var _$2 = E$2.setTimeout, j$2 = E$2.clearTimeout;
	function x$2(t, s) {
		s.useNativeTimers ? (t.setTimeoutFn = _$2.bind(E$2), t.clearTimeoutFn = j$2.bind(E$2)) : (t.setTimeoutFn = E$2.setTimeout.bind(E$2), t.clearTimeoutFn = E$2.clearTimeout.bind(E$2));
	}
	function B$2() {
		return Date.now().toString(36).substring(3) + Math.random().toString(36).substring(2, 5);
	}
	var C$2 = class extends Error {
		constructor(t, s, i) {
			super(t), this.description = s, this.context = i, this.type = "TransportError";
		}
	};
	var T$2 = class extends k$2 {
		constructor(t) {
			super(), this.writable = !1, x$2(this, t), this.opts = t, this.query = t.query, this.socket = t.socket, this.supportsBinary = !t.forceBase64;
		}
		onError(t, s, i) {
			return super.emitReserved("error", new C$2(t, s, i)), this;
		}
		open() {
			return this.readyState = "opening", this.doOpen(), this;
		}
		close() {
			return "opening" !== this.readyState && "open" !== this.readyState || (this.doClose(), this.onClose()), this;
		}
		send(t) {
			"open" === this.readyState && this.write(t);
		}
		onOpen() {
			this.readyState = "open", this.writable = !0, super.emitReserved("open");
		}
		onData(t) {
			const s = d$2(t, this.socket.binaryType);
			this.onPacket(s);
		}
		onPacket(t) {
			super.emitReserved("packet", t);
		}
		onClose(t) {
			this.readyState = "closed", super.emitReserved("close", t);
		}
		pause(t) {}
		createUri(t, s = {}) {
			return t + "://" + this.i() + this.o() + this.opts.path + this.h(s);
		}
		i() {
			const t = this.opts.hostname;
			return -1 === t.indexOf(":") ? t : "[" + t + "]";
		}
		o() {
			return this.opts.port && (this.opts.secure && 443 !== Number(this.opts.port) || !this.opts.secure && 80 !== Number(this.opts.port)) ? ":" + this.opts.port : "";
		}
		h(t) {
			const s = function(t) {
				let s = "";
				for (let i in t) t.hasOwnProperty(i) && (s.length && (s += "&"), s += encodeURIComponent(i) + "=" + encodeURIComponent(t[i]));
				return s;
			}(t);
			return s.length ? "?" + s : "";
		}
	};
	var N$2 = class extends T$2 {
		constructor() {
			super(...arguments), this.u = !1;
		}
		get name() {
			return "polling";
		}
		doOpen() {
			this.l();
		}
		pause(t) {
			this.readyState = "pausing";
			const s = () => {
				this.readyState = "paused", t();
			};
			if (this.u || !this.writable) {
				let t = 0;
				this.u && (t++, this.once("pollComplete", (function() {
					--t || s();
				}))), this.writable || (t++, this.once("drain", (function() {
					--t || s();
				})));
			} else s();
		}
		l() {
			this.u = !0, this.doPoll(), this.emitReserved("poll");
		}
		onData(t) {
			((t, s) => {
				const i = t.split(b$2), e = [];
				for (let t = 0; t < i.length; t++) {
					const n = d$2(i[t], s);
					if (e.push(n), "error" === n.type) break;
				}
				return e;
			})(t, this.socket.binaryType).forEach(((t) => {
				if ("opening" === this.readyState && "open" === t.type && this.onOpen(), "close" === t.type) return this.onClose({ description: "transport closed by the server" }), !1;
				this.onPacket(t);
			})), "closed" !== this.readyState && (this.u = !1, this.emitReserved("pollComplete"), "open" === this.readyState && this.l());
		}
		doClose() {
			const t = () => {
				this.write([{ type: "close" }]);
			};
			"open" === this.readyState ? t() : this.once("open", t);
		}
		write(t) {
			this.writable = !1, ((t, s) => {
				const i = t.length, e = new Array(i);
				let n = 0;
				t.forEach(((t, r) => {
					o$2(t, !1, ((t) => {
						e[r] = t, ++n === i && s(e.join(b$2));
					}));
				}));
			})(t, ((t) => {
				this.doWrite(t, (() => {
					this.writable = !0, this.emitReserved("drain");
				}));
			}));
		}
		uri() {
			const t = this.opts.secure ? "https" : "http", s = this.query || {};
			return !1 !== this.opts.timestampRequests && (s[this.opts.timestampParam] = B$2()), this.supportsBinary || s.sid || (s.b64 = 1), this.createUri(t, s);
		}
	};
	var U$2 = !1;
	try {
		U$2 = "undefined" != typeof XMLHttpRequest && "withCredentials" in new XMLHttpRequest();
	} catch (t) {}
	var P$2 = U$2;
	function D$2() {}
	var M$2 = class extends N$2 {
		constructor(t) {
			if (super(t), "undefined" != typeof location) {
				const s = "https:" === location.protocol;
				let i = location.port;
				i || (i = s ? "443" : "80"), this.xd = "undefined" != typeof location && t.hostname !== location.hostname || i !== t.port;
			}
		}
		doWrite(t, s) {
			const i = this.request({
				method: "POST",
				data: t
			});
			i.on("success", s), i.on("error", ((t, s) => {
				this.onError("xhr post error", t, s);
			}));
		}
		doPoll() {
			const t = this.request();
			t.on("data", this.onData.bind(this)), t.on("error", ((t, s) => {
				this.onError("xhr poll error", t, s);
			})), this.pollXhr = t;
		}
	};
	var S$2 = class S$2 extends k$2 {
		constructor(t, s, i) {
			super(), this.createRequest = t, x$2(this, i), this.p = i, this.v = i.method || "GET", this.m = s, this.k = void 0 !== i.data ? i.data : null, this.A();
		}
		A() {
			var t;
			const s = O$2(this.p, "agent", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "autoUnref");
			s.xdomain = !!this.p.xd;
			const i = this.O = this.createRequest(s);
			try {
				i.open(this.v, this.m, !0);
				try {
					if (this.p.extraHeaders) {
						i.setDisableHeaderCheck && i.setDisableHeaderCheck(!0);
						for (let t in this.p.extraHeaders) this.p.extraHeaders.hasOwnProperty(t) && i.setRequestHeader(t, this.p.extraHeaders[t]);
					}
				} catch (t) {}
				if ("POST" === this.v) try {
					i.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
				} catch (t) {}
				try {
					i.setRequestHeader("Accept", "*/*");
				} catch (t) {}
				null === (t = this.p.cookieJar) || void 0 === t || t.addCookies(i), "withCredentials" in i && (i.withCredentials = this.p.withCredentials), this.p.requestTimeout && (i.timeout = this.p.requestTimeout), i.onreadystatechange = () => {
					var t;
					3 === i.readyState && (null === (t = this.p.cookieJar) || void 0 === t || t.parseCookies(i.getResponseHeader("set-cookie"))), 4 === i.readyState && (200 === i.status || 1223 === i.status ? this._() : this.setTimeoutFn((() => {
						this.j("number" == typeof i.status ? i.status : 0);
					}), 0));
				}, i.send(this.k);
			} catch (t) {
				this.setTimeoutFn((() => {
					this.j(t);
				}), 0);
				return;
			}
			"undefined" != typeof document && (this.B = S$2.requestsCount++, S$2.requests[this.B] = this);
		}
		j(t) {
			this.emitReserved("error", t, this.O), this.C(!0);
		}
		C(t) {
			if (void 0 !== this.O && null !== this.O) {
				if (this.O.onreadystatechange = D$2, t) try {
					this.O.abort();
				} catch (t) {}
				"undefined" != typeof document && delete S$2.requests[this.B], this.O = null;
			}
		}
		_() {
			const t = this.O.responseText;
			null !== t && (this.emitReserved("data", t), this.emitReserved("success"), this.C());
		}
		abort() {
			this.C();
		}
	};
	if (S$2.requestsCount = 0, S$2.requests = {}, "undefined" != typeof document) {
		if ("function" == typeof attachEvent) attachEvent("onunload", L$2);
		else if ("function" == typeof addEventListener) addEventListener("onpagehide" in E$2 ? "pagehide" : "unload", L$2, !1);
	}
	function L$2() {
		for (let t in S$2.requests) S$2.requests.hasOwnProperty(t) && S$2.requests[t].abort();
	}
	var R$2 = function() {
		const t = F$2({ xdomain: !1 });
		return t && null !== t.responseType;
	}();
	var I$2 = class extends M$2 {
		constructor(t) {
			super(t);
			const s = t && t.forceBase64;
			this.supportsBinary = R$2 && !s;
		}
		request(t = {}) {
			return Object.assign(t, { xd: this.xd }, this.opts), new S$2(F$2, this.uri(), t);
		}
	};
	function F$2(t) {
		const s = t.xdomain;
		try {
			if ("undefined" != typeof XMLHttpRequest && (!s || P$2)) return new XMLHttpRequest();
		} catch (t) {}
		if (!s) try {
			return new E$2[["Active"].concat("Object").join("X")]("Microsoft.XMLHTTP");
		} catch (t) {}
	}
	var $$2 = "undefined" != typeof navigator && "string" == typeof navigator.product && "reactnative" === navigator.product.toLowerCase();
	var V$2 = class extends T$2 {
		get name() {
			return "websocket";
		}
		doOpen() {
			const t = this.uri(), s = this.opts.protocols, i = $$2 ? {} : O$2(this.opts, "agent", "perMessageDeflate", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "localAddress", "protocolVersion", "origin", "maxPayload", "family", "checkServerIdentity");
			this.opts.extraHeaders && (i.headers = this.opts.extraHeaders);
			try {
				this.ws = this.createSocket(t, s, i);
			} catch (t) {
				return this.emitReserved("error", t);
			}
			this.ws.binaryType = this.socket.binaryType, this.addEventListeners();
		}
		addEventListeners() {
			this.ws.onopen = () => {
				this.opts.autoUnref && this.ws.T.unref(), this.onOpen();
			}, this.ws.onclose = (t) => this.onClose({
				description: "websocket connection closed",
				context: t
			}), this.ws.onmessage = (t) => this.onData(t.data), this.ws.onerror = (t) => this.onError("websocket error", t);
		}
		write(t) {
			this.writable = !1;
			for (let s = 0; s < t.length; s++) {
				const i = t[s], e = s === t.length - 1;
				o$2(i, this.supportsBinary, ((t) => {
					try {
						this.doWrite(i, t);
					} catch (t) {}
					e && A$2((() => {
						this.writable = !0, this.emitReserved("drain");
					}), this.setTimeoutFn);
				}));
			}
		}
		doClose() {
			void 0 !== this.ws && (this.ws.onerror = () => {}, this.ws.close(), this.ws = null);
		}
		uri() {
			const t = this.opts.secure ? "wss" : "ws", s = this.query || {};
			return this.opts.timestampRequests && (s[this.opts.timestampParam] = B$2()), this.supportsBinary || (s.b64 = 1), this.createUri(t, s);
		}
	};
	var H$2 = E$2.WebSocket || E$2.MozWebSocket;
	var W$2 = class extends V$2 {
		createSocket(t, s, i) {
			return $$2 ? new H$2(t, s, i) : s ? new H$2(t, s) : new H$2(t);
		}
		doWrite(t, s) {
			this.ws.send(s);
		}
	};
	var q$2 = class extends T$2 {
		get name() {
			return "webtransport";
		}
		doOpen() {
			try {
				this.N = new WebTransport(this.createUri("https"), this.opts.transportOptions[this.name]);
			} catch (t) {
				return this.emitReserved("error", t);
			}
			this.N.closed.then((() => {
				this.onClose();
			})).catch(((t) => {
				this.onError("webtransport error", t);
			})), this.N.ready.then((() => {
				this.N.createBidirectionalStream().then(((t) => {
					const s = function(t, s) {
						w$2 || (w$2 = new TextDecoder());
						const e = [];
						let n = 0, r = -1, o = !1;
						return new TransformStream({ transform(h, c) {
							for (e.push(h);;) {
								if (0 === n) {
									if (v$2(e) < 1) break;
									const t = m$2(e, 1);
									o = !(128 & ~t[0]), r = 127 & t[0], n = r < 126 ? 3 : 126 === r ? 1 : 2;
								} else if (1 === n) {
									if (v$2(e) < 2) break;
									const t = m$2(e, 2);
									r = new DataView(t.buffer, t.byteOffset, t.length).getUint16(0), n = 3;
								} else if (2 === n) {
									if (v$2(e) < 8) break;
									const t = m$2(e, 8), s = new DataView(t.buffer, t.byteOffset, t.length), o = s.getUint32(0);
									if (o > Math.pow(2, 21) - 1) {
										c.enqueue(i$2);
										break;
									}
									r = o * Math.pow(2, 32) + s.getUint32(4), n = 3;
								} else {
									if (v$2(e) < r) break;
									const t = m$2(e, r);
									c.enqueue(d$2(o ? t : w$2.decode(t), s)), n = 0;
								}
								if (0 === r || r > t) {
									c.enqueue(i$2);
									break;
								}
							}
						} });
					}(Number.MAX_SAFE_INTEGER, this.socket.binaryType), e = t.readable.pipeThrough(s).getReader(), n = g$2();
					n.readable.pipeTo(t.writable), this.U = n.writable.getWriter();
					const r = () => {
						e.read().then((({ done: t, value: s }) => {
							t || (this.onPacket(s), r());
						})).catch(((t) => {}));
					};
					r();
					const o = { type: "open" };
					this.query.sid && (o.data = `{"sid":"${this.query.sid}"}`), this.U.write(o).then((() => this.onOpen()));
				}));
			}));
		}
		write(t) {
			this.writable = !1;
			for (let s = 0; s < t.length; s++) {
				const i = t[s], e = s === t.length - 1;
				this.U.write(i).then((() => {
					e && A$2((() => {
						this.writable = !0, this.emitReserved("drain");
					}), this.setTimeoutFn);
				}));
			}
		}
		doClose() {
			var t;
			null === (t = this.N) || void 0 === t || t.close();
		}
	};
	var X$2 = {
		websocket: W$2,
		webtransport: q$2,
		polling: I$2
	}, z$2 = /^(?:(?![^:@\/?#]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@\/?#]*)(?::([^:@\/?#]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/, J$2 = [
		"source",
		"protocol",
		"authority",
		"userInfo",
		"user",
		"password",
		"host",
		"port",
		"relative",
		"path",
		"directory",
		"file",
		"query",
		"anchor"
	];
	function Q$2(t) {
		if (t.length > 8e3) throw "URI too long";
		const s = t, i = t.indexOf("["), e = t.indexOf("]");
		-1 != i && -1 != e && (t = t.substring(0, i) + t.substring(i, e).replace(/:/g, ";") + t.substring(e, t.length));
		let n = z$2.exec(t || ""), r = {}, o = 14;
		for (; o--;) r[J$2[o]] = n[o] || "";
		return -1 != i && -1 != e && (r.source = s, r.host = r.host.substring(1, r.host.length - 1).replace(/;/g, ":"), r.authority = r.authority.replace("[", "").replace("]", "").replace(/;/g, ":"), r.ipv6uri = !0), r.pathNames = function(t, s) {
			const e = s.replace(/\/{2,9}/g, "/").split("/");
			"/" != s.slice(0, 1) && 0 !== s.length || e.splice(0, 1);
			"/" == s.slice(-1) && e.splice(e.length - 1, 1);
			return e;
		}(0, r.path), r.queryKey = function(t, s) {
			const i = {};
			return s.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, (function(t, s, e) {
				s && (i[s] = e);
			})), i;
		}(0, r.query), r;
	}
	var G$2 = "function" == typeof addEventListener && "function" == typeof removeEventListener, K$2 = [];
	G$2 && addEventListener("offline", (() => {
		K$2.forEach(((t) => t()));
	}), !1);
	var Y$2 = class Y$2 extends k$2 {
		constructor(t, s) {
			if (super(), this.binaryType = "arraybuffer", this.writeBuffer = [], this.P = 0, this.D = -1, this.M = -1, this.S = -1, this.L = Infinity, t && "object" == typeof t && (s = t, t = null), t) {
				const i = Q$2(t);
				s.hostname = i.host, s.secure = "https" === i.protocol || "wss" === i.protocol, s.port = i.port, i.query && (s.query = i.query);
			} else s.host && (s.hostname = Q$2(s.host).host);
			x$2(this, s), this.secure = null != s.secure ? s.secure : "undefined" != typeof location && "https:" === location.protocol, s.hostname && !s.port && (s.port = this.secure ? "443" : "80"), this.hostname = s.hostname || ("undefined" != typeof location ? location.hostname : "localhost"), this.port = s.port || ("undefined" != typeof location && location.port ? location.port : this.secure ? "443" : "80"), this.transports = [], this.R = {}, s.transports.forEach(((t) => {
				const s = t.prototype.name;
				this.transports.push(s), this.R[s] = t;
			})), this.opts = Object.assign({
				path: "/engine.io",
				agent: !1,
				withCredentials: !1,
				upgrade: !0,
				timestampParam: "t",
				rememberUpgrade: !1,
				addTrailingSlash: !0,
				rejectUnauthorized: !0,
				perMessageDeflate: { threshold: 1024 },
				transportOptions: {},
				closeOnBeforeunload: !1
			}, s), this.opts.path = this.opts.path.replace(/\/$/, "") + (this.opts.addTrailingSlash ? "/" : ""), "string" == typeof this.opts.query && (this.opts.query = function(t) {
				let s = {}, i = t.split("&");
				for (let t = 0, e = i.length; t < e; t++) {
					let e = i[t].split("=");
					s[decodeURIComponent(e[0])] = decodeURIComponent(e[1]);
				}
				return s;
			}(this.opts.query)), G$2 && (this.opts.closeOnBeforeunload && (this.I = () => {
				this.transport && (this.transport.removeAllListeners(), this.transport.close());
			}, addEventListener("beforeunload", this.I, !1)), "localhost" !== this.hostname && (this.F = () => {
				this.$("transport close", { description: "network connection lost" });
			}, K$2.push(this.F))), this.opts.withCredentials && (this.V = void 0), this.H();
		}
		createTransport(t) {
			const s = Object.assign({}, this.opts.query);
			s.EIO = 4, s.transport = t, this.id && (s.sid = this.id);
			const i = Object.assign({}, this.opts, {
				query: s,
				socket: this,
				hostname: this.hostname,
				secure: this.secure,
				port: this.port
			}, this.opts.transportOptions[t]);
			return new this.R[t](i);
		}
		H() {
			if (0 === this.transports.length) return void this.setTimeoutFn((() => {
				this.emitReserved("error", "No transports available");
			}), 0);
			const t = this.opts.rememberUpgrade && Y$2.priorWebsocketSuccess && -1 !== this.transports.indexOf("websocket") ? "websocket" : this.transports[0];
			this.readyState = "opening";
			const s = this.createTransport(t);
			s.open(), this.setTransport(s);
		}
		setTransport(t) {
			this.transport && this.transport.removeAllListeners(), this.transport = t, t.on("drain", this.W.bind(this)).on("packet", this.q.bind(this)).on("error", this.j.bind(this)).on("close", ((t) => this.$("transport close", t)));
		}
		onOpen() {
			this.readyState = "open", Y$2.priorWebsocketSuccess = "websocket" === this.transport.name, this.emitReserved("open"), this.flush();
		}
		q(t) {
			if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) switch (this.emitReserved("packet", t), this.emitReserved("heartbeat"), t.type) {
				case "open":
					this.onHandshake(JSON.parse(t.data));
					break;
				case "ping":
					this.X("pong"), this.emitReserved("ping"), this.emitReserved("pong"), this.J();
					break;
				case "error":
					const s = /* @__PURE__ */ new Error("server error");
					s.code = t.data, this.j(s);
					break;
				case "message": this.emitReserved("data", t.data), this.emitReserved("message", t.data);
			}
		}
		onHandshake(t) {
			this.emitReserved("handshake", t), this.id = t.sid, this.transport.query.sid = t.sid, this.D = t.pingInterval, this.M = t.pingTimeout, this.S = t.maxPayload, this.onOpen(), "closed" !== this.readyState && this.J();
		}
		J() {
			this.clearTimeoutFn(this.G);
			const t = this.D + this.M;
			this.L = Date.now() + t, this.G = this.setTimeoutFn((() => {
				this.$("ping timeout");
			}), t), this.opts.autoUnref && this.G.unref();
		}
		W() {
			this.writeBuffer.splice(0, this.P), this.P = 0, 0 === this.writeBuffer.length ? this.emitReserved("drain") : this.flush();
		}
		flush() {
			if ("closed" !== this.readyState && this.transport.writable && !this.upgrading && this.writeBuffer.length) {
				const t = this.K();
				this.transport.send(t), this.P = t.length, this.emitReserved("flush");
			}
		}
		K() {
			if (!(this.S && "polling" === this.transport.name && this.writeBuffer.length > 1)) return this.writeBuffer;
			let t = 1;
			for (let i = 0; i < this.writeBuffer.length; i++) {
				const e = this.writeBuffer[i].data;
				if (e && (t += "string" == typeof (s = e) ? function(t) {
					let s = 0, i = 0;
					for (let e = 0, n = t.length; e < n; e++) s = t.charCodeAt(e), s < 128 ? i += 1 : s < 2048 ? i += 2 : s < 55296 || s >= 57344 ? i += 3 : (e++, i += 4);
					return i;
				}(s) : Math.ceil(1.33 * (s.byteLength || s.size))), i > 0 && t > this.S) return this.writeBuffer.slice(0, i);
				t += 2;
			}
			var s;
			return this.writeBuffer;
		}
		Y() {
			if (!this.L) return !0;
			const t = Date.now() > this.L;
			return t && (this.L = 0, A$2((() => {
				this.$("ping timeout");
			}), this.setTimeoutFn)), t;
		}
		write(t, s, i) {
			return this.X("message", t, s, i), this;
		}
		send(t, s, i) {
			return this.X("message", t, s, i), this;
		}
		X(t, s, i, e) {
			if ("function" == typeof s && (e = s, s = void 0), "function" == typeof i && (e = i, i = null), "closing" === this.readyState || "closed" === this.readyState) return;
			(i = i || {}).compress = !1 !== i.compress;
			const n = {
				type: t,
				data: s,
				options: i
			};
			this.emitReserved("packetCreate", n), this.writeBuffer.push(n), e && this.once("flush", e), this.flush();
		}
		close() {
			const t = () => {
				this.$("forced close"), this.transport.close();
			}, s = () => {
				this.off("upgrade", s), this.off("upgradeError", s), t();
			}, i = () => {
				this.once("upgrade", s), this.once("upgradeError", s);
			};
			return "opening" !== this.readyState && "open" !== this.readyState || (this.readyState = "closing", this.writeBuffer.length ? this.once("drain", (() => {
				this.upgrading ? i() : t();
			})) : this.upgrading ? i() : t()), this;
		}
		j(t) {
			if (Y$2.priorWebsocketSuccess = !1, this.opts.tryAllTransports && this.transports.length > 1 && "opening" === this.readyState) return this.transports.shift(), this.H();
			this.emitReserved("error", t), this.$("transport error", t);
		}
		$(t, s) {
			if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) {
				if (this.clearTimeoutFn(this.G), this.transport.removeAllListeners("close"), this.transport.close(), this.transport.removeAllListeners(), G$2 && (this.I && removeEventListener("beforeunload", this.I, !1), this.F)) {
					const t = K$2.indexOf(this.F);
					-1 !== t && K$2.splice(t, 1);
				}
				this.readyState = "closed", this.id = null, this.emitReserved("close", t, s), this.writeBuffer = [], this.P = 0;
			}
		}
	};
	Y$2.protocol = 4;
	var Z$2 = class extends Y$2 {
		constructor() {
			super(...arguments), this.Z = [];
		}
		onOpen() {
			if (super.onOpen(), "open" === this.readyState && this.opts.upgrade) for (let t = 0; t < this.Z.length; t++) this.tt(this.Z[t]);
		}
		tt(t) {
			let s = this.createTransport(t), i = !1;
			Y$2.priorWebsocketSuccess = !1;
			const e = () => {
				i || (s.send([{
					type: "ping",
					data: "probe"
				}]), s.once("packet", ((t) => {
					if (!i) if ("pong" === t.type && "probe" === t.data) {
						if (this.upgrading = !0, this.emitReserved("upgrading", s), !s) return;
						Y$2.priorWebsocketSuccess = "websocket" === s.name, this.transport.pause((() => {
							i || "closed" !== this.readyState && (a(), this.setTransport(s), s.send([{ type: "upgrade" }]), this.emitReserved("upgrade", s), s = null, this.upgrading = !1, this.flush());
						}));
					} else {
						const t = /* @__PURE__ */ new Error("probe error");
						t.transport = s.name, this.emitReserved("upgradeError", t);
					}
				})));
			};
			function n() {
				i || (i = !0, a(), s.close(), s = null);
			}
			const r = (t) => {
				const i = /* @__PURE__ */ new Error("probe error: " + t);
				i.transport = s.name, n(), this.emitReserved("upgradeError", i);
			};
			function o() {
				r("transport closed");
			}
			function h() {
				r("socket closed");
			}
			function c(t) {
				s && t.name !== s.name && n();
			}
			const a = () => {
				s.removeListener("open", e), s.removeListener("error", r), s.removeListener("close", o), this.off("close", h), this.off("upgrading", c);
			};
			s.once("open", e), s.once("error", r), s.once("close", o), this.once("close", h), this.once("upgrading", c), -1 !== this.Z.indexOf("webtransport") && "webtransport" !== t ? this.setTimeoutFn((() => {
				i || s.open();
			}), 200) : s.open();
		}
		onHandshake(t) {
			this.Z = this.st(t.upgrades), super.onHandshake(t);
		}
		st(t) {
			const s = [];
			for (let i = 0; i < t.length; i++) ~this.transports.indexOf(t[i]) && s.push(t[i]);
			return s;
		}
	};
	var tt = class extends Z$2 {
		constructor(t, s = {}) {
			const i = "object" == typeof t ? t : s;
			(!i.transports || i.transports && "string" == typeof i.transports[0]) && (i.transports = (i.transports || [
				"polling",
				"websocket",
				"webtransport"
			]).map(((t) => X$2[t])).filter(((t) => !!t))), super(t, i);
		}
	};
	var it = "function" == typeof ArrayBuffer, et = (t) => "function" == typeof ArrayBuffer.isView ? ArrayBuffer.isView(t) : t.buffer instanceof ArrayBuffer, nt = Object.prototype.toString, rt = "function" == typeof Blob || "undefined" != typeof Blob && "[object BlobConstructor]" === nt.call(Blob), ot = "function" == typeof File || "undefined" != typeof File && "[object FileConstructor]" === nt.call(File);
	function ht(t) {
		return it && (t instanceof ArrayBuffer || et(t)) || rt && t instanceof Blob || ot && t instanceof File;
	}
	function ct(t, s) {
		if (!t || "object" != typeof t) return !1;
		if (Array.isArray(t)) {
			for (let s = 0, i = t.length; s < i; s++) if (ct(t[s])) return !0;
			return !1;
		}
		if (ht(t)) return !0;
		if (t.toJSON && "function" == typeof t.toJSON && 1 === arguments.length) return ct(t.toJSON(), !0);
		for (const s in t) if (Object.prototype.hasOwnProperty.call(t, s) && ct(t[s])) return !0;
		return !1;
	}
	function at(t) {
		const s = [], i = t.data, e = t;
		return e.data = ut(i, s), e.attachments = s.length, {
			packet: e,
			buffers: s
		};
	}
	function ut(t, s) {
		if (!t) return t;
		if (ht(t)) {
			const i = {
				_placeholder: !0,
				num: s.length
			};
			return s.push(t), i;
		}
		if (Array.isArray(t)) {
			const i = new Array(t.length);
			for (let e = 0; e < t.length; e++) i[e] = ut(t[e], s);
			return i;
		}
		if ("object" == typeof t && !(t instanceof Date)) {
			const i = {};
			for (const e in t) Object.prototype.hasOwnProperty.call(t, e) && (i[e] = ut(t[e], s));
			return i;
		}
		return t;
	}
	function ft(t, s) {
		return t.data = lt(t.data, s), delete t.attachments, t;
	}
	function lt(t, s) {
		if (!t) return t;
		if (t && !0 === t._placeholder) {
			if ("number" == typeof t.num && t.num >= 0 && t.num < s.length) return s[t.num];
			throw new Error("illegal attachments");
		}
		if (Array.isArray(t)) for (let i = 0; i < t.length; i++) t[i] = lt(t[i], s);
		else if ("object" == typeof t) for (const i in t) Object.prototype.hasOwnProperty.call(t, i) && (t[i] = lt(t[i], s));
		return t;
	}
	var dt = [
		"connect",
		"connect_error",
		"disconnect",
		"disconnecting",
		"newListener",
		"removeListener"
	];
	var yt;
	(function(t) {
		t[t.CONNECT = 0] = "CONNECT", t[t.DISCONNECT = 1] = "DISCONNECT", t[t.EVENT = 2] = "EVENT", t[t.ACK = 3] = "ACK", t[t.CONNECT_ERROR = 4] = "CONNECT_ERROR", t[t.BINARY_EVENT = 5] = "BINARY_EVENT", t[t.BINARY_ACK = 6] = "BINARY_ACK";
	})(yt || (yt = {}));
	var bt = class bt extends k$2 {
		constructor(t) {
			super(), this.reviver = t;
		}
		add(t) {
			let s;
			if ("string" == typeof t) {
				if (this.reconstructor) throw new Error("got plaintext data when reconstructing a packet");
				s = this.decodeString(t);
				const i = s.type === yt.BINARY_EVENT;
				i || s.type === yt.BINARY_ACK ? (s.type = i ? yt.EVENT : yt.ACK, this.reconstructor = new gt(s), 0 === s.attachments && super.emitReserved("decoded", s)) : super.emitReserved("decoded", s);
			} else {
				if (!ht(t) && !t.base64) throw new Error("Unknown type: " + t);
				if (!this.reconstructor) throw new Error("got binary data when not reconstructing a packet");
				s = this.reconstructor.takeBinaryData(t), s && (this.reconstructor = null, super.emitReserved("decoded", s));
			}
		}
		decodeString(t) {
			let s = 0;
			const i = { type: Number(t.charAt(0)) };
			if (void 0 === yt[i.type]) throw new Error("unknown packet type " + i.type);
			if (i.type === yt.BINARY_EVENT || i.type === yt.BINARY_ACK) {
				const e = s + 1;
				for (; "-" !== t.charAt(++s) && s != t.length;);
				const n = t.substring(e, s);
				if (n != Number(n) || "-" !== t.charAt(s)) throw new Error("Illegal attachments");
				i.attachments = Number(n);
			}
			if ("/" === t.charAt(s + 1)) {
				const e = s + 1;
				for (; ++s;) {
					if ("," === t.charAt(s)) break;
					if (s === t.length) break;
				}
				i.nsp = t.substring(e, s);
			} else i.nsp = "/";
			const e = t.charAt(s + 1);
			if ("" !== e && Number(e) == e) {
				const e = s + 1;
				for (; ++s;) {
					const i = t.charAt(s);
					if (null == i || Number(i) != i) {
						--s;
						break;
					}
					if (s === t.length) break;
				}
				i.id = Number(t.substring(e, s + 1));
			}
			if (t.charAt(++s)) {
				const e = this.tryParse(t.substr(s));
				if (!bt.isPayloadValid(i.type, e)) throw new Error("invalid payload");
				i.data = e;
			}
			return i;
		}
		tryParse(t) {
			try {
				return JSON.parse(t, this.reviver);
			} catch (t) {
				return !1;
			}
		}
		static isPayloadValid(t, s) {
			switch (t) {
				case yt.CONNECT: return vt(s);
				case yt.DISCONNECT: return void 0 === s;
				case yt.CONNECT_ERROR: return "string" == typeof s || vt(s);
				case yt.EVENT:
				case yt.BINARY_EVENT: return Array.isArray(s) && ("number" == typeof s[0] || "string" == typeof s[0] && -1 === dt.indexOf(s[0]));
				case yt.ACK:
				case yt.BINARY_ACK: return Array.isArray(s);
			}
		}
		destroy() {
			this.reconstructor && (this.reconstructor.finishedReconstruction(), this.reconstructor = null);
		}
	};
	var gt = class {
		constructor(t) {
			this.packet = t, this.buffers = [], this.reconPack = t;
		}
		takeBinaryData(t) {
			if (this.buffers.push(t), this.buffers.length === this.reconPack.attachments) {
				const t = ft(this.reconPack, this.buffers);
				return this.finishedReconstruction(), t;
			}
			return null;
		}
		finishedReconstruction() {
			this.reconPack = null, this.buffers = [];
		}
	};
	var wt = Number.isInteger || function(t) {
		return "number" == typeof t && isFinite(t) && Math.floor(t) === t;
	};
	function vt(t) {
		return "[object Object]" === Object.prototype.toString.call(t);
	}
	var mt = Object.freeze({
		__proto__: null,
		protocol: 5,
		get PacketType() {
			return yt;
		},
		Encoder: class {
			constructor(t) {
				this.replacer = t;
			}
			encode(t) {
				return t.type !== yt.EVENT && t.type !== yt.ACK || !ct(t) ? [this.encodeAsString(t)] : this.encodeAsBinary({
					type: t.type === yt.EVENT ? yt.BINARY_EVENT : yt.BINARY_ACK,
					nsp: t.nsp,
					data: t.data,
					id: t.id
				});
			}
			encodeAsString(t) {
				let s = "" + t.type;
				return t.type !== yt.BINARY_EVENT && t.type !== yt.BINARY_ACK || (s += t.attachments + "-"), t.nsp && "/" !== t.nsp && (s += t.nsp + ","), null != t.id && (s += t.id), null != t.data && (s += JSON.stringify(t.data, this.replacer)), s;
			}
			encodeAsBinary(t) {
				const s = at(t), i = this.encodeAsString(s.packet), e = s.buffers;
				return e.unshift(i), e;
			}
		},
		Decoder: bt,
		isPacketValid: function(t) {
			return "string" == typeof t.nsp && (void 0 === (s = t.id) || wt(s)) && function(t, s) {
				switch (t) {
					case yt.CONNECT: return void 0 === s || vt(s);
					case yt.DISCONNECT: return void 0 === s;
					case yt.EVENT: return Array.isArray(s) && ("number" == typeof s[0] || "string" == typeof s[0] && -1 === dt.indexOf(s[0]));
					case yt.ACK: return Array.isArray(s);
					case yt.CONNECT_ERROR: return "string" == typeof s || vt(s);
					default: return !1;
				}
			}(t.type, t.data);
			var s;
		}
	});
	function kt(t, s, i) {
		return t.on(s, i), function() {
			t.off(s, i);
		};
	}
	var At = Object.freeze({
		connect: 1,
		connect_error: 1,
		disconnect: 1,
		disconnecting: 1,
		newListener: 1,
		removeListener: 1
	});
	var Et = class extends k$2 {
		constructor(t, s, i) {
			super(), this.connected = !1, this.recovered = !1, this.receiveBuffer = [], this.sendBuffer = [], this.et = [], this.nt = 0, this.ids = 0, this.acks = {}, this.flags = {}, this.io = t, this.nsp = s, i && i.auth && (this.auth = i.auth), this.p = Object.assign({}, i), this.io.rt && this.open();
		}
		get disconnected() {
			return !this.connected;
		}
		subEvents() {
			if (this.subs) return;
			const t = this.io;
			this.subs = [
				kt(t, "open", this.onopen.bind(this)),
				kt(t, "packet", this.onpacket.bind(this)),
				kt(t, "error", this.onerror.bind(this)),
				kt(t, "close", this.onclose.bind(this))
			];
		}
		get active() {
			return !!this.subs;
		}
		connect() {
			return this.connected || (this.subEvents(), this.io.ot || this.io.open(), "open" === this.io.ht && this.onopen()), this;
		}
		open() {
			return this.connect();
		}
		send(...t) {
			return t.unshift("message"), this.emit.apply(this, t), this;
		}
		emit(t, ...s) {
			var i, e, n;
			if (At.hasOwnProperty(t)) throw new Error("\"" + t.toString() + "\" is a reserved event name");
			if (s.unshift(t), this.p.retries && !this.flags.fromQueue && !this.flags.volatile) return this.ct(s), this;
			const r = {
				type: yt.EVENT,
				data: s,
				options: {}
			};
			if (r.options.compress = !1 !== this.flags.compress, "function" == typeof s[s.length - 1]) {
				const t = this.ids++, i = s.pop();
				this.ut(t, i), r.id = t;
			}
			const o = null === (e = null === (i = this.io.engine) || void 0 === i ? void 0 : i.transport) || void 0 === e ? void 0 : e.writable, h = this.connected && !(null === (n = this.io.engine) || void 0 === n ? void 0 : n.Y());
			return this.flags.volatile && !o || (h ? (this.notifyOutgoingListeners(r), this.packet(r)) : this.sendBuffer.push(r)), this.flags = {}, this;
		}
		ut(t, s) {
			var i;
			const e = null !== (i = this.flags.timeout) && void 0 !== i ? i : this.p.ackTimeout;
			if (void 0 === e) return void (this.acks[t] = s);
			const n = this.io.setTimeoutFn((() => {
				delete this.acks[t];
				for (let s = 0; s < this.sendBuffer.length; s++) this.sendBuffer[s].id === t && this.sendBuffer.splice(s, 1);
				s.call(this, /* @__PURE__ */ new Error("operation has timed out"));
			}), e), r = (...t) => {
				this.io.clearTimeoutFn(n), s.apply(this, t);
			};
			r.withError = !0, this.acks[t] = r;
		}
		emitWithAck(t, ...s) {
			return new Promise(((i, e) => {
				const n = (t, s) => t ? e(t) : i(s);
				n.withError = !0, s.push(n), this.emit(t, ...s);
			}));
		}
		ct(t) {
			let s;
			"function" == typeof t[t.length - 1] && (s = t.pop());
			const i = {
				id: this.nt++,
				tryCount: 0,
				pending: !1,
				args: t,
				flags: Object.assign({ fromQueue: !0 }, this.flags)
			};
			t.push(((t, ...e) => {
				this.et[0];
				return null !== t ? i.tryCount > this.p.retries && (this.et.shift(), s && s(t)) : (this.et.shift(), s && s(null, ...e)), i.pending = !1, this.ft();
			})), this.et.push(i), this.ft();
		}
		ft(t = !1) {
			if (!this.connected || 0 === this.et.length) return;
			const s = this.et[0];
			s.pending && !t || (s.pending = !0, s.tryCount++, this.flags = s.flags, this.emit.apply(this, s.args));
		}
		packet(t) {
			t.nsp = this.nsp, this.io.lt(t);
		}
		onopen() {
			"function" == typeof this.auth ? this.auth(((t) => {
				this.dt(t);
			})) : this.dt(this.auth);
		}
		dt(t) {
			this.packet({
				type: yt.CONNECT,
				data: this.yt ? Object.assign({
					pid: this.yt,
					offset: this.bt
				}, t) : t
			});
		}
		onerror(t) {
			this.connected || this.emitReserved("connect_error", t);
		}
		onclose(t, s) {
			this.connected = !1, delete this.id, this.emitReserved("disconnect", t, s), this.gt();
		}
		gt() {
			Object.keys(this.acks).forEach(((t) => {
				if (!this.sendBuffer.some(((s) => String(s.id) === t))) {
					const s = this.acks[t];
					delete this.acks[t], s.withError && s.call(this, /* @__PURE__ */ new Error("socket has been disconnected"));
				}
			}));
		}
		onpacket(t) {
			if (t.nsp === this.nsp) switch (t.type) {
				case yt.CONNECT:
					t.data && t.data.sid ? this.onconnect(t.data.sid, t.data.pid) : this.emitReserved("connect_error", /* @__PURE__ */ new Error("It seems you are trying to reach a Socket.IO server in v2.x with a v3.x client, but they are not compatible (more information here: https://socket.io/docs/v3/migrating-from-2-x-to-3-0/)"));
					break;
				case yt.EVENT:
				case yt.BINARY_EVENT:
					this.onevent(t);
					break;
				case yt.ACK:
				case yt.BINARY_ACK:
					this.onack(t);
					break;
				case yt.DISCONNECT:
					this.ondisconnect();
					break;
				case yt.CONNECT_ERROR:
					this.destroy();
					const s = new Error(t.data.message);
					s.data = t.data.data, this.emitReserved("connect_error", s);
			}
		}
		onevent(t) {
			const s = t.data || [];
			null != t.id && s.push(this.ack(t.id)), this.connected ? this.emitEvent(s) : this.receiveBuffer.push(Object.freeze(s));
		}
		emitEvent(t) {
			if (this.wt && this.wt.length) {
				const s = this.wt.slice();
				for (const i of s) i.apply(this, t);
			}
			super.emit.apply(this, t), this.yt && t.length && "string" == typeof t[t.length - 1] && (this.bt = t[t.length - 1]);
		}
		ack(t) {
			const s = this;
			let i = !1;
			return function(...e) {
				i || (i = !0, s.packet({
					type: yt.ACK,
					id: t,
					data: e
				}));
			};
		}
		onack(t) {
			const s = this.acks[t.id];
			"function" == typeof s && (delete this.acks[t.id], s.withError && t.data.unshift(null), s.apply(this, t.data));
		}
		onconnect(t, s) {
			this.id = t, this.recovered = s && this.yt === s, this.yt = s, this.connected = !0, this.emitBuffered(), this.ft(!0), this.emitReserved("connect");
		}
		emitBuffered() {
			this.receiveBuffer.forEach(((t) => this.emitEvent(t))), this.receiveBuffer = [], this.sendBuffer.forEach(((t) => {
				this.notifyOutgoingListeners(t), this.packet(t);
			})), this.sendBuffer = [];
		}
		ondisconnect() {
			this.destroy(), this.onclose("io server disconnect");
		}
		destroy() {
			this.subs && (this.subs.forEach(((t) => t())), this.subs = void 0), this.io.vt(this);
		}
		disconnect() {
			return this.connected && this.packet({ type: yt.DISCONNECT }), this.destroy(), this.connected && this.onclose("io client disconnect"), this;
		}
		close() {
			return this.disconnect();
		}
		compress(t) {
			return this.flags.compress = t, this;
		}
		get volatile() {
			return this.flags.volatile = !0, this;
		}
		timeout(t) {
			return this.flags.timeout = t, this;
		}
		onAny(t) {
			return this.wt = this.wt || [], this.wt.push(t), this;
		}
		prependAny(t) {
			return this.wt = this.wt || [], this.wt.unshift(t), this;
		}
		offAny(t) {
			if (!this.wt) return this;
			if (t) {
				const s = this.wt;
				for (let i = 0; i < s.length; i++) if (t === s[i]) return s.splice(i, 1), this;
			} else this.wt = [];
			return this;
		}
		listenersAny() {
			return this.wt || [];
		}
		onAnyOutgoing(t) {
			return this.kt = this.kt || [], this.kt.push(t), this;
		}
		prependAnyOutgoing(t) {
			return this.kt = this.kt || [], this.kt.unshift(t), this;
		}
		offAnyOutgoing(t) {
			if (!this.kt) return this;
			if (t) {
				const s = this.kt;
				for (let i = 0; i < s.length; i++) if (t === s[i]) return s.splice(i, 1), this;
			} else this.kt = [];
			return this;
		}
		listenersAnyOutgoing() {
			return this.kt || [];
		}
		notifyOutgoingListeners(t) {
			if (this.kt && this.kt.length) {
				const s = this.kt.slice();
				for (const i of s) i.apply(this, t.data);
			}
		}
	};
	function Ot(t) {
		t = t || {}, this.ms = t.min || 100, this.max = t.max || 1e4, this.factor = t.factor || 2, this.jitter = t.jitter > 0 && t.jitter <= 1 ? t.jitter : 0, this.attempts = 0;
	}
	Ot.prototype.duration = function() {
		var t = this.ms * Math.pow(this.factor, this.attempts++);
		if (this.jitter) {
			var s = Math.random(), i = Math.floor(s * this.jitter * t);
			t = 1 & Math.floor(10 * s) ? t + i : t - i;
		}
		return 0 | Math.min(t, this.max);
	}, Ot.prototype.reset = function() {
		this.attempts = 0;
	}, Ot.prototype.setMin = function(t) {
		this.ms = t;
	}, Ot.prototype.setMax = function(t) {
		this.max = t;
	}, Ot.prototype.setJitter = function(t) {
		this.jitter = t;
	};
	var _t = class extends k$2 {
		constructor(t, s) {
			var i;
			super(), this.nsps = {}, this.subs = [], t && "object" == typeof t && (s = t, t = void 0), (s = s || {}).path = s.path || "/socket.io", this.opts = s, x$2(this, s), this.reconnection(!1 !== s.reconnection), this.reconnectionAttempts(s.reconnectionAttempts || Infinity), this.reconnectionDelay(s.reconnectionDelay || 1e3), this.reconnectionDelayMax(s.reconnectionDelayMax || 5e3), this.randomizationFactor(null !== (i = s.randomizationFactor) && void 0 !== i ? i : .5), this.backoff = new Ot({
				min: this.reconnectionDelay(),
				max: this.reconnectionDelayMax(),
				jitter: this.randomizationFactor()
			}), this.timeout(null == s.timeout ? 2e4 : s.timeout), this.ht = "closed", this.uri = t;
			const e = s.parser || mt;
			this.encoder = new e.Encoder(), this.decoder = new e.Decoder(), this.rt = !1 !== s.autoConnect, this.rt && this.open();
		}
		reconnection(t) {
			return arguments.length ? (this.At = !!t, t || (this.skipReconnect = !0), this) : this.At;
		}
		reconnectionAttempts(t) {
			return void 0 === t ? this.Et : (this.Et = t, this);
		}
		reconnectionDelay(t) {
			var s;
			return void 0 === t ? this.Ot : (this.Ot = t, null === (s = this.backoff) || void 0 === s || s.setMin(t), this);
		}
		randomizationFactor(t) {
			var s;
			return void 0 === t ? this._t : (this._t = t, null === (s = this.backoff) || void 0 === s || s.setJitter(t), this);
		}
		reconnectionDelayMax(t) {
			var s;
			return void 0 === t ? this.jt : (this.jt = t, null === (s = this.backoff) || void 0 === s || s.setMax(t), this);
		}
		timeout(t) {
			return arguments.length ? (this.xt = t, this) : this.xt;
		}
		maybeReconnectOnOpen() {
			!this.ot && this.At && 0 === this.backoff.attempts && this.reconnect();
		}
		open(t) {
			if (~this.ht.indexOf("open")) return this;
			this.engine = new tt(this.uri, this.opts);
			const s = this.engine, i = this;
			this.ht = "opening", this.skipReconnect = !1;
			const e = kt(s, "open", (function() {
				i.onopen(), t && t();
			})), n = (s) => {
				this.cleanup(), this.ht = "closed", this.emitReserved("error", s), t ? t(s) : this.maybeReconnectOnOpen();
			}, r = kt(s, "error", n);
			if (!1 !== this.xt) {
				const t = this.xt, i = this.setTimeoutFn((() => {
					e(), n(/* @__PURE__ */ new Error("timeout")), s.close();
				}), t);
				this.opts.autoUnref && i.unref(), this.subs.push((() => {
					this.clearTimeoutFn(i);
				}));
			}
			return this.subs.push(e), this.subs.push(r), this;
		}
		connect(t) {
			return this.open(t);
		}
		onopen() {
			this.cleanup(), this.ht = "open", this.emitReserved("open");
			const t = this.engine;
			this.subs.push(kt(t, "ping", this.onping.bind(this)), kt(t, "data", this.ondata.bind(this)), kt(t, "error", this.onerror.bind(this)), kt(t, "close", this.onclose.bind(this)), kt(this.decoder, "decoded", this.ondecoded.bind(this)));
		}
		onping() {
			this.emitReserved("ping");
		}
		ondata(t) {
			try {
				this.decoder.add(t);
			} catch (t) {
				this.onclose("parse error", t);
			}
		}
		ondecoded(t) {
			A$2((() => {
				this.emitReserved("packet", t);
			}), this.setTimeoutFn);
		}
		onerror(t) {
			this.emitReserved("error", t);
		}
		socket(t, s) {
			let i = this.nsps[t];
			return i ? this.rt && !i.active && i.connect() : (i = new Et(this, t, s), this.nsps[t] = i), i;
		}
		vt(t) {
			const s = Object.keys(this.nsps);
			for (const t of s) if (this.nsps[t].active) return;
			this.Bt();
		}
		lt(t) {
			const s = this.encoder.encode(t);
			for (let i = 0; i < s.length; i++) this.engine.write(s[i], t.options);
		}
		cleanup() {
			this.subs.forEach(((t) => t())), this.subs.length = 0, this.decoder.destroy();
		}
		Bt() {
			this.skipReconnect = !0, this.ot = !1, this.onclose("forced close");
		}
		disconnect() {
			return this.Bt();
		}
		onclose(t, s) {
			var i;
			this.cleanup(), null === (i = this.engine) || void 0 === i || i.close(), this.backoff.reset(), this.ht = "closed", this.emitReserved("close", t, s), this.At && !this.skipReconnect && this.reconnect();
		}
		reconnect() {
			if (this.ot || this.skipReconnect) return this;
			const t = this;
			if (this.backoff.attempts >= this.Et) this.backoff.reset(), this.emitReserved("reconnect_failed"), this.ot = !1;
			else {
				const s = this.backoff.duration();
				this.ot = !0;
				const i = this.setTimeoutFn((() => {
					t.skipReconnect || (this.emitReserved("reconnect_attempt", t.backoff.attempts), t.skipReconnect || t.open(((s) => {
						s ? (t.ot = !1, t.reconnect(), this.emitReserved("reconnect_error", s)) : t.onreconnect();
					})));
				}), s);
				this.opts.autoUnref && i.unref(), this.subs.push((() => {
					this.clearTimeoutFn(i);
				}));
			}
		}
		onreconnect() {
			const t = this.backoff.attempts;
			this.ot = !1, this.backoff.reset(), this.emitReserved("reconnect", t);
		}
	};
	var jt = {};
	function xt(t, s) {
		"object" == typeof t && (s = t, t = void 0);
		const i = function(t, s = "", i) {
			let e = t;
			i = i || "undefined" != typeof location && location, t ??= i.protocol + "//" + i.host, "string" == typeof t && ("/" === t.charAt(0) && (t = "/" === t.charAt(1) ? i.protocol + t : i.host + t), /^(https?|wss?):\/\//.test(t) || (t = void 0 !== i ? i.protocol + "//" + t : "https://" + t), e = Q$2(t)), e.port || (/^(http|ws)$/.test(e.protocol) ? e.port = "80" : /^(http|ws)s$/.test(e.protocol) && (e.port = "443")), e.path = e.path || "/";
			const n = -1 !== e.host.indexOf(":") ? "[" + e.host + "]" : e.host;
			return e.id = e.protocol + "://" + n + ":" + e.port + s, e.href = e.protocol + "://" + n + (i && i.port === e.port ? "" : ":" + e.port), e;
		}(t, (s = s || {}).path || "/socket.io"), e = i.source, n = i.id, r = i.path, o = jt[n] && r in jt[n].nsps;
		let h;
		return s.forceNew || s["force new connection"] || !1 === s.multiplex || o ? h = new _t(e, s) : (jt[n] || (jt[n] = new _t(e, s)), h = jt[n]), i.query && !s.query && (s.query = i.queryKey), h.socket(i.path, s);
	}
	Object.assign(xt, {
		Manager: _t,
		Socket: Et,
		io: xt,
		connect: xt
	});
	//#endregion
	//#region node_modules/reveal.js/dist/plugin/markdown.mjs
	function e$3() {
		return {
			async: !1,
			breaks: !1,
			extensions: null,
			gfm: !0,
			hooks: null,
			pedantic: !1,
			renderer: null,
			silent: !1,
			tokenizer: null,
			walkTokens: null
		};
	}
	var t$2 = e$3();
	function n$2(e) {
		t$2 = e;
	}
	var r$2 = { exec: () => null };
	function i$1(e, t = "") {
		let n = typeof e == "string" ? e : e.source, r = {
			replace: (e, t) => {
				let i = typeof t == "string" ? t : t.source;
				return i = i.replace(o$1.caret, "$1"), n = n.replace(e, i), r;
			},
			getRegex: () => new RegExp(n, t)
		};
		return r;
	}
	var a$1 = (() => {
		try {
			return !0;
		} catch {
			return !1;
		}
	})(), o$1 = {
		codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm,
		outputLinkReplace: /\\([\[\]])/g,
		indentCodeCompensation: /^(\s+)(?:```)/,
		beginningSpace: /^\s+/,
		endingHash: /#$/,
		startingSpaceChar: /^ /,
		endingSpaceChar: / $/,
		nonSpaceChar: /[^ ]/,
		newLineCharGlobal: /\n/g,
		tabCharGlobal: /\t/g,
		multipleSpaceGlobal: /\s+/g,
		blankLine: /^[ \t]*$/,
		doubleBlankLine: /\n[ \t]*\n[ \t]*$/,
		blockquoteStart: /^ {0,3}>/,
		blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g,
		blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm,
		listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g,
		listIsTask: /^\[[ xX]\] +\S/,
		listReplaceTask: /^\[[ xX]\] +/,
		listTaskCheckbox: /\[[ xX]\]/,
		anyLine: /\n.*\n/,
		hrefBrackets: /^<(.*)>$/,
		tableDelimiter: /[:|]/,
		tableAlignChars: /^\||\| *$/g,
		tableRowBlankLine: /\n[ \t]*$/,
		tableAlignRight: /^ *-+: *$/,
		tableAlignCenter: /^ *:-+: *$/,
		tableAlignLeft: /^ *:-+ *$/,
		startATag: /^<a /i,
		endATag: /^<\/a>/i,
		startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i,
		endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i,
		startAngleBracket: /^</,
		endAngleBracket: />$/,
		pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/,
		unicodeAlphaNumeric: /[\p{L}\p{N}]/u,
		escapeTest: /[&<>"']/,
		escapeReplace: /[&<>"']/g,
		escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,
		escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
		caret: /(^|[^\[])\^/g,
		percentDecode: /%25/g,
		findPipe: /\|/g,
		splitPipe: / \|/,
		slashPipe: /\\\|/g,
		carriageReturn: /\r\n|\r/g,
		spaceLine: /^ +$/gm,
		notSpaceStart: /^\S*/,
		endingNewline: /\n$/,
		listItemRegex: (e) => RegExp(`^( {0,3}${e})((?:[	 ][^\\n]*)?(?:\\n|$))`),
		nextBulletRegex: (e) => RegExp(`^ {0,${Math.min(3, e - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),
		hrRegex: (e) => RegExp(`^ {0,${Math.min(3, e - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),
		fencesBeginRegex: (e) => RegExp(`^ {0,${Math.min(3, e - 1)}}(?:\`\`\`|~~~)`),
		headingBeginRegex: (e) => RegExp(`^ {0,${Math.min(3, e - 1)}}#`),
		htmlBeginRegex: (e) => RegExp(`^ {0,${Math.min(3, e - 1)}}<(?:[a-z].*>|!--)`, "i"),
		blockquoteBeginRegex: (e) => RegExp(`^ {0,${Math.min(3, e - 1)}}>`)
	}, s$1 = /^(?:[ \t]*(?:\n|$))+/, c$1 = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/, l$1 = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/, u$1 = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/, d$1 = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/, f$1 = / {0,3}(?:[*+-]|\d{1,9}[.)])/, p$1 = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/, m$1 = i$1(p$1).replace(/bull/g, f$1).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex(), ee$1 = i$1(p$1).replace(/bull/g, f$1).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(), h$1 = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/, te$1 = /^[^\n]+/, g$1 = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/, ne$1 = i$1(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", g$1).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(), re$1 = i$1(/^(bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, f$1).getRegex(), _$1 = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul", v$1 = /<!--(?:-?>|[\s\S]*?(?:-->|$))/, ie$1 = i$1("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", v$1).replace("tag", _$1).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(), y$1 = i$1(h$1).replace("hr", u$1).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _$1).getRegex(), b$1 = {
		blockquote: i$1(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", y$1).getRegex(),
		code: c$1,
		def: ne$1,
		fences: l$1,
		heading: d$1,
		hr: u$1,
		html: ie$1,
		lheading: m$1,
		list: re$1,
		newline: s$1,
		paragraph: y$1,
		table: r$2,
		text: te$1
	}, x$1 = i$1("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", u$1).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _$1).getRegex(), ae$1 = {
		...b$1,
		lheading: ee$1,
		table: x$1,
		paragraph: i$1(h$1).replace("hr", u$1).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", x$1).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _$1).getRegex()
	}, oe$1 = {
		...b$1,
		html: i$1("^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:\"[^\"]*\"|'[^']*'|\\s[^'\"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))").replace("comment", v$1).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),
		def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
		heading: /^(#{1,6})(.*)(?:\n+|$)/,
		fences: r$2,
		lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
		paragraph: i$1(h$1).replace("hr", u$1).replace("heading", " *#{1,6} *[^\n]").replace("lheading", m$1).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex()
	}, se$1 = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/, ce$1 = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/, S$1 = /^( {2,}|\\)\n(?!\s*$)/, le$1 = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/, C$1 = /[\p{P}\p{S}]/u, w$1 = /[\s\p{P}\p{S}]/u, T$1 = /[^\s\p{P}\p{S}]/u, ue$1 = i$1(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, w$1).getRegex(), E$1 = /(?!~)[\p{P}\p{S}]/u, de$1 = /(?!~)[\s\p{P}\p{S}]/u, fe$1 = /(?:[^\s\p{P}\p{S}]|~)/u, pe$1 = i$1(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", a$1 ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex(), D$1 = /^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/, me$1 = i$1(D$1, "u").replace(/punct/g, C$1).getRegex(), he$1 = i$1(D$1, "u").replace(/punct/g, E$1).getRegex(), O$1 = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)", ge$1 = i$1(O$1, "gu").replace(/notPunctSpace/g, T$1).replace(/punctSpace/g, w$1).replace(/punct/g, C$1).getRegex(), _e$1 = i$1(O$1, "gu").replace(/notPunctSpace/g, fe$1).replace(/punctSpace/g, de$1).replace(/punct/g, E$1).getRegex(), ve$1 = i$1("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, T$1).replace(/punctSpace/g, w$1).replace(/punct/g, C$1).getRegex(), ye$1 = i$1(/^~~?(?:((?!~)punct)|[^\s~])/, "u").replace(/punct/g, C$1).getRegex(), be$1 = i$1("^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)", "gu").replace(/notPunctSpace/g, T$1).replace(/punctSpace/g, w$1).replace(/punct/g, C$1).getRegex(), xe$1 = i$1(/\\(punct)/, "gu").replace(/punct/g, C$1).getRegex(), Se$1 = i$1(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(), Ce$1 = i$1(v$1).replace("(?:-->|$)", "-->").getRegex(), we$1 = i$1("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", Ce$1).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(), k$1 = /(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/, Te$1 = i$1(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/).replace("label", k$1).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(), A$1 = i$1(/^!?\[(label)\]\[(ref)\]/).replace("label", k$1).replace("ref", g$1).getRegex(), j$1 = i$1(/^!?\[(ref)\](?:\[\])?/).replace("ref", g$1).getRegex(), Ee$1 = i$1("reflink|nolink(?!\\()", "g").replace("reflink", A$1).replace("nolink", j$1).getRegex(), M$1 = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/, N$1 = {
		_backpedal: r$2,
		anyPunctuation: xe$1,
		autolink: Se$1,
		blockSkip: pe$1,
		br: S$1,
		code: ce$1,
		del: r$2,
		delLDelim: r$2,
		delRDelim: r$2,
		emStrongLDelim: me$1,
		emStrongRDelimAst: ge$1,
		emStrongRDelimUnd: ve$1,
		escape: se$1,
		link: Te$1,
		nolink: j$1,
		punctuation: ue$1,
		reflink: A$1,
		reflinkSearch: Ee$1,
		tag: we$1,
		text: le$1,
		url: r$2
	}, De$1 = {
		...N$1,
		link: i$1(/^!?\[(label)\]\((.*?)\)/).replace("label", k$1).getRegex(),
		reflink: i$1(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", k$1).getRegex()
	}, P$1 = {
		...N$1,
		emStrongRDelimAst: _e$1,
		emStrongLDelim: he$1,
		delLDelim: ye$1,
		delRDelim: be$1,
		url: i$1(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol", M$1).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),
		_backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
		del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,
		text: i$1(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol", M$1).getRegex()
	}, Oe$1 = {
		...P$1,
		br: i$1(S$1).replace("{2,}", "*").getRegex(),
		text: i$1(P$1.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex()
	}, F$1 = {
		normal: b$1,
		gfm: ae$1,
		pedantic: oe$1
	}, I$1 = {
		normal: N$1,
		gfm: P$1,
		breaks: Oe$1,
		pedantic: De$1
	}, ke$1 = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\"": "&quot;",
		"'": "&#39;"
	}, L$1 = (e) => ke$1[e];
	function R$1(e, t) {
		if (t) {
			if (o$1.escapeTest.test(e)) return e.replace(o$1.escapeReplace, L$1);
		} else if (o$1.escapeTestNoEncode.test(e)) return e.replace(o$1.escapeReplaceNoEncode, L$1);
		return e;
	}
	function z$1(e) {
		try {
			e = encodeURI(e).replace(o$1.percentDecode, "%");
		} catch {
			return null;
		}
		return e;
	}
	function B$1(e, t) {
		let n = e.replace(o$1.findPipe, (e, t, n) => {
			let r = !1, i = t;
			for (; --i >= 0 && n[i] === "\\";) r = !r;
			return r ? "|" : " |";
		}).split(o$1.splitPipe), r = 0;
		if (n[0].trim() || n.shift(), n.length > 0 && !n.at(-1)?.trim() && n.pop(), t) if (n.length > t) n.splice(t);
		else for (; n.length < t;) n.push("");
		for (; r < n.length; r++) n[r] = n[r].trim().replace(o$1.slashPipe, "|");
		return n;
	}
	function V$1(e, t, n) {
		let r = e.length;
		if (r === 0) return "";
		let i = 0;
		for (; i < r;) {
			let a = e.charAt(r - i - 1);
			if (a === t && !n) i++;
			else if (a !== t && n) i++;
			else break;
		}
		return e.slice(0, r - i);
	}
	function Ae$1(e, t) {
		if (e.indexOf(t[1]) === -1) return -1;
		let n = 0;
		for (let r = 0; r < e.length; r++) if (e[r] === "\\") r++;
		else if (e[r] === t[0]) n++;
		else if (e[r] === t[1] && (n--, n < 0)) return r;
		return n > 0 ? -2 : -1;
	}
	function je$1(e, t = 0) {
		let n = t, r = "";
		for (let t of e) if (t === "	") {
			let e = 4 - n % 4;
			r += " ".repeat(e), n += e;
		} else r += t, n++;
		return r;
	}
	function H$1(e, t, n, r, i) {
		let a = t.href, o = t.title || null, s = e[1].replace(i.other.outputLinkReplace, "$1");
		r.state.inLink = !0;
		let c = {
			type: e[0].charAt(0) === "!" ? "image" : "link",
			raw: n,
			href: a,
			title: o,
			text: s,
			tokens: r.inlineTokens(s)
		};
		return r.state.inLink = !1, c;
	}
	function Me(e, t, n) {
		let r = e.match(n.other.indentCodeCompensation);
		if (r === null) return t;
		let i = r[1];
		return t.split("\n").map((e) => {
			let t = e.match(n.other.beginningSpace);
			if (t === null) return e;
			let [r] = t;
			return r.length >= i.length ? e.slice(i.length) : e;
		}).join("\n");
	}
	var U$1 = class {
		options;
		rules;
		lexer;
		constructor(e) {
			this.options = e || t$2;
		}
		space(e) {
			let t = this.rules.block.newline.exec(e);
			if (t && t[0].length > 0) return {
				type: "space",
				raw: t[0]
			};
		}
		code(e) {
			let t = this.rules.block.code.exec(e);
			if (t) {
				let e = t[0].replace(this.rules.other.codeRemoveIndent, "");
				return {
					type: "code",
					raw: t[0],
					codeBlockStyle: "indented",
					text: this.options.pedantic ? e : V$1(e, "\n")
				};
			}
		}
		fences(e) {
			let t = this.rules.block.fences.exec(e);
			if (t) {
				let e = t[0], n = Me(e, t[3] || "", this.rules);
				return {
					type: "code",
					raw: e,
					lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2],
					text: n
				};
			}
		}
		heading(e) {
			let t = this.rules.block.heading.exec(e);
			if (t) {
				let e = t[2].trim();
				if (this.rules.other.endingHash.test(e)) {
					let t = V$1(e, "#");
					(this.options.pedantic || !t || this.rules.other.endingSpaceChar.test(t)) && (e = t.trim());
				}
				return {
					type: "heading",
					raw: t[0],
					depth: t[1].length,
					text: e,
					tokens: this.lexer.inline(e)
				};
			}
		}
		hr(e) {
			let t = this.rules.block.hr.exec(e);
			if (t) return {
				type: "hr",
				raw: V$1(t[0], "\n")
			};
		}
		blockquote(e) {
			let t = this.rules.block.blockquote.exec(e);
			if (t) {
				let e = V$1(t[0], "\n").split("\n"), n = "", r = "", i = [];
				for (; e.length > 0;) {
					let t = !1, a = [], o;
					for (o = 0; o < e.length; o++) if (this.rules.other.blockquoteStart.test(e[o])) a.push(e[o]), t = !0;
					else if (!t) a.push(e[o]);
					else break;
					e = e.slice(o);
					let s = a.join("\n"), c = s.replace(this.rules.other.blockquoteSetextReplace, "\n    $1").replace(this.rules.other.blockquoteSetextReplace2, "");
					n = n ? `${n}
${s}` : s, r = r ? `${r}
${c}` : c;
					let l = this.lexer.state.top;
					if (this.lexer.state.top = !0, this.lexer.blockTokens(c, i, !0), this.lexer.state.top = l, e.length === 0) break;
					let u = i.at(-1);
					if (u?.type === "code") break;
					if (u?.type === "blockquote") {
						let t = u, a = t.raw + "\n" + e.join("\n"), o = this.blockquote(a);
						i[i.length - 1] = o, n = n.substring(0, n.length - t.raw.length) + o.raw, r = r.substring(0, r.length - t.text.length) + o.text;
						break;
					} else if (u?.type === "list") {
						let t = u, a = t.raw + "\n" + e.join("\n"), o = this.list(a);
						i[i.length - 1] = o, n = n.substring(0, n.length - u.raw.length) + o.raw, r = r.substring(0, r.length - t.raw.length) + o.raw, e = a.substring(i.at(-1).raw.length).split("\n");
						continue;
					}
				}
				return {
					type: "blockquote",
					raw: n,
					tokens: i,
					text: r
				};
			}
		}
		list(e) {
			let t = this.rules.block.list.exec(e);
			if (t) {
				let n = t[1].trim(), r = n.length > 1, i = {
					type: "list",
					raw: "",
					ordered: r,
					start: r ? +n.slice(0, -1) : "",
					loose: !1,
					items: []
				};
				n = r ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`, this.options.pedantic && (n = r ? n : "[*+-]");
				let a = this.rules.other.listItemRegex(n), o = !1;
				for (; e;) {
					let n = !1, r = "", s = "";
					if (!(t = a.exec(e)) || this.rules.block.hr.test(e)) break;
					r = t[0], e = e.substring(r.length);
					let c = je$1(t[2].split("\n", 1)[0], t[1].length), l = e.split("\n", 1)[0], u = !c.trim(), d = 0;
					if (this.options.pedantic ? (d = 2, s = c.trimStart()) : u ? d = t[1].length + 1 : (d = c.search(this.rules.other.nonSpaceChar), d = d > 4 ? 1 : d, s = c.slice(d), d += t[1].length), u && this.rules.other.blankLine.test(l) && (r += l + "\n", e = e.substring(l.length + 1), n = !0), !n) {
						let t = this.rules.other.nextBulletRegex(d), n = this.rules.other.hrRegex(d), i = this.rules.other.fencesBeginRegex(d), a = this.rules.other.headingBeginRegex(d), o = this.rules.other.htmlBeginRegex(d), f = this.rules.other.blockquoteBeginRegex(d);
						for (; e;) {
							let p = e.split("\n", 1)[0], m;
							if (l = p, this.options.pedantic ? (l = l.replace(this.rules.other.listReplaceNesting, "  "), m = l) : m = l.replace(this.rules.other.tabCharGlobal, "    "), i.test(l) || a.test(l) || o.test(l) || f.test(l) || t.test(l) || n.test(l)) break;
							if (m.search(this.rules.other.nonSpaceChar) >= d || !l.trim()) s += "\n" + m.slice(d);
							else {
								if (u || c.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || i.test(c) || a.test(c) || n.test(c)) break;
								s += "\n" + l;
							}
							u = !l.trim(), r += p + "\n", e = e.substring(p.length + 1), c = m.slice(d);
						}
					}
					i.loose || (o ? i.loose = !0 : this.rules.other.doubleBlankLine.test(r) && (o = !0)), i.items.push({
						type: "list_item",
						raw: r,
						task: !!this.options.gfm && this.rules.other.listIsTask.test(s),
						loose: !1,
						text: s,
						tokens: []
					}), i.raw += r;
				}
				let s = i.items.at(-1);
				if (s) s.raw = s.raw.trimEnd(), s.text = s.text.trimEnd();
				else return;
				i.raw = i.raw.trimEnd();
				for (let e of i.items) {
					if (this.lexer.state.top = !1, e.tokens = this.lexer.blockTokens(e.text, []), e.task) {
						if (e.text = e.text.replace(this.rules.other.listReplaceTask, ""), e.tokens[0]?.type === "text" || e.tokens[0]?.type === "paragraph") {
							e.tokens[0].raw = e.tokens[0].raw.replace(this.rules.other.listReplaceTask, ""), e.tokens[0].text = e.tokens[0].text.replace(this.rules.other.listReplaceTask, "");
							for (let e = this.lexer.inlineQueue.length - 1; e >= 0; e--) if (this.rules.other.listIsTask.test(this.lexer.inlineQueue[e].src)) {
								this.lexer.inlineQueue[e].src = this.lexer.inlineQueue[e].src.replace(this.rules.other.listReplaceTask, "");
								break;
							}
						}
						let t = this.rules.other.listTaskCheckbox.exec(e.raw);
						if (t) {
							let n = {
								type: "checkbox",
								raw: t[0] + " ",
								checked: t[0] !== "[ ]"
							};
							e.checked = n.checked, i.loose ? e.tokens[0] && ["paragraph", "text"].includes(e.tokens[0].type) && "tokens" in e.tokens[0] && e.tokens[0].tokens ? (e.tokens[0].raw = n.raw + e.tokens[0].raw, e.tokens[0].text = n.raw + e.tokens[0].text, e.tokens[0].tokens.unshift(n)) : e.tokens.unshift({
								type: "paragraph",
								raw: n.raw,
								text: n.raw,
								tokens: [n]
							}) : e.tokens.unshift(n);
						}
					}
					if (!i.loose) {
						let t = e.tokens.filter((e) => e.type === "space");
						i.loose = t.length > 0 && t.some((e) => this.rules.other.anyLine.test(e.raw));
					}
				}
				if (i.loose) for (let e of i.items) {
					e.loose = !0;
					for (let t of e.tokens) t.type === "text" && (t.type = "paragraph");
				}
				return i;
			}
		}
		html(e) {
			let t = this.rules.block.html.exec(e);
			if (t) return {
				type: "html",
				block: !0,
				raw: t[0],
				pre: t[1] === "pre" || t[1] === "script" || t[1] === "style",
				text: t[0]
			};
		}
		def(e) {
			let t = this.rules.block.def.exec(e);
			if (t) {
				let e = t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), n = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", r = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
				return {
					type: "def",
					tag: e,
					raw: t[0],
					href: n,
					title: r
				};
			}
		}
		table(e) {
			let t = this.rules.block.table.exec(e);
			if (!t || !this.rules.other.tableDelimiter.test(t[2])) return;
			let n = B$1(t[1]), r = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), i = t[3]?.trim() ? t[3].replace(this.rules.other.tableRowBlankLine, "").split("\n") : [], a = {
				type: "table",
				raw: t[0],
				header: [],
				align: [],
				rows: []
			};
			if (n.length === r.length) {
				for (let e of r) this.rules.other.tableAlignRight.test(e) ? a.align.push("right") : this.rules.other.tableAlignCenter.test(e) ? a.align.push("center") : this.rules.other.tableAlignLeft.test(e) ? a.align.push("left") : a.align.push(null);
				for (let e = 0; e < n.length; e++) a.header.push({
					text: n[e],
					tokens: this.lexer.inline(n[e]),
					header: !0,
					align: a.align[e]
				});
				for (let e of i) a.rows.push(B$1(e, a.header.length).map((e, t) => ({
					text: e,
					tokens: this.lexer.inline(e),
					header: !1,
					align: a.align[t]
				})));
				return a;
			}
		}
		lheading(e) {
			let t = this.rules.block.lheading.exec(e);
			if (t) {
				let e = t[1].trim();
				return {
					type: "heading",
					raw: t[0],
					depth: t[2].charAt(0) === "=" ? 1 : 2,
					text: e,
					tokens: this.lexer.inline(e)
				};
			}
		}
		paragraph(e) {
			let t = this.rules.block.paragraph.exec(e);
			if (t) {
				let e = t[1].charAt(t[1].length - 1) === "\n" ? t[1].slice(0, -1) : t[1];
				return {
					type: "paragraph",
					raw: t[0],
					text: e,
					tokens: this.lexer.inline(e)
				};
			}
		}
		text(e) {
			let t = this.rules.block.text.exec(e);
			if (t) return {
				type: "text",
				raw: t[0],
				text: t[0],
				tokens: this.lexer.inline(t[0])
			};
		}
		escape(e) {
			let t = this.rules.inline.escape.exec(e);
			if (t) return {
				type: "escape",
				raw: t[0],
				text: t[1]
			};
		}
		tag(e) {
			let t = this.rules.inline.tag.exec(e);
			if (t) return !this.lexer.state.inLink && this.rules.other.startATag.test(t[0]) ? this.lexer.state.inLink = !0 : this.lexer.state.inLink && this.rules.other.endATag.test(t[0]) && (this.lexer.state.inLink = !1), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0]) ? this.lexer.state.inRawBlock = !0 : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t[0]) && (this.lexer.state.inRawBlock = !1), {
				type: "html",
				raw: t[0],
				inLink: this.lexer.state.inLink,
				inRawBlock: this.lexer.state.inRawBlock,
				block: !1,
				text: t[0]
			};
		}
		link(e) {
			let t = this.rules.inline.link.exec(e);
			if (t) {
				let e = t[2].trim();
				if (!this.options.pedantic && this.rules.other.startAngleBracket.test(e)) {
					if (!this.rules.other.endAngleBracket.test(e)) return;
					let t = V$1(e.slice(0, -1), "\\");
					if ((e.length - t.length) % 2 == 0) return;
				} else {
					let e = Ae$1(t[2], "()");
					if (e === -2) return;
					if (e > -1) {
						let n = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + e;
						t[2] = t[2].substring(0, e), t[0] = t[0].substring(0, n).trim(), t[3] = "";
					}
				}
				let n = t[2], r = "";
				if (this.options.pedantic) {
					let e = this.rules.other.pedanticHrefTitle.exec(n);
					e && (n = e[1], r = e[3]);
				} else r = t[3] ? t[3].slice(1, -1) : "";
				return n = n.trim(), this.rules.other.startAngleBracket.test(n) && (n = this.options.pedantic && !this.rules.other.endAngleBracket.test(e) ? n.slice(1) : n.slice(1, -1)), H$1(t, {
					href: n && n.replace(this.rules.inline.anyPunctuation, "$1"),
					title: r && r.replace(this.rules.inline.anyPunctuation, "$1")
				}, t[0], this.lexer, this.rules);
			}
		}
		reflink(e, t) {
			let n;
			if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
				let e = t[(n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " ").toLowerCase()];
				if (!e) {
					let e = n[0].charAt(0);
					return {
						type: "text",
						raw: e,
						text: e
					};
				}
				return H$1(n, e, n[0], this.lexer, this.rules);
			}
		}
		emStrong(e, t, n = "") {
			let r = this.rules.inline.emStrongLDelim.exec(e);
			if (!(!r || !r[1] && !r[2] && !r[3] && !r[4] || r[4] && n.match(this.rules.other.unicodeAlphaNumeric)) && (!(r[1] || r[3]) || !n || this.rules.inline.punctuation.exec(n))) {
				let n = [...r[0]].length - 1, i, a, o = n, s = 0, c = r[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
				for (c.lastIndex = 0, t = t.slice(-1 * e.length + n); (r = c.exec(t)) != null;) {
					if (i = r[1] || r[2] || r[3] || r[4] || r[5] || r[6], !i) continue;
					if (a = [...i].length, r[3] || r[4]) {
						o += a;
						continue;
					} else if ((r[5] || r[6]) && n % 3 && !((n + a) % 3)) {
						s += a;
						continue;
					}
					if (o -= a, o > 0) continue;
					a = Math.min(a, a + o + s);
					let t = [...r[0]][0].length, c = e.slice(0, n + r.index + t + a);
					if (Math.min(n, a) % 2) {
						let e = c.slice(1, -1);
						return {
							type: "em",
							raw: c,
							text: e,
							tokens: this.lexer.inlineTokens(e)
						};
					}
					let l = c.slice(2, -2);
					return {
						type: "strong",
						raw: c,
						text: l,
						tokens: this.lexer.inlineTokens(l)
					};
				}
			}
		}
		codespan(e) {
			let t = this.rules.inline.code.exec(e);
			if (t) {
				let e = t[2].replace(this.rules.other.newLineCharGlobal, " "), n = this.rules.other.nonSpaceChar.test(e), r = this.rules.other.startingSpaceChar.test(e) && this.rules.other.endingSpaceChar.test(e);
				return n && r && (e = e.substring(1, e.length - 1)), {
					type: "codespan",
					raw: t[0],
					text: e
				};
			}
		}
		br(e) {
			let t = this.rules.inline.br.exec(e);
			if (t) return {
				type: "br",
				raw: t[0]
			};
		}
		del(e, t, n = "") {
			let r = this.rules.inline.delLDelim.exec(e);
			if (r && (!r[1] || !n || this.rules.inline.punctuation.exec(n))) {
				let n = [...r[0]].length - 1, i, a, o = n, s = this.rules.inline.delRDelim;
				for (s.lastIndex = 0, t = t.slice(-1 * e.length + n); (r = s.exec(t)) != null;) {
					if (i = r[1] || r[2] || r[3] || r[4] || r[5] || r[6], !i || (a = [...i].length, a !== n)) continue;
					if (r[3] || r[4]) {
						o += a;
						continue;
					}
					if (o -= a, o > 0) continue;
					a = Math.min(a, a + o);
					let t = [...r[0]][0].length, s = e.slice(0, n + r.index + t + a), c = s.slice(n, -n);
					return {
						type: "del",
						raw: s,
						text: c,
						tokens: this.lexer.inlineTokens(c)
					};
				}
			}
		}
		autolink(e) {
			let t = this.rules.inline.autolink.exec(e);
			if (t) {
				let e, n;
				return t[2] === "@" ? (e = t[1], n = "mailto:" + e) : (e = t[1], n = e), {
					type: "link",
					raw: t[0],
					text: e,
					href: n,
					tokens: [{
						type: "text",
						raw: e,
						text: e
					}]
				};
			}
		}
		url(e) {
			let t;
			if (t = this.rules.inline.url.exec(e)) {
				let e, n;
				if (t[2] === "@") e = t[0], n = "mailto:" + e;
				else {
					let r;
					do
						r = t[0], t[0] = this.rules.inline._backpedal.exec(t[0])?.[0] ?? "";
					while (r !== t[0]);
					e = t[0], n = t[1] === "www." ? "http://" + t[0] : t[0];
				}
				return {
					type: "link",
					raw: t[0],
					text: e,
					href: n,
					tokens: [{
						type: "text",
						raw: e,
						text: e
					}]
				};
			}
		}
		inlineText(e) {
			let t = this.rules.inline.text.exec(e);
			if (t) {
				let e = this.lexer.state.inRawBlock;
				return {
					type: "text",
					raw: t[0],
					text: t[0],
					escaped: e
				};
			}
		}
	}, W$1 = class e {
		tokens;
		options;
		state;
		inlineQueue;
		tokenizer;
		constructor(e) {
			this.tokens = [], this.tokens.links = Object.create(null), this.options = e || t$2, this.options.tokenizer = this.options.tokenizer || new U$1(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = {
				inLink: !1,
				inRawBlock: !1,
				top: !0
			};
			let n = {
				other: o$1,
				block: F$1.normal,
				inline: I$1.normal
			};
			this.options.pedantic ? (n.block = F$1.pedantic, n.inline = I$1.pedantic) : this.options.gfm && (n.block = F$1.gfm, this.options.breaks ? n.inline = I$1.breaks : n.inline = I$1.gfm), this.tokenizer.rules = n;
		}
		static get rules() {
			return {
				block: F$1,
				inline: I$1
			};
		}
		static lex(t, n) {
			return new e(n).lex(t);
		}
		static lexInline(t, n) {
			return new e(n).inlineTokens(t);
		}
		lex(e) {
			e = e.replace(o$1.carriageReturn, "\n"), this.blockTokens(e, this.tokens);
			for (let e = 0; e < this.inlineQueue.length; e++) {
				let t = this.inlineQueue[e];
				this.inlineTokens(t.src, t.tokens);
			}
			return this.inlineQueue = [], this.tokens;
		}
		blockTokens(e, t = [], n = !1) {
			for (this.tokenizer.lexer = this, this.options.pedantic && (e = e.replace(o$1.tabCharGlobal, "    ").replace(o$1.spaceLine, "")); e;) {
				let r;
				if (this.options.extensions?.block?.some((n) => (r = n.call({ lexer: this }, e, t)) ? (e = e.substring(r.raw.length), t.push(r), !0) : !1)) continue;
				if (r = this.tokenizer.space(e)) {
					e = e.substring(r.raw.length);
					let n = t.at(-1);
					r.raw.length === 1 && n !== void 0 ? n.raw += "\n" : t.push(r);
					continue;
				}
				if (r = this.tokenizer.code(e)) {
					e = e.substring(r.raw.length);
					let n = t.at(-1);
					n?.type === "paragraph" || n?.type === "text" ? (n.raw += (n.raw.endsWith("\n") ? "" : "\n") + r.raw, n.text += "\n" + r.text, this.inlineQueue.at(-1).src = n.text) : t.push(r);
					continue;
				}
				if (r = this.tokenizer.fences(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.heading(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.hr(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.blockquote(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.list(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.html(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.def(e)) {
					e = e.substring(r.raw.length);
					let n = t.at(-1);
					n?.type === "paragraph" || n?.type === "text" ? (n.raw += (n.raw.endsWith("\n") ? "" : "\n") + r.raw, n.text += "\n" + r.raw, this.inlineQueue.at(-1).src = n.text) : this.tokens.links[r.tag] || (this.tokens.links[r.tag] = {
						href: r.href,
						title: r.title
					}, t.push(r));
					continue;
				}
				if (r = this.tokenizer.table(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.lheading(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				let i = e;
				if (this.options.extensions?.startBlock) {
					let t = Infinity, n = e.slice(1), r;
					this.options.extensions.startBlock.forEach((e) => {
						r = e.call({ lexer: this }, n), typeof r == "number" && r >= 0 && (t = Math.min(t, r));
					}), t < Infinity && t >= 0 && (i = e.substring(0, t + 1));
				}
				if (this.state.top && (r = this.tokenizer.paragraph(i))) {
					let a = t.at(-1);
					n && a?.type === "paragraph" ? (a.raw += (a.raw.endsWith("\n") ? "" : "\n") + r.raw, a.text += "\n" + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = a.text) : t.push(r), n = i.length !== e.length, e = e.substring(r.raw.length);
					continue;
				}
				if (r = this.tokenizer.text(e)) {
					e = e.substring(r.raw.length);
					let n = t.at(-1);
					n?.type === "text" ? (n.raw += (n.raw.endsWith("\n") ? "" : "\n") + r.raw, n.text += "\n" + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = n.text) : t.push(r);
					continue;
				}
				if (e) {
					let t = "Infinite loop on byte: " + e.charCodeAt(0);
					if (this.options.silent) {
						console.error(t);
						break;
					} else throw Error(t);
				}
			}
			return this.state.top = !0, t;
		}
		inline(e, t = []) {
			return this.inlineQueue.push({
				src: e,
				tokens: t
			}), t;
		}
		inlineTokens(e, t = []) {
			this.tokenizer.lexer = this;
			let n = e, r = null;
			if (this.tokens.links) {
				let e = Object.keys(this.tokens.links);
				if (e.length > 0) for (; (r = this.tokenizer.rules.inline.reflinkSearch.exec(n)) != null;) e.includes(r[0].slice(r[0].lastIndexOf("[") + 1, -1)) && (n = n.slice(0, r.index) + "[" + "a".repeat(r[0].length - 2) + "]" + n.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex));
			}
			for (; (r = this.tokenizer.rules.inline.anyPunctuation.exec(n)) != null;) n = n.slice(0, r.index) + "++" + n.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
			let i;
			for (; (r = this.tokenizer.rules.inline.blockSkip.exec(n)) != null;) i = r[2] ? r[2].length : 0, n = n.slice(0, r.index + i) + "[" + "a".repeat(r[0].length - i - 2) + "]" + n.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
			n = this.options.hooks?.emStrongMask?.call({ lexer: this }, n) ?? n;
			let a = !1, o = "";
			for (; e;) {
				a || (o = ""), a = !1;
				let r;
				if (this.options.extensions?.inline?.some((n) => (r = n.call({ lexer: this }, e, t)) ? (e = e.substring(r.raw.length), t.push(r), !0) : !1)) continue;
				if (r = this.tokenizer.escape(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.tag(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.link(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.reflink(e, this.tokens.links)) {
					e = e.substring(r.raw.length);
					let n = t.at(-1);
					r.type === "text" && n?.type === "text" ? (n.raw += r.raw, n.text += r.text) : t.push(r);
					continue;
				}
				if (r = this.tokenizer.emStrong(e, n, o)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.codespan(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.br(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.del(e, n, o)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.autolink(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (!this.state.inLink && (r = this.tokenizer.url(e))) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				let i = e;
				if (this.options.extensions?.startInline) {
					let t = Infinity, n = e.slice(1), r;
					this.options.extensions.startInline.forEach((e) => {
						r = e.call({ lexer: this }, n), typeof r == "number" && r >= 0 && (t = Math.min(t, r));
					}), t < Infinity && t >= 0 && (i = e.substring(0, t + 1));
				}
				if (r = this.tokenizer.inlineText(i)) {
					e = e.substring(r.raw.length), r.raw.slice(-1) !== "_" && (o = r.raw.slice(-1)), a = !0;
					let n = t.at(-1);
					n?.type === "text" ? (n.raw += r.raw, n.text += r.text) : t.push(r);
					continue;
				}
				if (e) {
					let t = "Infinite loop on byte: " + e.charCodeAt(0);
					if (this.options.silent) {
						console.error(t);
						break;
					} else throw Error(t);
				}
			}
			return t;
		}
	}, G$1 = class {
		options;
		parser;
		constructor(e) {
			this.options = e || t$2;
		}
		space(e) {
			return "";
		}
		code({ text: e, lang: t, escaped: n }) {
			let r = (t || "").match(o$1.notSpaceStart)?.[0], i = e.replace(o$1.endingNewline, "") + "\n";
			return r ? "<pre><code class=\"language-" + R$1(r) + "\">" + (n ? i : R$1(i, !0)) + "</code></pre>\n" : "<pre><code>" + (n ? i : R$1(i, !0)) + "</code></pre>\n";
		}
		blockquote({ tokens: e }) {
			return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
		}
		html({ text: e }) {
			return e;
		}
		def(e) {
			return "";
		}
		heading({ tokens: e, depth: t }) {
			return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
		}
		hr(e) {
			return "<hr>\n";
		}
		list(e) {
			let t = e.ordered, n = e.start, r = "";
			for (let t = 0; t < e.items.length; t++) {
				let n = e.items[t];
				r += this.listitem(n);
			}
			let i = t ? "ol" : "ul", a = t && n !== 1 ? " start=\"" + n + "\"" : "";
			return "<" + i + a + ">\n" + r + "</" + i + ">\n";
		}
		listitem(e) {
			return `<li>${this.parser.parse(e.tokens)}</li>
`;
		}
		checkbox({ checked: e }) {
			return "<input " + (e ? "checked=\"\" " : "") + "disabled=\"\" type=\"checkbox\"> ";
		}
		paragraph({ tokens: e }) {
			return `<p>${this.parser.parseInline(e)}</p>
`;
		}
		table(e) {
			let t = "", n = "";
			for (let t = 0; t < e.header.length; t++) n += this.tablecell(e.header[t]);
			t += this.tablerow({ text: n });
			let r = "";
			for (let t = 0; t < e.rows.length; t++) {
				let i = e.rows[t];
				n = "";
				for (let e = 0; e < i.length; e++) n += this.tablecell(i[e]);
				r += this.tablerow({ text: n });
			}
			return r &&= `<tbody>${r}</tbody>`, "<table>\n<thead>\n" + t + "</thead>\n" + r + "</table>\n";
		}
		tablerow({ text: e }) {
			return `<tr>
${e}</tr>
`;
		}
		tablecell(e) {
			let t = this.parser.parseInline(e.tokens), n = e.header ? "th" : "td";
			return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>
`;
		}
		strong({ tokens: e }) {
			return `<strong>${this.parser.parseInline(e)}</strong>`;
		}
		em({ tokens: e }) {
			return `<em>${this.parser.parseInline(e)}</em>`;
		}
		codespan({ text: e }) {
			return `<code>${R$1(e, !0)}</code>`;
		}
		br(e) {
			return "<br>";
		}
		del({ tokens: e }) {
			return `<del>${this.parser.parseInline(e)}</del>`;
		}
		link({ href: e, title: t, tokens: n }) {
			let r = this.parser.parseInline(n), i = z$1(e);
			if (i === null) return r;
			e = i;
			let a = "<a href=\"" + e + "\"";
			return t && (a += " title=\"" + R$1(t) + "\""), a += ">" + r + "</a>", a;
		}
		image({ href: e, title: t, text: n, tokens: r }) {
			r && (n = this.parser.parseInline(r, this.parser.textRenderer));
			let i = z$1(e);
			if (i === null) return R$1(n);
			e = i;
			let a = `<img src="${e}" alt="${R$1(n)}"`;
			return t && (a += ` title="${R$1(t)}"`), a += ">", a;
		}
		text(e) {
			return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : "escaped" in e && e.escaped ? e.text : R$1(e.text);
		}
	}, K$1 = class {
		strong({ text: e }) {
			return e;
		}
		em({ text: e }) {
			return e;
		}
		codespan({ text: e }) {
			return e;
		}
		del({ text: e }) {
			return e;
		}
		html({ text: e }) {
			return e;
		}
		text({ text: e }) {
			return e;
		}
		link({ text: e }) {
			return "" + e;
		}
		image({ text: e }) {
			return "" + e;
		}
		br() {
			return "";
		}
		checkbox({ raw: e }) {
			return e;
		}
	}, q$1 = class e {
		options;
		renderer;
		textRenderer;
		constructor(e) {
			this.options = e || t$2, this.options.renderer = this.options.renderer || new G$1(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new K$1();
		}
		static parse(t, n) {
			return new e(n).parse(t);
		}
		static parseInline(t, n) {
			return new e(n).parseInline(t);
		}
		parse(e) {
			this.renderer.parser = this;
			let t = "";
			for (let n = 0; n < e.length; n++) {
				let r = e[n];
				if (this.options.extensions?.renderers?.[r.type]) {
					let e = r, n = this.options.extensions.renderers[e.type].call({ parser: this }, e);
					if (n !== !1 || ![
						"space",
						"hr",
						"heading",
						"code",
						"table",
						"blockquote",
						"list",
						"html",
						"def",
						"paragraph",
						"text"
					].includes(e.type)) {
						t += n || "";
						continue;
					}
				}
				let i = r;
				switch (i.type) {
					case "space":
						t += this.renderer.space(i);
						break;
					case "hr":
						t += this.renderer.hr(i);
						break;
					case "heading":
						t += this.renderer.heading(i);
						break;
					case "code":
						t += this.renderer.code(i);
						break;
					case "table":
						t += this.renderer.table(i);
						break;
					case "blockquote":
						t += this.renderer.blockquote(i);
						break;
					case "list":
						t += this.renderer.list(i);
						break;
					case "checkbox":
						t += this.renderer.checkbox(i);
						break;
					case "html":
						t += this.renderer.html(i);
						break;
					case "def":
						t += this.renderer.def(i);
						break;
					case "paragraph":
						t += this.renderer.paragraph(i);
						break;
					case "text":
						t += this.renderer.text(i);
						break;
					default: {
						let e = "Token with \"" + i.type + "\" type was not found.";
						if (this.options.silent) return console.error(e), "";
						throw Error(e);
					}
				}
			}
			return t;
		}
		parseInline(e, t = this.renderer) {
			this.renderer.parser = this;
			let n = "";
			for (let r = 0; r < e.length; r++) {
				let i = e[r];
				if (this.options.extensions?.renderers?.[i.type]) {
					let e = this.options.extensions.renderers[i.type].call({ parser: this }, i);
					if (e !== !1 || ![
						"escape",
						"html",
						"link",
						"image",
						"strong",
						"em",
						"codespan",
						"br",
						"del",
						"text"
					].includes(i.type)) {
						n += e || "";
						continue;
					}
				}
				let a = i;
				switch (a.type) {
					case "escape":
						n += t.text(a);
						break;
					case "html":
						n += t.html(a);
						break;
					case "link":
						n += t.link(a);
						break;
					case "image":
						n += t.image(a);
						break;
					case "checkbox":
						n += t.checkbox(a);
						break;
					case "strong":
						n += t.strong(a);
						break;
					case "em":
						n += t.em(a);
						break;
					case "codespan":
						n += t.codespan(a);
						break;
					case "br":
						n += t.br(a);
						break;
					case "del":
						n += t.del(a);
						break;
					case "text":
						n += t.text(a);
						break;
					default: {
						let e = "Token with \"" + a.type + "\" type was not found.";
						if (this.options.silent) return console.error(e), "";
						throw Error(e);
					}
				}
			}
			return n;
		}
	}, J$1 = class {
		options;
		block;
		constructor(e) {
			this.options = e || t$2;
		}
		static passThroughHooks = new Set([
			"preprocess",
			"postprocess",
			"processAllTokens",
			"emStrongMask"
		]);
		static passThroughHooksRespectAsync = new Set([
			"preprocess",
			"postprocess",
			"processAllTokens"
		]);
		preprocess(e) {
			return e;
		}
		postprocess(e) {
			return e;
		}
		processAllTokens(e) {
			return e;
		}
		emStrongMask(e) {
			return e;
		}
		provideLexer() {
			return this.block ? W$1.lex : W$1.lexInline;
		}
		provideParser() {
			return this.block ? q$1.parse : q$1.parseInline;
		}
	}, Y$1 = class {
		defaults = e$3();
		options = this.setOptions;
		parse = this.parseMarkdown(!0);
		parseInline = this.parseMarkdown(!1);
		Parser = q$1;
		Renderer = G$1;
		TextRenderer = K$1;
		Lexer = W$1;
		Tokenizer = U$1;
		Hooks = J$1;
		constructor(...e) {
			this.use(...e);
		}
		walkTokens(e, t) {
			let n = [];
			for (let r of e) switch (n = n.concat(t.call(this, r)), r.type) {
				case "table": {
					let e = r;
					for (let r of e.header) n = n.concat(this.walkTokens(r.tokens, t));
					for (let r of e.rows) for (let e of r) n = n.concat(this.walkTokens(e.tokens, t));
					break;
				}
				case "list": {
					let e = r;
					n = n.concat(this.walkTokens(e.items, t));
					break;
				}
				default: {
					let e = r;
					this.defaults.extensions?.childTokens?.[e.type] ? this.defaults.extensions.childTokens[e.type].forEach((r) => {
						let i = e[r].flat(Infinity);
						n = n.concat(this.walkTokens(i, t));
					}) : e.tokens && (n = n.concat(this.walkTokens(e.tokens, t)));
				}
			}
			return n;
		}
		use(...e) {
			let t = this.defaults.extensions || {
				renderers: {},
				childTokens: {}
			};
			return e.forEach((e) => {
				let n = { ...e };
				if (n.async = this.defaults.async || n.async || !1, e.extensions && (e.extensions.forEach((e) => {
					if (!e.name) throw Error("extension name required");
					if ("renderer" in e) {
						let n = t.renderers[e.name];
						n ? t.renderers[e.name] = function(...t) {
							let r = e.renderer.apply(this, t);
							return r === !1 && (r = n.apply(this, t)), r;
						} : t.renderers[e.name] = e.renderer;
					}
					if ("tokenizer" in e) {
						if (!e.level || e.level !== "block" && e.level !== "inline") throw Error("extension level must be 'block' or 'inline'");
						let n = t[e.level];
						n ? n.unshift(e.tokenizer) : t[e.level] = [e.tokenizer], e.start && (e.level === "block" ? t.startBlock ? t.startBlock.push(e.start) : t.startBlock = [e.start] : e.level === "inline" && (t.startInline ? t.startInline.push(e.start) : t.startInline = [e.start]));
					}
					"childTokens" in e && e.childTokens && (t.childTokens[e.name] = e.childTokens);
				}), n.extensions = t), e.renderer) {
					let t = this.defaults.renderer || new G$1(this.defaults);
					for (let n in e.renderer) {
						if (!(n in t)) throw Error(`renderer '${n}' does not exist`);
						if (["options", "parser"].includes(n)) continue;
						let r = n, i = e.renderer[r], a = t[r];
						t[r] = (...e) => {
							let n = i.apply(t, e);
							return n === !1 && (n = a.apply(t, e)), n || "";
						};
					}
					n.renderer = t;
				}
				if (e.tokenizer) {
					let t = this.defaults.tokenizer || new U$1(this.defaults);
					for (let n in e.tokenizer) {
						if (!(n in t)) throw Error(`tokenizer '${n}' does not exist`);
						if ([
							"options",
							"rules",
							"lexer"
						].includes(n)) continue;
						let r = n, i = e.tokenizer[r], a = t[r];
						t[r] = (...e) => {
							let n = i.apply(t, e);
							return n === !1 && (n = a.apply(t, e)), n;
						};
					}
					n.tokenizer = t;
				}
				if (e.hooks) {
					let t = this.defaults.hooks || new J$1();
					for (let n in e.hooks) {
						if (!(n in t)) throw Error(`hook '${n}' does not exist`);
						if (["options", "block"].includes(n)) continue;
						let r = n, i = e.hooks[r], a = t[r];
						J$1.passThroughHooks.has(n) ? t[r] = (e) => {
							if (this.defaults.async && J$1.passThroughHooksRespectAsync.has(n)) return (async () => {
								let n = await i.call(t, e);
								return a.call(t, n);
							})();
							let r = i.call(t, e);
							return a.call(t, r);
						} : t[r] = (...e) => {
							if (this.defaults.async) return (async () => {
								let n = await i.apply(t, e);
								return n === !1 && (n = await a.apply(t, e)), n;
							})();
							let n = i.apply(t, e);
							return n === !1 && (n = a.apply(t, e)), n;
						};
					}
					n.hooks = t;
				}
				if (e.walkTokens) {
					let t = this.defaults.walkTokens, r = e.walkTokens;
					n.walkTokens = function(e) {
						let n = [];
						return n.push(r.call(this, e)), t && (n = n.concat(t.call(this, e))), n;
					};
				}
				this.defaults = {
					...this.defaults,
					...n
				};
			}), this;
		}
		setOptions(e) {
			return this.defaults = {
				...this.defaults,
				...e
			}, this;
		}
		lexer(e, t) {
			return W$1.lex(e, t ?? this.defaults);
		}
		parser(e, t) {
			return q$1.parse(e, t ?? this.defaults);
		}
		parseMarkdown(e) {
			return (t, n) => {
				let r = { ...n }, i = {
					...this.defaults,
					...r
				}, a = this.onError(!!i.silent, !!i.async);
				if (this.defaults.async === !0 && r.async === !1) return a(/* @__PURE__ */ Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
				if (typeof t > "u" || t === null) return a(/* @__PURE__ */ Error("marked(): input parameter is undefined or null"));
				if (typeof t != "string") return a(/* @__PURE__ */ Error("marked(): input parameter is of type " + Object.prototype.toString.call(t) + ", string expected"));
				if (i.hooks && (i.hooks.options = i, i.hooks.block = e), i.async) return (async () => {
					let n = i.hooks ? await i.hooks.preprocess(t) : t, r = await (i.hooks ? await i.hooks.provideLexer() : e ? W$1.lex : W$1.lexInline)(n, i), a = i.hooks ? await i.hooks.processAllTokens(r) : r;
					i.walkTokens && await Promise.all(this.walkTokens(a, i.walkTokens));
					let o = await (i.hooks ? await i.hooks.provideParser() : e ? q$1.parse : q$1.parseInline)(a, i);
					return i.hooks ? await i.hooks.postprocess(o) : o;
				})().catch(a);
				try {
					i.hooks && (t = i.hooks.preprocess(t));
					let n = (i.hooks ? i.hooks.provideLexer() : e ? W$1.lex : W$1.lexInline)(t, i);
					i.hooks && (n = i.hooks.processAllTokens(n)), i.walkTokens && this.walkTokens(n, i.walkTokens);
					let r = (i.hooks ? i.hooks.provideParser() : e ? q$1.parse : q$1.parseInline)(n, i);
					return i.hooks && (r = i.hooks.postprocess(r)), r;
				} catch (e) {
					return a(e);
				}
			};
		}
		onError(e, t) {
			return (n) => {
				if (n.message += "\nPlease report this to https://github.com/markedjs/marked.", e) {
					let e = "<p>An error occurred:</p><pre>" + R$1(n.message + "", !0) + "</pre>";
					return t ? Promise.resolve(e) : e;
				}
				if (t) return Promise.reject(n);
				throw n;
			};
		}
	}, X$1 = new Y$1();
	function Z$1(e, t) {
		return X$1.parse(e, t);
	}
	Z$1.options = Z$1.setOptions = function(e) {
		return X$1.setOptions(e), Z$1.defaults = X$1.defaults, n$2(Z$1.defaults), Z$1;
	}, Z$1.getDefaults = e$3, Z$1.defaults = t$2, Z$1.use = function(...e) {
		return X$1.use(...e), Z$1.defaults = X$1.defaults, n$2(Z$1.defaults), Z$1;
	}, Z$1.walkTokens = function(e, t) {
		return X$1.walkTokens(e, t);
	}, Z$1.parseInline = X$1.parseInline, Z$1.Parser = q$1, Z$1.parser = q$1.parse, Z$1.Renderer = G$1, Z$1.TextRenderer = K$1, Z$1.Lexer = W$1, Z$1.lexer = W$1.lex, Z$1.Tokenizer = U$1, Z$1.Hooks = J$1, Z$1.parse = Z$1, Z$1.options, Z$1.setOptions, Z$1.use, Z$1.walkTokens, Z$1.parseInline, q$1.parse, W$1.lex;
	var Ne = /<(\/?)(?:pre|code|kbd|script|math)[^>]*>/i, Pe = (e = "", t = "1") => {
		var n, r, i, a, o, s = 0;
		if (t = typeof t == "number" ? t.toString() : t.replace(/\s/g, ""), t === "0") return e;
		if (t === "1") n = 1, r = 1, i = 1, a = 1;
		else if (t === "2") n = 1, r = 1, i = 2, a = 1;
		else if (t === "3") n = 1, r = 1, i = 3, a = 1;
		else if (t === "-1") o = 1;
		else for (let e = 0; e < t.length; e++) {
			let o = t[e];
			o === "q" && (n = 1), o === "b" && (r = 1), o === "B" && (r = 2), o === "d" && (i = 1), o === "D" && (i = 2), o === "i" && (i = 3), o === "e" && (a = 1), o === "w" && (s = 1);
		}
		var c = We(e), l = "", u = 0, d = "";
		for (let e = 0; e < c.length; e++) {
			let t = c[e];
			if (t[0] === "tag") {
				l += t[1];
				let e = Ne.exec(t[1]);
				e && (u = e[1] === "/" ? 0 : 1);
			} else {
				let e = t[1], c = e.substring(e.length - 1, e.length);
				u || (e = Ue(e), s && (e = e.replace(/$quot;/g, "\"")), i && (i === 1 && (e = Re(e)), i === 2 && (e = ze(e)), i === 3 && (e = Be(e))), a && (e = Ve(e)), r && (e = Ie(e), r === 2 && (e = Le(e))), n && (e = e === "'" ? /\S/.test(d) ? "&#8217;" : "&#8216;" : e === "\"" ? /\S/.test(d) ? "&#8221;" : "&#8220;" : Fe(e)), o && (e = He(e))), d = c, l += e;
			}
		}
		return l;
	}, Fe = (e) => {
		var t = "[!\"#$%'()*+,-./:;<=>?@[\\]^_`{|}~]";
		e = e.replace(RegExp(`^'(?=${t}\\B)`), "&#8217;"), e = e.replace(RegExp(`^"(?=${t}\\B)`), "&#8221;"), e = e.replace(/"'(?=\w)/, "&#8220;&#8216;"), e = e.replace(/'"(?=\w)/, "&#8216;&#8220;"), e = e.replace(/'(?=\d\d)/, "&#8217;");
		var n = "[^\\ \\t\\r\\n\\[\\{\\(\\-]", r = "[\\ \\t\\r\\n\\[\\{\\(\\-]", i = "&#8211;|&#8212;";
		return e = e.replace(RegExp(`(\\s|&nbsp;|--|&[mn]dash;|${i}|&#x201[34])'(?=\\w)`, "g"), "$1&#8216;"), e = e.replace(RegExp(`(${n})'`, "g"), "$1&#8217;"), e = e.replace(RegExp(`(${r}?)'(?=\\s|s\\b)`, "g"), "$1&#8217;"), e = e.replace(/'/g, "&#8216;"), e = e.replace(RegExp(`(\\s|&nbsp;|--|&[mn]dash;|${i}|&#x201[34])"(?=\\w)`, "g"), "$1&#8220;"), e = e.replace(RegExp(`(${n})"`, "g"), "$1&#8221;"), e = e.replace(RegExp(`(${r}?)"(?=\\s)`, "g"), "$1&#8221;"), e = e.replace(/"/g, "&#8220;"), e;
	}, Ie = (e) => (e = e.replace(/``/g, "&#8220;"), e = e.replace(/''/g, "&#8221;"), e), Le = (e) => (e = e.replace(/`/g, "&#8216;"), e = e.replace(/'/g, "&#8217;"), e), Re = (e) => (e = e.replace(/--/g, "&#8212;"), e), ze = (e) => (e = e.replace(/---/g, "&#8212;"), e = e.replace(/--/g, "&#8211;"), e), Be = (e) => (e = e.replace(/---/g, "&#8211;"), e = e.replace(/--/g, "&#8212;"), e), Ve = (e) => (e = e.replace(/\.\.\./g, "&#8230;"), e = e.replace(/\. \. \./g, "&#8230;"), e), He = (e) => (e = e.replace(/&#8211;/g, "-"), e = e.replace(/&#8212;/g, "--"), e = e.replace(/&#8216;/g, "'"), e = e.replace(/&#8217;/g, "'"), e = e.replace(/&#8220;/g, "\""), e = e.replace(/&#8221;/g, "\""), e = e.replace(/&#8230;/g, "..."), e), Ue = (e) => (e = e.replace(/\\\\/g, "&#92;"), e = e.replace(/\\"/g, "&#34;"), e = e.replace(/\\'/g, "&#39;"), e = e.replace(/\\\./g, "&#46;"), e = e.replace(/\\-/g, "&#45;"), e = e.replace(/\\`/g, "&#96;"), e), We = (e) => {
		for (var t = 0, n = e.length, r = [], i = /<!--[\s\S]*?-->|<\?.*?\?>|<[^>]*>/g, a = null; a = i.exec(e);) {
			if (t < a.index) {
				let n = ["text", e.substring(t, a.index)];
				r.push(n);
			}
			let n = ["tag", a.toString()];
			r.push(n), t = i.lastIndex;
		}
		if (t < n) {
			let i = ["text", e.substring(t, n)];
			r.push(i);
		}
		return r;
	};
	function Ge({ config: e = 2 } = {}) {
		return {
			tokenizer: { inlineText(e) {
				let t = this.rules.inline.text.exec(e);
				if (t) return {
					type: "text",
					raw: t[0],
					text: t[0],
					escaped: !0
				};
			} },
			hooks: { postprocess(t) {
				return Pe(t, e);
			} }
		};
	}
	var Ke = "\r?\n---\r?\n", qe = null, Je = "^s*notes?:", Ye = "\\.element\\s*?(.+?)$", Xe = "\\.slide:\\s*?(\\S.+?)$", Q$1 = "__SCRIPT_END__", $$1 = /\[\s*((\d*):)?\s*([\s\d,|-]*)\]/, Ze = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\"": "&quot;",
		"'": "&#39;"
	}, Qe = () => {
		let e, t = null;
		function n(e) {
			let t = (e.querySelector("[data-template]") || e.querySelector("script") || e).textContent;
			t = t.replace(new RegExp(Q$1, "g"), "<\/script>");
			let n = t.match(/^\n?(\s*)/)[1].length, r = t.match(/^\n?(\t*)/)[1].length;
			return r > 0 ? t = t.replace(RegExp("\\n?\\t{" + r + "}(.*)", "g"), function(e, t) {
				return "\n" + t;
			}) : n > 1 && (t = t.replace(RegExp("\\n? {" + n + "}(.*)", "g"), function(e, t) {
				return "\n" + t;
			})), t;
		}
		function r(e) {
			let t = e.attributes, n = [];
			for (let e = 0, r = t.length; e < r; e++) {
				let r = t[e].name, i = t[e].value;
				/data\-(markdown|separator|vertical|notes)/gi.test(r) || (i ? n.push(r + "=\"" + i + "\"") : n.push(r));
			}
			return n.join(" ");
		}
		function i(t) {
			let n = e?.getConfig?.().markdown;
			return t ||= {}, t.separator = t.separator || n?.separator || Ke, t.verticalSeparator = t.verticalSeparator || n?.verticalSeparator || qe, t.notesSeparator = t.notesSeparator || n?.notesSeparator || Je, t.attributes = t.attributes || "", t;
		}
		function a(e, n) {
			n = i(n);
			let r = e.split(new RegExp(n.notesSeparator, "mgi"));
			return r.length === 2 && t && (e = r[0] + "<aside class=\"notes\">" + t.parse(r[1].trim()) + "</aside>"), e = e.replace(/<\/script>/g, Q$1), "<script type=\"text/template\">" + e + "<\/script>";
		}
		function o(e, t) {
			t = i(t);
			let n = RegExp(t.separator + (t.verticalSeparator ? "|" + t.verticalSeparator : ""), "mg"), r = new RegExp(t.separator), o, s = 0, c, l = !0, u, d = [];
			for (; o = n.exec(e);) c = r.test(o[0]), !c && l && d.push([]), u = e.substring(s, o.index), c && l ? d.push(u) : d[d.length - 1].push(u), s = n.lastIndex, l = c;
			(l ? d : d[d.length - 1]).push(e.substring(s));
			let f = "";
			for (let e = 0, n = d.length; e < n; e++) d[e] instanceof Array ? (f += "<section " + t.attributes + ">", d[e].forEach(function(e) {
				f += "<section data-markdown>" + a(e, t) + "</section>";
			}), f += "</section>") : f += "<section " + t.attributes + " data-markdown>" + a(d[e], t) + "</section>";
			return f;
		}
		function s(e) {
			return new Promise(function(t) {
				let i = [];
				[].slice.call(e.querySelectorAll("section[data-markdown]:not([data-markdown-parsed])")).forEach(function(e, t) {
					e.getAttribute("data-markdown").length ? i.push(c(e).then(function(t, n) {
						e.outerHTML = o(t.responseText, {
							separator: e.getAttribute("data-separator"),
							verticalSeparator: e.getAttribute("data-separator-vertical"),
							notesSeparator: e.getAttribute("data-separator-notes"),
							attributes: r(e)
						});
					}, function(t, n) {
						e.outerHTML = "<section data-state=\"alert\">ERROR: The attempt to fetch " + n + " failed with HTTP status " + t.status + ".Check your browser's JavaScript console for more details.<p>Remember that you need to serve the presentation HTML from a HTTP server.</p></section>";
					})) : e.outerHTML = o(n(e), {
						separator: e.getAttribute("data-separator"),
						verticalSeparator: e.getAttribute("data-separator-vertical"),
						notesSeparator: e.getAttribute("data-separator-notes"),
						attributes: r(e)
					});
				}), Promise.all(i).then(t);
			});
		}
		function c(e) {
			return new Promise(function(t, n) {
				let r = new XMLHttpRequest(), i = e.getAttribute("data-markdown"), a = e.getAttribute("data-charset");
				a !== null && a !== "" && r.overrideMimeType("text/html; charset=" + a), r.onreadystatechange = function(e, r) {
					r.readyState === 4 && (r.status >= 200 && r.status < 300 || r.status === 0 ? t(r, i) : n(r, i));
				}.bind(this, e, r), r.open("GET", i, !0);
				try {
					r.send();
				} catch (e) {
					console.warn("Failed to get the Markdown file " + i + ". Make sure that the presentation and the file are served by a HTTP server and the file can be found there. " + e), t(r, i);
				}
			});
		}
		function l(e, t, n) {
			let r = new RegExp(n, "mg"), i = /* @__PURE__ */ RegExp("([^\"= ]+?)=\"([^\"]+?)\"|(data-[^\"= ]+?)(?=[\" ])", "mg"), a = e.nodeValue, o, s;
			if (o = r.exec(a)) {
				let n = o[1];
				for (a = a.substring(0, o.index) + a.substring(r.lastIndex), e.nodeValue = a; s = i.exec(n);) s[2] ? t.setAttribute(s[1], s[2]) : t.setAttribute(s[3], "");
				return !0;
			}
			return !1;
		}
		function u(e, t, n, r, i) {
			if (t !== null && t.childNodes !== void 0 && t.childNodes.length > 0) {
				let n = t;
				for (let a = 0; a < t.childNodes.length; a++) {
					let o = t.childNodes[a];
					if (a > 0) {
						let e = a - 1;
						for (; e >= 0;) {
							let r = t.childNodes[e];
							if (typeof r.setAttribute == "function" && r.tagName !== "BR") {
								n = r;
								break;
							}
							--e;
						}
					}
					let s = e;
					o.nodeName === "section" && (s = o, n = o), (typeof o.setAttribute == "function" || o.nodeType === Node.COMMENT_NODE) && u(s, o, n, r, i);
				}
			}
			if (t.nodeType === Node.COMMENT_NODE) {
				let a = n;
				a && (a.tagName === "UL" || a.tagName === "OL") && (a = a.lastElementChild || a), l(t, a, r) === !1 && l(t, e, i);
			}
		}
		function d() {
			let r = e.getRevealElement().querySelectorAll("[data-markdown]:not([data-markdown-parsed])");
			return [].slice.call(r).forEach(function(e) {
				e.setAttribute("data-markdown-parsed", !0);
				let r = e.querySelector("aside.notes"), i = n(e);
				e.innerHTML = t ? t.parse(i) : i, u(e, e, null, e.getAttribute("data-element-attributes") || e.parentNode.getAttribute("data-element-attributes") || Ye, e.getAttribute("data-attributes") || e.parentNode.getAttribute("data-attributes") || Xe), r && e.appendChild(r);
			}), Promise.resolve();
		}
		function f(e) {
			return e.replace(/([&<>'"])/g, (e) => Ze[e]);
		}
		return {
			id: "markdown",
			init: function(n) {
				e = n;
				let { renderer: r, animateLists: i, smartypants: a, ...o } = e.getConfig().markdown || {}, c = r || { code({ text: e, lang: t }) {
					let n = t || "", r = "", i = "";
					if ($$1.test(n)) {
						let e = n.match($$1)[2];
						e && (r = `data-ln-start-from="${e.trim()}"`), i = n.match($$1)[3].trim(), i = `data-line-numbers="${i}"`, n = n.replace($$1, "").trim();
					}
					return e = f(e), `<pre><code ${i} ${r} class="${n}">${e}</code></pre>`;
				} };
				return i === !0 && !r && (c.listitem = function(e) {
					return `<li class="fragment">${e.tokens ? this.parser.parseInline(e.tokens) : e.text || ""}</li>`;
				}), t = new Y$1(), t.use({
					renderer: c,
					...o
				}), a && t.use(Ge()), s(e.getRevealElement()).then(d);
			},
			processSlides: s,
			convertSlides: d,
			slidify: o,
			get marked() {
				return t;
			},
			get markdownOptions() {
				return e && e.getConfig().markdown || {};
			}
		};
	};
	//#endregion
	//#region node_modules/reveal.js/dist/plugin/notes.mjs
	var e$2 = "<!--\n	NOTE: You need to build the notes plugin after making changes to this file.\n-->\n<html lang=\"en\">\n	<head>\n		<meta charset=\"utf-8\">\n\n		<title>reveal.js - Speaker View</title>\n\n		<style>\n			body {\n				font-family: Helvetica;\n				font-size: 18px;\n			}\n\n			#current-slide,\n			#upcoming-slide,\n			#speaker-controls {\n				padding: 6px;\n				box-sizing: border-box;\n				-moz-box-sizing: border-box;\n			}\n\n			#current-slide iframe,\n			#upcoming-slide iframe {\n				width: 100%;\n				height: 100%;\n				border: 1px solid #ddd;\n			}\n\n			#current-slide .label,\n			#upcoming-slide .label {\n				position: absolute;\n				top: 10px;\n				left: 10px;\n				z-index: 2;\n			}\n\n			#connection-status {\n				position: absolute;\n				top: 0;\n				left: 0;\n				width: 100%;\n				height: 100%;\n				z-index: 20;\n				padding: 30% 20% 20% 20%;\n				font-size: 18px;\n				color: #222;\n				background: #fff;\n				text-align: center;\n				box-sizing: border-box;\n				line-height: 1.4;\n			}\n\n			.overlay-element {\n				height: 34px;\n				line-height: 34px;\n				padding: 0 10px;\n				text-shadow: none;\n				background: rgba( 220, 220, 220, 0.8 );\n				color: #222;\n				font-size: 14px;\n			}\n\n			.overlay-element.interactive:hover {\n				background: rgba( 220, 220, 220, 1 );\n			}\n\n			#current-slide {\n				position: absolute;\n				width: 60%;\n				height: 100%;\n				top: 0;\n				left: 0;\n				padding-right: 0;\n			}\n\n			#upcoming-slide {\n				position: absolute;\n				width: 40%;\n				height: 40%;\n				right: 0;\n				top: 0;\n			}\n\n			/* Speaker controls */\n			#speaker-controls {\n				position: absolute;\n				top: 40%;\n				right: 0;\n				width: 40%;\n				height: 60%;\n				overflow: auto;\n				font-size: 18px;\n			}\n\n				.speaker-controls-time.hidden,\n				.speaker-controls-notes.hidden {\n					display: none;\n				}\n\n				.speaker-controls-time .label,\n				.speaker-controls-pace .label,\n				.speaker-controls-notes .label {\n					text-transform: uppercase;\n					font-weight: normal;\n					font-size: 0.66em;\n					color: #666;\n					margin: 0;\n				}\n\n				.speaker-controls-time, .speaker-controls-pace {\n					border-bottom: 1px solid rgba( 200, 200, 200, 0.5 );\n					margin-bottom: 10px;\n					padding: 10px 16px;\n					padding-bottom: 20px;\n					cursor: pointer;\n				}\n\n				.speaker-controls-time .reset-button {\n					opacity: 0;\n					float: right;\n					color: #666;\n					text-decoration: none;\n				}\n				.speaker-controls-time:hover .reset-button {\n					opacity: 1;\n				}\n\n				.speaker-controls-time .timer,\n				.speaker-controls-time .clock {\n					width: 50%;\n				}\n\n				.speaker-controls-time .timer,\n				.speaker-controls-time .clock,\n				.speaker-controls-time .pacing .hours-value,\n				.speaker-controls-time .pacing .minutes-value,\n				.speaker-controls-time .pacing .seconds-value {\n					font-size: 1.9em;\n				}\n\n				.speaker-controls-time .timer {\n					float: left;\n				}\n\n				.speaker-controls-time .clock {\n					float: right;\n					text-align: right;\n				}\n\n				.speaker-controls-time span.mute {\n					opacity: 0.3;\n				}\n\n				.speaker-controls-time .pacing-title {\n					margin-top: 5px;\n				}\n\n				.speaker-controls-time .pacing.ahead {\n					color: blue;\n				}\n\n				.speaker-controls-time .pacing.on-track {\n					color: green;\n				}\n\n				.speaker-controls-time .pacing.behind {\n					color: red;\n				}\n\n				.speaker-controls-notes {\n					padding: 10px 16px;\n				}\n\n				.speaker-controls-notes .value {\n					margin-top: 5px;\n					line-height: 1.4;\n					font-size: 1.2em;\n				}\n\n			/* Layout selector\xA0*/\n			#speaker-layout {\n				position: absolute;\n				top: 10px;\n				right: 10px;\n				color: #222;\n				z-index: 10;\n			}\n				#speaker-layout select {\n					position: absolute;\n					width: 100%;\n					height: 100%;\n					top: 0;\n					left: 0;\n					border: 0;\n					box-shadow: 0;\n					cursor: pointer;\n					opacity: 0;\n\n					font-size: 1em;\n					background-color: transparent;\n\n					-moz-appearance: none;\n					-webkit-appearance: none;\n					-webkit-tap-highlight-color: rgba(0, 0, 0, 0);\n				}\n\n				#speaker-layout select:focus {\n					outline: none;\n					box-shadow: none;\n				}\n\n			.clear {\n				clear: both;\n			}\n\n			/* Speaker layout: Wide */\n			body[data-speaker-layout=\"wide\"] #current-slide,\n			body[data-speaker-layout=\"wide\"] #upcoming-slide {\n				width: 50%;\n				height: 45%;\n				padding: 6px;\n			}\n\n			body[data-speaker-layout=\"wide\"] #current-slide {\n				top: 0;\n				left: 0;\n			}\n\n			body[data-speaker-layout=\"wide\"] #upcoming-slide {\n				top: 0;\n				left: 50%;\n			}\n\n			body[data-speaker-layout=\"wide\"] #speaker-controls {\n				top: 45%;\n				left: 0;\n				width: 100%;\n				height: 50%;\n				font-size: 1.25em;\n			}\n\n			/* Speaker layout: Tall */\n			body[data-speaker-layout=\"tall\"] #current-slide,\n			body[data-speaker-layout=\"tall\"] #upcoming-slide {\n				width: 45%;\n				height: 50%;\n				padding: 6px;\n			}\n\n			body[data-speaker-layout=\"tall\"] #current-slide {\n				top: 0;\n				left: 0;\n			}\n\n			body[data-speaker-layout=\"tall\"] #upcoming-slide {\n				top: 50%;\n				left: 0;\n			}\n\n			body[data-speaker-layout=\"tall\"] #speaker-controls {\n				padding-top: 40px;\n				top: 0;\n				left: 45%;\n				width: 55%;\n				height: 100%;\n				font-size: 1.25em;\n			}\n\n			/* Speaker layout: Notes only */\n			body[data-speaker-layout=\"notes-only\"] #current-slide,\n			body[data-speaker-layout=\"notes-only\"] #upcoming-slide {\n				display: none;\n			}\n\n			body[data-speaker-layout=\"notes-only\"] #speaker-controls {\n				padding-top: 40px;\n				top: 0;\n				left: 0;\n				width: 100%;\n				height: 100%;\n				font-size: 1.25em;\n			}\n\n			@media screen and (max-width: 1080px) {\n				body[data-speaker-layout=\"default\"] #speaker-controls {\n					font-size: 16px;\n				}\n			}\n\n			@media screen and (max-width: 900px) {\n				body[data-speaker-layout=\"default\"] #speaker-controls {\n					font-size: 14px;\n				}\n			}\n\n			@media screen and (max-width: 800px) {\n				body[data-speaker-layout=\"default\"] #speaker-controls {\n					font-size: 12px;\n				}\n			}\n\n		</style>\n	</head>\n\n	<body>\n\n		<div id=\"connection-status\">Loading speaker view...</div>\n\n		<div id=\"current-slide\"></div>\n		<div id=\"upcoming-slide\"><span class=\"overlay-element label\">Upcoming</span></div>\n		<div id=\"speaker-controls\">\n			<div class=\"speaker-controls-time\">\n				<h4 class=\"label\">Time <span class=\"reset-button\">Click to Reset</span></h4>\n				<div class=\"clock\">\n					<span class=\"clock-value\">0:00 AM</span>\n				</div>\n				<div class=\"timer\">\n					<span class=\"hours-value\">00</span><span class=\"minutes-value\">:00</span><span class=\"seconds-value\">:00</span>\n				</div>\n				<div class=\"clear\"></div>\n\n				<h4 class=\"label pacing-title\" style=\"display: none\">Pacing – Time to finish current slide</h4>\n				<div class=\"pacing\" style=\"display: none\">\n					<span class=\"hours-value\">00</span><span class=\"minutes-value\">:00</span><span class=\"seconds-value\">:00</span>\n				</div>\n			</div>\n\n			<div class=\"speaker-controls-notes hidden\">\n				<h4 class=\"label\">Notes</h4>\n				<div class=\"value\"></div>\n			</div>\n		</div>\n		<div id=\"speaker-layout\" class=\"overlay-element interactive\">\n			<span class=\"speaker-layout-label\"></span>\n			<select class=\"speaker-layout-dropdown\"></select>\n		</div>\n\n		<script>\n\n			(function() {\n\n				var notes,\n					notesValue,\n					currentState,\n					currentSlide,\n					upcomingSlide,\n					layoutLabel,\n					layoutDropdown,\n					pendingCalls = {},\n					lastRevealApiCallId = 0,\n					connected = false\n\n				var connectionStatus = document.querySelector( '#connection-status' );\n\n				var SPEAKER_LAYOUTS = {\n					'default': 'Default',\n					'wide': 'Wide',\n					'tall': 'Tall',\n					'notes-only': 'Notes only'\n				};\n\n				setupLayout();\n\n				let openerOrigin;\n\n				try {\n					openerOrigin = window.opener.location.origin;\n				}\n				catch ( error ) { console.warn( error ) }\n\n				// In order to prevent XSS, the speaker view will only run if its\n				// opener has the same origin as itself\n				if( window.location.origin !== openerOrigin ) {\n					connectionStatus.innerHTML = 'Cross origin error.<br>The speaker window can only be opened from the same origin.';\n					return;\n				}\n\n				var connectionTimeout = setTimeout( function() {\n					connectionStatus.innerHTML = 'Error connecting to main window.<br>Please try closing and reopening the speaker view.';\n				}, 5000 );\n\n				window.addEventListener( 'message', function( event ) {\n\n					// Validate the origin of all messages to avoid parsing messages\n					// that aren't meant for us. Ignore when running off file:// so\n					// that the speaker view continues to work without a web server.\n					if( window.location.origin !== event.origin && window.location.origin !== 'file://' ) {\n						return\n					}\n\n					clearTimeout( connectionTimeout );\n					connectionStatus.style.display = 'none';\n\n					var data = JSON.parse( event.data );\n\n					// The overview mode is only useful to the reveal.js instance\n					// where navigation occurs so we don't sync it\n					if( data.state ) delete data.state.overview;\n\n					// Messages sent by the notes plugin inside of the main window\n					if( data && data.namespace === 'reveal-notes' ) {\n						if( data.type === 'connect' ) {\n							handleConnectMessage( data );\n						}\n						else if( data.type === 'state' ) {\n							handleStateMessage( data );\n						}\n						else if( data.type === 'return' ) {\n							pendingCalls[data.callId](data.result);\n							delete pendingCalls[data.callId];\n						}\n					}\n					// Messages sent by the reveal.js inside of the current slide preview\n					else if( data && data.namespace === 'reveal' ) {\n						const supportedEvents = [\n							'slidechanged',\n							'fragmentshown',\n							'fragmenthidden',\n							'paused',\n							'resumed',\n							'previewiframe',\n							'previewimage',\n							'previewvideo',\n							'closeoverlay'\n						];\n\n						if( /ready/.test( data.eventName ) ) {\n							// Send a message back to notify that the handshake is complete\n							window.opener.postMessage( JSON.stringify({ namespace: 'reveal-notes', type: 'connected'} ), '*' );\n						}\n						else if( supportedEvents.includes( data.eventName ) && currentState !== JSON.stringify( data.state ) ) {\n							dispatchStateToMainWindow( data.state );\n						}\n					}\n\n				} );\n\n				/**\n				 * Updates the presentation in the main window to match the state\n				 * of the presentation in the notes window.\n				 */\n				const dispatchStateToMainWindow = debounce(( state ) => {\n					window.opener.postMessage( JSON.stringify({ method: 'setState', args: [ state ]} ), '*' );\n				}, 500);\n\n				/**\n				 * Asynchronously calls the Reveal.js API of the main frame.\n				 */\n				function callRevealApi( methodName, methodArguments, callback ) {\n\n					var callId = ++lastRevealApiCallId;\n					pendingCalls[callId] = callback;\n					window.opener.postMessage( JSON.stringify( {\n						namespace: 'reveal-notes',\n						type: 'call',\n						callId: callId,\n						methodName: methodName,\n						arguments: methodArguments\n					} ), '*' );\n\n				}\n\n				/**\n				 * Called when the main window is trying to establish a\n				 * connection.\n				 */\n				function handleConnectMessage( data ) {\n\n					if( connected === false ) {\n						connected = true;\n\n						setupIframes( data );\n						setupKeyboard();\n						setupNotes();\n						setupTimer();\n						setupHeartbeat();\n					}\n\n				}\n\n				/**\n				 * Called when the main window sends an updated state.\n				 */\n				function handleStateMessage( data ) {\n\n					// Store the most recently set state to avoid circular loops\n					// applying the same state\n					currentState = JSON.stringify( data.state );\n\n					// No need for updating the notes in case of fragment changes\n					if ( data.notes ) {\n						notes.classList.remove( 'hidden' );\n						notesValue.style.whiteSpace = data.whitespace;\n						if( data.markdown ) {\n							notesValue.innerHTML = marked.parse( data.notes );\n						}\n						else {\n							notesValue.innerHTML = data.notes;\n						}\n					}\n					else {\n						notes.classList.add( 'hidden' );\n					}\n\n					// Don't show lightboxes in the upcoming slide\n					const { previewVideo, previewImage, previewIframe, ...upcomingState } = data.state;\n\n					// Update the note slides\n					currentSlide.contentWindow.postMessage( JSON.stringify({ method: 'setState', args: [ data.state ] }), '*' );\n					upcomingSlide.contentWindow.postMessage( JSON.stringify({ method: 'setState', args: [ upcomingState ] }), '*' );\n					upcomingSlide.contentWindow.postMessage( JSON.stringify({ method: 'next' }), '*' );\n\n				}\n\n				// Limit to max one state update per X ms\n				handleStateMessage = debounce( handleStateMessage, 200 );\n\n				/**\n				 * Forward keyboard events to the current slide window.\n				 * This enables keyboard events to work even if focus\n				 * isn't set on the current slide iframe.\n				 *\n				 * Block F5 default handling, it reloads and disconnects\n				 * the speaker notes window.\n				 */\n				function setupKeyboard() {\n\n					document.addEventListener( 'keydown', function( event ) {\n						if( event.keyCode === 116 || ( event.metaKey && event.keyCode === 82 ) ) {\n							event.preventDefault();\n							return false;\n						}\n						currentSlide.contentWindow.postMessage( JSON.stringify({ method: 'triggerKey', args: [ event.keyCode ] }), '*' );\n					} );\n\n				}\n\n				/**\n				 * Creates the preview iframes.\n				 */\n				function setupIframes( data ) {\n\n					var params = [\n						'receiver',\n						'progress=false',\n						'history=false',\n						'transition=none',\n						'autoSlide=0',\n						'backgroundTransition=none'\n					].join( '&' );\n\n					var urlSeparator = /\\?/.test(data.url) ? '&' : '?';\n					var hash = '#/' + data.state.indexh + '/' + data.state.indexv;\n					var currentURL = data.url + urlSeparator + params + '&scrollActivationWidth=false&postMessageEvents=true' + hash;\n					var upcomingURL = data.url + urlSeparator + params + '&scrollActivationWidth=false&controls=false' + hash;\n\n					currentSlide = document.createElement( 'iframe' );\n					currentSlide.setAttribute( 'width', 1280 );\n					currentSlide.setAttribute( 'height', 1024 );\n					currentSlide.setAttribute( 'src', currentURL );\n					document.querySelector( '#current-slide' ).appendChild( currentSlide );\n\n					upcomingSlide = document.createElement( 'iframe' );\n					upcomingSlide.setAttribute( 'width', 640 );\n					upcomingSlide.setAttribute( 'height', 512 );\n					upcomingSlide.setAttribute( 'src', upcomingURL );\n					document.querySelector( '#upcoming-slide' ).appendChild( upcomingSlide );\n\n				}\n\n				/**\n				 * Setup the notes UI.\n				 */\n				function setupNotes() {\n\n					notes = document.querySelector( '.speaker-controls-notes' );\n					notesValue = document.querySelector( '.speaker-controls-notes .value' );\n\n				}\n\n				/**\n				 * We send out a heartbeat at all times to ensure we can\n				 * reconnect with the main presentation window after reloads.\n				 */\n				function setupHeartbeat() {\n\n					setInterval( () => {\n						window.opener.postMessage( JSON.stringify({ namespace: 'reveal-notes', type: 'heartbeat'} ), '*' );\n					}, 1000 );\n\n				}\n\n				function getTimings( callback ) {\n\n					callRevealApi( 'getSlidesAttributes', [], function ( slideAttributes ) {\n						callRevealApi( 'getConfig', [], function ( config ) {\n							var totalTime = config.totalTime;\n							var minTimePerSlide = config.minimumTimePerSlide || 0;\n							var defaultTiming = config.defaultTiming;\n							if ((defaultTiming == null) && (totalTime == null)) {\n								callback(null);\n								return;\n							}\n							// Setting totalTime overrides defaultTiming\n							if (totalTime) {\n								defaultTiming = 0;\n							}\n							var timings = [];\n							for ( var i in slideAttributes ) {\n								var slide = slideAttributes[ i ];\n								var timing = defaultTiming;\n								if( slide.hasOwnProperty( 'data-timing' )) {\n									var t = slide[ 'data-timing' ];\n									timing = parseInt(t);\n									if( isNaN(timing) ) {\n										console.warn(\"Could not parse timing '\" + t + \"' of slide \" + i + \"; using default of \" + defaultTiming);\n										timing = defaultTiming;\n									}\n								}\n								timings.push(timing);\n							}\n							if ( totalTime ) {\n								// After we've allocated time to individual slides, we summarize it and\n								// subtract it from the total time\n								var remainingTime = totalTime - timings.reduce( function(a, b) { return a + b; }, 0 );\n								// The remaining time is divided by the number of slides that have 0 seconds\n								// allocated at the moment, giving the average time-per-slide on the remaining slides\n								var remainingSlides = (timings.filter( function(x) { return x == 0 }) ).length\n								var timePerSlide = Math.round( remainingTime / remainingSlides, 0 )\n								// And now we replace every zero-value timing with that average\n								timings = timings.map( function(x) { return (x==0 ? timePerSlide : x) } );\n							}\n							var slidesUnderMinimum = timings.filter( function(x) { return (x < minTimePerSlide) } ).length\n							if ( slidesUnderMinimum ) {\n								message = \"The pacing time for \" + slidesUnderMinimum + \" slide(s) is under the configured minimum of \" + minTimePerSlide + \" seconds. Check the data-timing attribute on individual slides, or consider increasing the totalTime or minimumTimePerSlide configuration options (or removing some slides).\";\n								alert(message);\n							}\n							callback( timings );\n						} );\n					} );\n\n				}\n\n				/**\n				 * Return the number of seconds allocated for presenting\n				 * all slides up to and including this one.\n				 */\n				function getTimeAllocated( timings, callback ) {\n\n					callRevealApi( 'getSlidePastCount', [], function ( currentSlide ) {\n						var allocated = 0;\n						for (var i in timings.slice(0, currentSlide + 1)) {\n							allocated += timings[i];\n						}\n						callback( allocated );\n					} );\n\n				}\n\n				/**\n				 * Create the timer and clock and start updating them\n				 * at an interval.\n				 */\n				function setupTimer() {\n\n					var start = new Date(),\n					timeEl = document.querySelector( '.speaker-controls-time' ),\n					clockEl = timeEl.querySelector( '.clock-value' ),\n					hoursEl = timeEl.querySelector( '.hours-value' ),\n					minutesEl = timeEl.querySelector( '.minutes-value' ),\n					secondsEl = timeEl.querySelector( '.seconds-value' ),\n					pacingTitleEl = timeEl.querySelector( '.pacing-title' ),\n					pacingEl = timeEl.querySelector( '.pacing' ),\n					pacingHoursEl = pacingEl.querySelector( '.hours-value' ),\n					pacingMinutesEl = pacingEl.querySelector( '.minutes-value' ),\n					pacingSecondsEl = pacingEl.querySelector( '.seconds-value' );\n\n					var timings = null;\n					getTimings( function ( _timings ) {\n\n						timings = _timings;\n						if (_timings !== null) {\n							pacingTitleEl.style.removeProperty('display');\n							pacingEl.style.removeProperty('display');\n						}\n\n						// Update once directly\n						_updateTimer();\n\n						// Then update every second\n						setInterval( _updateTimer, 1000 );\n\n					} );\n\n\n					function _resetTimer() {\n\n						if (timings == null) {\n							start = new Date();\n							_updateTimer();\n						}\n						else {\n							// Reset timer to beginning of current slide\n							getTimeAllocated( timings, function ( slideEndTimingSeconds ) {\n								var slideEndTiming = slideEndTimingSeconds * 1000;\n								callRevealApi( 'getSlidePastCount', [], function ( currentSlide ) {\n									var currentSlideTiming = timings[currentSlide] * 1000;\n									var previousSlidesTiming = slideEndTiming - currentSlideTiming;\n									var now = new Date();\n									start = new Date(now.getTime() - previousSlidesTiming);\n									_updateTimer();\n								} );\n							} );\n						}\n\n					}\n\n					timeEl.addEventListener( 'click', function() {\n						_resetTimer();\n						return false;\n					} );\n\n					function _displayTime( hrEl, minEl, secEl, time) {\n\n						var sign = Math.sign(time) == -1 ? \"-\" : \"\";\n						time = Math.abs(Math.round(time / 1000));\n						var seconds = time % 60;\n						var minutes = Math.floor( time / 60 ) % 60 ;\n						var hours = Math.floor( time / ( 60 * 60 )) ;\n						hrEl.innerHTML = sign + zeroPadInteger( hours );\n						if (hours == 0) {\n							hrEl.classList.add( 'mute' );\n						}\n						else {\n							hrEl.classList.remove( 'mute' );\n						}\n						minEl.innerHTML = ':' + zeroPadInteger( minutes );\n						if (hours == 0 && minutes == 0) {\n							minEl.classList.add( 'mute' );\n						}\n						else {\n							minEl.classList.remove( 'mute' );\n						}\n						secEl.innerHTML = ':' + zeroPadInteger( seconds );\n					}\n\n					function _updateTimer() {\n\n						var diff, hours, minutes, seconds,\n						now = new Date();\n\n						diff = now.getTime() - start.getTime();\n\n						clockEl.innerHTML = now.toLocaleTimeString( 'en-US', { hour12: true, hour: '2-digit', minute:'2-digit' } );\n						_displayTime( hoursEl, minutesEl, secondsEl, diff );\n						if (timings !== null) {\n							_updatePacing(diff);\n						}\n\n					}\n\n					function _updatePacing(diff) {\n\n						getTimeAllocated( timings, function ( slideEndTimingSeconds ) {\n							var slideEndTiming = slideEndTimingSeconds * 1000;\n\n							callRevealApi( 'getSlidePastCount', [], function ( currentSlide ) {\n								var currentSlideTiming = timings[currentSlide] * 1000;\n								var timeLeftCurrentSlide = slideEndTiming - diff;\n								if (timeLeftCurrentSlide < 0) {\n									pacingEl.className = 'pacing behind';\n								}\n								else if (timeLeftCurrentSlide < currentSlideTiming) {\n									pacingEl.className = 'pacing on-track';\n								}\n								else {\n									pacingEl.className = 'pacing ahead';\n								}\n								_displayTime( pacingHoursEl, pacingMinutesEl, pacingSecondsEl, timeLeftCurrentSlide );\n							} );\n						} );\n					}\n\n				}\n\n				/**\n				 * Sets up the speaker view layout and layout selector.\n				 */\n				function setupLayout() {\n\n					layoutDropdown = document.querySelector( '.speaker-layout-dropdown' );\n					layoutLabel = document.querySelector( '.speaker-layout-label' );\n\n					// Render the list of available layouts\n					for( var id in SPEAKER_LAYOUTS ) {\n						var option = document.createElement( 'option' );\n						option.setAttribute( 'value', id );\n						option.textContent = SPEAKER_LAYOUTS[ id ];\n						layoutDropdown.appendChild( option );\n					}\n\n					// Monitor the dropdown for changes\n					layoutDropdown.addEventListener( 'change', function( event ) {\n\n						setLayout( layoutDropdown.value );\n\n					}, false );\n\n					// Restore any currently persisted layout\n					setLayout( getLayout() );\n\n				}\n\n				/**\n				 * Sets a new speaker view layout. The layout is persisted\n				 * in local storage.\n				 */\n				function setLayout( value ) {\n\n					var title = SPEAKER_LAYOUTS[ value ];\n\n					layoutLabel.innerHTML = 'Layout' + ( title ? ( ': ' + title ) : '' );\n					layoutDropdown.value = value;\n\n					document.body.setAttribute( 'data-speaker-layout', value );\n\n					// Persist locally\n					if( supportsLocalStorage() ) {\n						window.localStorage.setItem( 'reveal-speaker-layout', value );\n					}\n\n				}\n\n				/**\n				 * Returns the ID of the most recently set speaker layout\n				 * or our default layout if none has been set.\n				 */\n				function getLayout() {\n\n					if( supportsLocalStorage() ) {\n						var layout = window.localStorage.getItem( 'reveal-speaker-layout' );\n						if( layout ) {\n							return layout;\n						}\n					}\n\n					// Default to the first record in the layouts hash\n					for( var id in SPEAKER_LAYOUTS ) {\n						return id;\n					}\n\n				}\n\n				function supportsLocalStorage() {\n\n					try {\n						localStorage.setItem('test', 'test');\n						localStorage.removeItem('test');\n						return true;\n					}\n					catch( e ) {\n						return false;\n					}\n\n				}\n\n				function zeroPadInteger( num ) {\n\n					var str = '00' + parseInt( num );\n					return str.substring( str.length - 2 );\n\n				}\n\n				/**\n				 * Limits the frequency at which a function can be called.\n				 */\n				function debounce( fn, ms ) {\n\n					var lastTime = 0,\n						timeout;\n\n					return function() {\n\n						var args = arguments;\n						var context = this;\n\n						clearTimeout( timeout );\n\n						var timeSinceLastCall = Date.now() - lastTime;\n						if( timeSinceLastCall > ms ) {\n							fn.apply( context, args );\n							lastTime = Date.now();\n						}\n						else {\n							timeout = setTimeout( function() {\n								fn.apply( context, args );\n								lastTime = Date.now();\n							}, ms - timeSinceLastCall );\n						}\n\n					}\n\n				}\n\n			})();\n\n		<\/script>\n	</body>\n</html>";
	function t$1() {
		return {
			async: !1,
			breaks: !1,
			extensions: null,
			gfm: !0,
			hooks: null,
			pedantic: !1,
			renderer: null,
			silent: !1,
			tokenizer: null,
			walkTokens: null
		};
	}
	var n$1 = t$1();
	function r$1(e) {
		n$1 = e;
	}
	var i = { exec: () => null };
	function a(e, t = "") {
		let n = typeof e == "string" ? e : e.source, r = {
			replace: (e, t) => {
				let i = typeof t == "string" ? t : t.source;
				return i = i.replace(s.caret, "$1"), n = n.replace(e, i), r;
			},
			getRegex: () => new RegExp(n, t)
		};
		return r;
	}
	var o = (() => {
		try {
			return !0;
		} catch {
			return !1;
		}
	})(), s = {
		codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm,
		outputLinkReplace: /\\([\[\]])/g,
		indentCodeCompensation: /^(\s+)(?:```)/,
		beginningSpace: /^\s+/,
		endingHash: /#$/,
		startingSpaceChar: /^ /,
		endingSpaceChar: / $/,
		nonSpaceChar: /[^ ]/,
		newLineCharGlobal: /\n/g,
		tabCharGlobal: /\t/g,
		multipleSpaceGlobal: /\s+/g,
		blankLine: /^[ \t]*$/,
		doubleBlankLine: /\n[ \t]*\n[ \t]*$/,
		blockquoteStart: /^ {0,3}>/,
		blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g,
		blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm,
		listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g,
		listIsTask: /^\[[ xX]\] +\S/,
		listReplaceTask: /^\[[ xX]\] +/,
		listTaskCheckbox: /\[[ xX]\]/,
		anyLine: /\n.*\n/,
		hrefBrackets: /^<(.*)>$/,
		tableDelimiter: /[:|]/,
		tableAlignChars: /^\||\| *$/g,
		tableRowBlankLine: /\n[ \t]*$/,
		tableAlignRight: /^ *-+: *$/,
		tableAlignCenter: /^ *:-+: *$/,
		tableAlignLeft: /^ *:-+ *$/,
		startATag: /^<a /i,
		endATag: /^<\/a>/i,
		startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i,
		endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i,
		startAngleBracket: /^</,
		endAngleBracket: />$/,
		pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/,
		unicodeAlphaNumeric: /[\p{L}\p{N}]/u,
		escapeTest: /[&<>"']/,
		escapeReplace: /[&<>"']/g,
		escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,
		escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
		caret: /(^|[^\[])\^/g,
		percentDecode: /%25/g,
		findPipe: /\|/g,
		splitPipe: / \|/,
		slashPipe: /\\\|/g,
		carriageReturn: /\r\n|\r/g,
		spaceLine: /^ +$/gm,
		notSpaceStart: /^\S*/,
		endingNewline: /\n$/,
		listItemRegex: (e) => RegExp(`^( {0,3}${e})((?:[	 ][^\\n]*)?(?:\\n|$))`),
		nextBulletRegex: (e) => RegExp(`^ {0,${Math.min(3, e - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),
		hrRegex: (e) => RegExp(`^ {0,${Math.min(3, e - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),
		fencesBeginRegex: (e) => RegExp(`^ {0,${Math.min(3, e - 1)}}(?:\`\`\`|~~~)`),
		headingBeginRegex: (e) => RegExp(`^ {0,${Math.min(3, e - 1)}}#`),
		htmlBeginRegex: (e) => RegExp(`^ {0,${Math.min(3, e - 1)}}<(?:[a-z].*>|!--)`, "i"),
		blockquoteBeginRegex: (e) => RegExp(`^ {0,${Math.min(3, e - 1)}}>`)
	}, c = /^(?:[ \t]*(?:\n|$))+/, l = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/, u = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/, d = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/, f = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/, p = / {0,3}(?:[*+-]|\d{1,9}[.)])/, m = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/, h = a(m).replace(/bull/g, p).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex(), ee = a(m).replace(/bull/g, p).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(), g = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/, te = /^[^\n]+/, _ = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/, ne = a(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", _).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(), re = a(/^(bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, p).getRegex(), v = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul", y = /<!--(?:-?>|[\s\S]*?(?:-->|$))/, ie = a("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", y).replace("tag", v).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(), b = a(g).replace("hr", d).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v).getRegex(), x = {
		blockquote: a(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", b).getRegex(),
		code: l,
		def: ne,
		fences: u,
		heading: f,
		hr: d,
		html: ie,
		lheading: h,
		list: re,
		newline: c,
		paragraph: b,
		table: i,
		text: te
	}, S = a("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", d).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v).getRegex(), ae = {
		...x,
		lheading: ee,
		table: S,
		paragraph: a(g).replace("hr", d).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", S).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v).getRegex()
	}, oe = {
		...x,
		html: a("^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:\"[^\"]*\"|'[^']*'|\\s[^'\"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))").replace("comment", y).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),
		def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
		heading: /^(#{1,6})(.*)(?:\n+|$)/,
		fences: i,
		lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
		paragraph: a(g).replace("hr", d).replace("heading", " *#{1,6} *[^\n]").replace("lheading", h).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex()
	}, se = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/, ce = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/, C = /^( {2,}|\\)\n(?!\s*$)/, w = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/, T = /[\p{P}\p{S}]/u, E = /[\s\p{P}\p{S}]/u, D = /[^\s\p{P}\p{S}]/u, le = a(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, E).getRegex(), O = /(?!~)[\p{P}\p{S}]/u, ue = /(?!~)[\s\p{P}\p{S}]/u, de = /(?:[^\s\p{P}\p{S}]|~)/u, fe = a(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", o ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex(), k = /^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/, pe = a(k, "u").replace(/punct/g, T).getRegex(), me = a(k, "u").replace(/punct/g, O).getRegex(), A = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)", he = a(A, "gu").replace(/notPunctSpace/g, D).replace(/punctSpace/g, E).replace(/punct/g, T).getRegex(), ge = a(A, "gu").replace(/notPunctSpace/g, de).replace(/punctSpace/g, ue).replace(/punct/g, O).getRegex(), _e = a("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, D).replace(/punctSpace/g, E).replace(/punct/g, T).getRegex(), ve = a(/^~~?(?:((?!~)punct)|[^\s~])/, "u").replace(/punct/g, T).getRegex(), ye = a("^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)", "gu").replace(/notPunctSpace/g, D).replace(/punctSpace/g, E).replace(/punct/g, T).getRegex(), be = a(/\\(punct)/, "gu").replace(/punct/g, T).getRegex(), xe = a(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(), Se = a(y).replace("(?:-->|$)", "-->").getRegex(), j = a("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", Se).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(), M = /(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/, Ce = a(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/).replace("label", M).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(), N = a(/^!?\[(label)\]\[(ref)\]/).replace("label", M).replace("ref", _).getRegex(), P = a(/^!?\[(ref)\](?:\[\])?/).replace("ref", _).getRegex(), we = a("reflink|nolink(?!\\()", "g").replace("reflink", N).replace("nolink", P).getRegex(), F = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/, I = {
		_backpedal: i,
		anyPunctuation: be,
		autolink: xe,
		blockSkip: fe,
		br: C,
		code: ce,
		del: i,
		delLDelim: i,
		delRDelim: i,
		emStrongLDelim: pe,
		emStrongRDelimAst: he,
		emStrongRDelimUnd: _e,
		escape: se,
		link: Ce,
		nolink: P,
		punctuation: le,
		reflink: N,
		reflinkSearch: we,
		tag: j,
		text: w,
		url: i
	}, Te = {
		...I,
		link: a(/^!?\[(label)\]\((.*?)\)/).replace("label", M).getRegex(),
		reflink: a(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", M).getRegex()
	}, L = {
		...I,
		emStrongRDelimAst: ge,
		emStrongLDelim: me,
		delLDelim: ve,
		delRDelim: ye,
		url: a(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol", F).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),
		_backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
		del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,
		text: a(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol", F).getRegex()
	}, Ee = {
		...L,
		br: a(C).replace("{2,}", "*").getRegex(),
		text: a(L.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex()
	}, R = {
		normal: x,
		gfm: ae,
		pedantic: oe
	}, z = {
		normal: I,
		gfm: L,
		breaks: Ee,
		pedantic: Te
	}, De = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\"": "&quot;",
		"'": "&#39;"
	}, B = (e) => De[e];
	function V(e, t) {
		if (t) {
			if (s.escapeTest.test(e)) return e.replace(s.escapeReplace, B);
		} else if (s.escapeTestNoEncode.test(e)) return e.replace(s.escapeReplaceNoEncode, B);
		return e;
	}
	function H(e) {
		try {
			e = encodeURI(e).replace(s.percentDecode, "%");
		} catch {
			return null;
		}
		return e;
	}
	function U(e, t) {
		let n = e.replace(s.findPipe, (e, t, n) => {
			let r = !1, i = t;
			for (; --i >= 0 && n[i] === "\\";) r = !r;
			return r ? "|" : " |";
		}).split(s.splitPipe), r = 0;
		if (n[0].trim() || n.shift(), n.length > 0 && !n.at(-1)?.trim() && n.pop(), t) if (n.length > t) n.splice(t);
		else for (; n.length < t;) n.push("");
		for (; r < n.length; r++) n[r] = n[r].trim().replace(s.slashPipe, "|");
		return n;
	}
	function W(e, t, n) {
		let r = e.length;
		if (r === 0) return "";
		let i = 0;
		for (; i < r;) {
			let a = e.charAt(r - i - 1);
			if (a === t && !n) i++;
			else if (a !== t && n) i++;
			else break;
		}
		return e.slice(0, r - i);
	}
	function Oe(e, t) {
		if (e.indexOf(t[1]) === -1) return -1;
		let n = 0;
		for (let r = 0; r < e.length; r++) if (e[r] === "\\") r++;
		else if (e[r] === t[0]) n++;
		else if (e[r] === t[1] && (n--, n < 0)) return r;
		return n > 0 ? -2 : -1;
	}
	function ke(e, t = 0) {
		let n = t, r = "";
		for (let t of e) if (t === "	") {
			let e = 4 - n % 4;
			r += " ".repeat(e), n += e;
		} else r += t, n++;
		return r;
	}
	function G(e, t, n, r, i) {
		let a = t.href, o = t.title || null, s = e[1].replace(i.other.outputLinkReplace, "$1");
		r.state.inLink = !0;
		let c = {
			type: e[0].charAt(0) === "!" ? "image" : "link",
			raw: n,
			href: a,
			title: o,
			text: s,
			tokens: r.inlineTokens(s)
		};
		return r.state.inLink = !1, c;
	}
	function Ae(e, t, n) {
		let r = e.match(n.other.indentCodeCompensation);
		if (r === null) return t;
		let i = r[1];
		return t.split("\n").map((e) => {
			let t = e.match(n.other.beginningSpace);
			if (t === null) return e;
			let [r] = t;
			return r.length >= i.length ? e.slice(i.length) : e;
		}).join("\n");
	}
	var K = class {
		options;
		rules;
		lexer;
		constructor(e) {
			this.options = e || n$1;
		}
		space(e) {
			let t = this.rules.block.newline.exec(e);
			if (t && t[0].length > 0) return {
				type: "space",
				raw: t[0]
			};
		}
		code(e) {
			let t = this.rules.block.code.exec(e);
			if (t) {
				let e = t[0].replace(this.rules.other.codeRemoveIndent, "");
				return {
					type: "code",
					raw: t[0],
					codeBlockStyle: "indented",
					text: this.options.pedantic ? e : W(e, "\n")
				};
			}
		}
		fences(e) {
			let t = this.rules.block.fences.exec(e);
			if (t) {
				let e = t[0], n = Ae(e, t[3] || "", this.rules);
				return {
					type: "code",
					raw: e,
					lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2],
					text: n
				};
			}
		}
		heading(e) {
			let t = this.rules.block.heading.exec(e);
			if (t) {
				let e = t[2].trim();
				if (this.rules.other.endingHash.test(e)) {
					let t = W(e, "#");
					(this.options.pedantic || !t || this.rules.other.endingSpaceChar.test(t)) && (e = t.trim());
				}
				return {
					type: "heading",
					raw: t[0],
					depth: t[1].length,
					text: e,
					tokens: this.lexer.inline(e)
				};
			}
		}
		hr(e) {
			let t = this.rules.block.hr.exec(e);
			if (t) return {
				type: "hr",
				raw: W(t[0], "\n")
			};
		}
		blockquote(e) {
			let t = this.rules.block.blockquote.exec(e);
			if (t) {
				let e = W(t[0], "\n").split("\n"), n = "", r = "", i = [];
				for (; e.length > 0;) {
					let t = !1, a = [], o;
					for (o = 0; o < e.length; o++) if (this.rules.other.blockquoteStart.test(e[o])) a.push(e[o]), t = !0;
					else if (!t) a.push(e[o]);
					else break;
					e = e.slice(o);
					let s = a.join("\n"), c = s.replace(this.rules.other.blockquoteSetextReplace, "\n    $1").replace(this.rules.other.blockquoteSetextReplace2, "");
					n = n ? `${n}
${s}` : s, r = r ? `${r}
${c}` : c;
					let l = this.lexer.state.top;
					if (this.lexer.state.top = !0, this.lexer.blockTokens(c, i, !0), this.lexer.state.top = l, e.length === 0) break;
					let u = i.at(-1);
					if (u?.type === "code") break;
					if (u?.type === "blockquote") {
						let t = u, a = t.raw + "\n" + e.join("\n"), o = this.blockquote(a);
						i[i.length - 1] = o, n = n.substring(0, n.length - t.raw.length) + o.raw, r = r.substring(0, r.length - t.text.length) + o.text;
						break;
					} else if (u?.type === "list") {
						let t = u, a = t.raw + "\n" + e.join("\n"), o = this.list(a);
						i[i.length - 1] = o, n = n.substring(0, n.length - u.raw.length) + o.raw, r = r.substring(0, r.length - t.raw.length) + o.raw, e = a.substring(i.at(-1).raw.length).split("\n");
						continue;
					}
				}
				return {
					type: "blockquote",
					raw: n,
					tokens: i,
					text: r
				};
			}
		}
		list(e) {
			let t = this.rules.block.list.exec(e);
			if (t) {
				let n = t[1].trim(), r = n.length > 1, i = {
					type: "list",
					raw: "",
					ordered: r,
					start: r ? +n.slice(0, -1) : "",
					loose: !1,
					items: []
				};
				n = r ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`, this.options.pedantic && (n = r ? n : "[*+-]");
				let a = this.rules.other.listItemRegex(n), o = !1;
				for (; e;) {
					let n = !1, r = "", s = "";
					if (!(t = a.exec(e)) || this.rules.block.hr.test(e)) break;
					r = t[0], e = e.substring(r.length);
					let c = ke(t[2].split("\n", 1)[0], t[1].length), l = e.split("\n", 1)[0], u = !c.trim(), d = 0;
					if (this.options.pedantic ? (d = 2, s = c.trimStart()) : u ? d = t[1].length + 1 : (d = c.search(this.rules.other.nonSpaceChar), d = d > 4 ? 1 : d, s = c.slice(d), d += t[1].length), u && this.rules.other.blankLine.test(l) && (r += l + "\n", e = e.substring(l.length + 1), n = !0), !n) {
						let t = this.rules.other.nextBulletRegex(d), n = this.rules.other.hrRegex(d), i = this.rules.other.fencesBeginRegex(d), a = this.rules.other.headingBeginRegex(d), o = this.rules.other.htmlBeginRegex(d), f = this.rules.other.blockquoteBeginRegex(d);
						for (; e;) {
							let p = e.split("\n", 1)[0], m;
							if (l = p, this.options.pedantic ? (l = l.replace(this.rules.other.listReplaceNesting, "  "), m = l) : m = l.replace(this.rules.other.tabCharGlobal, "    "), i.test(l) || a.test(l) || o.test(l) || f.test(l) || t.test(l) || n.test(l)) break;
							if (m.search(this.rules.other.nonSpaceChar) >= d || !l.trim()) s += "\n" + m.slice(d);
							else {
								if (u || c.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || i.test(c) || a.test(c) || n.test(c)) break;
								s += "\n" + l;
							}
							u = !l.trim(), r += p + "\n", e = e.substring(p.length + 1), c = m.slice(d);
						}
					}
					i.loose || (o ? i.loose = !0 : this.rules.other.doubleBlankLine.test(r) && (o = !0)), i.items.push({
						type: "list_item",
						raw: r,
						task: !!this.options.gfm && this.rules.other.listIsTask.test(s),
						loose: !1,
						text: s,
						tokens: []
					}), i.raw += r;
				}
				let s = i.items.at(-1);
				if (s) s.raw = s.raw.trimEnd(), s.text = s.text.trimEnd();
				else return;
				i.raw = i.raw.trimEnd();
				for (let e of i.items) {
					if (this.lexer.state.top = !1, e.tokens = this.lexer.blockTokens(e.text, []), e.task) {
						if (e.text = e.text.replace(this.rules.other.listReplaceTask, ""), e.tokens[0]?.type === "text" || e.tokens[0]?.type === "paragraph") {
							e.tokens[0].raw = e.tokens[0].raw.replace(this.rules.other.listReplaceTask, ""), e.tokens[0].text = e.tokens[0].text.replace(this.rules.other.listReplaceTask, "");
							for (let e = this.lexer.inlineQueue.length - 1; e >= 0; e--) if (this.rules.other.listIsTask.test(this.lexer.inlineQueue[e].src)) {
								this.lexer.inlineQueue[e].src = this.lexer.inlineQueue[e].src.replace(this.rules.other.listReplaceTask, "");
								break;
							}
						}
						let t = this.rules.other.listTaskCheckbox.exec(e.raw);
						if (t) {
							let n = {
								type: "checkbox",
								raw: t[0] + " ",
								checked: t[0] !== "[ ]"
							};
							e.checked = n.checked, i.loose ? e.tokens[0] && ["paragraph", "text"].includes(e.tokens[0].type) && "tokens" in e.tokens[0] && e.tokens[0].tokens ? (e.tokens[0].raw = n.raw + e.tokens[0].raw, e.tokens[0].text = n.raw + e.tokens[0].text, e.tokens[0].tokens.unshift(n)) : e.tokens.unshift({
								type: "paragraph",
								raw: n.raw,
								text: n.raw,
								tokens: [n]
							}) : e.tokens.unshift(n);
						}
					}
					if (!i.loose) {
						let t = e.tokens.filter((e) => e.type === "space");
						i.loose = t.length > 0 && t.some((e) => this.rules.other.anyLine.test(e.raw));
					}
				}
				if (i.loose) for (let e of i.items) {
					e.loose = !0;
					for (let t of e.tokens) t.type === "text" && (t.type = "paragraph");
				}
				return i;
			}
		}
		html(e) {
			let t = this.rules.block.html.exec(e);
			if (t) return {
				type: "html",
				block: !0,
				raw: t[0],
				pre: t[1] === "pre" || t[1] === "script" || t[1] === "style",
				text: t[0]
			};
		}
		def(e) {
			let t = this.rules.block.def.exec(e);
			if (t) {
				let e = t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), n = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", r = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
				return {
					type: "def",
					tag: e,
					raw: t[0],
					href: n,
					title: r
				};
			}
		}
		table(e) {
			let t = this.rules.block.table.exec(e);
			if (!t || !this.rules.other.tableDelimiter.test(t[2])) return;
			let n = U(t[1]), r = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), i = t[3]?.trim() ? t[3].replace(this.rules.other.tableRowBlankLine, "").split("\n") : [], a = {
				type: "table",
				raw: t[0],
				header: [],
				align: [],
				rows: []
			};
			if (n.length === r.length) {
				for (let e of r) this.rules.other.tableAlignRight.test(e) ? a.align.push("right") : this.rules.other.tableAlignCenter.test(e) ? a.align.push("center") : this.rules.other.tableAlignLeft.test(e) ? a.align.push("left") : a.align.push(null);
				for (let e = 0; e < n.length; e++) a.header.push({
					text: n[e],
					tokens: this.lexer.inline(n[e]),
					header: !0,
					align: a.align[e]
				});
				for (let e of i) a.rows.push(U(e, a.header.length).map((e, t) => ({
					text: e,
					tokens: this.lexer.inline(e),
					header: !1,
					align: a.align[t]
				})));
				return a;
			}
		}
		lheading(e) {
			let t = this.rules.block.lheading.exec(e);
			if (t) {
				let e = t[1].trim();
				return {
					type: "heading",
					raw: t[0],
					depth: t[2].charAt(0) === "=" ? 1 : 2,
					text: e,
					tokens: this.lexer.inline(e)
				};
			}
		}
		paragraph(e) {
			let t = this.rules.block.paragraph.exec(e);
			if (t) {
				let e = t[1].charAt(t[1].length - 1) === "\n" ? t[1].slice(0, -1) : t[1];
				return {
					type: "paragraph",
					raw: t[0],
					text: e,
					tokens: this.lexer.inline(e)
				};
			}
		}
		text(e) {
			let t = this.rules.block.text.exec(e);
			if (t) return {
				type: "text",
				raw: t[0],
				text: t[0],
				tokens: this.lexer.inline(t[0])
			};
		}
		escape(e) {
			let t = this.rules.inline.escape.exec(e);
			if (t) return {
				type: "escape",
				raw: t[0],
				text: t[1]
			};
		}
		tag(e) {
			let t = this.rules.inline.tag.exec(e);
			if (t) return !this.lexer.state.inLink && this.rules.other.startATag.test(t[0]) ? this.lexer.state.inLink = !0 : this.lexer.state.inLink && this.rules.other.endATag.test(t[0]) && (this.lexer.state.inLink = !1), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0]) ? this.lexer.state.inRawBlock = !0 : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t[0]) && (this.lexer.state.inRawBlock = !1), {
				type: "html",
				raw: t[0],
				inLink: this.lexer.state.inLink,
				inRawBlock: this.lexer.state.inRawBlock,
				block: !1,
				text: t[0]
			};
		}
		link(e) {
			let t = this.rules.inline.link.exec(e);
			if (t) {
				let e = t[2].trim();
				if (!this.options.pedantic && this.rules.other.startAngleBracket.test(e)) {
					if (!this.rules.other.endAngleBracket.test(e)) return;
					let t = W(e.slice(0, -1), "\\");
					if ((e.length - t.length) % 2 == 0) return;
				} else {
					let e = Oe(t[2], "()");
					if (e === -2) return;
					if (e > -1) {
						let n = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + e;
						t[2] = t[2].substring(0, e), t[0] = t[0].substring(0, n).trim(), t[3] = "";
					}
				}
				let n = t[2], r = "";
				if (this.options.pedantic) {
					let e = this.rules.other.pedanticHrefTitle.exec(n);
					e && (n = e[1], r = e[3]);
				} else r = t[3] ? t[3].slice(1, -1) : "";
				return n = n.trim(), this.rules.other.startAngleBracket.test(n) && (n = this.options.pedantic && !this.rules.other.endAngleBracket.test(e) ? n.slice(1) : n.slice(1, -1)), G(t, {
					href: n && n.replace(this.rules.inline.anyPunctuation, "$1"),
					title: r && r.replace(this.rules.inline.anyPunctuation, "$1")
				}, t[0], this.lexer, this.rules);
			}
		}
		reflink(e, t) {
			let n;
			if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
				let e = t[(n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " ").toLowerCase()];
				if (!e) {
					let e = n[0].charAt(0);
					return {
						type: "text",
						raw: e,
						text: e
					};
				}
				return G(n, e, n[0], this.lexer, this.rules);
			}
		}
		emStrong(e, t, n = "") {
			let r = this.rules.inline.emStrongLDelim.exec(e);
			if (!(!r || !r[1] && !r[2] && !r[3] && !r[4] || r[4] && n.match(this.rules.other.unicodeAlphaNumeric)) && (!(r[1] || r[3]) || !n || this.rules.inline.punctuation.exec(n))) {
				let n = [...r[0]].length - 1, i, a, o = n, s = 0, c = r[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
				for (c.lastIndex = 0, t = t.slice(-1 * e.length + n); (r = c.exec(t)) != null;) {
					if (i = r[1] || r[2] || r[3] || r[4] || r[5] || r[6], !i) continue;
					if (a = [...i].length, r[3] || r[4]) {
						o += a;
						continue;
					} else if ((r[5] || r[6]) && n % 3 && !((n + a) % 3)) {
						s += a;
						continue;
					}
					if (o -= a, o > 0) continue;
					a = Math.min(a, a + o + s);
					let t = [...r[0]][0].length, c = e.slice(0, n + r.index + t + a);
					if (Math.min(n, a) % 2) {
						let e = c.slice(1, -1);
						return {
							type: "em",
							raw: c,
							text: e,
							tokens: this.lexer.inlineTokens(e)
						};
					}
					let l = c.slice(2, -2);
					return {
						type: "strong",
						raw: c,
						text: l,
						tokens: this.lexer.inlineTokens(l)
					};
				}
			}
		}
		codespan(e) {
			let t = this.rules.inline.code.exec(e);
			if (t) {
				let e = t[2].replace(this.rules.other.newLineCharGlobal, " "), n = this.rules.other.nonSpaceChar.test(e), r = this.rules.other.startingSpaceChar.test(e) && this.rules.other.endingSpaceChar.test(e);
				return n && r && (e = e.substring(1, e.length - 1)), {
					type: "codespan",
					raw: t[0],
					text: e
				};
			}
		}
		br(e) {
			let t = this.rules.inline.br.exec(e);
			if (t) return {
				type: "br",
				raw: t[0]
			};
		}
		del(e, t, n = "") {
			let r = this.rules.inline.delLDelim.exec(e);
			if (r && (!r[1] || !n || this.rules.inline.punctuation.exec(n))) {
				let n = [...r[0]].length - 1, i, a, o = n, s = this.rules.inline.delRDelim;
				for (s.lastIndex = 0, t = t.slice(-1 * e.length + n); (r = s.exec(t)) != null;) {
					if (i = r[1] || r[2] || r[3] || r[4] || r[5] || r[6], !i || (a = [...i].length, a !== n)) continue;
					if (r[3] || r[4]) {
						o += a;
						continue;
					}
					if (o -= a, o > 0) continue;
					a = Math.min(a, a + o);
					let t = [...r[0]][0].length, s = e.slice(0, n + r.index + t + a), c = s.slice(n, -n);
					return {
						type: "del",
						raw: s,
						text: c,
						tokens: this.lexer.inlineTokens(c)
					};
				}
			}
		}
		autolink(e) {
			let t = this.rules.inline.autolink.exec(e);
			if (t) {
				let e, n;
				return t[2] === "@" ? (e = t[1], n = "mailto:" + e) : (e = t[1], n = e), {
					type: "link",
					raw: t[0],
					text: e,
					href: n,
					tokens: [{
						type: "text",
						raw: e,
						text: e
					}]
				};
			}
		}
		url(e) {
			let t;
			if (t = this.rules.inline.url.exec(e)) {
				let e, n;
				if (t[2] === "@") e = t[0], n = "mailto:" + e;
				else {
					let r;
					do
						r = t[0], t[0] = this.rules.inline._backpedal.exec(t[0])?.[0] ?? "";
					while (r !== t[0]);
					e = t[0], n = t[1] === "www." ? "http://" + t[0] : t[0];
				}
				return {
					type: "link",
					raw: t[0],
					text: e,
					href: n,
					tokens: [{
						type: "text",
						raw: e,
						text: e
					}]
				};
			}
		}
		inlineText(e) {
			let t = this.rules.inline.text.exec(e);
			if (t) {
				let e = this.lexer.state.inRawBlock;
				return {
					type: "text",
					raw: t[0],
					text: t[0],
					escaped: e
				};
			}
		}
	}, q = class e {
		tokens;
		options;
		state;
		inlineQueue;
		tokenizer;
		constructor(e) {
			this.tokens = [], this.tokens.links = Object.create(null), this.options = e || n$1, this.options.tokenizer = this.options.tokenizer || new K(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = {
				inLink: !1,
				inRawBlock: !1,
				top: !0
			};
			let t = {
				other: s,
				block: R.normal,
				inline: z.normal
			};
			this.options.pedantic ? (t.block = R.pedantic, t.inline = z.pedantic) : this.options.gfm && (t.block = R.gfm, this.options.breaks ? t.inline = z.breaks : t.inline = z.gfm), this.tokenizer.rules = t;
		}
		static get rules() {
			return {
				block: R,
				inline: z
			};
		}
		static lex(t, n) {
			return new e(n).lex(t);
		}
		static lexInline(t, n) {
			return new e(n).inlineTokens(t);
		}
		lex(e) {
			e = e.replace(s.carriageReturn, "\n"), this.blockTokens(e, this.tokens);
			for (let e = 0; e < this.inlineQueue.length; e++) {
				let t = this.inlineQueue[e];
				this.inlineTokens(t.src, t.tokens);
			}
			return this.inlineQueue = [], this.tokens;
		}
		blockTokens(e, t = [], n = !1) {
			for (this.tokenizer.lexer = this, this.options.pedantic && (e = e.replace(s.tabCharGlobal, "    ").replace(s.spaceLine, "")); e;) {
				let r;
				if (this.options.extensions?.block?.some((n) => (r = n.call({ lexer: this }, e, t)) ? (e = e.substring(r.raw.length), t.push(r), !0) : !1)) continue;
				if (r = this.tokenizer.space(e)) {
					e = e.substring(r.raw.length);
					let n = t.at(-1);
					r.raw.length === 1 && n !== void 0 ? n.raw += "\n" : t.push(r);
					continue;
				}
				if (r = this.tokenizer.code(e)) {
					e = e.substring(r.raw.length);
					let n = t.at(-1);
					n?.type === "paragraph" || n?.type === "text" ? (n.raw += (n.raw.endsWith("\n") ? "" : "\n") + r.raw, n.text += "\n" + r.text, this.inlineQueue.at(-1).src = n.text) : t.push(r);
					continue;
				}
				if (r = this.tokenizer.fences(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.heading(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.hr(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.blockquote(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.list(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.html(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.def(e)) {
					e = e.substring(r.raw.length);
					let n = t.at(-1);
					n?.type === "paragraph" || n?.type === "text" ? (n.raw += (n.raw.endsWith("\n") ? "" : "\n") + r.raw, n.text += "\n" + r.raw, this.inlineQueue.at(-1).src = n.text) : this.tokens.links[r.tag] || (this.tokens.links[r.tag] = {
						href: r.href,
						title: r.title
					}, t.push(r));
					continue;
				}
				if (r = this.tokenizer.table(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.lheading(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				let i = e;
				if (this.options.extensions?.startBlock) {
					let t = Infinity, n = e.slice(1), r;
					this.options.extensions.startBlock.forEach((e) => {
						r = e.call({ lexer: this }, n), typeof r == "number" && r >= 0 && (t = Math.min(t, r));
					}), t < Infinity && t >= 0 && (i = e.substring(0, t + 1));
				}
				if (this.state.top && (r = this.tokenizer.paragraph(i))) {
					let a = t.at(-1);
					n && a?.type === "paragraph" ? (a.raw += (a.raw.endsWith("\n") ? "" : "\n") + r.raw, a.text += "\n" + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = a.text) : t.push(r), n = i.length !== e.length, e = e.substring(r.raw.length);
					continue;
				}
				if (r = this.tokenizer.text(e)) {
					e = e.substring(r.raw.length);
					let n = t.at(-1);
					n?.type === "text" ? (n.raw += (n.raw.endsWith("\n") ? "" : "\n") + r.raw, n.text += "\n" + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = n.text) : t.push(r);
					continue;
				}
				if (e) {
					let t = "Infinite loop on byte: " + e.charCodeAt(0);
					if (this.options.silent) {
						console.error(t);
						break;
					} else throw Error(t);
				}
			}
			return this.state.top = !0, t;
		}
		inline(e, t = []) {
			return this.inlineQueue.push({
				src: e,
				tokens: t
			}), t;
		}
		inlineTokens(e, t = []) {
			this.tokenizer.lexer = this;
			let n = e, r = null;
			if (this.tokens.links) {
				let e = Object.keys(this.tokens.links);
				if (e.length > 0) for (; (r = this.tokenizer.rules.inline.reflinkSearch.exec(n)) != null;) e.includes(r[0].slice(r[0].lastIndexOf("[") + 1, -1)) && (n = n.slice(0, r.index) + "[" + "a".repeat(r[0].length - 2) + "]" + n.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex));
			}
			for (; (r = this.tokenizer.rules.inline.anyPunctuation.exec(n)) != null;) n = n.slice(0, r.index) + "++" + n.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
			let i;
			for (; (r = this.tokenizer.rules.inline.blockSkip.exec(n)) != null;) i = r[2] ? r[2].length : 0, n = n.slice(0, r.index + i) + "[" + "a".repeat(r[0].length - i - 2) + "]" + n.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
			n = this.options.hooks?.emStrongMask?.call({ lexer: this }, n) ?? n;
			let a = !1, o = "";
			for (; e;) {
				a || (o = ""), a = !1;
				let r;
				if (this.options.extensions?.inline?.some((n) => (r = n.call({ lexer: this }, e, t)) ? (e = e.substring(r.raw.length), t.push(r), !0) : !1)) continue;
				if (r = this.tokenizer.escape(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.tag(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.link(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.reflink(e, this.tokens.links)) {
					e = e.substring(r.raw.length);
					let n = t.at(-1);
					r.type === "text" && n?.type === "text" ? (n.raw += r.raw, n.text += r.text) : t.push(r);
					continue;
				}
				if (r = this.tokenizer.emStrong(e, n, o)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.codespan(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.br(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.del(e, n, o)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (r = this.tokenizer.autolink(e)) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				if (!this.state.inLink && (r = this.tokenizer.url(e))) {
					e = e.substring(r.raw.length), t.push(r);
					continue;
				}
				let i = e;
				if (this.options.extensions?.startInline) {
					let t = Infinity, n = e.slice(1), r;
					this.options.extensions.startInline.forEach((e) => {
						r = e.call({ lexer: this }, n), typeof r == "number" && r >= 0 && (t = Math.min(t, r));
					}), t < Infinity && t >= 0 && (i = e.substring(0, t + 1));
				}
				if (r = this.tokenizer.inlineText(i)) {
					e = e.substring(r.raw.length), r.raw.slice(-1) !== "_" && (o = r.raw.slice(-1)), a = !0;
					let n = t.at(-1);
					n?.type === "text" ? (n.raw += r.raw, n.text += r.text) : t.push(r);
					continue;
				}
				if (e) {
					let t = "Infinite loop on byte: " + e.charCodeAt(0);
					if (this.options.silent) {
						console.error(t);
						break;
					} else throw Error(t);
				}
			}
			return t;
		}
	}, J = class {
		options;
		parser;
		constructor(e) {
			this.options = e || n$1;
		}
		space(e) {
			return "";
		}
		code({ text: e, lang: t, escaped: n }) {
			let r = (t || "").match(s.notSpaceStart)?.[0], i = e.replace(s.endingNewline, "") + "\n";
			return r ? "<pre><code class=\"language-" + V(r) + "\">" + (n ? i : V(i, !0)) + "</code></pre>\n" : "<pre><code>" + (n ? i : V(i, !0)) + "</code></pre>\n";
		}
		blockquote({ tokens: e }) {
			return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
		}
		html({ text: e }) {
			return e;
		}
		def(e) {
			return "";
		}
		heading({ tokens: e, depth: t }) {
			return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
		}
		hr(e) {
			return "<hr>\n";
		}
		list(e) {
			let t = e.ordered, n = e.start, r = "";
			for (let t = 0; t < e.items.length; t++) {
				let n = e.items[t];
				r += this.listitem(n);
			}
			let i = t ? "ol" : "ul", a = t && n !== 1 ? " start=\"" + n + "\"" : "";
			return "<" + i + a + ">\n" + r + "</" + i + ">\n";
		}
		listitem(e) {
			return `<li>${this.parser.parse(e.tokens)}</li>
`;
		}
		checkbox({ checked: e }) {
			return "<input " + (e ? "checked=\"\" " : "") + "disabled=\"\" type=\"checkbox\"> ";
		}
		paragraph({ tokens: e }) {
			return `<p>${this.parser.parseInline(e)}</p>
`;
		}
		table(e) {
			let t = "", n = "";
			for (let t = 0; t < e.header.length; t++) n += this.tablecell(e.header[t]);
			t += this.tablerow({ text: n });
			let r = "";
			for (let t = 0; t < e.rows.length; t++) {
				let i = e.rows[t];
				n = "";
				for (let e = 0; e < i.length; e++) n += this.tablecell(i[e]);
				r += this.tablerow({ text: n });
			}
			return r &&= `<tbody>${r}</tbody>`, "<table>\n<thead>\n" + t + "</thead>\n" + r + "</table>\n";
		}
		tablerow({ text: e }) {
			return `<tr>
${e}</tr>
`;
		}
		tablecell(e) {
			let t = this.parser.parseInline(e.tokens), n = e.header ? "th" : "td";
			return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>
`;
		}
		strong({ tokens: e }) {
			return `<strong>${this.parser.parseInline(e)}</strong>`;
		}
		em({ tokens: e }) {
			return `<em>${this.parser.parseInline(e)}</em>`;
		}
		codespan({ text: e }) {
			return `<code>${V(e, !0)}</code>`;
		}
		br(e) {
			return "<br>";
		}
		del({ tokens: e }) {
			return `<del>${this.parser.parseInline(e)}</del>`;
		}
		link({ href: e, title: t, tokens: n }) {
			let r = this.parser.parseInline(n), i = H(e);
			if (i === null) return r;
			e = i;
			let a = "<a href=\"" + e + "\"";
			return t && (a += " title=\"" + V(t) + "\""), a += ">" + r + "</a>", a;
		}
		image({ href: e, title: t, text: n, tokens: r }) {
			r && (n = this.parser.parseInline(r, this.parser.textRenderer));
			let i = H(e);
			if (i === null) return V(n);
			e = i;
			let a = `<img src="${e}" alt="${V(n)}"`;
			return t && (a += ` title="${V(t)}"`), a += ">", a;
		}
		text(e) {
			return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : "escaped" in e && e.escaped ? e.text : V(e.text);
		}
	}, Y = class {
		strong({ text: e }) {
			return e;
		}
		em({ text: e }) {
			return e;
		}
		codespan({ text: e }) {
			return e;
		}
		del({ text: e }) {
			return e;
		}
		html({ text: e }) {
			return e;
		}
		text({ text: e }) {
			return e;
		}
		link({ text: e }) {
			return "" + e;
		}
		image({ text: e }) {
			return "" + e;
		}
		br() {
			return "";
		}
		checkbox({ raw: e }) {
			return e;
		}
	}, X = class e {
		options;
		renderer;
		textRenderer;
		constructor(e) {
			this.options = e || n$1, this.options.renderer = this.options.renderer || new J(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new Y();
		}
		static parse(t, n) {
			return new e(n).parse(t);
		}
		static parseInline(t, n) {
			return new e(n).parseInline(t);
		}
		parse(e) {
			this.renderer.parser = this;
			let t = "";
			for (let n = 0; n < e.length; n++) {
				let r = e[n];
				if (this.options.extensions?.renderers?.[r.type]) {
					let e = r, n = this.options.extensions.renderers[e.type].call({ parser: this }, e);
					if (n !== !1 || ![
						"space",
						"hr",
						"heading",
						"code",
						"table",
						"blockquote",
						"list",
						"html",
						"def",
						"paragraph",
						"text"
					].includes(e.type)) {
						t += n || "";
						continue;
					}
				}
				let i = r;
				switch (i.type) {
					case "space":
						t += this.renderer.space(i);
						break;
					case "hr":
						t += this.renderer.hr(i);
						break;
					case "heading":
						t += this.renderer.heading(i);
						break;
					case "code":
						t += this.renderer.code(i);
						break;
					case "table":
						t += this.renderer.table(i);
						break;
					case "blockquote":
						t += this.renderer.blockquote(i);
						break;
					case "list":
						t += this.renderer.list(i);
						break;
					case "checkbox":
						t += this.renderer.checkbox(i);
						break;
					case "html":
						t += this.renderer.html(i);
						break;
					case "def":
						t += this.renderer.def(i);
						break;
					case "paragraph":
						t += this.renderer.paragraph(i);
						break;
					case "text":
						t += this.renderer.text(i);
						break;
					default: {
						let e = "Token with \"" + i.type + "\" type was not found.";
						if (this.options.silent) return console.error(e), "";
						throw Error(e);
					}
				}
			}
			return t;
		}
		parseInline(e, t = this.renderer) {
			this.renderer.parser = this;
			let n = "";
			for (let r = 0; r < e.length; r++) {
				let i = e[r];
				if (this.options.extensions?.renderers?.[i.type]) {
					let e = this.options.extensions.renderers[i.type].call({ parser: this }, i);
					if (e !== !1 || ![
						"escape",
						"html",
						"link",
						"image",
						"strong",
						"em",
						"codespan",
						"br",
						"del",
						"text"
					].includes(i.type)) {
						n += e || "";
						continue;
					}
				}
				let a = i;
				switch (a.type) {
					case "escape":
						n += t.text(a);
						break;
					case "html":
						n += t.html(a);
						break;
					case "link":
						n += t.link(a);
						break;
					case "image":
						n += t.image(a);
						break;
					case "checkbox":
						n += t.checkbox(a);
						break;
					case "strong":
						n += t.strong(a);
						break;
					case "em":
						n += t.em(a);
						break;
					case "codespan":
						n += t.codespan(a);
						break;
					case "br":
						n += t.br(a);
						break;
					case "del":
						n += t.del(a);
						break;
					case "text":
						n += t.text(a);
						break;
					default: {
						let e = "Token with \"" + a.type + "\" type was not found.";
						if (this.options.silent) return console.error(e), "";
						throw Error(e);
					}
				}
			}
			return n;
		}
	}, Z = class {
		options;
		block;
		constructor(e) {
			this.options = e || n$1;
		}
		static passThroughHooks = new Set([
			"preprocess",
			"postprocess",
			"processAllTokens",
			"emStrongMask"
		]);
		static passThroughHooksRespectAsync = new Set([
			"preprocess",
			"postprocess",
			"processAllTokens"
		]);
		preprocess(e) {
			return e;
		}
		postprocess(e) {
			return e;
		}
		processAllTokens(e) {
			return e;
		}
		emStrongMask(e) {
			return e;
		}
		provideLexer() {
			return this.block ? q.lex : q.lexInline;
		}
		provideParser() {
			return this.block ? X.parse : X.parseInline;
		}
	}, Q = new class {
		defaults = t$1();
		options = this.setOptions;
		parse = this.parseMarkdown(!0);
		parseInline = this.parseMarkdown(!1);
		Parser = X;
		Renderer = J;
		TextRenderer = Y;
		Lexer = q;
		Tokenizer = K;
		Hooks = Z;
		constructor(...e) {
			this.use(...e);
		}
		walkTokens(e, t) {
			let n = [];
			for (let r of e) switch (n = n.concat(t.call(this, r)), r.type) {
				case "table": {
					let e = r;
					for (let r of e.header) n = n.concat(this.walkTokens(r.tokens, t));
					for (let r of e.rows) for (let e of r) n = n.concat(this.walkTokens(e.tokens, t));
					break;
				}
				case "list": {
					let e = r;
					n = n.concat(this.walkTokens(e.items, t));
					break;
				}
				default: {
					let e = r;
					this.defaults.extensions?.childTokens?.[e.type] ? this.defaults.extensions.childTokens[e.type].forEach((r) => {
						let i = e[r].flat(Infinity);
						n = n.concat(this.walkTokens(i, t));
					}) : e.tokens && (n = n.concat(this.walkTokens(e.tokens, t)));
				}
			}
			return n;
		}
		use(...e) {
			let t = this.defaults.extensions || {
				renderers: {},
				childTokens: {}
			};
			return e.forEach((e) => {
				let n = { ...e };
				if (n.async = this.defaults.async || n.async || !1, e.extensions && (e.extensions.forEach((e) => {
					if (!e.name) throw Error("extension name required");
					if ("renderer" in e) {
						let n = t.renderers[e.name];
						n ? t.renderers[e.name] = function(...t) {
							let r = e.renderer.apply(this, t);
							return r === !1 && (r = n.apply(this, t)), r;
						} : t.renderers[e.name] = e.renderer;
					}
					if ("tokenizer" in e) {
						if (!e.level || e.level !== "block" && e.level !== "inline") throw Error("extension level must be 'block' or 'inline'");
						let n = t[e.level];
						n ? n.unshift(e.tokenizer) : t[e.level] = [e.tokenizer], e.start && (e.level === "block" ? t.startBlock ? t.startBlock.push(e.start) : t.startBlock = [e.start] : e.level === "inline" && (t.startInline ? t.startInline.push(e.start) : t.startInline = [e.start]));
					}
					"childTokens" in e && e.childTokens && (t.childTokens[e.name] = e.childTokens);
				}), n.extensions = t), e.renderer) {
					let t = this.defaults.renderer || new J(this.defaults);
					for (let n in e.renderer) {
						if (!(n in t)) throw Error(`renderer '${n}' does not exist`);
						if (["options", "parser"].includes(n)) continue;
						let r = n, i = e.renderer[r], a = t[r];
						t[r] = (...e) => {
							let n = i.apply(t, e);
							return n === !1 && (n = a.apply(t, e)), n || "";
						};
					}
					n.renderer = t;
				}
				if (e.tokenizer) {
					let t = this.defaults.tokenizer || new K(this.defaults);
					for (let n in e.tokenizer) {
						if (!(n in t)) throw Error(`tokenizer '${n}' does not exist`);
						if ([
							"options",
							"rules",
							"lexer"
						].includes(n)) continue;
						let r = n, i = e.tokenizer[r], a = t[r];
						t[r] = (...e) => {
							let n = i.apply(t, e);
							return n === !1 && (n = a.apply(t, e)), n;
						};
					}
					n.tokenizer = t;
				}
				if (e.hooks) {
					let t = this.defaults.hooks || new Z();
					for (let n in e.hooks) {
						if (!(n in t)) throw Error(`hook '${n}' does not exist`);
						if (["options", "block"].includes(n)) continue;
						let r = n, i = e.hooks[r], a = t[r];
						Z.passThroughHooks.has(n) ? t[r] = (e) => {
							if (this.defaults.async && Z.passThroughHooksRespectAsync.has(n)) return (async () => {
								let n = await i.call(t, e);
								return a.call(t, n);
							})();
							let r = i.call(t, e);
							return a.call(t, r);
						} : t[r] = (...e) => {
							if (this.defaults.async) return (async () => {
								let n = await i.apply(t, e);
								return n === !1 && (n = await a.apply(t, e)), n;
							})();
							let n = i.apply(t, e);
							return n === !1 && (n = a.apply(t, e)), n;
						};
					}
					n.hooks = t;
				}
				if (e.walkTokens) {
					let t = this.defaults.walkTokens, r = e.walkTokens;
					n.walkTokens = function(e) {
						let n = [];
						return n.push(r.call(this, e)), t && (n = n.concat(t.call(this, e))), n;
					};
				}
				this.defaults = {
					...this.defaults,
					...n
				};
			}), this;
		}
		setOptions(e) {
			return this.defaults = {
				...this.defaults,
				...e
			}, this;
		}
		lexer(e, t) {
			return q.lex(e, t ?? this.defaults);
		}
		parser(e, t) {
			return X.parse(e, t ?? this.defaults);
		}
		parseMarkdown(e) {
			return (t, n) => {
				let r = { ...n }, i = {
					...this.defaults,
					...r
				}, a = this.onError(!!i.silent, !!i.async);
				if (this.defaults.async === !0 && r.async === !1) return a(/* @__PURE__ */ Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
				if (typeof t > "u" || t === null) return a(/* @__PURE__ */ Error("marked(): input parameter is undefined or null"));
				if (typeof t != "string") return a(/* @__PURE__ */ Error("marked(): input parameter is of type " + Object.prototype.toString.call(t) + ", string expected"));
				if (i.hooks && (i.hooks.options = i, i.hooks.block = e), i.async) return (async () => {
					let n = i.hooks ? await i.hooks.preprocess(t) : t, r = await (i.hooks ? await i.hooks.provideLexer() : e ? q.lex : q.lexInline)(n, i), a = i.hooks ? await i.hooks.processAllTokens(r) : r;
					i.walkTokens && await Promise.all(this.walkTokens(a, i.walkTokens));
					let o = await (i.hooks ? await i.hooks.provideParser() : e ? X.parse : X.parseInline)(a, i);
					return i.hooks ? await i.hooks.postprocess(o) : o;
				})().catch(a);
				try {
					i.hooks && (t = i.hooks.preprocess(t));
					let n = (i.hooks ? i.hooks.provideLexer() : e ? q.lex : q.lexInline)(t, i);
					i.hooks && (n = i.hooks.processAllTokens(n)), i.walkTokens && this.walkTokens(n, i.walkTokens);
					let r = (i.hooks ? i.hooks.provideParser() : e ? X.parse : X.parseInline)(n, i);
					return i.hooks && (r = i.hooks.postprocess(r)), r;
				} catch (e) {
					return a(e);
				}
			};
		}
		onError(e, t) {
			return (n) => {
				if (n.message += "\nPlease report this to https://github.com/markedjs/marked.", e) {
					let e = "<p>An error occurred:</p><pre>" + V(n.message + "", !0) + "</pre>";
					return t ? Promise.resolve(e) : e;
				}
				if (t) return Promise.reject(n);
				throw n;
			};
		}
	}();
	function $(e, t) {
		return Q.parse(e, t);
	}
	$.options = $.setOptions = function(e) {
		return Q.setOptions(e), $.defaults = Q.defaults, r$1($.defaults), $;
	}, $.getDefaults = t$1, $.defaults = n$1, $.use = function(...e) {
		return Q.use(...e), $.defaults = Q.defaults, r$1($.defaults), $;
	}, $.walkTokens = function(e, t) {
		return Q.walkTokens(e, t);
	}, $.parseInline = Q.parseInline, $.Parser = X, $.parser = X.parse, $.Renderer = J, $.TextRenderer = Y, $.Lexer = q, $.lexer = q.lex, $.Tokenizer = K, $.Hooks = Z, $.parse = $, $.options, $.setOptions, $.use, $.walkTokens, $.parseInline, X.parse, q.lex;
	var je = () => {
		let t, n = null, r;
		function i() {
			if (n && !n.closed) n.focus();
			else {
				if (n = window.open("about:blank", "reveal.js - Notes", "width=1100,height=700"), n.marked = $, n.document.write(e$2), !n) {
					alert("Speaker view popup failed to open. Please make sure popups are allowed and reopen the speaker view.");
					return;
				}
				o();
			}
		}
		function a(e) {
			n && !n.closed ? n.focus() : (n = e, window.addEventListener("message", u), d());
		}
		function o() {
			let e = r.getConfig().url, i = typeof e == "string" ? e : window.location.protocol + "//" + window.location.host + window.location.pathname + window.location.search;
			t = setInterval(function() {
				n.postMessage(JSON.stringify({
					namespace: "reveal-notes",
					type: "connect",
					state: r.getState(),
					url: i
				}), "*");
			}, 500), window.addEventListener("message", u);
		}
		function s(e, t, i) {
			let a = r[e].apply(r, t);
			n.postMessage(JSON.stringify({
				namespace: "reveal-notes",
				type: "return",
				result: a,
				callId: i
			}), "*");
		}
		function c(e) {
			let t = r.getCurrentSlide(), i = t.querySelectorAll("aside.notes"), a = t.querySelector(".current-fragment"), o = {
				namespace: "reveal-notes",
				type: "state",
				notes: "",
				markdown: !1,
				whitespace: "normal",
				state: r.getState()
			};
			if (t.hasAttribute("data-notes") && (o.notes = t.getAttribute("data-notes"), o.whitespace = "pre-wrap"), a) {
				let e = a.querySelector("aside.notes");
				e ? (o.notes = e.innerHTML, o.markdown = typeof e.getAttribute("data-markdown") == "string", i = null) : a.hasAttribute("data-notes") && (o.notes = a.getAttribute("data-notes"), o.whitespace = "pre-wrap", i = null);
			}
			i && i.length && (i = Array.from(i).filter((e) => e.closest(".fragment") === null), o.notes = i.map((e) => e.innerHTML).join("\n"), o.markdown = i[0] && typeof i[0].getAttribute("data-markdown") == "string"), n.postMessage(JSON.stringify(o), "*");
		}
		function l(e) {
			try {
				return window.location.origin === e.source.location.origin;
			} catch {
				return !1;
			}
		}
		function u(e) {
			if (l(e)) try {
				let n = JSON.parse(e.data);
				n && n.namespace === "reveal-notes" && n.type === "connected" ? (clearInterval(t), d()) : n && n.namespace === "reveal-notes" && n.type === "call" && s(n.methodName, n.arguments, n.callId);
			} catch {}
		}
		function d() {
			r.on("slidechanged", c), r.on("fragmentshown", c), r.on("fragmenthidden", c), r.on("overviewhidden", c), r.on("overviewshown", c), r.on("paused", c), r.on("resumed", c), r.on("previewiframe", c), r.on("previewimage", c), r.on("previewvideo", c), r.on("closeoverlay", c), c();
		}
		return {
			id: "notes",
			init: function(e) {
				r = e, /receiver/i.test(window.location.search) || (window.location.search.match(/(\?|\&)notes/gi) === null ? window.addEventListener("message", (e) => {
					if (!n && typeof e.data == "string") {
						let t;
						try {
							t = JSON.parse(e.data);
						} catch {}
						t && t.namespace === "reveal-notes" && t.type === "heartbeat" && a(e.source);
					}
				}) : i(), r.addKeyBinding({
					keyCode: 83,
					key: "S",
					description: "Speaker notes view"
				}, function() {
					i();
				}));
			},
			open: i
		};
	};
	//#endregion
	//#region node_modules/reveal.js/dist/plugin/zoom.mjs
	var e$1 = {
		id: "zoom",
		init: function(e) {
			e.getRevealElement().addEventListener("mousedown", function(t) {
				var r = /Linux/.test(window.navigator.platform) ? "ctrl" : "alt", i = (e.getConfig().zoomKey ? e.getConfig().zoomKey : r) + "Key", a = e.getConfig().zoomLevel ? e.getConfig().zoomLevel : 2;
				t[i] && !e.isOverview() && (t.preventDefault(), n.to({
					x: t.clientX,
					y: t.clientY,
					scale: a,
					pan: !1
				}));
			});
		},
		destroy: () => {
			n.reset();
		}
	}, t = () => e$1, n = (function() {
		var e = 1, t = 0, r = 0, i = -1, a = -1, o = "transform" in document.body.style;
		o && (document.body.style.transition = "transform 0.8s ease"), document.addEventListener("keyup", function(t) {
			e !== 1 && t.keyCode === 27 && n.out();
		}), document.addEventListener("mousemove", function(n) {
			e !== 1 && (t = n.clientX, r = n.clientY);
		});
		function s(t, n) {
			var r = l();
			if (t.width = t.width || 1, t.height = t.height || 1, t.x -= (window.innerWidth - t.width * n) / 2, t.y -= (window.innerHeight - t.height * n) / 2, o) if (n === 1) document.body.style.transform = "";
			else {
				var i = r.x + "px " + r.y + "px", a = "translate(" + -t.x + "px," + -t.y + "px) scale(" + n + ")";
				document.body.style.transformOrigin = i, document.body.style.transform = a;
			}
			else n === 1 ? (document.body.style.position = "", document.body.style.left = "", document.body.style.top = "", document.body.style.width = "", document.body.style.height = "", document.body.style.zoom = "") : (document.body.style.position = "relative", document.body.style.left = -(r.x + t.x) / n + "px", document.body.style.top = -(r.y + t.y) / n + "px", document.body.style.width = n * 100 + "%", document.body.style.height = n * 100 + "%", document.body.style.zoom = n);
			e = n, document.documentElement.classList && (e === 1 ? document.documentElement.classList.remove("zoomed") : document.documentElement.classList.add("zoomed"));
		}
		function c() {
			var n = .12, i = window.innerWidth * n, a = window.innerHeight * n, o = l();
			r < a ? window.scroll(o.x, o.y - (1 - r / a) * (14 / e)) : r > window.innerHeight - a && window.scroll(o.x, o.y + (1 - (window.innerHeight - r) / a) * (14 / e)), t < i ? window.scroll(o.x - (1 - t / i) * (14 / e), o.y) : t > window.innerWidth - i && window.scroll(o.x + (1 - (window.innerWidth - t) / i) * (14 / e), o.y);
		}
		function l() {
			return {
				x: window.scrollX === void 0 ? window.pageXOffset : window.scrollX,
				y: window.scrollY === void 0 ? window.pageYOffset : window.scrollY
			};
		}
		return {
			to: function(t) {
				if (e !== 1) n.out();
				else {
					if (t.x = t.x || 0, t.y = t.y || 0, t.element) {
						var r = 20, o = t.element.getBoundingClientRect();
						t.x = o.left - r, t.y = o.top - r, t.width = o.width + r * 2, t.height = o.height + r * 2;
					}
					t.width !== void 0 && t.height !== void 0 && (t.scale = Math.max(Math.min(window.innerWidth / t.width, window.innerHeight / t.height), 1)), t.scale > 1 && (t.x *= t.scale, t.y *= t.scale, s(t, t.scale), t.pan !== !1 && (i = setTimeout(function() {
						a = setInterval(c, 1e3 / 60);
					}, 800)));
				}
			},
			out: function() {
				clearTimeout(i), clearInterval(a), s({
					x: 0,
					y: 0
				}, 1), e = 1;
			},
			magnify: function(e) {
				this.to(e);
			},
			reset: function() {
				this.out();
			},
			zoomLevel: function() {
				return e;
			}
		};
	})(), r = t;
	//#endregion
	//#region node_modules/reveal.js/dist/plugin/search.mjs
	var e = () => {
		let e, t, n, r, i, a, o;
		function s() {
			t = document.createElement("div"), t.classList.add("searchbox"), t.style.position = "absolute", t.style.top = "10px", t.style.right = "10px", t.style.zIndex = 10, t.innerHTML = "<input type=\"search\" class=\"searchinput\" placeholder=\"Search...\" style=\"vertical-align: top;\"/>\n		</span>", n = t.querySelector(".searchinput"), n.style.width = "240px", n.style.fontSize = "14px", n.style.padding = "4px 6px", n.style.color = "#000", n.style.background = "#fff", n.style.borderRadius = "2px", n.style.border = "0", n.style.outline = "0", n.style.boxShadow = "0 2px 18px rgba(0, 0, 0, 0.2)", n.style["-webkit-appearance"] = "none", e.getRevealElement().appendChild(t), n.addEventListener("keyup", function(e) {
				switch (e.keyCode) {
					case 13:
						e.preventDefault(), d(), a = !1;
						break;
					default: a = !0;
				}
			}, !1), l();
		}
		function c() {
			t || s(), t.style.display = "inline", n.focus(), n.select();
		}
		function l() {
			t || s(), t.style.display = "none", o && o.remove();
		}
		function u() {
			t || s(), t.style.display === "inline" ? l() : c();
		}
		function d() {
			if (a) {
				var t = n.value;
				t === "" ? (o && o.remove(), r = null) : (o = new f("slidecontent"), r = o.apply(t), i = 0);
			}
			r && (r.length && r.length <= i && (i = 0), r.length > i && (e.slide(r[i].h, r[i].v), i++));
		}
		function f(t, n) {
			var r = document.getElementById(t) || document.body, i = n || "EM", a = RegExp("^(?:" + i + "|SCRIPT|FORM)$"), o = [
				"#ff6",
				"#a0ffff",
				"#9f9",
				"#f99",
				"#f6f"
			], s = [], c = 0, l = "", u = [];
			this.setRegex = function(e) {
				e = e.trim(), l = RegExp("(" + e + ")", "i");
			}, this.getRegex = function() {
				return l.toString().replace(/^\/\\b\(|\)\\b\/i$/g, "").replace(/\|/g, " ");
			}, this.hiliteWords = function(t) {
				if (!(t == null || !t) && l && !a.test(t.nodeName)) {
					if (t.hasChildNodes()) for (var n = 0; n < t.childNodes.length; n++) this.hiliteWords(t.childNodes[n]);
					if (t.nodeType == 3) {
						var r, d;
						if ((r = t.nodeValue) && (d = l.exec(r))) {
							for (var f = t; f != null && f.nodeName != "SECTION";) f = f.parentNode;
							for (var p = e.getIndices(f), m = u.length, h = !1, n = 0; n < m; n++) u[n].h === p.h && u[n].v === p.v && (h = !0);
							h || u.push(p), s[d[0].toLowerCase()] || (s[d[0].toLowerCase()] = o[c++ % o.length]);
							var g = document.createElement(i);
							g.appendChild(document.createTextNode(d[0])), g.style.backgroundColor = s[d[0].toLowerCase()], g.style.fontStyle = "inherit", g.style.color = "#000";
							var _ = t.splitText(d.index);
							_.nodeValue = _.nodeValue.substring(d[0].length), t.parentNode.insertBefore(g, _);
						}
					}
				}
			}, this.remove = function() {
				for (var e = document.getElementsByTagName(i), t; e.length && (t = e[0]);) t.parentNode.replaceChild(t.firstChild, t);
			}, this.apply = function(e) {
				if (!(e == null || !e)) return this.remove(), this.setRegex(e), this.hiliteWords(r), u;
			};
		}
		return {
			id: "search",
			init: (t) => {
				e = t, e.registerKeyboardShortcut("CTRL + Shift + F", "Search"), document.addEventListener("keydown", function(e) {
					e.key == "F" && (e.ctrlKey || e.metaKey) && (e.preventDefault(), u());
				}, !1);
			},
			open: c,
			close: l,
			toggle: u
		};
	};
	//#endregion
	//#region node_modules/reveal.js-remote/plugin/remote.js
	var beforeSyncHook = null;
	var multiplexPaused = false;
	var _sendMultiplexStateRef = null;
	var _socket = null;
	var init = (reveal) => {
		let socket;
		let link;
		let image;
		let div;
		const listeners = {};
		let pluginConfig = {
			server: window.location.protocol + "//" + window.location.host,
			shareUrl: window.location.href,
			path: "/socket.io",
			multiplex: true,
			remote: true,
			allowSwipe: true,
			suppressInOverview: false
		};
		let config;
		function extend(a, b) {
			for (const i in b) a[i] = b[i];
			return a;
		}
		function init() {
			config = reveal.getConfig();
			if (typeof config.remote === "object") pluginConfig = extend(pluginConfig, config.remote);
			if (pluginConfig.multiplex === false && pluginConfig.remote === false) return;
			console.log("Remote: connecting to", pluginConfig.server + pluginConfig.path);
			socket = xt.connect(pluginConfig.server, { path: pluginConfig.path });
			_socket = socket;
			socket.on("connect_error", function(err) {
				console.warn("Remote: Could not connect to socket.io-remote server", err);
			});
			socket.on("reconnect_error", function(err) {
				console.warn("Remote: Could not reconnect to socket.io-remote server", err);
			});
			socket.on("connect_timeout", function() {
				console.warn("Remote: Could not connect to socket.io-remote server (timeout)");
			});
			socket.on("reconnect_failed", function(err) {
				console.warn("Remote: Could not reconnect to socket.io-remote server - this was the last try, giving up", err);
			});
			socket.on("error", function(err) {
				console.warn("Remote: Unknown error in socket.io", err);
			});
			socket.on("connect", onConnect);
			socket.on("init", msgInit);
			socket.on("client_connected", msgClientConnected);
			if (pluginConfig.multiplex && config.remoteMultiplexId !== void 0) {
				socket.on("multiplex", msgSync);
				reveal.addEventListener("ready", function() {
					if (pendingMultiplexState) {
						const data = pendingMultiplexState;
						pendingMultiplexState = null;
						applyMultiplexState(data);
					}
				});
				reveal.configure({
					controls: false,
					keyboard: false,
					touch: false,
					help: false
				});
			}
			if (pluginConfig.remote) {
				socket.on("command", msgCommand);
				on("next", reveal.next);
				on("prev", reveal.prev);
				on("up", reveal.up);
				on("down", reveal.down);
				on("left", reveal.left);
				on("right", reveal.right);
				on("overview", reveal.toggleOverview);
				on("pause", reveal.togglePause);
				on("autoslide", reveal.toggleAutoSlide);
			}
			createPopup();
			console.info("Remote: Starting connection");
		}
		const onConnect = () => {
			console.info("Remote: Connected - sending welcome message");
			if (config.remoteMultiplexId === void 0) {
				const data = {
					type: "presenter",
					shareUrl: typeof pluginConfig.normalizeShareUrl === "function" ? pluginConfig.normalizeShareUrl(pluginConfig.shareUrl) : pluginConfig.shareUrl
				};
				if (window.localStorage) {
					const hashes = JSON.parse(window.localStorage.getItem("presentations") || "{}");
					const hashUrl = pluginConfig.shareUrl.replace(/#.*/, "");
					if (hashes.hasOwnProperty(hashUrl)) {
						data.hash = hashes[hashUrl].hash;
						data.remoteId = hashes[hashUrl].remoteId;
						data.multiplexId = hashes[hashUrl].multiplexId;
					}
				}
				socket.emit("start", data);
			} else socket.emit("start", {
				type: "follower",
				id: config.remoteMultiplexId
			});
		};
		function createPopup() {
			const body = document.getElementsByTagName("body")[0];
			const inner = document.createElement("div");
			link = document.createElement("a");
			image = document.createElement("img");
			div = document.createElement("div");
			div.class = "remote-qr-overlay";
			div.style.display = "none";
			div.style.position = "fixed";
			div.style.left = "0";
			div.style.top = "0";
			div.style.bottom = "0";
			div.style.right = "0";
			div.style.zIndex = "1000";
			div.style.alignItems = "center";
			div.style.justifyContent = "center";
			inner.style.padding = "50px";
			inner.style.borderRadius = "50px";
			inner.style.textAlign = "center";
			inner.style.background = "rgba(255, 255, 255, .9)";
			link.target = "_blank";
			link.style.fontSize = "200%";
			image.style.border = "20px solid white";
			div.appendChild(inner);
			inner.appendChild(link);
			link.appendChild(image);
			link.appendChild(document.createElement("br"));
			link.appendChild(document.createElement("br"));
			link.appendChild(document.createTextNode("Or share this link"));
			body.appendChild(div);
		}
		const togglePopup = (imageData, url) => {
			if (link.href === url && div.style.display !== "none") div.style.display = "none";
			else {
				image.src = imageData;
				link.href = url;
				div.style.display = "flex";
			}
		};
		const msgInit = (data) => {
			if (pluginConfig.remote) {
				reveal.addKeyBinding({
					keyCode: 82,
					key: "R",
					description: "Show remote control url"
				}, () => {
					togglePopup(data.remoteImage, data.remoteUrl);
				});
				reveal.addEventListener("overviewshown", sendRemoteState);
				reveal.addEventListener("overviewhidden", sendRemoteState);
				reveal.addEventListener("paused", sendRemoteState);
				reveal.addEventListener("resumed", sendRemoteState);
				reveal.addEventListener("autoslidepaused", sendRemoteState);
				reveal.addEventListener("autoslideresumed", sendRemoteState);
				reveal.addEventListener("overviewshown", sendRemoteState);
				reveal.addEventListener("overviewhidden", sendRemoteState);
				reveal.addEventListener("slidechanged", sendRemoteFullState);
				sendRemoteFullState();
			}
			if (pluginConfig.multiplex) {
				reveal.addKeyBinding({
					keyCode: 65,
					key: "A",
					description: "Show share url"
				}, function() {
					togglePopup(data.multiplexImage, data.multiplexUrl);
				});
				window.addEventListener("load", sendMultiplexState);
				reveal.addEventListener("slidechanged", sendMultiplexState);
				reveal.addEventListener("fragmentshown", sendMultiplexState);
				reveal.addEventListener("fragmenthidden", sendMultiplexState);
				reveal.addEventListener("overviewhidden", sendMultiplexState);
				reveal.addEventListener("overviewshown", sendMultiplexState);
				reveal.addEventListener("paused", sendMultiplexState);
				reveal.addEventListener("resumed", sendMultiplexState);
				reveal.addEventListener("enable-zoom", sendMultiplexState);
				reveal.addEventListener("disable-zoom", sendMultiplexState);
				sendMultiplexState();
			}
			if (window.localStorage) {
				const hashes = JSON.parse(window.localStorage.getItem("presentations") || "{}");
				const hashUrl = pluginConfig.shareUrl.replace(/#.*/, "");
				hashes[hashUrl] = {
					hash: data.hash,
					remoteId: data.remoteId,
					multiplexId: data.multiplexId
				};
				window.localStorage.setItem("presentations", JSON.stringify(hashes));
			}
		};
		function sendRemoteFullState() {
			if (!reveal.getCurrentSlide()) return;
			if (pluginConfig.suppressInOverview && reveal.isOverview()) return;
			socket.emit("notes_changed", { text: reveal.getSlideNotes() });
			sendRemoteState();
		}
		function sendRemoteState() {
			if (pluginConfig.suppressInOverview && reveal.isOverview()) return;
			socket.emit("state_changed", {
				isFirstSlide: reveal.isFirstSlide(),
				isLastSlide: reveal.isLastSlide(),
				isOverview: reveal.isOverview(),
				isPaused: reveal.isPaused(),
				isAutoSliding: reveal.isAutoSliding(),
				progress: reveal.getProgress(),
				slideCount: reveal.getTotalSlides(),
				indices: reveal.getIndices(),
				availableRoutes: reveal.availableRoutes(),
				autoslide: typeof config.autoSlide === "number" && config.autoSlide > 0 && (typeof config.autoSlideStoppable !== "boolean" || !config.autoSlideStoppable),
				allowSwipe: pluginConfig.allowSwipe
			});
		}
		function sendMultiplexState() {
			if (pluginConfig.suppressInOverview && reveal.isOverview()) return;
			if (multiplexPaused) return;
			const state = reveal.getState();
			const zoomPlugin = reveal.getPlugin("remote-zoom-sync") || reveal.getPlugin("remote-zoom");
			const zoom = zoomPlugin ? zoomPlugin.getCurrentZoom() : null;
			socket.emit("multiplex", {
				state,
				zoom
			});
		}
		function msgClientConnected() {
			div.style.display = "none";
		}
		let pendingMultiplexState = null;
		function applyMultiplexState(data) {
			const zoomPlugin = reveal.getPlugin("remote-zoom-sync") || reveal.getPlugin("remote-zoom");
			reveal.setState(data.state);
			if (zoomPlugin) zoomPlugin.setCurrentZoom(data.zoom);
		}
		async function msgSync(data) {
			if (!reveal.isReady()) {
				pendingMultiplexState = data;
				return;
			}
			if (beforeSyncHook) {
				if (await beforeSyncHook(data) === false) return;
			}
			applyMultiplexState(data);
		}
		function on(cmd, fn) {
			listeners[cmd] = fn;
		}
		function navigateToAnchor(anchor) {
			const slashIndexMatch = anchor.match(/^#\/(\d+)(?:\/(\d+))?$/);
			if (slashIndexMatch) {
				reveal.slide(parseInt(slashIndexMatch[1], 10), slashIndexMatch[2] !== void 0 ? parseInt(slashIndexMatch[2], 10) : 0);
				return;
			}
			const bareIndexMatch = anchor.match(/^#(\d+)$/);
			if (bareIndexMatch) {
				const zeroBasedIndex = parseInt(bareIndexMatch[1], 10) - 1;
				reveal.slide(zeroBasedIndex, 0);
				return;
			}
			const id = anchor.replace(/^#\/?/, "");
			try {
				const el = document.getElementById(id) || document.querySelector(anchor);
				if (el) {
					const slideEl = el.closest("section");
					if (slideEl) {
						const indices = reveal.getIndices(slideEl);
						reveal.slide(indices.h, indices.v);
					}
				}
			} catch (e) {
				console.warn("Remote: goto-anchor failed for", anchor, e);
			}
		}
		function msgCommand(data) {
			const cmd = data.command;
			if (cmd === "goto-anchor" && data.anchor) {
				navigateToAnchor(data.anchor);
				return;
			}
			if (cmd === "goto-slide" && typeof data.h === "number") {
				const v = typeof data.v === "number" ? data.v : 0;
				reveal.slide(data.h, v);
				return;
			}
			if (listeners.hasOwnProperty(cmd)) listeners[cmd]();
			else console.log("Remote: No listener registered for", cmd, Object.keys(listeners));
		}
		_sendMultiplexStateRef = sendMultiplexState;
		init();
	};
	var remote_default = () => ({
		id: "RevealRemote",
		init,
		onBeforeSync(fn) {
			beforeSyncHook = fn;
		},
		setMultiplexPaused(paused) {
			multiplexPaused = !!paused;
		},
		isMultiplexPaused() {
			return multiplexPaused;
		},
		sendCurrentState() {
			if (_sendMultiplexStateRef) _sendMultiplexStateRef();
		},
		sendMessage(type, data) {
			if (_socket) _socket.emit(type, data);
		},
		onMessage(type, fn) {
			if (_socket) _socket.on(type, fn);
		}
	});
	//#endregion
	//#region node_modules/reveal.js-remote/plugin/remotezoomsync.js
	var remotezoomsync_default = (options = {}) => {
		let reveal = null;
		let currentZoom = null;
		let currentSlideElement = null;
		let lastAppliedZoom = null;
		let isRemoteZoom = false;
		const isFollower = options.isFollower || false;
		function setupForSlideElement(element) {
			currentSlideElement = element;
		}
		return {
			id: "remote-zoom-sync",
			init: (initReveal) => {
				reveal = initReveal;
				reveal.addEventListener("slidechanged", (e) => {
					setupForSlideElement(e.currentSlide);
				});
				reveal.addEventListener("ready", (e) => {
					setupForSlideElement(e.currentSlide);
					if (isFollower) lastAppliedZoom = null;
				});
				if (isFollower) {
					function onFollowerCtrlClick(e) {
						if ((e.ctrlKey || e.metaKey) && e.button === 0 && !isRemoteZoom) {
							e.preventDefault();
							e.stopPropagation();
						}
					}
					document.addEventListener("mousedown", onFollowerCtrlClick, true);
					reveal.on("enable-zoom", (e) => {
						const focus = e.detail?.focus || e.focus;
						if (!currentSlideElement || !focus) return;
						const rect = currentSlideElement.getBoundingClientRect();
						const clickX = rect.left + focus.x / 100 * rect.width;
						const clickY = rect.top + focus.y / 100 * rect.height;
						const syntheticEvent = new MouseEvent("mousedown", {
							bubbles: true,
							cancelable: true,
							ctrlKey: true,
							altKey: true,
							metaKey: true,
							clientX: clickX,
							clientY: clickY,
							button: 0,
							view: window
						});
						isRemoteZoom = true;
						reveal.getRevealElement().dispatchEvent(syntheticEvent);
						isRemoteZoom = false;
					});
					reveal.on("disable-zoom", () => {
						if (!currentSlideElement) return;
						const syntheticEvent = new KeyboardEvent("keydown", {
							bubbles: true,
							cancelable: true,
							key: "Escape"
						});
						document.dispatchEvent(syntheticEvent);
					});
					reveal.on("overviewshown", () => {
						if (!currentSlideElement) return;
						const syntheticEvent = new KeyboardEvent("keydown", {
							bubbles: true,
							cancelable: true,
							key: "Escape"
						});
						document.dispatchEvent(syntheticEvent);
					});
				} else {
					function onMouseDown(e) {
						if ((e.ctrlKey || e.metaKey) && currentSlideElement && e.button === 0) {
							const rect = currentSlideElement.getBoundingClientRect();
							const clickX = e.clientX - rect.left;
							const clickY = e.clientY - rect.top;
							const focus = {
								x: Math.max(0, Math.min(100, Math.round(clickX / rect.width * 100))),
								y: Math.max(0, Math.min(100, Math.round(clickY / rect.height * 100)))
							};
							currentZoom = focus;
							reveal.dispatchEvent({
								type: "enable-zoom",
								focus
							});
						}
					}
					function onKeyDown(e) {
						if (e.key === "Escape" && currentZoom !== null) {
							currentZoom = null;
							reveal.dispatchEvent({ type: "disable-zoom" });
						}
					}
					document.addEventListener("mousedown", onMouseDown, true);
					document.addEventListener("keydown", onKeyDown, true);
					reveal.addEventListener("overviewshown", () => {
						if (currentZoom !== null) {
							currentZoom = null;
							reveal.dispatchEvent({ type: "disable-zoom" });
						}
					});
				}
			},
			getCurrentZoom: () => currentZoom,
			setCurrentZoom: (focus) => {
				if (!isFollower || !currentSlideElement) return;
				if (focus === null) {
					if (lastAppliedZoom !== null) {
						lastAppliedZoom = null;
						document.dispatchEvent(new KeyboardEvent("keydown", {
							key: "Escape",
							bubbles: true,
							cancelable: true
						}));
					}
				} else if (lastAppliedZoom === null || lastAppliedZoom.x !== focus.x || lastAppliedZoom.y !== focus.y) {
					const rect = currentSlideElement.getBoundingClientRect();
					const clickX = rect.left + focus.x / 100 * rect.width;
					const clickY = rect.top + focus.y / 100 * rect.height;
					const syntheticEvent = new MouseEvent("mousedown", {
						bubbles: true,
						cancelable: true,
						ctrlKey: true,
						altKey: true,
						metaKey: true,
						clientX: clickX,
						clientY: clickY,
						button: 0,
						view: window
					});
					isRemoteZoom = true;
					reveal.getRevealElement().dispatchEvent(syntheticEvent);
					isRemoteZoom = false;
					lastAppliedZoom = {
						x: focus.x,
						y: focus.y
					};
				}
			}
		};
	};
	//#endregion
	//#region js/slide-labels/plugin.js
	/*!
	* reveal.js Slide Labels plugin
	*
	* Reads the first h1/h2/h3 inside <aside class="notes"> for each slide
	* and renders it as a visible label bar on the slide tile in overview mode.
	* The label is invisible during normal presentation.
	*/
	var Plugin = {
		id: "slide-labels",
		init(reveal) {
			const style = document.createElement("style");
			style.textContent = `
			.reveal .slide-label {
				display: none;
				position: absolute;
				bottom: 0;
				left: 0;
				right: 0;
				background: rgba(0, 0, 0, 0.72);
				color: #fff;
				font-weight: bold;
				font-size: 1.4em;
				line-height: 1;
				padding: 0.35em 0.6em;
				text-align: center;
				pointer-events: none;
				z-index: 100;
				box-sizing: border-box;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
			.reveal.overview .slide-label {
				display: block;
			}
		`;
			document.head.appendChild(style);
			reveal.addEventListener("ready", () => {
				reveal.getRevealElement().querySelectorAll(".slides section:not(.stack)").forEach((slide) => {
					const notes = slide.querySelector("aside.notes");
					if (!notes) return;
					const heading = notes.querySelector("h1, h2, h3");
					if (!heading) return;
					const label = document.createElement("div");
					label.className = "slide-label";
					label.textContent = heading.textContent.trim();
					slide.appendChild(label);
				});
			});
		}
	};
	var plugin_default = () => Plugin;
	//#endregion
	//#region js/smart-quotes.js
	function convertSmartQuotes(text) {
		const codeSpans = [];
		const codeBlocks = [];
		const htmlTags = [];
		const htmlComments = [];
		const macros = [];
		const protectFencedCodeBlocks = (source, onBlock) => {
			const chunks = String(source || "").match(/.*?(?:\r?\n|$)/g) || [];
			let output = "";
			let inFence = false;
			let fenceChar = "";
			let fenceLength = 0;
			let fenceBuffer = "";
			for (const chunk of chunks) {
				if (chunk === "") continue;
				const line = chunk.replace(/\r?\n$/, "");
				if (!inFence) {
					const openMatch = line.match(/^\s{0,3}((`{3,}|~{3,}))[ \t]*.*$/);
					if (openMatch) {
						const fence = openMatch[1];
						inFence = true;
						fenceChar = fence[0];
						fenceLength = fence.length;
						fenceBuffer = chunk;
						continue;
					}
					output += chunk;
					continue;
				}
				fenceBuffer += chunk;
				const closeMatch = line.match(/^\s{0,3}([`~]{3,})[ \t]*$/);
				if (closeMatch && closeMatch[1][0] === fenceChar && closeMatch[1].length >= fenceLength) {
					output += onBlock(fenceBuffer);
					inFence = false;
					fenceChar = "";
					fenceLength = 0;
					fenceBuffer = "";
				}
			}
			if (inFence && fenceBuffer) output += fenceBuffer;
			return output;
		};
		let i = 0;
		text = protectFencedCodeBlocks(text, (m) => {
			codeBlocks.push(m);
			return `@@CODEBLOCK${i++}@@`;
		});
		text = text.replace(/`[^`\n]*`/g, (m) => {
			codeSpans.push(m);
			return `@@CODESPAN${i++}@@`;
		}).replace(/<!--[\s\S]*?-->/g, (m) => {
			htmlComments.push(m);
			return `@@COMMENT${i++}@@`;
		}).replace(/<[^>]+>/g, (m) => {
			htmlTags.push(m);
			return `@@TAG${i++}@@`;
		}).replace(/\{\{[^}]+\}\}/g, (m) => {
			macros.push(m);
			return `@@MACRO${i++}@@`;
		});
		text = text.replace(/(\W|^)"(?=\S)/g, "$1“").replace(/"(?=\W|$)/g, "”").replace(/(\W|^)'(?=\S)/g, "$1‘").replace(/'(?=\W|$)/g, "’");
		i = 0;
		text = text.replace(/@@CODESPAN\d+@@/g, () => codeSpans.shift()).replace(/@@COMMENT\d+@@/g, () => htmlComments.shift()).replace(/@@TAG\d+@@/g, () => htmlTags.shift()).replace(/@@MACRO\d+@@/g, () => macros.shift()).replace(/@@CODEBLOCK\d+@@/g, () => codeBlocks.shift());
		return text;
	}
	//#endregion
	//#region node_modules/js-yaml/dist/js-yaml.mjs
	var js_yaml_exports = /* @__PURE__ */ __exportAll({
		CORE_SCHEMA: () => CORE_SCHEMA,
		DEFAULT_SCHEMA: () => DEFAULT_SCHEMA,
		FAILSAFE_SCHEMA: () => FAILSAFE_SCHEMA,
		JSON_SCHEMA: () => JSON_SCHEMA,
		Schema: () => Schema,
		Type: () => Type,
		YAMLException: () => YAMLException,
		default: () => index_vite_proxy_tmp_default,
		dump: () => dump,
		load: () => load,
		loadAll: () => loadAll,
		safeDump: () => safeDump,
		safeLoad: () => safeLoad,
		safeLoadAll: () => safeLoadAll,
		types: () => types
	});
	var __create, __defProp, __getOwnPropDesc, __getOwnPropNames, __getProtoOf, __hasOwnProp, __commonJSMin, __copyProps, __toESM, require_common, require_exception, require_snippet, require_type, require_schema, require_str, require_seq, require_map, require_failsafe, require_null, require_bool, require_int, require_float, require_json, require_core, require_timestamp, require_merge, require_binary, require_omap, require_pairs, require_set, require_default, require_loader, require_dumper, import_js_yaml, Type, Schema, FAILSAFE_SCHEMA, JSON_SCHEMA, CORE_SCHEMA, DEFAULT_SCHEMA, load, loadAll, dump, YAMLException, types, safeLoad, safeLoadAll, safeDump, index_vite_proxy_tmp_default;
	var init_js_yaml = __esmMin((() => {
		__create = Object.create;
		__defProp = Object.defineProperty;
		__getOwnPropDesc = Object.getOwnPropertyDescriptor;
		__getOwnPropNames = Object.getOwnPropertyNames;
		__getProtoOf = Object.getPrototypeOf;
		__hasOwnProp = Object.prototype.hasOwnProperty;
		__commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
		__copyProps = (to, from, except, desc) => {
			/*! js-yaml 4.2.0 https://github.com/nodeca/js-yaml @license MIT */
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		__toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		require_common = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			function isNothing(subject) {
				return typeof subject === "undefined" || subject === null;
			}
			function isObject(subject) {
				return typeof subject === "object" && subject !== null;
			}
			function toArray(sequence) {
				if (Array.isArray(sequence)) return sequence;
				else if (isNothing(sequence)) return [];
				return [sequence];
			}
			function extend(target, source) {
				if (source) {
					const sourceKeys = Object.keys(source);
					for (let index = 0, length = sourceKeys.length; index < length; index += 1) {
						const key = sourceKeys[index];
						target[key] = source[key];
					}
				}
				return target;
			}
			function repeat(string, count) {
				let result = "";
				for (let cycle = 0; cycle < count; cycle += 1) result += string;
				return result;
			}
			function isNegativeZero(number) {
				return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
			}
			module.exports.isNothing = isNothing;
			module.exports.isObject = isObject;
			module.exports.toArray = toArray;
			module.exports.repeat = repeat;
			module.exports.isNegativeZero = isNegativeZero;
			module.exports.extend = extend;
		}));
		require_exception = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			function formatError(exception, compact) {
				let where = "";
				const message = exception.reason || "(unknown reason)";
				if (!exception.mark) return message;
				if (exception.mark.name) where += "in \"" + exception.mark.name + "\" ";
				where += "(" + (exception.mark.line + 1) + ":" + (exception.mark.column + 1) + ")";
				if (!compact && exception.mark.snippet) where += "\n\n" + exception.mark.snippet;
				return message + " " + where;
			}
			function YAMLException(reason, mark) {
				Error.call(this);
				this.name = "YAMLException";
				this.reason = reason;
				this.mark = mark;
				this.message = formatError(this, false);
				if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
				else this.stack = (/* @__PURE__ */ new Error()).stack || "";
			}
			YAMLException.prototype = Object.create(Error.prototype);
			YAMLException.prototype.constructor = YAMLException;
			YAMLException.prototype.toString = function toString(compact) {
				return this.name + ": " + formatError(this, compact);
			};
			module.exports = YAMLException;
		}));
		require_snippet = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			var common = require_common();
			function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
				let head = "";
				let tail = "";
				const maxHalfLength = Math.floor(maxLineLength / 2) - 1;
				if (position - lineStart > maxHalfLength) {
					head = " ... ";
					lineStart = position - maxHalfLength + head.length;
				}
				if (lineEnd - position > maxHalfLength) {
					tail = " ...";
					lineEnd = position + maxHalfLength - tail.length;
				}
				return {
					str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "→") + tail,
					pos: position - lineStart + head.length
				};
			}
			function padStart(string, max) {
				return common.repeat(" ", max - string.length) + string;
			}
			function makeSnippet(mark, options) {
				options = Object.create(options || null);
				if (!mark.buffer) return null;
				if (!options.maxLength) options.maxLength = 79;
				if (typeof options.indent !== "number") options.indent = 1;
				if (typeof options.linesBefore !== "number") options.linesBefore = 3;
				if (typeof options.linesAfter !== "number") options.linesAfter = 2;
				const re = /\r?\n|\r|\0/g;
				const lineStarts = [0];
				const lineEnds = [];
				let match;
				let foundLineNo = -1;
				while (match = re.exec(mark.buffer)) {
					lineEnds.push(match.index);
					lineStarts.push(match.index + match[0].length);
					if (mark.position <= match.index && foundLineNo < 0) foundLineNo = lineStarts.length - 2;
				}
				if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
				let result = "";
				const lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
				const maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
				for (let i = 1; i <= options.linesBefore; i++) {
					if (foundLineNo - i < 0) break;
					const line = getLine(mark.buffer, lineStarts[foundLineNo - i], lineEnds[foundLineNo - i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]), maxLineLength);
					result = common.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line.str + "\n" + result;
				}
				const line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
				result += common.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
				result += common.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
				for (let i = 1; i <= options.linesAfter; i++) {
					if (foundLineNo + i >= lineEnds.length) break;
					const line = getLine(mark.buffer, lineStarts[foundLineNo + i], lineEnds[foundLineNo + i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]), maxLineLength);
					result += common.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line.str + "\n";
				}
				return result.replace(/\n$/, "");
			}
			module.exports = makeSnippet;
		}));
		require_type = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			var YAMLException = require_exception();
			var TYPE_CONSTRUCTOR_OPTIONS = [
				"kind",
				"multi",
				"resolve",
				"construct",
				"instanceOf",
				"predicate",
				"represent",
				"representName",
				"defaultStyle",
				"styleAliases"
			];
			var YAML_NODE_KINDS = [
				"scalar",
				"sequence",
				"mapping"
			];
			function compileStyleAliases(map) {
				const result = {};
				if (map !== null) Object.keys(map).forEach(function(style) {
					map[style].forEach(function(alias) {
						result[String(alias)] = style;
					});
				});
				return result;
			}
			function Type(tag, options) {
				options = options || {};
				Object.keys(options).forEach(function(name) {
					if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) throw new YAMLException("Unknown option \"" + name + "\" is met in definition of \"" + tag + "\" YAML type.");
				});
				this.options = options;
				this.tag = tag;
				this.kind = options["kind"] || null;
				this.resolve = options["resolve"] || function() {
					return true;
				};
				this.construct = options["construct"] || function(data) {
					return data;
				};
				this.instanceOf = options["instanceOf"] || null;
				this.predicate = options["predicate"] || null;
				this.represent = options["represent"] || null;
				this.representName = options["representName"] || null;
				this.defaultStyle = options["defaultStyle"] || null;
				this.multi = options["multi"] || false;
				this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
				if (YAML_NODE_KINDS.indexOf(this.kind) === -1) throw new YAMLException("Unknown kind \"" + this.kind + "\" is specified for \"" + tag + "\" YAML type.");
			}
			module.exports = Type;
		}));
		require_schema = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			var YAMLException = require_exception();
			var Type = require_type();
			function compileList(schema, name) {
				const result = [];
				schema[name].forEach(function(currentType) {
					let newIndex = result.length;
					result.forEach(function(previousType, previousIndex) {
						if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) newIndex = previousIndex;
					});
					result[newIndex] = currentType;
				});
				return result;
			}
			function compileMap() {
				const result = {
					scalar: {},
					sequence: {},
					mapping: {},
					fallback: {},
					multi: {
						scalar: [],
						sequence: [],
						mapping: [],
						fallback: []
					}
				};
				function collectType(type) {
					if (type.multi) {
						result.multi[type.kind].push(type);
						result.multi["fallback"].push(type);
					} else result[type.kind][type.tag] = result["fallback"][type.tag] = type;
				}
				for (let index = 0, length = arguments.length; index < length; index += 1) arguments[index].forEach(collectType);
				return result;
			}
			function Schema(definition) {
				return this.extend(definition);
			}
			Schema.prototype.extend = function extend(definition) {
				let implicit = [];
				let explicit = [];
				if (definition instanceof Type) explicit.push(definition);
				else if (Array.isArray(definition)) explicit = explicit.concat(definition);
				else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
					if (definition.implicit) implicit = implicit.concat(definition.implicit);
					if (definition.explicit) explicit = explicit.concat(definition.explicit);
				} else throw new YAMLException("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
				implicit.forEach(function(type) {
					if (!(type instanceof Type)) throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
					if (type.loadKind && type.loadKind !== "scalar") throw new YAMLException("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
					if (type.multi) throw new YAMLException("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
				});
				explicit.forEach(function(type) {
					if (!(type instanceof Type)) throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
				});
				const result = Object.create(Schema.prototype);
				result.implicit = (this.implicit || []).concat(implicit);
				result.explicit = (this.explicit || []).concat(explicit);
				result.compiledImplicit = compileList(result, "implicit");
				result.compiledExplicit = compileList(result, "explicit");
				result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
				return result;
			};
			module.exports = Schema;
		}));
		require_str = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = new (require_type())("tag:yaml.org,2002:str", {
				kind: "scalar",
				construct: function(data) {
					return data !== null ? data : "";
				}
			});
		}));
		require_seq = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = new (require_type())("tag:yaml.org,2002:seq", {
				kind: "sequence",
				construct: function(data) {
					return data !== null ? data : [];
				}
			});
		}));
		require_map = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = new (require_type())("tag:yaml.org,2002:map", {
				kind: "mapping",
				construct: function(data) {
					return data !== null ? data : {};
				}
			});
		}));
		require_failsafe = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = new (require_schema())({ explicit: [
				require_str(),
				require_seq(),
				require_map()
			] });
		}));
		require_null = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			var Type = require_type();
			function resolveYamlNull(data) {
				if (data === null) return true;
				const max = data.length;
				return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
			}
			function constructYamlNull() {
				return null;
			}
			function isNull(object) {
				return object === null;
			}
			module.exports = new Type("tag:yaml.org,2002:null", {
				kind: "scalar",
				resolve: resolveYamlNull,
				construct: constructYamlNull,
				predicate: isNull,
				represent: {
					canonical: function() {
						return "~";
					},
					lowercase: function() {
						return "null";
					},
					uppercase: function() {
						return "NULL";
					},
					camelcase: function() {
						return "Null";
					},
					empty: function() {
						return "";
					}
				},
				defaultStyle: "lowercase"
			});
		}));
		require_bool = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			var Type = require_type();
			function resolveYamlBoolean(data) {
				if (data === null) return false;
				const max = data.length;
				return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
			}
			function constructYamlBoolean(data) {
				return data === "true" || data === "True" || data === "TRUE";
			}
			function isBoolean(object) {
				return Object.prototype.toString.call(object) === "[object Boolean]";
			}
			module.exports = new Type("tag:yaml.org,2002:bool", {
				kind: "scalar",
				resolve: resolveYamlBoolean,
				construct: constructYamlBoolean,
				predicate: isBoolean,
				represent: {
					lowercase: function(object) {
						return object ? "true" : "false";
					},
					uppercase: function(object) {
						return object ? "TRUE" : "FALSE";
					},
					camelcase: function(object) {
						return object ? "True" : "False";
					}
				},
				defaultStyle: "lowercase"
			});
		}));
		require_int = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			var common = require_common();
			var Type = require_type();
			function isHexCode(c) {
				return c >= 48 && c <= 57 || c >= 65 && c <= 70 || c >= 97 && c <= 102;
			}
			function isOctCode(c) {
				return c >= 48 && c <= 55;
			}
			function isDecCode(c) {
				return c >= 48 && c <= 57;
			}
			function resolveYamlInteger(data) {
				if (data === null) return false;
				const max = data.length;
				let index = 0;
				let hasDigits = false;
				if (!max) return false;
				let ch = data[index];
				if (ch === "-" || ch === "+") ch = data[++index];
				if (ch === "0") {
					if (index + 1 === max) return true;
					ch = data[++index];
					if (ch === "b") {
						index++;
						for (; index < max; index++) {
							ch = data[index];
							if (ch !== "0" && ch !== "1") return false;
							hasDigits = true;
						}
						return hasDigits && Number.isFinite(parseYamlInteger(data));
					}
					if (ch === "x") {
						index++;
						for (; index < max; index++) {
							if (!isHexCode(data.charCodeAt(index))) return false;
							hasDigits = true;
						}
						return hasDigits && Number.isFinite(parseYamlInteger(data));
					}
					if (ch === "o") {
						index++;
						for (; index < max; index++) {
							if (!isOctCode(data.charCodeAt(index))) return false;
							hasDigits = true;
						}
						return hasDigits && Number.isFinite(parseYamlInteger(data));
					}
				}
				for (; index < max; index++) {
					if (!isDecCode(data.charCodeAt(index))) return false;
					hasDigits = true;
				}
				if (!hasDigits) return false;
				return Number.isFinite(parseYamlInteger(data));
			}
			function parseYamlInteger(data) {
				let value = data;
				let sign = 1;
				let ch = value[0];
				if (ch === "-" || ch === "+") {
					if (ch === "-") sign = -1;
					value = value.slice(1);
					ch = value[0];
				}
				if (value === "0") return 0;
				if (ch === "0") {
					if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
					if (value[1] === "x") return sign * parseInt(value.slice(2), 16);
					if (value[1] === "o") return sign * parseInt(value.slice(2), 8);
				}
				return sign * parseInt(value, 10);
			}
			function constructYamlInteger(data) {
				return parseYamlInteger(data);
			}
			function isInteger(object) {
				return Object.prototype.toString.call(object) === "[object Number]" && object % 1 === 0 && !common.isNegativeZero(object);
			}
			module.exports = new Type("tag:yaml.org,2002:int", {
				kind: "scalar",
				resolve: resolveYamlInteger,
				construct: constructYamlInteger,
				predicate: isInteger,
				represent: {
					binary: function(obj) {
						return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
					},
					octal: function(obj) {
						return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
					},
					decimal: function(obj) {
						return obj.toString(10);
					},
					hexadecimal: function(obj) {
						return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
					}
				},
				defaultStyle: "decimal",
				styleAliases: {
					binary: [2, "bin"],
					octal: [8, "oct"],
					decimal: [10, "dec"],
					hexadecimal: [16, "hex"]
				}
			});
		}));
		require_float = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			var common = require_common();
			var Type = require_type();
			var YAML_FLOAT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?(?:[0-9]+)(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
			var YAML_FLOAT_SPECIAL_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
			function resolveYamlFloat(data) {
				if (data === null) return false;
				if (!YAML_FLOAT_PATTERN.test(data)) return false;
				if (Number.isFinite(parseFloat(data, 10))) return true;
				return YAML_FLOAT_SPECIAL_PATTERN.test(data);
			}
			function constructYamlFloat(data) {
				let value = data.toLowerCase();
				const sign = value[0] === "-" ? -1 : 1;
				if ("+-".indexOf(value[0]) >= 0) value = value.slice(1);
				if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
				else if (value === ".nan") return NaN;
				return sign * parseFloat(value, 10);
			}
			var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
			function representYamlFloat(object, style) {
				if (isNaN(object)) switch (style) {
					case "lowercase": return ".nan";
					case "uppercase": return ".NAN";
					case "camelcase": return ".NaN";
				}
				else if (Number.POSITIVE_INFINITY === object) switch (style) {
					case "lowercase": return ".inf";
					case "uppercase": return ".INF";
					case "camelcase": return ".Inf";
				}
				else if (Number.NEGATIVE_INFINITY === object) switch (style) {
					case "lowercase": return "-.inf";
					case "uppercase": return "-.INF";
					case "camelcase": return "-.Inf";
				}
				else if (common.isNegativeZero(object)) return "-0.0";
				const res = object.toString(10);
				return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
			}
			function isFloat(object) {
				return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
			}
			module.exports = new Type("tag:yaml.org,2002:float", {
				kind: "scalar",
				resolve: resolveYamlFloat,
				construct: constructYamlFloat,
				predicate: isFloat,
				represent: representYamlFloat,
				defaultStyle: "lowercase"
			});
		}));
		require_json = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_failsafe().extend({ implicit: [
				require_null(),
				require_bool(),
				require_int(),
				require_float()
			] });
		}));
		require_core = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_json();
		}));
		require_timestamp = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			var Type = require_type();
			var YAML_DATE_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$");
			var YAML_TIMESTAMP_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");
			function resolveYamlTimestamp(data) {
				if (data === null) return false;
				if (YAML_DATE_REGEXP.exec(data) !== null) return true;
				if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
				return false;
			}
			function constructYamlTimestamp(data) {
				let fraction = 0;
				let delta = null;
				let match = YAML_DATE_REGEXP.exec(data);
				if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
				if (match === null) throw new Error("Date resolve error");
				const year = +match[1];
				const month = +match[2] - 1;
				const day = +match[3];
				if (!match[4]) return new Date(Date.UTC(year, month, day));
				const hour = +match[4];
				const minute = +match[5];
				const second = +match[6];
				if (match[7]) {
					fraction = match[7].slice(0, 3);
					while (fraction.length < 3) fraction += "0";
					fraction = +fraction;
				}
				if (match[9]) {
					const tzHour = +match[10];
					const tzMinute = +(match[11] || 0);
					delta = (tzHour * 60 + tzMinute) * 6e4;
					if (match[9] === "-") delta = -delta;
				}
				const date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
				if (delta) date.setTime(date.getTime() - delta);
				return date;
			}
			function representYamlTimestamp(object) {
				return object.toISOString();
			}
			module.exports = new Type("tag:yaml.org,2002:timestamp", {
				kind: "scalar",
				resolve: resolveYamlTimestamp,
				construct: constructYamlTimestamp,
				instanceOf: Date,
				represent: representYamlTimestamp
			});
		}));
		require_merge = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			var Type = require_type();
			function resolveYamlMerge(data) {
				return data === "<<" || data === null;
			}
			module.exports = new Type("tag:yaml.org,2002:merge", {
				kind: "scalar",
				resolve: resolveYamlMerge
			});
		}));
		require_binary = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			var Type = require_type();
			var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
			function resolveYamlBinary(data) {
				if (data === null) return false;
				let bitlen = 0;
				const max = data.length;
				const map = BASE64_MAP;
				for (let idx = 0; idx < max; idx++) {
					const code = map.indexOf(data.charAt(idx));
					if (code > 64) continue;
					if (code < 0) return false;
					bitlen += 6;
				}
				return bitlen % 8 === 0;
			}
			function constructYamlBinary(data) {
				const input = data.replace(/[\r\n=]/g, "");
				const max = input.length;
				const map = BASE64_MAP;
				let bits = 0;
				const result = [];
				for (let idx = 0; idx < max; idx++) {
					if (idx % 4 === 0 && idx) {
						result.push(bits >> 16 & 255);
						result.push(bits >> 8 & 255);
						result.push(bits & 255);
					}
					bits = bits << 6 | map.indexOf(input.charAt(idx));
				}
				const tailbits = max % 4 * 6;
				if (tailbits === 0) {
					result.push(bits >> 16 & 255);
					result.push(bits >> 8 & 255);
					result.push(bits & 255);
				} else if (tailbits === 18) {
					result.push(bits >> 10 & 255);
					result.push(bits >> 2 & 255);
				} else if (tailbits === 12) result.push(bits >> 4 & 255);
				return new Uint8Array(result);
			}
			function representYamlBinary(object) {
				let result = "";
				let bits = 0;
				const max = object.length;
				const map = BASE64_MAP;
				for (let idx = 0; idx < max; idx++) {
					if (idx % 3 === 0 && idx) {
						result += map[bits >> 18 & 63];
						result += map[bits >> 12 & 63];
						result += map[bits >> 6 & 63];
						result += map[bits & 63];
					}
					bits = (bits << 8) + object[idx];
				}
				const tail = max % 3;
				if (tail === 0) {
					result += map[bits >> 18 & 63];
					result += map[bits >> 12 & 63];
					result += map[bits >> 6 & 63];
					result += map[bits & 63];
				} else if (tail === 2) {
					result += map[bits >> 10 & 63];
					result += map[bits >> 4 & 63];
					result += map[bits << 2 & 63];
					result += map[64];
				} else if (tail === 1) {
					result += map[bits >> 2 & 63];
					result += map[bits << 4 & 63];
					result += map[64];
					result += map[64];
				}
				return result;
			}
			function isBinary(obj) {
				return Object.prototype.toString.call(obj) === "[object Uint8Array]";
			}
			module.exports = new Type("tag:yaml.org,2002:binary", {
				kind: "scalar",
				resolve: resolveYamlBinary,
				construct: constructYamlBinary,
				predicate: isBinary,
				represent: representYamlBinary
			});
		}));
		require_omap = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			var Type = require_type();
			var _hasOwnProperty = Object.prototype.hasOwnProperty;
			var _toString = Object.prototype.toString;
			function resolveYamlOmap(data) {
				if (data === null) return true;
				const objectKeys = [];
				const object = data;
				for (let index = 0, length = object.length; index < length; index += 1) {
					const pair = object[index];
					let pairHasKey = false;
					if (_toString.call(pair) !== "[object Object]") return false;
					let pairKey;
					for (pairKey in pair) if (_hasOwnProperty.call(pair, pairKey)) if (!pairHasKey) pairHasKey = true;
					else return false;
					if (!pairHasKey) return false;
					if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
					else return false;
				}
				return true;
			}
			function constructYamlOmap(data) {
				return data !== null ? data : [];
			}
			module.exports = new Type("tag:yaml.org,2002:omap", {
				kind: "sequence",
				resolve: resolveYamlOmap,
				construct: constructYamlOmap
			});
		}));
		require_pairs = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			var Type = require_type();
			var _toString = Object.prototype.toString;
			function resolveYamlPairs(data) {
				if (data === null) return true;
				const object = data;
				const result = new Array(object.length);
				for (let index = 0, length = object.length; index < length; index += 1) {
					const pair = object[index];
					if (_toString.call(pair) !== "[object Object]") return false;
					const keys = Object.keys(pair);
					if (keys.length !== 1) return false;
					result[index] = [keys[0], pair[keys[0]]];
				}
				return true;
			}
			function constructYamlPairs(data) {
				if (data === null) return [];
				const object = data;
				const result = new Array(object.length);
				for (let index = 0, length = object.length; index < length; index += 1) {
					const pair = object[index];
					const keys = Object.keys(pair);
					result[index] = [keys[0], pair[keys[0]]];
				}
				return result;
			}
			module.exports = new Type("tag:yaml.org,2002:pairs", {
				kind: "sequence",
				resolve: resolveYamlPairs,
				construct: constructYamlPairs
			});
		}));
		require_set = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			var Type = require_type();
			var _hasOwnProperty = Object.prototype.hasOwnProperty;
			function resolveYamlSet(data) {
				if (data === null) return true;
				const object = data;
				for (const key in object) if (_hasOwnProperty.call(object, key)) {
					if (object[key] !== null) return false;
				}
				return true;
			}
			function constructYamlSet(data) {
				return data !== null ? data : {};
			}
			module.exports = new Type("tag:yaml.org,2002:set", {
				kind: "mapping",
				resolve: resolveYamlSet,
				construct: constructYamlSet
			});
		}));
		require_default = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_core().extend({
				implicit: [require_timestamp(), require_merge()],
				explicit: [
					require_binary(),
					require_omap(),
					require_pairs(),
					require_set()
				]
			});
		}));
		require_loader = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			var common = require_common();
			var YAMLException = require_exception();
			var makeSnippet = require_snippet();
			var DEFAULT_SCHEMA = require_default();
			var _hasOwnProperty = Object.prototype.hasOwnProperty;
			var CONTEXT_FLOW_IN = 1;
			var CONTEXT_FLOW_OUT = 2;
			var CONTEXT_BLOCK_IN = 3;
			var CONTEXT_BLOCK_OUT = 4;
			var CHOMPING_CLIP = 1;
			var CHOMPING_STRIP = 2;
			var CHOMPING_KEEP = 3;
			var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
			var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
			var PATTERN_FLOW_INDICATORS = /[,\[\]{}]/;
			var PATTERN_TAG_HANDLE = /^(?:!|!!|![0-9A-Za-z-]+!)$/;
			var PATTERN_TAG_URI = /^(?:!|[^,\[\]{}])(?:%[0-9a-f]{2}|[0-9a-z\-#;/?:@&=+$,_.!~*'()\[\]])*$/i;
			function _class(obj) {
				return Object.prototype.toString.call(obj);
			}
			function isEol(c) {
				return c === 10 || c === 13;
			}
			function isWhiteSpace(c) {
				return c === 9 || c === 32;
			}
			function isWsOrEol(c) {
				return c === 9 || c === 32 || c === 10 || c === 13;
			}
			function isFlowIndicator(c) {
				return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
			}
			function fromHexCode(c) {
				if (c >= 48 && c <= 57) return c - 48;
				const lc = c | 32;
				if (lc >= 97 && lc <= 102) return lc - 97 + 10;
				return -1;
			}
			function escapedHexLen(c) {
				if (c === 120) return 2;
				if (c === 117) return 4;
				if (c === 85) return 8;
				return 0;
			}
			function fromDecimalCode(c) {
				if (c >= 48 && c <= 57) return c - 48;
				return -1;
			}
			function simpleEscapeSequence(c) {
				switch (c) {
					case 48: return "\0";
					case 97: return "\x07";
					case 98: return "\b";
					case 116: return "	";
					case 9: return "	";
					case 110: return "\n";
					case 118: return "\v";
					case 102: return "\f";
					case 114: return "\r";
					case 101: return "\x1B";
					case 32: return " ";
					case 34: return "\"";
					case 47: return "/";
					case 92: return "\\";
					case 78: return "";
					case 95: return "\xA0";
					case 76: return "\u2028";
					case 80: return "\u2029";
					default: return "";
				}
			}
			function charFromCodepoint(c) {
				if (c <= 65535) return String.fromCharCode(c);
				return String.fromCharCode((c - 65536 >> 10) + 55296, (c - 65536 & 1023) + 56320);
			}
			function setProperty(object, key, value) {
				if (key === "__proto__") Object.defineProperty(object, key, {
					configurable: true,
					enumerable: true,
					writable: true,
					value
				});
				else object[key] = value;
			}
			var simpleEscapeCheck = new Array(256);
			var simpleEscapeMap = new Array(256);
			for (let i = 0; i < 256; i++) {
				simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
				simpleEscapeMap[i] = simpleEscapeSequence(i);
			}
			function State(input, options) {
				this.input = input;
				this.filename = options["filename"] || null;
				this.schema = options["schema"] || DEFAULT_SCHEMA;
				this.onWarning = options["onWarning"] || null;
				this.legacy = options["legacy"] || false;
				this.json = options["json"] || false;
				this.listener = options["listener"] || null;
				this.maxDepth = typeof options["maxDepth"] === "number" ? options["maxDepth"] : 100;
				this.maxMergeSeqLength = typeof options["maxMergeSeqLength"] === "number" ? options["maxMergeSeqLength"] : 20;
				this.implicitTypes = this.schema.compiledImplicit;
				this.typeMap = this.schema.compiledTypeMap;
				this.length = input.length;
				this.position = 0;
				this.line = 0;
				this.lineStart = 0;
				this.lineIndent = 0;
				this.depth = 0;
				this.firstTabInLine = -1;
				this.documents = [];
				this.anchorMapTransactions = [];
			}
			function generateError(state, message) {
				const mark = {
					name: state.filename,
					buffer: state.input.slice(0, -1),
					position: state.position,
					line: state.line,
					column: state.position - state.lineStart
				};
				mark.snippet = makeSnippet(mark);
				return new YAMLException(message, mark);
			}
			function throwError(state, message) {
				throw generateError(state, message);
			}
			function throwWarning(state, message) {
				if (state.onWarning) state.onWarning.call(null, generateError(state, message));
			}
			function storeAnchor(state, name, value) {
				const transactions = state.anchorMapTransactions;
				if (transactions.length !== 0) {
					const transaction = transactions[transactions.length - 1];
					if (!_hasOwnProperty.call(transaction, name)) transaction[name] = {
						existed: _hasOwnProperty.call(state.anchorMap, name),
						value: state.anchorMap[name]
					};
				}
				state.anchorMap[name] = value;
			}
			function beginAnchorTransaction(state) {
				state.anchorMapTransactions.push(Object.create(null));
			}
			function commitAnchorTransaction(state) {
				const transaction = state.anchorMapTransactions.pop();
				const transactions = state.anchorMapTransactions;
				if (transactions.length === 0) return;
				const parent = transactions[transactions.length - 1];
				const names = Object.keys(transaction);
				for (let index = 0, length = names.length; index < length; index += 1) {
					const name = names[index];
					if (!_hasOwnProperty.call(parent, name)) parent[name] = transaction[name];
				}
			}
			function rollbackAnchorTransaction(state) {
				const transaction = state.anchorMapTransactions.pop();
				const names = Object.keys(transaction);
				for (let index = names.length - 1; index >= 0; index -= 1) {
					const entry = transaction[names[index]];
					if (entry.existed) state.anchorMap[names[index]] = entry.value;
					else delete state.anchorMap[names[index]];
				}
			}
			function snapshotState(state) {
				return {
					position: state.position,
					line: state.line,
					lineStart: state.lineStart,
					lineIndent: state.lineIndent,
					firstTabInLine: state.firstTabInLine,
					tag: state.tag,
					anchor: state.anchor,
					kind: state.kind,
					result: state.result
				};
			}
			function restoreState(state, snapshot) {
				state.position = snapshot.position;
				state.line = snapshot.line;
				state.lineStart = snapshot.lineStart;
				state.lineIndent = snapshot.lineIndent;
				state.firstTabInLine = snapshot.firstTabInLine;
				state.tag = snapshot.tag;
				state.anchor = snapshot.anchor;
				state.kind = snapshot.kind;
				state.result = snapshot.result;
			}
			var directiveHandlers = {
				YAML: function handleYamlDirective(state, name, args) {
					if (state.version !== null) throwError(state, "duplication of %YAML directive");
					if (args.length !== 1) throwError(state, "YAML directive accepts exactly one argument");
					const match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
					if (match === null) throwError(state, "ill-formed argument of the YAML directive");
					const major = parseInt(match[1], 10);
					const minor = parseInt(match[2], 10);
					if (major !== 1) throwError(state, "unacceptable YAML version of the document");
					state.version = args[0];
					state.checkLineBreaks = minor < 2;
					if (minor !== 1 && minor !== 2) throwWarning(state, "unsupported YAML version of the document");
				},
				TAG: function handleTagDirective(state, name, args) {
					let prefix;
					if (args.length !== 2) throwError(state, "TAG directive accepts exactly two arguments");
					const handle = args[0];
					prefix = args[1];
					if (!PATTERN_TAG_HANDLE.test(handle)) throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
					if (_hasOwnProperty.call(state.tagMap, handle)) throwError(state, "there is a previously declared suffix for \"" + handle + "\" tag handle");
					if (!PATTERN_TAG_URI.test(prefix)) throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
					try {
						prefix = decodeURIComponent(prefix);
					} catch (err) {
						throwError(state, "tag prefix is malformed: " + prefix);
					}
					state.tagMap[handle] = prefix;
				}
			};
			function captureSegment(state, start, end, checkJson) {
				if (start < end) {
					const _result = state.input.slice(start, end);
					if (checkJson) for (let _position = 0, _length = _result.length; _position < _length; _position += 1) {
						const _character = _result.charCodeAt(_position);
						if (!(_character === 9 || _character >= 32 && _character <= 1114111)) throwError(state, "expected valid JSON character");
					}
					else if (PATTERN_NON_PRINTABLE.test(_result)) throwError(state, "the stream contains non-printable characters");
					state.result += _result;
				}
			}
			function mergeMappings(state, destination, source, overridableKeys) {
				if (!common.isObject(source)) throwError(state, "cannot merge mappings; the provided source object is unacceptable");
				const sourceKeys = Object.keys(source);
				for (let index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
					const key = sourceKeys[index];
					if (!_hasOwnProperty.call(destination, key)) {
						setProperty(destination, key, source[key]);
						overridableKeys[key] = true;
					}
				}
			}
			function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
				if (Array.isArray(keyNode)) {
					keyNode = Array.prototype.slice.call(keyNode);
					for (let index = 0, quantity = keyNode.length; index < quantity; index += 1) {
						if (Array.isArray(keyNode[index])) throwError(state, "nested arrays are not supported inside keys");
						if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") keyNode[index] = "[object Object]";
					}
				}
				if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") keyNode = "[object Object]";
				keyNode = String(keyNode);
				if (_result === null) _result = {};
				if (keyTag === "tag:yaml.org,2002:merge") if (Array.isArray(valueNode)) {
					if (valueNode.length > state.maxMergeSeqLength) throwError(state, "merge sequence length exceeded maxMergeSeqLength (" + state.maxMergeSeqLength + ")");
					const seen = /* @__PURE__ */ new Set();
					for (let index = 0, quantity = valueNode.length; index < quantity; index += 1) {
						const src = valueNode[index];
						if (seen.has(src)) continue;
						seen.add(src);
						mergeMappings(state, _result, src, overridableKeys);
					}
				} else mergeMappings(state, _result, valueNode, overridableKeys);
				else {
					if (!state.json && !_hasOwnProperty.call(overridableKeys, keyNode) && _hasOwnProperty.call(_result, keyNode)) {
						state.line = startLine || state.line;
						state.lineStart = startLineStart || state.lineStart;
						state.position = startPos || state.position;
						throwError(state, "duplicated mapping key");
					}
					setProperty(_result, keyNode, valueNode);
					delete overridableKeys[keyNode];
				}
				return _result;
			}
			function readLineBreak(state) {
				const ch = state.input.charCodeAt(state.position);
				if (ch === 10) state.position++;
				else if (ch === 13) {
					state.position++;
					if (state.input.charCodeAt(state.position) === 10) state.position++;
				} else throwError(state, "a line break is expected");
				state.line += 1;
				state.lineStart = state.position;
				state.firstTabInLine = -1;
			}
			function skipSeparationSpace(state, allowComments, checkIndent) {
				let lineBreaks = 0;
				let ch = state.input.charCodeAt(state.position);
				while (ch !== 0) {
					while (isWhiteSpace(ch)) {
						if (ch === 9 && state.firstTabInLine === -1) state.firstTabInLine = state.position;
						ch = state.input.charCodeAt(++state.position);
					}
					if (allowComments && ch === 35) do
						ch = state.input.charCodeAt(++state.position);
					while (ch !== 10 && ch !== 13 && ch !== 0);
					if (isEol(ch)) {
						readLineBreak(state);
						ch = state.input.charCodeAt(state.position);
						lineBreaks++;
						state.lineIndent = 0;
						while (ch === 32) {
							state.lineIndent++;
							ch = state.input.charCodeAt(++state.position);
						}
					} else break;
				}
				if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) throwWarning(state, "deficient indentation");
				return lineBreaks;
			}
			function testDocumentSeparator(state) {
				let _position = state.position;
				let ch = state.input.charCodeAt(_position);
				if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
					_position += 3;
					ch = state.input.charCodeAt(_position);
					if (ch === 0 || isWsOrEol(ch)) return true;
				}
				return false;
			}
			function writeFoldedLines(state, count) {
				if (count === 1) state.result += " ";
				else if (count > 1) state.result += common.repeat("\n", count - 1);
			}
			function readPlainScalar(state, nodeIndent, withinFlowCollection) {
				let captureStart;
				let captureEnd;
				let hasPendingContent;
				let _line;
				let _lineStart;
				let _lineIndent;
				const _kind = state.kind;
				const _result = state.result;
				let ch = state.input.charCodeAt(state.position);
				if (isWsOrEol(ch) || isFlowIndicator(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) return false;
				if (ch === 63 || ch === 45) {
					const following = state.input.charCodeAt(state.position + 1);
					if (isWsOrEol(following) || withinFlowCollection && isFlowIndicator(following)) return false;
				}
				state.kind = "scalar";
				state.result = "";
				captureStart = captureEnd = state.position;
				hasPendingContent = false;
				while (ch !== 0) {
					if (ch === 58) {
						const following = state.input.charCodeAt(state.position + 1);
						if (isWsOrEol(following) || withinFlowCollection && isFlowIndicator(following)) break;
					} else if (ch === 35) {
						if (isWsOrEol(state.input.charCodeAt(state.position - 1))) break;
					} else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && isFlowIndicator(ch)) break;
					else if (isEol(ch)) {
						_line = state.line;
						_lineStart = state.lineStart;
						_lineIndent = state.lineIndent;
						skipSeparationSpace(state, false, -1);
						if (state.lineIndent >= nodeIndent) {
							hasPendingContent = true;
							ch = state.input.charCodeAt(state.position);
							continue;
						} else {
							state.position = captureEnd;
							state.line = _line;
							state.lineStart = _lineStart;
							state.lineIndent = _lineIndent;
							break;
						}
					}
					if (hasPendingContent) {
						captureSegment(state, captureStart, captureEnd, false);
						writeFoldedLines(state, state.line - _line);
						captureStart = captureEnd = state.position;
						hasPendingContent = false;
					}
					if (!isWhiteSpace(ch)) captureEnd = state.position + 1;
					ch = state.input.charCodeAt(++state.position);
				}
				captureSegment(state, captureStart, captureEnd, false);
				if (state.result) return true;
				state.kind = _kind;
				state.result = _result;
				return false;
			}
			function readSingleQuotedScalar(state, nodeIndent) {
				let captureStart;
				let captureEnd;
				let ch = state.input.charCodeAt(state.position);
				if (ch !== 39) return false;
				state.kind = "scalar";
				state.result = "";
				state.position++;
				captureStart = captureEnd = state.position;
				while ((ch = state.input.charCodeAt(state.position)) !== 0) if (ch === 39) {
					captureSegment(state, captureStart, state.position, true);
					ch = state.input.charCodeAt(++state.position);
					if (ch === 39) {
						captureStart = state.position;
						state.position++;
						captureEnd = state.position;
					} else return true;
				} else if (isEol(ch)) {
					captureSegment(state, captureStart, captureEnd, true);
					writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
					captureStart = captureEnd = state.position;
				} else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a single quoted scalar");
				else {
					state.position++;
					if (!isWhiteSpace(ch)) captureEnd = state.position;
				}
				throwError(state, "unexpected end of the stream within a single quoted scalar");
			}
			function readDoubleQuotedScalar(state, nodeIndent) {
				let captureStart;
				let captureEnd;
				let tmp;
				let ch = state.input.charCodeAt(state.position);
				if (ch !== 34) return false;
				state.kind = "scalar";
				state.result = "";
				state.position++;
				captureStart = captureEnd = state.position;
				while ((ch = state.input.charCodeAt(state.position)) !== 0) if (ch === 34) {
					captureSegment(state, captureStart, state.position, true);
					state.position++;
					return true;
				} else if (ch === 92) {
					captureSegment(state, captureStart, state.position, true);
					ch = state.input.charCodeAt(++state.position);
					if (isEol(ch)) skipSeparationSpace(state, false, nodeIndent);
					else if (ch < 256 && simpleEscapeCheck[ch]) {
						state.result += simpleEscapeMap[ch];
						state.position++;
					} else if ((tmp = escapedHexLen(ch)) > 0) {
						let hexLength = tmp;
						let hexResult = 0;
						for (; hexLength > 0; hexLength--) {
							ch = state.input.charCodeAt(++state.position);
							if ((tmp = fromHexCode(ch)) >= 0) hexResult = (hexResult << 4) + tmp;
							else throwError(state, "expected hexadecimal character");
						}
						state.result += charFromCodepoint(hexResult);
						state.position++;
					} else throwError(state, "unknown escape sequence");
					captureStart = captureEnd = state.position;
				} else if (isEol(ch)) {
					captureSegment(state, captureStart, captureEnd, true);
					writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
					captureStart = captureEnd = state.position;
				} else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a double quoted scalar");
				else {
					state.position++;
					if (!isWhiteSpace(ch)) captureEnd = state.position;
				}
				throwError(state, "unexpected end of the stream within a double quoted scalar");
			}
			function readFlowCollection(state, nodeIndent) {
				let readNext = true;
				let _line;
				let _lineStart;
				let _pos;
				const _tag = state.tag;
				let _result;
				const _anchor = state.anchor;
				let terminator;
				let isPair;
				let isExplicitPair;
				let isMapping;
				const overridableKeys = Object.create(null);
				let keyNode;
				let keyTag;
				let valueNode;
				let ch = state.input.charCodeAt(state.position);
				if (ch === 91) {
					terminator = 93;
					isMapping = false;
					_result = [];
				} else if (ch === 123) {
					terminator = 125;
					isMapping = true;
					_result = {};
				} else return false;
				if (state.anchor !== null) storeAnchor(state, state.anchor, _result);
				ch = state.input.charCodeAt(++state.position);
				while (ch !== 0) {
					skipSeparationSpace(state, true, nodeIndent);
					ch = state.input.charCodeAt(state.position);
					if (ch === terminator) {
						state.position++;
						state.tag = _tag;
						state.anchor = _anchor;
						state.kind = isMapping ? "mapping" : "sequence";
						state.result = _result;
						return true;
					} else if (!readNext) throwError(state, "missed comma between flow collection entries");
					else if (ch === 44) throwError(state, "expected the node content, but found ','");
					keyTag = keyNode = valueNode = null;
					isPair = isExplicitPair = false;
					if (ch === 63) {
						if (isWsOrEol(state.input.charCodeAt(state.position + 1))) {
							isPair = isExplicitPair = true;
							state.position++;
							skipSeparationSpace(state, true, nodeIndent);
						}
					}
					_line = state.line;
					_lineStart = state.lineStart;
					_pos = state.position;
					composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
					keyTag = state.tag;
					keyNode = state.result;
					skipSeparationSpace(state, true, nodeIndent);
					ch = state.input.charCodeAt(state.position);
					if ((isExplicitPair || state.line === _line) && ch === 58) {
						isPair = true;
						ch = state.input.charCodeAt(++state.position);
						skipSeparationSpace(state, true, nodeIndent);
						composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
						valueNode = state.result;
					}
					if (isMapping) storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
					else if (isPair) _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
					else _result.push(keyNode);
					skipSeparationSpace(state, true, nodeIndent);
					ch = state.input.charCodeAt(state.position);
					if (ch === 44) {
						readNext = true;
						ch = state.input.charCodeAt(++state.position);
					} else readNext = false;
				}
				throwError(state, "unexpected end of the stream within a flow collection");
			}
			function readBlockScalar(state, nodeIndent) {
				let folding;
				let chomping = CHOMPING_CLIP;
				let didReadContent = false;
				let detectedIndent = false;
				let textIndent = nodeIndent;
				let emptyLines = 0;
				let atMoreIndented = false;
				let tmp;
				let ch = state.input.charCodeAt(state.position);
				if (ch === 124) folding = false;
				else if (ch === 62) folding = true;
				else return false;
				state.kind = "scalar";
				state.result = "";
				while (ch !== 0) {
					ch = state.input.charCodeAt(++state.position);
					if (ch === 43 || ch === 45) if (CHOMPING_CLIP === chomping) chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
					else throwError(state, "repeat of a chomping mode identifier");
					else if ((tmp = fromDecimalCode(ch)) >= 0) if (tmp === 0) throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
					else if (!detectedIndent) {
						textIndent = nodeIndent + tmp - 1;
						detectedIndent = true;
					} else throwError(state, "repeat of an indentation width identifier");
					else break;
				}
				if (isWhiteSpace(ch)) {
					do
						ch = state.input.charCodeAt(++state.position);
					while (isWhiteSpace(ch));
					if (ch === 35) do
						ch = state.input.charCodeAt(++state.position);
					while (!isEol(ch) && ch !== 0);
				}
				while (ch !== 0) {
					readLineBreak(state);
					state.lineIndent = 0;
					ch = state.input.charCodeAt(state.position);
					while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
						state.lineIndent++;
						ch = state.input.charCodeAt(++state.position);
					}
					if (!detectedIndent && state.lineIndent > textIndent) textIndent = state.lineIndent;
					if (isEol(ch)) {
						emptyLines++;
						continue;
					}
					if (!detectedIndent && textIndent === 0) throwError(state, "missing indentation for block scalar");
					if (state.lineIndent < textIndent) {
						if (chomping === CHOMPING_KEEP) state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
						else if (chomping === CHOMPING_CLIP) {
							if (didReadContent) state.result += "\n";
						}
						break;
					}
					if (folding) if (isWhiteSpace(ch)) {
						atMoreIndented = true;
						state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
					} else if (atMoreIndented) {
						atMoreIndented = false;
						state.result += common.repeat("\n", emptyLines + 1);
					} else if (emptyLines === 0) {
						if (didReadContent) state.result += " ";
					} else state.result += common.repeat("\n", emptyLines);
					else state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
					didReadContent = true;
					detectedIndent = true;
					emptyLines = 0;
					const captureStart = state.position;
					while (!isEol(ch) && ch !== 0) ch = state.input.charCodeAt(++state.position);
					captureSegment(state, captureStart, state.position, false);
				}
				return true;
			}
			function readBlockSequence(state, nodeIndent) {
				const _tag = state.tag;
				const _anchor = state.anchor;
				const _result = [];
				let detected = false;
				if (state.firstTabInLine !== -1) return false;
				if (state.anchor !== null) storeAnchor(state, state.anchor, _result);
				let ch = state.input.charCodeAt(state.position);
				while (ch !== 0) {
					if (state.firstTabInLine !== -1) {
						state.position = state.firstTabInLine;
						throwError(state, "tab characters must not be used in indentation");
					}
					if (ch !== 45) break;
					if (!isWsOrEol(state.input.charCodeAt(state.position + 1))) break;
					detected = true;
					state.position++;
					if (skipSeparationSpace(state, true, -1)) {
						if (state.lineIndent <= nodeIndent) {
							_result.push(null);
							ch = state.input.charCodeAt(state.position);
							continue;
						}
					}
					const _line = state.line;
					composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
					_result.push(state.result);
					skipSeparationSpace(state, true, -1);
					ch = state.input.charCodeAt(state.position);
					if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) throwError(state, "bad indentation of a sequence entry");
					else if (state.lineIndent < nodeIndent) break;
				}
				if (detected) {
					state.tag = _tag;
					state.anchor = _anchor;
					state.kind = "sequence";
					state.result = _result;
					return true;
				}
				return false;
			}
			function readBlockMapping(state, nodeIndent, flowIndent) {
				let allowCompact;
				let _keyLine;
				let _keyLineStart;
				let _keyPos;
				const _tag = state.tag;
				const _anchor = state.anchor;
				const _result = {};
				const overridableKeys = Object.create(null);
				let keyTag = null;
				let keyNode = null;
				let valueNode = null;
				let atExplicitKey = false;
				let detected = false;
				if (state.firstTabInLine !== -1) return false;
				if (state.anchor !== null) storeAnchor(state, state.anchor, _result);
				let ch = state.input.charCodeAt(state.position);
				while (ch !== 0) {
					if (!atExplicitKey && state.firstTabInLine !== -1) {
						state.position = state.firstTabInLine;
						throwError(state, "tab characters must not be used in indentation");
					}
					const following = state.input.charCodeAt(state.position + 1);
					const _line = state.line;
					if ((ch === 63 || ch === 58) && isWsOrEol(following)) {
						if (ch === 63) {
							if (atExplicitKey) {
								storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
								keyTag = keyNode = valueNode = null;
							}
							detected = true;
							atExplicitKey = true;
							allowCompact = true;
						} else if (atExplicitKey) {
							atExplicitKey = false;
							allowCompact = true;
						} else throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
						state.position += 1;
						ch = following;
					} else {
						_keyLine = state.line;
						_keyLineStart = state.lineStart;
						_keyPos = state.position;
						if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) break;
						if (state.line === _line) {
							ch = state.input.charCodeAt(state.position);
							while (isWhiteSpace(ch)) ch = state.input.charCodeAt(++state.position);
							if (ch === 58) {
								ch = state.input.charCodeAt(++state.position);
								if (!isWsOrEol(ch)) throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
								if (atExplicitKey) {
									storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
									keyTag = keyNode = valueNode = null;
								}
								detected = true;
								atExplicitKey = false;
								allowCompact = false;
								keyTag = state.tag;
								keyNode = state.result;
							} else if (detected) throwError(state, "can not read an implicit mapping pair; a colon is missed");
							else {
								state.tag = _tag;
								state.anchor = _anchor;
								return true;
							}
						} else if (detected) throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
						else {
							state.tag = _tag;
							state.anchor = _anchor;
							return true;
						}
					}
					if (state.line === _line || state.lineIndent > nodeIndent) {
						if (atExplicitKey) {
							_keyLine = state.line;
							_keyLineStart = state.lineStart;
							_keyPos = state.position;
						}
						if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) if (atExplicitKey) keyNode = state.result;
						else valueNode = state.result;
						if (!atExplicitKey) {
							storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
							keyTag = keyNode = valueNode = null;
						}
						skipSeparationSpace(state, true, -1);
						ch = state.input.charCodeAt(state.position);
					}
					if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) throwError(state, "bad indentation of a mapping entry");
					else if (state.lineIndent < nodeIndent) break;
				}
				if (atExplicitKey) storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
				if (detected) {
					state.tag = _tag;
					state.anchor = _anchor;
					state.kind = "mapping";
					state.result = _result;
				}
				return detected;
			}
			function readTagProperty(state) {
				let isVerbatim = false;
				let isNamed = false;
				let tagHandle;
				let tagName;
				let ch = state.input.charCodeAt(state.position);
				if (ch !== 33) return false;
				if (state.tag !== null) throwError(state, "duplication of a tag property");
				ch = state.input.charCodeAt(++state.position);
				if (ch === 60) {
					isVerbatim = true;
					ch = state.input.charCodeAt(++state.position);
				} else if (ch === 33) {
					isNamed = true;
					tagHandle = "!!";
					ch = state.input.charCodeAt(++state.position);
				} else tagHandle = "!";
				let _position = state.position;
				if (isVerbatim) {
					do
						ch = state.input.charCodeAt(++state.position);
					while (ch !== 0 && ch !== 62);
					if (state.position < state.length) {
						tagName = state.input.slice(_position, state.position);
						ch = state.input.charCodeAt(++state.position);
					} else throwError(state, "unexpected end of the stream within a verbatim tag");
				} else {
					while (ch !== 0 && !isWsOrEol(ch)) {
						if (ch === 33) if (!isNamed) {
							tagHandle = state.input.slice(_position - 1, state.position + 1);
							if (!PATTERN_TAG_HANDLE.test(tagHandle)) throwError(state, "named tag handle cannot contain such characters");
							isNamed = true;
							_position = state.position + 1;
						} else throwError(state, "tag suffix cannot contain exclamation marks");
						ch = state.input.charCodeAt(++state.position);
					}
					tagName = state.input.slice(_position, state.position);
					if (PATTERN_FLOW_INDICATORS.test(tagName)) throwError(state, "tag suffix cannot contain flow indicator characters");
				}
				if (tagName && !PATTERN_TAG_URI.test(tagName)) throwError(state, "tag name cannot contain such characters: " + tagName);
				try {
					tagName = decodeURIComponent(tagName);
				} catch (err) {
					throwError(state, "tag name is malformed: " + tagName);
				}
				if (isVerbatim) state.tag = tagName;
				else if (_hasOwnProperty.call(state.tagMap, tagHandle)) state.tag = state.tagMap[tagHandle] + tagName;
				else if (tagHandle === "!") state.tag = "!" + tagName;
				else if (tagHandle === "!!") state.tag = "tag:yaml.org,2002:" + tagName;
				else throwError(state, "undeclared tag handle \"" + tagHandle + "\"");
				return true;
			}
			function readAnchorProperty(state) {
				let ch = state.input.charCodeAt(state.position);
				if (ch !== 38) return false;
				if (state.anchor !== null) throwError(state, "duplication of an anchor property");
				ch = state.input.charCodeAt(++state.position);
				const _position = state.position;
				while (ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch)) ch = state.input.charCodeAt(++state.position);
				if (state.position === _position) throwError(state, "name of an anchor node must contain at least one character");
				state.anchor = state.input.slice(_position, state.position);
				return true;
			}
			function readAlias(state) {
				let ch = state.input.charCodeAt(state.position);
				if (ch !== 42) return false;
				ch = state.input.charCodeAt(++state.position);
				const _position = state.position;
				while (ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch)) ch = state.input.charCodeAt(++state.position);
				if (state.position === _position) throwError(state, "name of an alias node must contain at least one character");
				const alias = state.input.slice(_position, state.position);
				if (!_hasOwnProperty.call(state.anchorMap, alias)) throwError(state, "unidentified alias \"" + alias + "\"");
				state.result = state.anchorMap[alias];
				skipSeparationSpace(state, true, -1);
				return true;
			}
			function tryReadBlockMappingFromProperty(state, propertyStart, nodeIndent, flowIndent) {
				const fallbackState = snapshotState(state);
				beginAnchorTransaction(state);
				restoreState(state, propertyStart);
				state.tag = null;
				state.anchor = null;
				state.kind = null;
				state.result = null;
				if (readBlockMapping(state, nodeIndent, flowIndent) && state.kind === "mapping") {
					commitAnchorTransaction(state);
					return true;
				}
				rollbackAnchorTransaction(state);
				restoreState(state, fallbackState);
				return false;
			}
			function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
				let allowBlockScalars;
				let allowBlockCollections;
				let indentStatus = 1;
				let atNewLine = false;
				let hasContent = false;
				let propertyStart = null;
				let type;
				let flowIndent;
				let blockIndent;
				if (state.depth >= state.maxDepth) throwError(state, "nesting exceeded maxDepth (" + state.maxDepth + ")");
				state.depth += 1;
				if (state.listener !== null) state.listener("open", state);
				state.tag = null;
				state.anchor = null;
				state.kind = null;
				state.result = null;
				const allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
				if (allowToSeek) {
					if (skipSeparationSpace(state, true, -1)) {
						atNewLine = true;
						if (state.lineIndent > parentIndent) indentStatus = 1;
						else if (state.lineIndent === parentIndent) indentStatus = 0;
						else if (state.lineIndent < parentIndent) indentStatus = -1;
					}
				}
				if (indentStatus === 1) while (true) {
					const ch = state.input.charCodeAt(state.position);
					const propertyState = snapshotState(state);
					if (atNewLine && (ch === 33 && state.tag !== null || ch === 38 && state.anchor !== null)) break;
					if (!readTagProperty(state) && !readAnchorProperty(state)) break;
					if (propertyStart === null) propertyStart = propertyState;
					if (skipSeparationSpace(state, true, -1)) {
						atNewLine = true;
						allowBlockCollections = allowBlockStyles;
						if (state.lineIndent > parentIndent) indentStatus = 1;
						else if (state.lineIndent === parentIndent) indentStatus = 0;
						else if (state.lineIndent < parentIndent) indentStatus = -1;
					} else allowBlockCollections = false;
				}
				if (allowBlockCollections) allowBlockCollections = atNewLine || allowCompact;
				if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
					if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) flowIndent = parentIndent;
					else flowIndent = parentIndent + 1;
					blockIndent = state.position - state.lineStart;
					if (indentStatus === 1) if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) hasContent = true;
					else {
						const ch = state.input.charCodeAt(state.position);
						if (propertyStart !== null && allowBlockStyles && !allowBlockCollections && ch !== 124 && ch !== 62 && tryReadBlockMappingFromProperty(state, propertyStart, propertyStart.position - propertyStart.lineStart, flowIndent)) hasContent = true;
						else if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) hasContent = true;
						else if (readAlias(state)) {
							hasContent = true;
							if (state.tag !== null || state.anchor !== null) throwError(state, "alias node should not have any properties");
						} else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
							hasContent = true;
							if (state.tag === null) state.tag = "?";
						}
						if (state.anchor !== null) storeAnchor(state, state.anchor, state.result);
					}
					else if (indentStatus === 0) hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
				}
				if (state.tag === null) {
					if (state.anchor !== null) storeAnchor(state, state.anchor, state.result);
				} else if (state.tag === "?") {
					if (state.result !== null && state.kind !== "scalar") throwError(state, "unacceptable node kind for !<?> tag; it should be \"scalar\", not \"" + state.kind + "\"");
					for (let typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
						type = state.implicitTypes[typeIndex];
						if (type.resolve(state.result)) {
							state.result = type.construct(state.result);
							state.tag = type.tag;
							if (state.anchor !== null) storeAnchor(state, state.anchor, state.result);
							break;
						}
					}
				} else if (state.tag !== "!") {
					if (_hasOwnProperty.call(state.typeMap[state.kind || "fallback"], state.tag)) type = state.typeMap[state.kind || "fallback"][state.tag];
					else {
						type = null;
						const typeList = state.typeMap.multi[state.kind || "fallback"];
						for (let typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
							type = typeList[typeIndex];
							break;
						}
					}
					if (!type) throwError(state, "unknown tag !<" + state.tag + ">");
					if (state.result !== null && type.kind !== state.kind) throwError(state, "unacceptable node kind for !<" + state.tag + "> tag; it should be \"" + type.kind + "\", not \"" + state.kind + "\"");
					if (!type.resolve(state.result, state.tag)) throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
					else {
						state.result = type.construct(state.result, state.tag);
						if (state.anchor !== null) storeAnchor(state, state.anchor, state.result);
					}
				}
				if (state.listener !== null) state.listener("close", state);
				state.depth -= 1;
				return state.tag !== null || state.anchor !== null || hasContent;
			}
			function readDocument(state) {
				const documentStart = state.position;
				let hasDirectives = false;
				let ch;
				state.version = null;
				state.checkLineBreaks = state.legacy;
				state.tagMap = Object.create(null);
				state.anchorMap = Object.create(null);
				while ((ch = state.input.charCodeAt(state.position)) !== 0) {
					skipSeparationSpace(state, true, -1);
					ch = state.input.charCodeAt(state.position);
					if (state.lineIndent > 0 || ch !== 37) break;
					hasDirectives = true;
					ch = state.input.charCodeAt(++state.position);
					let _position = state.position;
					while (ch !== 0 && !isWsOrEol(ch)) ch = state.input.charCodeAt(++state.position);
					const directiveName = state.input.slice(_position, state.position);
					const directiveArgs = [];
					if (directiveName.length < 1) throwError(state, "directive name must not be less than one character in length");
					while (ch !== 0) {
						while (isWhiteSpace(ch)) ch = state.input.charCodeAt(++state.position);
						if (ch === 35) {
							do
								ch = state.input.charCodeAt(++state.position);
							while (ch !== 0 && !isEol(ch));
							break;
						}
						if (isEol(ch)) break;
						_position = state.position;
						while (ch !== 0 && !isWsOrEol(ch)) ch = state.input.charCodeAt(++state.position);
						directiveArgs.push(state.input.slice(_position, state.position));
					}
					if (ch !== 0) readLineBreak(state);
					if (_hasOwnProperty.call(directiveHandlers, directiveName)) directiveHandlers[directiveName](state, directiveName, directiveArgs);
					else throwWarning(state, "unknown document directive \"" + directiveName + "\"");
				}
				skipSeparationSpace(state, true, -1);
				if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
					state.position += 3;
					skipSeparationSpace(state, true, -1);
				} else if (hasDirectives) throwError(state, "directives end mark is expected");
				composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
				skipSeparationSpace(state, true, -1);
				if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) throwWarning(state, "non-ASCII line breaks are interpreted as content");
				state.documents.push(state.result);
				if (state.position === state.lineStart && testDocumentSeparator(state)) {
					if (state.input.charCodeAt(state.position) === 46) {
						state.position += 3;
						skipSeparationSpace(state, true, -1);
					}
					return;
				}
				if (state.position < state.length - 1) throwError(state, "end of the stream or a document separator is expected");
			}
			function loadDocuments(input, options) {
				input = String(input);
				options = options || {};
				if (input.length !== 0) {
					if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) input += "\n";
					if (input.charCodeAt(0) === 65279) input = input.slice(1);
				}
				const state = new State(input, options);
				const nullpos = input.indexOf("\0");
				if (nullpos !== -1) {
					state.position = nullpos;
					throwError(state, "null byte is not allowed in input");
				}
				state.input += "\0";
				while (state.input.charCodeAt(state.position) === 32) {
					state.lineIndent += 1;
					state.position += 1;
				}
				while (state.position < state.length - 1) readDocument(state);
				return state.documents;
			}
			function loadAll(input, iterator, options) {
				if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
					options = iterator;
					iterator = null;
				}
				const documents = loadDocuments(input, options);
				if (typeof iterator !== "function") return documents;
				for (let index = 0, length = documents.length; index < length; index += 1) iterator(documents[index]);
			}
			function load(input, options) {
				const documents = loadDocuments(input, options);
				if (documents.length === 0) return;
				else if (documents.length === 1) return documents[0];
				throw new YAMLException("expected a single document in the stream, but found more");
			}
			module.exports.loadAll = loadAll;
			module.exports.load = load;
		}));
		require_dumper = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			var common = require_common();
			var YAMLException = require_exception();
			var DEFAULT_SCHEMA = require_default();
			var _toString = Object.prototype.toString;
			var _hasOwnProperty = Object.prototype.hasOwnProperty;
			var CHAR_BOM = 65279;
			var CHAR_TAB = 9;
			var CHAR_LINE_FEED = 10;
			var CHAR_CARRIAGE_RETURN = 13;
			var CHAR_SPACE = 32;
			var CHAR_EXCLAMATION = 33;
			var CHAR_DOUBLE_QUOTE = 34;
			var CHAR_SHARP = 35;
			var CHAR_PERCENT = 37;
			var CHAR_AMPERSAND = 38;
			var CHAR_SINGLE_QUOTE = 39;
			var CHAR_ASTERISK = 42;
			var CHAR_COMMA = 44;
			var CHAR_MINUS = 45;
			var CHAR_COLON = 58;
			var CHAR_EQUALS = 61;
			var CHAR_GREATER_THAN = 62;
			var CHAR_QUESTION = 63;
			var CHAR_COMMERCIAL_AT = 64;
			var CHAR_LEFT_SQUARE_BRACKET = 91;
			var CHAR_RIGHT_SQUARE_BRACKET = 93;
			var CHAR_GRAVE_ACCENT = 96;
			var CHAR_LEFT_CURLY_BRACKET = 123;
			var CHAR_VERTICAL_LINE = 124;
			var CHAR_RIGHT_CURLY_BRACKET = 125;
			var ESCAPE_SEQUENCES = {};
			ESCAPE_SEQUENCES[0] = "\\0";
			ESCAPE_SEQUENCES[7] = "\\a";
			ESCAPE_SEQUENCES[8] = "\\b";
			ESCAPE_SEQUENCES[9] = "\\t";
			ESCAPE_SEQUENCES[10] = "\\n";
			ESCAPE_SEQUENCES[11] = "\\v";
			ESCAPE_SEQUENCES[12] = "\\f";
			ESCAPE_SEQUENCES[13] = "\\r";
			ESCAPE_SEQUENCES[27] = "\\e";
			ESCAPE_SEQUENCES[34] = "\\\"";
			ESCAPE_SEQUENCES[92] = "\\\\";
			ESCAPE_SEQUENCES[133] = "\\N";
			ESCAPE_SEQUENCES[160] = "\\_";
			ESCAPE_SEQUENCES[8232] = "\\L";
			ESCAPE_SEQUENCES[8233] = "\\P";
			var DEPRECATED_BOOLEANS_SYNTAX = [
				"y",
				"Y",
				"yes",
				"Yes",
				"YES",
				"on",
				"On",
				"ON",
				"n",
				"N",
				"no",
				"No",
				"NO",
				"off",
				"Off",
				"OFF"
			];
			var DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
			function compileStyleMap(schema, map) {
				if (map === null) return {};
				const result = {};
				const keys = Object.keys(map);
				for (let index = 0, length = keys.length; index < length; index += 1) {
					let tag = keys[index];
					let style = String(map[tag]);
					if (tag.slice(0, 2) === "!!") tag = "tag:yaml.org,2002:" + tag.slice(2);
					const type = schema.compiledTypeMap["fallback"][tag];
					if (type && _hasOwnProperty.call(type.styleAliases, style)) style = type.styleAliases[style];
					result[tag] = style;
				}
				return result;
			}
			function encodeHex(character) {
				let handle;
				let length;
				const string = character.toString(16).toUpperCase();
				if (character <= 255) {
					handle = "x";
					length = 2;
				} else if (character <= 65535) {
					handle = "u";
					length = 4;
				} else if (character <= 4294967295) {
					handle = "U";
					length = 8;
				} else throw new YAMLException("code point within a string may not be greater than 0xFFFFFFFF");
				return "\\" + handle + common.repeat("0", length - string.length) + string;
			}
			var QUOTING_TYPE_SINGLE = 1;
			var QUOTING_TYPE_DOUBLE = 2;
			function State(options) {
				this.schema = options["schema"] || DEFAULT_SCHEMA;
				this.indent = Math.max(1, options["indent"] || 2);
				this.noArrayIndent = options["noArrayIndent"] || false;
				this.skipInvalid = options["skipInvalid"] || false;
				this.flowLevel = common.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
				this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
				this.sortKeys = options["sortKeys"] || false;
				this.lineWidth = options["lineWidth"] || 80;
				this.noRefs = options["noRefs"] || false;
				this.noCompatMode = options["noCompatMode"] || false;
				this.condenseFlow = options["condenseFlow"] || false;
				this.quotingType = options["quotingType"] === "\"" ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
				this.forceQuotes = options["forceQuotes"] || false;
				this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
				this.implicitTypes = this.schema.compiledImplicit;
				this.explicitTypes = this.schema.compiledExplicit;
				this.tag = null;
				this.result = "";
				this.duplicates = [];
				this.usedDuplicates = null;
			}
			function indentString(string, spaces) {
				const ind = common.repeat(" ", spaces);
				let position = 0;
				let result = "";
				const length = string.length;
				while (position < length) {
					let line;
					const next = string.indexOf("\n", position);
					if (next === -1) {
						line = string.slice(position);
						position = length;
					} else {
						line = string.slice(position, next + 1);
						position = next + 1;
					}
					if (line.length && line !== "\n") result += ind;
					result += line;
				}
				return result;
			}
			function generateNextLine(state, level) {
				return "\n" + common.repeat(" ", state.indent * level);
			}
			function testImplicitResolving(state, str) {
				for (let index = 0, length = state.implicitTypes.length; index < length; index += 1) if (state.implicitTypes[index].resolve(str)) return true;
				return false;
			}
			function isWhitespace(c) {
				return c === CHAR_SPACE || c === CHAR_TAB;
			}
			function isPrintable(c) {
				return c >= 32 && c <= 126 || c >= 161 && c <= 55295 && c !== 8232 && c !== 8233 || c >= 57344 && c <= 65533 && c !== CHAR_BOM || c >= 65536 && c <= 1114111;
			}
			function isNsCharOrWhitespace(c) {
				return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
			}
			function isPlainSafe(c, prev, inblock) {
				const cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
				const cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
				return (inblock ? cIsNsCharOrWhitespace : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar;
			}
			function isPlainSafeFirst(c) {
				return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
			}
			function isPlainSafeLast(c) {
				return !isWhitespace(c) && c !== CHAR_COLON;
			}
			function codePointAt(string, pos) {
				const first = string.charCodeAt(pos);
				let second;
				if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
					second = string.charCodeAt(pos + 1);
					if (second >= 56320 && second <= 57343) return (first - 55296) * 1024 + second - 56320 + 65536;
				}
				return first;
			}
			function needIndentIndicator(string) {
				return /^\n* /.test(string);
			}
			var STYLE_PLAIN = 1;
			var STYLE_SINGLE = 2;
			var STYLE_LITERAL = 3;
			var STYLE_FOLDED = 4;
			var STYLE_DOUBLE = 5;
			function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
				let i;
				let char = 0;
				let prevChar = null;
				let hasLineBreak = false;
				let hasFoldableLine = false;
				const shouldTrackWidth = lineWidth !== -1;
				let previousLineBreak = -1;
				let plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
				if (singleLineOnly || forceQuotes) for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
					char = codePointAt(string, i);
					if (!isPrintable(char)) return STYLE_DOUBLE;
					plain = plain && isPlainSafe(char, prevChar, inblock);
					prevChar = char;
				}
				else {
					for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
						char = codePointAt(string, i);
						if (char === CHAR_LINE_FEED) {
							hasLineBreak = true;
							if (shouldTrackWidth) {
								hasFoldableLine = hasFoldableLine || i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
								previousLineBreak = i;
							}
						} else if (!isPrintable(char)) return STYLE_DOUBLE;
						plain = plain && isPlainSafe(char, prevChar, inblock);
						prevChar = char;
					}
					hasFoldableLine = hasFoldableLine || shouldTrackWidth && i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
				}
				if (!hasLineBreak && !hasFoldableLine) {
					if (plain && !forceQuotes && !testAmbiguousType(string)) return STYLE_PLAIN;
					return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
				}
				if (indentPerLevel > 9 && needIndentIndicator(string)) return STYLE_DOUBLE;
				if (!forceQuotes) return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
				return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
			}
			function writeScalar(state, string, level, iskey, inblock) {
				state.dump = function() {
					if (string.length === 0) return state.quotingType === QUOTING_TYPE_DOUBLE ? "\"\"" : "''";
					if (!state.noCompatMode) {
						if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) return state.quotingType === QUOTING_TYPE_DOUBLE ? "\"" + string + "\"" : "'" + string + "'";
					}
					const indent = state.indent * Math.max(1, level);
					const lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
					const singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
					function testAmbiguity(string) {
						return testImplicitResolving(state, string);
					}
					switch (chooseScalarStyle(string, singleLineOnly, state.indent, lineWidth, testAmbiguity, state.quotingType, state.forceQuotes && !iskey, inblock)) {
						case STYLE_PLAIN: return string;
						case STYLE_SINGLE: return "'" + string.replace(/'/g, "''") + "'";
						case STYLE_LITERAL: return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
						case STYLE_FOLDED: return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
						case STYLE_DOUBLE: return "\"" + escapeString(string, lineWidth) + "\"";
						default: throw new YAMLException("impossible error: invalid scalar style");
					}
				}();
			}
			function blockHeader(string, indentPerLevel) {
				const indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
				const clip = string[string.length - 1] === "\n";
				return indentIndicator + (clip && (string[string.length - 2] === "\n" || string === "\n") ? "+" : clip ? "" : "-") + "\n";
			}
			function dropEndingNewline(string) {
				return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
			}
			function foldString(string, width) {
				const lineRe = /(\n+)([^\n]*)/g;
				let result = function() {
					let nextLF = string.indexOf("\n");
					nextLF = nextLF !== -1 ? nextLF : string.length;
					lineRe.lastIndex = nextLF;
					return foldLine(string.slice(0, nextLF), width);
				}();
				let prevMoreIndented = string[0] === "\n" || string[0] === " ";
				let moreIndented;
				let match;
				while (match = lineRe.exec(string)) {
					const prefix = match[1];
					const line = match[2];
					moreIndented = line[0] === " ";
					result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
					prevMoreIndented = moreIndented;
				}
				return result;
			}
			function foldLine(line, width) {
				if (line === "" || line[0] === " ") return line;
				const breakRe = / [^ ]/g;
				let match;
				let start = 0;
				let end;
				let curr = 0;
				let next = 0;
				let result = "";
				while (match = breakRe.exec(line)) {
					next = match.index;
					if (next - start > width) {
						end = curr > start ? curr : next;
						result += "\n" + line.slice(start, end);
						start = end + 1;
					}
					curr = next;
				}
				result += "\n";
				if (line.length - start > width && curr > start) result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
				else result += line.slice(start);
				return result.slice(1);
			}
			function escapeString(string) {
				let result = "";
				let char = 0;
				for (let i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
					char = codePointAt(string, i);
					const escapeSeq = ESCAPE_SEQUENCES[char];
					if (!escapeSeq && isPrintable(char)) {
						result += string[i];
						if (char >= 65536) result += string[i + 1];
					} else result += escapeSeq || encodeHex(char);
				}
				return result;
			}
			function writeFlowSequence(state, level, object) {
				let _result = "";
				const _tag = state.tag;
				for (let index = 0, length = object.length; index < length; index += 1) {
					let value = object[index];
					if (state.replacer) value = state.replacer.call(object, String(index), value);
					if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
						if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
						_result += state.dump;
					}
				}
				state.tag = _tag;
				state.dump = "[" + _result + "]";
			}
			function writeBlockSequence(state, level, object, compact) {
				let _result = "";
				const _tag = state.tag;
				for (let index = 0, length = object.length; index < length; index += 1) {
					let value = object[index];
					if (state.replacer) value = state.replacer.call(object, String(index), value);
					if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
						if (!compact || _result !== "") _result += generateNextLine(state, level);
						if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) _result += "-";
						else _result += "- ";
						_result += state.dump;
					}
				}
				state.tag = _tag;
				state.dump = _result || "[]";
			}
			function writeFlowMapping(state, level, object) {
				let _result = "";
				const _tag = state.tag;
				const objectKeyList = Object.keys(object);
				for (let index = 0, length = objectKeyList.length; index < length; index += 1) {
					let pairBuffer = "";
					if (_result !== "") pairBuffer += ", ";
					if (state.condenseFlow) pairBuffer += "\"";
					const objectKey = objectKeyList[index];
					let objectValue = object[objectKey];
					if (state.replacer) objectValue = state.replacer.call(object, objectKey, objectValue);
					if (!writeNode(state, level, objectKey, false, false)) continue;
					if (state.dump.length > 1024) pairBuffer += "? ";
					pairBuffer += state.dump + (state.condenseFlow ? "\"" : "") + ":" + (state.condenseFlow ? "" : " ");
					if (!writeNode(state, level, objectValue, false, false)) continue;
					pairBuffer += state.dump;
					_result += pairBuffer;
				}
				state.tag = _tag;
				state.dump = "{" + _result + "}";
			}
			function writeBlockMapping(state, level, object, compact) {
				let _result = "";
				const _tag = state.tag;
				const objectKeyList = Object.keys(object);
				if (state.sortKeys === true) objectKeyList.sort();
				else if (typeof state.sortKeys === "function") objectKeyList.sort(state.sortKeys);
				else if (state.sortKeys) throw new YAMLException("sortKeys must be a boolean or a function");
				for (let index = 0, length = objectKeyList.length; index < length; index += 1) {
					let pairBuffer = "";
					if (!compact || _result !== "") pairBuffer += generateNextLine(state, level);
					const objectKey = objectKeyList[index];
					let objectValue = object[objectKey];
					if (state.replacer) objectValue = state.replacer.call(object, objectKey, objectValue);
					if (!writeNode(state, level + 1, objectKey, true, true, true)) continue;
					const explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
					if (explicitPair) if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) pairBuffer += "?";
					else pairBuffer += "? ";
					pairBuffer += state.dump;
					if (explicitPair) pairBuffer += generateNextLine(state, level);
					if (!writeNode(state, level + 1, objectValue, true, explicitPair)) continue;
					if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) pairBuffer += ":";
					else pairBuffer += ": ";
					pairBuffer += state.dump;
					_result += pairBuffer;
				}
				state.tag = _tag;
				state.dump = _result || "{}";
			}
			function detectType(state, object, explicit) {
				const typeList = explicit ? state.explicitTypes : state.implicitTypes;
				for (let index = 0, length = typeList.length; index < length; index += 1) {
					const type = typeList[index];
					if ((type.instanceOf || type.predicate) && (!type.instanceOf || typeof object === "object" && object instanceof type.instanceOf) && (!type.predicate || type.predicate(object))) {
						if (explicit) if (type.multi && type.representName) state.tag = type.representName(object);
						else state.tag = type.tag;
						else state.tag = "?";
						if (type.represent) {
							const style = state.styleMap[type.tag] || type.defaultStyle;
							let _result;
							if (_toString.call(type.represent) === "[object Function]") _result = type.represent(object, style);
							else if (_hasOwnProperty.call(type.represent, style)) _result = type.represent[style](object, style);
							else throw new YAMLException("!<" + type.tag + "> tag resolver accepts not \"" + style + "\" style");
							state.dump = _result;
						}
						return true;
					}
				}
				return false;
			}
			function writeNode(state, level, object, block, compact, iskey, isblockseq) {
				state.tag = null;
				state.dump = object;
				if (!detectType(state, object, false)) detectType(state, object, true);
				const type = _toString.call(state.dump);
				const inblock = block;
				if (block) block = state.flowLevel < 0 || state.flowLevel > level;
				const objectOrArray = type === "[object Object]" || type === "[object Array]";
				let duplicateIndex;
				let duplicate;
				if (objectOrArray) {
					duplicateIndex = state.duplicates.indexOf(object);
					duplicate = duplicateIndex !== -1;
				}
				if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) compact = false;
				if (duplicate && state.usedDuplicates[duplicateIndex]) state.dump = "*ref_" + duplicateIndex;
				else {
					if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) state.usedDuplicates[duplicateIndex] = true;
					if (type === "[object Object]") if (block && Object.keys(state.dump).length !== 0) {
						writeBlockMapping(state, level, state.dump, compact);
						if (duplicate) state.dump = "&ref_" + duplicateIndex + state.dump;
					} else {
						writeFlowMapping(state, level, state.dump);
						if (duplicate) state.dump = "&ref_" + duplicateIndex + " " + state.dump;
					}
					else if (type === "[object Array]") if (block && state.dump.length !== 0) {
						if (state.noArrayIndent && !isblockseq && level > 0) writeBlockSequence(state, level - 1, state.dump, compact);
						else writeBlockSequence(state, level, state.dump, compact);
						if (duplicate) state.dump = "&ref_" + duplicateIndex + state.dump;
					} else {
						writeFlowSequence(state, level, state.dump);
						if (duplicate) state.dump = "&ref_" + duplicateIndex + " " + state.dump;
					}
					else if (type === "[object String]") {
						if (state.tag !== "?") writeScalar(state, state.dump, level, iskey, inblock);
					} else if (type === "[object Undefined]") return false;
					else {
						if (state.skipInvalid) return false;
						throw new YAMLException("unacceptable kind of an object to dump " + type);
					}
					if (state.tag !== null && state.tag !== "?") {
						let tagStr = encodeURI(state.tag[0] === "!" ? state.tag.slice(1) : state.tag).replace(/!/g, "%21");
						if (state.tag[0] === "!") tagStr = "!" + tagStr;
						else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") tagStr = "!!" + tagStr.slice(18);
						else tagStr = "!<" + tagStr + ">";
						state.dump = tagStr + " " + state.dump;
					}
				}
				return true;
			}
			function getDuplicateReferences(object, state) {
				const objects = [];
				const duplicatesIndexes = [];
				inspectNode(object, objects, duplicatesIndexes);
				const length = duplicatesIndexes.length;
				for (let index = 0; index < length; index += 1) state.duplicates.push(objects[duplicatesIndexes[index]]);
				state.usedDuplicates = new Array(length);
			}
			function inspectNode(object, objects, duplicatesIndexes) {
				if (object !== null && typeof object === "object") {
					const index = objects.indexOf(object);
					if (index !== -1) {
						if (duplicatesIndexes.indexOf(index) === -1) duplicatesIndexes.push(index);
					} else {
						objects.push(object);
						if (Array.isArray(object)) for (let i = 0, length = object.length; i < length; i += 1) inspectNode(object[i], objects, duplicatesIndexes);
						else {
							const objectKeyList = Object.keys(object);
							for (let i = 0, length = objectKeyList.length; i < length; i += 1) inspectNode(object[objectKeyList[i]], objects, duplicatesIndexes);
						}
					}
				}
			}
			function dump(input, options) {
				options = options || {};
				const state = new State(options);
				if (!state.noRefs) getDuplicateReferences(input, state);
				let value = input;
				if (state.replacer) value = state.replacer.call({ "": value }, "", value);
				if (writeNode(state, 0, value, true, true)) return state.dump + "\n";
				return "";
			}
			module.exports.dump = dump;
		}));
		import_js_yaml = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
			var loader = require_loader();
			var dumper = require_dumper();
			function renamed(from, to) {
				return function() {
					throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
				};
			}
			module.exports.Type = require_type();
			module.exports.Schema = require_schema();
			module.exports.FAILSAFE_SCHEMA = require_failsafe();
			module.exports.JSON_SCHEMA = require_json();
			module.exports.CORE_SCHEMA = require_core();
			module.exports.DEFAULT_SCHEMA = require_default();
			module.exports.load = loader.load;
			module.exports.loadAll = loader.loadAll;
			module.exports.dump = dumper.dump;
			module.exports.YAMLException = require_exception();
			module.exports.types = {
				binary: require_binary(),
				float: require_float(),
				map: require_map(),
				null: require_null(),
				pairs: require_pairs(),
				set: require_set(),
				timestamp: require_timestamp(),
				bool: require_bool(),
				int: require_int(),
				merge: require_merge(),
				omap: require_omap(),
				seq: require_seq(),
				str: require_str()
			};
			module.exports.safeLoad = renamed("safeLoad", "load");
			module.exports.safeLoadAll = renamed("safeLoadAll", "loadAll");
			module.exports.safeDump = renamed("safeDump", "dump");
		})))(), 1);
		({Type, Schema, FAILSAFE_SCHEMA, JSON_SCHEMA, CORE_SCHEMA, DEFAULT_SCHEMA, load, loadAll, dump, YAMLException, types, safeLoad, safeLoadAll, safeDump} = import_js_yaml.default);
		index_vite_proxy_tmp_default = import_js_yaml.default;
	}));
	//#endregion
	//#region js/compiler/slide-compiler.js
	init_js_yaml();
	/**
	* Slide compiler architecture
	*
	* This module owns stateful slide assembly. The line parsers do not mutate the
	* final output directly; they emit operations that are applied here.
	*
	* Responsibilities
	* - buffer lines for the current slide
	* - track sticky macros and local suppressions across slide boundaries
	* - handle hidden-slide transitions and preview markers
	* - inject attribution / AI footer markup
	* - finalize slides and emit the markdown separators Reveal expects
	*
	* In short:
	* - `markdown-line-parsers.js` and `media-line-parsers.js` recognize syntax
	* - this module applies the resulting operations and manages slide state
	* - `markdown-compiler.js` orchestrates the overall pass
	*/
	function createSlideCompiler(options = {}) {
		const { forHandout = false, newSlideOnHeading = true, getSuppressionGroupsForLine, toStackAttrsMarker, extractSlideTransitionValue } = options;
		const processedLines = [];
		const currentSlideLines = [];
		const attributions = [];
		const lastmacros = [];
		const thismacros = [];
		const slideLocalSuppressions = /* @__PURE__ */ new Set();
		let aiSymbolRequested = false;
		let slideHidden = false;
		let slideHiddenPreviewMarked = false;
		let currentSlideBreakIndex = -1;
		let previousSeparatorType = null;
		let pendingAutoStackTransition = null;
		let blankslide = true;
		/** Tracks per-slide suppression groups derived from emitted slide metadata. */
		function rememberLocalSuppressions(value) {
			for (const group of getSuppressionGroupsForLine(value)) slideLocalSuppressions.add(group);
		}
		function markContentLine(line) {
			if (line.trim() !== "" && !line.trim().match(/^<!--.*?-->$/)) blankslide = false;
		}
		function detectAutoSlide(line) {
			return Boolean(newSlideOnHeading && line.match(/^#{1,3} (?!#)/) && !blankslide);
		}
		function getBreakType(line, autoSlide) {
			if (autoSlide) return /^###\s*/.test(line) ? "vertical" : "horizontal";
			if (line === "---") return "vertical";
			if (line === "***") return "horizontal";
			return null;
		}
		function getBreakLine(line, autoSlide) {
			if (autoSlide) return /^###\s*/.test(line) ? "---" : "***";
			return line === "---" || line === "***" ? line : null;
		}
		function shouldFinalize(line, index, totalLines, autoSlide) {
			return autoSlide || line === "---" || line === "***" || line.match(/^[Nn][Oo][Tt][Ee]\:/) || index >= totalLines - 1;
		}
		function enterHiddenSlide() {
			currentSlideLines.length = 0;
			slideHidden = true;
		}
		function markHiddenPreview() {
			if (slideHiddenPreviewMarked) return false;
			currentSlideLines.push("<!-- .slide: data-hidden-preview -->");
			slideHiddenPreviewMarked = true;
			return true;
		}
		function handleHiddenSlide(line, index, totalLines, autoSlide) {
			if (!slideHidden) return {
				skipLine: false,
				exitedHiddenSlide: false
			};
			if (!shouldFinalize(line, index, totalLines, autoSlide)) return {
				skipLine: true,
				exitedHiddenSlide: false
			};
			const breakLine = getBreakLine(line, autoSlide);
			if (breakLine && currentSlideBreakIndex >= 0) processedLines[currentSlideBreakIndex] = breakLine;
			slideHidden = false;
			slideHiddenPreviewMarked = false;
			blankslide = !autoSlide;
			thismacros.length = 0;
			slideLocalSuppressions.clear();
			attributions.length = 0;
			aiSymbolRequested = false;
			if (!autoSlide && (line === "---" || line === "***")) return {
				skipLine: true,
				exitedHiddenSlide: true
			};
			return {
				skipLine: false,
				exitedHiddenSlide: true
			};
		}
		function appendLine(line) {
			currentSlideLines.push(line);
		}
		function addStickyMacro(value) {
			thismacros.push(value);
		}
		function resetStickyMacros() {
			lastmacros.length = 0;
		}
		function requestAiSymbol() {
			if (!forHandout) aiSymbolRequested = true;
		}
		function addAttribution(value) {
			attributions.push(value);
		}
		function setPendingAutoStackTransition(value) {
			pendingAutoStackTransition = value;
		}
		function flushCurrentSlideLines() {
			if (currentSlideLines.length === 0) return;
			processedLines.push(...currentSlideLines);
			currentSlideLines.length = 0;
		}
		function finalizeSlide(line, autoSlide, columnPipeState) {
			const breakType = getBreakType(line, autoSlide);
			let nextColumnPipeState = columnPipeState;
			if (nextColumnPipeState !== 0) {
				console.warn("Unclosed column section before slide break.");
				nextColumnPipeState = 0;
			}
			flushCurrentSlideLines();
			if (thismacros.length > 0) {
				lastmacros.length = 0;
				lastmacros.push(...thismacros);
			} else {
				let skipNextStickyAttrib = false;
				for (const val of lastmacros) {
					const suppressedGroups = getSuppressionGroupsForLine(val);
					if (suppressedGroups.some((group) => slideLocalSuppressions.has(group))) {
						if (suppressedGroups.includes("background")) skipNextStickyAttrib = true;
						continue;
					}
					const attribMatch = val.match(/^\{\{attrib:(.*)}}\s*$/i);
					if (attribMatch) {
						if (skipNextStickyAttrib) {
							skipNextStickyAttrib = false;
							continue;
						}
						attributions.push(attribMatch[1]);
						continue;
					}
					skipNextStickyAttrib = false;
					if (val.match(/^{{ai}}\s*$/i)) {
						requestAiSymbol();
						continue;
					}
					const transitionValue = extractSlideTransitionValue(val);
					if (transitionValue) pendingAutoStackTransition = transitionValue;
					processedLines.push(val);
				}
				processedLines.push("");
			}
			thismacros.length = 0;
			slideLocalSuppressions.clear();
			slideHiddenPreviewMarked = false;
			if (attributions.length > 0) {
				processedLines.push("<div class=\"slide-attribution\">");
				for (const attrib of attributions) processedLines.push(`<div class="attribution">${attrib}</div>`);
				processedLines.push("</div>");
				processedLines.push("");
				attributions.length = 0;
			}
			if (aiSymbolRequested) {
				processedLines.push("<div class=\"slide-ai-symbol\">");
				processedLines.push("</div>");
				processedLines.push("");
				aiSymbolRequested = false;
			}
			if (breakType === "vertical" && previousSeparatorType !== "vertical" && pendingAutoStackTransition) {
				processedLines.push(toStackAttrsMarker(`data-transition="${pendingAutoStackTransition}"`));
				processedLines.push("");
			}
			if (autoSlide) {
				processedLines.push(getBreakLine(line, true));
				processedLines.push("");
				currentSlideLines.push(line);
				currentSlideBreakIndex = processedLines.length - 2;
			} else if (line === "---" || line === "***") {
				processedLines.push(line);
				currentSlideBreakIndex = processedLines.length - 1;
			} else {
				processedLines.push(line);
				currentSlideBreakIndex = processedLines.length - 1;
			}
			if (breakType) previousSeparatorType = breakType;
			pendingAutoStackTransition = null;
			blankslide = !autoSlide;
			return { nextColumnPipeState };
		}
		function applyOperation(operation) {
			if (!operation || typeof operation !== "object") return;
			switch (operation.type) {
				case "append_line":
					appendLine(operation.value);
					return;
				case "remember_local_suppressions":
					rememberLocalSuppressions(operation.value);
					return;
				case "add_sticky_macro":
					addStickyMacro(operation.value);
					return;
				case "reset_sticky_macros":
					resetStickyMacros();
					return;
				case "request_ai_symbol":
					requestAiSymbol();
					return;
				case "add_attribution":
					addAttribution(operation.value);
					return;
				case "set_pending_transition":
					setPendingAutoStackTransition(operation.value);
					return;
				case "enter_hidden_slide":
					enterHiddenSlide();
					return;
				case "mark_hidden_preview": return markHiddenPreview();
				default: throw new Error(`Unknown slide compiler operation: ${operation.type}`);
			}
		}
		function applyOperations(operations = []) {
			const results = [];
			for (const operation of operations) results.push(applyOperation(operation));
			return results;
		}
		return {
			state: {
				processedLines,
				currentSlideLines,
				attributions,
				lastmacros,
				thismacros,
				slideLocalSuppressions
			},
			rememberLocalSuppressions,
			markContentLine,
			detectAutoSlide,
			shouldFinalize,
			handleHiddenSlide,
			enterHiddenSlide,
			markHiddenPreview,
			appendLine,
			addStickyMacro,
			resetStickyMacros,
			requestAiSymbol,
			addAttribution,
			setPendingAutoStackTransition,
			applyOperation,
			applyOperations,
			finalizeSlide
		};
	}
	//#endregion
	//#region js/compiler/markdown-line-parsers.js
	/**
	* Markdown line parsers
	*
	* Recognizes non-media REVELation line syntax and emits compiler operations
	* instead of mutating slide state directly.
	*/
	function createMarkdownLineParsers(context) {
		const { macros, forHandout, showHiddenSlidesInPreview, slideLocalSuppressions, parseHideTarget, shouldHideCurrentSlide, buildCountdownMarkup, resolveMediaAlias, convertStackDirectiveLine, extractSlideTransitionValue, applyOperations, processBackgroundStickyImage, ops } = context;
		const { appendLineOp, rememberSuppressionsOp, addStickyMacroOp, resetStickyMacrosOp, requestAiSymbolOp, addAttributionOp, setPendingTransitionOp, enterHiddenSlideOp, markHiddenPreviewOp } = ops;
		const parseMacroParams = (key, paramString) => {
			if (key === "bgtint") return [paramString ?? ""];
			if (!paramString) return [];
			if (key === "audio") {
				const parts = paramString.split(":");
				if (parts.length <= 1) return parts;
				return [parts[0], parts.slice(1).join(":")];
			}
			return paramString.split(":");
		};
		const expandMacroTemplateLines = (template, params) => template.replace(/\$(\d+)/g, (_, n) => resolveMediaAlias(params[+n - 1] ?? "")).split("\n");
		const expandStickyMacroWithNesting = (key, params, depth = 0, visited = /* @__PURE__ */ new Set()) => {
			if (depth > 10) return [];
			if (visited.has(key)) return [];
			const template = macros[key];
			if (!template) return [];
			const expandedLines = expandMacroTemplateLines(template, params);
			const visited2 = new Set(visited);
			visited2.add(key);
			const result = [];
			for (const line of expandedLines) {
				const nestedMatch = line.match(/^\{\{([A-Za-z0-9_]+)(?::([^}]+))?\}\}$/);
				if (nestedMatch && macros[nestedMatch[1].trim().toLowerCase()]) {
					const nestedKey = nestedMatch[1].trim().toLowerCase();
					const nestedParamString = nestedMatch[2];
					const nestedExpanded = expandStickyMacroWithNesting(nestedKey, parseMacroParams(nestedKey, nestedParamString), depth + 1, visited2);
					result.push(...nestedExpanded);
				} else result.push(line);
			}
			return result;
		};
		const applyExpandedInlineMacro = (expandedLines) => {
			for (const mline of expandedLines) {
				const normalizedLine = convertStackDirectiveLine(mline);
				const lineOps = [rememberSuppressionsOp(normalizedLine)];
				const attribMatch = normalizedLine.match(/^\{\{attrib:(.*)}}\s*$/i);
				if (attribMatch) {
					lineOps.push(addAttributionOp(attribMatch[1]));
					applyOperations(lineOps);
					continue;
				}
				const transitionValue = extractSlideTransitionValue(normalizedLine);
				if (transitionValue) lineOps.push(setPendingTransitionOp(transitionValue));
				lineOps.push(appendLineOp(normalizedLine));
				applyOperations(lineOps);
			}
		};
		const applyExpandedStickyMacro = (expandedLines) => {
			for (const mline of expandedLines) {
				const bgStickyMatch = mline.match(/^!\[background:sticky\]\(([^)]+)\)\s*$/);
				const processedLine = bgStickyMatch && processBackgroundStickyImage ? processBackgroundStickyImage(bgStickyMatch[1]) : mline;
				const normalizedLine = processedLine ? convertStackDirectiveLine(processedLine) : mline;
				const lineOps = [addStickyMacroOp(normalizedLine), rememberSuppressionsOp(normalizedLine)];
				const attribMatch = normalizedLine.match(/^\{\{attrib:(.*)}}\s*$/i);
				if (attribMatch) {
					lineOps.push(addAttributionOp(attribMatch[1]));
					applyOperations(lineOps);
					continue;
				}
				const transitionValue = extractSlideTransitionValue(normalizedLine);
				if (transitionValue) lineOps.push(setPendingTransitionOp(transitionValue));
				lineOps.push(appendLineOp(normalizedLine));
				applyOperations(lineOps);
			}
		};
		const tryHandleInlineMacroLine = (line) => {
			const inlineMacroMatch = line.match(/^:([A-Za-z0-9_]+)(?::(.*))?:\s*$/);
			if (!inlineMacroMatch) return false;
			const key = inlineMacroMatch[1].trim().toLowerCase();
			const paramString = inlineMacroMatch[2];
			const params = parseMacroParams(key, paramString);
			if (key === "caption") return true;
			if (key === "attrib" || key === "ai" || key.startsWith("column")) return false;
			if (key === "hide") {
				const hideTarget = parseHideTarget(paramString);
				const shouldHideSlide = shouldHideCurrentSlide(hideTarget, forHandout);
				const shouldPreviewHiddenSlide = !forHandout && showHiddenSlidesInPreview && shouldHideCurrentSlide(hideTarget, false);
				if (shouldHideSlide && !shouldPreviewHiddenSlide) {
					applyOperations([enterHiddenSlideOp()]);
					return true;
				}
				if (shouldPreviewHiddenSlide) {
					applyOperations([markHiddenPreviewOp()]);
					return true;
				}
				if (hideTarget) return true;
				console.log("Markdown Hide Inline Macro Not Found or Invalid: " + paramString);
				return false;
			}
			const localSuppressionTarget = {
				shiftnone: "shift",
				nobg: "bgmode",
				clearbg: "background",
				nothird: "third"
			}[key];
			if (localSuppressionTarget) {
				slideLocalSuppressions.add(localSuppressionTarget);
				return true;
			}
			if (key === "countdown") {
				const countdownMarkup = buildCountdownMarkup(params);
				if (countdownMarkup) {
					applyOperations([appendLineOp(countdownMarkup)]);
					return true;
				}
				console.log("Markdown Countdown Inline Macro Not Found or Invalid: " + paramString);
				return false;
			}
			if (key === "animate") {
				const mode = params[0]?.trim().toLowerCase() || "";
				if (!mode) {
					applyOperations([appendLineOp("<!-- .slide: data-auto-animate -->")]);
					return true;
				}
				if (mode === "restart") {
					applyOperations([appendLineOp("<!-- .slide: data-auto-animate-restart -->")]);
					return true;
				}
				console.log("Markdown Animate Inline Macro Not Found: " + paramString);
				return false;
			}
			if (key === "audio") {
				const command = params[0]?.toLowerCase() || "";
				const src = resolveMediaAlias(params[1] || "");
				let audioLine = "";
				if (command === "stop") audioLine = `<!-- .slide: data-background-audio-stop -->`;
				else if (command === "play" && src) audioLine = `<!-- .slide: data-background-audio-start="${encodeURI(src)}" -->`;
				else if ((command === "playloop" || command === "loop") && src) audioLine = `<!-- .slide: data-background-audio-loop="${encodeURI(src)}" -->`;
				else console.log("Markdown Audio Inline Macro Not Found or Missing File: " + paramString);
				if (audioLine) {
					applyOperations([appendLineOp(audioLine)]);
					return true;
				}
				return false;
			}
			const template = macros[key];
			if (!template) {
				console.log("Markdown Inline Macro Not Found: " + key);
				return false;
			}
			applyExpandedInlineMacro(expandMacroTemplateLines(template, params));
			return true;
		};
		const tryHandleMacroUseLine = (line) => {
			const macroUseMatch = line.match(/^\{\{([A-Za-z0-9_]+)(?::([^}]+))?\}\}$/);
			if (!macroUseMatch) return false;
			const key = macroUseMatch[1].trim();
			const paramString = macroUseMatch[2];
			const normalizedKey = key.toLowerCase();
			const params = parseMacroParams(normalizedKey, paramString);
			if (normalizedKey === "transition") {
				const transitionValue = params[0]?.trim() || "";
				if (transitionValue) {
					const transitionLine = `<!-- .slide: data-transition="${transitionValue}" -->`;
					applyOperations([
						addStickyMacroOp(transitionLine),
						appendLineOp(transitionLine),
						setPendingTransitionOp(transitionValue),
						resetStickyMacrosOp()
					]);
					return true;
				}
				console.log("Markdown Transition Macro Not Found: " + paramString);
				return false;
			}
			if (normalizedKey === "animate") {
				const mode = params[0]?.trim().toLowerCase() || "";
				const animateLine = !mode ? "<!-- .slide: data-auto-animate -->" : mode === "restart" ? "<!-- .slide: data-auto-animate-restart -->" : "";
				if (animateLine) {
					applyOperations([
						addStickyMacroOp(animateLine),
						appendLineOp(animateLine),
						resetStickyMacrosOp()
					]);
					return true;
				}
				console.log("Markdown Animate Macro Not Found: " + paramString);
				return false;
			}
			if (normalizedKey === "audio") {
				const command = params[0]?.toLowerCase() || "";
				const src = resolveMediaAlias(params[1] || "");
				let audioLine = "";
				if (command === "stop") audioLine = `<!-- .slide: data-background-audio-stop -->`;
				else if (command === "play" && src) audioLine = `<!-- .slide: data-background-audio-start="${encodeURI(src)}" -->`;
				else if ((command === "playloop" || command === "loop") && src) audioLine = `<!-- .slide: data-background-audio-loop="${encodeURI(src)}" -->`;
				else console.log("Markdown Audio Macro Not Found or Missing File: " + paramString);
				if (audioLine) {
					if (command === "stop") applyOperations([appendLineOp(audioLine)]);
					else applyOperations([
						addStickyMacroOp(audioLine),
						appendLineOp(audioLine),
						resetStickyMacrosOp()
					]);
					return true;
				}
				return false;
			}
			if (!macros[key]) {
				console.log("Markdown Macro Not Found: " + key);
				return false;
			}
			applyExpandedStickyMacro(expandStickyMacroWithNesting(key, params));
			applyOperations([resetStickyMacrosOp()]);
			return true;
		};
		const tryHandleStickyMetaLine = (line) => {
			const stickyAttribMatch = line.match(/^\{{attrib:(.*)}}\s*$/i);
			if (stickyAttribMatch) {
				const attribText = stickyAttribMatch[1].replace("(c)", "©");
				applyOperations([addStickyMacroOp(`{{attrib:${attribText}}}`), addAttributionOp(attribText)]);
				return true;
			}
			if (line.match(/^{{ai}}\s*$/i)) {
				if (!forHandout) applyOperations([requestAiSymbolOp(), addStickyMacroOp("{{ai}}")]);
				return true;
			}
			const attribMatch = line.match(/^\:ATTRIB\:(.*)$/i);
			if (attribMatch) {
				applyOperations([addAttributionOp(attribMatch[1].replace("*(c)", "©"))]);
				return true;
			}
			if (line.match(/^:AI:\s*$/i)) {
				if (!forHandout) applyOperations([requestAiSymbolOp()]);
				return true;
			}
			return false;
		};
		return {
			tryHandleInlineMacroLine,
			tryHandleMacroUseLine,
			tryHandleStickyMetaLine
		};
	}
	//#endregion
	//#region js/compiler/media-line-parsers.js
	/**
	* Media line parsers
	*
	* Recognizes media aliases, magic-image syntax, and plain markdown video
	* shorthands, then emits compiler operations for the slide compiler.
	*/
	function createMediaLineParsers(context) {
		const { forHandout, media, prefersHigh, isHighVariantAvailable, applyOperations, magicImageHandlers, isVideoSource, ops } = context;
		const { appendLineOp, addAttributionOp } = ops;
		const tr = (key) => {
			if (typeof window !== "undefined" && typeof window.tr === "function") return window.tr(key);
			return key;
		};
		const inferAttributionPrefix = (sourceLine = "") => {
			const line = String(sourceLine || "").trim();
			if (/^!\[background(?::[^\]]+)?\]\(media:[^)]+\)$/i.test(line)) return tr("Background");
			if (/^(?:\{\{audio:play(?:(?:loop))?:media:[^}]+\}\}|:audio:play(?:(?:loop))?:media:[^:]+:)\s*$/i.test(line)) return tr("Audio");
			return "";
		};
		const resolveMediaAliasInLine = (line) => {
			const mediaAliasMatch = line.match(/\bmedia:([a-zA-Z0-9_-]+)\b/);
			let nextLine = line;
			let lastAttribution = null;
			if (mediaAliasMatch && forHandout) return {
				line: nextLine,
				lastAttribution,
				skipLine: true
			};
			if (mediaAliasMatch && media) {
				const item = media[mediaAliasMatch[1]];
				if (item?.filename) {
					let resolvedFile = item.filename;
					if (prefersHigh && isHighVariantAvailable(item)) resolvedFile = item.large_variant.filename;
					let basePath = "../_media/";
					if (typeof window !== "undefined" && window.mediaPath) basePath = window.mediaPath.endsWith("/") ? window.mediaPath : `${window.mediaPath}/`;
					const resolvedSrc = `${basePath}${resolvedFile}`;
					nextLine = nextLine.replace(/\((media:[a-zA-Z0-9_-]+)\)/, `(${resolvedSrc})`);
					nextLine = nextLine.replace(/\"(media:[a-zA-Z0-9_-]+)\"/, `"${resolvedSrc}"`);
					nextLine = nextLine.replace(/(:audio:(?:play|playloop|loop):)(media:[a-zA-Z0-9_-]+)(:)/i, `$1${resolvedSrc}$3`);
					nextLine = nextLine.replace(/(\{\{audio:(?:play|playloop|loop):)(media:[a-zA-Z0-9_-]+)(\}\})/i, `$1${resolvedSrc}$3`);
					if (item.attribution) {
						const prefix = inferAttributionPrefix(line);
						const label = prefix ? `${prefix} ` : "";
						const licenseSuffix = item.license ? ` (${item.license})` : "";
						lastAttribution = `${label}© ${item.attribution}${licenseSuffix}`;
						applyOperations([addAttributionOp(lastAttribution)]);
					}
				}
			}
			return {
				line: nextLine,
				lastAttribution,
				skipLine: false
			};
		};
		const tryHandleMagicImageLine = (line, lastAttribution = null) => {
			const magicImageMatch = line.match(/^!\[([a-zA-Z0-9_-]+)(?::([^\]]+))?\]\((.+?)\)$/);
			if (!magicImageMatch) return false;
			const keyword = magicImageMatch[1].toLowerCase();
			const modifier = magicImageMatch[2]?.trim() || "";
			const rawSrc = magicImageMatch[3];
			const src = rawSrc.startsWith("<") && rawSrc.endsWith(">") ? rawSrc.slice(1, -1) : rawSrc;
			if (forHandout && isVideoSource(src)) return true;
			if (forHandout && keyword === "background") return true;
			const handler = magicImageHandlers[keyword];
			if (!handler) return false;
			applyOperations([appendLineOp(handler(src, modifier, lastAttribution))]);
			return true;
		};
		const tryHandlePlainMediaLine = (line) => {
			const plainMediaMatch = line.match(/^!\[(.*?)\]\((.+?)\)$/);
			if (!plainMediaMatch) return false;
			const altText = plainMediaMatch[1].trim();
			const rawSrc = plainMediaMatch[2].trim();
			const src = rawSrc.startsWith("<") && rawSrc.endsWith(">") ? rawSrc.slice(1, -1) : rawSrc;
			if (forHandout && isVideoSource(src)) return true;
			if (!altText && /\.(webm|mp4|mov|m4v)(\?.*)?$/i.test(src)) {
				applyOperations([appendLineOp(`<video src="${src}" controls playsinline data-imagefit data-imagefit-autovideo></video>`)]);
				return true;
			}
			return false;
		};
		return {
			resolveMediaAliasInLine,
			tryHandleMagicImageLine,
			tryHandlePlainMediaLine
		};
	}
	//#endregion
	//#region js/compiler/html-sanitization.js
	/**
	* Compiler sanitization helpers
	*
	* These helpers sanitize markdown-embedded HTML and rendered HTML fragments
	* using the same safety rules for slideshow and handout output.
	*/
	var URL_ATTR_NAMES = new Set([
		"href",
		"src",
		"xlink:href",
		"formaction",
		"action",
		"poster"
	]);
	var BLOCKED_TAGS = new Set([
		"script",
		"object",
		"embed",
		"applet",
		"base",
		"meta"
	]);
	function stripBlockedTags(input) {
		let source = String(input || "");
		let previous;
		do {
			previous = source;
			source = source.replace(/<\s*(script|object|embed|applet|base|meta|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
			source = source.replace(/<\s*(script|object|embed|applet|base|meta)\b[^>]*\/?\s*>/gi, "");
		} while (source !== previous);
		return source;
	}
	function isDangerousURL(value) {
		const normalized = String(value || "").replace(/[\u0000-\u001F\u007F\s]+/g, "").toLowerCase();
		return normalized.startsWith("javascript:") || normalized.startsWith("vbscript:") || normalized.startsWith("data:");
	}
	function stripDangerousAttributes(input, sep) {
		let source = String(input || "");
		const onRe = new RegExp(`${sep}on[a-z0-9_-]+\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+)`, "gi");
		const srcdocRe = new RegExp(`${sep}srcdoc\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+)`, "gi");
		const srcsetRe = new RegExp(`${sep}srcset\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+)`, "gi");
		const urlRe = new RegExp(`${sep}(href|src|xlink:href|formaction|action|poster)\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "gi");
		const styleRe = new RegExp(`${sep}style\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "gi");
		let previous;
		do {
			previous = source;
			source = source.replace(onRe, "");
			source = source.replace(srcdocRe, "");
			source = source.replace(srcsetRe, "");
			source = source.replace(urlRe, (fullMatch, attrName, fullValue, dqValue, sqValue, bareValue) => {
				return isDangerousURL(dqValue ?? sqValue ?? bareValue ?? "") ? "" : ` ${attrName}=${fullValue}`;
			});
			source = source.replace(styleRe, (fullMatch, fullValue, dqValue, sqValue, bareValue) => {
				const rawValue = dqValue ?? sqValue ?? bareValue ?? "";
				return /expression\s*\(|url\s*\(\s*['"]?\s*javascript:|@import/i.test(rawValue) ? "" : ` style=${fullValue}`;
			});
		} while (source !== previous);
		return source;
	}
	function sanitizeElement(el) {
		const tagName = el.tagName.toLowerCase();
		if (BLOCKED_TAGS.has(tagName)) {
			el.remove();
			console.log(`Removed blocked <${tagName}> element from HTML fragment.`);
			return;
		}
		const attrs = Array.from(el.attributes || []);
		for (const attr of attrs) {
			const name = attr.name.toLowerCase();
			const value = attr.value;
			if (name.startsWith("on") || name === "srcdoc") {
				el.removeAttribute(attr.name);
				console.log(`Removed blocked ${name} attribute from <${tagName}> element.`);
				continue;
			}
			if (URL_ATTR_NAMES.has(name) && isDangerousURL(value)) {
				el.removeAttribute(attr.name);
				console.log(`Removed dangerous URL in ${name} attribute from <${tagName}> element.`);
				continue;
			}
			if (name === "style" && /expression\s*\(|url\s*\(\s*['"]?\s*javascript:|@import/i.test(String(value || ""))) {
				el.removeAttribute(attr.name);
				console.log(`Removed dangerous style content from <${tagName}> element.`);
			}
		}
		if (tagName === "a" && String(el.getAttribute("target") || "").toLowerCase() === "_blank") {
			const currentRel = String(el.getAttribute("rel") || "");
			const relSet = new Set(currentRel.split(/\s+/).filter(Boolean).map((part) => part.toLowerCase()));
			relSet.add("noopener");
			relSet.add("noreferrer");
			el.setAttribute("rel", Array.from(relSet).join(" "));
		}
	}
	function sanitizeElementTree(root) {
		if (!root || typeof root.querySelectorAll !== "function") return root;
		for (const el of root.querySelectorAll("*")) sanitizeElement(el);
		return root;
	}
	function sanitizeMarkdownEmbeddedHTML(markdown) {
		let source = String(markdown || "");
		source = stripBlockedTags(source);
		source = stripDangerousAttributes(source, "(?:\\s|/|&#(?:32|x20);|&nbsp;|&tab;|&#(?:9|xa|xd);)");
		if (source !== markdown) console.log("Sanitized potentially dangerous markdown to remove dangerous content.");
		return source;
	}
	//#endregion
	//#region js/compiler/compiler-utils.js
	/**
	* Shared compiler utilities
	*
	* Small helpers used by both compiler and runtime layers when the logic is not
	* itself responsible for parsing, rendering, or DOM mutation.
	*/
	var NOTE_SEPARATOR_LEGACY = "Note:";
	var NOTE_SEPARATOR_CURRENT = ":note:";
	var NOTE_VERSION_BREAKPOINT = [
		0,
		2,
		6
	];
	var CSS_VERSION_SNAPSHOTS = [{
		folder: "1.0.6",
		breakpoint: [
			1,
			0,
			7
		]
	}];
	function parseSemverTuple(version) {
		const match = String(version || "").trim().match(/^v?(\d+)\.(\d+)\.(\d+)/i);
		if (!match) return null;
		return [
			Number(match[1]),
			Number(match[2]),
			Number(match[3])
		];
	}
	function compareVersionTuples(a, b) {
		if (!Array.isArray(a) || !Array.isArray(b)) return 0;
		for (let i = 0; i < 3; i += 1) {
			const av = Number(a[i] || 0);
			const bv = Number(b[i] || 0);
			if (av > bv) return 1;
			if (av < bv) return -1;
		}
		return 0;
	}
	function getStorageItemSafe(key) {
		try {
			return window.localStorage?.getItem(key) ?? null;
		} catch {
			return null;
		}
	}
	function resolveLegacyCssFolder(metadata = {}) {
		const tuple = parseSemverTuple(metadata?.version);
		for (const { folder, breakpoint } of CSS_VERSION_SNAPSHOTS) if (!tuple || compareVersionTuples(tuple, breakpoint) < 0) return folder;
		return null;
	}
	function usesNewNoteSeparator(metadata = {}) {
		const tuple = parseSemverTuple(metadata?.version);
		if (!tuple) return false;
		return compareVersionTuples(tuple, NOTE_VERSION_BREAKPOINT) > 0;
	}
	function getNoteSeparator(metadata = {}) {
		return usesNewNoteSeparator(metadata) ? NOTE_SEPARATOR_CURRENT : NOTE_SEPARATOR_LEGACY;
	}
	function sanitizeMarkdownFilename(filename) {
		const raw = String(filename || "").trim();
		if (!raw) return null;
		const pathOnly = raw.split("?")[0].split("#")[0].replace(/\\/g, "/");
		const normalized = pathOnly.startsWith("./") ? pathOnly.slice(2) : pathOnly;
		if (!normalized || normalized.startsWith("/")) {
			console.warn(`Blocked invalid markdown filename: ${filename}`);
			return null;
		}
		const segments = normalized.split("/");
		const validSegment = /^[a-zA-Z0-9_.-]+$/;
		if (segments.some((segment) => !segment || segment === "." || segment === ".." || !validSegment.test(segment))) {
			console.warn(`Blocked invalid markdown filename: ${filename}`);
			return null;
		}
		const leaf = segments[segments.length - 1] || "";
		if (!/\.md$/i.test(leaf)) {
			console.warn(`Blocked invalid markdown filename: ${filename}`);
			return null;
		}
		return segments.join("/");
	}
	function resolveExternalFilePath(relativePath, presentationDir) {
		const raw = String(relativePath || "").trim();
		if (!raw || raw.startsWith("/") || raw.includes("?") || raw.includes("#")) return null;
		const segments = raw.replace(/\\/g, "/").split("/");
		if (segments.some((seg) => seg === "." || seg === "..")) {
			console.warn(`Blocked path traversal in external file: ${relativePath}`);
			return null;
		}
		const validSegment = /^[a-zA-Z0-9_.-]+$/;
		if (segments.some((seg) => !seg || !validSegment.test(seg))) {
			console.warn(`Blocked invalid external file path: ${relativePath}`);
			return null;
		}
		return [...presentationDir ? presentationDir.split("/").filter(Boolean) : [], ...segments].join("/");
	}
	//#endregion
	//#region js/compiler/markdown-compiler.js
	/**
	* Markdown compiler architecture
	*
	* This module is the compiler entry point for REVELation presentation markdown.
	* It consumes raw markdown plus compiler options and produces the markdown that
	* Reveal's markdown plugin will render.
	*
	* High-level pipeline
	* 1. `extractFrontMatter()` peels YAML metadata off the top of the document.
	* 2. `runPluginMarkdownPreprocessors()` lets plugins perform source-to-source
	*    markdown transforms before the built-in compiler runs.
	* 3. `preprocessMarkdown()` scans the markdown line-by-line and delegates:
	*    - syntax recognition for macros/directives to `markdown-line-parsers.js`
	*    - media/image recognition to `media-line-parsers.js`
	*    - slide-level state, sticky behavior, and final output assembly to
	*      `slide-compiler.js`
	* 4. Sanitization helpers live in `html-sanitization.js` and are re-exported
	*    here because callers typically treat them as compiler-adjacent behavior.
	*
	* Related modules
	* - `slide-compiler.js`: stateful slide assembly and slide-boundary logic
	* - `markdown-line-parsers.js`: macro/directive recognition -> compiler ops
	* - `media-line-parsers.js`: media/image recognition -> compiler ops
	* - `presentation-segments.js`: fence-aware slide/note segmentation utilities
	* - `compiler-utils.js`: note separator, storage, and filename utilities
	* - `html-sanitization.js`: markdown/rendered HTML sanitization helpers
	*
	* Runtime/bootstrap behavior such as fetching markdown, reading URL params,
	* mutating the DOM, and initializing Reveal lives outside this module in
	* `../presentation-bootstrap.js`.
	*/
	function parseHideTarget(rawValue) {
		const normalized = String(rawValue || "").trim().toLowerCase();
		if (!normalized) return "both";
		if (normalized === "handout" || normalized === "slideshow") return normalized;
		return null;
	}
	function shouldHideCurrentSlide(target, forHandout) {
		if (!target) return false;
		if (target === "both") return true;
		return forHandout ? target === "handout" : target === "slideshow";
	}
	function extractFrontMatter(md) {
		const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
		if (!match) return {
			metadata: {},
			content: md
		};
		const yamlText = match[1];
		const content = md.slice(match[0].length);
		try {
			return {
				metadata: index_vite_proxy_tmp_default.load(yamlText) || {},
				content
			};
		} catch (err) {
			console.error("⚠ Malformed YAML in presentation:", err.message);
			return {
				metadata: {
					title: "{malformed YAML}",
					description: err.message,
					_malformed: true
				},
				content
			};
		}
	}
	/**
	* Runs plugin-provided markdown preprocessors before the built-in compiler.
	* Plugins can transform raw markdown, but they do not directly participate in
	* slide-state assembly; the built-in compiler still owns the final pipeline.
	*/
	function runPluginMarkdownPreprocessors(md, context = {}) {
		if (typeof window === "undefined" || !window.RevelationPlugins) return md;
		const plugins = Object.entries(window.RevelationPlugins).map(([name, plugin]) => ({
			name,
			plugin,
			priority: Number.isFinite(plugin?.priority) ? plugin.priority : 100
		})).sort((a, b) => a.priority - b.priority);
		let transformed = String(md ?? "");
		for (const { name, plugin } of plugins) {
			if (typeof plugin?.preprocessMarkdown !== "function") continue;
			try {
				const next = plugin.preprocessMarkdown(transformed, context);
				if (typeof next === "string") transformed = next;
				else if (next !== void 0 && next !== null) console.warn(`Plugin '${name}' preprocessMarkdown returned non-string value; ignoring.`);
			} catch (err) {
				console.error(`Plugin '${name}' preprocessMarkdown failed:`, err);
			}
		}
		return transformed;
	}
	/**
	* Pre-expands user macros in raw markdown before plugin preprocessors run.
	* This enables user macros to chain into plugin-defined macros (like :lt:).
	*/
	function preExpandUserMacros(md, userMacros) {
		if (!userMacros || Object.keys(userMacros).length === 0) return md;
		const mdStr = String(md ?? "");
		if (!mdStr.includes(":")) return mdStr;
		return mdStr.replace(/^:([A-Za-z0-9_]+)(?::(.*))?:\s*$/gm, (match, key, paramStr) => {
			const normalizedKey = key.trim().toLowerCase();
			if (!(normalizedKey in userMacros)) return match;
			const template = userMacros[normalizedKey];
			const params = paramStr ? paramStr.split(":") : [];
			return template.replace(/\$(\d+)/g, (_, n) => params[+n - 1] ?? "");
		});
	}
	/**
	* Compiles REVELation-flavored markdown into Reveal-compatible markdown.
	*
	* This is the main compiler entry point. It scans the source, recognizes
	* REVELation-specific syntax, emits compiler operations, and relies on the
	* slide compiler to assemble final per-slide output with sticky state and
	* boundary behavior preserved.
	*/
	function preprocessMarkdown(md, userMacros = {}, forHandout = false, media = {}, newSlideOnHeading = true, mediaIndex = null, preferHigh = null, suppressVisualElements = false, appConfig = null, showHiddenSlidesInPreview = false, perSlideSuppress = null) {
		md = preExpandUserMacros(md, userMacros);
		md = runPluginMarkdownPreprocessors(md, {
			forHandout,
			userMacros,
			media,
			newSlideOnHeading,
			mediaIndex,
			preferHigh,
			suppressVisualElements,
			appConfig,
			parseYAML: (text) => index_vite_proxy_tmp_default.load(text)
		});
		const lines = md.split("\n");
		const macros = {
			darkbg: `<!-- .slide: data-darkbg -->`,
			lightbg: `<!-- .slide: data-lightbg -->`,
			darktext: `<!-- .slide: data-darktext -->`,
			lighttext: `<!-- .slide: data-lighttext -->`,
			shiftright: `<!-- .slide: data-shiftright -->`,
			shiftleft: `<!-- .slide: data-shiftleft -->`,
			lowerthird: `<!-- .slide: data-lower-third -->`,
			upperthird: `<!-- .slide: data-upper-third -->`,
			info: `<!-- .slide: data-infoslide --><div class="info-head"></div><div class="info-body"></div>`,
			infofull: `<!-- .slide: data-infoslide data-infoslidefull --></div><div class="info-body info-bodyfull"></div>`,
			columnstart: `<div class="flexcontainer"><div class="first">`,
			columnbreak: `</div><div class="second">`,
			columnend: `</div></div>`,
			bgtint: `<!-- .slide: data-tint-color="$1" -->`,
			transition: `<!-- .slide: data-transition="$1" -->`,
			animate: `<!-- .slide: data-auto-animate -->`,
			autoslide: `<!-- .slide: data-autoslide="$1" -->`,
			audiostart: `<!-- .slide: data-background-audio-start="$1" -->`,
			audioloop: `<!-- .slide: data-background-audio-loop="$1" -->`,
			audiostop: `<!-- .slide: data-background-audio-stop -->`,
			...userMacros
		};
		const getSuppressionGroupsForLine = (value) => {
			const groups = [];
			const text = String(value || "");
			if (/\bdata-background-(image|video)\s*=/i.test(text)) groups.push("background");
			if (/\bdata-shift(left|right)\b/i.test(text)) groups.push("shift");
			if (/\bdata-(darkbg|lightbg)\b/i.test(text)) groups.push("bgmode");
			if (/\bdata-tint-color\s*=/i.test(text)) groups.push("bgtint");
			if (/\bdata-(lower-third|upper-third)\b/i.test(text)) groups.push("third");
			return groups;
		};
		const convertUnderscoreCites = (value) => String(value ?? "").replace(/(^|[\s([{<'"])_([^\s_](?:[^_]*?[^\s_])?)_(?=$|[\s)\]}'".,!?;:])/g, (_, prefix, inner) => `${prefix}<cite>${inner}</cite>`);
		const convertDoubleUnderscoreUnderlines = (value) => String(value ?? "").replace(/(^|[\s([{<'"])__([^\s_](?:[^_]*?[^\s_])?)__(?=$|[\s)\]}'".,!?;:])/g, (_, prefix, inner) => `${prefix}<u>${inner}</u>`);
		const iframeSandboxAttr = "sandbox=\"allow-scripts allow-same-origin allow-forms\"";
		const magicImageHandlers = {};
		const totalLines = lines.length;
		let index = -1;
		let insideCodeBlock = false;
		let currentFence = "";
		let columnPipeState = 0;
		const mediaIndexMap = mediaIndex && typeof mediaIndex === "object" ? mediaIndex : null;
		const prefersHigh = typeof preferHigh === "boolean" ? preferHigh : getStorageItemSafe("options_media-version") === "high";
		const isVideoSource = (value) => /\.(webm|mp4|mov|m4v)(\?.*)?(#.*)?$/i.test(String(value || "").trim());
		const isHighVariantAvailable = (item) => {
			if (!item?.large_variant?.filename) return false;
			if (!mediaIndexMap) return false;
			return mediaIndexMap[item.filename]?.large_variant_local === true;
		};
		const resolveMediaAlias = (input) => {
			if (!input || !media) return input;
			const aliasMatch = input.match(/^media:([a-zA-Z0-9_-]+)$/);
			if (!aliasMatch) return input;
			const item = media[aliasMatch[1]];
			if (!item?.filename) return input;
			let resolvedFile = item.filename;
			if (prefersHigh && isHighVariantAvailable(item)) resolvedFile = item.large_variant.filename;
			let basePath = "../_media/";
			if (typeof window !== "undefined" && window.mediaPath) basePath = window.mediaPath.endsWith("/") ? window.mediaPath : `${window.mediaPath}/`;
			return `${basePath}${resolvedFile}`;
		};
		const escapeHtmlAttr = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		const parseWebEmbedSpec = (modifier, srcPart) => {
			const resolvedSrc = resolveMediaAlias(String(srcPart || "").trim()).trim();
			if (!resolvedSrc || isDangerousURL(resolvedSrc)) return null;
			const options = {
				scrollX: 0,
				scrollY: 0,
				overflowX: 0,
				overflowY: 8192,
				hasScrollDirective: false
			};
			const optionsPart = String(modifier || "").trim();
			if (optionsPart) for (const token of optionsPart.split(",")) {
				const [rawKey, rawVal] = token.split("=");
				const key = String(rawKey || "").trim().toLowerCase();
				const parsed = Number.parseFloat(String(rawVal || "").trim());
				if (Number.isFinite(parsed) && parsed >= 0) {
					if (key === "scrollx") {
						options.scrollX = Math.round(parsed);
						options.hasScrollDirective = true;
					} else if (key === "scrolly") {
						options.scrollY = Math.round(parsed);
						options.hasScrollDirective = true;
					} else if (key === "overflowx") options.overflowX = Math.round(parsed);
					else if (key === "overflowy") options.overflowY = Math.round(parsed);
				}
			}
			return {
				src: resolvedSrc,
				...options
			};
		};
		const pad2 = (value) => String(Math.max(0, Number.parseInt(value, 10) || 0)).padStart(2, "0");
		const formatCountdownDisplay = (seconds) => {
			const total = Math.max(0, Number.parseInt(seconds, 10) || 0);
			const hours = Math.floor(total / 3600);
			const minutes = Math.floor(total % 3600 / 60);
			const secs = total % 60;
			return hours > 0 ? `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)}` : `${pad2(minutes)}:${pad2(secs)}`;
		};
		const buildCountdownMarkup = (params) => {
			const mode = (params[0] || "").trim().toLowerCase();
			if (mode === "from") {
				const n1 = Number.parseInt(params[1], 10);
				const n2 = Number.parseInt(params[2], 10);
				const n3 = Number.parseInt(params[3], 10);
				if (params.length >= 4 && Number.isFinite(n3)) {
					const totalSeconds = Math.max(0, n1 || 0) * 3600 + Math.max(0, n2 || 0) * 60 + Math.max(0, n3 || 0);
					return `<h2 class="countdown" data-countdown-mode="from" data-countdown-seconds="${totalSeconds}">${formatCountdownDisplay(totalSeconds)}</h2>`;
				}
				if (Number.isFinite(n1) && Number.isFinite(n2)) {
					const totalSeconds = Math.max(0, n1) * 60 + Math.max(0, n2);
					return `<h2 class="countdown" data-countdown-mode="from" data-countdown-seconds="${totalSeconds}">${formatCountdownDisplay(totalSeconds)}</h2>`;
				}
				return "";
			}
			if (mode === "to") {
				const hours = Number.parseInt(params[1], 10);
				const minutes = Number.parseInt(params[2], 10);
				if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "";
				const normalizedHours = (hours % 24 + 24) % 24;
				const normalizedMinutes = (minutes % 60 + 60) % 60;
				return `<h2 class="countdown" data-countdown-mode="to" data-countdown-hour="${normalizedHours}" data-countdown-minute="${normalizedMinutes}">${pad2(normalizedHours)}:${pad2(normalizedMinutes)}</h2>`;
			}
			return "";
		};
		const toStackAttrsMarker = (attributeString) => `<div class="revelation-stack-attrs" data-stack-attrs="${encodeURIComponent(attributeString)}" hidden></div>`;
		const extractSlideTransitionValue = (value) => {
			const match = value.match(/<!--\s*\.slide:\s*[^>]*\bdata-transition="([^"]+)"[^>]*-->/i);
			return match ? match[1] : null;
		};
		const convertStackDirectiveLine = (value) => {
			const stackCommentMatch = value.match(/^\s*<!--\s*\.stack:\s*(\S.+?)\s*-->\s*$/i);
			return stackCommentMatch ? toStackAttrsMarker(stackCommentMatch[1]) : value;
		};
		const compiler = createSlideCompiler({
			forHandout,
			newSlideOnHeading,
			getSuppressionGroupsForLine,
			toStackAttrsMarker,
			extractSlideTransitionValue
		});
		const { processedLines, lastmacros, thismacros, slideLocalSuppressions } = compiler.state;
		const applyOperations = (operations) => compiler.applyOperations(operations);
		const appendLineOp = (value) => ({
			type: "append_line",
			value
		});
		const rememberSuppressionsOp = (value) => ({
			type: "remember_local_suppressions",
			value
		});
		const addStickyMacroOp = (value) => ({
			type: "add_sticky_macro",
			value
		});
		const resetStickyMacrosOp = () => ({ type: "reset_sticky_macros" });
		const requestAiSymbolOp = () => ({ type: "request_ai_symbol" });
		const addAttributionOp = (value) => ({
			type: "add_attribution",
			value
		});
		const setPendingTransitionOp = (value) => ({
			type: "set_pending_transition",
			value
		});
		const enterHiddenSlideOp = () => ({ type: "enter_hidden_slide" });
		const markHiddenPreviewOp = () => ({ type: "mark_hidden_preview" });
		const processBackgroundStickyImage = (src) => {
			if (!src) return null;
			let trimmedSrc = String(src).trim();
			if (trimmedSrc.startsWith("<") && trimmedSrc.endsWith(">")) trimmedSrc = trimmedSrc.slice(1, -1);
			const resolvedSrc = resolveMediaAlias(trimmedSrc);
			return /\.(webm|mp4|mov|m4v)$/i.test(resolvedSrc) ? `<!-- .slide: data-background-video="${resolvedSrc}" data-background-video-loop data-background-video-muted -->` : `<!-- .slide: data-background-image="${resolvedSrc}" -->`;
		};
		const { tryHandleInlineMacroLine, tryHandleMacroUseLine, tryHandleStickyMetaLine } = createMarkdownLineParsers({
			macros,
			forHandout,
			showHiddenSlidesInPreview,
			slideLocalSuppressions,
			parseHideTarget,
			shouldHideCurrentSlide,
			buildCountdownMarkup,
			resolveMediaAlias,
			convertStackDirectiveLine,
			extractSlideTransitionValue,
			applyOperations,
			processBackgroundStickyImage,
			ops: {
				appendLineOp,
				rememberSuppressionsOp,
				addStickyMacroOp,
				resetStickyMacrosOp,
				requestAiSymbolOp,
				addAttributionOp,
				setPendingTransitionOp,
				enterHiddenSlideOp,
				markHiddenPreviewOp
			}
		});
		if (!forHandout) {
			magicImageHandlers.background = (src, modifier, attribution) => {
				const isVideo = /\.(webm|mp4|mov|m4v)$/i.test(src);
				const normalizedModifier = String(modifier || "").trim().toLowerCase();
				const tag = isVideo ? `<!-- .slide: data-background-video="${src}"${normalizedModifier !== "noloop" ? " data-background-video-loop" : ""} data-background-video-muted -->` : `<!-- .slide: data-background-image="${src}" -->`;
				slideLocalSuppressions.add("background");
				if (normalizedModifier === "sticky") {
					thismacros.push(tag);
					if (attribution) thismacros.push(`{{attrib:${attribution}}}`);
					lastmacros.length = 0;
				}
				return tag;
			};
			magicImageHandlers.fit = (src, modifier) => {
				const pct = Number.parseFloat(modifier);
				const isVideo = /\.(webm|mp4|mov|m4v)$/i.test(src);
				if (Number.isFinite(pct) && pct > 0) {
					const heightStyle = `calc(${Math.min(100, Math.max(1, Math.round(pct)))} / 100 * var(--slide-height))`;
					return isVideo ? `<video src="${src}" controls playsinline style="height:${heightStyle};width:auto;max-width:100%"></video>` : `<img src="${src}" alt="" style="height:${heightStyle};width:auto;max-width:100%">`;
				}
				return isVideo ? `<video src="${src}" controls playsinline data-imagefit data-imagefill></video>` : `![](<${src}>)<!-- .element data-imagefit data-imagefill-->`;
			};
			magicImageHandlers.fill = (src, modifier) => {
				return /\.(webm|mp4|mov|m4v)$/i.test(src) ? `<video src="${src}" controls playsinline data-imagefit-fill></video>` : `<img src="${src}" alt="" data-imagefit-fill>`;
			};
			magicImageHandlers.youtube = (src, modifier) => {
				const match = src.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|watch\?v=))([\w-]+)/);
				const id = match ? match[1] : null;
				return id ? `<iframe ${modifier === "fit" ? "class=\"youtube-fit\"" : "class=\"youtube-iframe\""} src="https://www.youtube.com/embed/${id}?autoplay=0&mute=1&loop=1&playlist=${id}" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen ${iframeSandboxAttr}></iframe>` : `<!-- Invalid YouTube URL: ${src} -->`;
			};
			magicImageHandlers.web = (src, modifier) => {
				const embed = parseWebEmbedSpec(modifier, src);
				if (!embed) return `<!-- Invalid embed URL: ${src} -->`;
				const safeSrc = escapeHtmlAttr(embed.src);
				const overflowX = Number.isFinite(Number(embed.overflowX)) ? Number(embed.overflowX) : 0;
				const overflowY = Number.isFinite(Number(embed.overflowY)) ? Number(embed.overflowY) : 8192;
				if (!embed.hasScrollDirective) return `<iframe class="revelation-web-iframe" src="${safeSrc}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen ${iframeSandboxAttr}></iframe>`;
				return `<div class="revelation-web-embed" style="--web-overflow-x:${overflowX}px;--web-overflow-y:${overflowY}px;"><iframe src="${safeSrc}" style="margin-left:-${Number(embed.scrollX) || 0}px;margin-top:-${Number(embed.scrollY) || 0}px;" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen ${iframeSandboxAttr}></iframe></div>`;
			};
		}
		magicImageHandlers.caption = (src, modifier) => `
<figure class="captioned-image">
  <img src="${src}" alt="">
  <figcaption>${modifier}</figcaption>
</figure>
  `.trim();
		const { resolveMediaAliasInLine, tryHandleMagicImageLine, tryHandlePlainMediaLine } = createMediaLineParsers({
			forHandout,
			media,
			prefersHigh,
			isHighVariantAvailable,
			applyOperations,
			magicImageHandlers,
			isVideoSource,
			ops: {
				appendLineOp,
				addAttributionOp
			}
		});
		let slideIdx = 0;
		let skipNextLine = false;
		for (let line of lines) {
			index += 1;
			const suppressThisSlide = perSlideSuppress !== null ? perSlideSuppress.has(slideIdx) : suppressVisualElements;
			if (skipNextLine) {
				skipNextLine = false;
				continue;
			}
			const fenceMatch = line.match(/^\s{0,3}((`{3,}|~{3,}))[ \t]*(.*)$/);
			if (fenceMatch) {
				const fence = fenceMatch[1];
				const fenceChar = fence[0];
				const fenceLength = fence.length;
				if (!insideCodeBlock) {
					insideCodeBlock = true;
					currentFence = fence;
				} else if (currentFence && fenceChar === currentFence[0] && fenceLength >= currentFence.length) {
					insideCodeBlock = false;
					currentFence = "";
				}
				applyOperations([appendLineOp(line)]);
				continue;
			}
			if (insideCodeBlock) {
				const trimmedFenceLine = line.trim();
				applyOperations([appendLineOp(trimmedFenceLine === "---" || trimmedFenceLine === "***" || trimmedFenceLine === ":note:" || trimmedFenceLine.toLowerCase() === "Note:".toLowerCase() ? `${line} ` : line)]);
				continue;
			}
			const stackCommentMatch = line.match(/^\s*<!--\s*\.stack:\s*(\S.+?)\s*-->\s*$/i);
			if (stackCommentMatch) {
				applyOperations([appendLineOp(toStackAttrsMarker(stackCommentMatch[1]))]);
				continue;
			}
			const trimmedLine = line.trim();
			const isNoteSeparator = trimmedLine.toLowerCase() === ":note:" || trimmedLine.toLowerCase() === "Note:".toLowerCase();
			const isStickyMacro = /^\s*\{\{[^}]+\}\}\s*$/.test(line);
			const isHideMacro = /^\s*\{\{hide(?::(?:handout|slideshow))?\}\}\s*$/i.test(line) || /^\s*:hide(?::(?:handout|slideshow))?:\s*$/i.test(line);
			const isStickyBackgroundImage = /!\[background:sticky\]\([^)]*\)/.test(line);
			if (perSlideSuppress !== null && !isNoteSeparator && !isHideMacro && (isStickyMacro || isStickyBackgroundImage)) continue;
			if (suppressThisSlide) {
				const isAttribLine = /^\s*:ATTRIB:.*$/i.test(line) || /^\s*:AI:\s*$/i.test(line);
				const hasMarkdownImage = /!\[[^\]]*]\([^)]*\)/.test(line);
				const hasFillMedia = /!\[fill(?::[^\]]*?)?\]\([^)]*\)/i.test(line);
				const hasHtmlVisual = /<\s*(img|iframe|figure)\b/i.test(line);
				const hasBackgroundData = /data-background-(image|audio|audio-start|audio-loop|audio-stop)/i.test(line);
				if (!isNoteSeparator && !isHideMacro && (isStickyMacro || isAttribLine || hasMarkdownImage && !hasFillMedia || hasHtmlVisual || hasBackgroundData)) {
					if (hasMarkdownImage && !hasFillMedia && lines[index + 1] && /^:caption:.*:\s*$/.test(lines[index + 1])) skipNextLine = true;
					continue;
				}
			}
			if (line.match(/^\{\{\}\}$/)) {
				lastmacros.length = 0;
				continue;
			}
			if (line.trim() === "||") {
				const columnKeys = [
					"columnstart",
					"columnbreak",
					"columnend"
				];
				const key = columnKeys[columnPipeState];
				const template = macros[key];
				if (template) applyOperations(template.split("\n").map((expandedLine) => appendLineOp(expandedLine)));
				else console.log("Markdown Column Macro Not Found: " + key);
				columnPipeState = (columnPipeState + 1) % columnKeys.length;
				continue;
			}
			const mediaResolution = resolveMediaAliasInLine(line);
			if (mediaResolution.skipLine) continue;
			line = mediaResolution.line;
			if (tryHandleMagicImageLine(line, mediaResolution.lastAttribution)) continue;
			if (tryHandlePlainMediaLine(line)) continue;
			const trimmedMediaLine = line.trim();
			const isNoteSeparatorLine = trimmedMediaLine.toLowerCase() === ":note:" || trimmedMediaLine.toLowerCase() === "Note:".toLowerCase();
			const autoSlide = compiler.detectAutoSlide(line);
			if (compiler.handleHiddenSlide(line, index, lines.length, autoSlide).skipLine) continue;
			if (isNoteSeparatorLine) {
				applyOperations([appendLineOp(line)]);
				continue;
			}
			{
				const captionNextLine = lines[index + 1];
				const captionLineMatch = captionNextLine !== void 0 ? captionNextLine.match(/^:caption:(.*):\s*$/) : null;
				if (captionLineMatch) {
					const elementCommentMatch = line.match(/\s*<!--\s*\.element:\s*(.*?)\s*-->\s*$/);
					const plainImageMatch = line.replace(/\s*<!--\s*\.element:\s*.*?-->\s*$/, "").replace(/\s*(?:\+\+(?::[a-zA-Z0-9:]+)?|==:[a-zA-Z0-9:]+)$/, "").match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
					if (plainImageMatch) {
						const altText = escapeHtmlAttr(plainImageMatch[1]);
						const src = escapeHtmlAttr(plainImageMatch[2]);
						const captionText = captionLineMatch[1];
						let figureClasses = "captioned-image";
						let extraFigureAttrs = "";
						if (elementCommentMatch) {
							const attrStr = elementCommentMatch[1];
							const classMatch = attrStr.match(/\bclass="([^"]+)"/);
							if (classMatch) figureClasses += " " + classMatch[1];
							const remaining = attrStr.replace(/\bclass="[^"]*"\s*/g, "").trim();
							if (remaining) extraFigureAttrs = " " + remaining;
						} else if (/\s*\+\+(?::[a-zA-Z0-9:]+)?$/.test(line)) figureClasses += " fragment";
						const captionHtml = captionText ? `<figcaption>${captionText}</figcaption>` : "";
						const figureHtml = `<figure class="${figureClasses}"${extraFigureAttrs}><img src="${src}" alt="${altText}">${captionHtml}</figure>`;
						applyOperations([rememberSuppressionsOp(line), appendLineOp(figureHtml)]);
						compiler.markContentLine(figureHtml);
						if (index + 1 >= totalLines - 1) columnPipeState = compiler.finalizeSlide("", false, columnPipeState).nextColumnPipeState;
						skipNextLine = true;
						continue;
					}
				}
			}
			if (tryHandleInlineMacroLine(line) || tryHandleMacroUseLine(line) || tryHandleStickyMetaLine(line)) continue;
			compiler.markContentLine(line);
			if (compiler.shouldFinalize(line, index, lines.length, autoSlide)) {
				columnPipeState = compiler.finalizeSlide(line, autoSlide, columnPipeState).nextColumnPipeState;
				slideIdx++;
				continue;
			}
			let transformedLine = convertUnderscoreCites(convertDoubleUnderscoreUnderlines(line));
			if (/^\s*<cite>.*<\/cite>\s{2,}$/.test(transformedLine)) transformedLine = transformedLine.replace(/\s+$/, "");
			if (/\s*\+\+(?::[a-zA-Z0-9:]+)?$/.test(transformedLine)) {
				const strippedFragment = transformedLine.replace(/\s*\+\+(?::[a-zA-Z0-9:]+)?$/, "");
				const isListItem = /^(\s*(?:\d+[.)]\s+|[-*+]\s+))/.test(strippedFragment);
				const nextLine = lines[index + 1];
				const isEndOfParagraph = !isListItem && (nextLine === void 0 || nextLine.trim() === "");
				const fragmentOutputLine = isListItem || isEndOfParagraph ? strippedFragment + " <!-- .element: data-parentfragment=\"fragment\" -->" : strippedFragment + " <!-- .element: class=\"fragment\" -->";
				applyOperations([rememberSuppressionsOp(transformedLine), appendLineOp(fragmentOutputLine)]);
			} else if (/\s*==:[a-zA-Z0-9:]+$/.test(transformedLine)) applyOperations([rememberSuppressionsOp(transformedLine), appendLineOp(transformedLine.replace(/\s*==:[a-zA-Z0-9:]+$/, ""))]);
			else {
				const transitionValue = extractSlideTransitionValue(transformedLine);
				const ops = [rememberSuppressionsOp(transformedLine)];
				if (transitionValue) ops.push(setPendingTransitionOp(transitionValue));
				ops.push(appendLineOp(transformedLine));
				applyOperations(ops);
			}
		}
		return processedLines.join("\n");
	}
	//#endregion
	//#region js/loader-dom.js
	function ensureHiddenSlidePreviewStyles() {
		if (typeof document === "undefined") return;
		if (document.getElementById("revelation-hidden-slide-preview-styles")) return;
		const styleEl = document.createElement("style");
		styleEl.id = "revelation-hidden-slide-preview-styles";
		styleEl.textContent = `
    #fixed-hidden-preview-wrapper {
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      font-size: clamp(2rem, 7vw, 5rem);
      font-weight: 800;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.9);
      background: rgba(128, 0, 0, 0.28);
      border: 0.2rem solid rgba(255, 255, 255, 0.3);
      pointer-events: none;
      z-index: 30;
      text-shadow: 0 0.08em 0.2em rgba(0, 0, 0, 0.45);
      box-sizing: border-box;
    }
  `;
		document.head.appendChild(styleEl);
	}
	function createAlternativeSelector({ alternatives, sanitizeMarkdownFilename, onSelect }) {
		console.log("Showing Selector for Alternative Version");
		const selector = document.createElement("div");
		selector.style = "position: fixed; top: 40%; left: 40%; background: rgba(0,0,0,0.85); color: white; padding: 1rem; border-radius: 8px; z-index: 9999; font-family: sans-serif;";
		selector.innerHTML = `<strong style="display:block;margin-bottom:0.5rem;">Select Version:</strong>`;
		for (const [file, label] of Object.entries(alternatives)) {
			const sanitizedFile = sanitizeMarkdownFilename(file);
			if (!sanitizedFile) continue;
			if (String(file || "").trim().toLowerCase() === "self") continue;
			if (String(label || "").trim().toLowerCase() === "hidden") continue;
			const btn = document.createElement("button");
			btn.textContent = label;
			btn.style = "display: block; width: 100%; margin: 0.25rem 0; background: #444; color: white; border: none; padding: 0.5rem; border-radius: 4px; cursor: pointer;";
			btn.onclick = async () => {
				document.body.classList.add("hidden");
				selector.remove();
				onSelect(sanitizedFile);
			};
			selector.appendChild(btn);
		}
		document.body.appendChild(selector);
		document.body.classList.remove("hidden");
	}
	var __vitePreload = function preload(baseModule, deps, importerUrl) {
		let promise = Promise.resolve();
		function handlePreloadError(err) {
			const e = new Event("vite:preloadError", { cancelable: true });
			e.payload = err;
			window.dispatchEvent(e);
			if (!e.defaultPrevented) throw err;
		}
		return promise.then((res) => {
			for (const item of res || []) {
				if (item.status !== "rejected") continue;
				handlePreloadError(item.reason);
			}
			return baseModule().catch(handlePreloadError);
		});
	};
	//#endregion
	//#region js/presentation-bootstrap.js
	/**
	* Presentation bootstrap architecture
	*
	* This module is the runtime/bootstrap entry point for slideshow rendering in
	* the browser. It sits above the compiler and is responsible for environment-
	* specific work that should not live in the pure-ish compiler layer.
	*
	* Responsibilities
	* - choose which markdown file to load
	* - read URL params / app config / runtime preferences
	* - resolve variant-specific runtime behavior and styles
	* - load metadata-dependent resources such as the media index
	* - invoke the compiler entry points from `./compiler/markdown-compiler.js`
	* - inject the compiled markdown into the DOM for Reveal
	* - initialize Reveal with the final runtime config
	*
	* Compiler-related logic remains below this layer:
	* - source parsing / front matter: `./compiler/markdown-compiler.js`
	* - sanitization: `./compiler/html-sanitization.js`
	* - DOM-only helper widgets: `./loader-dom.js`
	*/
	var style_path = "/css/";
	function isValidStylesheetPath(value) {
		if (typeof value !== "string" || !value.trim()) return false;
		const trimmed = value.trim();
		if (trimmed.includes("..") || trimmed.startsWith("/") || trimmed.includes("\\")) return false;
		if (/^(https?:|data:|javascript:)/i.test(trimmed)) return false;
		if (!/^[a-zA-Z0-9._\/-]+\.css$/.test(trimmed)) return false;
		return true;
	}
	function computeSuppressedSlides(content) {
		const STICKY_MACRO = /^\s*\{\{[^}]+\}\}\s*$/;
		const HTML_COMMENT = /^\s*<!--/;
		const MD_IMAGE = /!\[[^\]]*\]\([^)]*\)/;
		const HTML_VISUAL = /<\s*(img|video|iframe|figure)\b/i;
		const BG_DATA = /data-background-(image|video|audio)/i;
		const lines = content.split("\n");
		let inFence = false;
		let slideIdx = 0;
		const slidesWithText = /* @__PURE__ */ new Set();
		for (const line of lines) {
			if (/^```/.test(line.trim())) inFence = !inFence;
			if (inFence) {
				slidesWithText.add(slideIdx);
				continue;
			}
			const t = line.trim();
			if (t === "---" || t === "***") {
				slideIdx++;
				continue;
			}
			if (!t) continue;
			if (STICKY_MACRO.test(line) || HTML_COMMENT.test(line) || MD_IMAGE.test(line) || HTML_VISUAL.test(line) || BG_DATA.test(line)) continue;
			slidesWithText.add(slideIdx);
		}
		return slidesWithText;
	}
	/**
	* Loads a presentation source file, compiles it, injects the result into the
	* Reveal markdown container, and initializes the deck with runtime config.
	*/
	async function loadAndPreprocessMarkdown(deck, selectedFile = null) {
		style_path = window.__revelationHostedRoute ? "_resources/css/" : "/css/";
		const defaultFile = "presentation.md";
		const urlParams = new URLSearchParams(window.location.search);
		const variant = (urlParams.get("variant") || "").trim().toLowerCase();
		const forceNoTransitions = variant === "lowerthirds";
		const ccliFromUrl = (urlParams.get("ccli") || "").trim();
		const variantThemeMap = {
			lowerthirds: "lowerthirds.css",
			confidencemonitor: "confidencemonitor.css"
		};
		const variantExtraStylesheetMap = { notes: "notes-teleprompter.css" };
		const suppressVisualElements = variant === "lowerthirds" || variant === "confidencemonitor";
		if (variant) document.body.dataset.variant = variant;
		else delete document.body.dataset.variant;
		if (variant === "lowerthirds") {
			let chromaKeyColor = "#00ff00";
			if (window.AppConfig?.pipColor) chromaKeyColor = window.AppConfig.pipColor;
			else if (window.electronAPI?.getAppConfig) try {
				const cfg = await window.electronAPI.getAppConfig();
				if (cfg?.pipColor) chromaKeyColor = cfg.pipColor;
			} catch {}
			document.documentElement.style.setProperty("--chroma-key-color", chromaKeyColor);
		}
		let rawMarkdown;
		let mediaIndex = null;
		let prefersHigh = false;
		let appConfig = window.AppConfig || null;
		let markdownFile = defaultFile;
		if (typeof window.offlineMarkdown === "string") {
			rawMarkdown = window.offlineMarkdown;
			style_path = "_resources/css/";
		} else {
			const sanitizedSelected = sanitizeMarkdownFilename(selectedFile);
			const customFile = sanitizeMarkdownFilename(urlParams.get("p"));
			markdownFile = sanitizedSelected || customFile || defaultFile;
			let response = await fetch(markdownFile);
			if (!response.ok) {
				console.warn(`Could not load ${markdownFile}, falling back to ${defaultFile}`);
				response = await fetch(defaultFile);
			}
			rawMarkdown = await response.text();
		}
		const macros = {};
		const { metadata, content } = extractFrontMatter(String(rawMarkdown ?? "").replace(/\r\n?/g, "\n"));
		const contentWithBlankSlide = `${content}\n\n---\n\n`;
		const perSlideSuppress = variant === "confidencemonitor" ? computeSuppressedSlides(content) : null;
		const forceControls = urlParams.get("forceControls") === "1";
		const yamlScrollSpeed = Number.parseFloat(metadata.scrollspeed);
		window.RevelationRuntime = window.RevelationRuntime || {};
		if (Number.isFinite(yamlScrollSpeed) && yamlScrollSpeed >= 0) window.RevelationRuntime.notesScrollSpeed = yamlScrollSpeed;
		else delete window.RevelationRuntime.notesScrollSpeed;
		const isExportMode = urlParams.get("exportMode") === "1";
		if (!selectedFile && metadata.alternatives && typeof metadata.alternatives === "object") {
			const alternativeEntries = Object.entries(metadata.alternatives).map(([candidateFile, langCode]) => ({
				file: sanitizeMarkdownFilename(candidateFile),
				langCode: String(langCode || "").trim().toLowerCase(),
				rawKey: String(candidateFile || "").trim().toLowerCase()
			})).filter((entry) => entry.file && entry.rawKey !== "self" && entry.langCode !== "hidden");
			const selectedLang = (urlParams.get("lang") || "").trim().toLowerCase();
			const matchedAlternative = selectedLang ? alternativeEntries.find((entry) => entry.langCode === selectedLang) : null;
			const matchedFile = matchedAlternative ? matchedAlternative.file : null;
			if (matchedFile) return loadAndPreprocessMarkdown(deck, matchedFile);
			if (!selectedLang && alternativeEntries.length && !isExportMode) {
				createAlternativeSelector({
					alternatives: Object.fromEntries(alternativeEntries.map((entry) => [entry.file, entry.langCode])),
					sanitizeMarkdownFilename,
					onSelect: (file) => loadAndPreprocessMarkdown(deck, file)
				});
				document.title = "Waiting for Selection";
				return 1;
			}
		}
		document.title = metadata.title || "Reveal.js Presentation";
		const selectedTheme = variantThemeMap[variant] || metadata.theme;
		if (selectedTheme && isValidStylesheetPath(selectedTheme)) {
			const legacyFolder = resolveLegacyCssFolder(metadata);
			const allowLegacyCss = window.allowLegacyCss !== false;
			const themeDir = legacyFolder && allowLegacyCss ? style_path.replace(/css\/$/, `oldcss/${legacyFolder}/`) : style_path;
			document.getElementById("theme-stylesheet").href = themeDir + selectedTheme;
		}
		if (metadata.stylesheet && isValidStylesheetPath(metadata.stylesheet)) {
			const styleEl = document.createElement("link");
			styleEl.rel = "stylesheet";
			styleEl.href = metadata.stylesheet;
			document.head.appendChild(styleEl);
		}
		const variantExtraStylesheet = variantExtraStylesheetMap[variant];
		const existingVariantStyle = document.getElementById("variant-extra-stylesheet");
		if (variantExtraStylesheet) {
			const styleEl = existingVariantStyle || document.createElement("link");
			styleEl.id = "variant-extra-stylesheet";
			styleEl.rel = "stylesheet";
			styleEl.href = style_path + variantExtraStylesheet;
			if (!existingVariantStyle) document.head.appendChild(styleEl);
		} else if (existingVariantStyle) existingVariantStyle.remove();
		if (metadata.macros && typeof metadata.macros === "object") Object.assign(macros, metadata.macros);
		if (metadata.imports && typeof metadata.imports === "string") try {
			const presentationDir = markdownFile.includes("/") ? markdownFile.substring(0, markdownFile.lastIndexOf("/")) : "";
			const externalPath = resolveExternalFilePath(metadata.imports, presentationDir);
			if (externalPath) {
				const res = await fetch(externalPath);
				if (res.ok) {
					const importsData = (await __vitePreload(() => Promise.resolve().then(() => (init_js_yaml(), js_yaml_exports)), void 0)).default.load(await res.text()) || {};
					if (typeof importsData === "object" && !Array.isArray(importsData)) {
						if (importsData.macros && typeof importsData.macros === "object" && !Array.isArray(importsData.macros)) Object.assign(macros, importsData.macros);
						if (importsData.media && typeof importsData.media === "object" && !Array.isArray(importsData.media)) {
							if (!metadata.media) metadata.media = {};
							Object.assign(metadata.media, importsData.media);
						}
					}
				} else console.warn(`Failed to fetch imports file (${externalPath}): ${res.status}`);
			}
		} catch (err) {
			console.warn(`Error loading imports:`, err);
		}
		const mediaParam = (urlParams.get("media") || "").toLowerCase();
		if (mediaParam === "high") prefersHigh = true;
		else if (mediaParam === "low" || mediaParam === "standard") prefersHigh = false;
		else if (!window.electronAPI) prefersHigh = getStorageItemSafe("options_media-version") === "high";
		if (!appConfig && window.electronAPI?.getAppConfig) try {
			appConfig = await window.electronAPI.getAppConfig();
			window.AppConfig = appConfig;
		} catch {}
		if (ccliFromUrl) appConfig = {
			...appConfig || {},
			ccliLicenseNumber: ccliFromUrl
		};
		try {
			let mediaBasePath = "../_media/";
			if (typeof window !== "undefined" && window.mediaPath) mediaBasePath = window.mediaPath.endsWith("/") ? window.mediaPath : `${window.mediaPath}/`;
			const mediaIndexRes = await fetch(`${mediaBasePath}index.json`, { cache: "no-store" });
			if (mediaIndexRes.ok) mediaIndex = await mediaIndexRes.json();
		} catch (err) {
			console.warn("Media index not available:", err.message);
		}
		if (mediaIndex && metadata.media && typeof metadata.media === "object") for (const key of Object.keys(metadata.media)) {
			const entry = metadata.media[key];
			if (!entry?.filename) continue;
			const indexItem = mediaIndex[entry.filename];
			if (!indexItem) continue;
			if (!entry.large_variant && indexItem.large_variant) entry.large_variant = { ...indexItem.large_variant };
			if (entry.large_variant && entry.large_variant_local === void 0 && indexItem.large_variant_local !== void 0) entry.large_variant_local = indexItem.large_variant_local;
		}
		const partProcessedMarkdown = preprocessMarkdown(contentWithBlankSlide, macros, false, metadata.media, metadata.newSlideOnHeading, mediaIndex, prefersHigh, suppressVisualElements, appConfig, forceControls, perSlideSuppress);
		if (forceControls) ensureHiddenSlidePreviewStyles();
		const processedMarkdown = metadata.convertSmartQuotes === false ? partProcessedMarkdown : convertSmartQuotes(partProcessedMarkdown);
		const sanitizedMarkdown = sanitizeMarkdownEmbeddedHTML(forceNoTransitions ? processedMarkdown.replace(/\sdata-transition="[^"]*"/gi, "").replace(/\sdata-transition-speed="[^"]*"/gi, "") : variant === "confidencemonitor" ? processedMarkdown.replace(/\sdata-transition="[^"]*"/gi, " data-transition=\"none\"").replace(/\sdata-transition-speed="[^"]*"/gi, "") : processedMarkdown);
		const section = document.getElementById("markdown-container");
		section.setAttribute("data-markdown", "");
		section.setAttribute("data-separator", "^\n\\*\\*\\*\n$");
		section.setAttribute("data-separator-vertical", "^\n---\n$");
		const noteSeparator = getNoteSeparator(metadata);
		section.setAttribute("data-separator-notes", noteSeparator === ":note:" ? "^:note:$" : "^Note:$");
		const markdownTemplate = document.createElement("textarea");
		markdownTemplate.setAttribute("data-template", "");
		markdownTemplate.textContent = sanitizedMarkdown;
		section.replaceChildren(markdownTemplate);
		const config = metadata.config || {};
		if (urlParams.has("remoteMultiplexId")) config.scrollActivationWidth = null;
		if (Object.prototype.hasOwnProperty.call(config, "margin")) Number(config.margin);
		if (variant === "notes") {
			config.showNotes = true;
			config.controls = true;
		}
		if (forceControls) {
			config.controls = true;
			config.progress = true;
			config.slideNumber = true;
			config.showSlideNumber = "all";
			config.autoSlide = false;
			config.autoSlideStoppable = false;
		}
		if (forceNoTransitions) {
			config.transition = "none";
			config.backgroundTransition = "none";
		}
		if (variant === "confidencemonitor") {
			config.transition = "none";
			if (metadata.confidence && typeof metadata.confidence === "object") {
				const confWidth = Number(metadata.confidence.width);
				const confHeight = Number(metadata.confidence.height);
				if (Number.isFinite(confWidth) && confWidth > 0) config.width = confWidth;
				if (Number.isFinite(confHeight) && confHeight > 0) config.height = confHeight;
			}
		}
		const updateMarginPxVariable = () => {
			const margin = Number.isFinite(Number(config.margin)) ? Number(config.margin) : .04;
			const configWidth = Number(config.width) || 960;
			const configHeight = Number(config.height) || 700;
			const marginPxH = margin > 0 && margin < 1 ? Math.round(configWidth * margin / (1 - margin) / 2) : 0;
			const marginPxV = margin > 0 && margin < 1 ? Math.round(configHeight * margin / (1 - margin) / 2) : 0;
			document.documentElement.style.setProperty("--reveal-margin-px-h", `${marginPxH}px`);
			document.documentElement.style.setProperty("--reveal-margin-px-v", `${marginPxV}px`);
		};
		updateMarginPxVariable();
		deck.on("ready", () => {
			const slidesRoot = document.querySelector(".reveal .slides");
			if (slidesRoot) sanitizeElementTree(slidesRoot);
			document.querySelectorAll("[data-parentfragment]").forEach((el) => {
				const parent = el.closest("li, p");
				if (!parent) return;
				const classes = (el.getAttribute("data-parentfragment") || "").split(/\s+/).filter(Boolean);
				if (classes.length) parent.classList.add(...classes);
				el.removeAttribute("data-parentfragment");
			});
			if (variant === "confidencemonitor") {
				const updateSpeakerNoteHeading = () => {
					const currentSlide = deck.getCurrentSlide();
					if (!currentSlide) return;
					const notesSection = currentSlide.querySelector("aside.notes");
					let headingText = "";
					if (notesSection) {
						const heading = notesSection.querySelector("h1, h2, h3");
						if (heading) headingText = heading.textContent.trim();
					}
					let headingDiv = document.getElementById("speaker-note-heading-display");
					if (headingText) {
						if (!headingDiv) {
							headingDiv = document.createElement("div");
							headingDiv.id = "speaker-note-heading-display";
							headingDiv.className = "speaker-note-heading";
							document.body.appendChild(headingDiv);
						}
						headingDiv.textContent = headingText.toUpperCase();
						headingDiv.style.display = "block";
					} else if (headingDiv) headingDiv.style.display = "none";
				};
				updateSpeakerNoteHeading();
				deck.on("slidechanged", updateSpeakerNoteHeading);
			}
		});
		deck.initialize(config);
	}
	//#endregion
	//#region js/pluginloader.js
	function pluginLoader(page, prefix) {
		window.RevelationPlugins = {};
		if (window.location.protocol === "file:") {
			showFileProtocolPluginWarning();
			return Promise.resolve([]);
		}
		if (window.__offlinePluginList && typeof window.__offlinePluginList === "object") return handlePluginList(window.__offlinePluginList, page);
		return fetch(`${prefix}/plugins.json`).then((res) => {
			if (!res.ok) throw new Error(`Server error: ${res.status}`);
			return res.json();
		}).then((pluginList) => {
			return handlePluginList(pluginList, page);
		}).catch((err) => {
			console.error("Failed to fetch plugin list:", err);
			return [];
		});
	}
	function showPluginNotice(message, options = {}) {
		const { onceKey = "" } = options;
		if (!window.__revelationPluginNoticeState) window.__revelationPluginNoticeState = { onceKeys: /* @__PURE__ */ new Set() };
		if (onceKey && window.__revelationPluginNoticeState.onceKeys.has(onceKey)) return;
		if (onceKey) window.__revelationPluginNoticeState.onceKeys.add(onceKey);
		console.warn(`[pluginloader] ${message}`);
		if (typeof document === "undefined" || !document.body) return;
		const existing = document.getElementById("plugin-loader-toast");
		if (existing) existing.remove();
		const toast = document.createElement("div");
		toast.id = "plugin-loader-toast";
		toast.textContent = message;
		toast.style.cssText = [
			"position: fixed",
			"left: 50%",
			"bottom: 20px",
			"transform: translateX(-50%)",
			"max-width: min(90vw, 880px)",
			"padding: 10px 14px",
			"border-radius: 8px",
			"background: rgba(20, 20, 20, 0.92)",
			"color: #fff",
			"font: 13px/1.4 system-ui, sans-serif",
			"z-index: 2147483647",
			"box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3)",
			"opacity: 0",
			"transition: opacity 160ms ease"
		].join(";");
		document.body.appendChild(toast);
		requestAnimationFrame(() => {
			toast.style.opacity = "1";
		});
		setTimeout(() => {
			toast.style.opacity = "0";
			toast.addEventListener("transitionend", () => toast.remove(), { once: true });
		}, 3200);
	}
	function showFileProtocolPluginWarning() {
		showPluginNotice("Plugins and some advanced features are disabled when opening presentation HTML directly as file:///.\n\nUse a local web server (http://localhost/...) to enable full functionality.", { onceKey: "file-protocol-warning" });
	}
	function handlePluginList(pluginList, page) {
		const pluginPromises = [];
		for (const [name, plugin] of Object.entries(pluginList)) if (plugin.baseURL && plugin.clientHookJS) {
			let normalizedBaseURL = String(plugin.baseURL || "").replace(/\/+$/, "");
			try {
				normalizedBaseURL = new URL(normalizedBaseURL, window.location.href).toString().replace(/\/+$/, "");
			} catch (err) {
				console.warn(`⚠️ Plugin '${name}' has invalid baseURL '${plugin.baseURL}':`, err);
				continue;
			}
			const scriptURL = `${normalizedBaseURL}/${plugin.clientHookJS}`;
			const promise = new Promise((resolve) => {
				const script = document.createElement("script");
				script.src = scriptURL;
				script.type = "module";
				script.async = true;
				script.onload = () => {
					if (window.RevelationPlugins && typeof window.RevelationPlugins[name] === "object") {
						const pluginModule = window.RevelationPlugins[name];
						if (typeof pluginModule.init === "function") pluginModule.init({
							pluginName: name,
							baseURL: normalizedBaseURL,
							page,
							config: plugin.config
						});
						window.RevelationPlugins[name].priority = plugin.priority;
						console.log(`✅ Plugin '${name}' loaded`);
						resolve();
					} else {
						console.warn(`⚠️ Plugin '${name}' did not register correctly`);
						resolve();
					}
				};
				script.onerror = () => {
					showPluginNotice(`Failed to load plugin: ${name} (${scriptURL})`);
					resolve();
				};
				document.head.appendChild(script);
			});
			pluginPromises.push(promise);
		}
		return Promise.allSettled(pluginPromises);
	}
	//#endregion
	//#region js/presentations.js
	(async () => {
		window.RevelationSocketIOClient = xt;
		const match = window.location.pathname.match(/presentations_([^/]+)/);
		let key = match ? match[1] : null;
		const urlParams = new URLSearchParams(window.location.search);
		const isRemoteFollower = urlParams.has("remoteMultiplexId");
		const isRemote = window.location.protocol !== "file:" && !["localhost", "127.0.0.1"].includes(window.location.hostname);
		const builderPreviewMode = urlParams.get("builderPreview") === "1";
		const builderPreviewPeerEnabled = builderPreviewMode && urlParams.get("builderPreviewPeer") === "1";
		const builderPreviewToken = urlParams.get("builderPreviewToken") || "";
		const PREVIEW_BRIDGE = "revelation-builder-preview-bridge";
		const SAFE_MD_LINK_RE = /^(?:\.\/)?(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+\.md$/;
		function setupBuilderPreviewBridge(deck) {
			if (!builderPreviewMode) return;
			if (!builderPreviewToken) return;
			if (!window.parent || window.parent === window) return;
			const postPreviewEvent = (eventName, payload = {}) => {
				window.parent.postMessage({
					bridge: PREVIEW_BRIDGE,
					type: "preview-event",
					token: builderPreviewToken,
					event: eventName,
					payload
				}, "*");
			};
			const postCurrentState = (eventName = "ready") => {
				postPreviewEvent(eventName, {
					indices: deck.getIndices ? deck.getIndices() : {
						h: 0,
						v: 0
					},
					isOverview: deck.isOverview ? deck.isOverview() : false
				});
			};
			window.addEventListener("message", (event) => {
				if (event.source !== window.parent) return;
				const data = event.data || {};
				if (data.bridge !== PREVIEW_BRIDGE || data.type !== "builder-command") return;
				if (data.token !== builderPreviewToken) return;
				const command = String(data.command || "");
				const payload = data.payload && typeof data.payload === "object" ? data.payload : {};
				if (command === "hello") {
					deck.layout?.();
					postCurrentState("ready");
					return;
				}
				if (command === "slide") {
					const h = Number.isFinite(Number(payload.h)) ? Number(payload.h) : 0;
					const v = Number.isFinite(Number(payload.v)) ? Number(payload.v) : 0;
					deck.slide(h, v);
					return;
				}
				if (command === "toggleOverview" && typeof deck.toggleOverview === "function") {
					deck.toggleOverview();
					return;
				}
				if (command === "layout") {
					deck.layout?.();
					window.setTimeout(() => deck.layout?.(), 120);
					postCurrentState("slidechanged");
					return;
				}
				if (command === "pauseRevealRemote") {
					const remote = deck.getPlugin("RevealRemote");
					if (remote && typeof remote.setMultiplexPaused === "function") remote.setMultiplexPaused(true);
					return;
				}
				if (command === "resumeRevealRemote") {
					const remote = deck.getPlugin("RevealRemote");
					if (remote && typeof remote.setMultiplexPaused === "function") {
						remote.setMultiplexPaused(false);
						if (typeof remote.sendCurrentState === "function") remote.sendCurrentState();
					}
					return;
				}
			});
			if (builderPreviewPeerEnabled) {
				const pollForMultiplexId = () => {
					const remote = deck.getPlugin("RevealRemote");
					let id = remote && typeof remote.getMultiplexId === "function" ? remote.getMultiplexId() : null;
					if (!id && window.localStorage) {
						const urlKey = window.location.href.replace(/#.*/, "");
						try {
							id = JSON.parse(window.localStorage.getItem("presentations") || "{}")[urlKey]?.multiplexId || null;
						} catch (e) {}
					}
					if (id) {
						postPreviewEvent("revealRemoteReady", { multiplexId: id });
						return;
					}
					setTimeout(pollForMultiplexId, 300);
				};
				deck.on("ready", () => {
					setTimeout(pollForMultiplexId, 300);
				});
			}
			deck.on("ready", () => {
				postCurrentState("ready");
			});
			deck.on("slidechanged", () => {
				postCurrentState("slidechanged");
			});
			deck.on("overviewshown", () => {
				postCurrentState("overview");
			});
			deck.on("overviewhidden", () => {
				postCurrentState("overview");
			});
			document.addEventListener("keydown", (event) => {
				if (!event.ctrlKey && !event.metaKey) return;
				if (!event.key.startsWith("Arrow")) return;
				postPreviewEvent("keydown", { key: event.key });
				event.preventDefault();
			}, true);
		}
		function setupInterPresentationLinkHandler() {
			const resolveInternalMarkdownTarget = (href) => {
				if (!href) return null;
				const trimmed = String(href).trim();
				if (!trimmed || trimmed.startsWith("#")) return null;
				if (/^(https?:|mailto:|tel:|javascript:|data:)/i.test(trimmed)) return null;
				try {
					const parsed = new URL(trimmed, window.location.href);
					if ((parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.host !== window.location.host) return null;
					const rawPath = decodeURIComponent(parsed.pathname.split("/").pop() || "");
					const isIndexPath = /^index\.html?$/i.test(rawPath);
					if (trimmed.includes("../")) {
						console.warn(`Blocked parent-directory markdown link: ${trimmed}`);
						return null;
					}
					if (isIndexPath && parsed.searchParams.has("p")) {
						const p = parsed.searchParams.get("p") || "";
						if (!SAFE_MD_LINK_RE.test(p)) return null;
						return {
							mdFile: p,
							hash: parsed.hash || ""
						};
					}
					const [candidatePath, hashPart = ""] = (trimmed.startsWith("./") ? trimmed.slice(2) : trimmed).split("#", 2);
					if (!SAFE_MD_LINK_RE.test(candidatePath)) return null;
					return {
						mdFile: candidatePath,
						hash: hashPart ? `#${hashPart}` : ""
					};
				} catch {
					return null;
				}
			};
			document.addEventListener("click", (event) => {
				if (event.defaultPrevented) return;
				if (event.button !== 0) return;
				if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
				const anchor = event.target?.closest?.("a[href]");
				if (!anchor) return;
				const target = resolveInternalMarkdownTarget(anchor.getAttribute("href"));
				if (!target) return;
				event.preventDefault();
				const nextUrl = new URL(window.location.href);
				nextUrl.searchParams.set("p", target.mdFile);
				nextUrl.hash = target.hash || "";
				window.location.href = nextUrl.toString();
			}, true);
		}
		pluginLoader("presentations", `/plugins_${key}`).then(async function() {
			const plugins = [
				Qe,
				je,
				r,
				e,
				plugin_default()
			];
			const enableRevealRemote = !!window.revealRemoteServer && (!builderPreviewMode || builderPreviewPeerEnabled);
			const isFollower = enableRevealRemote && !!window.location.search.match(/remoteMultiplexId=/);
			if (enableRevealRemote) {
				const remotePlugin = remote_default();
				if (builderPreviewPeerEnabled) remotePlugin.setMultiplexPaused(true);
				plugins.push(remotePlugin);
				plugins.push(remotezoomsync_default({ isFollower }));
			}
			for (const plugin of Object.values(window.RevelationPlugins)) if (typeof plugin.getRevealPlugins === "function") {
				const revealPlugins = await plugin.getRevealPlugins(isRemote);
				if (Array.isArray(revealPlugins)) plugins.push(...revealPlugins);
			}
			const deck = new B$3({
				plugins,
				...enableRevealRemote && { remote: {
					remote: true,
					multiplex: true,
					server: window.revealRemoteServer,
					path: "/socket.io",
					suppressInOverview: true,
					normalizeShareUrl: (url) => {
						try {
							const u = new URL(url);
							u.searchParams.delete("variant");
							return u.toString();
						} catch {
							return url;
						}
					}
				} }
			});
			window.deck = deck;
			if (enableRevealRemote) deck.on("ready", () => {
				const remotePlugin = deck.getPlugin("RevealRemote");
				if (remotePlugin) initVideoSync(deck, remotePlugin);
			});
			setupBuilderPreviewBridge(deck);
			setupInterPresentationLinkHandler();
			loadAndPreprocessMarkdown(deck);
			const NOTES_SCROLL_DELAY_MS = 3e3;
			const NOTES_SCROLL_SPEED_VH_PERCENT_PER_SEC_DEFAULT = 3.5;
			const NOTES_SCROLL_READY_RETRIES = 16;
			const NOTES_SCROLL_READY_RETRY_MS = 250;
			const NOTES_SCROLL_USER_RESUME_IDLE_MS = 1400;
			const NOTES_LAYOUT_BREAKPOINT_PX = 1024;
			let notesScrollStartTimer = null;
			let notesScrollReadyTimer = null;
			let notesScrollRaf = null;
			let notesScrollContextKey = "";
			let notesScrollDetachInteractionListeners = null;
			let notesViewportMode = null;
			let notesResizeDebounceTimer = null;
			function clearNotesInteractionListeners() {
				if (typeof notesScrollDetachInteractionListeners === "function") {
					notesScrollDetachInteractionListeners();
					notesScrollDetachInteractionListeners = null;
				}
			}
			function cancelNotesAutoScroll() {
				if (notesScrollStartTimer) {
					window.clearTimeout(notesScrollStartTimer);
					notesScrollStartTimer = null;
				}
				if (notesScrollReadyTimer) {
					window.clearTimeout(notesScrollReadyTimer);
					notesScrollReadyTimer = null;
				}
				if (notesScrollRaf) {
					window.cancelAnimationFrame(notesScrollRaf);
					notesScrollRaf = null;
				}
				clearNotesInteractionListeners();
			}
			function getNotesContextKey() {
				const idx = deck.getIndices?.() || {};
				return `${idx.h ?? 0}:${idx.v ?? 0}:${idx.f ?? -1}`;
			}
			function getNotesScrollSpeedVhPercentPerSec() {
				const runtimeSpeed = Number.parseFloat(window.RevelationRuntime?.notesScrollSpeed);
				if (Number.isFinite(runtimeSpeed) && runtimeSpeed >= 0) return runtimeSpeed;
				return NOTES_SCROLL_SPEED_VH_PERCENT_PER_SEC_DEFAULT;
			}
			function scheduleNotesAutoScroll() {
				if (document.body.dataset.variant !== "notes") return;
				if (document.body.classList.contains("notes-pane-hidden")) return;
				const contextKey = getNotesContextKey();
				if (!!(notesScrollStartTimer || notesScrollReadyTimer || notesScrollRaf) && notesScrollContextKey === contextKey) return;
				notesScrollContextKey = contextKey;
				cancelNotesAutoScroll();
				const immediateNotesPane = document.querySelector(".reveal .speaker-notes");
				if (immediateNotesPane) immediateNotesPane.scrollTop = 0;
				console.log("[notes-scroll] schedule");
				notesScrollStartTimer = window.setTimeout(() => {
					notesScrollStartTimer = null;
					const beginAnimation = (notesPane) => {
						let startTs = null;
						let startScrollTop = 0;
						let userHoldingScroll = false;
						let userPauseUntilTs = 0;
						const nowTs = () => window.performance && typeof window.performance.now === "function" ? window.performance.now() : Date.now();
						const rebaseToCurrentScroll = (tsOverride = null) => {
							startTs = Number.isFinite(tsOverride) ? tsOverride : nowTs();
							startScrollTop = notesPane.scrollTop;
						};
						const pauseForUserInteraction = (idleMs = NOTES_SCROLL_USER_RESUME_IDLE_MS) => {
							rebaseToCurrentScroll();
							userPauseUntilTs = Math.max(userPauseUntilTs, nowTs() + idleMs);
						};
						const restorePresentationFocus = () => {
							window.setTimeout(() => {
								deck.focus?.focus?.();
								if (document.activeElement === notesPane) notesPane.blur();
								document.body?.focus?.();
							}, 0);
						};
						const startUserHold = () => {
							userHoldingScroll = true;
							rebaseToCurrentScroll();
						};
						const endUserHold = () => {
							if (!userHoldingScroll) return;
							userHoldingScroll = false;
							pauseForUserInteraction();
							restorePresentationFocus();
						};
						const isScrollKey = (key) => key === "ArrowUp" || key === "ArrowDown" || key === "PageUp" || key === "PageDown" || key === "Home" || key === "End" || key === " " || key === "Spacebar";
						const onWheel = () => pauseForUserInteraction();
						const onPointerDown = () => startUserHold();
						const onPointerUp = () => endUserHold();
						const onTouchStart = () => startUserHold();
						const onTouchMove = () => pauseForUserInteraction();
						const onTouchEnd = () => endUserHold();
						const onTouchCancel = () => endUserHold();
						const onKeyDown = (event) => {
							if (!event) return;
							if (isScrollKey(event.key)) pauseForUserInteraction();
							if (!event.metaKey && !event.ctrlKey && !event.altKey && Number.isFinite(event.keyCode)) {
								event.preventDefault();
								event.stopPropagation();
								notesPane.blur();
								deck.triggerKey?.(event.keyCode);
								restorePresentationFocus();
							}
						};
						clearNotesInteractionListeners();
						notesPane.addEventListener("wheel", onWheel, { passive: true });
						notesPane.addEventListener("pointerdown", onPointerDown, { passive: true });
						window.addEventListener("pointerup", onPointerUp, { passive: true });
						notesPane.addEventListener("touchstart", onTouchStart, { passive: true });
						notesPane.addEventListener("touchmove", onTouchMove, { passive: true });
						notesPane.addEventListener("touchend", onTouchEnd, { passive: true });
						notesPane.addEventListener("touchcancel", onTouchCancel, { passive: true });
						notesPane.addEventListener("keydown", onKeyDown);
						notesScrollDetachInteractionListeners = () => {
							notesPane.removeEventListener("wheel", onWheel);
							notesPane.removeEventListener("pointerdown", onPointerDown);
							window.removeEventListener("pointerup", onPointerUp);
							notesPane.removeEventListener("touchstart", onTouchStart);
							notesPane.removeEventListener("touchmove", onTouchMove);
							notesPane.removeEventListener("touchend", onTouchEnd);
							notesPane.removeEventListener("touchcancel", onTouchCancel);
							notesPane.removeEventListener("keydown", onKeyDown);
						};
						notesPane.scrollTop = 0;
						startScrollTop = 0;
						console.log("[notes-scroll] start", {
							scrollHeight: notesPane.scrollHeight,
							clientHeight: notesPane.clientHeight
						});
						const step = (ts) => {
							if (!notesPane.isConnected || document.body.classList.contains("notes-pane-hidden")) {
								notesScrollRaf = null;
								return;
							}
							if (startTs === null) {
								startTs = ts;
								startScrollTop = notesPane.scrollTop;
							}
							if (userHoldingScroll) {
								notesScrollRaf = window.requestAnimationFrame(step);
								return;
							}
							if (userPauseUntilTs > ts) {
								notesScrollRaf = window.requestAnimationFrame(step);
								return;
							}
							const maxScroll = notesPane.scrollHeight - notesPane.clientHeight;
							if (maxScroll <= 0) {
								notesPane.scrollTop = Math.max(0, maxScroll);
								notesScrollRaf = null;
								console.log("[notes-scroll] complete");
								return;
							}
							const speedPercent = getNotesScrollSpeedVhPercentPerSec();
							const speedPxPerSec = Math.max(window.innerHeight || 0, notesPane.clientHeight || 0, 1) * (speedPercent / 100);
							const elapsedSeconds = Math.max(0, (ts - startTs) / 1e3);
							const targetScrollTop = Math.min(maxScroll, startScrollTop + speedPxPerSec * elapsedSeconds);
							notesPane.scrollTop = targetScrollTop;
							if (targetScrollTop >= maxScroll - .5) {
								notesPane.scrollTop = maxScroll;
								notesScrollRaf = null;
								console.log("[notes-scroll] complete");
								return;
							}
							notesScrollRaf = window.requestAnimationFrame(step);
						};
						notesScrollRaf = window.requestAnimationFrame(step);
					};
					const waitUntilReady = (retriesLeft) => {
						const notesPane = document.querySelector(".reveal .speaker-notes");
						if (!notesPane || !notesPane.isConnected || document.body.classList.contains("notes-pane-hidden")) {
							console.log("[notes-scroll] canceled before start");
							return;
						}
						if (notesPane.scrollHeight - notesPane.clientHeight > 0) {
							beginAnimation(notesPane);
							return;
						}
						if (retriesLeft <= 0) {
							console.log("[notes-scroll] skipped: no overflow");
							return;
						}
						notesScrollReadyTimer = window.setTimeout(() => {
							waitUntilReady(retriesLeft - 1);
						}, NOTES_SCROLL_READY_RETRY_MS);
					};
					waitUntilReady(NOTES_SCROLL_READY_RETRIES);
				}, NOTES_SCROLL_DELAY_MS);
			}
			function currentSlideHasNotes() {
				const slide = deck.getCurrentSlide?.();
				if (!slide) return false;
				const slideNotesAttr = slide.getAttribute("data-notes");
				if (slideNotesAttr && slideNotesAttr.trim()) return true;
				const slideNotes = slide.querySelectorAll("aside.notes");
				for (const notesEl of slideNotes) if ((notesEl.textContent || "").trim()) return true;
				const currentFragment = slide.querySelector(".current-fragment");
				if (currentFragment) {
					const fragmentNotesAttr = currentFragment.getAttribute("data-notes");
					if (fragmentNotesAttr && fragmentNotesAttr.trim()) return true;
					const fragmentNotes = currentFragment.querySelector("aside.notes");
					if (fragmentNotes && (fragmentNotes.textContent || "").trim()) return true;
				}
				return false;
			}
			function currentSlideNotesIsOnlyHeading() {
				const slide = deck.getCurrentSlide?.();
				if (!slide) return false;
				for (const notesEl of slide.querySelectorAll("aside.notes")) {
					const children = Array.from(notesEl.children).filter((el) => {
						if (el.tagName === "DIV" && el.classList.contains("slide-attribution")) return false;
						if (/^H[123]$/.test(el.tagName)) return true;
						if (el.tagName === "DIV" && (el.textContent || "").trim()) return true;
						return (el.textContent || "").trim().length > 0;
					});
					if (children.length === 0) continue;
					if (children.length === 1 && /^H[123]$/.test(children[0].tagName)) return true;
					return false;
				}
				const attr = slide.getAttribute("data-notes");
				if (attr) {
					const trimmed = attr.trim();
					return /^#{1,3}\s+[^\n#]+$/.test(trimmed);
				}
				return false;
			}
			function getCurrentSlideHeadingNoteHTML() {
				const slide = deck.getCurrentSlide?.();
				if (!slide) return "";
				for (const notesEl of slide.querySelectorAll("aside.notes")) {
					const children = Array.from(notesEl.children).filter((el) => {
						if (el.tagName === "DIV" && el.classList.contains("slide-attribution")) return false;
						if (/^H[123]$/.test(el.tagName)) return true;
						if (el.tagName === "DIV" && (el.textContent || "").trim()) return true;
						return (el.textContent || "").trim().length > 0;
					});
					const headingEl = children.find((el) => /^H[123]$/.test(el.tagName));
					if (headingEl && children.length === 1) return headingEl.outerHTML;
				}
				const attr = slide.getAttribute("data-notes");
				if (attr) return `<h2>${attr.trim().replace(/^#{1,3}\s+/, "")}</h2>`;
				return "";
			}
			function updateNotesPaneVisibility() {
				if (document.body.dataset.variant !== "notes") return;
				if (!!!deck.getConfig?.().showNotes) {
					cancelNotesAutoScroll();
					return;
				}
				const hasNotes = currentSlideHasNotes();
				const isHeadingOnly = hasNotes && currentSlideNotesIsOnlyHeading();
				const shouldHide = !hasNotes || isHeadingOnly || !!deck.isOverview?.();
				const changed = document.body.classList.contains("notes-pane-hidden") !== shouldHide;
				document.body.classList.toggle("notes-pane-hidden", shouldHide);
				const headingDisplayEl = document.getElementById("notes-heading-display");
				if (headingDisplayEl) if (isHeadingOnly && !deck.isOverview?.()) {
					headingDisplayEl.innerHTML = getCurrentSlideHeadingNoteHTML();
					document.body.classList.add("notes-heading-only");
				} else {
					headingDisplayEl.innerHTML = "";
					document.body.classList.remove("notes-heading-only");
				}
				if (shouldHide) {
					notesScrollContextKey = "";
					cancelNotesAutoScroll();
				} else scheduleNotesAutoScroll();
				if (changed) window.setTimeout(() => {
					deck.layout?.();
				}, 280);
			}
			function getNotesViewportMode() {
				if (document.body.dataset.variant !== "notes") return "off";
				return (window.innerWidth || document.documentElement?.clientWidth || 0) <= NOTES_LAYOUT_BREAKPOINT_PX ? "narrow" : "wide";
			}
			function refreshNotesLayoutAfterViewportChange() {
				if (document.body.dataset.variant !== "notes") return;
				const nextMode = getNotesViewportMode();
				const modeChanged = nextMode !== notesViewportMode;
				notesViewportMode = nextMode;
				notesScrollContextKey = "";
				cancelNotesAutoScroll();
				updateNotesPaneVisibility();
				updateNextSlidePreview?.();
				deck.layout?.();
				if (modeChanged) window.setTimeout(() => {
					updateNotesPaneVisibility();
					updateNextSlidePreview?.();
					deck.layout?.();
				}, 320);
			}
			function setupNextSlidePreview() {
				if (document.body.dataset.variant !== "notes") return null;
				const previewEl = document.createElement("div");
				previewEl.id = "notes-next-preview";
				previewEl.className = "notes-next-preview";
				const labelEl = document.createElement("div");
				labelEl.className = "notes-next-preview-label";
				labelEl.textContent = "Next";
				const slideWrapEl = document.createElement("div");
				slideWrapEl.className = "notes-next-preview-slide-wrap";
				previewEl.appendChild(labelEl);
				previewEl.appendChild(slideWrapEl);
				document.body.appendChild(previewEl);
				const headingEl = document.createElement("div");
				headingEl.id = "notes-heading-display";
				headingEl.className = "notes-heading-display";
				document.body.appendChild(headingEl);
				function updateNextSlidePreview() {
					slideWrapEl.innerHTML = "";
					if (deck.isOverview?.()) {
						document.body.classList.remove("has-next-preview");
						return;
					}
					const indices = deck.getIndices?.();
					if (!indices) {
						document.body.classList.remove("has-next-preview");
						return;
					}
					const { h, v } = indices;
					const currentSlide = deck.getCurrentSlide?.();
					const hasUnshownFragments = currentSlide && Array.from(currentSlide.querySelectorAll(".fragment")).some((f) => !f.classList.contains("visible"));
					let previewSlide, previewH, previewV;
					if (hasUnshownFragments) {
						previewSlide = currentSlide;
						previewH = h;
						previewV = v || 0;
					} else {
						const nextV = (v || 0) + 1;
						previewH = h;
						previewV = nextV;
						previewSlide = deck.getSlide(h, nextV);
						if (!previewSlide) {
							previewH = h + 1;
							previewV = 0;
							previewSlide = deck.getSlide(previewH, 0);
						}
					}
					if (!previewSlide) {
						document.body.classList.remove("has-next-preview");
						return;
					}
					document.body.classList.add("has-next-preview");
					labelEl.textContent = hasUnshownFragments ? "Complete" : "Next";
					const slideW = deck.getConfig?.().width || 960;
					const slideH = deck.getConfig?.().height || 700;
					const wrapW = slideWrapEl.offsetWidth;
					const wrapH = slideWrapEl.offsetHeight;
					const scale = slideW > 0 && slideH > 0 && wrapW > 0 && wrapH > 0 ? Math.min(wrapW / slideW, wrapH / slideH) : 1;
					const scaledW = slideW * scale;
					const scaledH = slideH * scale;
					const offsetX = Math.round((wrapW - scaledW) / 2);
					const offsetY = Math.round((wrapH - scaledH) / 2);
					const fakeReveal = document.createElement("div");
					fakeReveal.className = "reveal overview";
					fakeReveal.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;background:transparent;";
					const placementCss = [
						"position:absolute",
						`width:${slideW}px`,
						`height:${slideH}px`,
						`top:${offsetY}px`,
						`left:${offsetX}px`,
						`transform:scale(${scale})`,
						"transform-origin:top left"
					].join(";");
					const bgEl = deck.getSlideBackground?.(previewH, previewV);
					if (bgEl) {
						const bgClone = bgEl.cloneNode(true);
						bgClone.classList.remove("future", "past");
						bgClone.classList.add("present");
						bgClone.style.cssText = "display:block;width:100%;height:100%;opacity:1;visibility:visible;transform:none;position:absolute;top:0;left:0;";
						bgClone.querySelectorAll("video").forEach((el) => {
							el.removeAttribute("autoplay");
							el.removeAttribute("data-autoplay");
							el.pause?.();
						});
						const fakeBgs = document.createElement("div");
						fakeBgs.className = "backgrounds";
						fakeBgs.style.cssText = placementCss;
						fakeBgs.appendChild(bgClone);
						fakeReveal.appendChild(fakeBgs);
					}
					const fakeSlides = document.createElement("div");
					fakeSlides.className = "slides";
					fakeSlides.style.cssText = "position:absolute;inset:0;perspective:none;";
					const clone = previewSlide.cloneNode(true);
					clone.classList.remove("future", "past");
					clone.classList.add("present");
					clone.querySelectorAll(".future, .past").forEach((el) => {
						el.classList.remove("future", "past");
						el.classList.add("present");
					});
					clone.querySelectorAll(".fragment").forEach((el) => el.classList.add("visible"));
					clone.querySelectorAll(".animate__animated").forEach((el) => el.classList.add("animationended"));
					clone.querySelectorAll("video, audio").forEach((el) => {
						el.removeAttribute("src");
						el.removeAttribute("autoplay");
						el.removeAttribute("data-autoplay");
						el.querySelectorAll("source").forEach((s) => s.remove());
					});
					clone.querySelectorAll("iframe").forEach((el) => el.removeAttribute("src"));
					clone.querySelectorAll("aside.notes").forEach((el) => el.remove());
					clone.style.cssText = placementCss + ";display:block;visibility:visible;opacity:1;pointer-events:none;";
					fakeSlides.appendChild(clone);
					fakeReveal.appendChild(fakeSlides);
					slideWrapEl.appendChild(fakeReveal);
				}
				deck.on("slidechanged", updateNextSlidePreview);
				deck.on("fragmentshown", updateNextSlidePreview);
				deck.on("fragmenthidden", updateNextSlidePreview);
				deck.on("overviewshown", updateNextSlidePreview);
				deck.on("overviewhidden", updateNextSlidePreview);
				return updateNextSlidePreview;
			}
			const updateNextSlidePreview = setupNextSlidePreview();
			revealTweaks(deck);
			contextMenu(deck);
			deck.addKeyBinding({
				keyCode: 90,
				key: "Z",
				description: "Send presentation to peers"
			}, () => {
				sendPresentationToPeers();
			});
			deck.addKeyBinding({
				keyCode: 81,
				key: "Q",
				description: "Close presentations on peers"
			}, () => {
				closePresentationsOnPeers();
			});
			deck.on("ready", () => {
				deck.getSlides().forEach((slide) => {
					slide.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h) => {
						if (!h.id) h.id = h.textContent.trim().toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
					});
				});
				notesViewportMode = getNotesViewportMode();
				updateNotesPaneVisibility();
				updateNextSlidePreview?.();
				if (typeof window.translatePage === "function") {
					const userLanguage = String(navigator.language || "en").slice(0, 2);
					window.translatePage(userLanguage);
				}
				window.setTimeout(() => {
					deck.layout?.();
					window.setTimeout(() => deck.layout?.(), 180);
					if (!isRemoteFollower && !builderPreviewMode) {
						const indices = deck.getIndices();
						deck.slide(indices.h, indices.v);
					}
					document.body.classList.remove("hidden");
					document.body.classList.add("reveal-ready");
					const screenCover = document.getElementById("screen-cover");
					if (screenCover) screenCover.classList.add("faded-out");
				}, 500);
			});
			deck.on("slidechanged", updateNotesPaneVisibility);
			deck.on("fragmentshown", updateNotesPaneVisibility);
			deck.on("fragmenthidden", updateNotesPaneVisibility);
			deck.on("overviewshown", updateNotesPaneVisibility);
			deck.on("overviewhidden", updateNotesPaneVisibility);
			if (document.body.dataset.variant === "notes") document.addEventListener("keydown", (e) => {
				if (!document.activeElement?.closest?.(".speaker-notes")) return;
				if (notesScrollDetachInteractionListeners) return;
				if (e.metaKey || e.ctrlKey || e.altKey) return;
				if (!Number.isFinite(e.keyCode)) return;
				e.preventDefault();
				e.stopPropagation();
				document.activeElement.blur();
				deck.triggerKey?.(e.keyCode);
			}, true);
			window.addEventListener("resize", () => {
				if (notesResizeDebounceTimer) window.clearTimeout(notesResizeDebounceTimer);
				notesResizeDebounceTimer = window.setTimeout(() => {
					notesResizeDebounceTimer = null;
					refreshNotesLayoutAfterViewportChange();
				}, 140);
			});
			window.addEventListener("orientationchange", () => {
				refreshNotesLayoutAfterViewportChange();
			});
		});
		urlParams.get("p");
		const config = window.electronAPI ? await window.electronAPI.getAppConfig() : {};
		window.AppConfig = config;
		if (window.parent && window.parent !== window) document.addEventListener("keydown", (event) => {
			if (event.key === "x" || event.key === "X") {
				event.preventDefault();
				event.stopPropagation();
				window.parent.postMessage("pip-toggle", "*");
			}
		}, true);
	})();
	//#endregion
	//#region js/splashscreen.js
	(function() {
		if (!window.splashScreenEnabled) return;
		const splash = document.createElement("div");
		splash.id = "revelation-splash";
		splash.innerHTML = `
    <div class="splash-content">
      <h2>Created with REVELation Snapshot Presenter v. <span id="app-version"></span></h2>
      <p><a href="https://snapshots.vrbm.org/revelation-snapshot-presenter/" target="_blank">Learn More</a></p>
    </div>
  `;
		document.body.appendChild(splash);
		const style = document.createElement("style");
		style.textContent = `
    #revelation-splash {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(17, 17, 17, 0.95);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: system-ui, sans-serif;
      text-align: center;
      transition: opacity 1s ease-in-out;
    }
    #revelation-splash.fade-out {
      opacity: 0;
      pointer-events: none;
    }
    #revelation-splash .splash-content {
      max-width: 90%;
    }
    #revelation-splash h2 {
      font-size: 2rem;
      margin-bottom: 1rem;
    }
    #revelation-splash a {
      color: #4da6ff;
      font-size: 1.2rem;
      text-decoration: none;
    }
    #revelation-splash a:hover {
      text-decoration: underline;
    }
  `;
		document.head.appendChild(style);
		const versionSpan = splash.querySelector("#app-version");
		if (versionSpan) versionSpan.textContent = window.exportedAppVersion || "unknown";
		let dismissed = false;
		const dismissSplash = () => {
			if (dismissed) return;
			dismissed = true;
			splash.classList.add("fade-out");
			setTimeout(() => splash.remove(), 1e3);
		};
		setTimeout(dismissSplash, 5e3);
		splash.addEventListener("click", dismissSplash);
		document.addEventListener("keydown", dismissSplash, { once: true });
	})();
	//#endregion
})();
