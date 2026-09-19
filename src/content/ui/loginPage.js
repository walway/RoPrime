(function() {
  function checkUrl() {
    const path = window.location.pathname.toLowerCase();
    return path === '/login' || 
           path === '/login/' || 
           /^\/[a-z]{2,3}(-[a-z]{2,4})?\/login\/?\$/.test(path);
  }

  function applyLoginReplacements() {
    if (!checkUrl()) return;

    const loginForm = document.querySelector('.login-form') || document.querySelector('#login-form form');
    if (!loginForm) return;

    {
      const loginSection = document.querySelector('.section-content.login-section') || document.querySelector('.signup-v2-card');
      if (loginSection) {
        const targetSectionClass = 'signup-v2-card flex flex-col bg-surface-100 radius-large padding-large';
        if (loginSection.className !== targetSectionClass) {
          loginSection.className = targetSectionClass;
        }
      }
    }

    {
      const loginHeader = document.querySelector('.login-header') || document.querySelector('.signup-v2-card > h1');
      if (loginHeader) {
        const targetHeaderClass = 'flex width-full flex-col items-start';
        if (loginHeader.className !== targetHeaderClass) {
          loginHeader.className = targetHeaderClass;
        }
      }
    }

    {
      const formGroups = loginForm.querySelectorAll(':scope > div');
      formGroups.forEach(group => {
        if (group.tagName !== 'BUTTON' && !group.hasAttribute('aria-live')) {
          const targetGroupClass = 'foundation-web-input flex items-center width-full stroke-standard bg-none height-1000 radius-medium padding-x-medium gap-x-small stroke-contrast-alpha';
          if (group.className !== targetGroupClass) {
            group.className = targetGroupClass;
          }
        }
      });
    }

    {
      const inputs = loginForm.querySelectorAll('input');
      inputs.forEach(input => {
        const targetInputClass = 'width-full padding-none bg-none stroke-none outline-none content-emphasis placeholder:content-muted text-body-medium placeholder:text-body-medium';
        if (input.className !== targetInputClass) {
          input.className = targetInputClass;
        }

        if (!input.dataset.hasInputListener) {
          input.dataset.hasInputListener = "true";
          input.addEventListener('input', applyLoginReplacements);
        }
      });
    }

    {
      const errorLabels = loginForm.querySelectorAll('.form-control-label.xsmall.text-error.login-error, #login-form-error');
      errorLabels.forEach(label => {
        const targetLabelClass = 'text-caption-small content-system-alert';
        if (label.className !== targetLabelClass) {
          label.className = targetLabelClass;
        }
      });
    }

    const hasActiveError = document.querySelector('#login-form-error, .login-error') !== null;
    
    let allInputsFilled = true;
    const loginInputs = loginForm.querySelectorAll('input');
    if (loginInputs.length > 0) {
      loginInputs.forEach(input => {
        if (!input.value.trim()) {
          allInputsFilled = false;
        }
      });
    } else {
      allInputsFilled = false;
    }

    const nativeButton = document.getElementById('login-button') || loginForm.querySelector('button[type="submit"]') || loginForm.querySelector('.login-button');
    
    if (nativeButton) {
      let targetBtnClass;
      if (!allInputsFilled || hasActiveError) {
        targetBtnClass = 'foundation-web-button opacity-[0.5] relative flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-medium height-1000 padding-x-medium bg-action-standard content-action-standard width-full';
        if (!nativeButton.hasAttribute('disabled')) {
          nativeButton.setAttribute('disabled', '');
        }
      } else {
        targetBtnClass = 'foundation-web-button relative flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-medium height-1000 padding-x-medium bg-action-emphasis content-action-emphasis width-full';
        if (nativeButton.hasAttribute('disabled')) {
          nativeButton.removeAttribute('disabled');
        }
      }

      if (nativeButton.className !== targetBtnClass) {
        nativeButton.className = targetBtnClass;
      }

      if (!nativeButton.querySelector('[role="presentation"]')) {
        const divString = '<div role="presentation" class="absolute inset- transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none width-full height-full"></div>';
        nativeButton.insertAdjacentHTML('beforeend', divString);
      }
    }

    const targetAlternativeButtons = document.querySelectorAll('[class*="otp-login-button"], [class*="cross-device-login-button"]');
    targetAlternativeButtons.forEach(altButton => {
      const isOtp = altButton.id === 'otp-login-button' || altButton.classList.contains('otp-login-button');
      const baseIdent = isOtp ? 'otp-login-button' : 'cross-device-login-button';
      
      const targetAltClass = `btn-full-width btn-control-md ${baseIdent} foundation-web-button relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-medium height-1000 padding-x-medium bg-action-standard content-action-standard shrink-0`;
      
      if (altButton.className !== targetAltClass) {
        altButton.className = targetAltClass;
      }

      if (!altButton.querySelector('[data-testid="foundation-web-state-layer"]')) {
        const divString = '<div class="absolute inset- transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none width-full height-full" aria-hidden="true" data-testid="foundation-web-state-layer"></div>';
        altButton.insertAdjacentHTML('beforeend', divString);
      }
    });

    const secondaryButtons = document.querySelectorAll('#login-form button:not(#login-button), .login-form button:not(#login-button)');
    secondaryButtons.forEach(secButton => {
      if (!secButton.classList.contains('otp-login-button') && !secButton.classList.contains('cross-device-login-button')) {
        if (!secButton.querySelector('[role="presentation"]')) {
          const divString = '<div role="presentation" class="absolute inset- transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none width-full height-full"></div>';
          secButton.insertAdjacentHTML('beforeend', divString);
        }
      }
    });
  }

  if (checkUrl()) {
    applyLoginReplacements();

    const observer = new MutationObserver(() => {
      applyLoginReplacements();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
})();
