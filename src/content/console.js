const activeFont = document.body && document.body.classList.contains('classic-theme')
    ? '"Comic Neue Angular", sans-serif' 
    : 'var(--config-text-font), "Builder Sans", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif';

console.log(
    `%c RoPrime %c ${(window.performance.now()).toFixed(2)}ms `,
    `background: #335fff; color: #ffffff; padding: 4px 6px; border-radius: 4px 0 0 4px; font-weight: bold; font-family: ${activeFont};`,
    `background: #191a1f; color: #ffffff; padding: 4px 6px; border-radius: 0 4px 4px 0; font-weight: bold; font-family: ${activeFont}; border: 1px solid #272930; border-left: none;`
);
