// Testing image upscaler but this may cause loading issues and bandwidth usage increasing up to 7 times

/*

(function() {
    'use strict';

    const upscaleRules = {
        '/150/150/': '/1024/1024/',
        '/256/256/': '/1024/1024/',
        '/384/216/': '/1024/1024/',
        '/576/324/': '/1024/1024/',
        '/768/432/': '/1024/1024/',
        '/256/144/': '/1024/1024/',
        '/420/420/': '/720/720/',
        '/352/352/': '/720/720/',
        '/180/180/': '/720/720/',
        '/48/48/':   '/512/512/'
    };

    function forceFullHD(img) {
        if (!img || !img.src || img.dataset.hdUpscaled === 'true') return;

        for (const [low, high] of Object.entries(upscaleRules)) {
            if (img.src.includes(low)) {
                img.src = img.src.replace(low, high);
                img.dataset.hdUpscaled = 'true';
                break;
            }
        }
    }

    const viewportObserver = new IntersectionObserver((entries) => {
        const len = entries.length;
        for (let i = 0; i < len; i++) {
            if (entries[i].isIntersecting) {
                forceFullHD(entries[i].target);
                viewportObserver.unobserve(entries[i].target);
            }
        }
    }, {
        rootMargin: "300px 0px"
    });

    const globalObserver = new MutationObserver((mutations) => {
        const mLen = mutations.length;
        for (let i = 0; i < mLen; i++) {
            const addedNodes = mutations[i].addedNodes;
            const nLen = addedNodes.length;
            for (let j = 0; j < nLen; j++) {
                const node = addedNodes[j];
                if (node.nodeType === 1) { 
                    if (node.tagName === 'IMG') viewportObserver.observe(node);
                    
                    const innerImgs = node.getElementsByTagName('img');
                    const imgLen = innerImgs.length;
                    for (let k = 0; k < imgLen; k++) {
                        viewportObserver.observe(innerImgs[k]);
                    }
                }
            }
        }
    });

    globalObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    const allImages = document.getElementsByTagName('img');
    const total = allImages.length;
    for (let i = 0; i < total; i++) {
        viewportObserver.observe(allImages[i]);
    }
})();

*/