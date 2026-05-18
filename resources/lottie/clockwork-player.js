(function (global) {
	function transparentizeSvg(container) {
		container.querySelectorAll("svg").forEach((svg) => {
			svg.style.setProperty("background", "transparent", "important");
			svg.style.setProperty("background-color", "transparent", "important");
		});
	}

	global.roprimePlayClockworkLottie = function roprimePlayClockworkLottie(
		container,
		options,
	) {
		if (!(container instanceof HTMLElement)) {
			return Promise.reject(new Error("Missing animation container"));
		}
		if (!global.lottie?.loadAnimation) {
			return Promise.reject(new Error("lottie-web is not loaded"));
		}

		const jsonUrl = options?.jsonUrl ?? "Clockwork.animation.json";
		if (options?.darkBackground) {
			container.style.background = "#181d24";
		}

		return fetch(jsonUrl)
			.then((response) => {
				if (!response.ok) {
					throw new Error(`Clockwork animation failed (${response.status})`);
				}
				return response.json();
			})
			.then((animationData) => {
				const anim = global.lottie.loadAnimation({
					container,
					renderer: "svg",
					loop: true,
					autoplay: true,
					animationData,
					rendererSettings: {
						preserveAspectRatio: "xMidYMid meet",
						progressiveLoad: true,
					},
				});
				anim.addEventListener("DOMLoaded", () => transparentizeSvg(container));
				anim.addEventListener("data_ready", () => transparentizeSvg(container));
				return anim;
			});
	};
})(typeof window !== "undefined" ? window : globalThis);
