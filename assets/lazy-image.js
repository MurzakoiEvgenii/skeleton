class LazyImage extends HTMLElement {
  #observer = null;
  #image = null;
  #placeholder = null;

  static get observedAttributes() {
    return ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading'];
  }

  constructor() {
    super();
    this.#createShadowDOM();
  }

  connectedCallback() {
    this.#setupImage();
    this.#observe();
  }

  disconnectedCallback() {
    this.#disconnectObserver();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'src' || name === 'srcset' || name === 'sizes') {
      if (this.#image && this.#isLoaded()) {
        this.#updateImageSource();
      }
    } else if (name === 'alt' && this.#image) {
      this.#image.alt = newValue || '';
    }
  }

  #createShadowDOM() {
    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        position: relative;
        overflow: hidden;
        width: 100%;
      }

      .lazy-image__container {
        position: relative;
        width: 100%;
        height: 0;
        padding-bottom: var(--aspect-ratio, 56.25%);
        background-color: var(--placeholder-color, #f0f0f0);
        overflow: hidden;
      }

      .lazy-image__image {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
      }

      .lazy-image__image--loaded {
        opacity: 1;
      }

      .lazy-image__placeholder {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(
          90deg,
          var(--placeholder-color, #f0f0f0) 0%,
          var(--placeholder-shimmer, #e0e0e0) 50%,
          var(--placeholder-color, #f0f0f0) 100%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
      }

      @keyframes shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }

      .lazy-image__placeholder--hidden {
        display: none;
      }
    `;

    const container = document.createElement('div');
    container.className = 'lazy-image__container';

    this.#placeholder = document.createElement('div');
    this.#placeholder.className = 'lazy-image__placeholder';

    this.#image = document.createElement('img');
    this.#image.className = 'lazy-image__image';

    container.appendChild(this.#placeholder);
    container.appendChild(this.#image);

    shadow.appendChild(style);
    shadow.appendChild(container);
  }

  #setupImage() {
    const alt = this.getAttribute('alt') || '';
    const width = this.getAttribute('width');
    const height = this.getAttribute('height');

    if (width && height) {
      const aspectRatio = (parseFloat(height) / parseFloat(width)) * 100;
      this.style.setProperty('--aspect-ratio', `${aspectRatio}%`);
    }


    this.#image.alt = alt;

    if (width) {
      this.#image.width = width;
    }

    if (height) {
      this.#image.height = height;
    }

    this.#image.addEventListener('load', () => this.#onImageLoad());
    this.#image.addEventListener('error', () => this.#onImageError());
  }

  #updateImageSource() {
    const src = this.getAttribute('src');
    const srcset = this.getAttribute('srcset');

    if (src) {
      this.#image.src = src;
    }

    if (srcset) {
      this.#image.srcset = srcset;
    }
  }

  #observe() {
    if (!('IntersectionObserver' in window)) {
      this.#loadImage();
      return;
    }

    const rootMargin = this.getAttribute('root-margin') || '50px';
    const threshold = parseFloat(this.getAttribute('threshold')) || 0;

    this.#observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.#loadImage();
            this.#disconnectObserver();
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    this.#observer.observe(this);
  }

  #disconnectObserver() {
    if (this.#observer) {
      this.#observer.disconnect();
      this.#observer = null;
    }
  }

  #loadImage() {
    if (this.#isLoaded()) return;

    const src = this.getAttribute('src');
    const srcset = this.getAttribute('srcset');
    const sizes = this.getAttribute('sizes');

    if (!src && !srcset) return;

    if (src && !this.#image.src) {
      this.#image.src = src;
    }

    if (srcset && !this.#image.srcset) {
      this.#image.srcset = srcset;
    }

    if (sizes && !this.#image.sizes) {
      this.#image.sizes = sizes;
    }
  }

  #isLoaded() {
    return this.#image.complete && this.#image.naturalHeight !== 0;
  }

  #onImageLoad() {
    this.#image.classList.add('lazy-image__image--loaded');
    this.#placeholder.classList.add('lazy-image__placeholder--hidden');
    this.dispatchEvent(
      new CustomEvent('lazy-image-loaded', {
        bubbles: true,
        detail: { element: this },
      })
    );
  }

  #onImageError() {
    this.#placeholder.classList.add('lazy-image__placeholder--hidden');
    this.dispatchEvent(
      new CustomEvent('lazy-image-error', {
        bubbles: true,
        detail: { element: this },
      })
    );
  }
}

customElements.define('lazy-image', LazyImage);

