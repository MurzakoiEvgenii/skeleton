class CartDrawer extends HTMLElement {
  #activeElement = null;
  #panel = null;
  #trigger = null;
  #onKeyDown = null;

  connectedCallback() {
    this.#panel = this.querySelector('.cart-drawer__panel');
    this.#trigger = this.querySelector('[data-cart-drawer-trigger]');
    this.#onKeyDown = (event) => this.#handleKeyDown(event);

    if (!this.#panel || !this.#trigger) return;

    this.#trigger.addEventListener('click', () => this.open());

    for (const closeButton of this.querySelectorAll('[data-cart-drawer-close]')) {
      closeButton.addEventListener('click', () => this.close());
    }

    for (const removeButton of this.querySelectorAll('[data-cart-drawer-remove]')) {
      removeButton.addEventListener('click', (event) => this.#removeLineItem(event));
    }
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this.#onKeyDown);
  }

  open() {
    if (this.hasAttribute('open')) return;

    this.#activeElement = document.activeElement;
    this.setAttribute('open', '');
    this.#trigger?.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', this.#onKeyDown);

    window.requestAnimationFrame(() => {
      this.#panel?.focus();
    });
  }

  close() {
    if (!this.hasAttribute('open')) return;

    this.removeAttribute('open');
    this.#trigger?.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', this.#onKeyDown);

    if (this.#activeElement instanceof HTMLElement) {
      this.#activeElement.focus();
    }
  }

  #handleKeyDown(event) {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  async #removeLineItem(event) {
    const target = event.currentTarget;
    if (!(target instanceof HTMLButtonElement)) return;

    const line = Number.parseInt(target.dataset.line || '', 10);
    if (!Number.isFinite(line) || line <= 0) return;

    target.disabled = true;

    try {
      await fetch(`${window.Shopify.routes.root}cart/change.js`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          line,
          quantity: 0,
        }),
      });

      window.location.reload();
    } catch {
      target.disabled = false;
    }
  }
}

if (!customElements.get('cart-drawer')) {
  customElements.define('cart-drawer', CartDrawer);
}
