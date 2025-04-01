const rotateSvgString = `
  <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 600 600" xml:space="preserve" class="turn">
    <g style="transform: translate(-150px, -100px);fill:#1D4AB9;" >
      <path d="M357.22,409.315c0.327-0.932,0.655-0.176,1.379,0.574c1.532,1.586,2.687,3.721,3.841,5.587     c-0.458-0.765,1.404,1.962,1.297,1.819c0.823,1.095,1.69,2.157,2.576,3.202c2.055,2.424,4.251,4.709,6.578,6.874     c4.662,4.338,9.774,8.192,15.222,11.49c11.107,6.726,23.625,11.066,36.545,12.462c23.836,2.575,48.154-4.846,66.811-19.701     l-6.806-7.929l45.943-9.713l-15.89,44.727l-8.139-9.482c-15.9,13.961-36.485,22.197-57.685,22.932     c-21.342,0.74-42.546-6.622-59.298-19.776c-10.577-8.305-18.742-18.785-25.847-30.117c-1.597-2.547-3.09-5.222-4.432-7.913     C359.104,413.926,356.929,410.147,357.22,409.315z"/>
      <path d="M528.597,364.765c-0.327,0.932-0.655,0.176-1.379-0.574c-1.531-1.586-2.687-3.722-3.841-5.587     c0.458,0.765-1.404-1.962-1.297-1.819c-0.823-1.095-1.69-2.157-2.576-3.202c-2.055-2.424-4.251-4.709-6.578-6.874     c-4.662-4.338-9.774-8.192-15.222-11.49c-11.107-6.726-23.625-11.066-36.545-12.462c-23.836-2.575-48.154,4.846-66.811,19.701     l6.806,7.929l-45.943,9.713l15.89-44.727l8.139,9.482c15.9-13.96,36.485-22.197,57.685-22.932     c21.342-0.74,42.546,6.622,59.298,19.776c10.577,8.305,18.742,18.785,25.847,30.117c1.597,2.547,3.09,5.222,4.432,7.913     C526.713,360.154,528.888,363.934,528.597,364.765z"/>
    </g>
  </svg>
`;

export class InitPageSetup {
  warningDuration: number;
  rotateOverlayDiv: HTMLDivElement;
  smallDeviceOverlayDiv: HTMLDivElement;
  #overlayShown: boolean;
  #timeout?: number;
  
  constructor(warningDuration: number) {
    this.warningDuration = warningDuration;
    this.rotateOverlayDiv = this.createRotateOverlayDiv();
    this.smallDeviceOverlayDiv = this.createSmallDeviceOverlayDiv();
    this.#overlayShown = false;
  }

  init() {
    // Check it when the function is initialized
    this.onOrientationChange();
    // Check orientation on resize
    window.matchMedia('(orientation: portrait)').addEventListener('change', () => {
      this.onOrientationChange();
  });
  }

  createRotateOverlayDiv() {
    const rotateOverlayDiv = document.createElement('div');
    rotateOverlayDiv.classList.add('lev-overlay-default');
    const text = 'Please rotate your device for optimal experience';
    const textHolder = document.createElement('div');
    textHolder.classList.add(...['lev-row-container', 'header']);
    const textElement = document.createElement('p');
    textElement.textContent = text;
    textHolder.appendChild(textElement);
    const svgHolder = document.createElement('div');
    svgHolder.classList.add('turn');
    svgHolder.innerHTML = rotateSvgString;
    rotateOverlayDiv.appendChild(textHolder);
    rotateOverlayDiv.appendChild(svgHolder);
    return rotateOverlayDiv;
  }

  createSmallDeviceOverlayDiv() {
    const smallDeviceOverlayDiv = document.createElement('div');
    smallDeviceOverlayDiv.classList.add('lev-overlay-default');
    const text = 'Please use a tablet or a desktop in landscape mode for optimal experience';
    const textHolder = document.createElement('div');
    textHolder.classList.add(...['lev-row-container', 'header']);
    const textElement = document.createElement('p');
    textElement.textContent = text;
    textHolder.appendChild(textElement);
    smallDeviceOverlayDiv.appendChild(textHolder);
    return smallDeviceOverlayDiv;
  }

  hideOverlay(overlayDiv: HTMLDivElement) {
    overlayDiv.remove();
    clearTimeout(this.#timeout);
  }

  showOverlay(overlayDiv: HTMLDivElement) {
    if (this.#overlayShown) {
      this.hideOverlay(overlayDiv);
    }
    document.body.appendChild(overlayDiv);
    this.#timeout = window.setTimeout(() => {
      this.hideOverlay(overlayDiv);
    }, this.warningDuration);
  } 

  onOrientationChange() {
    const {screen} = window;
    const isPortrait = screen.orientation.type.includes('portrait');
    const primaryDimension = isPortrait ? screen.availWidth : screen.availHeight;
    if (primaryDimension < 500) {
      this.showOverlay(this.smallDeviceOverlayDiv);
    } else if (screen.availHeight > screen.availWidth && isPortrait) {
      this.showOverlay(this.rotateOverlayDiv);
    }
  }
}