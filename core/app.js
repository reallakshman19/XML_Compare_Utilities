// Standalone app shell runtime delegate.
import { installAppTabClickStateBridge } from './app-tab-click-state-bridge.js?v=standalone-1';

installAppTabClickStateBridge();

export { init, destroy } from './app-standalone-runtime.js?v=20260703-column-confirmation-1';
