import { setState } from './state.js';
export function getRoute() { return (location.hash.replace('#/', '') || 'overview'); }
export function initRouter(onChange) { const apply = () => { const route = getRoute(); setState({ route }); onChange?.(route); }; window.addEventListener('hashchange', apply); apply(); }